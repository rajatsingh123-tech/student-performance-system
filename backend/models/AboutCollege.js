const mongoose = require('mongoose');

const AboutCollegeSchema = new mongoose.Schema({
    collegeName: { type: String, default: "BCA College" },
    history: { type: String, default: "" },
    vision: { type: String, default: "" },
    mission: { type: String, default: "" },
    contactEmail: { type: String, default: "" },
    contactPhone: { type: String, default: "" },
    address: { type: String, default: "" },
    principalName: { type: String, default: "" },
    establishedYear: { type: Number, default: 2000 }
});

module.exports = mongoose.model('AboutCollege', AboutCollegeSchema);