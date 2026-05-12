// Add this at the very beginning of server.js
process.on('uncaughtException', (err) => {
    if (err.code === 'EADDRINUSE') {
        console.error(`❌ Port ${PORT} is already in use!`);
        console.log('💡 Try changing PORT in .env file or kill the existing process');
        process.exit(1);
    }
});

const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
dotenv.config();

// Import routes
const authRoutes = require('./routes/authRoutes');
const studentRoutes = require('./routes/studentRoutes');
const teacherRoutes = require('./routes/teacherRoutes');
const adminRoutes = require('./routes/adminRoutes');

// New Feature Routes
const achievementRoutes = require('./routes/achievements');
const placementRoutes = require('./routes/placements');
const noticeRoutes = require('./routes/notices');
const eventRoutes = require('./routes/events');
const aboutRoutes = require('./routes/about');

const connectDB = require('./config/database');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Database
connectDB();

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/student', studentRoutes);
app.use('/api/teacher', teacherRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/achievements', achievementRoutes);
app.use('/api/placements', placementRoutes);
app.use('/api/notices', noticeRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/about', aboutRoutes);

// Test route
app.get('/api/test', (req, res) => {
    res.json({ success: true, message: 'Server is running' });
});

// Route debugging
console.log('\n📋 ===== REGISTERED ROUTES =====');
const registeredRoutes = [];

app._router.stack.forEach((middleware) => {
    if (middleware.route) {
        const methods = Object.keys(middleware.route.methods).join(', ').toUpperCase();
        registeredRoutes.push(`${methods.padEnd(7)} ${middleware.route.path}`);
    } else if (middleware.name === 'router' && middleware.handle.stack) {
        const basePath = middleware.regexp.source
            .replace('\\/?(?=\\/|$)', '')
            .replace(/\\\//g, '/')
            .replace(/\^/g, '')
            .replace(/\?/g, '')
            .replace(/\(\?:\(\[\^\\\/\]\+\?\)\)/g, ':param');
        
        middleware.handle.stack.forEach((handler) => {
            if (handler.route) {
                const methods = Object.keys(handler.route.methods).join(', ').toUpperCase();
                const path = basePath + handler.route.path;
                registeredRoutes.push(`${methods.padEnd(7)} ${path}`);
            }
        });
    }
});

registeredRoutes.sort().forEach(route => {
    console.log(`  ${route}`);
});
console.log('================================\n');

// 404 handler
app.use((req, res) => {
    res.status(404).json({ 
        success: false, 
        message: `Route ${req.method} ${req.url} not found` 
    });
});

// Error handler
app.use((err, req, res, next) => {
    console.error('Error:', err.message);
    res.status(500).json({ 
        success: false, 
        message: 'Server error',
        error: err.message 
    });
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`\n🚀 Server running on http://localhost:${PORT}`);
    console.log(`📝 Test API: http://localhost:${PORT}/api/test\n`);
});