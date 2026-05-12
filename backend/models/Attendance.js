// Attendance Model
const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
    studentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    date: {
        type: Date,
        required: true,
        default: Date.now
    },
    status: {
        type: String,
        enum: ['present', 'absent', 'late'],
        required: true
    },
    subject: {
        type: String,
        required: true
    },
    markedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
});

// Compound index to ensure unique attendance per student per subject per day
attendanceSchema.index({ studentId: 1, date: 1, subject: 1 }, { unique: true });

module.exports = mongoose.model('Attendance', attendanceSchema);