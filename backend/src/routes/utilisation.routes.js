const express = require('express');
const router = express.Router();
const utilisationController = require('../controllers/utilisation.controller');
const { authenticateToken } = require('../middleware/auth');
const { checkRole } = require('../middleware/roleCheck');

router.use(authenticateToken);

router.get('/', utilisationController.getAll);
router.post('/', checkRole('admin', 'responsable_stock'), utilisationController.create);
router.delete('/:id', checkRole('admin', 'responsable_stock'), utilisationController.remove);

module.exports = router;
