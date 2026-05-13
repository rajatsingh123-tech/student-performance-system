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
        res.status(201).json({ success: true, message: `${role} created successfully`, user: { id: user._id, name: user.name, email: user.email, role: user.role } });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// UPDATE USER
const updateUser = async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = req.body;
        
        console.log('Updating user:', id, 'with data:', updateData);
        
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

// Get teacher details with their students
const getTeacherDetails = async (req, res) => {
    try {
        const teachers = await User.find({ role: 'teacher' }).select('-password');
        
        const teacherDetails = [];
        for (const teacher of teachers) {
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
                    class: s.className || 'Not Assigned',
                    section: s.section || 'Not Assigned',
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
// Get student details - FIXED with correct average score calculation
const getStudentDetails = async (req, res) => {
    try {
        const students = await User.find({ role: 'student' }).select('-password');
        
        const studentDetails = [];
        for (const student of students) {
            // Fetch all scores for this student
            const scores = await Score.find({ studentId: student._id });
            
            let avgScore = 0;
            if (scores && scores.length > 0) {
                let totalPercentage = 0;
                let validScoreCount = 0;
                for (let i = 0; i < scores.length; i++) {
                    if (scores[i].obtainedMarks && scores[i].maxMarks && scores[i].maxMarks > 0) {
                        const percentage = (scores[i].obtainedMarks / scores[i].maxMarks) * 100;
                        totalPercentage += percentage;
                        validScoreCount++;
                    }
                }
                if (validScoreCount > 0) {
                    avgScore = totalPercentage / validScoreCount;
                }
            }
            
            // Calculate attendance percentage
            const attendance = await Attendance.find({ studentId: student._id });
            let attendancePercent = 0;
            if (attendance && attendance.length > 0) {
                const presentCount = attendance.filter(a => a.status === 'present').length;
                attendancePercent = (presentCount / attendance.length) * 100;
            }
            
            studentDetails.push({
                _id: student._id,
                name: student.name,
                email: student.email,
                studentId: student.studentId || 'N/A',
                className: student.className || 'Not Assigned',
                section: student.section || 'Not Assigned',
                rollNumber: student.rollNumber || 'Not Assigned',
                averageScore: avgScore.toFixed(2),
                attendancePercentage: attendancePercent.toFixed(2),
                totalScores: scores ? scores.length : 0,
                totalAttendance: attendance ? attendance.length : 0
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
// ============ GENERATE SYSTEM REPORT - FIXED ============
const generateSystemReport = async (req, res) => {
    try {
        const { reportType, studentId, teacherId } = req.body;
        
        // ============ STUDENT REPORT ============
        if (reportType === 'student' && studentId) {
            const student = await User.findById(studentId).select('-password');
            if (!student) {
                return res.status(404).json({ success: false, message: 'Student not found' });
            }
            
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
            
            return res.json({
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
        }
        
        // ============ TEACHER REPORT - FIXED (students ke averageScore properly set) ============
        if (reportType === 'teacher' && teacherId) {
            const teacher = await User.findById(teacherId).select('-password');
            if (!teacher) {
                return res.status(404).json({ success: false, message: 'Teacher not found' });
            }
            
            // Get students in teacher's class
            let students = [];
            if (teacher.assignedClass) {
                const query = { role: 'student', className: teacher.assignedClass };
                if (teacher.assignedSection && teacher.assignedSection !== '') {
                    query.section = teacher.assignedSection;
                }
                students = await User.find(query).select('name email studentId rollNumber className section');
            }
            
            // Calculate average scores for each student and create new array with averageScore
            const studentsWithScores = [];
            let totalAverageSum = 0;
            
            for (let i = 0; i < students.length; i++) {
                const student = students[i];
                const studentScores = await Score.find({ studentId: student._id });
                
                let avgScore = 0;
                if (studentScores && studentScores.length > 0) {
                    let totalPercentage = 0;
                    let validScoreCount = 0;
                    for (let j = 0; j < studentScores.length; j++) {
                        if (studentScores[j].obtainedMarks && studentScores[j].maxMarks && studentScores[j].maxMarks > 0) {
                            totalPercentage += (studentScores[j].obtainedMarks / studentScores[j].maxMarks) * 100;
                            validScoreCount++;
                        }
                    }
                    if (validScoreCount > 0) {
                        avgScore = (totalPercentage / validScoreCount).toFixed(2);
                    }
                }
                
                studentsWithScores.push({
                    name: student.name,
                    email: student.email,
                    studentId: student.studentId || 'N/A',
                    rollNumber: student.rollNumber || 'N/A',
                    className: student.className || 'N/A',
                    section: student.section || 'N/A',
                    averageScore: avgScore
                });
                
                totalAverageSum += parseFloat(avgScore);
            }
            
            // Calculate overall average score
            const overallAvg = studentsWithScores.length > 0 ? (totalAverageSum / studentsWithScores.length).toFixed(2) : '0';
            
            // Get teacher's subjects
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
            
            return res.json({
                success: true,
                report: {
                    teacher: {
                        name: teacher.name,
                        email: teacher.email,
                        assignedClass: teacher.assignedClass || 'Not Assigned',
                        assignedSection: teacher.assignedSection || 'Not Assigned',
                        subjects: teacherSubjects,
                        totalStudents: studentsWithScores.length,
                        overallAverageScore: overallAvg
                    },
                    students: studentsWithScores
                }
            });
        }
        
        // ============ SYSTEM REPORT ============
        if (reportType === 'system') {
            const students = await User.find({ role: 'student' }).select('-password');
            const teachers = await User.find({ role: 'teacher' }).select('-password');
            const admins = await User.find({ role: 'admin' }).select('-password');
            
            const totalScores = await Score.countDocuments();
            const totalAttendance = await Attendance.countDocuments();
            
            // Calculate overall average score
            let totalAvgScore = 0;
            let scoreCount = 0;
            for (let i = 0; i < students.length; i++) {
                const scores = await Score.find({ studentId: students[i]._id });
                if (scores.length > 0) {
                    let studentTotal = 0;
                    for (let j = 0; j < scores.length; j++) {
                        if (scores[j].obtainedMarks && scores[j].maxMarks && scores[j].maxMarks > 0) {
                            studentTotal += (scores[j].obtainedMarks / scores[j].maxMarks) * 100;
                        }
                    }
                    totalAvgScore += (studentTotal / scores.length);
                    scoreCount++;
                }
            }
            const avgScore = scoreCount > 0 ? (totalAvgScore / scoreCount).toFixed(2) : '0';
            
            return res.json({
                success: true,
                report: {
                    totalStudents: students.length,
                    totalTeachers: teachers.length,
                    totalAdmins: admins.length,
                    totalScores: totalScores,
                    totalAttendance: totalAttendance,
                    averageScorePercentage: avgScore,
                    students: students,
                    teachers: teachers
                }
            });
        }
        
        return res.status(400).json({ success: false, message: 'Invalid report type' });
        
    } catch (error) {
        console.error('Generate report error:', error);
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