const asyncHandler = require('express-async-handler');
const Policy = require('../models/Policy');
const UserPolicy = require('../models/UserPolicy');

// @desc    Create a new policy
// @route   POST /api/policies
// @access  Private
const createPolicy = asyncHandler(async (req, res) => {
    const { policyName, policyType, description, premiumAmount, coverageAmount, durationYears } = req.body;

    const policy = await Policy.create({
        user: req.user._id,
        policyName,
        policyType,
        description,
        premiumAmount,
        coverageAmount,
        durationYears
    });

    res.status(201).json(policy);
});

// @desc    Get all policies with search, filter and pagination
// @route   GET /api/policies
// @access  Private
const getPolicies = asyncHandler(async (req, res) => {
    const pageSize = Number(req.query.limit) || 10;
    const page = Number(req.query.page) || 1;

    const query = {};
    
    // Filter by user role
    if (req.user.role !== 'admin') {
        query.user = req.user._id;
    }

    // Role-specific Search Filter
    if (req.query.search) {
        query.policyName = { $regex: req.query.search, $options: 'i' };
    }

    // Category/Type Filter
    if (req.query.type && req.query.type !== 'All') {
        query.policyType = req.query.type;
    }

    // Status Filter
    if (req.query.status && req.query.status !== 'All Policies') {
        query.status = req.query.status.toLowerCase();
    }

    const count = await Policy.countDocuments(query);
    const policies = await Policy.find(query)
        .populate('user', 'name email')
        .sort({ createdAt: -1 })
        .limit(pageSize)
        .skip(pageSize * (page - 1));

    const enrichedPolicies = await Promise.all(policies.map(async (policy) => {
        const customersCount = await UserPolicy.countDocuments({ policy: policy._id, status: 'Active' });
        return {
            ...policy._doc,
            stats: {
                customers: customersCount
            }
        };
    }));

    res.json({
        policies: enrichedPolicies,
        page,
        pages: Math.ceil(count / pageSize),
        total: count
    });
});

// @desc    Get single policy by ID
// @route   GET /api/policies/:id
// @access  Private
const getPolicyById = asyncHandler(async (req, res) => {
    const policy = await Policy.findById(req.params.id);

    if (!policy) {
        res.status(404);
        throw new Error('Policy not found');
    }

    // Allow if admin or if the user is the owner
    if (req.user.role === 'admin' || policy.user.toString() === req.user._id.toString()) {
        res.json(policy);
    } else {
        res.status(401);
        throw new Error('Not authorized to view this policy');
    }
});

// @desc    Get all policies (for browsing)
// @route   GET /api/policies/available
// @access  Public
const getAvailablePolicies = asyncHandler(async (req, res) => {
    const policies = await Policy.find({ status: 'active' });
    res.json(policies);
});

// @desc    Update a policy
// @route   PUT /api/policies/:id
// @access  Private/Admin
const updatePolicy = asyncHandler(async (req, res) => {
    const { policyName, policyType, description, premiumAmount, coverageAmount, durationYears } = req.body;
    const policy = await Policy.findById(req.params.id);

    if (!policy) {
        res.status(404);
        throw new Error('Policy not found');
    }

    policy.policyName = policyName || policy.policyName;
    policy.policyType = policyType || policy.policyType;
    policy.description = description || policy.description;
    policy.premiumAmount = premiumAmount || policy.premiumAmount;
    policy.coverageAmount = coverageAmount || policy.coverageAmount;
    policy.durationYears = durationYears || policy.durationYears;

    const updatedPolicy = await policy.save();
    res.json(updatedPolicy);
});

// @desc    Update policy status
// @route   PUT /api/policies/:id/status
// @access  Private/Admin
const updatePolicyStatus = asyncHandler(async (req, res) => {
    const { status } = req.body;
    const policy = await Policy.findById(req.params.id);

    if (!policy) {
        res.status(404);
        throw new Error('Policy not found');
    }

    policy.status = status;
    const updatedPolicy = await policy.save();
    res.json(updatedPolicy);
});

// @desc    Delete policy
// @route   DELETE /api/policies/:id
// @access  Private/Admin
const deletePolicy = asyncHandler(async (req, res) => {
    const policy = await Policy.findById(req.params.id);

    if (!policy) {
        res.status(404);
        throw new Error('Policy not found');
    }

    await policy.deleteOne();
    res.json({ message: 'Policy removed' });
});

module.exports = {
    createPolicy,
    getPolicies,
    getPolicyById,
    getAvailablePolicies,
    updatePolicy,
    updatePolicyStatus,
    deletePolicy
};
