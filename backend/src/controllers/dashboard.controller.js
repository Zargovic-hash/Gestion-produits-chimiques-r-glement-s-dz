const { query } = require('../config/db');

const getStats = async (req, res, next) => {
  try {
    let sql = 'SELECT * FROM v_autorisations WHERE is_archived = false';
    const params = [];

    if (req.user.role === 'responsable_stock' && req.user.departement) {
      params.push(req.user.departement);
      sql += ` AND id IN (
        SELECT autorisation_id FROM autorisation_produits WHERE departement = $${params.length}
      )`;
    }

    const { rows } = await query(sql, params);

    const parEtat = { ACTIVE: 0, PRESQUE_EPUISEE: 0, EPUISEE: 0, PRESQUE_EXPIREE: 0, EXPIREE: 0 };
    rows.forEach((r) => { parEtat[r.etat] = (parEtat[r.etat] || 0) + 1; });

    const { rows: canevasCount } = await query('SELECT COUNT(*) FROM canevas');
    const { rows: achatsCount } = await query('SELECT COUNT(*) FROM achats');
    const { rows: recents } = await query(
      `SELECT a.id, a.quantite_acquise, a.date_achat, a.created_at,
              ap.product_code, ap.designation_technique, ap.unite,
              au.numero_autorisation, u.nom, u.prenom
       FROM achats a
       JOIN autorisation_produits ap ON ap.id = a.autorisation_produit_id
       JOIN autorisations au ON au.id = ap.autorisation_id
       LEFT JOIN utilisateurs u ON u.id = a.enregistre_par
       ORDER BY a.created_at DESC LIMIT 10`
    );

    res.json({
      success: true,
      data: {
        total_autorisations: rows.length,
        par_etat: parEtat,
        total_canevas: parseInt(canevasCount[0].count, 10),
        total_achats: parseInt(achatsCount[0].count, 10),
        alertes_critiques: rows.filter((r) =>
          ['EXPIREE', 'PRESQUE_EXPIREE', 'PRESQUE_EPUISEE', 'EPUISEE'].includes(r.etat)
        ),
        activite_recente: recents,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { getStats };
