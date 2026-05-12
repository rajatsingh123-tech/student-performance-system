const Score = require('../models/Score');
const Attendance = require('../models/Attendance');
const WeeklyReport = require('../models/WeeklyReport');
const User = require('../models/User');

// @desc    Get student dashboard data (class, section, etc.)
const getDashboardData = async (req, res) => {
    try {
        const student = await User.findById(req.user._id).select('-password');
        
        console.log('Student Dashboard Data:', {
            name: student.name,
            className: student.className,
            section: student.section,
            rollNumber: student.rollNumber,
            studentId: student.studentId
        });
        
        const scores = await Score.find({ studentId: req.user._id });
        const avgScore = scores.length > 0 
            ? scores.reduce((sum, s) => sum + (s.percentage || s.marks || 0), 0) / scores.length 
            : 0;
        
        const attendance = await Attendance.find({ studentId: req.user._id });
        const attendancePercent = attendance.length > 0
            ? (attendance.filter(a => a.status === 'present').length / attendance.length) * 100
            : 0;
        
        res.json({
            success: true,
            student: {
                name: student.name,
                className: student.className || 'Not Assigned',
                section: student.section || 'Not Assigned',
                rollNumber: student.rollNumber || 'Not Assigned',
                studentId: student.studentId || 'Not Assigned'
            },
            performance: {
                averageScore: avgScore.toFixed(2),
                attendancePercentage: attendancePercent.toFixed(2),
                totalScores: scores.length
            }
        });
    } catch (error) {
        console.error('Error in getDashboardData:', error);
        res.status(500).json({ 
            success: false, 
            message: error.message 
        });
    }
};

// @desc    Get student scores
const getScores = async (req, res) => {
    try {
        const scores = await Score.find({ studentId: req.user._id })
            .sort({ date: -1 })
            .limit(50);
        
        console.log(`Found ${scores.length} scores for student ${req.user._id}`);
        
        res.json({
            success: true,
            scores: scores
        });
    } catch (error) {
        console.error('Error in getScores:', error);
        res.status(500).json({ 
            success: false, 
            message: error.message,
            scores: [] 
        });
    }
};

// @desc    Get student attendance
const getAttendance = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        let query = { studentId: req.user._id };

        if (startDate && endDate) {
            query.date = {
                $gte: new Date(startDate),
                $lte: new Date(endDate)
            };
        }

        const attendance = await Attendance.find(query).sort({ date: -1 });

        const totalDays = attendance.length;
        const presentDays = attendance.filter(a => a.status === 'present').length;
        const percentage = totalDays > 0 ? (presentDays / totalDays) * 100 : 0;

        res.json({
            success: true,
            records: attendance,
            summary: {
                totalDays,
                presentDays,
                absentDays: totalDays - presentDays,
                percentage: percentage.toFixed(2)
            }
        });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            message: error.message,
            records: [],
            summary: { totalDays: 0, presentDays: 0, absentDays: 0, percentage: 0 }
        });
    }
};

// @desc    Get weekly reports
const getWeeklyReports = async (req, res) => {
    try {
        const reports = await WeeklyReport.find({ studentId: req.user._id })
            .sort({ weekStartDate: -1 })
            .limit(8);
        
        res.json({
            success: true,
            reports: reports
        });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            message: error.message,
            reports: [] 
        });
    }
};

// @desc    Get performance chart data
const getPerformanceChart = async (req, res) => {
    try {
        const scores = await Score.find({ studentId: req.user._id })
            .sort({ date: 1 });

        const subjectMap = new Map();
        scores.forEach(score => {
            if (!subjectMap.has(score.subject)) {
                subjectMap.set(score.subject, []);
            }
            subjectMap.get(score.subject).push(score.marks || score.obtainedMarks || 0);
        });

        const chartData = {
            subjects: Array.from(subjectMap.keys()),
            data: Array.from(subjectMap.values()).map(marks => 
                marks.reduce((a, b) => a + b, 0) / marks.length
            )
        };

        res.json({
            success: true,
            chartData: chartData
        });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            message: error.message,
            chartData: { subjects: [], data: [] }
        });
    }
};

// ============ DELETE ATTENDANCE ============
const deleteAttendance = async (req, res) => {
    try {
        const { id } = req.params;
        
        const deleted = await Attendance.findOneAndDelete({
            _id: id,
            studentId: req.user._id
        });

        if (!deleted) {
            return res.status(404).json({ 
                success: false, 
                message: 'Attendance record not found' 
            });
        }

        res.json({ 
            success: true, 
            message: 'Attendance deleted successfully' 
        });

    } catch (error) {
        console.error('Delete attendance error:', error);
        res.status(500).json({ 
            success: false, 
            message: error.message 
        });
    }
};

// ============ UPDATE ATTENDANCE ============
const updateAttendance = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        if (!['present', 'absent', 'late'].includes(status)) {
            return res.status(400).json({ 
                success: false, 
                message: 'Invalid status. Must be present, absent, or late' 
            });
        }

        const updated = await Attendance.findOneAndUpdate(
            { _id: id, studentId: req.user._id },
            { status: status },
            { new: true }
        );

        if (!updated) {
            return res.status(404).json({ 
                success: false, 
                message: 'Attendance record not found' 
            });
        }

        res.json({ 
            success: true, 
            message: 'Attendance updated successfully',
            record: updated
        });

    } catch (error) {
        console.error('Update attendance error:', error);
        res.status(500).json({ 
            success: false, 
            message: error.message 
        });
    }
};

// Export all functions
module.exports = { 
    getScores, 
    getAttendance, 
    getWeeklyReports, 
    getPerformanceChart,
    getDashboardData,
    deleteAttendance,
    updateAttendance
};