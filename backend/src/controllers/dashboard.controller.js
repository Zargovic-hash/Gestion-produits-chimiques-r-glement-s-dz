const { query } = require('../config/db');

const getStats = async (req, res, next) => {
  try {
    const isResponsable = req.user.role === 'responsable_stock' && req.user.departement;
    const isVisiteur = req.user.role === 'visiteur';

    let sql = 'SELECT * FROM v_autorisations WHERE is_archived = false';
    const params = [];

    if (isResponsable) {
      params.push(req.user.departement);
      sql += ` AND id IN (
        SELECT autorisation_id FROM autorisation_produits WHERE departement = $${params.length}
      )`;
    }

    const { rows } = await query(sql, params);

    const parEtat = { ACTIVE: 0, PRESQUE_EPUISEE: 0, EPUISEE: 0, PRESQUE_EXPIREE: 0, EXPIREE: 0 };
    rows.forEach((r) => { parEtat[r.etat] = (parEtat[r.etat] || 0) + 1; });

    const activesAvecQuantite = rows.filter((r) => r.etat !== 'EXPIREE');
    const moyennePourcentageAcquis = activesAvecQuantite.length > 0
      ? (
          activesAvecQuantite.reduce((sum, r) => sum + parseFloat(r.pourcentage_acquis), 0) /
          activesAvecQuantite.length
        ).toFixed(1)
      : '0.0';

    const { rows: canevasCount } = await query('SELECT COUNT(*) FROM canevas');

    let achatsCountSql = 'SELECT COUNT(*) FROM achats a';
    let evolutionSql = `
      SELECT to_char(date_trunc('month', a.date_achat), 'YYYY-MM') AS mois,
             COALESCE(SUM(a.quantite_acquise), 0) AS quantite, COUNT(*) AS nb_achats
      FROM achats a`;
    let top10Sql = `
      SELECT ap.product_code, MAX(ap.designation_technique) AS designation_technique,
             SUM(a.quantite_acquise) AS quantite_totale, MAX(ap.unite) AS unite
      FROM achats a JOIN autorisation_produits ap ON ap.id = a.autorisation_produit_id`;
    const achatParams = [];

    if (isResponsable) {
      const joinClause = ' JOIN autorisation_produits ap2 ON ap2.id = a.autorisation_produit_id';
      achatsCountSql += `${joinClause} WHERE ap2.departement = $1`;
      evolutionSql += `${joinClause} WHERE ap2.departement = $1 AND a.date_achat >= (CURRENT_DATE - INTERVAL '6 months')`;
      top10Sql += ' WHERE ap.departement = $1';
      achatParams.push(req.user.departement);
    } else {
      evolutionSql += " WHERE a.date_achat >= (CURRENT_DATE - INTERVAL '6 months')";
    }
    evolutionSql += ' GROUP BY 1 ORDER BY 1';
    top10Sql += ' GROUP BY ap.product_code ORDER BY quantite_totale DESC LIMIT 10';

    const [achatsCount, evolution, top10] = await Promise.all([
      query(achatsCountSql, achatParams),
      query(evolutionSql, achatParams),
      query(top10Sql, achatParams),
    ]);

    const data = {
      total_autorisations: rows.length,
      par_etat: parEtat,
      total_canevas: parseInt(canevasCount[0].count, 10),
      total_achats: parseInt(achatsCount.rows[0].count, 10),
      moyenne_pourcentage_acquis: parseFloat(moyennePourcentageAcquis),
      evolution_achats: evolution.rows,
      top_produits: top10.rows,
      alertes_critiques: rows.filter((r) =>
        ['EXPIREE', 'PRESQUE_EXPIREE', 'PRESQUE_EPUISEE', 'EPUISEE'].includes(r.etat)
      ),
    };

    // Le Visiteur n'a pas accès au détail nominatif de l'activité récente (spec §5.1)
    if (!isVisiteur) {
      const recentSql = `
        SELECT a.id, a.quantite_acquise, a.date_achat, a.created_at,
               ap.product_code, ap.designation_technique, ap.unite,
               au.numero_autorisation, u.nom, u.prenom
        FROM achats a
        JOIN autorisation_produits ap ON ap.id = a.autorisation_produit_id
        JOIN autorisations au ON au.id = ap.autorisation_id
        LEFT JOIN utilisateurs u ON u.id = a.enregistre_par
        ${isResponsable ? 'WHERE ap.departement = $1' : ''}
        ORDER BY a.created_at DESC LIMIT 10`;
      const { rows: recents } = await query(recentSql, isResponsable ? [req.user.departement] : []);
      data.activite_recente = recents;
    }

    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

module.exports = { getStats };
