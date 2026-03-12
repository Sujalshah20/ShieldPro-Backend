const mongoose = require('mongoose');

const applicationSchema = mongoose.Schema({
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
    status: {
        type: String,
        required: true,
        enum: ['Pending', 'Under Review', 'Approved', 'Rejected', 'Paid'],
        default: 'Pending'
    },
    formData: {
        type: Map,
        of: String,
        required: true
    },
    documents: [{
        name: String,
        url: String
    }],
    rejectionReason: String,
    appliedDate: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('PolicyApplication', applicationSchema);
