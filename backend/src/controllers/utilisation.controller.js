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
        'SELECT * FROM autorisation_produits WHERE id = $1 FOR UPDATE',
        [autorisation_produit_id]
      );
      if (prodRows.length === 0) {
        throw new AppError('Produit autorisé introuvable', 404);
      }
      const produit = prodRows[0];

      if (req.user.role === 'responsable_stock' && req.user.departement !== produit.departement) {
        throw new AppError("Ce produit n'appartient pas à votre département", 403);
      }

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

const remove = async (req, res, next) => {
  try {
    const { id } = req.params;

    await withTransaction(async (client) => {
      const { rows } = await client.query('SELECT * FROM utilisations WHERE id = $1 FOR UPDATE', [id]);
      if (rows.length === 0) throw new AppError('Utilisation non trouvée', 404);
      const utilisation = rows[0];

      if (req.user.role !== 'admin' && utilisation.declare_par !== req.user.id) {
        throw new AppError(
          "Seul le Responsable Stock qui a déclaré cette utilisation ou un administrateur peut la supprimer",
          403
        );
      }

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

module.exports = { getAll, create, remove };
