const { query } = require('../config/db');
const AppError = require('../utils/AppError');
const { logAction } = require('../services/audit.service');

const getStock = async (req, res, next) => {
  try {
    let sql = 'SELECT * FROM v_stock_produits WHERE 1 = 1';
    const params = [];

    if (req.user.role === 'responsable_stock' && req.user.departement) {
      params.push(req.user.departement);
      sql += ` AND departement = $${params.length}`;
    }
    if (req.query.departement) {
      params.push(req.query.departement);
      sql += ` AND departement = $${params.length}`;
    }

    sql += ' ORDER BY statut = \'CRITIQUE\' DESC, statut = \'FAIBLE\' DESC, departement, product_code';

    const { rows } = await query(sql, params);
    res.json({ success: true, data: rows });
  } catch (error) {
    next(error);
  }
};

const getSeuils = async (req, res, next) => {
  try {
    const { rows } = await query('SELECT * FROM seuils_stock ORDER BY departement, product_code');
    res.json({ success: true, data: rows });
  } catch (error) {
    next(error);
  }
};

const upsertSeuil = async (req, res, next) => {
  try {
    const { product_code, departement, stock_minimum } = req.body;
    if (!product_code || !departement || stock_minimum === undefined) {
      throw new AppError('product_code, departement et stock_minimum sont requis', 400);
    }
    const seuil = parseFloat(stock_minimum);
    if (isNaN(seuil) || seuil < 0) {
      throw new AppError('stock_minimum doit être un nombre positif ou nul', 400);
    }

    const { rows } = await query(
      `INSERT INTO seuils_stock (product_code, departement, stock_minimum, created_by)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (product_code, departement)
       DO UPDATE SET stock_minimum = EXCLUDED.stock_minimum, updated_at = now()
       RETURNING *`,
      [product_code, departement, seuil, req.user.id]
    );

    await logAction(req.user.id, 'UPDATE', 'seuil_stock', rows[0].id, { product_code, departement, stock_minimum: seuil });

    res.json({ success: true, data: rows[0] });
  } catch (error) {
    next(error);
  }
};

module.exports = { getStock, getSeuils, upsertSeuil };
