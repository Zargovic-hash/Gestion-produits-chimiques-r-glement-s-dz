const cron = require('node-cron');
const { checkAllAutorisations } = require('./alert.service');

// Vérifie toutes les autorisations chaque jour à 6h (spec §6.2 : fréquence quotidienne)
const init = () => {
  cron.schedule('0 6 * * *', async () => {
    try {
      const count = await checkAllAutorisations();
      console.log(`[scheduler] Vérification des alertes effectuée sur ${count} autorisation(s).`);
    } catch (error) {
      console.error('[scheduler] Erreur lors de la vérification des alertes :', error);
    }
  });
  console.log('[scheduler] Vérification quotidienne des alertes programmée (06:00).');
};

module.exports = { init };
