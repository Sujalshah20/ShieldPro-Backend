const asyncHandler = require('express-async-handler');
const Claim = require('../models/Claim');
const UserPolicy = require('../models/UserPolicy');
const sendEmail = require('../utils/sendEmail');

// @desc    File a claim
// @route   POST /api/claims
// @access  Private
const fileClaim = asyncHandler(async (req, res) => {
    const { userPolicyId, amount, description } = req.body;
    console.log(`📑 Filing claim for User Policy: ${userPolicyId} by User: ${req.user._id}`);

    const userPolicy = await UserPolicy.findById(userPolicyId).populate('policy');
    if (!userPolicy) {
        res.status(404);
        throw new Error('User Policy not found');
    }

    if (userPolicy.user.toString() !== req.user._id.toString()) {
        res.status(401);
        throw new Error('User not authorized');
    }

    const claim = await Claim.create({
        user: req.user._id,
        userPolicy: userPolicyId,
        amount,
        description,
        status: 'Pending',
        documents: req.files ? req.files.map(file => ({
            url: `/uploads/${file.filename}`,
            name: file.originalname
        })) : []
    });

    // Notify user of claim filing
    sendEmail({
        to: req.user.email,
        subject: '📑 Claim Filed — ShieldPro',
        html: `<div style="font-family:sans-serif;max-width:600px;margin:auto;padding:24px;background:#0a0a0f;color:#fff;border-radius:16px;">
            <h2 style="color:#f59e0b;">Claim Received</h2>
            <p>Hi ${req.user.name}, we have received your claim for <strong>${userPolicy.policy?.policyName || 'your policy'}</strong>.</p>
            <p><strong>Claim ID:</strong> ${claim._id}</p>
            <p><strong>Amount:</strong> ₹${amount}</p>
            <p>Our adjusters will review the evidence and get back to you within 3-5 business days.</p>
        </div>`
    }, {
        userId: req.user._id,
        title: 'Claim Submitted',
        message: `Your claim for ₹${amount} is currently under investigation.`,
        type: 'info'
    });

    console.log(`✅ Claim ${claim._id} created successfully for amount ₹${amount}`);
    res.status(201).json(claim);
});

// @desc    Get all claims for logged in user
// @route   GET /api/claims
// @access  Private
const getMyClaims = asyncHandler(async (req, res) => {
    console.log(`🔍 Fetching claims for authenticated user: ${req.user._id} (${req.user.role})`);
    
    const claims = await Claim.find({ user: req.user._id })
        .populate({
            path: 'userPolicy',
            populate: [
                { path: 'policy' },
                { path: 'agent', select: 'name email role' }
            ]
        })
        .populate('comments.user', 'name role')
        .sort({ createdAt: -1 });

    console.log(`📊 Found ${claims.length} claims for user ${req.user._id}`);
    res.json(claims);
});

// @desc    Get all claims (for agents/admins)
// @route   GET /api/claims/all
// @access  Private/Agent/Admin
const getAllClaims = asyncHandler(async (req, res) => {
    let query = {};
    
    // If agent, only show claims for policies they managed
    if (req.user.role === 'agent') {
        // Find user policies managed by this agent
        const agentPolicyIds = await UserPolicy.find({ agent: req.user._id }).distinct('_id');
        query.userPolicy = { $in: agentPolicyIds };
    }

    const claims = await Claim.find(query)
        .populate('user', 'name email')
        .populate({
            path: 'userPolicy',
            populate: [
                { path: 'policy' },
                { path: 'agent', select: 'name email role' }
            ]
        })
        .populate('comments.user', 'name role');
    res.json(claims);
});

// @desc    Update claim status
// @route   PUT /api/claims/:id/status
// @access  Private/Agent/Admin
const updateClaimStatus = asyncHandler(async (req, res) => {
    const { status } = req.body;

    const claim = await Claim.findById(req.params.id)
        .populate('user')
        .populate({
            path: 'userPolicy',
            populate: { path: 'policy' }
        });

    if (!claim) {
        res.status(404);
        throw new Error('Claim not found');
    }

    // Agent authorization check
    if (req.user.role === 'agent' && claim.userPolicy?.agent?.toString() !== req.user._id.toString()) {
        res.status(403);
        throw new Error('Not authorized: You can only update claims for policies you manage.');
    }

    claim.status = status;
    
    // Add an automated comment about the status change
    claim.comments.push({
        user: req.user._id,
        text: `Claim status updated to ${status} by ${req.user.name}`
    });

    const updatedClaim = await claim.save();

    // Notify customer of status change
    const policyName = claim.userPolicy?.policy?.policyName || 'your policy';
    const variant = status === 'Approved' ? 'success' : status === 'Rejected' ? 'error' : 'info';
    
    sendEmail({
        to: claim.user.email,
        subject: `📑 Claim Update: ${status} — ShieldPro`,
        html: `<div style="font-family:sans-serif;max-width:600px;margin:auto;padding:24px;background:#0a0a0f;color:#fff;border-radius:16px;">
            <h2 style="color:${status === 'Approved' ? '#22c55e' : '#ef4444'};">Claim ${status}</h2>
            <p>Hi ${claim.user.name}, the status of your claim for <strong>${policyName}</strong> has been updated to <strong>${status}</strong>.</p>
            <p><strong>Claim ID:</strong> ${claim._id}</p>
            ${status === 'Approved' ? `<p>The settled amount of <strong>₹${claim.amount}</strong> will be credited to your linked bank account within 48 hours.</p>` : '<p>Please check your dashboard for details or contact support if you have questions.</p>'}
        </div>`
    }, {
        userId: claim.user._id,
        title: `Claim ${status}`,
        message: `Your claim for ${policyName} has been ${status.toLowerCase()}.`,
        type: variant
    });

    res.json(updatedClaim);
});

module.exports = {
    fileClaim,
    getMyClaims,
    getAllClaims,
    updateClaimStatus
};
