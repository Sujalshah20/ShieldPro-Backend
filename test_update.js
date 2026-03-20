const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('./models/User');
const connectDB = require('./config/db');

dotenv.config();

const testUpdate = async () => {
    try {
        await connectDB();
        const user = await User.findOne({ role: 'customer' });
        if (!user) {
            console.log('No customer found to test');
            process.exit();
        }

        console.log('Testing update for:', user.email);
        user.name = 'Test User Updated';
        user.phone = '9876543210';
        user.panNumber = 'ABCDE1234F';
        user.nationalId = '123456789012';
        
        const saved = await user.save();
        console.log('Saved successfully!');
        console.log('panNumber in DB:', saved.panNumber);
        console.log('nationalId in DB:', saved.nationalId);

        process.exit();
    } catch (error) {
        console.error('Update failed:', error.message);
        process.exit(1);
    }
};

testUpdate();
