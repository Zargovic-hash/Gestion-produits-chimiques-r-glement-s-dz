const { query, withTransaction } = require('../config/db');
const AppError = require('../utils/AppError');
const { checkAutorisationAlerts } = require('../services/alert.service');
const { logAction } = require('../services/audit.service');

const getAll = async (req, res, next) => {
  try {
    const { autorisation_id } = req.query;
    let sql = `
      SELECT a.*, ap.product_code, ap.designation_technique, ap.unite, ap.departement,
             au.id AS autorisation_id, au.numero_autorisation
      FROM achats a
      JOIN autorisation_produits ap ON ap.id = a.autorisation_produit_id
      JOIN autorisations au ON au.id = ap.autorisation_id
      WHERE 1 = 1`;
    const params = [];

    if (autorisation_id) {
      params.push(autorisation_id);
      sql += ` AND au.id = $${params.length}`;
    }

    if (req.user.role === 'responsable_stock' && req.user.departement) {
      params.push(req.user.departement);
      sql += ` AND ap.departement = $${params.length}`;
    }

    sql += ' ORDER BY a.date_achat DESC, a.created_at DESC';

    const { rows } = await query(sql, params);
    res.json({ success: true, data: rows });
  } catch (error) {
    next(error);
  }
};

const create = async (req, res, next) => {
  try {
    const {
      autorisation_produit_id,
      quantite_acquise,
      date_achat,
      fournisseur,
      numero_facture,
      remarques,
    } = req.body;

    if (!autorisation_produit_id || !quantite_acquise || !date_achat || !fournisseur || !numero_facture) {
      throw new AppError(
        'Champs obligatoires : autorisation_produit_id, quantite_acquise, date_achat, fournisseur, numero_facture',
        400
      );
    }

    const qte = parseFloat(quantite_acquise);
    if (isNaN(qte) || qte <= 0) {
      throw new AppError('La quantité acquise doit être un nombre positif', 400);
    }

    const achat = await withTransaction(async (client) => {
      // Verrouille la ligne produit pour éviter les achats concurrents
      const { rows: prodRows } = await client.query(
        `SELECT ap.*, au.date_delivrance, au.date_echeance, au.numero_autorisation
         FROM autorisation_produits ap
         JOIN autorisations au ON au.id = ap.autorisation_id
         WHERE ap.id = $1 FOR UPDATE`,
        [autorisation_produit_id]
      );
      if (prodRows.length === 0) {
        throw new AppError('Produit autorisé introuvable', 404);
      }
      const produit = prodRows[0];

      if (req.user.role === 'responsable_stock' && req.user.departement !== produit.departement) {
        throw new AppError("Ce produit n'appartient pas à votre département", 403);
      }

      // Validation 1 : autorisation non expirée
      const { rows: etatRows } = await client.query(
        'SELECT calculer_etat_autorisation($1) AS etat',
        [produit.autorisation_id]
      );
      if (etatRows[0].etat === 'EXPIREE') {
        throw new AppError('Cette autorisation est expirée. Aucun achat ne peut être enregistré.', 400);
      }

      // Validation 2 : quantité disponible
      const resteDisponible = parseFloat(produit.quantite_autorisee) - parseFloat(produit.quantite_acquise);
      if (qte > resteDisponible) {
        throw new AppError(
          `La quantité saisie (${qte}) dépasse le reste disponible (${resteDisponible}).`,
          400
        );
      }

      // Insertion de l'achat
      const { rows: achatRows } = await client.query(
        `INSERT INTO achats (
          autorisation_produit_id, quantite_acquise, date_achat, fournisseur,
          numero_facture, remarques, enregistre_par
        ) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
        [autorisation_produit_id, qte, date_achat, fournisseur, numero_facture, remarques || null, req.user.id]
      );

      // Mise à jour de la quantité acquise
      await client.query(
        'UPDATE autorisation_produits SET quantite_acquise = quantite_acquise + $1 WHERE id = $2',
        [qte, autorisation_produit_id]
      );

      return { achat: achatRows[0], produit, resteDisponible: resteDisponible - qte };
    });

    // Vérification des seuils d'alerte (spec §4.4) - ne bloque pas la réponse en cas d'échec
    checkAutorisationAlerts(achat.produit.autorisation_id).catch((err) =>
      console.error('Erreur lors de la génération des alertes :', err)
    );

    await logAction(req.user.id, 'CREATE', 'achat', achat.achat.id, {
      autorisation_produit_id,
      quantite_acquise: qte,
    });

    res.status(201).json({
      success: true,
      data: achat.achat,
      message: 'Achat enregistré avec succès',
      reste_disponible: achat.resteDisponible,
    });
  } catch (error) {
    next(error);
  }
};

const assertOwnerOrAdmin = async (achatId, user) => {
  const { rows } = await query('SELECT enregistre_par FROM achats WHERE id = $1', [achatId]);
  if (rows.length === 0) throw new AppError('Achat non trouvé', 404);
  if (user.role !== 'admin' && rows[0].enregistre_par !== user.id) {
    throw new AppError(
      "Seul le Responsable Stock qui a créé cet achat ou un administrateur peut le modifier",
      403
    );
  }
};

const update = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { fournisseur, numero_facture, remarques, date_achat } = req.body;

    await assertOwnerOrAdmin(id, req.user);

    const fields = [];
    const values = [];
    let i = 1;
    if (fournisseur !== undefined) { fields.push(`fournisseur = $${i++}`); values.push(fournisseur); }
    if (numero_facture !== undefined) { fields.push(`numero_facture = $${i++}`); values.push(numero_facture); }
    if (remarques !== undefined) { fields.push(`remarques = $${i++}`); values.push(remarques); }
    if (date_achat !== undefined) { fields.push(`date_achat = $${i++}`); values.push(date_achat); }
    if (fields.length === 0) throw new AppError('Aucune modification fournie', 400);

    values.push(id);
    const { rows } = await query(
      `UPDATE achats SET ${fields.join(', ')} WHERE id = $${i} RETURNING *`,
      values
    );
    if (rows.length === 0) throw new AppError('Achat non trouvé', 404);

    await logAction(req.user.id, 'UPDATE', 'achat', id, req.body);

    res.json({ success: true, data: rows[0] });
  } catch (error) {
    next(error);
  }
};

const remove = async (req, res, next) => {
  try {
    const { id } = req.params;

    await withTransaction(async (client) => {
      const { rows } = await client.query(
        'SELECT * FROM achats WHERE id = $1 FOR UPDATE',
        [id]
      );
      if (rows.length === 0) throw new AppError('Achat non trouvé', 404);
      const achat = rows[0];

      if (req.user.role !== 'admin' && achat.enregistre_par !== req.user.id) {
        throw new AppError(
          "Seul le Responsable Stock qui a créé cet achat ou un administrateur peut le supprimer",
          403
        );
      }

      await client.query('DELETE FROM achats WHERE id = $1', [id]);

      // Recalcul de la quantité acquise (recul de l'achat supprimé)
      await client.query(
        'UPDATE autorisation_produits SET quantite_acquise = quantite_acquise - $1 WHERE id = $2',
        [achat.quantite_acquise, achat.autorisation_produit_id]
      );
    });

    await logAction(req.user.id, 'DELETE', 'achat', id);

    res.json({ success: true, message: 'Achat supprimé et quantités recalculées' });
  } catch (error) {
    next(error);
  }
};

module.exports = { getAll, create, update, remove };
