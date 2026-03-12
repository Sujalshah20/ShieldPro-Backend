const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Please add a name']
    },
    email: {
        type: String,
        required: [true, 'Please add an email'],
        unique: true
    },
    password: {
        type: String,
        required: [true, 'Please add a password']
    },
    role: {
        type: String,
        enum: ['admin', 'agent', 'customer'],
        default: 'customer'
    },
    phone: {
        type: String,
        required: [true, 'Please add a phone number']
    },
    dob: {
        type: Date,
        required: [true, 'Please add a date of birth']
    },
    gender: {
        type: String,
        enum: ['Male', 'Female', 'Other'],
        required: [true, 'Please select gender']
    },
    address: {
        type: String,
        required: [true, 'Please add an address']
    },
    isVerified: {
        type: Boolean,
        default: false
    },
    profilePic: String,
    nationalId: {
        type: String,
        unique: true,
        sparse: true
    },
    nominee: {
        name: String,
        relationship: String,
        phone: String
    },
    employment: {
        occupation: String,
        annualIncome: Number,
        employerName: String
    },
    bankDetails: {
        accountName: String,
        accountNumber: String,
        ifscCode: String,
        bankName: String
    }
}, {
    timestamps: true
});

// Match user entered password to hashed password in database
userSchema.methods.matchPassword = async function (enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

// Encrypt password using bcrypt
userSchema.pre('save', async function (next) {
    if (!this.isModified('password')) {
        next();
    }

    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
});

module.exports = mongoose.model('User', userSchema);
