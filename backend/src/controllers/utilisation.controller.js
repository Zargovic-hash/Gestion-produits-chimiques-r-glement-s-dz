const { query, withTransaction } = require('../config/db');
const AppError = require('../utils/AppError');
const { logAction } = require('../services/audit.service');
const { checkStockAlerts } = require('../services/alert.service');

const getAll = async (req, res, next) => {
  try {
    const { autorisation_id } = req.query;
    let sql = `
      SELECT u.*, ap.product_code, ap.designation_technique, ap.unite, ap.departement,
             au.id AS autorisation_id, au.numero_autorisation,
             usr.nom, usr.prenom
      FROM utilisations u
      JOIN autorisation_produits ap ON ap.id = u.autorisation_produit_id
      JOIN autorisations au ON au.id = ap.autorisation_id
      LEFT JOIN utilisateurs usr ON usr.id = u.declare_par
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

    sql += ' ORDER BY u.date_utilisation DESC, u.created_at DESC';

    const { rows } = await query(sql, params);
    res.json({ success: true, data: rows });
  } catch (error) {
    next(error);
  }
};

// Validation : la date d'utilisation doit être dans la période de validité de l'autorisation
const assertDateDansValidite = (date, dateDelivrance, dateEcheance) => {
  const d = new Date(date);
  const debut = new Date(dateDelivrance);
  const fin = new Date(dateEcheance);
  if (d < debut || d > fin) {
    throw new AppError(
      `La date (${new Date(date).toLocaleDateString('fr-FR')}) doit être comprise entre la date de délivrance ` +
      `(${debut.toLocaleDateString('fr-FR')}) et la date d'échéance (${fin.toLocaleDateString('fr-FR')}) de l'autorisation.`,
      400
    );
  }
};

const create = async (req, res, next) => {
  try {
    const { autorisation_produit_id, quantite_utilisee, date_utilisation, objectif, remarques } = req.body;

    if (!autorisation_produit_id || !quantite_utilisee || !date_utilisation) {
      throw new AppError(
        'Champs obligatoires : autorisation_produit_id, quantite_utilisee, date_utilisation',
        400
      );
    }
    const qte = parseFloat(quantite_utilisee);
    if (isNaN(qte) || qte <= 0) {
      throw new AppError('La quantité utilisée doit être un nombre positif', 400);
    }

    const utilisation = await withTransaction(async (client) => {
      const { rows: prodRows } = await client.query(
        `SELECT ap.*, au.date_delivrance, au.date_echeance
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

      assertDateDansValidite(date_utilisation, produit.date_delivrance, produit.date_echeance);

      const stockDisponible = parseFloat(produit.quantite_acquise) - parseFloat(produit.quantite_utilisee);
      if (qte > stockDisponible) {
        throw new AppError(
          `La quantité utilisée (${qte}) dépasse le stock disponible pour cette autorisation (${stockDisponible} ${produit.unite}).`,
          400
        );
      }

      const { rows } = await client.query(
        `INSERT INTO utilisations (autorisation_produit_id, quantite_utilisee, date_utilisation, objectif, remarques, declare_par)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
        [autorisation_produit_id, qte, date_utilisation, objectif || null, remarques || null, req.user.id]
      );

      await client.query(
        'UPDATE autorisation_produits SET quantite_utilisee = quantite_utilisee + $1 WHERE id = $2',
        [qte, autorisation_produit_id]
      );

      return { utilisation: rows[0], produit };
    });

    await logAction(req.user.id, 'CREATE', 'utilisation', utilisation.utilisation.id, {
      autorisation_produit_id,
      quantite_utilisee: qte,
    });

    checkStockAlerts(utilisation.produit.product_code, utilisation.produit.departement).catch((err) =>
      console.error('Erreur lors de la génération des alertes de stock :', err)
    );

    res.status(201).json({
      success: true,
      data: utilisation.utilisation,
      message: 'Utilisation enregistrée avec succès',
    });
  } catch (error) {
    next(error);
  }
};

const assertOwnerOrAdmin = (utilisation, user) => {
  if (user.role !== 'admin' && utilisation.declare_par !== user.id) {
    throw new AppError(
      "Seul le Responsable Stock qui a déclaré cette utilisation ou un administrateur peut la modifier",
      403
    );
  }
};

// Correction d'une utilisation (équivalent de ModifierUtilisation() en VBA) : permet de
// modifier la quantité elle-même, avec recalcul automatique du stock de l'autorisation.
const update = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { objectif, remarques, date_utilisation, quantite_utilisee } = req.body;

    const result = await withTransaction(async (client) => {
      const { rows } = await client.query('SELECT * FROM utilisations WHERE id = $1 FOR UPDATE', [id]);
      if (rows.length === 0) throw new AppError('Utilisation non trouvée', 404);
      const utilisationActuelle = rows[0];

      assertOwnerOrAdmin(utilisationActuelle, req.user);

      const { rows: prodRows } = await client.query(
        `SELECT ap.*, au.date_delivrance, au.date_echeance
         FROM autorisation_produits ap
         JOIN autorisations au ON au.id = ap.autorisation_id
         WHERE ap.id = $1 FOR UPDATE`,
        [utilisationActuelle.autorisation_produit_id]
      );
      const produit = prodRows[0];

      const nouvelleDate = date_utilisation !== undefined ? date_utilisation : utilisationActuelle.date_utilisation;
      assertDateDansValidite(nouvelleDate, produit.date_delivrance, produit.date_echeance);

      let nouvelleQuantite = parseFloat(utilisationActuelle.quantite_utilisee);
      if (quantite_utilisee !== undefined) {
        nouvelleQuantite = parseFloat(quantite_utilisee);
        if (isNaN(nouvelleQuantite) || nouvelleQuantite <= 0) {
          throw new AppError('La quantité utilisée doit être un nombre positif', 400);
        }
        const disponibleAvantCetteUtilisation =
          parseFloat(produit.quantite_acquise) -
          (parseFloat(produit.quantite_utilisee) - parseFloat(utilisationActuelle.quantite_utilisee));
        if (nouvelleQuantite > disponibleAvantCetteUtilisation) {
          throw new AppError(
            `La nouvelle quantité (${nouvelleQuantite}) dépasse le stock disponible (${disponibleAvantCetteUtilisation}).`,
            400
          );
        }
      }

      const fields = [];
      const values = [];
      let i = 1;
      if (objectif !== undefined) { fields.push(`objectif = $${i++}`); values.push(objectif); }
      if (remarques !== undefined) { fields.push(`remarques = $${i++}`); values.push(remarques); }
      if (date_utilisation !== undefined) { fields.push(`date_utilisation = $${i++}`); values.push(date_utilisation); }
      if (quantite_utilisee !== undefined) { fields.push(`quantite_utilisee = $${i++}`); values.push(nouvelleQuantite); }
      if (fields.length === 0) throw new AppError('Aucune modification fournie', 400);

      values.push(id);
      const { rows: updated } = await client.query(
        `UPDATE utilisations SET ${fields.join(', ')} WHERE id = $${i} RETURNING *`,
        values
      );

      if (quantite_utilisee !== undefined) {
        const delta = nouvelleQuantite - parseFloat(utilisationActuelle.quantite_utilisee);
        await client.query(
          'UPDATE autorisation_produits SET quantite_utilisee = quantite_utilisee + $1 WHERE id = $2',
          [delta, utilisationActuelle.autorisation_produit_id]
        );
      }

      return { updated: updated[0], produit };
    });

    if (quantite_utilisee !== undefined) {
      checkStockAlerts(result.produit.product_code, result.produit.departement).catch((err) =>
        console.error('Erreur lors de la génération des alertes de stock :', err)
      );
    }

    await logAction(req.user.id, 'UPDATE', 'utilisation', id, req.body);
    res.json({ success: true, data: result.updated });
  } catch (error) {
    next(error);
  }
};

const remove = async (req, res, next) => {
  try {
    const { id } = req.params;

    await withTransaction(async (client) => {
      const { rows } = await client.query('SELECT * FROM utilisations WHERE id = $1 FOR UPDATE', [id]);
      if (rows.length === 0) throw new AppError('Utilisation non trouvée', 404);
      const utilisation = rows[0];

      assertOwnerOrAdmin(utilisation, req.user);

      await client.query('DELETE FROM utilisations WHERE id = $1', [id]);
      await client.query(
        'UPDATE autorisation_produits SET quantite_utilisee = quantite_utilisee - $1 WHERE id = $2',
        [utilisation.quantite_utilisee, utilisation.autorisation_produit_id]
      );
    });

    await logAction(req.user.id, 'DELETE', 'utilisation', id);
    res.json({ success: true, message: 'Utilisation supprimée et quantités recalculées' });
  } catch (error) {
    next(error);
  }
};

module.exports = { getAll, create, update, remove };
