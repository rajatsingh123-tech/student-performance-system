const User = require('../models/User');
const jwt = require('jsonwebtoken');
const { sendOTPEmail } = require('../config/email');

const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: '30d'
    });
};

// Register User
const register = async (req, res) => {
    console.log('\n📝 Registration Request');
    console.log('Email:', req.body.email);
    console.log('Role:', req.body.role);
    
    try {
        const { 
            name, email, password, role, mobile,
            studentId, className, section, rollNumber,
            assignedClass, assignedSection, subjects, teacherBranch,
            teachingSections
        } = req.body;
        
        // Basic validation
        if (!name || !email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Name, email and password are required'
            });
        }
        
        if (password.length < 6) {
            return res.status(400).json({
                success: false,
                message: 'Password must be at least 6 characters'
            });
        }
        
        // Check if email exists
        const existingUser = await User.findOne({ email: email.toLowerCase() });
        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: 'Email already exists. Please use a different email.'
            });
        }
        
        // ============ STUDENT REGISTRATION ============
        if (role === 'student') {
            if (!studentId || !className || !section || !rollNumber) {
                return res.status(400).json({
                    success: false,
                    message: 'Student ID, Class, Section and Roll Number are required'
                });
            }
            
            // ✅ UPDATED: Validate section (A to K)
            const validSections = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K'];
            if (!validSections.includes(section.toUpperCase())) {
                return res.status(400).json({
                    success: false,
                    message: 'Section must be from A to K'
                });
            }
            
            const existingStudent = await User.findOne({ studentId: studentId });
            if (existingStudent) {
                return res.status(400).json({
                    success: false,
                    message: 'Student ID already exists. Please use a different Student ID.'
                });
            }
            
            const user = await User.create({
                name: name.trim(),
                email: email.toLowerCase().trim(),
                password: password,
                role: 'student',
                mobile: mobile || null,
                studentId: studentId,
                className: className,
                section: section.toUpperCase(),
                rollNumber: rollNumber
            });
            
            console.log(`✅ Student created: ${user.email}`);
            
            return res.status(201).json({
                success: true,
                message: 'Student registered successfully!',
                user: {
                    _id: user._id,
                    name: user.name,
                    email: user.email,
                    role: user.role
                }
            });
        }
        
        // ============ TEACHER REGISTRATION - UPDATED WITH MULTIPLE SECTIONS ============
        else if (role === 'teacher') {
            // Check if using new teachingSections format
            if (teachingSections && teachingSections.length > 0) {
                // NEW FORMAT: Multiple sections support
                if (!subjects || subjects.length === 0) {
                    return res.status(400).json({ 
                        success: false, 
                        message: 'Please select at least one subject' 
                    });
                }
                
                // ✅ UPDATED: Validate all sections (A to K)
                const validSections = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K'];
                for (const sec of teachingSections) {
                    if (!sec.className || !sec.section) {
                        return res.status(400).json({ 
                            success: false, 
                            message: 'Each teaching section must have class name and section' 
                        });
                    }
                    if (!validSections.includes(sec.section.toUpperCase())) {
                        return res.status(400).json({ 
                            success: false, 
                            message: `Section ${sec.section} is invalid. Section must be from A to K` 
                        });
                    }
                }
                
                // Process class name with branch if BTech
                let finalClassName = teachingSections[0].className;
                if (finalClassName.includes('BTech') && teacherBranch) {
                    finalClassName = `${finalClassName} (${teacherBranch})`;
                }
                
                const user = await User.create({
                    name: name.trim(),
                    email: email.toLowerCase().trim(),
                    password: password,
                    role: 'teacher',
                    mobile: mobile || null,
                    subjects: subjects,
                    teachingSections: teachingSections,
                    assignedClass: finalClassName,
                    assignedSection: teachingSections[0].section.toUpperCase(),
                    isClassTeacher: teachingSections[0].isClassTeacher || false,
                    teacherBranch: teacherBranch || null
                });
                
                console.log(`✅ Teacher created (Multiple Sections): ${user.email}`);
                console.log(`   Teaching Sections:`, teachingSections);
                
                return res.status(201).json({
                    success: true,
                    message: 'Teacher registered successfully!',
                    user: {
                        _id: user._id,
                        name: user.name,
                        email: user.email,
                        role: user.role,
                        teachingSections: teachingSections,
                        subjects: subjects
                    }
                });
            }
            
            // OLD FORMAT: Single section (backward compatibility)
            else if (assignedClass && assignedSection) {
                // ✅ UPDATED: Validate section (A to K)
                const validSections = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K'];
                if (!validSections.includes(assignedSection.toUpperCase())) {
                    return res.status(400).json({
                        success: false,
                        message: 'Section must be from A to K'
                    });
                }
                
                // Process class name with branch if BTech
                let finalClassName = assignedClass;
                if (assignedClass.includes('BTech') && teacherBranch) {
                    finalClassName = `${assignedClass} (${teacherBranch})`;
                }
                
                // Default subjects if not provided
                let teacherSubjects = subjects;
                if (!teacherSubjects || teacherSubjects.length === 0) {
                    if (assignedClass === 'BCA' || assignedClass === 'MCA') {
                        teacherSubjects = ['Programming', 'DBMS', 'Computer Networks', 'Web Development', 'Software Engineering'];
                    } else if (assignedClass === 'B.Tech') {
                        teacherSubjects = ['Mathematics', 'Physics', 'Engineering Drawing', 'Programming', 'Electronics'];
                    } else if (assignedClass === 'BBA' || assignedClass === 'MBA') {
                        teacherSubjects = ['Management', 'Marketing', 'Finance', 'HR', 'Business Law'];
                    } else {
                        teacherSubjects = ['Mathematics', 'English', 'Science', 'Social Studies'];
                    }
                }
                
                // Create teachingSections array from old format
                const teachingSectionsArray = [{
                    className: finalClassName,
                    section: assignedSection.toUpperCase(),
                    isClassTeacher: true
                }];
                
                const user = await User.create({
                    name: name.trim(),
                    email: email.toLowerCase().trim(),
                    password: password,
                    role: 'teacher',
                    mobile: mobile || null,
                    assignedClass: finalClassName,
                    assignedSection: assignedSection.toUpperCase(),
                    subjects: teacherSubjects,
                    teachingSections: teachingSectionsArray,
                    originalClass: assignedClass,
                    teacherBranch: teacherBranch || null
                });
                
                console.log(`✅ Teacher created (Single Section): ${user.email}`);
                console.log(`   Class: ${finalClassName}`);
                console.log(`   Section: ${assignedSection.toUpperCase()}`);
                
                return res.status(201).json({
                    success: true,
                    message: 'Teacher registered successfully!',
                    user: {
                        _id: user._id,
                        name: user.name,
                        email: user.email,
                        role: user.role,
                        assignedClass: finalClassName,
                        assignedSection: assignedSection.toUpperCase()
                    }
                });
            }
            
            else {
                return res.status(400).json({
                    success: false,
                    message: 'Please provide teaching sections or assigned class/section'
                });
            }
        }
        
        // ============ ADMIN REGISTRATION ============
        else if (role === 'admin') {
            const user = await User.create({
                name: name.trim(),
                email: email.toLowerCase().trim(),
                password: password,
                role: 'admin',
                mobile: mobile || null
            });
            
            console.log(`✅ Admin created: ${user.email}`);
            
            return res.status(201).json({
                success: true,
                message: 'Admin registered successfully!',
                user: {
                    _id: user._id,
                    name: user.name,
                    email: user.email,
                    role: user.role
                }
            });
        }
        
        else {
            return res.status(400).json({
                success: false,
                message: 'Invalid role. Choose student, teacher, or admin'
            });
        }
        
    } catch (error) {
        console.error('❌ Registration error:', error);
        
        if (error.code === 11000) {
            return res.status(400).json({
                success: false,
                message: 'Email already exists. Please use a different email.'
            });
        }
        
        res.status(500).json({
            success: false,
            message: 'Server error: ' + error.message
        });
    }
};

