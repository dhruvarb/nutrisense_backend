const geminiService = require('../services/geminiService');
const supabase = require('../config/supabaseClient');

const chatWithAI = async (req, res, next) => {
    try {
        const { userMessage, user_id } = req.body;

        if (!userMessage) {
            return res.status(400).json({ success: false, message: 'Message is required' });
        }

        // Fetch user health data for context (if any)
        let healthContext = {};
        if (user_id) {
            const { data: userData } = await supabase
                .from('users')
                .select('*')
                .eq('id', user_id)
                .single();
                
            const { data: reportData } = await supabase
                .from('reports')
                .select('hb, vitamin_d, iron, deficiencies')
                .eq('user_id', user_id)
                .order('created_at', { ascending: false })
                .limit(1);

            if (userData) healthContext.userDetails = userData;
            if (reportData && reportData.length > 0) healthContext.latestReport = reportData[0];
        }

        const answer = await geminiService.chatWithAssistant(userMessage, healthContext);

        res.status(200).json({
            success: true,
            response: answer
        });

    } catch (err) {
        next(err);
    }
};

module.exports = {
    chatWithAI
};
