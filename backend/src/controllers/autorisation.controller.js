const { query, withTransaction } = require('../config/db');
const AppError = require('../utils/AppError');
const { calculerDateEcheance, ETAT_LABELS } = require('../utils/calculations');

const UNITES = ['L', 'mL', 'kg', 'g', 't', 'unite'];
const TYPES_MARCHE = ['Local', 'International'];

const withLabel = (row) => ({ ...row, etat_libelle: ETAT_LABELS[row.etat] || row.etat });

const validateProduits = (produits) => {
  if (!Array.isArray(produits) || produits.length === 0) {
    throw new AppError('Au moins un produit avec une quantité autorisée est requis', 400);
  }
  for (const p of produits) {
    if (!p.product_code || !p.designation_technique || !p.unite || !p.departement) {
      throw new AppError(
        'Chaque produit requiert : product_code, designation_technique, unite, departement',
        400
      );
    }
    if (!UNITES.includes(p.unite)) {
      throw new AppError(`Unité invalide : ${p.unite}`, 400);
    }
    const qte = parseFloat(p.quantite_autorisee);
    if (isNaN(qte) || qte <= 0) {
      throw new AppError(`Quantité autorisée invalide pour ${p.product_code}`, 400);
    }
  }
};

// Visiteur : lecture globale. Responsable Stock : limité aux autorisations
// contenant au moins un produit de son département. Admin : accès total.
const getAll = async (req, res, next) => {
  try {
    const { etat, departement } = req.query;
    let sql = 'SELECT * FROM v_autorisations WHERE is_archived = false';
    const params = [];

    if (req.user.role === 'responsable_stock' && req.user.departement) {
      params.push(req.user.departement);
      sql += ` AND id IN (
        SELECT autorisation_id FROM autorisation_produits WHERE departement = $${params.length}
      )`;
    }

    if (departement) {
      params.push(departement);
      sql += ` AND id IN (
        SELECT autorisation_id FROM autorisation_produits WHERE departement = $${params.length}
      )`;
    }

    sql += ' ORDER BY created_at DESC';

    const { rows } = await query(sql, params);
    let data = rows.map(withLabel);
    if (etat) data = data.filter((r) => r.etat === etat);

    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

const getById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { rows } = await query('SELECT * FROM v_autorisations WHERE id = $1', [id]);
    if (rows.length === 0) throw new AppError('Autorisation non trouvée', 404);

    const { rows: produits } = await query(
      `SELECT *,
        (quantite_autorisee - quantite_acquise) AS reste_a_acquerir,
        CASE WHEN quantite_autorisee > 0
          THEN ROUND((quantite_acquise / quantite_autorisee) * 100, 2)
          ELSE 0 END AS pourcentage_acquis
       FROM autorisation_produits WHERE autorisation_id = $1 ORDER BY product_code`,
      [id]
    );

    const { rows: achats } = await query(
      `SELECT a.*, ap.product_code, ap.designation_technique, ap.unite
       FROM achats a
       JOIN autorisation_produits ap ON ap.id = a.autorisation_produit_id
       WHERE ap.autorisation_id = $1
       ORDER BY a.date_achat DESC, a.created_at DESC`,
      [id]
    );

    res.json({ success: true, data: { ...withLabel(rows[0]), produits, achats } });
  } catch (error) {
    next(error);
  }
};

const create = async (req, res, next) => {
  try {
    const {
      numero_autorisation,
      date_delivrance,
      duree_validite_jours,
      type_marche,
      canevas_id,
      notes,
      produits,
    } = req.body;

    if (!numero_autorisation || !date_delivrance || !duree_validite_jours || !type_marche) {
      throw new AppError(
        'numero_autorisation, date_delivrance, duree_validite_jours et type_marche sont requis',
        400
      );
    }
    if (!TYPES_MARCHE.includes(type_marche)) {
      throw new AppError(`type_marche invalide. Doit être : ${TYPES_MARCHE.join(', ')}`, 400);
    }
    validateProduits(produits);

    const date_echeance = calculerDateEcheance(date_delivrance, duree_validite_jours);

    const autorisation = await withTransaction(async (client) => {
      const { rows } = await client.query(
        `INSERT INTO autorisations (
          numero_autorisation, date_delivrance, duree_validite_jours, date_echeance,
          type_marche, canevas_id, notes, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
        [
          numero_autorisation,
          date_delivrance,
          duree_validite_jours,
          date_echeance,
          type_marche,
          canevas_id || null,
          notes || null,
          req.user.id,
        ]
      );
      const auth = rows[0];

      for (const p of produits) {
        await client.query(
          `INSERT INTO autorisation_produits (
            autorisation_id, product_code, designation_technique, numero_onu, numero_cas,
            numero_cee, designation_chimique, autre_designation, unite, departement, quantite_autorisee
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
          [
            auth.id,
            p.product_code,
            p.designation_technique,
            p.numero_onu || null,
            p.numero_cas || null,
            p.numero_cee || null,
            p.designation_chimique || null,
            p.autre_designation || null,
            p.unite,
            p.departement,
            parseFloat(p.quantite_autorisee),
          ]
        );
      }
      return auth;
    });

    const { rows: full } = await query('SELECT * FROM v_autorisations WHERE id = $1', [
      autorisation.id,
    ]);

    res
      .status(201)
      .json({ success: true, data: withLabel(full[0]), message: 'Autorisation créée avec succès' });
  } catch (error) {
    next(error);
  }
};

const update = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { notes, type_marche, is_archived } = req.body;

    const fields = [];
    const values = [];
    let i = 1;
    if (notes !== undefined) {
      fields.push(`notes = $${i++}`);
      values.push(notes);
    }
    if (type_marche !== undefined) {
      if (!TYPES_MARCHE.includes(type_marche)) {
        throw new AppError(`type_marche invalide. Doit être : ${TYPES_MARCHE.join(', ')}`, 400);
      }
      fields.push(`type_marche = $${i++}`);
      values.push(type_marche);
    }
    if (is_archived !== undefined) {
      fields.push(`is_archived = $${i++}`);
      values.push(is_archived);
    }
    if (fields.length === 0) throw new AppError('Aucune modification fournie', 400);

    fields.push('updated_at = now()');
    values.push(id);

    const { rows } = await query(
      `UPDATE autorisations SET ${fields.join(', ')} WHERE id = $${i} RETURNING id`,
      values
    );
    if (rows.length === 0) throw new AppError('Autorisation non trouvée', 404);

    const { rows: full } = await query('SELECT * FROM v_autorisations WHERE id = $1', [id]);
    res.json({ success: true, data: withLabel(full[0]) });
  } catch (error) {
    next(error);
  }
};

const remove = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { rows } = await query('DELETE FROM autorisations WHERE id = $1 RETURNING id', [id]);
    if (rows.length === 0) throw new AppError('Autorisation non trouvée', 404);
    res.json({ success: true, message: 'Autorisation supprimée (achats associés supprimés)' });
  } catch (error) {
    next(error);
  }
};

module.exports = { getAll, getById, create, update, remove };
