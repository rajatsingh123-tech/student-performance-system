const express = require('express');
const { protect, authorize } = require('../middleware/auth');
const router = express.Router();

// Import controller
const teacherController = require('../controllers/teacherController');

// All routes require authentication and teacher role
router.use(protect);
router.use(authorize('teacher'));

// ============ STUDENT MANAGEMENT ============
router.get('/my-students', teacherController.getMyStudents);
router.get('/students', teacherController.getStudents);
router.put('/edit-student/:studentId', teacherController.editStudent);
router.delete('/delete-student/:studentId', teacherController.deleteStudent);

// ============ SCORE MANAGEMENT ============
router.post('/scores', teacherController.addScore);
router.put('/edit-score/:scoreId', teacherController.editScore);
router.delete('/delete-score/:scoreId', teacherController.deleteScore);
router.get('/student-scores/:studentId', teacherController.getStudentScores);

// ============ ATTENDANCE MANAGEMENT ============
router.post('/attendance', teacherController.markAttendance);
router.put('/edit-attendance/:attendanceId', teacherController.editAttendance);
router.delete('/delete-attendance/:attendanceId', teacherController.deleteAttendance);
router.get('/student-attendance/:studentId', teacherController.getStudentAttendance);

// ============ TEACHER SCHEDULE ============
router.get('/schedule', teacherController.getTeacherSchedule);
router.put('/schedule', teacherController.updateTeacherSchedule);

// ============ SUBJECT MANAGEMENT ============
router.get('/my-subjects', teacherController.getMySubjects);
router.put('/my-subjects', teacherController.updateMySubjects);
router.get('/all-subjects', teacherController.getAllSubjects);

// ============ REPORTS ============
router.get('/generate-pdf/:studentId', teacherController.generateStudentPDF);
router.post('/generate-report', teacherController.generateWeeklyReport);

module.exports = router;