const asyncHandler = require('express-async-handler');
const Transaction = require('../models/Transaction');
const UserPolicy = require('../models/UserPolicy');
const Policy = require('../models/Policy');

// @desc    Process a mock payment
// @route   POST /api/transactions/process
// @access  Private
const processPayment = asyncHandler(async (req, res) => {
    const { policyId, amount, paymentMethod, cardDetails } = req.body;

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
        amount,
        transactionId,
        paymentMethod: paymentMethod || 'Credit Card',
        status: 'Success' // Mocking success
    });

    // Create the UserPolicy automatically upon successful payment
    const endDate = new Date();
    endDate.setFullYear(endDate.getFullYear() + (policy.durationYears || 1));

    const userPolicy = await UserPolicy.create({
        user: req.user._id,
        policy: policyId,
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

module.exports = {
    processPayment
};
