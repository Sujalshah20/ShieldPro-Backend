const jwt = require('jsonwebtoken');
const asyncHandler = require('express-async-handler');
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
    const { name, email, password, phone, dob, gender, address } = req.body;

    if (!name || !email || !password || !phone || !dob || !gender || !address) {
        res.status(400);
        throw new Error('Please add all fields');
    }

    // Check if user exists
    const userExists = await User.findOne({ email });

    if (userExists) {
        res.status(400);
        throw new Error('User already exists');
    }

    // Create user (Public registration is always 'customer')
    const user = await User.create({
        name,
        email,
        password,
        phone,
        dob,
        gender,
        address,
        role: 'customer' // Secure: No one can register as admin or agent publicly
    });

    if (user) {
        // Send Welcome Email (non-blocking)
        sendEmail({
            to: user.email,
            subject: '🛡️ Welcome to ShieldPro Insurance!',
            html: `
                <div style="font-family:sans-serif;max-width:600px;margin:auto;padding:24px;background:#0a0a0f;color:#fff;border-radius:16px;">
                    <h2 style="color:#f59e0b;">Welcome, ${user.name}! 👋</h2>
                    <p>We're thrilled to have you as part of the ShieldPro family. Your account has been created successfully.</p>
                    <p>You can now explore insurance plans tailored for you, apply for coverage, and manage everything from your personal dashboard.</p>
                    <a href="${process.env.FRONTEND_URL || 'https://shield-pro-frontend.vercel.app'}/login" 
                       style="display:inline-block;margin-top:16px;padding:12px 28px;background:#f59e0b;color:#000;border-radius:8px;font-weight:bold;text-decoration:none;">
                        Access My Dashboard →
                    </a>
                    <p style="margin-top:24px;font-size:12px;opacity:0.5;">ShieldPro Insurance · Protecting what matters most.</p>
                </div>
            `
        }, {
            userId: user._id,
            title: 'Welcome to ShieldPro!',
            message: `Hi ${user.name}, your account has been created successfully. Explore your dashboard to get started.`,
            type: 'success'
        });

        res.status(201).json({
            _id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            token: generateToken(user._id, user.role)
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

    // Check for user email
    const user = await User.findOne({ email });

    if (!user) {
        res.status(404);
        throw new Error('User not found');
    }

    if (user && (await user.matchPassword(password))) {
        res.json({
            _id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            token: generateToken(user._id, user.role)
        });
    } else {
        res.status(401);
        throw new Error('Invalid credentials');
    }
});

// @desc    Forgot Password placeholder
// @route   POST /api/auth/forgot-password
// @access  Public
const forgotPassword = asyncHandler(async (req, res) => {
    const { email } = req.body;
    // Logically: Find user, generate reset token, send email
    res.json({ message: `Password reset link sent to ${email}` });
});

// @desc    Verify Email placeholder
// @route   GET /api/auth/verify/:token
// @access  Public
const verifyEmail = asyncHandler(async (req, res) => {
    // Logically: Find user by token, set isVerified to true
    res.json({ message: 'Email verified successfully' });
});

module.exports = {
    registerUser,
    loginUser,
    forgotPassword,
    verifyEmail
};
