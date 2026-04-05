const mongoose = require('mongoose');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const User = require('./models/User');

dotenv.config();

const checkAssignments = async () => {
    try {
        await connectDB();
        
        const agents = await User.find({ role: 'agent' }).select('name email _id');
        console.log(`Found ${agents.length} agents:`);
        for (const agent of agents) {
            const customers = await User.find({ assignedAgent: agent._id, role: 'customer' }).select('name email');
            console.log(`Agent: ${agent.name} (${agent.email}) [ID: ${agent._id}]`);
            console.log(`- Assigned Customers (${customers.length}):`);
            customers.forEach(c => {
                console.log(`  * ${c.name} (${c.email})`);
            });
            console.log('-------------------');
        }
        
        const unassigned = await User.find({ role: 'customer', assignedAgent: { $exists: false } }).select('name email');
        console.log(`Unassigned Customers (${unassigned.length}):`);
        unassigned.forEach(c => {
            console.log(`  * ${c.name} (${c.email})`);
        });

        process.exit();
    } catch (error) {
        console.error('Check failed:', error.message);
        process.exit(1);
    }
};

checkAssignments();
