const express = require('express');
const router = express.Router();
const canevasController = require('../controllers/canevas.controller');
const { authenticateToken } = require('../middleware/auth');
const { checkRole } = require('../middleware/roleCheck');

router.use(authenticateToken);

router.get('/', canevasController.getAll);
router.get('/:id', canevasController.getById);
router.post('/', checkRole('admin'), canevasController.create);
router.post('/:id/duplicate', checkRole('admin'), canevasController.duplicate);
router.delete('/:id', checkRole('admin'), canevasController.remove);

module.exports = router;
