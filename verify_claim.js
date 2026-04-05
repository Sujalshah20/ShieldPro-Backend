const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// Load env vars
dotenv.config({ path: path.join(__dirname, '.env') });

const Claim = require('./models/Claim');
const User = require('./models/User');
const UserPolicy = require('./models/UserPolicy');

async function createTestClaim() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB');

        const user = await User.findOne({ email: 'shahsujal14@gmail.com' });
        if (!user) {
            console.log('User not found');
            process.exit(1);
        }

        const userPolicy = await UserPolicy.findOne({ user: user._id, status: 'Active' });
        if (!userPolicy) {
            console.log('No active policy found for user');
            process.exit(1);
        }

        console.log(`Creating claim for user: ${user.name} on policy: ${userPolicy.policyNumber}`);

        const claim = await Claim.create({
            user: user._id,
            userPolicy: userPolicy._id,
            amount: 5000,
            description: 'Test claim created via verification script',
            status: 'Pending',
            documents: []
        });

        console.log(`✅ Success! Claim created with ID: ${claim._id}`);

        const foundClaim = await Claim.findOne({ _id: claim._id });
        if (foundClaim) {
            console.log('Verification: Claim found in database.');
        }

        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

createTestClaim();
