const express = require('express');
const router = express.Router();
const reportController = require('../controllers/report.controller');
const { authenticateToken } = require('../middleware/auth');

router.use(authenticateToken);

router.get('/autorisations', reportController.autorisationsReport);
router.get('/autorisations/:id', reportController.autorisationDetailReport);
router.get('/achats', reportController.achatsReport);
router.get('/produits', reportController.produitsReport);
router.get('/departements', reportController.departementsReport);
router.get('/declaration-mensuelle', reportController.declarationMensuelleReport);

module.exports = router;
