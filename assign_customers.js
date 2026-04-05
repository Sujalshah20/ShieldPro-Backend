const mongoose = require('mongoose');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const User = require('./models/User');

dotenv.config();

const assignCustomers = async () => {
    try {
        await connectDB();
        
        const agent = await User.findOne({ email: 'agent@shieldpro.com', role: 'agent' });
        if (!agent) {
            console.error('Agent agent@shieldpro.com not found');
            process.exit(1);
        }

        console.log(`Found Agent: ${agent.name} (${agent.email}) [ID: ${agent._id}]`);

        const unassignedCustomers = await User.find({ 
            role: 'customer', 
            $or: [
                { assignedAgent: { $exists: false } },
                { assignedAgent: null }
            ]
        }).limit(5);

        if (unassignedCustomers.length === 0) {
            console.log('No unassigned customers found.');
            process.exit(0);
        }

        console.log(`Assigning ${unassignedCustomers.length} customers to agent using updateOne...`);

        for (const customer of unassignedCustomers) {
            await User.updateOne({ _id: customer._id }, { $set: { assignedAgent: agent._id } });
            console.log(`- Assigned ${customer.name || 'Unnamed'} (${customer.email})`);
        }

        console.log('Assignment complete.');
        process.exit();
    } catch (error) {
        console.error('Assignment failed:', error.message);
        process.exit(1);
    }
};

assignCustomers();
