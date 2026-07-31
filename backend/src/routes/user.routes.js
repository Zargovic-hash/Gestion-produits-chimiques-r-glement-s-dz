const express = require('express');
const router = express.Router();
const userController = require('../controllers/user.controller');
const { authenticateToken } = require('../middleware/auth');
const { checkRole } = require('../middleware/roleCheck');

router.use(authenticateToken);
router.use(checkRole('admin'));

router.get('/', userController.getAll);
router.post('/', userController.create);
router.put('/:id', userController.update);

module.exports = router;
