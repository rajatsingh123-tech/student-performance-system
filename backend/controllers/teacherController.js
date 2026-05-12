const Score = require('../models/Score');
const Attendance = require('../models/Attendance');
const User = require('../models/User');
const WeeklyReport = require('../models/WeeklyReport');

// ============ HELPER FUNCTIONS ============

// Get all sections a teacher teaches
function getTeacherSections(teacher) {
    if (teacher.teachingSections && teacher.teachingSections.length > 0) {
        return teacher.teachingSections;
    }
    // Fallback for old data structure
    if (teacher.assignedClass && teacher.assignedSection) {
        return [{
            className: teacher.assignedClass,
            section: teacher.assignedSection,
            isClassTeacher: teacher.isClassTeacher || false
        }];
    }
    return [];
}

// Check if teacher teaches a specific student
function teacherTeachesStudent(teacher, student) {
    const sections = getTeacherSections(teacher);
    return sections.some(s => s.className === student.className && s.section === student.section);
}

// Check if teacher is class teacher of a student
function isClassTeacherOfStudent(teacher, student) {
    const sections = getTeacherSections(teacher);
    const sectionData = sections.find(s => s.className === student.className && s.section === student.section);
    return sectionData ? sectionData.isClassTeacher : false;
}

// ============ STUDENT MANAGEMENT ============

