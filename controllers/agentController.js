const asyncHandler = require('express-async-handler');
const User = require('../models/User');
const PolicyApplication = require('../models/PolicyApplication');
const Policy = require('../models/Policy');
const UserPolicy = require('../models/UserPolicy');
const Commission = require('../models/Commission');

// @desc    Get all customers assigned to an agent
// @route   GET /api/agent/customers
// @access  Private/Agent
const getAssignedCustomers = asyncHandler(async (req, res) => {
    const customers = await User.find({ assignedAgent: req.user._id, role: 'customer' });
    
    // Supplement with application and policy counts
    const enrichedCustomers = await Promise.all(customers.map(async (customer) => {
        const applicationCount = await PolicyApplication.countDocuments({ user: customer._id });
        const activePolicyCount = await UserPolicy.countDocuments({ user: customer._id, status: 'Active' });
        
        return {
            ...customer._doc,
            applicationCount,
            activePolicyCount
        };
    }));

    res.json(enrichedCustomers);
});

// @desc    Apply for a policy on behalf of a customer
// @route   POST /api/agent/apply-on-behalf
// @access  Private/Agent
const applyOnBehalf = asyncHandler(async (req, res) => {
    const { customerId, policyId, formData } = req.body;

    const customer = await User.findById(customerId);
    if (!customer || customer.assignedAgent.toString() !== req.user._id.toString()) {
        res.status(403);
        throw new Error('Not authorized to apply for this customer');
    }

    const application = await PolicyApplication.create({
        user: customerId,
        policy: policyId,
        agent: req.user._id,
        formData,
        status: 'Pending'
    });

    res.status(201).json(application);
});

// @desc    Get all applications managed by the agent
// @route   GET /api/agent/applications
// @access  Private/Agent
const getAgentApplications = asyncHandler(async (req, res) => {
    // Applications where agent is directly involved OR for assigned customers
    const applications = await PolicyApplication.find({
        $or: [
            { agent: req.user._id },
            { user: { $in: await User.find({ assignedAgent: req.user._id }).distinct('_id') } }
        ]
    }).populate('user', 'name email').populate('policy', 'policyName policyType');

    res.json(applications);
});

// @desc    Add internal remarks to an application
// @route   PUT /api/agent/applications/:id/remarks
// @access  Private/Agent
const updateApplicationRemarks = asyncHandler(async (req, res) => {
    const { remarks } = req.body;
    const application = await PolicyApplication.findById(req.params.id);

    if (!application) {
        res.status(404);
        throw new Error('Application not found');
    }

    // Verify ownership
    const customer = await User.findById(application.user);
    if (application.agent?.toString() !== req.user._id.toString() && customer.assignedAgent?.toString() !== req.user._id.toString()) {
        res.status(403);
        throw new Error('Not authorized');
    }

    application.internalRemarks = remarks;
    await application.save();

    res.json(application);
});

// @desc    Get commission history
// @route   GET /api/agent/commissions
// @access  Private/Agent
const getAgentCommissions = asyncHandler(async (req, res) => {
    const commissions = await Commission.find({ agent: req.user._id })
        .populate('customer', 'name')
        .populate('policy', 'policyName')
        .sort('-createdAt');
        
    res.json(commissions);
});

// @desc    Toggle flag on an application
// @route   PUT /api/agent/applications/:id/flag
// @access  Private/Agent
const toggleApplicationFlag = asyncHandler(async (req, res) => {
    const application = await PolicyApplication.findById(req.params.id);

    if (!application) {
        res.status(404);
        throw new Error('Application not found');
    }

    // Verify ownership
    const customer = await User.findById(application.user);
    if (application.agent?.toString() !== req.user._id.toString() && customer.assignedAgent?.toString() !== req.user._id.toString()) {
        res.status(403);
        throw new Error('Not authorized');
    }

    application.isFlagged = !application.isFlagged;
    await application.save();

    res.json(application);
});

module.exports = {
    getAssignedCustomers,
    applyOnBehalf,
    getAgentApplications,
    updateApplicationRemarks,
    getAgentCommissions,
    toggleApplicationFlag
};
