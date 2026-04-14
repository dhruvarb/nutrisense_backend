const express = require('express');
const router = express.Router();
const userController = require('../controllers/user.controller');

router.post('/sync', userController.upsertUserProfile);
router.get('/:id', userController.getUserProfile);

module.exports = router;
