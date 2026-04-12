const express = require('express');
const router = express.Router();

// Placeholder for auth routes like signup/login if not handled directly by frontend using Supabase
router.post('/signup', (req, res) => {
    res.status(200).json({ message: "Auth handled directly by frontend via Supabase preferably." });
});

module.exports = router;
