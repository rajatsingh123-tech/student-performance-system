const express = require('express');
const { protect, authorize } = require('../middleware/auth');
const router = express.Router();

const { 
    getScores, 
    getAttendance, 
    getWeeklyReports, 
    getPerformanceChart,
    getDashboardData,
    deleteAttendance,
    updateAttendance
} = require('../controllers/studentController');

// All routes require authentication and student role
router.use(protect);
router.use(authorize('student'));

router.get('/dashboard', getDashboardData);
router.get('/scores', getScores);
router.get('/attendance', getAttendance);
router.get('/weekly-reports', getWeeklyReports);
router.get('/performance-chart', getPerformanceChart);

// DELETE and EDIT routes
router.delete('/attendance/:id', deleteAttendance);
router.put('/attendance/:id', updateAttendance);

module.exports = router;