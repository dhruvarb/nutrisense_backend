const geminiService = require('../services/geminiService');
const supabase = require('../config/supabaseClient');

const analyzeMeal = async (req, res, next) => {
    try {
        const { user_id, diet_type } = req.body;

        if (!req.file) {
            return res.status(400).json({ success: false, message: 'No meal image uploaded' });
        }

        // Convert buffer to base64 for Gemini vision
        const base64Image = req.file.buffer.toString('base64');
        const mimeType = req.file.mimetype;

        // Call Gemini with diet context
        const mealAnalysis = await geminiService.analyzeMealImage(mimeType, base64Image, diet_type || 'not set');

        // Store result
        const insertPayload = {
            food_name: mealAnalysis.food_name,
            calories: mealAnalysis.calories,
            protein: mealAnalysis.protein
        };

        if (user_id) {
            insertPayload.user_id = user_id;
        }

        const { data, error } = await supabase
            .from('meals')
            .insert([insertPayload])
            .select();

         if (error) {
            console.error('Supabase Meal Insert Error:', error);
        }

        res.status(200).json({
            success: true,
            data: mealAnalysis,
            db_record: data ? data[0] : null
        });

    } catch (err) {
        next(err);
    }
};

module.exports = {
    analyzeMeal
};
