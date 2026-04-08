const mongoose = require('mongoose');

const agentApplicationSchema = mongoose.Schema({
    fullName: {
        type: String,
        required: [true, 'Please add a full name']
    },
    email: {
        type: String,
        required: [true, 'Please add an email'],
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
    city: {
        type: String,
        required: [true, 'Please add a city or region']
    },
    experienceYears: {
        type: Number,
        required: [true, 'Please specify your years of experience']
    },
    message: {
        type: String
    },
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'pending'
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('AgentApplication', agentApplicationSchema);
