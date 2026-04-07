const asyncHandler = require('express-async-handler');
const UserPolicy = require('../models/UserPolicy');
const Policy = require('../models/Policy');

// @desc    Buy a policy
// @route   POST /api/user-policies
// @access  Private
const buyPolicy = asyncHandler(async (req, res) => {
    const { policyId, durationYears } = req.body;
    const duration = parseInt(durationYears) || 1; // Default to 1 year

    const policy = await Policy.findById(policyId);
    if (!policy) {
        res.status(404);
        throw new Error('Policy not found');
    }

    const user = await User.findById(req.user._id);

    const startDate = new Date();
    const endDate = new Date();
    endDate.setFullYear(startDate.getFullYear() + duration);

    const policyNumber = `POL-${Math.floor(100000 + Math.random() * 900000)}`;

    const userPolicy = await UserPolicy.create({
        user: req.user._id,
        policy: policyId,
        policyNumber,
        startDate,
        endDate,
        agent: user?.assignedAgent || undefined,
        status: 'Active'
    });

    res.status(201).json(userPolicy);
});

// @desc    Get all policies for logged in user
// @route   GET /api/user-policies
// @access  Private
const getMyPolicies = asyncHandler(async (req, res) => {
    console.log(`📥 Fetching policies for User: ${req.user?._id}`);
    const userPolicies = await UserPolicy.find({ user: req.user._id }).populate('policy');
    console.log(`📦 Found ${userPolicies.length} policies for user`);
    res.json(userPolicies);
});

module.exports = {
    buyPolicy,
    getMyPolicies
};
