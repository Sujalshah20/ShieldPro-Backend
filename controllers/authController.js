const jwt = require('jsonwebtoken');
const asyncHandler = require('express-async-handler');
const crypto = require('crypto');
const User = require('../models/User');
const sendEmail = require('../utils/sendEmail');
const { OAuth2Client } = require('google-auth-library');
const axios = require('axios');

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Set Token in HttpOnly Cookie
const sendTokenResponse = (user, statusCode, res, rememberMe = false) => {
    const jwtSecret = process.env.JWT_SECRET;
    
    if (!jwtSecret) {
        if (process.env.NODE_ENV === 'production') {
            throw new Error('FATAL: JWT_SECRET is missing in Production. Add it to Render/Vercel Environment Variables.');
        }
        // Fallback for local development only
        process.env.JWT_SECRET = 'dev_secret_fallback_2026';
    }

    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, {
        expiresIn: rememberMe ? '30d' : '30m',
    });

    const options = {
        expires: new Date(Date.now() + (rememberMe ? 30 * 24 * 60 * 60 * 1000 : 30 * 60 * 1000)),
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict'
    };

    res.status(statusCode)
       .cookie('token', token, options)
       .json({
           _id: user.id,
           name: user.name,
           email: user.email,
           role: user.role,
           profilePic: user.profilePic,
           token: token,
           isVerified: user.isVerified
       });
};

