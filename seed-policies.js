const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Policy = require('./models/Policy');
const connectDB = require('./config/db');

dotenv.config();

const seedPolicies = async () => {
    try {
        await connectDB();

        // First, get an admin user to assign as the policy owner
        const User = require('./models/User');
        const adminUser = await User.findOne({ role: 'admin' });
        
        if (!adminUser) {
            console.log('❌ No admin user found. Please run the user seeder first.');
            process.exit(1);
        }

        console.log(`✅ Using admin user: ${adminUser.email}`);

        // Sample policies to seed
        const samplePolicies = [
            {
                policyName: 'Comprehensive Health Shield',
                policyType: 'Health',
                description: 'Complete medical coverage with cashless hospitalization, critical illness cover, and dental benefits.',
                premiumAmount: 2499,
                coverageAmount: 500000,
                durationYears: 1,
                status: 'active',
                user: adminUser._id
            },
            {
                policyName: 'Family Health Plus',
                policyType: 'Health',
                description: 'Family floater health insurance covering spouse, children, and parents.',
                premiumAmount: 4999,
                coverageAmount: 1000000,
                durationYears: 1,
                status: 'active',
                user: adminUser._id
            },
            {
                policyName: 'Term Life Secure',
                policyType: 'Life',
                description: 'Pure term insurance with death benefit and accidental death coverage.',
                premiumAmount: 1999,
                coverageAmount: 5000000,
                durationYears: 1,
                status: 'active',
                user: adminUser._id
            },
            {
                policyName: 'Life Long Savings',
                policyType: 'Life',
                description: 'Money-back life insurance with investment benefits.',
                premiumAmount: 3999,
                coverageAmount: 2000000,
                durationYears: 1,
                status: 'active',
                user: adminUser._id
            },
            {
                policyName: ' vehicle Comprehensive',
                policyType: 'Vehicle',
                description: 'Full coverage vehicle insurance with zero depreciation and engine protector.',
                premiumAmount: 4999,
                coverageAmount: 750000,
                durationYears: 1,
                status: 'active',
                user: adminUser._id
            },
            {
                policyName: 'Two Wheeler Super',
                policyType: 'Vehicle',
                description: 'Comprehensive two-wheeler insurance with accident cover and theft protection.',
                premiumAmount: 1499,
                coverageAmount: 100000,
                durationYears: 1,
                status: 'active',
                user: adminUser._id
            },
            {
                policyName: 'Home Secure Policy',
                policyType: 'Home',
                description: 'Home insurance covering structure, contents, and liability.',
                premiumAmount: 2999,
                coverageAmount: 500000,
                durationYears: 1,
                status: 'active',
                user: adminUser._id
            },
            {
                policyName: 'Home Premium Shield',
                policyType: 'Home',
                description: 'Premium home insurance with natural disaster and theft coverage.',
                premiumAmount: 5999,
                coverageAmount: 1000000,
                durationYears: 1,
                status: 'active',
                user: adminUser._id
            },
            {
                policyName: 'Travel Elite',
                policyType: 'Travel',
                description: 'International travel insurance with medical evacuation and trip cancellation.',
                premiumAmount: 999,
                coverageAmount: 500000,
                durationYears: 1,
                status: 'active',
                user: adminUser._id
            },
            {
                policyName: 'Travel Basic',
                policyType: 'Travel',
                description: 'Domestic travel insurance for short trips.',
                premiumAmount: 399,
                coverageAmount: 100000,
                durationYears: 1,
                status: 'active',
                user: adminUser._id
            }
        ];

        // Clear existing policies (optional - comment out to keep existing)
        // await Policy.deleteMany({});
        // console.log('🗑️ Cleared existing policies');

        let createdCount = 0;
        for (const policyData of samplePolicies) {
            const exists = await Policy.findOne({ 
                policyName: policyData.policyName,
                policyType: policyData.policyType
            });
            
            if (!exists) {
                await Policy.create(policyData);
                console.log(`✅ Created: ${policyData.policyName} (${policyData.policyType})`);
                createdCount++;
            } else {
                console.log(`⏭️ Skipped (already exists): ${policyData.policyName}`);
            }
        }

        // Show count
        const totalPolicies = await Policy.countDocuments({ status: 'active' });
        console.log(`\n📊 Total active policies in database: ${totalPolicies}`);
        
        console.log('\n✨ Policy Seeding Complete!');
        process.exit();
    } catch (error) {
        console.error(`Error: ${error.message}`);
        process.exit(1);
    }
};

seedPolicies();