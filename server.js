const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./config/db');

// Load env vars
dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

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

const { errorHandler, notFound } = require('./middleware/errorMiddleware');

// Root Route
app.get('/', (req, res) => {
    res.send('ShieldPro API is running...');
});

// Error Middleware
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

// Connect to database first, then start server
const startServer = async () => {
    try {
        await connectDB();
        app.listen(PORT, () => console.log(`Server started on port ${PORT}`));
    } catch (error) {
        console.error('Failed to start server:', error.message);
        process.exit(1);
    }
};

startServer();
