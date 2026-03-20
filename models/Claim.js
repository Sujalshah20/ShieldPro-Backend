const mongoose = require('mongoose');

const claimSchema = mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'User'
    },
    userPolicy: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'UserPolicy'
    },
    amount: {
        type: Number,
        required: [true, 'Please add a claim amount']
    },
    description: {
        type: String,
        required: [true, 'Please add a claim description']
    },
    status: {
        type: String,
        required: true,
        enum: ['Pending', 'Investigation', 'Approved', 'Rejected'],
        default: 'Pending'
    },
    claimDate: {
        type: Date,
        required: true,
        default: Date.now
    },
    documents: [{
        url: String,
        name: String
    }],
    comments: [{
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        text: String,
        createdAt: {
            type: Date,
            default: Date.now
        }
    }]
}, {
    timestamps: true
});

// Add indexes for performance
claimSchema.index({ user: 1 });
claimSchema.index({ userPolicy: 1 });
claimSchema.index({ status: 1 });
claimSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Claim', claimSchema);
