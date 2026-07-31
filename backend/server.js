require('dotenv').config();
const app = require('./src/app');
const { pool } = require('./src/config/db');

const PORT = process.env.PORT || 5000;

pool.query('SELECT 1')
  .then(() => {
    console.log('Connexion à la base de données réussie.');
    app.listen(PORT, () => {
      console.log(`Serveur démarré sur le port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Impossible de se connecter à la base de données :', err.message);
    process.exit(1);
  });
