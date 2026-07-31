const express = require('express');
const router = express.Router();
const achatController = require('../controllers/achat.controller');
const { authenticateToken } = require('../middleware/auth');
const { checkRole } = require('../middleware/roleCheck');

router.use(authenticateToken);

router.get('/', achatController.getAll);
router.post('/', checkRole('admin', 'responsable_stock'), achatController.create);
router.put('/:id', checkRole('admin', 'responsable_stock'), achatController.update);
router.delete('/:id', checkRole('admin', 'responsable_stock'), achatController.remove);

module.exports = router;
