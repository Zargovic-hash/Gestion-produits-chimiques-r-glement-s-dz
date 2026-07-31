const { query } = require('../config/db');
const AppError = require('../utils/AppError');

const getAll = async (req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT n.*, a.numero_autorisation
       FROM notifications n
       LEFT JOIN autorisations a ON a.id = n.autorisation_id
       WHERE n.user_id = $1
       ORDER BY n.created_at DESC
       LIMIT 50`,
      [req.user.id]
    );
    const { rows: countRows } = await query(
      'SELECT COUNT(*) FROM notifications WHERE user_id = $1 AND est_lue = false',
      [req.user.id]
    );
    res.json({ success: true, data: rows, non_lues: parseInt(countRows[0].count, 10) });
  } catch (error) {
    next(error);
  }
};

const markRead = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { rows } = await query(
      'UPDATE notifications SET est_lue = true WHERE id = $1 AND user_id = $2 RETURNING *',
      [id, req.user.id]
    );
    if (rows.length === 0) throw new AppError('Notification non trouvée', 404);
    res.json({ success: true, data: rows[0] });
  } catch (error) {
    next(error);
  }
};

const markAllRead = async (req, res, next) => {
  try {
    await query('UPDATE notifications SET est_lue = true WHERE user_id = $1 AND est_lue = false', [
      req.user.id,
    ]);
    res.json({ success: true, message: 'Toutes les notifications ont été marquées comme lues' });
  } catch (error) {
    next(error);
  }
};

module.exports = { getAll, markRead, markAllRead };
