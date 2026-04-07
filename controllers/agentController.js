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
    
    // Supplement with application, policy counts and premium totals
    const enrichedCustomers = await Promise.all(customers.map(async (customer) => {
        const applicationCount = await PolicyApplication.countDocuments({ user: customer._id });
        const activePolicies = await UserPolicy.find({ user: customer._id, status: 'Active' }).populate('policy');
        
        const totalPremium = activePolicies.reduce((sum, up) => sum + (up.policy?.premiumAmount || 0), 0);
        
        // Basic payment status logic: if they have active policies, assume PAID for now, 
        // in a real app check Transaction history
        const paymentStatus = activePolicies.length > 0 ? 'PAID' : 'N/A';

        return {
            ...customer.toObject(),
            applicationCount,
            activePolicyCount: activePolicies.length,
            totalPremium,
            paymentStatus
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
    })
    .populate('user', 'name email phone')
    .populate('policy', 'policyName policyType premiumAmount coverageAmount')
    .sort('-updatedAt');

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

const Recommendation = require('../models/Recommendation');

// @desc    Recommend a policy to a customer
// @route   POST /api/agent/recommend
// @access  Private/Agent
const recommendPolicy = asyncHandler(async (req, res) => {
    const { customerId, policyId, message } = req.body;

    const customer = await User.findById(customerId);
    if (!customer || customer.assignedAgent.toString() !== req.user._id.toString()) {
        res.status(403);
        throw new Error('Not authorized to recommend to this customer');
    }

    const recommendation = await Recommendation.create({
        agent: req.user._id,
        customer: customerId,
        policy: policyId,
        message: message || `I highly recommend the ${policyId} plan for your needs.`
    });

    res.status(201).json(recommendation);
});

module.exports = {
    getAssignedCustomers,
    applyOnBehalf,
    getAgentApplications,
    updateApplicationRemarks,
    getAgentCommissions,
    toggleApplicationFlag,
    recommendPolicy
};
