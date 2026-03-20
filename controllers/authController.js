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
           token: token,
           isVerified: user.isVerified
       });
};

// @desc    Register new user
// @route   POST /api/auth/register
// @access  Public
const registerUser = asyncHandler(async (req, res) => {
    const { name, email, password, phone } = req.body;

    const userExists = await User.findOne({ email });

    if (userExists) {
        res.status(400);
        throw new Error('User already exists');
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpire = Date.now() + 10 * 60 * 1000; // 10 minutes

    const user = await User.create({
        name, email, password, phone,
        role: 'customer',
        verificationToken: otp,
        verificationTokenExpire: otpExpire
    });

    if (user) {
        try {
            await sendEmail({
                to: user.email,
                subject: '🛡️ Verify your ShieldPro Account',
                html: `
                    <div style="font-family:sans-serif;max-width:600px;margin:auto;padding:24px;background:#0a0a0f;color:#fff;border-radius:16px;">
                        <h2 style="color:#f59e0b;">Welcome, ${user.name}! 👋</h2>
                        <p>Thank you for registering. Your verification code is:</p>
                        <div style="background:#1a1a24;padding:20px;text-align:center;border-radius:12px;margin:20px 0;">
                            <h1 style="color:#f59e0b;letter-spacing:10px;font-size:40px;margin:0;">${otp}</h1>
                        </div>
                        <p>This code will expire in 10 minutes.</p>
                        <p style="margin-top:24px;font-size:12px;opacity:0.5;">ShieldPro Insurance · Protecting what matters most.</p>
                    </div>
                `
            });
        } catch (error) {
            console.error('Email sending failed', error);
        }

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
    const { email, password, rememberMe } = req.body;

    const user = await User.findOne({ email });

    if (!user) {
        res.status(401);
        throw new Error('No account found with this email. Please register first.');
    }
    
    if (user.lockUntil && user.lockUntil > Date.now()) {
        res.status(403);
        const minutesLeft = Math.ceil((user.lockUntil - Date.now()) / 60000);
        throw new Error(`Account locked. Try again in ${minutesLeft} minutes.`);
    }

    if (await user.matchPassword(password)) {
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
    const { email, otp, type } = req.body; // type: 'verification' or 'reset'
    
    if (!email || !otp) {
        res.status(400);
        throw new Error('Email and OTP are required');
    }

    const query = { email };
    if (type === 'verification') {
        query.verificationToken = otp;
        query.verificationTokenExpire = { $gt: Date.now() };
    } else {
        query.resetPasswordToken = otp;
        query.resetPasswordExpire = { $gt: Date.now() };
    }

    const user = await User.findOne(query);

    if (!user) {
        res.status(400);
        throw new Error('Invalid or expired OTP');
    }

    if (type === 'verification') {
        user.isVerified = true;
        user.verificationToken = undefined;
        user.verificationTokenExpire = undefined;
        await user.save();
        res.json({ success: true, message: 'Email verified successfully' });
    } else {
        // For reset, we don't clear the token yet, we clear it in resetPassword
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
    const { email } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
        res.status(404);
        throw new Error('No account found with this email');
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    user.resetPasswordToken = otp;
    user.resetPasswordExpire = Date.now() + 10 * 60 * 1000;
    await user.save();

    try {
        await sendEmail({
            to: user.email,
            subject: '🛡️ Password Reset OTP',
            html: `
                <div style="font-family:sans-serif;max-width:600px;margin:auto;padding:24px;background:#0a0a0f;color:#fff;border-radius:16px;">
                    <h2 style="color:#f59e0b;">Reset Password 🔑</h2>
                    <p>Your password reset code is:</p>
                    <div style="background:#1a1a24;padding:20px;text-align:center;border-radius:12px;margin:20px 0;">
                        <h1 style="color:#f59e0b;letter-spacing:10px;font-size:40px;margin:0;">${otp}</h1>
                    </div>
                    <p>If you did not request this, please ignore this email.</p>
                </div>
            `
        });
        res.json({ message: 'OTP sent to email' });
    } catch (error) {
        user.resetPasswordToken = undefined;
        user.resetPasswordExpire = undefined;
        await user.save();
        res.status(500);
        throw new Error('Email sending failed');
    }
});

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
    const { email, otp, password } = req.body;
    
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
    resetPassword
};
