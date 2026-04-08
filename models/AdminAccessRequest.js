const mongoose = require('mongoose');

const adminAccessRequestSchema = mongoose.Schema({
    fullName: {
        type: String,
        required: [true, 'Please add a full name']
    },
    workEmail: {
        type: String,
        required: [true, 'Please add a work email address'],
        unique: true,
        match: [
            /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
            'Please add a valid email'
        ]
    },
    phone: {
        type: String,
        required: [true, 'Please add a phone number']
    },
    organization: {
        type: String,
        required: [true, 'Please add your organization or department']
    },
    roleTitle: {
        type: String,
        required: [true, 'Please add your role title']
    },
    reason: {
        type: String,
        required: [true, 'Please provide a reason for requesting admin access']
    },
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'pending'
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('AdminAccessRequest', adminAccessRequestSchema);
