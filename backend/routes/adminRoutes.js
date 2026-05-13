const express = require('express');
const { protect, authorize } = require('../middleware/auth');
const router = express.Router();
const User = require('../models/User');
const Score = require('../models/Score');
const Attendance = require('../models/Attendance');
const Timetable = require('../models/Timetable');  // ← YEH LINE ADD KI

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

// ============ Admin can view and edit teacher schedule ============
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

// ============ TIMETABLE ROUTES (FIXED) ============
router.get('/timetable/:className', async (req, res) => {
    try {
        const className = decodeURIComponent(req.params.className);
        const timetableData = await Timetable.find({ className: className });
        
        if (!timetableData || timetableData.length === 0) {
            return res.json({ success: true, timetable: [] });
        }
        
        res.json({ success: true, timetable: timetableData });
    } catch (error) {
        console.error('Error loading timetable:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

router.post('/timetable', async (req, res) => {
    try {
        const { className, day, periods } = req.body;
        
        // Check if timetable for this class and day already exists
        let timetable = await Timetable.findOne({ className: className, day: day });
        
        if (timetable) {
            // Update existing
            timetable.periods = periods;
            timetable.createdAt = Date.now();
            await timetable.save();
        } else {
            // Create new
            timetable = new Timetable({
                className: className,
                day: day,
                periods: periods,
                createdBy: req.user.id
            });
            await timetable.save();
        }
        
        res.json({ success: true, message: 'Timetable saved successfully', timetable });
    } catch (error) {
        console.error('Error saving timetable:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// ============ TEACHER REPORT WITH SUBJECTS AND SCORES ============
router.get('/teacher-report/:teacherId', async (req, res) => {
    try {
        const teacher = await User.findById(req.params.teacherId).select('-password');
        if (!teacher) {
            return res.status(404).json({ success: false, message: 'Teacher not found' });
        }
        
        let students = [];
        if (teacher.assignedClass) {
            students = await User.find({ 
                role: 'student', 
                className: teacher.assignedClass,
                section: teacher.assignedSection || { $exists: true }
            }).select('name email studentId rollNumber className section');
        }
        
        for (let i = 0; i < students.length; i++) {
            const studentScores = await Score.find({ studentId: students[i]._id });
            if (studentScores && studentScores.length > 0) {
                let totalPercentage = 0;
                let scoreCount = 0;
                for (let j = 0; j < studentScores.length; j++) {
                    if (studentScores[j].obtainedMarks && studentScores[j].maxMarks) {
                        totalPercentage += (studentScores[j].obtainedMarks / studentScores[j].maxMarks) * 100;
                        scoreCount++;
                    }
                }
                students[i].averageScore = scoreCount > 0 ? (totalPercentage / scoreCount).toFixed(2) : 0;
            } else {
                students[i].averageScore = 0;
            }
        }
        
        let subjectsList = [];
        if (teacher.subjects) {
            if (Array.isArray(teacher.subjects)) {
                subjectsList = teacher.subjects;
            } else if (typeof teacher.subjects === 'string') {
                subjectsList = teacher.subjects.split(',').map(s => s.trim());
            }
        }
        
        const teacherData = {
            _id: teacher._id,
            name: teacher.name,
            email: teacher.email,
            assignedClass: teacher.assignedClass,
            assignedSection: teacher.assignedSection,
            subjects: subjectsList,
            totalStudents: students.length
        };
        
        res.json({ 
            success: true, 
            report: {
                teacher: teacherData,
                students: students
            } 
        });
    } catch (error) {
        console.error('Error generating teacher report:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// ============ STUDENT REPORT WITH CORRECT SCORES ============
router.get('/student-report/:studentId', async (req, res) => {
    try {
        const student = await User.findById(req.params.studentId).select('-password');
        if (!student) {
            return res.status(404).json({ success: false, message: 'Student not found' });
        }
        
        const scores = await Score.find({ studentId: student._id }).sort({ date: -1 });
        
        const processedScores = scores.map(score => {
            let percentage = 0;
            if (score.obtainedMarks && score.maxMarks) {
                percentage = (score.obtainedMarks / score.maxMarks) * 100;
            }
            return {
                subject: score.subject,
                obtainedMarks: score.obtainedMarks,
                maxMarks: score.maxMarks,
                percentage: percentage.toFixed(2),
                examType: score.examType,
                date: score.date,
                grade: percentage >= 90 ? 'A+' : percentage >= 80 ? 'A' : percentage >= 70 ? 'B+' : percentage >= 60 ? 'B' : percentage >= 50 ? 'C' : 'F'
            };
        });
        
        const attendance = await Attendance.find({ studentId: student._id }).sort({ date: -1 });
        
        let avgScore = 0;
        if (processedScores.length > 0) {
            let totalPercent = 0;
            for (let i = 0; i < processedScores.length; i++) {
                totalPercent += parseFloat(processedScores[i].percentage);
            }
            avgScore = (totalPercent / processedScores.length).toFixed(2);
        }
        
        const studentData = {
            _id: student._id,
            name: student.name,
            email: student.email,
            studentId: student.studentId,
            rollNumber: student.rollNumber,
            className: student.className,
            section: student.section,
            averageScore: avgScore
        };
        
        res.json({ 
            success: true, 
            report: {
                student: studentData,
                scores: processedScores,
                attendance: attendance
            } 
        });
    } catch (error) {
        console.error('Error generating student report:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

router.get('/test', (req, res) => {
    res.json({ success: true, message: 'Admin API is working' });
});

module.exports = router;