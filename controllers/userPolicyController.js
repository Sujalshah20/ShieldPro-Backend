const asyncHandler = require('express-async-handler');
const UserPolicy = require('../models/UserPolicy');
const Policy = require('../models/Policy');

// @desc    Buy a policy
// @route   POST /api/user-policies
// @access  Private
const buyPolicy = asyncHandler(async (req, res) => {
    const { policyId, durationYears } = req.body;

    const policy = await Policy.findById(policyId);
    if (!policy) {
        res.status(404);
        throw new Error('Policy not found');
    }

    const startDate = new Date();
    const endDate = new Date();
    endDate.setFullYear(startDate.getFullYear() + parseInt(durationYears));

    const policyNumber = `POL-${Math.floor(100000 + Math.random() * 900000)}`;

    const userPolicy = await UserPolicy.create({
        user: req.user._id,
        policy: policyId,
        policyNumber,
        startDate,
        endDate,
        status: 'Active'
    });

    res.status(201).json(userPolicy);
});

// @desc    Get all policies for logged in user
// @route   GET /api/user-policies
// @access  Private
const getMyPolicies = asyncHandler(async (req, res) => {
    const userPolicies = await UserPolicy.find({ user: req.user._id }).populate('policy');
    res.json(userPolicies);
});

module.exports = {
    buyPolicy,
    getMyPolicies
};
