const asyncHandler = require('express-async-handler');
const PolicyApplication = require('../models/PolicyApplication');
const Policy = require('../models/Policy');
const sendEmail = require('../utils/sendEmail');

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

    // Notify customer of submission
    sendEmail({
        to: req.user.email,
        subject: '✅ Application Received — ShieldPro',
        html: `<div style="font-family:sans-serif;max-width:600px;margin:auto;padding:24px;background:#0a0a0f;color:#fff;border-radius:16px;">
            <h2 style="color:#f59e0b;">Application Received!</h2>
            <p>Hi ${req.user.name}, your application for <strong>${policy.policyName}</strong> has been received and is under review.</p>
            <p><strong>Application ID:</strong> ${application._id}</p>
            <p>Our team will review it and get back to you shortly.</p>
        </div>`
    }, {
        userId: req.user._id,
        title: 'Application Submitted',
        message: `Your application for ${policy.policyName} is under review. App ID: ${application._id}`,
        type: 'info'
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

// @desc    Get all applications (Admin/Agent) with search, filter and pagination
// @route   GET /api/applications
// @access  Private (Admin/Agent)
const getAllApplications = asyncHandler(async (req, res) => {
    const pageSize = Number(req.query.limit) || 10;
    const page = Number(req.query.page) || 1;

    let query = {};
    if (req.user.role === 'agent') {
        query.agent = req.user._id;
    }

    // Status Filter
    if (req.query.status && req.query.status !== 'All') {
        query.status = req.query.status;
    }

    // Advanced Search (Across User and Policy)
    if (req.query.search) {
        const [matchingUsers, matchingPolicies] = await Promise.all([
            User.find({ name: { $regex: req.query.search, $options: 'i' } }).select('_id'),
            Policy.find({ policyName: { $regex: req.query.search, $options: 'i' } }).select('_id')
        ]);

        query.$or = [
            { user: { $in: matchingUsers.map(u => u._id) } },
            { policy: { $in: matchingPolicies.map(p => p._id) } }
        ];
    }

    const count = await PolicyApplication.countDocuments(query);
    const applications = await PolicyApplication.find(query)
        .populate('user', 'name email phone')
        .populate('policy', 'policyName policyType')
        .limit(pageSize)
        .skip(pageSize * (page - 1))
        .sort({ createdAt: -1 });

    res.json({
        applications,
        page,
        pages: Math.ceil(count / pageSize),
        total: count
    });
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

    // Notify customer based on new status
    const frontendUrl = process.env.FRONTEND_URL || 'https://shield-pro-frontend.vercel.app';
    const customerEmail = application.user?.email;
    const customerName = application.user?.name || 'Customer';
    const policyName = application.policy?.policyName || 'your policy';

    if (status === 'Approved') {
        sendEmail({
            to: customerEmail,
            subject: '🎉 Application Approved — ShieldPro',
            html: `<div style="font-family:sans-serif;max-width:600px;margin:auto;padding:24px;background:#0a0a0f;color:#fff;border-radius:16px;">
                <h2 style="color:#22c55e;">Congratulations, ${customerName}! 🎉</h2>
                <p>Your application for <strong>${policyName}</strong> has been <strong>approved</strong>!</p>
                <p>To activate your protection, please complete the payment in your dashboard.</p>
                <a href="${frontendUrl}/customer/applications" style="display:inline-block;margin-top:16px;padding:12px 28px;background:#22c55e;color:#000;border-radius:8px;font-weight:bold;text-decoration:none;">Pay & Activate →</a>
            </div>`
        }, {
            userId: application.user._id,
            title: 'Application Approved!',
            message: `Your application for ${policyName} has been approved. Please complete payment to activate.`,
            type: 'success'
        });
    } else if (status === 'Rejected') {
        sendEmail({
            to: customerEmail,
            subject: '❌ Application Update — ShieldPro',
            html: `<div style="font-family:sans-serif;max-width:600px;margin:auto;padding:24px;background:#0a0a0f;color:#fff;border-radius:16px;">
                <h2 style="color:#ef4444;">Application Update</h2>
                <p>Hi ${customerName}, unfortunately your application for <strong>${policyName}</strong> was not approved at this time.</p>
                ${rejectionReason ? `<p><strong>Reason:</strong> ${rejectionReason}</p>` : ''}
                <p>You are welcome to re-apply or explore other plans that may suit you better.</p>
                <a href="${frontendUrl}/customer/browse" style="display:inline-block;margin-top:16px;padding:12px 28px;background:#f59e0b;color:#000;border-radius:8px;font-weight:bold;text-decoration:none;">Explore Plans →</a>
            </div>`
        }, {
            userId: application.user._id,
            title: 'Application Not Approved',
            message: `Your application for ${policyName} was not approved. ${rejectionReason || ''}`,
            type: 'error'
        });
    } else if (status === 'On Hold') {
        sendEmail({
            to: customerEmail,
            subject: '⚠️ Action Required — ShieldPro',
            html: `<div style="font-family:sans-serif;max-width:600px;margin:auto;padding:24px;background:#0a0a0f;color:#fff;border-radius:16px;">
                <h2 style="color:#f59e0b;">Action Required</h2>
                <p>Hi ${customerName}, your application for <strong>${policyName}</strong> requires additional documents or information.</p>
                ${rejectionReason ? `<p><strong>Notes from Admin:</strong> ${rejectionReason}</p>` : ''}
                <p>Please log in and update your application at the earliest.</p>
                <a href="${frontendUrl}/customer/profile" style="display:inline-block;margin-top:16px;padding:12px 28px;background:#f59e0b;color:#000;border-radius:8px;font-weight:bold;text-decoration:none;">Update Application →</a>
            </div>`
        }, {
            userId: application.user._id,
            title: 'Application On Hold — Action Required',
            message: `Your application for ${policyName} requires further action. ${rejectionReason || ''}`,
            type: 'warning'
        });
    }

    res.json(updatedApplication);
});

module.exports = {
    submitApplication,
    getMyApplications,
    getAllApplications,
    updateApplicationStatus
};
