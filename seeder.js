const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('./models/User');
const connectDB = require('./config/db');

dotenv.config();

const seedUsers = async () => {
    try {
        await connectDB();

        // Clear existing users if you want a fresh start (Optional)
        // await User.deleteMany();

        const demoUsers = [
            {
                name: 'Admin User',
                email: 'admin@shieldpro.com',
                password: 'admin123',
                role: 'admin'
            },
            {
                name: 'Agent User',
                email: 'agent@shieldpro.com',
                password: 'agent123',
                role: 'agent'
            },
            {
                name: 'Customer User',
                email: 'customer@shieldpro.com',
                password: 'customer123',
                role: 'customer'
            }
        ];

        for (const userData of demoUsers) {
            const userExists = await User.findOne({ email: userData.email });
            if (!userExists) {
                await User.create(userData);
                console.log(`Created user: ${userData.email}`);
            } else {
                // If user exists, we update the password to ensure it's hashed correctly
                userExists.password = userData.password;
                await userExists.save();
                console.log(`Updated user: ${userData.email}`);
            }
        }

        console.log('Database Seeded Successfully!');
        process.exit();
    } catch (error) {
        console.error(`Error: ${error.message}`);
        process.exit(1);
    }
};

seedUsers();
