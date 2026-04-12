const express = require('express');
const router = express.Router();
const upload = require('../middleware/upload');
const { analyzeMeal } = require('../controllers/meal.controller');

router.post('/analyze-meal', upload.single('image'), analyzeMeal);

module.exports = router;
