const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const errorHandler = require('./middleware/errorHandler');

// Import routes
const reportRoutes = require('./routes/report.routes');
const mealRoutes = require('./routes/meal.routes');
const chatRoutes = require('./routes/chat.routes');
const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/user.routes');
const planRoutes = require('./routes/plan.routes');
const supabase = require('./config/supabaseClient');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api', reportRoutes); // using /api/analyze-report
app.use('/api', mealRoutes);   // using /api/analyze-meal
app.use('/api/chat', chatRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/plan', planRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'OK', message: 'NutriSense API is running' });
});

app.get('/health/supabase', async (req, res) => {
    try {
        const { error } = await supabase.from('users').select('id').limit(1);

        if (error) {
            return res.status(500).json({
                status: 'ERROR',
                message: error.message,
                details: error.details,
                hint: error.hint
            });
        }

        res.status(200).json({ status: 'OK', message: 'Supabase connection is working' });
    } catch (err) {
        res.status(500).json({
            status: 'ERROR',
            message: err.message
        });
    }
});

// Global Error Handler
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

module.exports = app;
