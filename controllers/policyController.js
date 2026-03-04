const asyncHandler = require('express-async-handler');
const Policy = require('../models/Policy');

// @desc    Create a new policy
// @route   POST /api/policies
// @access  Private
const createPolicy = asyncHandler(async (req, res) => {
    const { policyName, policyType, premiumAmount, coverageAmount, durationYears } = req.body;

    const policy = await Policy.create({
        user: req.user._id,
        policyName,
        policyType,
        premiumAmount,
        coverageAmount,
        durationYears
    });

    res.status(201).json(policy);
});

// @desc    Get all policies for logged in user
// @route   GET /api/policies
// @access  Private
const getPolicies = asyncHandler(async (req, res) => {
    const policies = await Policy.find({ user: req.user._id });
    res.json(policies);
});

// @desc    Get single policy by ID
// @route   GET /api/policies/:id
// @access  Private
const getPolicyById = asyncHandler(async (req, res) => {
    const policy = await Policy.findById(req.params.id);

    if (policy && policy.user.toString() === req.user._id.toString()) {
        res.json(policy);
    } else {
        res.status(404);
        throw new Error('Policy not found');
    }
});

// @desc    Get all policies (for browsing)
// @route   GET /api/policies/available
// @access  Public
const getAvailablePolicies = asyncHandler(async (req, res) => {
    const policies = await Policy.find({ status: 'active' });
    res.json(policies);
});

module.exports = {
    createPolicy,
    getPolicies,
    getPolicyById,
    getAvailablePolicies
};
