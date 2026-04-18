const mongoose = require('mongoose');

const userPolicySchema = mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'User'
    },
    policy: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'Policy'
    },
    agent: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    policyNumber: {
        type: String,
        required: true,
        unique: true
    },
    startDate: {
        type: Date,
        required: true,
        default: Date.now
    },
    endDate: {
        type: Date,
        required: true
    },
    status: {
        type: String,
        required: true,
        enum: ['Active', 'Expired', 'Cancelled'],
        default: 'Active'
    }
}, {
    timestamps: true
});

// Add indexes for performance
userPolicySchema.index({ user: 1 });
userPolicySchema.index({ policy: 1 });
userPolicySchema.index({ agent: 1 });
userPolicySchema.index({ status: 1 });

module.exports = mongoose.model('UserPolicy', userPolicySchema);
