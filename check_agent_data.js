const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// Load env vars
dotenv.config({ path: path.join(__dirname, '.env') });

const User = require('./models/User');
const PolicyApplication = require('./models/PolicyApplication');
const UserPolicy = require('./models/UserPolicy');
const Claim = require('./models/Claim');

async function checkAgentData() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB');

        // FIX: Verify all agents/admins
        const fixResult = await User.updateMany(
            { role: { $in: ['agent', 'admin'] }, isVerified: false },
            { isVerified: true }
        );
        if (fixResult.modifiedCount > 0) {
            console.log(`✅ Fixed: Verified ${fixResult.modifiedCount} agents/admins.`);
        }

        const agentRoles = ['agent', 'senior agent', 'senior_agent'];
        const agents = await User.find({ role: { $in: agentRoles } });
        console.log(`\nFound ${agents.length} Agents/Senior Agents:`);
        agents.forEach(a => console.log(`- ${a.name} (${a.email}) Role: ${a.role}, ID: ${a._id}, Verified: ${a.isVerified}`));

        if (agents.length === 0) {
            console.log('No agents found!');
            process.exit(0);
        }

        // Check if there are ANY customers with assignedAgent set
        const totalAssignedCustomers = await User.countDocuments({ assignedAgent: { $exists: true, $ne: null }, role: 'customer' });
        console.log(`\nTotal Customers with ANY assignedAgent: ${totalAssignedCustomers}`);

        const samples = await User.find({ assignedAgent: { $exists: true, $ne: null }, role: 'customer' }).limit(5);
        samples.forEach(s => console.log(`- Customer: ${s.name}, AssignedTo: ${s.assignedAgent}`));

        const agentId = agents[0]._id; // Test with first agent
        console.log(`\n--- Testing for Agent: ${agents[0].name} (${agentId}) ---`);

        const assignedCustomers = await User.find({ assignedAgent: agentId, role: 'customer' });
        console.log(`- Directly Assigned Customers: ${assignedCustomers.length}`);

        const applications = await PolicyApplication.find({
            $or: [
                { agent: agentId },
                { user: { $in: await User.find({ assignedAgent: agentId }).distinct('_id') } }
            ]
        });
        console.log(`- Assigned Applications: ${applications.length}`);

        const userPolicies = await UserPolicy.find({ agent: agentId });
        console.log(`- Managed UserPolicies: ${userPolicies.length}`);

        const agentPolicyIds = await UserPolicy.find({ agent: agentId }).distinct('_id');
        const claims = await Claim.find({ userPolicy: { $in: agentPolicyIds } });
        console.log(`- Managed Claims: ${claims.length}`);

        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

checkAgentData();