// Login User
const login = async (req, res) => {
    console.log('\n📝 Login attempt:', req.body.email);
    
    try {
        const { email, password } = req.body;
        
        if (!email || !password) {
            return res.status(400).json({ 
                success: false,
                message: 'Email and password are required' 
            });
        }
        
        const user = await User.findOne({ email: email.toLowerCase() });
        
        if (!user) {
            return res.status(401).json({ 
                success: false,
                message: 'Invalid email or password' 
            });
        }
        
        console.log('User found:', user.email);
        
        try {
            const isMatch = await user.comparePassword(password);
            console.log('Password match result:', isMatch);
            
            if (!isMatch) {
                return res.status(401).json({ 
                    success: false,
                    message: 'Invalid email or password' 
                });
            }
        } catch (compareError) {
            console.error('Compare password error:', compareError);
            return res.status(500).json({ 
                success: false,
                message: 'Error comparing passwords: ' + compareError.message
            });
        }
        
        console.log(`✅ Login successful: ${email}`);
        
        // Prepare response data
        const responseData = {
            success: true,
            _id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            token: generateToken(user._id)
        };
        
        // Add teacher specific data if role is teacher
        if (user.role === 'teacher') {
            responseData.subjects = user.subjects;
            responseData.teachingSections = user.teachingSections;
            responseData.assignedClass = user.assignedClass;
            responseData.assignedSection = user.assignedSection;
        }
        
        // Add student specific data
        if (user.role === 'student') {
            responseData.className = user.className;
            responseData.section = user.section;
            responseData.rollNumber = user.rollNumber;
            responseData.studentId = user.studentId;
        }
        
        res.json(responseData);
        
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ 
            success: false,
            message: 'Server error: ' + error.message
        });
    }
};

