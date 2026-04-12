const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

// Use the service role key if needed for backend tasks like bypassing RLS, but standard key is often fine for basic API cache.
// For now, we stick to the anon key as default setup or service role if you want to bypass completely.
const supabase = createClient(supabaseUrl, supabaseKey);

module.exports = supabase;