// @desc    Register new user
// @route   POST /api/auth/register
// @access  Public
const registerUser = asyncHandler(async (req, res) => {
    const email = req.body.email.toLowerCase();
    const { name, password, phone } = req.body;

    const userExists = await User.findOne({ email });

    if (userExists) {
        res.status(400);
        throw new Error('User already exists');
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpire = Date.now() + 5 * 60 * 1000; // 5 minutes (as requested)

    const user = await User.create({
        name, email, password, phone,
        role: 'customer',
        verificationToken: otp,
        verificationTokenExpire: otpExpire,
        lastOtpSentAt: Date.now(),
        otpCountSentToday: 1
    });

    if (user) {
        // Send email asynchronously in the background so the user doesn't wait
        sendEmail({
            to: user.email,
            subject: '🛡️ Verify your ShieldPro Account',
            html: getOtpTemplate(user.name, otp, 'Welcome to ShieldPro! Use the code below to verify your account.')
        }).catch(err => console.error(`Background Email Error (${user.email}):`, err.message));

        res.status(201).json({ message: 'Registration successful. OTP sent to email.' });
    } else {
        res.status(400);
        throw new Error('Invalid user data error');
    }
});

// @desc    Authenticate a user
// @route   POST /api/auth/login
// @access  Public
const loginUser = asyncHandler(async (req, res) => {
    const email = req.body.email.toLowerCase();
    const { password, rememberMe, portalRole } = req.body;

    const user = await User.findOne({ email });

    if (!user) {
        res.status(401);
        throw new Error('No account found with this email. Please register first.');
    }
    
    if (user.status === 'suspended') {
        res.status(403);
        throw new Error('Your account has been suspended. Please contact support.');
    }

    if (user.lockUntil && user.lockUntil > Date.now()) {
        res.status(403);
        const minutesLeft = Math.ceil((user.lockUntil - Date.now()) / 60000);
        throw new Error(`Account locked. Try again in ${minutesLeft} minutes.`);
    }

    if (await user.matchPassword(password)) {
        // ── Role enforcement: check AFTER password is correct to avoid leaking user existence ──
        if (portalRole && user.role !== portalRole) {
            const portalLabel = portalRole.charAt(0).toUpperCase() + portalRole.slice(1);
            const userLabel   = user.role.charAt(0).toUpperCase() + user.role.slice(1);
            res.status(403);
            throw new Error(
                `This is the ${portalLabel} portal. Your account has ${userLabel} access. Please use the correct portal.`
            );
        }

        if (user.loginAttempts > 0) {
            user.loginAttempts = 0;
            user.lockUntil = undefined;
            await user.save();
        }
        sendTokenResponse(user, 200, res, rememberMe);
    } else {
        user.loginAttempts += 1;
        
        if (user.loginAttempts >= 5) {
            user.lockUntil = Date.now() + 15 * 60 * 1000; // 15 mins lock
            await user.save();
            
            // Send Security Alert Email
            try {
                await sendEmail({
                    to: user.email,
                    subject: '🚨 Security Alert: Account Locked due to failed login attempts',
                    html: `
                        <div style="font-family:sans-serif;max-width:600px;margin:auto;padding:24px;background:#0a0a0f;color:#fff;border-radius:16px;">
                            <h2 style="color:#ef4444;">Account Locked 🔒</h2>
                            <p>We detected multiple failed login attempts on your ShieldPro account.</p>
                            <p>For your security, your account has been temporarily locked for 15 minutes.</p>
                            <p>If this was not you, please reset your password immediately.</p>
                        </div>
                    `
                });
            } catch (err) { }
            res.status(401);
            throw new Error('Too many failed attempts. Account locked for 15 minutes.');
        } else {
            await user.save();
            res.status(401);
            throw new Error('Incorrect password.');
        }
    }
});


// @desc    Logout User / clear cookie
// @route   POST /api/auth/logout
// @access  Private
const logoutUser = asyncHandler(async (req, res) => {
    res.cookie('token', 'none', {
        expires: new Date(Date.now() + 10 * 1000),
        httpOnly: true,
    });
    res.status(200).json({ success: true, message: 'User logged out' });
});

// @desc    Get Current User Info
// @route   GET /api/auth/me
// @access  Private
const getMe = asyncHandler(async (req, res) => {
    const user = await User.findById(req.user.id).select('-password');
    res.status(200).json(user);
});

// @desc    Verify OTP for Email Verification or Password Reset
// @route   POST /api/auth/verify-otp
// @access  Public
const verifyOTP = asyncHandler(async (req, res) => {
    const email = req.body.email.toLowerCase();
    const { otp, type } = req.body; // type: 'verification' or 'reset'
    
    if (!email || !otp) {
        res.status(400);
        throw new Error('Email and OTP are required');
    }

    const user = await User.findOne({ email });

    if (!user) {
        res.status(404);
        throw new Error('User not found');
    }

    // Check if OTP matches and is not expired
    const isVerificationOTP = type === 'verification' && user.verificationToken === otp && user.verificationTokenExpire > Date.now();
    const isResetOTP = type === 'reset' && user.resetPasswordToken === otp && user.resetPasswordExpire > Date.now();

    if (!isVerificationOTP && !isResetOTP) {
        user.otpRetryAttempts += 1;
        
        if (user.otpRetryAttempts >= 3) {
            // Lock or require resend
            user.verificationToken = undefined;
            user.verificationTokenExpire = undefined;
            user.resetPasswordToken = undefined;
            user.resetPasswordExpire = undefined;
            user.otpRetryAttempts = 0;
            await user.save();
            res.status(400);
            throw new Error('Too many failed attempts. Please request a new OTP.');
        }

        await user.save();
        res.status(400);
        const remaining = 3 - user.otpRetryAttempts;
        throw new Error(`Invalid or expired OTP. ${remaining} attempts remaining.`);
    }

    // Clear attempts and OTP on success
    user.otpRetryAttempts = 0;

    if (type === 'verification') {
        user.isVerified = true;
        user.verificationToken = undefined;
        user.verificationTokenExpire = undefined;
        await user.save();
        res.json({ success: true, message: 'Email verified successfully' });
    } else {
        // For reset, we don't clear the reset token yet, we clear it in resetPassword
        await user.save();
        res.json({ success: true, message: 'OTP verified. You can now reset your password.', otp });
    }
});

// @desc    Handle OAuth Login (Google/Facebook)
// @route   POST /api/auth/oauth
// @access  Public
const oauthLogin = asyncHandler(async (req, res) => {
    const { provider, token } = req.body;
    let email, name, profilePic;

    if (provider === 'Google') {
        try {
            const ticket = await axios.get(`https://www.googleapis.com/oauth2/v3/userinfo?access_token=${token}`);
            const payload = ticket.data;
            email = payload.email;
            name = payload.name;
            profilePic = payload.picture;
        } catch (error) {
            res.status(400);
            throw new Error('Invalid Google Token');
        }
    } else if (provider === 'Facebook') {
        try {
            const { data } = await axios.get(`https://graph.facebook.com/me?fields=name,email,picture&access_token=${token}`);
            email = data.email;
            name = data.name;
            profilePic = data.picture?.data?.url;
        } catch (error) {
            res.status(400);
            throw new Error('Invalid Facebook Token');
        }
    } else {
        res.status(400);
        throw new Error('Unsupported provider');
    }

    if (!email) {
        res.status(400);
        throw new Error('Email not found from OAuth provider');
    }

    let user = await User.findOne({ email });

    // Auto register if user doesn't exist
    if (!user) {
        // give random secure password for oauth users
        const randomPassword = crypto.randomBytes(16).toString('hex') + 'A1@';
        user = await User.create({
            name,
            email,
            password: randomPassword,
            phone: '0000000000', // placeholder
            role: 'customer',
            isVerified: true, // oauth is pre-verified
            profilePic
        });
    }

    sendTokenResponse(user, 200, res, true);
});

// @desc    Forgot Password
// @route   POST /api/auth/forgot-password
// @access  Public
const forgotPassword = asyncHandler(async (req, res) => {
    const email = req.body.email.toLowerCase();
    const user = await User.findOne({ email });

    if (!user) {
        res.status(404);
        throw new Error('No account found with this email');
    }

    // Rate limiting: Max 3 per 10 mins
    const tenMinsAgo = new Date(Date.now() - 10 * 60 * 1000);
    if (user.lastOtpSentAt > tenMinsAgo && user.otpCountSentToday >= 3) {
        res.status(429);
        throw new Error('Too many requests. Please wait 10 minutes before requesting another OTP.');
    }

    // Cooldown check: 60 seconds
    const oneMinAgo = new Date(Date.now() - 60 * 1000);
    if (user.lastOtpSentAt > oneMinAgo) {
        res.status(429);
        throw new Error('Please wait 60 seconds before requesting another OTP.');
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    user.resetPasswordToken = otp;
    user.resetPasswordExpire = Date.now() + 5 * 60 * 1000;
    user.lastOtpSentAt = Date.now();
    user.otpCountSentToday = (user.lastOtpSentAt > tenMinsAgo) ? user.otpCountSentToday + 1 : 1;
    user.otpRetryAttempts = 0;
    await user.save();

    try {
        await sendEmail({
            to: user.email,
            subject: '🛡️ Password Reset OTP',
            html: getOtpTemplate(user.name, otp, 'You requested a password reset. Use the code below to proceed.')
        });
        res.json({ message: 'OTP sent to email' });
    } catch (error) {
        user.resetPasswordToken = undefined;
        user.resetPasswordExpire = undefined;
        await user.save();
        res.status(500);
        throw new Error('Email sending failed. Please check SMTP configuration.');
    }
});

// @desc    Resend OTP (Common for verification and reset)
// @route   POST /api/auth/resend-otp
// @access  Public
const resendOTP = asyncHandler(async (req, res) => {
    const email = req.body.email.toLowerCase();
    const { type } = req.body; // 'verification' or 'reset'
    
    const user = await User.findOne({ email });

    if (!user) {
        res.status(404);
        throw new Error('User not found');
    }

    // Rate limiting: Max 3 per 10 mins
    const tenMinsAgo = new Date(Date.now() - 10 * 60 * 1000);
    if (user.lastOtpSentAt > tenMinsAgo && user.otpCountSentToday >= 3) {
        res.status(429);
        throw new Error('Too many requests. Please wait 10 minutes.');
    }

    // Cooldown check: 60 seconds
    const oneMinAgo = new Date(Date.now() - 60 * 1000);
    if (user.lastOtpSentAt > oneMinAgo) {
        res.status(429);
        throw new Error('Please wait 60 seconds.');
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpire = Date.now() + 5 * 60 * 1000;

    if (type === 'verification') {
        user.verificationToken = otp;
        user.verificationTokenExpire = otpExpire;
    } else {
        user.resetPasswordToken = otp;
        user.resetPasswordExpire = otpExpire;
    }

    user.lastOtpSentAt = Date.now();
    user.otpCountSentToday = (user.lastOtpSentAt > tenMinsAgo) ? user.otpCountSentToday + 1 : 1;
    user.otpRetryAttempts = 0;
    await user.save();

    try {
        await sendEmail({
            to: user.email,
            subject: type === 'verification' ? '🛡️ Verify your Account' : '🛡️ Password Reset OTP',
            html: getOtpTemplate(user.name, otp, type === 'verification' ? 'Here is your new verification code.' : 'Here is your new password reset code.')
        });
        res.json({ success: true, message: 'OTP resent successfully' });
    } catch (error) {
        res.status(500);
        throw new Error(`Email sending failed: ${error.message}`);
    }
});

// Premium HTML Email Template Helper
const getOtpTemplate = (userName, otp, message) => `
<!DOCTYPE html>
<html>
<head>
    <style>
        .container { font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; max-width: 600px; margin: auto; padding: 40px; background: #0a0a0f; color: #ffffff; border-radius: 24px; border: 1px solid #1f2937; }
        .logo { font-size: 28px; font-weight: 800; color: #3b82f6; margin-bottom: 30px; text-align: center; letter-spacing: -1px; }
        h2 { font-size: 24px; font-weight: 700; margin-bottom: 16px; color: #ffffff; }
        p { font-size: 16px; line-height: 1.6; color: #9ca3af; margin-bottom: 24px; }
        .otp-box { background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); padding: 32px; text-align: center; border-radius: 20px; border: 1px solid #334155; margin: 32px 0; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.4); }
        .otp-code { color: #3b82f6; letter-spacing: 12px; font-size: 48px; font-weight: 800; margin: 0; text-shadow: 0 0 20px rgba(59, 130, 246, 0.3); }
        .footer { margin-top: 40px; padding-top: 30px; border-top: 1px solid #1f2937; text-align: center; }
        .footer-text { font-size: 13px; color: #6b7280; margin-bottom: 8px; }
        .brand { color: #3b82f6; font-weight: 600; }
    </style>
</head>
<body>
    <div class="container">
        <div class="logo">SHIELD PRO</div>
        <h2>Hello ${userName || 'User'},</h2>
        <p>${message}</p>
        <div class="otp-box">
            <h1 class="otp-code">${otp}</h1>
        </div>
        <p>This code is valid for <strong>5 minutes</strong>. If you did not request this code, please ignore this email or contact support if you have concerns.</p>
        <div class="footer">
            <p class="footer-text">© 2026 <span class="brand">ShieldPro Insurance</span>. All rights reserved.</p>
            <p class="footer-text">Security Powered by Advanced Encryption Protocols</p>
        </div>
    </div>
</body>
</html>
`;

// @desc    Verify Email
// @route   GET /api/auth/verify/:token
// @access  Public
const verifyEmail = asyncHandler(async (req, res) => {
    const user = await User.findOne({
        verificationToken: req.params.token,
        verificationTokenExpire: { $gt: Date.now() }
    });

    if (!user) {
        res.status(400);
        throw new Error('Invalid or expired verification token');
    }

    user.isVerified = true;
    user.verificationToken = undefined;
    user.verificationTokenExpire = undefined;
    await user.save();

    res.json({ message: 'Email verified successfully' });
});

// @desc    Reset Password
// @route   POST /api/auth/reset-password
// @access  Public
const resetPassword = asyncHandler(async (req, res) => {
    const email = req.body.email.toLowerCase();
    const { otp, password } = req.body;
    
    const user = await User.findOne({
        email,
        resetPasswordToken: otp,
        resetPasswordExpire: { $gt: Date.now() }
    });

    if (!user) {
        res.status(400);
        throw new Error('Invalid or expired OTP');
    }

    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    user.loginAttempts = 0;
    user.lockUntil = undefined;
    await user.save();

    res.json({ message: 'Password reset successful' });
});

module.exports = {
    registerUser,
    loginUser,
    logoutUser,
    getMe,
    verifyOTP,
    oauthLogin,
    forgotPassword,
    verifyEmail,
    resetPassword,
    resendOTP
};