// ============ FORGOT PASSWORD - SEND OTP TO EMAIL ============
const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        
        if (!email) {
            return res.status(400).json({
                success: false,
                message: 'Email is required'
            });
        }
        
        const user = await User.findOne({ email: email.toLowerCase() });
        
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'No account found with this email'
            });
        }
        
        // Generate 6-digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const otpExpires = new Date(Date.now() + 10 * 60 * 1000);
        
        user.resetOTP = otp;
        user.otpExpires = otpExpires;
        await user.save();
        
        // Send OTP via email
        const emailSent = await sendOTPEmail(user.email, otp, user.name);
        
        if (emailSent) {
            console.log(`🔐 OTP sent to ${user.email}: ${otp}`);
            res.json({
                success: true,
                message: `OTP sent to your registered email: ${user.email}`,
                email: user.email
            });
        } else {
            res.status(500).json({
                success: false,
                message: 'Failed to send OTP. Please try again later.'
            });
        }
        
    } catch (error) {
        console.error('Forgot password error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
};

// ============ VERIFY OTP ============
const verifyOTP = async (req, res) => {
    try {
        const { email, otp } = req.body;
        
        if (!email || !otp) {
            return res.status(400).json({
                success: false,
                message: 'Email and OTP are required'
            });
        }
        
        const user = await User.findOne({ email: email.toLowerCase() });
        
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }
        
        if (!user.resetOTP || user.resetOTP !== otp) {
            return res.status(400).json({
                success: false,
                message: 'Invalid OTP'
            });
        }
        
        if (user.otpExpires < new Date()) {
            return res.status(400).json({
                success: false,
                message: 'OTP expired. Please request a new one.'
            });
        }
        
        res.json({
            success: true,
            message: 'OTP verified successfully',
            email: user.email
        });
        
    } catch (error) {
        console.error('Verify OTP error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
};

// ============ RESET PASSWORD ============
const resetPassword = async (req, res) => {
    try {
        const { email, otp, newPassword } = req.body;
        
        if (!email || !otp || !newPassword) {
            return res.status(400).json({
                success: false,
                message: 'Email, OTP and new password are required'
            });
        }
        
        if (newPassword.length < 6) {
            return res.status(400).json({
                success: false,
                message: 'Password must be at least 6 characters'
            });
        }
        
        const user = await User.findOne({ email: email.toLowerCase() });
        
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }
        
        if (!user.resetOTP || user.resetOTP !== otp) {
            return res.status(400).json({
                success: false,
                message: 'Invalid OTP'
            });
        }
        
        if (user.otpExpires < new Date()) {
            return res.status(400).json({
                success: false,
                message: 'OTP expired. Please request a new one.'
            });
        }
        
        // Reset password
        user.password = newPassword;
        user.resetOTP = null;
        user.otpExpires = null;
        await user.save();
        
        console.log(`✅ Password reset for ${user.email}`);
        
        res.json({
            success: true,
            message: 'Password reset successfully! Please login with your new password.'
        });
        
    } catch (error) {
        console.error('Reset password error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
};

module.exports = { 
    register, 
    login, 
    forgotPassword, 
    verifyOTP, 
    resetPassword 
};