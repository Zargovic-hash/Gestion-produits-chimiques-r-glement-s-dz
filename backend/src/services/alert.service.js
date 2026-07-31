// Génération des alertes/notifications (spec §4.4 + §6.2)
const { query } = require('../config/db');

const DEDUP_WINDOW_HOURS = 24;

// Dédoublonnage null-safe : deux alertes sont "les mêmes" si même utilisateur, type,
// et même référence (autorisation_id OU la clé texte "reference" pour les alertes de stock).
const alreadyNotifiedRecently = async (userId, autorisationId, type, reference) => {
  const { rows } = await query(
    `SELECT 1 FROM notifications
     WHERE user_id = $1 AND type = $2
       AND autorisation_id IS NOT DISTINCT FROM $3
       AND reference IS NOT DISTINCT FROM $4
       AND created_at > now() - ($5 || ' hours')::interval
     LIMIT 1`,
    [userId, type, autorisationId || null, reference || null, DEDUP_WINDOW_HOURS]
  );
  return rows.length > 0;
};

const notify = async ({ userId, autorisationId = null, reference = null, type, priorite, titre, message }) => {
  if (await alreadyNotifiedRecently(userId, autorisationId, type, reference)) return;
  await query(
    `INSERT INTO notifications (user_id, autorisation_id, reference, type, priorite, titre, message)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [userId, autorisationId, reference, type, priorite, titre, message]
  );
};

const getAdmins = async () => {
  const { rows } = await query("SELECT id FROM utilisateurs WHERE role = 'admin' AND is_active = true");
  return rows;
};

const getResponsablesStock = async (departement) => {
  const { rows } = await query(
    "SELECT id FROM utilisateurs WHERE role = 'responsable_stock' AND is_active = true AND departement = $1",
    [departement]
  );
  return rows;
};

/**
 * Vérifie une autorisation et génère les notifications nécessaires.
 * Appelée après chaque achat (immédiat) et quotidiennement (scheduler).
 */
const checkAutorisationAlerts = async (autorisationId) => {
  const { rows } = await query('SELECT * FROM v_autorisations WHERE id = $1', [autorisationId]);
  if (rows.length === 0) return;
  const auth = rows[0];

  const admins = await getAdmins();
  const joursRestants = auth.jours_restants;
  const pctAcquis = parseFloat(auth.pourcentage_acquis);

  // Expiration effective
  if (auth.etat === 'EXPIREE') {
    for (const admin of admins) {
      await notify({
        userId: admin.id,
        autorisationId,
        type: 'EXPIREE',
        priorite: 'CRITICAL',
        titre: 'Autorisation expirée',
        message: `L'autorisation ${auth.numero_autorisation} a expiré. Aucun achat ne peut être enregistré.`,
      });
    }
  }
  // Expiration proche (≤ 30 jours)
  else if (joursRestants <= 30) {
    for (const admin of admins) {
      await notify({
        userId: admin.id,
        autorisationId,
        type: 'EXPIRATION_PROCHE',
        priorite: joursRestants <= 7 ? 'CRITICAL' : 'HIGH',
        titre: 'Autorisation bientôt expirée',
        message: `L'autorisation ${auth.numero_autorisation} expire dans ${joursRestants} jour(s).`,
      });
    }
  }

  // Épuisement global (≥ 80%)
  if (pctAcquis >= 80) {
    const { rows: departements } = await query(
      'SELECT DISTINCT departement FROM autorisation_produits WHERE autorisation_id = $1',
      [autorisationId]
    );
    const recipients = new Map(admins.map((a) => [a.id, a]));
    for (const { departement } of departements) {
      const responsables = await getResponsablesStock(departement);
      responsables.forEach((r) => recipients.set(r.id, r));
    }
    for (const recipient of recipients.values()) {
      await notify({
        userId: recipient.id,
        autorisationId,
        type: 'PRESQUE_EPUISEE',
        priorite: pctAcquis >= 100 ? 'CRITICAL' : 'HIGH',
        titre: pctAcquis >= 100 ? 'Autorisation épuisée' : 'Autorisation presque épuisée',
        message: `L'autorisation ${auth.numero_autorisation} a atteint ${pctAcquis}% d'acquisition.`,
      });
    }
  }

  // Produit spécifique presque épuisé (≥ 90%)
  const { rows: produits } = await query(
    `SELECT product_code, designation_technique, departement, quantite_autorisee, quantite_acquise
     FROM autorisation_produits WHERE autorisation_id = $1`,
    [autorisationId]
  );
  for (const p of produits) {
    const pctProduit = p.quantite_autorisee > 0
      ? (parseFloat(p.quantite_acquise) / parseFloat(p.quantite_autorisee)) * 100
      : 0;
    if (pctProduit >= 90) {
      const responsables = await getResponsablesStock(p.departement);
      for (const r of responsables) {
        await notify({
          userId: r.id,
          autorisationId,
          type: 'PRODUIT_PRESQUE_EPUISE',
          priorite: 'HIGH',
          titre: 'Produit presque épuisé',
          message: `Le produit ${p.designation_technique} de l'autorisation ${auth.numero_autorisation} est à ${pctProduit.toFixed(0)}% d'acquisition.`,
        });
      }
    }
  }
};

/**
 * Vérifie toutes les autorisations actives (utilisé par le scheduler quotidien).
 */
const checkAllAutorisations = async () => {
  const { rows } = await query('SELECT id FROM autorisations WHERE is_archived = false');
  for (const { id } of rows) {
    await checkAutorisationAlerts(id);
  }
  return rows.length;
};

/**
 * Vérifie le stock d'un produit/département après une déclaration d'utilisation
 * et génère une alerte de rupture si le seuil minimum est atteint (spec §9.1).
 */
const checkStockAlerts = async (productCode, departement) => {
  const { rows } = await query(
    'SELECT * FROM v_stock_produits WHERE product_code = $1 AND departement = $2',
    [productCode, departement]
  );
  if (rows.length === 0) return;
  const stock = rows[0];
  if (stock.statut === 'OK') return;

  const reference = `${productCode}:${departement}`;
  const admins = await getAdmins();
  const responsables = await getResponsablesStock(departement);
  const recipients = new Map([...admins, ...responsables].map((u) => [u.id, u]));

  for (const recipient of recipients.values()) {
    await notify({
      userId: recipient.id,
      reference,
      type: stock.statut === 'CRITIQUE' ? 'STOCK_CRITIQUE' : 'STOCK_FAIBLE',
      priorite: stock.statut === 'CRITIQUE' ? 'CRITICAL' : 'HIGH',
      titre: stock.statut === 'CRITIQUE' ? 'Rupture de stock' : 'Stock faible',
      message: `Le stock de ${stock.designation_technique} (${departement}) est ${
        stock.statut === 'CRITIQUE' ? 'épuisé ou en rupture' : 'faible'
      } : ${stock.stock_disponible} ${stock.unite} disponible(s) (seuil : ${stock.stock_minimum} ${stock.unite}).`,
    });
  }
};

module.exports = { checkAutorisationAlerts, checkAllAutorisations, checkStockAlerts };
