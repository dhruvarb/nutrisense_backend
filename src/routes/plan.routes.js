const express = require('express');
const router = express.Router();
const geminiService = require('../services/geminiService');
const supabase = require('../config/supabaseClient');

router.get('/generate-plan', async (req, res, next) => {
    try {
        const { user_id } = req.query;

        if (!user_id) {
            return res.status(400).json({ success: false, message: 'User ID is required' });
        }

        // Fetch user profile and latest report for context
        const { data: userData, error: userError } = await supabase
            .from('users')
            .select('*')
            .eq('id', user_id)
            .single();

        if (userError || !userData) {
            return res.status(404).json({ success: false, message: 'User profile not found' });
        }

        const { data: reportData } = await supabase
            .from('reports')
            .select('hb, vitamin_d, iron, deficiencies, ai_analysis')
            .eq('user_id', user_id)
            .order('created_at', { ascending: false })
            .limit(1);

        const healthContext = {
            ...userData,
            latest_report: reportData && reportData.length > 0 ? reportData[0] : null
        };

        const plan = await geminiService.generateWeeklyPlan(healthContext);

        res.status(200).json({
            success: true,
            data: plan
        });

    } catch (err) {
        next(err);
    }
});

module.exports = router;
