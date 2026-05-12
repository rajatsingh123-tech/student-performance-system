const mongoose = require('mongoose');

const scoreSchema = new mongoose.Schema({
    studentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    subject: {
        type: String,
        required: true
        // Removed enum to allow any subject (flexibility)
    },
    obtainedMarks: {
        type: Number,
        required: true,
        min: 0
    },
    maxMarks: {
        type: Number,
        required: true,
        default: 100,
        min: 1
    },
    percentage: {
        type: Number,
        default: 0
    },
    grade: {
        type: String,
        default: ''
    },
    examType: {
        type: String,
        enum: ['Weekly Test', 'Mid Term', 'Final Exam', 'Assignment', 'Quiz', 'Practical', 'Lab Work', 'Project', 'Viva'],
        default: 'Weekly Test'
    },
    date: {
        type: Date,
        default: Date.now
    },
    remarks: {
        type: String,
        default: ''
    },
    markedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Calculate percentage and grade before saving
scoreSchema.pre('save', function(next) {
    if (this.obtainedMarks && this.maxMarks) {
        this.percentage = parseFloat(((this.obtainedMarks / this.maxMarks) * 100).toFixed(2));
        
        // Calculate grade
        if (this.percentage >= 90) this.grade = 'A+';
        else if (this.percentage >= 80) this.grade = 'A';
        else if (this.percentage >= 70) this.grade = 'B+';
        else if (this.percentage >= 60) this.grade = 'B';
        else if (this.percentage >= 50) this.grade = 'C';
        else if (this.percentage >= 40) this.grade = 'D';
        else this.grade = 'F';
    }
    next();
});

// Also update on findOneAndUpdate
scoreSchema.pre('findOneAndUpdate', async function(next) {
    const update = this.getUpdate();
    if (update.obtainedMarks && update.maxMarks) {
        const percentage = (update.obtainedMarks / update.maxMarks) * 100;
        update.percentage = parseFloat(percentage.toFixed(2));
        
        if (percentage >= 90) update.grade = 'A+';
        else if (percentage >= 80) update.grade = 'A';
        else if (percentage >= 70) update.grade = 'B+';
        else if (percentage >= 60) update.grade = 'B';
        else if (percentage >= 50) update.grade = 'C';
        else if (percentage >= 40) update.grade = 'D';
        else update.grade = 'F';
        
        this.setUpdate(update);
    }
    next();
});

module.exports = mongoose.model('Score', scoreSchema);