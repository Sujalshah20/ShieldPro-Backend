const asyncHandler = require('express-async-handler');
const Claim = require('../models/Claim');
const UserPolicy = require('../models/UserPolicy');

// @desc    File a claim
// @route   POST /api/claims
// @access  Private
const fileClaim = asyncHandler(async (req, res) => {
    const { userPolicyId, amount, description } = req.body;

    const userPolicy = await UserPolicy.findById(userPolicyId);
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

    res.status(201).json(claim);
});

// @desc    Get all claims for logged in user
// @route   GET /api/claims
// @access  Private
const getMyClaims = asyncHandler(async (req, res) => {
    const claims = await Claim.find({ user: req.user._id }).populate('userPolicy');
    res.json(claims);
});

// @desc    Get all claims (for agents/admins)
// @route   GET /api/claims/all
// @access  Private/Agent/Admin
const getAllClaims = asyncHandler(async (req, res) => {
    const claims = await Claim.find({})
        .populate('user', 'name email')
        .populate({
            path: 'userPolicy',
            populate: { path: 'policy' }
        });
    res.json(claims);
});

// @desc    Update claim status
// @route   PUT /api/claims/:id/status
// @access  Private/Agent/Admin
const updateClaimStatus = asyncHandler(async (req, res) => {
    const { status } = req.body;

    const claim = await Claim.findById(req.params.id);

    if (!claim) {
        res.status(404);
        throw new Error('Claim not found');
    }

    claim.status = status;
    const updatedClaim = await claim.save();

    res.json(updatedClaim);
});

module.exports = {
    fileClaim,
    getMyClaims,
    getAllClaims,
    updateClaimStatus
};
