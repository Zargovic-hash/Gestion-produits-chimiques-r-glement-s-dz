const AppError = require('../utils/AppError');

const checkRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !req.user.role) {
      return next(new AppError('Non authentifié', 401));
    }
    if (!allowedRoles.includes(req.user.role)) {
      return next(
        new AppError(
          `Accès refusé. Cette action nécessite le rôle : ${allowedRoles.join(' ou ')}`,
          403
        )
      );
    }
    next();
  };
};

module.exports = { checkRole };
