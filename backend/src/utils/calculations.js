// Calculs métier partagés (dates, échéances) — cf. non-technical spec §6.3

const ETAT_LABELS = {
  ACTIVE: 'Active',
  PRESQUE_EPUISEE: 'Presque Épuisée',
  EPUISEE: 'Épuisée',
  PRESQUE_EXPIREE: 'Presque Expirée',
  EXPIREE: 'Expirée',
};

// Ajoute un nombre de jours à une date (gère les années bissextiles via setDate)
function calculerDateEcheance(dateDelivrance, dureeJours) {
  const date = new Date(dateDelivrance);
  date.setDate(date.getDate() + parseInt(dureeJours, 10));
  return date.toISOString().split('T')[0];
}

module.exports = { ETAT_LABELS, calculerDateEcheance };
