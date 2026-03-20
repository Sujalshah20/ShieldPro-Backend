const mongoose = require('mongoose');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const User = require('./models/User');

dotenv.config();

const inspectUser = async () => {
    try {
        await connectDB();
        const user = await User.findOne({ email: 'demo123@gmail.com' });
        console.log('User Details:', JSON.stringify(user, null, 2));
        process.exit();
    } catch (error) {
        console.error('Inspect failed:', error.message);
        process.exit(1);
    }
};

inspectUser();
