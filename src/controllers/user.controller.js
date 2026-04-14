const supabase = require('../config/supabaseClient');

const upsertUserProfile = async (req, res, next) => {
    try {
        const { id, name, age, height, weight, diet_type, lifestyle, allergies, goals, activity_level, sleep_quality, water_intake, medical_conditions } = req.body;

        if (!id) {
            return res.status(400).json({ success: false, message: 'User ID is required' });
        }

        const { data, error } = await supabase
            .from('users')
            .upsert({
                id,
                name,
                age,
                height,
                weight,
                diet_type,
                lifestyle,
                allergies,
                goals,
                activity_level,
                sleep_quality,
                water_intake,
                medical_conditions
            }, { onConflict: 'id' })
            .select();

        if (error) throw error;

        res.status(200).json({
            success: true,
            message: 'User profile synced successfully',
            data: data[0]
        });

    } catch (err) {
        next(err);
    }
};

const getUserProfile = async (req, res, next) => {
    try {
        const { id } = req.params;

        const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('id', id)
            .single();

        if (error) throw error;

        res.status(200).json({
            success: true,
            data
        });
    } catch (err) {
        next(err);
    }
};

module.exports = {
    upsertUserProfile,
    getUserProfile
};