// Get teacher's students - SECTION WISE GROUPING
const getMyStudents = async (req, res) => {
    try {
        const teacher = await User.findById(req.user._id);
        
        if (!teacher) {
            return res.status(404).json({ success: false, message: 'Teacher not found' });
        }
        
        const teachingSections = getTeacherSections(teacher);
        
        console.log('Teacher Data:', {
            name: teacher.name,
            teachingSections: teachingSections,
            subjects: teacher.subjects
        });
        
        if (teachingSections.length === 0) {
            return res.json({
                success: true,
                teacher: {
                    name: teacher.name,
                    subjects: teacher.subjects || [],
                    teachingSections: [],
                    assignedClass: 'Not Assigned',
                    assignedSection: 'Not Assigned'
                },
                students: [],
                totalStudents: 0
            });
        }
        
        // Separate Class Teacher Section and Subject Teacher Sections
        const classTeacherSection = teachingSections.find(s => s.isClassTeacher === true);
        const subjectTeacherSections = teachingSections.filter(s => s.isClassTeacher !== true);
        
        // Get display class/section for dashboard stats
        let displayClass = 'Not Assigned';
        let displaySection = 'Not Assigned';
        if (classTeacherSection) {
            displayClass = classTeacherSection.className;
            displaySection = classTeacherSection.section;
        } else if (teachingSections.length > 0) {
            displayClass = teachingSections[0].className;
            displaySection = teachingSections[0].section;
        }
        
        // ============ 1. CLASS TEACHER SECTION STUDENTS ============
        let classTeacherStudents = [];
        if (classTeacherSection) {
            const students = await User.find({
                role: 'student',
                className: classTeacherSection.className,
                section: classTeacherSection.section
            }).select('-password');
            
            for (const student of students) {
                // Class Teacher can see ALL subjects scores
                const scores = await Score.find({ studentId: student._id });
                const avgScore = scores.length > 0 
                    ? scores.reduce((sum, s) => sum + (s.percentage || 0), 0) / scores.length 
                    : 0;
                
                // Class Teacher can see ALL subjects attendance
                const attendance = await Attendance.find({ studentId: student._id });
                const attendancePercent = attendance.length > 0
                    ? (attendance.filter(a => a.status === 'present').length / attendance.length) * 100
                    : 0;
                
                classTeacherStudents.push({
                    _id: student._id,
                    name: student.name,
                    email: student.email,
                    studentId: student.studentId || 'Not Assigned',
                    rollNumber: student.rollNumber || 'Not Assigned',
                    className: student.className,
                    section: student.section,
                    averageScore: avgScore.toFixed(2),
                    attendancePercentage: attendancePercent.toFixed(2)
                });
            }
        }
        
        // ============ 2. SUBJECT TEACHER SECTIONS STUDENTS ============
        let subjectTeacherStudents = [];
        for (const section of subjectTeacherSections) {
            const students = await User.find({
                role: 'student',
                className: section.className,
                section: section.section
            }).select('-password');
            
            for (const student of students) {
                // Subject Teacher can see ONLY their subjects scores
                const scores = await Score.find({ 
                    studentId: student._id,
                    subject: { $in: teacher.subjects }
                });
                const avgScore = scores.length > 0 
                    ? scores.reduce((sum, s) => sum + (s.percentage || 0), 0) / scores.length 
                    : 0;
                
                // Subject Teacher can see ONLY their subjects attendance
                const attendance = await Attendance.find({ 
                    studentId: student._id,
                    subject: { $in: teacher.subjects }
                });
                const attendancePercent = attendance.length > 0
                    ? (attendance.filter(a => a.status === 'present').length / attendance.length) * 100
                    : 0;
                
                subjectTeacherStudents.push({
                    _id: student._id,
                    name: student.name,
                    email: student.email,
                    studentId: student.studentId || 'Not Assigned',
                    rollNumber: student.rollNumber || 'Not Assigned',
                    className: student.className,
                    section: student.section,
                    averageScore: avgScore.toFixed(2),
                    attendancePercentage: attendancePercent.toFixed(2),
                    teachingSection: section
                });
            }
        }
        
        // Combine all students for backward compatibility
        const allStudents = [...classTeacherStudents, ...subjectTeacherStudents];
        
        res.json({
            success: true,
            teacher: {
                name: teacher.name,
                subjects: teacher.subjects || [],
                teachingSections: teachingSections,
                assignedClass: displayClass,
                assignedSection: displaySection,
                hasClassTeacherSection: !!classTeacherSection
            },
            classTeacherStudents: classTeacherStudents,     // Only for Class Teacher's own section
            subjectTeacherStudents: subjectTeacherStudents, // For other sections where teacher teaches
            students: allStudents,
            totalClassTeacherStudents: classTeacherStudents.length,
            totalSubjectTeacherStudents: subjectTeacherStudents.length,
            totalStudents: allStudents.length
        });
        
    } catch (error) {
        console.error('Error in getMyStudents:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// Get all students for dropdown
const getStudents = async (req, res) => {
    try {
        const teacher = await User.findById(req.user._id);
        const teachingSections = getTeacherSections(teacher);
        
        let allStudents = [];
        for (const section of teachingSections) {
            const students = await User.find({
                role: 'student',
                className: section.className,
                section: section.section
            }).select('_id name studentId rollNumber className section');
            allStudents.push(...students);
        }
        
        res.json({ success: true, students: allStudents });
    } catch (error) {
        console.error('Error in getStudents:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// Edit Student Details
const editStudent = async (req, res) => {
    try {
        const { studentId } = req.params;
        const { name, email, rollNumber, className, section } = req.body;
        
        const student = await User.findByIdAndUpdate(
            studentId,
            { name, email, rollNumber, className, section },
            { new: true }
        ).select('-password');
        
        if (!student) {
            return res.status(404).json({ success: false, message: 'Student not found' });
        }
        
        res.json({ success: true, message: 'Student details updated successfully', student });
    } catch (error) {
        console.error('Error in editStudent:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// Delete Student
const deleteStudent = async (req, res) => {
    try {
        const { studentId } = req.params;
        
        await Score.deleteMany({ studentId });
        await Attendance.deleteMany({ studentId });
        await WeeklyReport.deleteMany({ studentId });
        
        const student = await User.findByIdAndDelete(studentId);
        
        if (!student) {
            return res.status(404).json({ success: false, message: 'Student not found' });
        }
        
        res.json({ success: true, message: 'Student deleted successfully' });
    } catch (error) {
        console.error('Error in deleteStudent:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// ============ SCORE MANAGEMENT ============

// Add Score - With Permission Check
const addScore = async (req, res) => {
    try {
        const { studentId, subject, obtainedMarks, maxMarks, examType, remarks } = req.body;
        
        console.log('Add Score Request:', { studentId, subject, obtainedMarks, maxMarks, examType });
        
        if (!studentId || !subject || obtainedMarks === undefined || !maxMarks) {
            return res.status(400).json({ 
                success: false, 
                message: 'Missing required fields: studentId, subject, obtainedMarks, maxMarks' 
            });
        }
        
        const teacher = await User.findById(req.user._id);
        if (!teacher) {
            return res.status(404).json({ success: false, message: 'Teacher not found' });
        }
        
        const student = await User.findById(studentId);
        if (!student) {
            return res.status(404).json({ success: false, message: 'Student not found' });
        }
        
        // Check if teacher teaches this student's section
        if (!teacherTeachesStudent(teacher, student)) {
            return res.status(403).json({ 
                success: false, 
                message: 'You are not authorized to add scores for this student. You do not teach this section.' 
            });
        }
        
        // Check if teacher teaches this subject
        if (!teacher.subjects.includes(subject)) {
            return res.status(403).json({ 
                success: false, 
                message: `You are not authorized to add scores for ${subject}. You only teach: ${teacher.subjects.join(', ')}` 
            });
        }
        
        const percentage = (obtainedMarks / maxMarks) * 100;
        
        let grade = '';
        if (percentage >= 90) grade = 'A+';
        else if (percentage >= 80) grade = 'A';
        else if (percentage >= 70) grade = 'B+';
        else if (percentage >= 60) grade = 'B';
        else if (percentage >= 50) grade = 'C';
        else if (percentage >= 40) grade = 'D';
        else grade = 'F';
        
        const score = await Score.create({
            studentId,
            subject,
            obtainedMarks: Number(obtainedMarks),
            maxMarks: Number(maxMarks),
            percentage: percentage.toFixed(2),
            grade,
            examType: examType || 'Weekly Test',
            remarks: remarks || '',
            markedBy: req.user._id,
            date: new Date()
        });
        
        console.log('Score added successfully:', score._id);
        
        res.json({ success: true, message: 'Score added successfully', score });
        
    } catch (error) {
        console.error('Error in addScore:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// Edit Score
const editScore = async (req, res) => {
    try {
        const { scoreId } = req.params;
        const { obtainedMarks, maxMarks, examType, remarks } = req.body;
        
        const existingScore = await Score.findById(scoreId);
        if (!existingScore) {
            return res.status(404).json({ success: false, message: 'Score not found' });
        }
        
        const teacher = await User.findById(req.user._id);
        const student = await User.findById(existingScore.studentId);
        
        if (!teacherTeachesStudent(teacher, student)) {
            return res.status(403).json({ success: false, message: 'You are not authorized to edit this score' });
        }
        
        const percentage = (obtainedMarks / maxMarks) * 100;
        
        let grade = '';
        if (percentage >= 90) grade = 'A+';
        else if (percentage >= 80) grade = 'A';
        else if (percentage >= 70) grade = 'B+';
        else if (percentage >= 60) grade = 'B';
        else if (percentage >= 50) grade = 'C';
        else if (percentage >= 40) grade = 'D';
        else grade = 'F';
        
        const score = await Score.findByIdAndUpdate(
            scoreId,
            { 
                obtainedMarks, 
                maxMarks, 
                percentage: percentage.toFixed(2),
                grade,
                examType, 
                remarks,
                markedBy: req.user._id 
            },
            { new: true }
        );
        
        res.json({ success: true, message: 'Score updated successfully', score });
    } catch (error) {
        console.error('Error in editScore:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// Delete Score
const deleteScore = async (req, res) => {
    try {
        const { scoreId } = req.params;
        
        const score = await Score.findByIdAndDelete(scoreId);
        
        if (!score) {
            return res.status(404).json({ success: false, message: 'Score not found' });
        }
        
        res.json({ success: true, message: 'Score deleted successfully' });
    } catch (error) {
        console.error('Error in deleteScore:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// Get student scores - With Permission Check
const getStudentScores = async (req, res) => {
    try {
        const { studentId } = req.params;
        const teacher = await User.findById(req.user._id);
        
        const student = await User.findById(studentId);
        if (!student) {
            return res.status(404).json({ success: false, message: 'Student not found' });
        }
        
        if (!teacherTeachesStudent(teacher, student)) {
            return res.status(403).json({ success: false, message: 'You are not authorized to view this student\'s scores' });
        }
        
        const isClassTeacher = isClassTeacherOfStudent(teacher, student);
        
        let scoreQuery = { studentId };
        if (!isClassTeacher) {
            scoreQuery.subject = { $in: teacher.subjects };
        }
        
        const scores = await Score.find(scoreQuery).sort({ date: -1 });
        
        const totalObtained = scores.reduce((sum, s) => sum + s.obtainedMarks, 0);
        const totalMax = scores.reduce((sum, s) => sum + s.maxMarks, 0);
        const overallPercentage = totalMax > 0 ? (totalObtained / totalMax) * 100 : 0;
        
        let grade = '';
        if (overallPercentage >= 90) grade = 'A+';
        else if (overallPercentage >= 80) grade = 'A';
        else if (overallPercentage >= 70) grade = 'B+';
        else if (overallPercentage >= 60) grade = 'B';
        else if (overallPercentage >= 50) grade = 'C';
        else if (overallPercentage >= 40) grade = 'D';
        else grade = 'F';
        
        res.json({ 
            success: true, 
            scores,
            summary: {
                totalObtained: totalObtained.toFixed(2),
                totalMax: totalMax,
                overallPercentage: overallPercentage.toFixed(2),
                grade: grade,
                totalAssessments: scores.length
            }
        });
    } catch (error) {
        console.error('Error in getStudentScores:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// ============ ATTENDANCE MANAGEMENT ============

// Mark attendance - With Permission Check
const markAttendance = async (req, res) => {
    try {
        const { studentId, subject, status, date, attendanceType } = req.body;
        const teacher = await User.findById(req.user._id);
        
        const student = await User.findById(studentId);
        if (!student) {
            return res.status(404).json({ success: false, message: 'Student not found' });
        }
        
        if (!teacherTeachesStudent(teacher, student)) {
            return res.status(403).json({ success: false, message: 'You are not authorized to mark attendance for this student' });
        }
        
        if (attendanceType === 'subject_wise' && subject !== 'Full Day') {
            if (!teacher.subjects.includes(subject)) {
                return res.status(403).json({ 
                    success: false, 
                    message: `You are not authorized to mark attendance for ${subject}` 
                });
            }
        }
        
        const attendanceDate = new Date(date);
        attendanceDate.setHours(0, 0, 0, 0);
        
        const existing = await Attendance.findOne({
            studentId,
            subject,
            date: {
                $gte: attendanceDate,
                $lt: new Date(attendanceDate.getTime() + 24 * 60 * 60 * 1000)
            }
        });
        
        if (existing) {
            existing.status = status;
            existing.markedBy = req.user._id;
            await existing.save();
            res.json({ success: true, message: 'Attendance updated successfully', attendance: existing });
        } else {
            const attendance = await Attendance.create({
                studentId,
                subject,
                status,
                date: attendanceDate,
                markedBy: req.user._id
            });
            res.json({ success: true, message: 'Attendance marked successfully', attendance });
        }
    } catch (error) {
        console.error('Error in markAttendance:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// Edit Attendance
const editAttendance = async (req, res) => {
    try {
        const { attendanceId } = req.params;
        const { status } = req.body;
        
        const attendance = await Attendance.findByIdAndUpdate(
            attendanceId,
            { status, markedBy: req.user._id },
            { new: true }
        );
        
        if (!attendance) {
            return res.status(404).json({ success: false, message: 'Attendance record not found' });
        }
        
        res.json({ success: true, message: 'Attendance updated successfully', attendance });
    } catch (error) {
        console.error('Error in editAttendance:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// Delete Attendance
const deleteAttendance = async (req, res) => {
    try {
        const { attendanceId } = req.params;
        
        const attendance = await Attendance.findByIdAndDelete(attendanceId);
        
        if (!attendance) {
            return res.status(404).json({ success: false, message: 'Attendance record not found' });
        }
        
        res.json({ success: true, message: 'Attendance deleted successfully' });
    } catch (error) {
        console.error('Error in deleteAttendance:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// Get student attendance
const getStudentAttendance = async (req, res) => {
    try {
        const { studentId } = req.params;
        const attendance = await Attendance.find({ studentId }).sort({ date: -1 });
        res.json({ success: true, attendance });
    } catch (error) {
        console.error('Error in getStudentAttendance:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// ============ TEACHER SCHEDULE FUNCTIONS ============

// ============ TEACHER SCHEDULE FUNCTIONS ============

const getTeacherSchedule = async (req, res) => {
    try {
        const teacher = await User.findById(req.user._id);
        if (!teacher) {
            return res.status(404).json({ success: false, message: 'Teacher not found' });
        }
        res.json({ 
            success: true, 
            schedule: teacher.teacherSchedule || []
        });
    } catch (error) {
        console.error('Error in getTeacherSchedule:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

const updateTeacherSchedule = async (req, res) => {
    try {
        const { schedule } = req.body;
        
        console.log('Received schedule data:', schedule);
        
        if (!schedule || !Array.isArray(schedule)) {
            return res.status(400).json({ 
                success: false, 
                message: 'Schedule must be an array' 
            });
        }
        
        // Validate each schedule item
        for (const item of schedule) {
            if (!item.day || !item.class || !item.section || !item.subject || !item.startTime || !item.endTime) {
                return res.status(400).json({ 
                    success: false, 
                    message: 'Each schedule item must have day, class, section, subject, startTime, endTime' 
                });
            }
        }
        
        const teacher = await User.findByIdAndUpdate(
            req.user._id,
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
        console.error('Error in updateTeacherSchedule:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// ============ SUBJECT MANAGEMENT ============

const getMySubjects = async (req, res) => {
    try {
        const teacher = await User.findById(req.user._id);
        res.json({ 
            success: true, 
            subjects: teacher.subjects || [],
            teachingSections: getTeacherSections(teacher)
        });
    } catch (error) {
        console.error('Error in getMySubjects:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

const updateMySubjects = async (req, res) => {
    try {
        const { subjects } = req.body;
        
        if (!subjects || !Array.isArray(subjects)) {
            return res.status(400).json({ 
                success: false, 
                message: 'Subjects must be an array' 
            });
        }
        
        const teacher = await User.findByIdAndUpdate(
            req.user._id,
            { subjects: subjects },
            { new: true }
        );
        
        if (!teacher) {
            return res.status(404).json({ success: false, message: 'Teacher not found' });
        }
        
        res.json({ 
            success: true, 
            message: 'Subjects updated successfully', 
            subjects: teacher.subjects 
        });
    } catch (error) {
        console.error('Error in updateMySubjects:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

const getAllSubjects = async (req, res) => {
    try {
        const allSubjects = [
            'Mathematics', 'Physics', 'Chemistry', 'Computer Science', 
            'Web Development', 'Database', 'Operating System', 'Computer Networks',
            'Data Structures', 'Software Engineering', 'Cloud Computing', 'Cyber Security',
            'Artificial Intelligence', 'Machine Learning', 'Data Science',
            'English', 'Economics', 'Management', 'Marketing', 'Finance', 'Accounting'
        ];
        res.json({ success: true, subjects: allSubjects });
    } catch (error) {
        console.error('Error in getAllSubjects:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// ============ REPORTS ============

const generateStudentPDF = async (req, res) => {
    try {
        const { studentId } = req.params;
        
        const student = await User.findById(studentId).select('-password');
        const scores = await Score.find({ studentId }).sort({ date: -1 });
        const attendance = await Attendance.find({ studentId }).sort({ date: -1 });
        
        const totalObtained = scores.reduce((sum, s) => sum + s.obtainedMarks, 0);
        const totalMax = scores.reduce((sum, s) => sum + s.maxMarks, 0);
        const avgScore = totalMax > 0 ? (totalObtained / totalMax) * 100 : 0;
        
        const presentCount = attendance.filter(a => a.status === 'present').length;
        const attendancePercent = attendance.length > 0 ? (presentCount / attendance.length) * 100 : 0;
        
        let grade = '';
        if (avgScore >= 90) grade = 'A+';
        else if (avgScore >= 80) grade = 'A';
        else if (avgScore >= 70) grade = 'B+';
        else if (avgScore >= 60) grade = 'B';
        else if (avgScore >= 50) grade = 'C';
        else if (avgScore >= 40) grade = 'D';
        else grade = 'F';
        
        const reportData = {
            student: {
                name: student.name,
                email: student.email,
                studentId: student.studentId,
                className: student.className,
                section: student.section,
                rollNumber: student.rollNumber
            },
            scores: scores,
            attendance: attendance,
            averageScore: avgScore.toFixed(2),
            attendancePercentage: attendancePercent.toFixed(2),
            grade: grade,
            totalObtained: totalObtained.toFixed(2),
            totalMax: totalMax,
            generatedAt: new Date()
        };
        
        res.json({ success: true, report: reportData });
    } catch (error) {
        console.error('Error in generateStudentPDF:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

const generateWeeklyReport = async (req, res) => {
    try {
        const { studentId, weekStartDate } = req.body;
        
        const weekEndDate = new Date(weekStartDate);
        weekEndDate.setDate(weekEndDate.getDate() + 6);
        
        const scores = await Score.find({
            studentId,
            date: { $gte: new Date(weekStartDate), $lte: weekEndDate }
        });
        
        const attendance = await Attendance.find({
            studentId,
            date: { $gte: new Date(weekStartDate), $lte: weekEndDate }
        });
        
        const avgScore = scores.length > 0 
            ? scores.reduce((sum, s) => sum + s.percentage, 0) / scores.length 
            : 0;
        
        const attendancePercentage = attendance.length > 0
            ? (attendance.filter(a => a.status === 'present').length / attendance.length) * 100
            : 0;
        
        const report = await WeeklyReport.create({
            studentId,
            weekStartDate: new Date(weekStartDate),
            weekEndDate,
            averageScore: avgScore,
            attendancePercentage,
            performanceSummary: generateSummary(avgScore, attendancePercentage),
            recommendations: getRecommendations(avgScore, attendancePercentage)
        });
        
        res.json({ success: true, report });
    } catch (error) {
        console.error('Error in generateWeeklyReport:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

function generateSummary(score, attendance) {
    if (score >= 85 && attendance >= 90) return "Excellent performance! Keep up the great work!";
    if (score >= 70 && attendance >= 75) return "Good performance. Maintain consistency.";
    if (score >= 50 || attendance >= 60) return "Satisfactory. Need improvement in some areas.";
    return "Needs significant improvement. Please focus on studies and attendance.";
}

function getRecommendations(score, attendance) {
    const recommendations = [];
    if (score < 60) recommendations.push("Focus more on core subjects");
    if (attendance < 75) recommendations.push("Improve attendance regularly");
    if (score < 70 && score >= 50) recommendations.push("Practice more problems daily");
    if (attendance >= 90 && score >= 85) recommendations.push("Consider taking advanced courses");
    return recommendations;
}

// ============ EXPORT ALL FUNCTIONS ============

module.exports = { 
    getMyStudents,
    getStudents,
    editStudent,
    deleteStudent,
    addScore,
    editScore,
    deleteScore,
    getStudentScores,
    markAttendance,
    editAttendance,
    deleteAttendance,
    getStudentAttendance,
    getTeacherSchedule,
    updateTeacherSchedule,
    getMySubjects,
    updateMySubjects,
    getAllSubjects,
    generateStudentPDF,
    generateWeeklyReport
};