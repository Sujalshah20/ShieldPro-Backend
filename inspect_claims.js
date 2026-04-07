const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// Load env vars
dotenv.config();

const User = require('./models/User');
const Claim = require('./models/Claim');
const UserPolicy = require('./models/UserPolicy');

const seed = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to DB');

        const agent = await User.findOne({ role: 'agent' });
        if (!agent) {
             console.error('No agent found');
             process.exit(1);
        }
        console.log(`Assigning to Agent: ${agent.name} (${agent._id})`);

        // Find all UserPolicies with claims
        const claims = await Claim.find({});
        const policyIds = claims.map(c => c.userPolicy);
        
        const result = await UserPolicy.updateMany(
            { _id: { $in: policyIds } },
            { $set: { agent: agent._id } }
        );

        console.log(`Updated ${result.modifiedCount} policies with Agent: ${agent.name}`);

        process.exit();
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
};

seed();
