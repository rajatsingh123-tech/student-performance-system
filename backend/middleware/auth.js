const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
    let token;
    
    // Check if token exists in headers
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            token = req.headers.authorization.split(' ')[1];
            
            // Verify token
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            
            // Get user from token
            req.user = await User.findById(decoded.id).select('-password');
            
            if (!req.user) {
                return res.status(401).json({ 
                    success: false, 
                    message: 'User not found' 
                });
            }
            
            next();
        } catch (error) {
            console.error('Auth error:', error.message);
            res.status(401).json({ 
                success: false, 
                message: 'Not authorized, token failed' 
            });
        }
    }
    
    if (!token) {
        res.status(401).json({ 
            success: false, 
            message: 'Not authorized, no token' 
        });
    }
};

const authorize = (...roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ 
                success: false, 
                message: 'Not authorized' 
            });
        }
        
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({ 
                success: false, 
                message: `Role ${req.user.role} is not authorized` 
            });
        }
        next();
    };
};


module.exports = { protect, authorize };