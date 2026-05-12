const express = require('express');
const router = express.Router();

const {
    register,
    login,
    forgotPassword,
    verifyOTP,
    resetPassword
} = require('../controllers/authController');

router.post('/register', register);
router.post('/login', login);
router.post('/forgot-password', forgotPassword);
router.post('/verify-otp', verifyOTP);
router.post('/reset-password', resetPassword);

router.get('/test', (req, res) => {
    res.json({ success: true, message: 'Auth API working' });
});
// Add this before module.exports
router.post('/check-email', async (req, res) => {
    try {
        const { email } = req.body;
        const user = await User.findOne({ email: email.toLowerCase() });
        res.json({ exists: !!user });
    } catch (error) {
        res.json({ exists: false });
    }
});
module.exports = router;