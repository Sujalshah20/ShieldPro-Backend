const asyncHandler = require('express-async-handler');
const Commission = require('../models/Commission');

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
    const commission = await Commission.findById(req.params.id);

    if (!commission) {
        res.status(404);
        throw new Error('Commission record not found');
    }

    commission.status = status;
    await commission.save();

    res.json(commission);
});

module.exports = {
    getAllCommissions,
    updateCommissionStatus
};
