const express = require('express');
const { protect, authorize } = require('../middleware/auth');
const router = express.Router();
const User = require('../models/User');

const adminController = require('../controllers/adminController');

console.log('Admin Controller Functions:', Object.keys(adminController));

router.use(protect);
router.use(authorize('admin'));

// User management
router.get('/users', adminController.getAllUsers);
router.post('/users', adminController.createUser);
router.put('/users/:id', adminController.updateUser);
router.delete('/users/:id', adminController.deleteUser);
router.get('/stats', adminController.getStats);
router.get('/teacher-details', adminController.getTeacherDetails);
router.get('/student-details', adminController.getStudentDetails);
router.post('/generate-report', adminController.generateSystemReport);

// ============ NEW: Admin can view and edit teacher schedule ============
// Get teacher schedule by teacher ID
router.get('/teacher-schedule/:teacherId', async (req, res) => {
    try {
        const teacher = await User.findById(req.params.teacherId);
        if (!teacher) {
            return res.status(404).json({ success: false, message: 'Teacher not found' });
        }
        res.json({ 
            success: true, 
            schedule: teacher.teacherSchedule || [],
            subjects: teacher.subjects || []
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Update teacher schedule by admin
router.put('/teacher-schedule/:teacherId', async (req, res) => {
    try {
        const { schedule } = req.body;
        const teacher = await User.findByIdAndUpdate(
            req.params.teacherId,
            { teacherSchedule: schedule },
            { new: true }
        );
        if (!teacher) {
            return res.status(404).json({ success: false, message: 'Teacher not found' });
        }
        res.json({ 
            success: true, 
            message: 'Schedule updated successfully', 
            schedule: teacher.teacherSchedule 
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

router.get('/test', (req, res) => {
    res.json({ success: true, message: 'Admin API is working' });
});

module.exports = router;