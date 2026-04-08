const asyncHandler = require('express-async-handler');
const AgentApplication = require('../models/AgentApplication');
const AdminAccessRequest = require('../models/AdminAccessRequest');

// @desc    Submit an agent application
// @route   POST /api/public-forms/agent-application
// @access  Public
const submitAgentApplication = asyncHandler(async (req, res) => {
    const { fullName, email, phone, city, experienceYears, message } = req.body;

    // Validation
    if (!fullName || !email || !phone || !city || experienceYears === undefined) {
        res.status(400);
        throw new Error('Please provide all required fields');
    }

    // Check if email already exists in applications
    const applicationExists = await AgentApplication.findOne({ email });

    if (applicationExists) {
        res.status(400);
        throw new Error('An application with this email already exists');
    }

    const application = await AgentApplication.create({
        fullName,
        email,
        phone,
        city,
        experienceYears,
        message
    });

    if (application) {
        res.status(201).json({
            message: 'Agent application received',
            referenceId: `REF-AGT-${application._id.toString().substring(0, 6).toUpperCase()}`
        });
    } else {
        res.status(400);
        throw new Error('Invalid application data');
    }
});

// @desc    Submit an admin access request
// @route   POST /api/public-forms/admin-access
// @access  Public
const submitAdminAccessRequest = asyncHandler(async (req, res) => {
    const { fullName, workEmail, phone, organization, roleTitle, reason } = req.body;

    // Validation
    if (!fullName || !workEmail || !phone || !organization || !roleTitle || !reason) {
        res.status(400);
        throw new Error('Please provide all required fields');
    }

    // Check if email already exists in requests
    const requestExists = await AdminAccessRequest.findOne({ workEmail });

    if (requestExists) {
        res.status(400);
        throw new Error('A request with this work email already exists');
    }

    const accessRequest = await AdminAccessRequest.create({
        fullName,
        workEmail,
        phone,
        organization,
        roleTitle,
        reason
    });

    if (accessRequest) {
        res.status(201).json({
            message: 'Admin access request received',
            referenceId: `REF-ADM-${accessRequest._id.toString().substring(0, 6).toUpperCase()}`
        });
    } else {
        res.status(400);
        throw new Error('Invalid request data');
    }
});

module.exports = {
    submitAgentApplication,
    submitAdminAccessRequest
};
