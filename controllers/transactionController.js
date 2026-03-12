const asyncHandler = require('express-async-handler');
const Transaction = require('../models/Transaction');
const UserPolicy = require('../models/UserPolicy');
const Policy = require('../models/Policy');
const PolicyApplication = require('../models/PolicyApplication');
const Commission = require('../models/Commission');
const User = require('../models/User');

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
