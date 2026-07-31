const express = require('express');
const router = express.Router();
const autorisationController = require('../controllers/autorisation.controller');
const { authenticateToken } = require('../middleware/auth');
const { checkRole } = require('../middleware/roleCheck');

router.use(authenticateToken);

router.get('/', autorisationController.getAll);
router.get('/:id', autorisationController.getById);
router.post('/', checkRole('admin'), autorisationController.create);
router.put('/:id', checkRole('admin'), autorisationController.update);
router.delete('/:id', checkRole('admin'), autorisationController.remove);

module.exports = router;
