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
        type: Date
    },
    gender: {
        type: String,
        enum: ['Male', 'Female', 'Other']
    },
    address: {
        type: String
    },
    isVerified: {
        type: Boolean,
        default: false
    },
    status: {
        type: String,
        enum: ['active', 'suspended'],
        default: 'active'
    },
    profilePic: String,
    nationalId: {
        type: String,
        unique: true,
        sparse: true
    },
    panNumber: {
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
    },
    // Agent Specific Fields
    assignedAgent: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    commissionRate: {
        type: Number,
        default: 10 // Percentage
    },
    specialization: {
        type: String,
        default: 'General Insurance'
    },
    experience: {
        type: String,
        default: '5 Years'
    },
    resetPasswordToken: String,
    resetPasswordExpire: Date,
    loginAttempts: {
        type: Number,
        default: 0
    },
    lockUntil: Number,
    verificationToken: String,
    verificationTokenExpire: Date,
    // OTP Tracking Fields
    otpRetryAttempts: {
        type: Number,
        default: 0
    },
    lastOtpSentAt: {
        type: Date
    },
    otpCountSentToday: {
        type: Number,
        default: 0
    },
    documents: [{
        name: String,
        url: String,
        type: String, // 'Aadhaar', 'PAN', 'Other'
        uploadedAt: {
            type: Date,
            default: Date.now
        }
    }]
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
        return next();
    }

    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
});

// Hide sensitive fields by default when converting to JSON or Object
userSchema.set('toJSON', {
    transform: function (doc, ret, options) {
        delete ret.password;
        delete ret.resetPasswordToken;
        delete ret.resetPasswordExpire;
        delete ret.verificationToken;
        delete ret.verificationTokenExpire;
        delete ret.otpCountSentToday;
        delete ret.otpRetryAttempts;
        delete ret.lastOtpSentAt;
        delete ret.lockUntil;
        delete ret.loginAttempts;
        delete ret.__v;
        return ret;
    }
});

userSchema.set('toObject', {
    transform: function (doc, ret, options) {
        delete ret.password;
        return ret;
    }
});

module.exports = mongoose.model('User', userSchema);
