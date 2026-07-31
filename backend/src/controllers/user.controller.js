const bcrypt = require('bcrypt');
const { query } = require('../config/db');
const AppError = require('../utils/AppError');

const ROLES = ['admin', 'responsable_stock', 'visiteur'];

const getAll = async (req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT id, email, nom, prenom, role, departement, is_active, created_at
       FROM utilisateurs ORDER BY created_at DESC`
    );
    res.json({ success: true, data: rows });
  } catch (error) {
    next(error);
  }
};

const create = async (req, res, next) => {
  try {
    const { email, password, nom, prenom, role, departement } = req.body;

    if (!email || !password || !nom || !prenom || !role) {
      throw new AppError('Champs obligatoires manquants', 400);
    }
    if (!ROLES.includes(role)) {
      throw new AppError(`Rôle invalide. Doit être : ${ROLES.join(', ')}`, 400);
    }
    if (password.length < 8) {
      throw new AppError('Le mot de passe doit contenir au moins 8 caractères', 400);
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const { rows } = await query(
      `INSERT INTO utilisateurs (email, password_hash, nom, prenom, role, departement, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, email, nom, prenom, role, departement, is_active, created_at`,
      [email.toLowerCase().trim(), passwordHash, nom, prenom, role, departement || null, req.user.id]
    );

    res.status(201).json({ success: true, data: rows[0] });
  } catch (error) {
    next(error);
  }
};

const update = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { nom, prenom, role, departement, is_active, password } = req.body;

    if (role && !ROLES.includes(role)) {
      throw new AppError(`Rôle invalide. Doit être : ${ROLES.join(', ')}`, 400);
    }

    const fields = [];
    const values = [];
    let i = 1;

    const setField = (col, val) => {
      fields.push(`${col} = $${i++}`);
      values.push(val);
    };

    if (nom !== undefined) setField('nom', nom);
    if (prenom !== undefined) setField('prenom', prenom);
    if (role !== undefined) setField('role', role);
    if (departement !== undefined) setField('departement', departement);
    if (is_active !== undefined) setField('is_active', is_active);
    if (password) {
      if (password.length < 8) {
        throw new AppError('Le mot de passe doit contenir au moins 8 caractères', 400);
      }
      setField('password_hash', await bcrypt.hash(password, 12));
    }

    if (fields.length === 0) {
      throw new AppError('Aucune modification fournie', 400);
    }

    fields.push('updated_at = now()');
    values.push(id);

    const { rows } = await query(
      `UPDATE utilisateurs SET ${fields.join(', ')} WHERE id = $${i}
       RETURNING id, email, nom, prenom, role, departement, is_active, created_at`,
      values
    );

    if (rows.length === 0) {
      throw new AppError('Utilisateur non trouvé', 404);
    }

    res.json({ success: true, data: rows[0] });
  } catch (error) {
    next(error);
  }
};

module.exports = { getAll, create, update };
