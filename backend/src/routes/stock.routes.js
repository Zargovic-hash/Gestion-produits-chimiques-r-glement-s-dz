const express = require('express');
const router = express.Router();
const stockController = require('../controllers/stock.controller');
const { authenticateToken } = require('../middleware/auth');
const { checkRole } = require('../middleware/roleCheck');

router.use(authenticateToken);

router.get('/', stockController.getStock);
router.get('/seuils', checkRole('admin'), stockController.getSeuils);
router.post('/seuils', checkRole('admin'), stockController.upsertSeuil);

module.exports = router;
