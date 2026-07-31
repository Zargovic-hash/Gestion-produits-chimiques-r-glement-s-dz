const { query, withTransaction } = require('../config/db');
const AppError = require('../utils/AppError');
const { logAction } = require('../services/audit.service');
const { checkStockAlerts } = require('../services/alert.service');

const getAll = async (req, res, next) => {
  try {
    const { product_code, departement } = req.query;
    let sql = `
      SELECT u.*, usr.nom, usr.prenom
      FROM utilisations u
      LEFT JOIN utilisateurs usr ON usr.id = u.declare_par
      WHERE 1 = 1`;
    const params = [];

    if (req.user.role === 'responsable_stock' && req.user.departement) {
      params.push(req.user.departement);
      sql += ` AND u.departement = $${params.length}`;
    }
    if (product_code) { params.push(product_code); sql += ` AND u.product_code = $${params.length}`; }
    if (departement) { params.push(departement); sql += ` AND u.departement = $${params.length}`; }

    sql += ' ORDER BY u.date_utilisation DESC, u.created_at DESC';

    const { rows } = await query(sql, params);
    res.json({ success: true, data: rows });
  } catch (error) {
    next(error);
  }
};

const create = async (req, res, next) => {
  try {
    const { product_code, departement, quantite_utilisee, unite, date_utilisation, objectif, remarques } = req.body;

    if (!product_code || !departement || !quantite_utilisee || !unite || !date_utilisation) {
      throw new AppError(
        'Champs obligatoires : product_code, departement, quantite_utilisee, unite, date_utilisation',
        400
      );
    }
    const qte = parseFloat(quantite_utilisee);
    if (isNaN(qte) || qte <= 0) {
      throw new AppError('La quantité utilisée doit être un nombre positif', 400);
    }
    if (req.user.role === 'responsable_stock' && req.user.departement !== departement) {
      throw new AppError("Vous ne pouvez déclarer une utilisation que pour votre département", 403);
    }

    const utilisation = await withTransaction(async (client) => {
      // Verrou consultatif pour sérialiser les déclarations concurrentes sur le même produit/département
      await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [`${product_code}:${departement}`]);

      const { rows: stockRows } = await client.query(
        'SELECT * FROM v_stock_produits WHERE product_code = $1 AND departement = $2',
        [product_code, departement]
      );
      const stockDisponible = stockRows.length > 0 ? parseFloat(stockRows[0].stock_disponible) : 0;

      if (qte > stockDisponible) {
        throw new AppError(
          `La quantité utilisée (${qte}) dépasse le stock disponible (${stockDisponible} ${unite}).`,
          400
        );
      }

      const { rows } = await client.query(
        `INSERT INTO utilisations (product_code, departement, quantite_utilisee, unite, date_utilisation, objectif, remarques, declare_par)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
        [product_code, departement, qte, unite, date_utilisation, objectif || null, remarques || null, req.user.id]
      );
      return rows[0];
    });

    await logAction(req.user.id, 'CREATE', 'utilisation', utilisation.id, { product_code, departement, quantite_utilisee: qte });

    checkStockAlerts(product_code, departement).catch((err) =>
      console.error('Erreur lors de la génération des alertes de stock :', err)
    );

    res.status(201).json({ success: true, data: utilisation, message: 'Utilisation enregistrée avec succès' });
  } catch (error) {
    next(error);
  }
};

const remove = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { rows } = await query('SELECT declare_par FROM utilisations WHERE id = $1', [id]);
    if (rows.length === 0) throw new AppError('Utilisation non trouvée', 404);
    if (req.user.role !== 'admin' && rows[0].declare_par !== req.user.id) {
      throw new AppError(
        "Seul le Responsable Stock qui a déclaré cette utilisation ou un administrateur peut la supprimer",
        403
      );
    }

    await query('DELETE FROM utilisations WHERE id = $1', [id]);
    await logAction(req.user.id, 'DELETE', 'utilisation', id);
    res.json({ success: true, message: 'Utilisation supprimée' });
  } catch (error) {
    next(error);
  }
};

module.exports = { getAll, create, remove };
