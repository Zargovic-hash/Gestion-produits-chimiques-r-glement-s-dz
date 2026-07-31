// Génération des alertes/notifications (spec §4.4 + §6.2)
const { query } = require('../config/db');

const DEDUP_WINDOW_HOURS = 24;

const alreadyNotifiedRecently = async (userId, autorisationId, type) => {
  const { rows } = await query(
    `SELECT 1 FROM notifications
     WHERE user_id = $1 AND autorisation_id = $2 AND type = $3
       AND created_at > now() - ($4 || ' hours')::interval
     LIMIT 1`,
    [userId, autorisationId, type, DEDUP_WINDOW_HOURS]
  );
  return rows.length > 0;
};

const notify = async ({ userId, autorisationId, type, priorite, titre, message }) => {
  if (await alreadyNotifiedRecently(userId, autorisationId, type)) return;
  await query(
    `INSERT INTO notifications (user_id, autorisation_id, type, priorite, titre, message)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [userId, autorisationId, type, priorite, titre, message]
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

module.exports = { checkAutorisationAlerts, checkAllAutorisations };
