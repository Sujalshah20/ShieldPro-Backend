const mongoose = require('mongoose');

const recommendationSchema = mongoose.Schema({
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
    message: {
        type: String,
        default: 'I highly recommend this policy based on your profile.'
    },
    status: {
        type: String,
        enum: ['Pending', 'Accepted', 'Dismissed'],
        default: 'Pending'
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Recommendation', recommendationSchema);
