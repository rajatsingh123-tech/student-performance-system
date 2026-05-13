const express = require('express');
const { protect, authorize } = require('../middleware/auth');
const router = express.Router();
const User = require('../models/User');
const Score = require('../models/Score');
const Attendance = require('../models/Attendance');
const Timetable = require('../models/Timetable');

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

// ============ TIMETABLE ROUTES ============
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
        
        let timetable = await Timetable.findOne({ className: className, day: day });
        
        if (timetable) {
            timetable.periods = periods;
            timetable.createdAt = Date.now();
            await timetable.save();
        } else {
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

// ============ TEACHER REPORT - COMPLETELY REWRITTEN ============
router.get('/teacher-report/:teacherId', async (req, res) => {
    try {
        const teacherId = req.params.teacherId;
        
        // Get teacher details
        const teacher = await User.findById(teacherId).select('-password');
        if (!teacher) {
            return res.status(404).json({ success: false, message: 'Teacher not found' });
        }
        
        // Get students assigned to this teacher's class and section
        let students = [];
        if (teacher.assignedClass) {
            const query = { 
                role: 'student', 
                className: teacher.assignedClass
            };
            if (teacher.assignedSection && teacher.assignedSection !== '') {
                query.section = teacher.assignedSection;
            }
            students = await User.find(query).select('name email studentId rollNumber className section');
        }
        
        // Calculate average score for each student from scores
        for (let i = 0; i < students.length; i++) {
            const studentScores = await Score.find({ studentId: students[i]._id });
            let totalScore = 0;
            if (studentScores.length > 0) {
                for (let j = 0; j < studentScores.length; j++) {
                    if (studentScores[j].obtainedMarks && studentScores[j].maxMarks) {
                        const percentage = (studentScores[j].obtainedMarks / studentScores[j].maxMarks) * 100;
                        totalScore += percentage;
                    }
                }
                students[i].averageScore = (totalScore / studentScores.length).toFixed(2);
                students[i].totalExams = studentScores.length;
            } else {
                students[i].averageScore = '0';
                students[i].totalExams = 0;
            }
        }
        
        // Get teacher's subjects
        let teacherSubjects = [];
        if (teacher.subjects) {
            if (Array.isArray(teacher.subjects)) {
                teacherSubjects = teacher.subjects;
            } else if (typeof teacher.subjects === 'string') {
                teacherSubjects = teacher.subjects.split(',').map(s => s.trim());
            }
        }
        
        // Calculate overall average score of all students
        let overallAvg = 0;
        if (students.length > 0) {
            let totalAvg = 0;
            for (let i = 0; i < students.length; i++) {
                totalAvg += parseFloat(students[i].averageScore);
            }
            overallAvg = (totalAvg / students.length).toFixed(2);
        }
        
        const reportData = {
            teacher: {
                id: teacher._id,
                name: teacher.name,
                email: teacher.email,
                assignedClass: teacher.assignedClass || 'Not Assigned',
                assignedSection: teacher.assignedSection || 'Not Assigned',
                subjects: teacherSubjects,
                totalStudents: students.length,
                overallAverageScore: overallAvg
            },
            students: students.map(s => ({
                name: s.name || 'N/A',
                email: s.email || 'N/A',
                studentId: s.studentId || 'N/A',
                rollNumber: s.rollNumber || 'N/A',
                className: s.className || 'N/A',
                section: s.section || 'N/A',
                averageScore: s.averageScore
            }))
        };
        
        res.json({ success: true, report: reportData });
        
    } catch (error) {
        console.error('Teacher report error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// ============ STUDENT REPORT - COMPLETELY REWRITTEN ============
router.get('/student-report/:studentId', async (req, res) => {
    try {
        const studentId = req.params.studentId;
        
        const student = await User.findById(studentId).select('-password');
        if (!student) {
            return res.status(404).json({ success: false, message: 'Student not found' });
        }
        
        // Get all scores
        const scores = await Score.find({ studentId: student._id }).sort({ date: -1 });
        
        // Process scores with percentages
        const processedScores = scores.map(score => {
            let percentage = 0;
            if (score.obtainedMarks && score.maxMarks && score.maxMarks > 0) {
                percentage = (score.obtainedMarks / score.maxMarks) * 100;
            }
            let grade = 'F';
            if (percentage >= 90) grade = 'A+';
            else if (percentage >= 80) grade = 'A';
            else if (percentage >= 70) grade = 'B+';
            else if (percentage >= 60) grade = 'B';
            else if (percentage >= 50) grade = 'C';
            
            return {
                subject: score.subject || 'N/A',
                obtainedMarks: score.obtainedMarks || 0,
                maxMarks: score.maxMarks || 100,
                percentage: percentage.toFixed(2),
                examType: score.examType || 'Weekly Test',
                date: score.date,
                grade: grade
            };
        });
        
        // Calculate average score
        let avgScore = 0;
        if (processedScores.length > 0) {
            let total = 0;
            for (let i = 0; i < processedScores.length; i++) {
                total += parseFloat(processedScores[i].percentage);
            }
            avgScore = (total / processedScores.length).toFixed(2);
        }
        
        // Get attendance
        const attendance = await Attendance.find({ studentId: student._id }).sort({ date: -1 });
        
        // Calculate attendance percentage
        let attendancePercent = 0;
        if (attendance.length > 0) {
            const presentCount = attendance.filter(a => a.status === 'present').length;
            attendancePercent = ((presentCount / attendance.length) * 100).toFixed(2);
        }
        
        const reportData = {
            student: {
                id: student._id,
                name: student.name,
                email: student.email,
                studentId: student.studentId || 'N/A',
                rollNumber: student.rollNumber || 'N/A',
                className: student.className || 'N/A',
                section: student.section || 'N/A',
                averageScore: avgScore,
                attendancePercentage: attendancePercent,
                totalExams: processedScores.length
            },
            scores: processedScores,
            attendance: attendance.map(a => ({
                date: a.date,
                subject: a.subject || 'Full Day',
                status: a.status,
                remarks: a.status === 'present' ? 'Present' : (a.status === 'absent' ? 'Absent' : 'Late')
            }))
        };
        
        res.json({ success: true, report: reportData });
        
    } catch (error) {
        console.error('Student report error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

router.get('/test', (req, res) => {
    res.json({ success: true, message: 'Admin API is working' });
});

module.exports = router;