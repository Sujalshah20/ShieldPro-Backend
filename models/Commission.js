const mongoose = require('mongoose');

const commissionSchema = mongoose.Schema({
    agent: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    customer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    policy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Policy',
        required: true
    },
    transaction: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Transaction',
        required: false
    },
    amount: {
        type: Number,
        required: true
    },
    status: {
        type: String,
        enum: ['Pending', 'Paid'],
        default: 'Pending'
    }
}, {
    timestamps: true
});

// Add indexes for performance optimization
// Frequent queries filter by agent, customer, or transaction status
commissionSchema.index({ agent: 1 });
commissionSchema.index({ customer: 1 });
commissionSchema.index({ status: 1 });
commissionSchema.index({ agent: 1, createdAt: -1 }); // Compound index for earnings history

module.exports = mongoose.model('Commission', commissionSchema);
