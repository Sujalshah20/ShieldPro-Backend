const mongoose = require('mongoose');

const transactionSchema = mongoose.Schema({
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
    application: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'PolicyApplication'
    },
    amount: {
        type: Number,
        required: true
    },
    transactionId: {
        type: String,
        required: true,
        unique: true
    },
    paymentMethod: {
        type: String,
        required: true,
        default: 'Credit Card'
    },
    status: {
        type: String,
        required: true,
        enum: ['Success', 'Failed', 'Pending'],
        default: 'Success'
    },
    paymentDate: {
        type: Date,
        required: true,
        default: Date.now
    }
}, {
    timestamps: true
});

// Add indexes for performance
transactionSchema.index({ user: 1 });
transactionSchema.index({ policy: 1 });
transactionSchema.index({ status: 1 });

module.exports = mongoose.model('Transaction', transactionSchema);
