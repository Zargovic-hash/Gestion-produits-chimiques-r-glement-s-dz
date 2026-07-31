// Piste d'audit (spec §6.1) : qui, quoi, quand pour les actions sensibles
const { query } = require('../config/db');

const logAction = async (userId, action, entite, entiteId, details = null) => {
  try {
    await query(
      'INSERT INTO audit_logs (user_id, action, entite, entite_id, details) VALUES ($1, $2, $3, $4, $5)',
      [userId, action, entite, entiteId, details ? JSON.stringify(details) : null]
    );
  } catch (error) {
    // La piste d'audit ne doit jamais faire échouer l'opération métier
    console.error("Erreur lors de l'écriture de la piste d'audit :", error);
  }
};

module.exports = { logAction };
