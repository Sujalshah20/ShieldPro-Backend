const mongoose = require('mongoose');

const policySchema = mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'User'
    },
    policyName: {
        type: String,
        required: [true, 'Please add a policy name']
    },
    policyType: {
        type: String,
        required: [true, 'Please add a policy type'],
        enum: ['Life', 'Health', 'Vehicle', 'Home', 'Travel', 'Auto', 'Property']
    },
    premiumAmount: {
        type: Number,
        required: [true, 'Please add a premium amount']
    },
    coverageAmount: {
        type: Number,
        required: [true, 'Please add a coverage amount']
    },
    description: {
        type: String,
        required: [true, 'Please add a policy description']
    },
    durationYears: {
        type: Number,
        required: [true, 'Please add duration in years']
    },
    status: {
        type: String,
        required: true,
        enum: ['active', 'pending', 'expired', 'inactive'],
        default: 'active'
    }
}, {
    timestamps: true
});

// Add index for performance
policySchema.index({ user: 1 });

module.exports = mongoose.model('Policy', policySchema);
