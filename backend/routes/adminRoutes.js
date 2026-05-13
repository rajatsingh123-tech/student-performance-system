const express = require('express');
const { protect, authorize } = require('../middleware/auth');
const router = express.Router();
const User = require('../models/User');
const Score = require('../models/Score');
const Attendance = require('../models/Attendance');
const Timetable = require('../models/Timetable');

const adminController = require('../controllers/adminController');

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

// Teacher Schedule
router.get('/teacher-schedule/:teacherId', async (req, res) => {
    try {
        const teacher = await User.findById(req.params.teacherId);
        if (!teacher) return res.status(404).json({ success: false, message: 'Teacher not found' });
        res.json({ success: true, schedule: teacher.teacherSchedule || [], subjects: teacher.subjects || [] });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

router.put('/teacher-schedule/:teacherId', async (req, res) => {
    try {
        const { schedule } = req.body;
        const teacher = await User.findByIdAndUpdate(req.params.teacherId, { teacherSchedule: schedule }, { new: true });
        if (!teacher) return res.status(404).json({ success: false, message: 'Teacher not found' });
        res.json({ success: true, message: 'Schedule updated', schedule: teacher.teacherSchedule });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Timetable Routes
router.get('/timetable/:className', async (req, res) => {
    try {
        const className = decodeURIComponent(req.params.className);
        const timetableData = await Timetable.find({ className: className });
        res.json({ success: true, timetable: timetableData || [] });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

router.post('/timetable', async (req, res) => {
    try {
        const { className, day, periods } = req.body;
        let timetable = await Timetable.findOne({ className: className, day: day });
        if (timetable) {
            timetable.periods = periods;
            await timetable.save();
        } else {
            timetable = new Timetable({ className, day, periods, createdBy: req.user.id });
            await timetable.save();
        }
        res.json({ success: true, message: 'Timetable saved', timetable });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// ============ TEACHER REPORT - FIXED WITH overallAverageScore ============
router.get('/teacher-report/:teacherId', async (req, res) => {
    try {
        const teacherId = req.params.teacherId;
        const teacher = await User.findById(teacherId).select('-password');
        
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
        
        let totalAverageSum = 0;
        
        for (let i = 0; i < students.length; i++) {
            const studentScores = await Score.find({ studentId: students[i]._id });
            let totalScore = 0;
            if (studentScores.length > 0) {
                for (let j = 0; j < studentScores.length; j++) {
                    if (studentScores[j].obtainedMarks && studentScores[j].maxMarks && studentScores[j].maxMarks > 0) {
                        totalScore += (studentScores[j].obtainedMarks / studentScores[j].maxMarks) * 100;
                    }
                }
                students[i].averageScore = (totalScore / studentScores.length).toFixed(2);
            } else {
                students[i].averageScore = '0';
            }
            totalAverageSum += parseFloat(students[i].averageScore);
        }
        
        // Calculate overall average score
        const overallAverageScore = students.length > 0 ? (totalAverageSum / students.length).toFixed(2) : '0';
        
        let teacherSubjects = [];
        if (teacher.subjects) {
            if (Array.isArray(teacher.subjects)) {
                teacherSubjects = teacher.subjects;
            } else if (typeof teacher.subjects === 'string') {
                teacherSubjects = teacher.subjects.split(',').map(s => s.trim());
            } else {
                teacherSubjects = [String(teacher.subjects)];
            }
        }
        
        res.json({ 
            success: true, 
            report: {
                teacher: {
                    name: teacher.name,
                    email: teacher.email,
                    assignedClass: teacher.assignedClass || 'Not Assigned',
                    assignedSection: teacher.assignedSection || 'Not Assigned',
                    subjects: teacherSubjects,
                    totalStudents: students.length,
                    overallAverageScore: overallAverageScore
                },
                students: students
            }
        });
    } catch (error) {
        console.error('Teacher report error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// ============ DEBUG TEACHER REPORT ROUTE ============
router.get('/debug-teacher-report/:teacherId', async (req, res) => {
    try {
        const teacherId = req.params.teacherId;
        const teacher = await User.findById(teacherId).select('-password');
        if (!teacher) {
            return res.status(404).json({ success: false, message: 'Teacher not found' });
        }
        
        let students = [];
        if (teacher.assignedClass) {
            const query = { role: 'student', className: teacher.assignedClass };
            if (teacher.assignedSection && teacher.assignedSection !== '') {
                query.section = teacher.assignedSection;
            }
            students = await User.find(query).select('name email studentId rollNumber className section');
        }
        
        const studentsWithScores = [];
        for (let i = 0; i < students.length; i++) {
            const studentScores = await Score.find({ studentId: students[i]._id });
            let avgScore = 0;
            if (studentScores.length > 0) {
                let total = 0;
                for (let j = 0; j < studentScores.length; j++) {
                    if (studentScores[j].obtainedMarks && studentScores[j].maxMarks && studentScores[j].maxMarks > 0) {
                        total += (studentScores[j].obtainedMarks / studentScores[j].maxMarks) * 100;
                    }
                }
                avgScore = (total / studentScores.length).toFixed(2);
            }
            studentsWithScores.push({
                name: students[i].name,
                email: students[i].email,
                studentId: students[i].studentId,
                rollNumber: students[i].rollNumber,
                className: students[i].className,
                section: students[i].section,
                averageScore: avgScore
            });
        }
        
        // Calculate overall average
        let totalAvg = 0;
        for (let i = 0; i < studentsWithScores.length; i++) {
            totalAvg += parseFloat(studentsWithScores[i].averageScore);
        }
        const overallAvg = studentsWithScores.length > 0 ? (totalAvg / studentsWithScores.length).toFixed(2) : '0';
        
        res.json({
            success: true,
            teacher: {
                id: teacher._id,
                name: teacher.name,
                email: teacher.email,
                assignedClass: teacher.assignedClass,
                assignedSection: teacher.assignedSection,
                overallAverageScore: overallAvg
            },
            students: studentsWithScores
        });
    } catch (error) {
        console.error('Debug error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// ============ STUDENT REPORT ============
router.get('/student-report/:studentId', async (req, res) => {
    try {
        const student = await User.findById(req.params.studentId).select('-password');
        if (!student) return res.status(404).json({ success: false, message: 'Student not found' });
        
        const scores = await Score.find({ studentId: student._id }).sort({ date: -1 });
        const attendance = await Attendance.find({ studentId: student._id }).sort({ date: -1 });
        
        const processedScores = scores.map(score => {
            let percentage = 0;
            if (score.obtainedMarks && score.maxMarks && score.maxMarks > 0) {
                percentage = (score.obtainedMarks / score.maxMarks) * 100;
            }
            return {
                subject: score.subject,
                obtainedMarks: score.obtainedMarks,
                maxMarks: score.maxMarks,
                percentage: percentage.toFixed(2),
                examType: score.examType,
                date: score.date
            };
        });
        
        res.json({ 
            success: true, 
            report: {
                student: {
                    name: student.name,
                    email: student.email,
                    studentId: student.studentId,
                    rollNumber: student.rollNumber,
                    className: student.className,
                    section: student.section
                },
                scores: processedScores,
                attendance: attendance
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

router.get('/test', (req, res) => {
    res.json({ success: true, message: 'Admin API is working' });
});

module.exports = router;