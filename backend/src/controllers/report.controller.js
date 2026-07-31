const { query } = require('../config/db');
const AppError = require('../utils/AppError');
const { generateCsv, generatePdfTable, generateAutorisationDetailPdf } = require('../services/report.service');
const { ETAT_LABELS } = require('../utils/calculations');

const send = (res, format, filename, { columns, rows, title, subtitle }) => {
  if (format === 'csv') {
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}.csv"`);
    res.send('﻿' + generateCsv({ columns, rows }));
    return;
  }
  return generatePdfTable({ title, subtitle, columns, rows }).then((buffer) => {
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}.pdf"`);
    res.send(buffer);
  });
};

const ETAT_PRODUIT_LABELS = {
  NON_ACQUIS: 'Non acquis',
  ACQUIS: 'Acquis',
  ACQUISITION_PARTIELLE: 'Acquisition Partielle',
  ACQUISITION_CRITIQUE: 'Acquisition Critique',
  ACQUIS_COMPLET: 'Acquis Complet',
};

// Rapport 1 : État des Autorisations — une ligne par (autorisation x produit), avec
// les champs d'identification chimique complets, comme BD_Tracabilite_Achats en VBA.
const autorisationsReport = async (req, res, next) => {
  try {
    const { format = 'pdf', etat, departement, type_marche } = req.query;
    let sql = `
      SELECT
        au.numero_autorisation, au.date_delivrance, au.date_echeance, au.duree_validite_jours,
        au.type_marche,
        ap.product_code, ap.designation_technique, ap.numero_onu, ap.numero_cas, ap.numero_cee,
        ap.designation_chimique, ap.autre_designation, ap.unite, ap.departement,
        ap.quantite_autorisee, ap.quantite_acquise, ap.quantite_utilisee,
        (ap.quantite_autorisee - ap.quantite_acquise) AS reste_a_acquerir,
        CASE WHEN ap.quantite_autorisee > 0
          THEN ROUND((ap.quantite_acquise / ap.quantite_autorisee) * 100, 2) ELSE 0 END AS pourcentage_acquis,
        calculer_etat_autorisation(au.id) AS etat_autorisation,
        calculer_etat_produit(ap.quantite_autorisee, ap.quantite_acquise) AS etat_produit
      FROM autorisation_produits ap
      JOIN autorisations au ON au.id = ap.autorisation_id
      WHERE au.is_archived = false`;
    const params = [];

    if (req.user.role === 'responsable_stock' && req.user.departement) {
      params.push(req.user.departement);
      sql += ` AND ap.departement = $${params.length}`;
    }
    if (departement) {
      params.push(departement);
      sql += ` AND ap.departement = $${params.length}`;
    }
    if (type_marche) {
      params.push(type_marche);
      sql += ` AND au.type_marche = $${params.length}`;
    }
    sql += ' ORDER BY au.numero_autorisation, ap.product_code';

    const { rows } = await query(sql, params);
    const data = etat ? rows.filter((r) => r.etat_autorisation === etat) : rows;

    await send(res, format, 'rapport_etat_autorisations', {
      title: 'Rapport 1 — État des Autorisations',
      subtitle: `${data.length} ligne(s) produit${etat ? ` · filtre état : ${ETAT_LABELS[etat]}` : ''}`,
      columns: [
        { label: 'N° Autorisation', value: (r) => r.numero_autorisation },
        { label: 'Délivrance', value: (r) => new Date(r.date_delivrance).toLocaleDateString('fr-FR') },
        { label: 'Échéance', value: (r) => new Date(r.date_echeance).toLocaleDateString('fr-FR') },
        { label: 'Type marché', value: (r) => r.type_marche },
        { label: 'Product ID', value: (r) => r.product_code },
        { label: 'Désignation', value: (r) => r.designation_technique },
        { label: 'N° ONU', value: (r) => r.numero_onu || '-' },
        { label: 'N° CAS', value: (r) => r.numero_cas || '-' },
        { label: 'N° CEE', value: (r) => r.numero_cee || '-' },
        { label: 'Désignation chimique', value: (r) => r.designation_chimique || '-' },
        { label: 'Département', value: (r) => r.departement },
        { label: 'Qté Autorisée', value: (r) => `${r.quantite_autorisee} ${r.unite}` },
        { label: 'Qté Acquise', value: (r) => `${r.quantite_acquise} ${r.unite}` },
        { label: 'Reste', value: (r) => `${r.reste_a_acquerir} ${r.unite}` },
        { label: '% Acquis', value: (r) => `${r.pourcentage_acquis}%` },
        { label: 'État Produit', value: (r) => ETAT_PRODUIT_LABELS[r.etat_produit] },
        { label: 'État Autorisation', value: (r) => ETAT_LABELS[r.etat_autorisation] },
      ],
      rows: data,
    });
  } catch (error) {
    next(error);
  }
};

