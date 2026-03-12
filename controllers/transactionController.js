const asyncHandler = require('express-async-handler');
const Transaction = require('../models/Transaction');
const UserPolicy = require('../models/UserPolicy');
const Policy = require('../models/Policy');
const PolicyApplication = require('../models/PolicyApplication');
const Commission = require('../models/Commission');
const User = require('../models/User');
const sendEmail = require('../utils/sendEmail');

// @desc    Process a mock payment
// @route   POST /api/transactions/process
// @access  Private
const processPayment = asyncHandler(async (req, res) => {
    const { policyId, applicationId, amount, paymentMethod } = req.body;

    const policy = await Policy.findById(policyId);
    if (!policy) {
        res.status(404);
        throw new Error('Policy not found');
    }

    // Generate a mock transaction ID
    const transactionId = 'TXN-' + Math.random().toString(36).substring(2, 10).toUpperCase();

    // Create the transaction record
    const transaction = await Transaction.create({
        user: req.user._id,
        policy: policyId,
        application: applicationId,
        amount,
        transactionId,
        paymentMethod: paymentMethod || 'Credit Card',
        status: 'Success' // Mocking success
    });

    // Handle Application and Agent linkage
    let agentId = null;
    if (applicationId) {
        const application = await PolicyApplication.findById(applicationId);
        if (application) {
            agentId = application.agent;
            application.status = 'Paid';
            await application.save();
        }
    }

    // If no agent from application, check if user has an assigned agent
    if (!agentId && req.user.assignedAgent) {
        agentId = req.user.assignedAgent;
    }

    // Calculate Commission if agent exists
    if (agentId) {
        const agent = await User.findById(agentId);
        if (agent && agent.role === 'agent') {
            const commissionAmount = (amount * (agent.commissionRate || 10)) / 100;
            
            await Commission.create({
                agent: agentId,
                customer: req.user._id,
                policy: policyId,
                transaction: transaction._id,
                amount: commissionAmount,
                status: 'Pending'
            });

            // Notify agent of commission
            sendEmail({
                to: agent.email,
                subject: '💰 Commission Earned — ShieldPro',
                html: `<div style="font-family:sans-serif;max-width:600px;margin:auto;padding:24px;background:#0a0a0f;color:#fff;border-radius:16px;">
                    <h2 style="color:#f59e0b;">Commission Alert! 🎉</h2>
                    <p>Hi ${agent.name}, you've earned a commission of <strong>₹${commissionAmount}</strong> from the sale of <strong>${policy.policyName}</strong> to ${req.user.name}.</p>
                    <p>The amount has been added to your pending commissions.</p>
                </div>`
            }, {
                userId: agentId,
                title: 'New Commission Earned',
                message: `You earned ₹${commissionAmount} for the sale of ${policy.policyName}.`,
                type: 'success'
            });
        }
    }

    // Create the UserPolicy automatically upon successful payment
    const endDate = new Date();
    endDate.setFullYear(endDate.getFullYear() + (policy.durationYears || 1));

    const userPolicy = await UserPolicy.create({
        user: req.user._id,
        policy: policyId,
        agent: agentId,
        policyNumber: 'SP-' + Math.floor(100000 + Math.random() * 900000),
        startDate: new Date(),
        endDate,
        status: 'Active'
    });

    res.status(201).json({
        success: true,
        transaction,
        userPolicy
    });

    // Notify customer on successful payment
    const frontendUrl = process.env.FRONTEND_URL || 'https://shield-pro-frontend.vercel.app';
    sendEmail({
        to: req.user.email,
        subject: '💳 Payment Successful — ShieldPro',
        html: `<div style="font-family:sans-serif;max-width:600px;margin:auto;padding:24px;background:#0a0a0f;color:#fff;border-radius:16px;">
            <h2 style="color:#22c55e;">Payment Received! 🎉</h2>
            <p>Hi ${req.user.name}, your payment of <strong>₹${amount}</strong> for <strong>${policy.policyName}</strong> was successful.</p>
            <p><strong>Transaction ID:</strong> ${transactionId}</p>
            <p><strong>Policy Number:</strong> ${userPolicy.policyNumber}</p>
            <p>Your protection is now active. You can download your policy document in the dashboard.</p>
            <a href="${frontendUrl}/customer/policies" style="display:inline-block;margin-top:16px;padding:12px 28px;background:#22c55e;color:#000;border-radius:8px;font-weight:bold;text-decoration:none;">View My Policy →</a>
        </div>`
    }, {
        userId: req.user._id,
        title: 'Payment Successful',
        message: `Your payment for ${policy.policyName} has been processed. Policy ${userPolicy.policyNumber} is active.`,
        type: 'success'
    });
});


// @desc    Get all transactions (Admin only)
// @route   GET /api/transactions
// @access  Private/Admin
const getTransactions = asyncHandler(async (req, res) => {
    const transactions = await Transaction.find({})
        .populate('user', 'name email')
        .populate('policy', 'policyName policyType');
    res.json(transactions);
});

module.exports = {
    processPayment,
    getTransactions
};
