const jwt = require('jsonwebtoken');
const asyncHandler = require('express-async-handler');
const crypto = require('crypto');
const User = require('../models/User');
const sendEmail = require('../utils/sendEmail');

// Generate JWT
const generateToken = (id, role) => {
    return jwt.sign({ id, role }, process.env.JWT_SECRET, {
        expiresIn: '30d',
    });
};

// @desc    Register new user
// @route   POST /api/auth/register
// @access  Public
const registerUser = asyncHandler(async (req, res) => {
    const { name, email, password, phone } = req.body;

    // Check if user exists
    const userExists = await User.findOne({ email });

    if (userExists) {
        res.status(400);
        throw new Error('User already exists');
    }

    // Create verification token
    const verificationToken = crypto.randomBytes(20).toString('hex');

    // Create user (Public registration is always 'customer')
    const user = await User.create({
        name,
        email,
        password,
        phone,
        role: 'customer',
        verificationToken,
        verificationTokenExpire: Date.now() + 24 * 60 * 60 * 1000 // 24 hours
    });

    if (user) {
        // Send Verification Email
        const verifyUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/verify-email/${verificationToken}`;
        
        try {
            await sendEmail({
                to: user.email,
                subject: '🛡️ Verify your ShieldPro Account',
                html: `
                    <div style="font-family:sans-serif;max-width:600px;margin:auto;padding:24px;background:#0a0a0f;color:#fff;border-radius:16px;">
                        <h2 style="color:#f59e0b;">Welcome, ${user.name}! 👋</h2>
                        <p>Thank you for registering. Please click the button below to verify your email address and activate your account.</p>
                        <a href="${verifyUrl}" 
                           style="display:inline-block;margin-top:16px;padding:12px 28px;background:#f59e0b;color:#000;border-radius:8px;font-weight:bold;text-decoration:none;">
                            Verify Email Address
                        </a>
                        <p>This link will expire in 24 hours.</p>
                        <p style="margin-top:24px;font-size:12px;opacity:0.5;">ShieldPro Insurance · Protecting what matters most.</p>
                    </div>
                `
            }, {
                userId: user._id,
                title: 'Verify your email',
                message: 'Please verify your email to access all features.',
                type: 'info'
            });
        } catch (error) {
            console.error('Email sending failed', error);
        }

        res.status(201).json({
            message: 'Registration successful. Please check your email to verify your account.'
        });
    } else {
        res.status(400);
        throw new Error('Invalid user data');
    }
});

// @desc    Authenticate a user
// @route   POST /api/auth/login
// @access  Public
const loginUser = asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    const user = await User.findOne({ email });

    if (!user) {
        res.status(401);
        throw new Error('Invalid email or password');
    }
    
    // Check if account is locked
    if (user.lockUntil && user.lockUntil > Date.now()) {
        res.status(403);
        const minutesLeft = Math.ceil((user.lockUntil - Date.now()) / 60000);
        throw new Error(`Account locked. Try again in ${minutesLeft} minutes.`);
    }

    // Verify password
    if (await user.matchPassword(password)) {
        
        // Reset login attempts on success
        if (user.loginAttempts > 0) {
            user.loginAttempts = 0;
            user.lockUntil = undefined;
            await user.save();
        }

        // Optional: Block login if not verified (Uncomment if mandatory)
        // if (!user.isVerified) {
        //     res.status(403);
        //     throw new Error('Please verify your email address first');
        // }

        res.json({
            _id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            isVerified: user.isVerified,
            token: generateToken(user._id, user.role)
        });
    } else {
        // Increment login attempts
        user.loginAttempts += 1;
        
        // Lock out after 5 attempts
        if (user.loginAttempts >= 5) {
            user.lockUntil = Date.now() + 15 * 60 * 1000; // Lock for 15 mins
        }
        
        await user.save();
        
        res.status(401);
        throw new Error('Invalid email or password');
    }
});

// @desc    Forgot Password
// @route   POST /api/auth/forgot-password
// @access  Public
const forgotPassword = asyncHandler(async (req, res) => {
    const { email } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
        res.status(404);
        throw new Error('User not found');
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(20).toString('hex');
    user.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    user.resetPasswordExpire = Date.now() + 10 * 60 * 1000; // 10 minutes

    await user.save();

    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password/${resetToken}`;

    try {
        await sendEmail({
            to: user.email,
            subject: '🛡️ Password Reset Request',
            html: `
                <div style="font-family:sans-serif;max-width:600px;margin:auto;padding:24px;background:#0a0a0f;color:#fff;border-radius:16px;">
                    <h2 style="color:#f59e0b;">Reset Password 🔑</h2>
                    <p>You requested a password reset. Click the button below to set a new password.</p>
                    <a href="${resetUrl}" 
                       style="display:inline-block;margin-top:16px;padding:12px 28px;background:#f59e0b;color:#000;border-radius:8px;font-weight:bold;text-decoration:none;">
                        Reset Password
                    </a>
                    <p>If you did not request this, please ignore this email.</p>
                </div>
            `
        });
        res.json({ message: 'Password reset link sent to email' });
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
    const { token } = req.params;
    
    const user = await User.findOne({
        verificationToken: token,
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
// @route   POST /api/auth/reset-password/:token
// @access  Public
const resetPassword = asyncHandler(async (req, res) => {
    const hashedToken = crypto.createHash('sha256').update(req.params.token).digest('hex');

    const user = await User.findOne({
        resetPasswordToken: hashedToken,
        resetPasswordExpire: { $gt: Date.now() }
    });

    if (!user) {
        res.status(400);
        throw new Error('Invalid or expired reset token');
    }

    user.password = req.body.password; // pre-save hook will hash it
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;

    // Also reset login attempts in case they were locked out
    user.loginAttempts = 0;
    user.lockUntil = undefined;

    await user.save();

    res.json({ message: 'Password reset successful' });
});

module.exports = {
    registerUser,
    loginUser,
    forgotPassword,
    verifyEmail,
    resetPassword
};