// Rapport 2 : Détail d'une Autorisation (PDF uniquement, multi-sections)
const autorisationDetailReport = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { rows } = await query('SELECT * FROM v_autorisations WHERE id = $1', [id]);
    if (rows.length === 0) throw new AppError('Autorisation non trouvée', 404);
    const autorisation = { ...rows[0], etat_libelle: ETAT_LABELS[rows[0].etat] };

    const { rows: produits } = await query(
      `SELECT *, (quantite_autorisee - quantite_acquise) AS reste_a_acquerir,
        (quantite_acquise - quantite_utilisee) AS stock_disponible,
        CASE WHEN quantite_autorisee > 0 THEN ROUND((quantite_acquise / quantite_autorisee) * 100, 2) ELSE 0 END AS pourcentage_acquis
       FROM autorisation_produits WHERE autorisation_id = $1 ORDER BY product_code`,
      [id]
    );
    const { rows: achats } = await query(
      `SELECT a.*, ap.designation_technique, ap.unite
       FROM achats a JOIN autorisation_produits ap ON ap.id = a.autorisation_produit_id
       WHERE ap.autorisation_id = $1 ORDER BY a.date_achat DESC`,
      [id]
    );
    const { rows: utilisations } = await query(
      `SELECT u.*, ap.designation_technique, ap.unite
       FROM utilisations u JOIN autorisation_produits ap ON ap.id = u.autorisation_produit_id
       WHERE ap.autorisation_id = $1 ORDER BY u.date_utilisation DESC`,
      [id]
    );

    const buffer = await generateAutorisationDetailPdf({ autorisation, produits, achats, utilisations });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="autorisation_${autorisation.numero_autorisation}.pdf"`);
    res.send(buffer);
  } catch (error) {
    next(error);
  }
};

// Rapport 3 : Historique des Achats
const achatsReport = async (req, res, next) => {
  try {
    const { format = 'pdf', date_debut, date_fin, autorisation_id, departement, fournisseur } = req.query;
    let sql = `
      SELECT a.*, ap.product_code, ap.designation_technique, ap.numero_onu, ap.numero_cas,
             ap.designation_chimique, ap.unite, ap.departement,
             au.numero_autorisation, u.nom, u.prenom
      FROM achats a
      JOIN autorisation_produits ap ON ap.id = a.autorisation_produit_id
      JOIN autorisations au ON au.id = ap.autorisation_id
      LEFT JOIN utilisateurs u ON u.id = a.enregistre_par
      WHERE 1 = 1`;
    const params = [];

    if (req.user.role === 'responsable_stock' && req.user.departement) {
      params.push(req.user.departement);
      sql += ` AND ap.departement = $${params.length}`;
    }
    if (date_debut) { params.push(date_debut); sql += ` AND a.date_achat >= $${params.length}`; }
    if (date_fin) { params.push(date_fin); sql += ` AND a.date_achat <= $${params.length}`; }
    if (autorisation_id) { params.push(autorisation_id); sql += ` AND au.id = $${params.length}`; }
    if (departement) { params.push(departement); sql += ` AND ap.departement = $${params.length}`; }
    if (fournisseur) { params.push(`%${fournisseur}%`); sql += ` AND a.fournisseur ILIKE $${params.length}`; }

    sql += ' ORDER BY a.date_achat DESC';
    const { rows } = await query(sql, params);

    await send(res, format, 'rapport_historique_achats', {
      title: 'Rapport 3 — Historique des Achats',
      subtitle: `${rows.length} achat(s)`,
      columns: [
        { label: 'Date', value: (r) => new Date(r.date_achat).toLocaleDateString('fr-FR') },
        { label: 'N° Autorisation', value: (r) => r.numero_autorisation },
        { label: 'Product ID', value: (r) => r.product_code },
        { label: 'Désignation', value: (r) => r.designation_technique },
        { label: 'N° ONU', value: (r) => r.numero_onu || '-' },
        { label: 'N° CAS', value: (r) => r.numero_cas || '-' },
        { label: 'Quantité', value: (r) => `${r.quantite_acquise} ${r.unite}` },
        { label: 'Fournisseur', value: (r) => r.fournisseur },
        { label: 'N° Facture', value: (r) => r.numero_facture },
        { label: 'Département', value: (r) => r.departement },
        { label: 'Enregistré par', value: (r) => (r.nom ? `${r.prenom} ${r.nom}` : '-') },
      ],
      rows,
    });
  } catch (error) {
    next(error);
  }
};

// Rapport 4 : Produits les Plus Acquis
const produitsReport = async (req, res, next) => {
  try {
    const { format = 'pdf', departement } = req.query;
    let sql = `
      SELECT
        ap.product_code,
        MAX(ap.designation_technique) AS designation_technique,
        MAX(ap.numero_onu) AS numero_onu,
        MAX(ap.numero_cas) AS numero_cas,
        MAX(ap.unite) AS unite,
        SUM(ap.quantite_autorisee) AS quantite_autorisee_totale,
        SUM(ap.quantite_acquise) AS quantite_acquise_totale,
        COUNT(DISTINCT ap.autorisation_id) AS nb_autorisations,
        COUNT(DISTINCT ach.id) AS nb_achats,
        COUNT(DISTINCT ach.fournisseur) AS nb_fournisseurs
      FROM autorisation_produits ap
      LEFT JOIN achats ach ON ach.autorisation_produit_id = ap.id
      WHERE 1 = 1`;
    const params = [];

    if (req.user.role === 'responsable_stock' && req.user.departement) {
      params.push(req.user.departement);
      sql += ` AND ap.departement = $${params.length}`;
    }
    if (departement) {
      params.push(departement);
      sql += ` AND ap.departement = $${params.length}`;
    }

    sql += ' GROUP BY ap.product_code ORDER BY quantite_acquise_totale DESC';
    const { rows } = await query(sql, params);

    const withPct = rows.map((r) => ({
      ...r,
      pourcentage_global: r.quantite_autorisee_totale > 0
        ? ((parseFloat(r.quantite_acquise_totale) / parseFloat(r.quantite_autorisee_totale)) * 100).toFixed(2)
        : '0.00',
    }));

    await send(res, format, 'rapport_produits_plus_acquis', {
      title: 'Rapport 4 — Produits les Plus Acquis',
      subtitle: `${withPct.length} produit(s), triés par quantité acquise décroissante`,
      columns: [
        { label: 'Product ID', value: (r) => r.product_code },
        { label: 'Désignation', value: (r) => r.designation_technique },
        { label: 'N° ONU', value: (r) => r.numero_onu || '-' },
        { label: 'N° CAS', value: (r) => r.numero_cas || '-' },
        { label: 'Qté autorisée', value: (r) => `${r.quantite_autorisee_totale} ${r.unite}` },
        { label: 'Qté acquise', value: (r) => `${r.quantite_acquise_totale} ${r.unite}` },
        { label: '% Global', value: (r) => `${r.pourcentage_global}%` },
        { label: 'Nb autorisations', value: (r) => r.nb_autorisations },
        { label: 'Nb achats', value: (r) => r.nb_achats },
        { label: 'Nb fournisseurs', value: (r) => r.nb_fournisseurs },
      ],
      rows: withPct,
    });
  } catch (error) {
    next(error);
  }
};

// Rapport 5 : Performance par Département
const departementsReport = async (req, res, next) => {
  try {
    const { format = 'pdf' } = req.query;

    if (req.user.role === 'responsable_stock') {
      throw new AppError('Ce rapport est réservé aux administrateurs et visiteurs', 403);
    }

    const { rows } = await query(`
      SELECT
        ap.departement,
        COUNT(DISTINCT ap.autorisation_id) AS nb_autorisations,
        COUNT(DISTINCT ach.id) AS nb_achats,
        COALESCE(SUM(ach.quantite_acquise), 0) AS quantite_totale_acquise,
        COUNT(DISTINCT ap.product_code) AS nb_produits_differents,
        COUNT(DISTINCT ach.fournisseur) AS nb_fournisseurs,
        COUNT(DISTINCT ach.enregistre_par) AS nb_responsables_actifs
      FROM autorisation_produits ap
      LEFT JOIN achats ach ON ach.autorisation_produit_id = ap.id
      GROUP BY ap.departement
      ORDER BY ap.departement
    `);

    await send(res, format, 'rapport_performance_departements', {
      title: 'Rapport 5 — Performance par Département',
      subtitle: `${rows.length} département(s)`,
      columns: [
        { label: 'Département', value: (r) => r.departement },
        { label: 'Nb autorisations', value: (r) => r.nb_autorisations },
        { label: 'Nb achats', value: (r) => r.nb_achats },
        { label: 'Qté totale acquise', value: (r) => Number(r.quantite_totale_acquise).toFixed(2) },
        { label: 'Nb produits différents', value: (r) => r.nb_produits_differents },
        { label: 'Nb fournisseurs', value: (r) => r.nb_fournisseurs },
        { label: 'Responsables actifs', value: (r) => r.nb_responsables_actifs },
      ],
      rows,
    });
  } catch (error) {
    next(error);
  }
};

// Rapport 6 : Déclaration Mensuelle par Autorisation
// Récapitulatif, pour chaque autorisation et produit : achats du mois, utilisations
// du mois, cumuls et stock restant en fin de mois.
const declarationMensuelleReport = async (req, res, next) => {
  try {
    const { format = 'pdf', mois, autorisation_id } = req.query;
    if (!mois || !/^\d{4}-\d{2}$/.test(mois)) {
      throw new AppError('Le paramètre mois est requis, au format AAAA-MM', 400);
    }
    const debut = `${mois}-01`;

    let sql = `
      WITH achats_periode AS (
        SELECT autorisation_produit_id,
          COALESCE(SUM(quantite_acquise) FILTER (WHERE date_achat >= $1::date AND date_achat < ($1::date + INTERVAL '1 month')), 0) AS acquis_mois,
          COALESCE(SUM(quantite_acquise) FILTER (WHERE date_achat < ($1::date + INTERVAL '1 month')), 0) AS cumul_acquis
        FROM achats GROUP BY autorisation_produit_id
      ),
      utilisations_periode AS (
        SELECT autorisation_produit_id,
          COALESCE(SUM(quantite_utilisee) FILTER (WHERE date_utilisation >= $1::date AND date_utilisation < ($1::date + INTERVAL '1 month')), 0) AS utilise_mois,
          COALESCE(SUM(quantite_utilisee) FILTER (WHERE date_utilisation < ($1::date + INTERVAL '1 month')), 0) AS cumul_utilise
        FROM utilisations GROUP BY autorisation_produit_id
      )
      SELECT
        au.numero_autorisation,
        ap.product_code, ap.designation_technique, ap.numero_onu, ap.numero_cas, ap.numero_cee,
        ap.designation_chimique, ap.unite, ap.departement, ap.quantite_autorisee,
        COALESCE(acp.acquis_mois, 0) AS acquis_mois,
        COALESCE(utp.utilise_mois, 0) AS utilise_mois,
        COALESCE(acp.cumul_acquis, 0) AS cumul_acquis,
        COALESCE(utp.cumul_utilise, 0) AS cumul_utilise,
        ap.quantite_autorisee - COALESCE(acp.cumul_acquis, 0) AS quantite_restante,
        COALESCE(acp.cumul_acquis, 0) - COALESCE(utp.cumul_utilise, 0) AS stock_fin_mois
      FROM autorisation_produits ap
      JOIN autorisations au ON au.id = ap.autorisation_id
      LEFT JOIN achats_periode acp ON acp.autorisation_produit_id = ap.id
      LEFT JOIN utilisations_periode utp ON utp.autorisation_produit_id = ap.id
      WHERE au.date_delivrance < ($1::date + INTERVAL '1 month')`;
    const params = [debut];

    if (autorisation_id) {
      params.push(autorisation_id);
      sql += ` AND au.id = $${params.length}`;
    }
    if (req.user.role === 'responsable_stock' && req.user.departement) {
      params.push(req.user.departement);
      sql += ` AND ap.departement = $${params.length}`;
    }
    sql += ' ORDER BY au.numero_autorisation, ap.product_code';

    const { rows } = await query(sql, params);

    await send(res, format, `declaration_mensuelle_${mois}`, {
      title: `Rapport 6 — Déclaration Mensuelle (${mois})`,
      subtitle: `${rows.length} ligne(s) produit × autorisation — mouvements du mois choisi`,
      columns: [
        { label: 'Désignation technique', value: (r) => r.designation_technique },
        { label: 'N° ONU', value: (r) => r.numero_onu || '-' },
        { label: 'N° CAS', value: (r) => r.numero_cas || '-' },
        { label: 'N° CEE', value: (r) => r.numero_cee || '-' },
        { label: 'Désignation chimique', value: (r) => r.designation_chimique || '-' },
        { label: "N° Autorisation", value: (r) => r.numero_autorisation },
        { label: 'Département', value: (r) => r.departement },
        { label: 'Acquis (mois)', value: (r) => `${r.acquis_mois} ${r.unite}` },
        { label: 'Utilisé (mois)', value: (r) => `${r.utilise_mois} ${r.unite}` },
        { label: 'Quantité Acquise', value: (r) => `${r.cumul_acquis} ${r.unite}` },
        { label: 'Quantité Restante', value: (r) => `${r.quantite_restante} ${r.unite}` },
        { label: 'Stock', value: (r) => `${r.stock_fin_mois} ${r.unite}` },
      ],
      rows,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  autorisationsReport,
  autorisationDetailReport,
  achatsReport,
  produitsReport,
  departementsReport,
  declarationMensuelleReport,
};
