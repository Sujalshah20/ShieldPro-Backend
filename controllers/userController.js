const asyncHandler = require('express-async-handler');
const User = require('../models/User');

// @desc    Get logged in user profile
// @route   GET /api/users/profile
// @access  Private
const getProfile = asyncHandler(async (req, res) => {
    const user = await User.findById(req.user._id).select('-password');
    if (user) {
        res.json(user);
    } else {
        res.status(404);
        throw new Error('User not found');
    }
});

// @desc    Update logged in user profile
// @route   PUT /api/users/profile
// @access  Private
const updateProfile = asyncHandler(async (req, res) => {
    const user = await User.findById(req.user._id);
    if (!user) {
        res.status(404);
        throw new Error('User not found');
    }

    const { name, phone, email, nationalId, panNumber, address, dob, gender, employment, profilePic } = req.body;

    // 1. Validations
    if (name && !/^[A-Za-z\s]{3,50}$/.test(name)) {
        res.status(400);
        throw new Error('Invalid Name format (3-50 letters only)');
    }

    if (phone && !/^[6-9]\d{9}$/.test(phone)) {
        res.status(400);
        throw new Error('Invalid Mobile number (10 digits starting with 6-9)');
    }

    if (nationalId && !/^\d{12}$/.test(nationalId)) {
        res.status(400);
        throw new Error('Invalid Aadhaar number (exactly 12 digits)');
    }

    if (panNumber && !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(panNumber.toUpperCase())) {
        res.status(400);
        throw new Error('Invalid PAN number format (e.g. ABCDE1234F)');
    }

    if (email) {
        const emailExists = await User.findOne({ email, _id: { $ne: user._id } });
        if (emailExists) {
            res.status(400);
            throw new Error('This email is already registered with another account.');
        }
        user.email = email.toLowerCase();
    }

    if (nationalId) {
        const idExists = await User.findOne({ nationalId, _id: { $ne: user._id } });
        if (idExists) {
            res.status(400);
            throw new Error('This Aadhaar number is already registered.');
        }
        user.nationalId = nationalId;
    }

    if (panNumber) {
        const panFormatted = panNumber.toUpperCase();
        const panExists = await User.findOne({ panNumber: panFormatted, _id: { $ne: user._id } });
        if (panExists) {
            res.status(400);
            throw new Error('This PAN number is already registered.');
        }
        user.panNumber = panFormatted;
    }

    // 2. Update other fields
    user.name = name !== undefined ? name : user.name;
    user.phone = phone !== undefined ? phone : user.phone;
    user.address = address !== undefined ? address : user.address;
    user.dob = dob !== undefined ? dob : user.dob;
    user.gender = gender !== undefined ? gender : user.gender;
    user.employment = employment !== undefined ? employment : user.employment;
    user.profilePic = profilePic !== undefined ? profilePic : user.profilePic;

    const updated = await user.save();
    res.json(updated);
});

module.exports = { getProfile, updateProfile };