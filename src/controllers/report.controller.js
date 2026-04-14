const geminiService = require('../services/geminiService');
const supabase = require('../config/supabaseClient');

const analyzeReport = async (req, res, next) => {
    try {
        const body = req.body || {};
        const user_id = body.user_id;
        const diet_type = body.diet_type || 'not set';

        if (!req.file) {
            console.error("No file found in request.");
            return res.status(400).json({ success: false, message: 'No file uploaded' });
        }

        console.log(`Analyzing report for UserID: ${user_id || 'Guest'}, Diet: ${diet_type}`);
        
        // Convert buffer to base64 for Gemini
        const base64Image = req.file.buffer.toString('base64');
        const mimeType = req.file.mimetype;

        // Direct Multimodal analysis with diet context
        const parsedData = await geminiService.analyzeReportImage(mimeType, base64Image, diet_type);

        // Store result in Supabase if user_id is provided
        if (user_id) {
            try {
                const { error } = await supabase
                    .from('reports')
                    .insert([{
                        user_id: user_id,
                        hb: parsedData.markers.find(m => m.key === 'hb')?.value?.toString(),
                        vitamin_d: parsedData.markers.find(m => m.key === 'vitamin_d')?.value?.toString(),
                        iron: parsedData.markers.find(m => m.key === 'iron')?.value?.toString(),
                        ai_analysis: parsedData.ai_analysis,
                        raw_data: parsedData 
                    }]);
                
                if (error) console.warn('Supabase Insert Warning:', error.message);
            } catch (dbErr) {
                console.warn('Database save failed, proceeding with response.');
            }
        }

        res.status(200).json({
            success: true,
            data: parsedData
        });

    } catch (err) {
        console.error("ANALYSIS ERROR:", err);
        // Specifically return the AI error or underlying crash message for remote debugging
        res.status(400).json({ 
            success: false, 
            message: err.message || "Unknown analysis error occurred." ,
            debug: process.env.NODE_ENV === 'production' ? null : err.stack
        });
    }
};

module.exports = {
    analyzeReport
};
