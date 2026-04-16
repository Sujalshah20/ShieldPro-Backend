const mongoose = require('mongoose');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const User = require('./models/User');

dotenv.config();

const checkAllUsers = async () => {
    try {
        await connectDB();
        const users = await User.find({}).select('email role');
        console.log('All Users in DB:');
        users.forEach(u => {
            console.log(`- ${u.email} (${u.role})`);
        });
        process.exit();
    } catch (error) {
        console.error('Check failed:', error.message);
        process.exit(1);
    }
};

checkAllUsers();
