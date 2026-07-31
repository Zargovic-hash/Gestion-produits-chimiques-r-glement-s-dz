const express = require('express');
const router = express.Router();
const auditController = require('../controllers/audit.controller');
const { authenticateToken } = require('../middleware/auth');
const { checkRole } = require('../middleware/roleCheck');

router.use(authenticateToken);
router.use(checkRole('admin'));

router.get('/', auditController.getAll);

module.exports = router;
