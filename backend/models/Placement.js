const mongoose = require('mongoose');

const PlacementSchema = new mongoose.Schema({
    studentName: { type: String, required: true },
    company: { type: String, required: true },
    package: { type: String, required: true },
    batch: { type: String, required: true },
    role: { type: String, required: true },
    date: { type: Date, default: Date.now },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
});

module.exports = mongoose.model('Placement', PlacementSchema);