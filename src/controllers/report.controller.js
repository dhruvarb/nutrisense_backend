const Tesseract = require('tesseract.js');
const geminiService = require('../services/geminiService');
const supabase = require('../config/supabaseClient');

const analyzeReport = async (req, res, next) => {
    try {
        const { user_id } = req.body;

        if (!req.file) {
            return res.status(400).json({ success: false, message: 'No file uploaded' });
        }

        console.log("Starting OCR with Tesseract...");
        const { data: { text } } = await Tesseract.recognize(
            req.file.buffer,
            'eng',
            { logger: m => console.log(m.status + ': ' + m.progress) }
        );

        if (!text || text.trim().length < 10) {
             return res.status(400).json({ success: false, message: 'Could not extract sufficient text from document.' });
        }

        console.log("Analyzing with Gemini...");
        const parsedData = await geminiService.analyzeReportData(text);

        // Attempt to store in Supabase if user_id is provided
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
                        raw_data: parsedData // Storing the full JSON for future use
                    }]);
                
                if (error) console.warn('Supabase Insert Warning:', error.message);
            } catch (dbErr) {
                console.warn('Database connection failed, proceeding with response anyway.');
            }
        }

        res.status(200).json({
            success: true,
            data: parsedData
        });

    } catch (err) {
        console.error("Report Analysis Controller Error:", err);
        res.status(500).json({ success: false, message: err.message });
    }
};

module.exports = {
    analyzeReport
};
