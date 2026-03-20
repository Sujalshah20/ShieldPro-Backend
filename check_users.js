const mongoose = require('mongoose');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const User = require('./models/User');

dotenv.config();

const checkUsers = async () => {
    try {
        await connectDB();
        const users = await User.find({ role: 'customer' }).select('email nationalId panNumber');
        console.log('Customers in DB:');
        users.forEach(u => {
            console.log(`- ${u.email}: ID=${u.nationalId}, PAN=${u.panNumber}`);
        });
        process.exit();
    } catch (error) {
        console.error('Check failed:', error.message);
        process.exit(1);
    }
};

checkUsers();
