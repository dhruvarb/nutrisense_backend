const supabase = require('../config/supabaseClient');

const upsertUserProfile = async (req, res, next) => {
    try {
        const { id, name, age, height, weight, diet_type, lifestyle, allergies, goals, activity_level, sleep_quality, water_intake, medical_conditions } = req.body;

        if (!id) {
            return res.status(400).json({ success: false, message: 'User ID is required' });
        }

        console.log('Syncing profile for user:', id);

        const { data, error } = await supabase
            .from('users')
            .upsert({
                id,
                name,
                age: age ? parseInt(age) : null,
                height: height ? parseFloat(height) : null,
                weight: weight ? parseFloat(weight) : null,
                diet_type,
                lifestyle,
                allergies,
                goals,
                activity_level,
                sleep_quality,
                water_intake: water_intake ? parseFloat(water_intake) : null,
                medical_conditions
            }, { onConflict: 'id' })
            .select();

        if (error) {
            console.error('Supabase Sync Error:', error);
            return res.status(500).json({
                success: false,
                message: `Supabase Error: ${error.message}`,
                hint: error.hint,
                details: error.details
            });
        }

        res.status(200).json({
            success: true,
            message: 'User profile synced successfully',
            data: data && data.length > 0 ? data[0] : null
        });

    } catch (err) {
        console.error('Controller Catch Error:', err);
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

        if (error) {
            console.error('Fetch Profile Error:', error);
            return res.status(404).json({ success: false, message: 'Profile not found' });
        }

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
