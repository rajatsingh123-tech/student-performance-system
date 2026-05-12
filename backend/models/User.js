const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['student', 'teacher', 'admin'], default: 'student' },
    mobile: { type: String },
    
    // Student specific fields
    rollNumber: { type: String },
    studentId: { type: String },
    className: { type: String },
    section: { type: String },
    classTeacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    
    // Teacher specific fields - MULTIPLE SECTIONS SUPPORT
    teachingSections: [{
        className: { type: String, required: true },
        section: { type: String, required: true },
        isClassTeacher: { type: Boolean, default: false }
    }],
    
    // Subjects teacher teaches
    subjects: [{ type: String }],
    
    // Legacy fields (for backward compatibility)
    assignedClass: { type: String },
    assignedSection: { type: String },
    originalClass: { type: String },
    teacherBranch: { type: String },
    isClassTeacher: { type: Boolean, default: false },
    
    // Teacher schedule
  // Teacher schedule - FIXED STRUCTURE
// Teacher schedule - FIXED STRUCTURE
teacherSchedule: [{
    day: { type: String },
    class: { type: String },
    section: { type: String },
    subject: { type: String },
    startTime: { type: String },
    endTime: { type: String },
    room: { type: String }
}],
    // Reset password fields
    resetOTP: { type: String },
    otpExpires: { type: Date },
    
    createdAt: { type: Date, default: Date.now }
});

// Hash password before saving
userSchema.pre('save', async function(next) {
    if (!this.isModified('password')) return next();
    try {
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (error) {
        next(error);
    }
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
    if (!candidatePassword || !this.password) {
        return false;
    }
    return await bcrypt.compare(candidatePassword, this.password);
};

// ============ TEACHER METHODS ============

// Get all sections a teacher teaches (with backward compatibility)
userSchema.methods.getTeachingSections = function() {
    if (this.teachingSections && this.teachingSections.length > 0) {
        return this.teachingSections;
    }
    // Fallback for old data structure
    if (this.assignedClass && this.assignedSection) {
        return [{
            className: this.assignedClass,
            section: this.assignedSection,
            isClassTeacher: this.isClassTeacher || false
        }];
    }
    return [];
};

// Check if teacher teaches a specific section
userSchema.methods.teachesSection = function(className, section) {
    const sections = this.getTeachingSections();
    return sections.some(s => s.className === className && s.section === section);
};

// Check if teacher is class teacher of a specific section
userSchema.methods.isClassTeacherOfSection = function(className, section) {
    const sections = this.getTeachingSections();
    const sectionData = sections.find(s => s.className === className && s.section === section);
    return sectionData ? sectionData.isClassTeacher : false;
};

// Check if teacher teaches a subject
userSchema.methods.teachesSubject = function(subject) {
    return this.subjects && this.subjects.includes(subject);
};

// Get teacher's role type for a specific section
userSchema.methods.getTeacherTypeForSection = function(className, section) {
    if (this.isClassTeacherOfSection(className, section)) {
        return 'Class Teacher';
    }
    return 'Subject Teacher';
};

// Get teacher's overall role type
userSchema.methods.getOverallTeacherType = function() {
    const sections = this.getTeachingSections();
    if (sections.some(s => s.isClassTeacher)) {
        return 'Class Teacher';
    }
    return 'Subject Teacher';
};

// Add a teaching section
userSchema.methods.addTeachingSection = function(className, section, isClassTeacher = false) {
    if (!this.teachingSections) this.teachingSections = [];
    const exists = this.teachingSections.some(s => s.className === className && s.section === section);
    if (!exists) {
        this.teachingSections.push({ className, section, isClassTeacher });
    }
    return this;
};

// Remove a teaching section
userSchema.methods.removeTeachingSection = function(className, section) {
    if (this.teachingSections) {
        this.teachingSections = this.teachingSections.filter(
            s => !(s.className === className && s.section === section)
        );
    }
    return this;
};

// ============ STUDENT METHODS ============

// Check if student is taught by a teacher
userSchema.methods.isTaughtByTeacher = function(teacher) {
    return teacher.teachesSection(this.className, this.section);
};

// Get class teacher for this student
userSchema.methods.getClassTeacher = async function() {
    if (this.classTeacherId) {
        return await mongoose.model('User').findById(this.classTeacherId);
    }
    return null;
};

// ============ COMMON METHODS ============

// To JSON transform (remove sensitive data)
userSchema.methods.toJSON = function() {
    const obj = this.toObject();
    delete obj.password;
    delete obj.resetOTP;
    delete obj.otpExpires;
    return obj;
};

// Legacy method compatibility
userSchema.methods.isClassTeacherOf = function(className, section) {
    return this.isClassTeacherOfSection(className, section);
};

userSchema.methods.getTeacherType = function() {
    return this.getOverallTeacherType();
};

module.exports = mongoose.model('User', userSchema);