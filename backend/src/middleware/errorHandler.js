const errorHandler = (err, req, res, next) => {
  let { statusCode = 500, message } = err;

  // Erreurs de clé étrangère PostgreSQL
  if (err.code === '23503') {
    statusCode = 400;
    message = 'Référence invalide à un objet inexistant';
  }

  // Erreurs de duplication (contrainte UNIQUE)
  if (err.code === '23505') {
    statusCode = 409;
    message = 'Cette ressource existe déjà';
  }

  // Erreurs de contrainte CHECK
  if (err.code === '23514') {
    statusCode = 400;
    message = 'Violation de contrainte de validation (quantité ou valeur invalide)';
  }

  if (statusCode === 500) {
    console.error('ERREUR SERVEUR:', err);
  }

  res.status(statusCode).json({
    success: false,
    message: message || 'Erreur serveur',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};

module.exports = { errorHandler };
