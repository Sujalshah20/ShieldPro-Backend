const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    razorpayOrderId: {
        type: String,
        required: true
    },
    razorpayPaymentId: {
        type: String,
    },
    razorpaySignature: {
        type: String,
    },
    amount: {
        type: Number,
        required: true
    },
    currency: {
        type: String,
        default: 'INR'
    },
    status: {
        type: String,
        enum: ['created', 'success', 'failed'],
        default: 'created'
    },
    policyId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Policy'
    },
    applicationId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'PolicyApplication'
    },
    paymentId: {
        type: String,
        default: 'pending'
    },
    receipt: {
        type: String
    }
}, { timestamps: true });

// Add indexes for performance optimization
paymentSchema.index({ userId: 1 });
paymentSchema.index({ razorpayOrderId: 1 });
paymentSchema.index({ policyId: 1 });
paymentSchema.index({ status: 1 });
paymentSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Payment', paymentSchema);
