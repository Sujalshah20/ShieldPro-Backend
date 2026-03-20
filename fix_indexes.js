const mongoose = require('mongoose');
const dotenv = require('dotenv');
const connectDB = require('./config/db');

dotenv.config();

const fixIndexes = async () => {
    try {
        await connectDB();
        const User = mongoose.connection.collection('users');
        
        console.log('Dropping panNumber index...');
        try {
            await User.dropIndex('nationalId_1');
            console.log('Index nationalId_1 dropped');
        } catch (e) {
            console.log('Index nationalId_1 not found or error:', e.message);
        }

        console.log('Recreating sparse unique indices...');
        await User.createIndex({ panNumber: 1 }, { unique: true, sparse: true });
        await User.createIndex({ nationalId: 1 }, { unique: true, sparse: true });
        console.log('Indices created successfully (sparse, unique)');

        process.exit();
    } catch (error) {
        console.error('Fix failed:', error.message);
        process.exit(1);
    }
};

fixIndexes();
