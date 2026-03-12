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

                // Notify agent of commission earned
                sendEmail({
                    to: agent.email,
                    subject: '💰 Commission Earned — ShieldPro',
                    html: `<div style="font-family:sans-serif;max-width:600px;margin:auto;padding:24px;background:#0a0a0f;color:#fff;border-radius:16px;">
                        <h2 style="color:#f59e0b;">Commission Earned! 🎉</h2>
                        <p>Hi ${agent.name}, a new commission of <strong>₹${commissionAmount}</strong> has been credited for the sale of <strong>${application.policy.policyName}</strong>.</p>
                    </div>`
                }, {
                    userId: agentId,
                    title: 'Commission Earned',
                    message: `You earned ₹${commissionAmount} commission for selling ${application.policy.policyName}.`,
                    type: 'success'
                });
            }
        }
    }

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
                <p>Your policy is now active. Please log in to view your policy details and download your policy document.</p>
                <a href="${frontendUrl}/customer/policies" style="display:inline-block;margin-top:16px;padding:12px 28px;background:#22c55e;color:#000;border-radius:8px;font-weight:bold;text-decoration:none;">View My Policy →</a>
            </div>`
        }, {
            userId: application.user._id,
            title: 'Application Approved!',
            message: `Your application for ${policyName} has been approved. Your policy is now active.`,
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
                <a href="${frontendUrl}/customer" style="display:inline-block;margin-top:16px;padding:12px 28px;background:#f59e0b;color:#000;border-radius:8px;font-weight:bold;text-decoration:none;">Explore Plans →</a>
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
                <a href="${frontendUrl}/customer" style="display:inline-block;margin-top:16px;padding:12px 28px;background:#f59e0b;color:#000;border-radius:8px;font-weight:bold;text-decoration:none;">Update Application →</a>
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
