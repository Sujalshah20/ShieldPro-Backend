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

// @desc    Update application status
// @route   PUT /api/applications/:id/status
// @access  Private (Admin/Agent)
const updateApplicationStatus = asyncHandler(async (req, res) => {
    const { status, rejectionReason } = req.body;
    const application = await PolicyApplication.findById(req.params.id);

    if (application) {
        application.status = status;
        if (rejectionReason) application.rejectionReason = rejectionReason;
        const updatedApplication = await application.save();
        res.json(updatedApplication);
    } else {
        res.status(404);
        throw new Error('Application not found');
    }
});

module.exports = {
    submitApplication,
    getMyApplications,
    getAllApplications,
    updateApplicationStatus
};
