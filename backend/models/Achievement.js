const mongoose = require('mongoose');

const AchievementSchema = new mongoose.Schema({
    title: { type: String, required: true },
    description: { type: String, required: true },
    studentName: { type: String, required: true },
    category: { type: String, enum: ['Academic', 'Sports', 'Cultural', 'Technical'], default: 'Academic' },
    date: { type: Date, default: Date.now },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Achievement', AchievementSchema);