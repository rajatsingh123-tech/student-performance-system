const mongoose = require('mongoose');

const timetableSchema = new mongoose.Schema({
    className: {
        type: String,
        required: true
    },
    day: {
        type: String,
        enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
        required: true
    },
    periods: [{
        periodNumber: Number,
        subject: String,
        teacher: String,
        startTime: String,
        endTime: String,
        room: String
    }],
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Timetable', timetableSchema);