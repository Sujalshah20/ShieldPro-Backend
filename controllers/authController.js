const jwt = require('jsonwebtoken');
const asyncHandler = require('express-async-handler');
const User = require('../models/User');

// Generate JWT
const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
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
        res.status(201).json({
            _id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            token: generateToken(user._id)
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

    if (user && (await user.matchPassword(password))) {
        res.json({
            _id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            token: generateToken(user._id)
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
