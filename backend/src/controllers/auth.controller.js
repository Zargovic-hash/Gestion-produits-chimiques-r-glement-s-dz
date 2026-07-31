const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { query } = require('../config/db');
const AppError = require('../utils/AppError');

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      throw new AppError('Email et mot de passe requis', 400);
    }

    const { rows } = await query(
      'SELECT * FROM utilisateurs WHERE email = $1',
      [email.toLowerCase().trim()]
    );
    const user = rows[0];

    if (!user || !user.is_active) {
      throw new AppError('Identifiants invalides', 401);
    }

    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      throw new AppError('Identifiants invalides', 401);
    }

    const token = jwt.sign(
      { userId: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );

    delete user.password_hash;

    res.json({ success: true, data: { token, user } });
  } catch (error) {
    next(error);
  }
};

const me = async (req, res) => {
  res.json({ success: true, data: req.user });
};

module.exports = { login, me };
