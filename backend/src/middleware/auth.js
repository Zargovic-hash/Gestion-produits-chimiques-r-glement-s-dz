const jwt = require('jsonwebtoken');
const { query } = require('../config/db');
const AppError = require('../utils/AppError');

const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      throw new AppError("Token d'authentification requis", 401);
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const { rows } = await query(
      'SELECT id, email, nom, prenom, role, departement, is_active FROM utilisateurs WHERE id = $1',
      [decoded.userId]
    );
    const user = rows[0];

    if (!user || !user.is_active) {
      throw new AppError('Utilisateur non trouvé ou inactif', 401);
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return next(new AppError('Token expiré', 401));
    }
    if (error.name === 'JsonWebTokenError') {
      return next(new AppError('Token invalide', 403));
    }
    next(error);
  }
};

module.exports = { authenticateToken };
