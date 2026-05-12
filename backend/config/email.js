const nodemailer = require('nodemailer');

// Email transporter configuration
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,  // Your Gmail address
        pass: process.env.EMAIL_PASS   // Your Gmail App Password
    }
});

// Send OTP email function
const sendOTPEmail = async (toEmail, otp, userName) => {
    try {
        const mailOptions = {
            from: `"Student Performance System" <${process.env.EMAIL_USER}>`,
            to: toEmail,
            subject: '🔐 Password Reset OTP - Student Performance System',
            html: `
                <!DOCTYPE html>
                <html>
                <head>
                    <style>
                        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                        .container { max-width: 500px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px; }
                        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px; text-align: center; border-radius: 8px; }
                        .otp-code { font-size: 32px; font-weight: bold; color: #667eea; text-align: center; padding: 20px; letter-spacing: 5px; }
                        .footer { text-align: center; font-size: 12px; color: #666; margin-top: 20px; }
                        .warning { color: #dc3545; font-size: 12px; text-align: center; margin-top: 10px; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="header">
                            <h2>Student Performance System</h2>
                        </div>
                        <h3>Hello ${userName},</h3>
                        <p>We received a request to reset your password. Use the OTP below to proceed:</p>
                        <div class="otp-code">${otp}</div>
                        <p>This OTP is valid for <strong>10 minutes</strong>.</p>
                        <p>If you didn't request this, please ignore this email.</p>
                        <div class="warning">⚠️ Never share this OTP with anyone.</div>
                        <div class="footer">
                            <p>Student Performance System - Secure Portal</p>
                        </div>
                    </div>
                </body>
                </html>
            `
        };
        
        const info = await transporter.sendMail(mailOptions);
        console.log(`✅ OTP email sent to ${toEmail}: ${info.messageId}`);
        return true;
    } catch (error) {
        console.error('❌ Email send error:', error);
        return false;
    }
};

module.exports = { sendOTPEmail };