const User = require('../models/User');
const Score = require('../models/Score');
const Attendance = require('../models/Attendance');
const WeeklyReport = require('../models/WeeklyReport');

// Get all users
const getAllUsers = async (req, res) => {
    try {
        const users = await User.find({}).select('-password');
        res.json({ success: true, users });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Create new user
const createUser = async (req, res) => {
    try {
        const { name, email, password, role, studentId, className, section, rollNumber, assignedClass, assignedSection, subjects } = req.body;
        
        const userExists = await User.findOne({ email });
        if (userExists) {
            return res.status(400).json({ success: false, message: 'User already exists' });
        }
        
        const userData = { name, email, password, role, mobile: null };
        
        if (role === 'student') {
            userData.studentId = studentId;
            userData.className = className;
            userData.section = section;
            userData.rollNumber = rollNumber;
        } else if (role === 'teacher') {
            userData.assignedClass = assignedClass;
            userData.assignedSection = assignedSection;
            userData.subjects = subjects || [];
        }
        
        const user = await User.create(userData);
        res.status(201).json({ success: true, message: `${role} created successfully`, user });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// UPDATE USER - Fixed to update any field
const updateUser = async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = req.body;
        
        console.log('Updating user:', id, 'with data:', updateData);
        
        // Find which field is being updated
        const allowedFields = ['name', 'email', 'studentId', 'className', 'section', 'rollNumber', 'assignedClass', 'assignedSection', 'subjects'];
        
        const filteredData = {};
        for (let field of allowedFields) {
            if (updateData[field] !== undefined) {
                filteredData[field] = updateData[field];
            }
        }
        
        const user = await User.findByIdAndUpdate(
            id,
            filteredData,
            { new: true, runValidators: true }
        ).select('-password');
        
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        
        console.log('User updated successfully:', user);
        
        res.json({ 
            success: true, 
            message: 'User updated successfully',
            user: user
        });
    } catch (error) {
        console.error('Update error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// Delete user
const deleteUser = async (req, res) => {
    try {
        const user = await User.findByIdAndDelete(req.params.id);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        
        await Score.deleteMany({ studentId: req.params.id });
        await Attendance.deleteMany({ studentId: req.params.id });
        await WeeklyReport.deleteMany({ studentId: req.params.id });
        
        res.json({ success: true, message: 'User deleted successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Get statistics
const getStats = async (req, res) => {
    try {
        const totalStudents = await User.countDocuments({ role: 'student' });
        const totalTeachers = await User.countDocuments({ role: 'teacher' });
        const totalAdmins = await User.countDocuments({ role: 'admin' });
        const totalScores = await Score.countDocuments();
        const totalAttendance = await Attendance.countDocuments();
        
        res.json({
            success: true,
            stats: {
                totalStudents,
                totalTeachers,
                totalAdmins,
                totalScores: totalScores || 0,
                totalAttendance: totalAttendance || 0,
                totalUsers: totalStudents + totalTeachers + totalAdmins
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get teacher details with their students - FIXED
const getTeacherDetails = async (req, res) => {
    try {
        const teachers = await User.find({ role: 'teacher' }).select('-password');
        
        const teacherDetails = [];
        for (const teacher of teachers) {
            // Get all students (or filter by class if needed)
            const students = await User.find({ role: 'student' }).select('-password');
            
            teacherDetails.push({
                _id: teacher._id,
                name: teacher.name,
                email: teacher.email,
                assignedClass: teacher.assignedClass,
                assignedSection: teacher.assignedSection,
                subjects: teacher.subjects || [],
                totalStudents: students.length,
                students: students.map(s => ({
                    id: s._id,
                    name: s.name,
                    email: s.email,
                    studentId: s.studentId,
                    class: s.className || 'Not Assigned',  // FIXED: Use className
                    section: s.section || 'Not Assigned',  // Also add section if needed
                    rollNumber: s.rollNumber
                }))
            });
        }
        
        res.json({
            success: true,
            teachers: teacherDetails
        });
    } catch (error) {
        console.error('Error in getTeacherDetails:', error);
        res.status(500).json({ 
            success: false, 
            message: error.message 
        });
    }
};

// Get student details
// @desc    Get student details with their performance - FIXED
const getStudentDetails = async (req, res) => {
    try {
        const students = await User.find({ role: 'student' }).select('-password');
        
        const studentDetails = [];
        for (const student of students) {
            const scores = await Score.find({ studentId: student._id });
            const avgScore = scores.length > 0 
                ? scores.reduce((sum, s) => sum + (s.percentage || 0), 0) / scores.length 
                : 0;
            
            const attendance = await Attendance.find({ studentId: student._id });
            const attendancePercent = attendance.length > 0
                ? (attendance.filter(a => a.status === 'present').length / attendance.length) * 100
                : 0;
            
            studentDetails.push({
                _id: student._id,
                name: student.name,
                email: student.email,
                studentId: student.studentId,
                className: student.className || 'Not Assigned',  // FIXED
                section: student.section || 'Not Assigned',
                rollNumber: student.rollNumber || 'Not Assigned',
                averageScore: avgScore.toFixed(2),
                attendancePercentage: attendancePercent.toFixed(2),
                totalScores: scores.length,
                totalAttendance: attendance.length
            });
        }
        
        res.json({
            success: true,
            students: studentDetails
        });
    } catch (error) {
        console.error('Error in getStudentDetails:', error);
        res.status(500).json({ 
            success: false, 
            message: error.message 
        });
    }
};

// Generate system report
const generateSystemReport = async (req, res) => {
    try {
        const { reportType, studentId, teacherId } = req.body;
        let reportData = {};
        
        if (reportType === 'student' && studentId) {
            const student = await User.findById(studentId).select('-password');
            const scores = await Score.find({ studentId });
            const attendance = await Attendance.find({ studentId });
            
            reportData = {
                type: 'student',
                student: {
                    name: student.name,
                    email: student.email,
                    studentId: student.studentId,
                    className: student.className,
                    section: student.section,
                    rollNumber: student.rollNumber
                },
                scores: scores.map(s => ({
                    subject: s.subject,
                    obtainedMarks: s.obtainedMarks,
                    maxMarks: s.maxMarks,
                    examType: s.examType,
                    date: s.date
                })),
                attendance: attendance,
                generatedAt: new Date()
            };
        } 
        else if (reportType === 'teacher' && teacherId) {
            const teacher = await User.findById(teacherId).select('-password');
            const students = await User.find({ role: 'student' });
            
            reportData = {
                type: 'teacher',
                teacher: {
                    name: teacher.name,
                    email: teacher.email,
                    assignedClass: teacher.assignedClass,
                    assignedSection: teacher.assignedSection
                },
                students: students,
                generatedAt: new Date()
            };
        }
        else {
            const students = await User.find({ role: 'student' });
            const teachers = await User.find({ role: 'teacher' });
            const totalScores = await Score.countDocuments();
            const totalAttendance = await Attendance.countDocuments();
            
            reportData = {
                type: 'system',
                totalStudents: students.length,
                totalTeachers: teachers.length,
                totalScores,
                totalAttendance,
                students,
                teachers,
                generatedAt: new Date()
            };
        }
        
        res.json({ success: true, report: reportData });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = {
    getAllUsers,
    createUser,
    updateUser,
    deleteUser,
    getStats,
    getTeacherDetails,
    getStudentDetails,
    generateSystemReport
};