const Tesseract = require('tesseract.js');
const geminiService = require('../services/geminiService');
const supabase = require('../config/supabaseClient');

const analyzeReport = async (req, res, next) => {
    try {
        const { user_id } = req.body; // Assume user_id is passed

        // 1. Upload logic (already handled by multer in memory)
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'No file uploaded' });
        }

        // Ideally, check cache here if we had a report_id or calculated a hash
        // For simplicity, we proceed to OCR
        
        // 2. OCR Extraction
        const { data: { text } } = await Tesseract.recognize(
            req.file.buffer,
            'eng',
            { logger: m => console.log(m) } // Optional: log progress
        );

        if (!text) {
             return res.status(400).json({ success: false, message: 'Could not extract text from document.' });
        }

        console.log("OCR Extracted Text Preview:", text.substring(0, 100));

        // 3. Extract key values via Gemini
        const parsedData = await geminiService.analyzeReportData(text);

        // 4. Store cleaned data in DB
        const insertPayload = {
            hb: parsedData.hb,
            vitamin_d: parsedData.vitamin_d,
            iron: parsedData.iron,
            deficiencies: parsedData.deficiencies,
            ai_analysis: parsedData.ai_analysis
        };

        if (user_id) {
             insertPayload.user_id = user_id;
        }

        const { data, error } = await supabase
            .from('reports')
            .insert([insertPayload])
            .select();

        if (error) {
            console.error('Supabase Error:', error);
            // Since User hasn't set up the DB yet potentially (RLS or tables might not exist), 
            // We just warn and return the analysis anyway so the frontend can work immediately 
        }

        res.status(200).json({
            success: true,
            data: parsedData,
            db_record: data ? data[0] : null
        });

    } catch (err) {
        next(err);
    }
};

module.exports = {
    analyzeReport
};
