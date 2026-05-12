// Weekly Report Model
const mongoose = require('mongoose');

const weeklyReportSchema = new mongoose.Schema({
    studentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    weekStartDate: {
        type: Date,
        required: true
    },
    weekEndDate: {
        type: Date,
        required: true
    },
    averageScore: {
        type: Number,
        default: 0
    },
    attendancePercentage: {
        type: Number,
        default: 0
    },
    subjectWiseScores: {
        type: Map,
        of: Number
    },
    performanceSummary: {
        type: String
    },
    recommendations: [String],
    generatedAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('WeeklyReport', weeklyReportSchema);