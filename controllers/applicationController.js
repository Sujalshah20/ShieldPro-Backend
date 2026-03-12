const asyncHandler = require('express-async-handler');
const PolicyApplication = require('../models/PolicyApplication');
const Policy = require('../models/Policy');

// @desc    Submit new policy application
// @route   POST /api/applications
// @access  Private
const submitApplication = asyncHandler(async (req, res) => {
    const { policyId, formData, documents } = req.body;

    const policy = await Policy.findById(policyId);
    if (!policy) {
        res.status(404);
        throw new Error('Policy not found');
    }

    const application = await PolicyApplication.create({
        user: req.user._id,
        policy: policyId,
        formData,
        documents,
        status: 'Pending'
    });

    res.status(201).json(application);
});

// @desc    Get logged in user applications
// @route   GET /api/applications/my
// @access  Private
const getMyApplications = asyncHandler(async (req, res) => {
    const applications = await PolicyApplication.find({ user: req.user._id })
        .populate('policy', 'policyName policyType coverageAmount premiumAmount');
    res.json(applications);
});

// @desc    Get all applications (Admin/Agent)
// @route   GET /api/applications
// @access  Private (Admin/Agent)
const getAllApplications = asyncHandler(async (req, res) => {
    const applications = await PolicyApplication.find({})
        .populate('user', 'name email')
        .populate('policy', 'policyName policyType');
    res.json(applications);
});

const UserPolicy = require('../models/UserPolicy');
const Commission = require('../models/Commission');
const User = require('../models/User');

// @desc    Update application status
// @route   PUT /api/applications/:id/status
// @access  Private (Admin/Agent)
const updateApplicationStatus = asyncHandler(async (req, res) => {
    const { status, rejectionReason } = req.body;
    const application = await PolicyApplication.findById(req.params.id)
        .populate('policy')
        .populate('user');

    if (!application) {
        res.status(404);
        throw new Error('Application not found');
    }

    application.status = status;
    if (rejectionReason) application.rejectionReason = rejectionReason;
    const updatedApplication = await application.save();

    // If status is Approved, create UserPolicy and Commission
    if (status === 'Approved' && application.policy) {
        // Create active user policy
        const endDate = new Date();
        endDate.setFullYear(endDate.getFullYear() + (application.policy.durationYears || 1));

        await UserPolicy.create({
            user: application.user._id,
            policy: application.policy._id,
            agent: application.agent || application.user.assignedAgent,
            policyNumber: `POL-${Math.floor(100000 + Math.random() * 900000)}`,
            startDate: new Date(),
            endDate: endDate,
            status: 'Active'
        });

        // Determine the agent for commission
        const agentId = application.agent || application.user.assignedAgent;
        if (agentId) {
            const agent = await User.findById(agentId);
            if (agent && agent.role === 'agent') {
                const commissionRate = agent.commissionRate || 10;
                const commissionAmount = (application.policy.premiumAmount * commissionRate) / 100;

                await Commission.create({
                    agent: agentId,
                    customer: application.user._id,
                    policy: application.policy._id,
                    amount: commissionAmount,
                    status: 'Pending'
                });
            }
        }
    }

    res.json(updatedApplication);
});

module.exports = {
    submitApplication,
    getMyApplications,
    getAllApplications,
    updateApplicationStatus
};
