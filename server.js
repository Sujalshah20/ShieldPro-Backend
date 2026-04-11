const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const cookieParser = require('cookie-parser');

// Load env vars
const fs = require('fs');
const path = require('path');

const envPath = fs.existsSync('.env') ? '.env' : path.join(__dirname, '.env');
dotenv.config({ path: envPath });

const app = express();

// Middleware
app.use(helmet());
app.use(cors({
    origin: true, // Dynamically reflects origin. Fixes strict CORS issues on alternate dev ports/local IPs.
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: false }));
app.use(cookieParser());
app.use(mongoSanitize());
// app.use(xss()); // Temporarily disabled or moved below to prevent password corruption

// Static folder for uploads
app.use('/uploads', express.static('uploads'));

// Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/policies', require('./routes/policyRoutes'));
app.use('/api/user-policies', require('./routes/userPolicyRoutes'));
app.use('/api/claims', require('./routes/claimRoutes'));
app.use('/api/stats', require('./routes/statsRoutes'));
app.use('/api/transactions', require('./routes/transactionRoutes'));
app.use('/api/messages', require('./routes/messageRoutes'));
app.use('/api/applications', require('./routes/applicationRoutes'));
app.use('/api/public-forms', require('./routes/publicFormRoutes'));
// expose user profile endpoints
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/admin', require('./routes/adminRoutes'));
app.use('/api/agent', require('./routes/agentRoutes'));
app.use('/api/commissions', require('./routes/commissionRoutes'));
app.use('/api/notifications', require('./routes/notificationRoutes'));
app.use('/api/payments', require('./routes/paymentRoutes'));

// Root Route — MUST be registered before notFound middleware
app.get('/', (req, res) => {
    res.send('ShieldPro API is running...');
});

const { errorHandler, notFound } = require('./middleware/errorMiddleware');

// Error Middleware — must be last
app.use(notFound);
app.use(errorHandler);


const PORT = process.env.PORT || 5000;

// Connect to database first, then start server
const startServer = async () => {
    try {
        await connectDB();
        app.listen(PORT, () => {
            console.log(`Server started on port ${PORT}`);
            if (process.env.RAZORPAY_KEY_ID) {
                console.log(`Razorpay Gateway: ENABLED (${process.env.RAZORPAY_KEY_ID.substring(0, 8)}...)`);
            } else {
                console.warn('Razorpay Gateway: DISABLED (Key ID not found in .env)');
            }
        });
    } catch (error) {
        console.error('Failed to start server:', error.message);
        process.exit(1);
    }
};

startServer();