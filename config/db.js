const mongoose = require('mongoose');

const connectDB = async () => {
    // BUG FIX #1: Validate MONGO_URI early — without this the error from mongoose
    // is "The `uri` parameter to `openUri()` must be a string" which is confusing.
    if (!process.env.MONGO_URI) {
        console.error('FATAL: MONGO_URI environment variable is not set.');
        process.exit(1);
    }

    try {
        const conn = await mongoose.connect(process.env.MONGO_URI, {
            // BUG FIX #2: Without serverSelectionTimeoutMS the default is 30s,
            // causing the server startup to hang silently on Render's free tier.
            serverSelectionTimeoutMS: 10000,
            // BUG FIX #3: socketTimeoutMS prevents long-idle connections from
            // causing silent query hangs (common with Atlas M0 free tier).
            socketTimeoutMS: 45000,
        });

        console.log(`✅ MongoDB Connected: ${conn.connection.host}`);

        // BUG FIX #4: Log disconnects so they are visible in Render logs.
        // Atlas M0 free clusters drop connections after ~10 min of inactivity.
        // Mongoose will auto-reconnect, but without these events it's invisible.
        mongoose.connection.on('disconnected', () => {
            console.warn('⚠️  MongoDB disconnected. Mongoose will attempt to reconnect...');
        });

        mongoose.connection.on('reconnected', () => {
            console.log('✅ MongoDB reconnected successfully.');
        });

        mongoose.connection.on('error', (err) => {
            console.error('❌ MongoDB connection error:', err.message);
        });

    } catch (error) {
        console.error(`❌ MongoDB connection failed: ${error.message}`);
        process.exit(1);
    }
};

module.exports = connectDB;
