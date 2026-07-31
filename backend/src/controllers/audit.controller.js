const { query } = require('../config/db');

const getAll = async (req, res, next) => {
  try {
    const { entite, action } = req.query;
    let sql = `
      SELECT al.*, u.nom, u.prenom, u.email
      FROM audit_logs al
      LEFT JOIN utilisateurs u ON u.id = al.user_id
      WHERE 1 = 1`;
    const params = [];
    if (entite) { params.push(entite); sql += ` AND al.entite = $${params.length}`; }
    if (action) { params.push(action); sql += ` AND al.action = $${params.length}`; }
    sql += ' ORDER BY al.created_at DESC LIMIT 200';

    const { rows } = await query(sql, params);
    res.json({ success: true, data: rows });
  } catch (error) {
    next(error);
  }
};

module.exports = { getAll };
