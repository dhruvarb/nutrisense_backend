const express = require('express');
const router = express.Router();
const upload = require('../middleware/upload');
const { analyzeReport } = require('../controllers/report.controller');

// Quick diagnostic endpoint
router.get('/models', async (req, res) => {
    try {
        const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models?key=' + process.env.GEMINI_API_KEY);
        const data = await response.json();
        res.json(data);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

router.post('/analyze-report', upload.single('report'), analyzeReport);

module.exports = router;
