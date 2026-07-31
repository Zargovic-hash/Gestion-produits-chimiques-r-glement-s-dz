const { query, withTransaction } = require('../config/db');
const AppError = require('../utils/AppError');
const { logAction } = require('../services/audit.service');

const UNITES = ['L', 'mL', 'kg', 'g', 't', 'unite'];

const validateProduits = (produits) => {
  if (!Array.isArray(produits) || produits.length === 0) {
    throw new AppError('Au moins un produit est requis', 400);
  }
  for (const p of produits) {
    if (!p.product_code || !p.designation_technique || !p.unite || !p.departement) {
      throw new AppError(
        'Chaque produit requiert : product_code, designation_technique, unite, departement',
        400
      );
    }
    if (!UNITES.includes(p.unite)) {
      throw new AppError(`Unité invalide : ${p.unite}. Doit être : ${UNITES.join(', ')}`, 400);
    }
  }
};

const getAll = async (req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT c.*, COUNT(cp.id) AS nombre_produits
       FROM canevas c
       LEFT JOIN canevas_produits cp ON cp.canevas_id = c.id
       GROUP BY c.id
       ORDER BY c.created_at DESC`
    );
    res.json({ success: true, data: rows });
  } catch (error) {
    next(error);
  }
};

const getById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { rows } = await query('SELECT * FROM canevas WHERE id = $1', [id]);
    if (rows.length === 0) throw new AppError('Canevas non trouvé', 404);

    const { rows: produits } = await query(
      'SELECT * FROM canevas_produits WHERE canevas_id = $1 ORDER BY product_code',
      [id]
    );

    res.json({ success: true, data: { ...rows[0], produits } });
  } catch (error) {
    next(error);
  }
};

const create = async (req, res, next) => {
  try {
    const { nom, description, produits } = req.body;
    if (!nom) throw new AppError('Le nom du canevas est requis', 400);
    validateProduits(produits);

    const canevas = await withTransaction(async (client) => {
      const { rows } = await client.query(
        `INSERT INTO canevas (nom, description, created_by) VALUES ($1, $2, $3) RETURNING *`,
        [nom, description || null, req.user.id]
      );
      const c = rows[0];

      for (const p of produits) {
        await client.query(
          `INSERT INTO canevas_produits (
            canevas_id, product_code, designation_technique, numero_onu, numero_cas,
            numero_cee, designation_chimique, autre_designation, unite, departement
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
          [
            c.id,
            p.product_code,
            p.designation_technique,
            p.numero_onu || null,
            p.numero_cas || null,
            p.numero_cee || null,
            p.designation_chimique || null,
            p.autre_designation || null,
            p.unite,
            p.departement,
          ]
        );
      }
      return c;
    });

    await logAction(req.user.id, 'CREATE', 'canevas', canevas.id, { nom: canevas.nom });

    res.status(201).json({ success: true, data: canevas, message: 'Canevas créé avec succès' });
  } catch (error) {
    next(error);
  }
};

const duplicate = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { nom } = req.body;

    const { rows: sourceRows } = await query('SELECT * FROM canevas WHERE id = $1', [id]);
    if (sourceRows.length === 0) throw new AppError('Canevas source non trouvé', 404);

    const { rows: produits } = await query(
      'SELECT * FROM canevas_produits WHERE canevas_id = $1',
      [id]
    );

    const newCanevas = await withTransaction(async (client) => {
      const { rows } = await client.query(
        `INSERT INTO canevas (nom, description, created_by) VALUES ($1, $2, $3) RETURNING *`,
        [nom || `${sourceRows[0].nom} (copie)`, sourceRows[0].description, req.user.id]
      );
      const c = rows[0];

      for (const p of produits) {
        await client.query(
          `INSERT INTO canevas_produits (
            canevas_id, product_code, designation_technique, numero_onu, numero_cas,
            numero_cee, designation_chimique, autre_designation, unite, departement
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
          [
            c.id,
            p.product_code,
            p.designation_technique,
            p.numero_onu,
            p.numero_cas,
            p.numero_cee,
            p.designation_chimique,
            p.autre_designation,
            p.unite,
            p.departement,
          ]
        );
      }
      return c;
    });

    res.status(201).json({ success: true, data: newCanevas, message: 'Canevas dupliqué avec succès' });
  } catch (error) {
    next(error);
  }
};

const remove = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { rows } = await query('SELECT is_default FROM canevas WHERE id = $1', [id]);
    if (rows.length === 0) throw new AppError('Canevas non trouvé', 404);
    if (rows[0].is_default) {
      throw new AppError('Le canevas par défaut ne peut pas être supprimé', 400);
    }

    await query('DELETE FROM canevas WHERE id = $1', [id]);
    await logAction(req.user.id, 'DELETE', 'canevas', id);
    res.json({ success: true, message: 'Canevas supprimé' });
  } catch (error) {
    next(error);
  }
};

module.exports = { getAll, getById, create, duplicate, remove };
