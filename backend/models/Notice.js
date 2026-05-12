const mongoose = require('mongoose');

const NoticeSchema = new mongoose.Schema({
    title: { type: String, required: true },
    content: { type: String, required: true },
    priority: { type: String, enum: ['High', 'Medium', 'Low'], default: 'Medium' },
    targetAudience: { type: String, enum: ['All', 'Students', 'Teachers'], default: 'All' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Notice', NoticeSchema);