const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// Load env vars
dotenv.config({ path: path.join(__dirname, '.env') });

const Claim = require('./models/Claim');
const User = require('./models/User');
const UserPolicy = require('./models/UserPolicy');

async function checkClaims() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB');

        const user = await User.findOne({ email: 'shahsujal14@gmail.com' });
        if (!user) {
            console.log('User not found');
            process.exit(1);
        }
        console.log(`Checking data for user: ${user.name} (${user._id})`);

        const userPolicies = await UserPolicy.find({ user: user._id }).populate('policy', 'policyName');
        console.log(`\nFound ${userPolicies.length} policies for this user.`);
        userPolicies.forEach(up => {
            console.log(`- Policy ID: ${up._id}, Name: ${up.policy?.policyName}, Status: ${up.status}`);
        });

        const claims = await Claim.find({ user: user._id });
        console.log(`\nFound ${claims.length} claims for this user.`);

        const allClaims = await Claim.countDocuments();
        console.log(`\nTotal claims in database: ${allClaims}`);

        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

checkClaims();
