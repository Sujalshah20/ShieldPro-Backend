const asyncHandler = require('express-async-handler');
const Commission = require('../models/Commission');
const User = require('../models/User');
const sendEmail = require('../utils/sendEmail');

// @desc    Get all commissions in the system
// @route   GET /api/commissions
// @access  Private/Admin
const getAllCommissions = asyncHandler(async (req, res) => {
    const commissions = await Commission.find({})
        .populate('agent', 'name email')
        .populate('customer', 'name')
        .populate('policy', 'policyName')
        .sort('-createdAt');
    res.json(commissions);
});

// @desc    Update commission status (e.g. mark as Paid)
// @route   PUT /api/commissions/:id/status
// @access  Private/Admin
const updateCommissionStatus = asyncHandler(async (req, res) => {
    const { status } = req.body;
    const commission = await Commission.findById(req.params.id)
        .populate('agent')
        .populate('policy');

    if (!commission) {
        res.status(404);
        throw new Error('Commission record not found');
    }

    commission.status = status;
    await commission.save();

    if (status === 'Paid' && commission.agent) {
        sendEmail({
            to: commission.agent.email,
            subject: '💸 Payout Confirmed! — ShieldPro',
            html: `<div style="font-family:sans-serif;max-width:600px;margin:auto;padding:24px;background:#0a0a0f;color:#fff;border-radius:16px;">
                <h2 style="color:#22c55e;">Payment Disbursed! 🏦</h2>
                <p>Hi ${commission.agent.name}, the commission of <strong>₹${commission.amount}</strong> for <strong>${commission.policy?.policyName || 'a policy sale'}</strong> has been paid out to your linked account.</p>
                <p>Thank you for your continued partnership with ShieldPro.</p>
            </div>`
        }, {
            userId: commission.agent._id,
            title: 'Commission Paid Out',
            message: `Your commission for ₹${commission.amount} has been disbursed.`,
            type: 'success'
        });
    }

    res.json(commission);
});

module.exports = {
    getAllCommissions,
    updateCommissionStatus
};
