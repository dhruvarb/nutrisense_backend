const express = require('express');
const router = express.Router();
const upload = require('../middleware/upload');
const { analyzeReport } = require('../controllers/report.controller');

router.post('/analyze-report', upload.single('report'), analyzeReport);

module.exports = router;
