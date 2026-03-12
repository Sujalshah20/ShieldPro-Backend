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
    if (user) {
        user.name = req.body.name || user.name;
        user.phone = req.body.phone || user.phone;
        user.address = req.body.address || user.address;
        user.dob = req.body.dob || user.dob;
        user.gender = req.body.gender || user.gender;

        const updated = await user.save();
        res.json({
            _id: updated._id,
            name: updated.name,
            email: updated.email,
            phone: updated.phone,
            address: updated.address,
            dob: updated.dob,
            gender: updated.gender,
            role: updated.role
        });
    } else {
        res.status(404);
        throw new Error('User not found');
    }
});

module.exports = { getProfile, updateProfile };