const jwt = require('jsonwebtoken');
const asyncHandler = require('express-async-handler');
const User = require('../models/User');

const protect = asyncHandler(async (req, res, next) => {
    let token;

    // Priority 1: Authorization Header (Bearer Token) - Required for project rules
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
    }
    // Priority 2: Cookies (Fallback for session persistence if needed)
    else if (req.cookies.token && req.cookies.token !== 'none') {
        token = req.cookies.token;
    }

    if (!token || token === 'undefined' || token === 'null') {
        res.status(401);
        throw new Error('Not authorized to access this route. Please login.');
    }

    try {
        const jwtSecret = process.env.JWT_SECRET;
        if (!jwtSecret) {
            throw new Error('JWT_SECRET is not defined in environment variables');
        }
        const decoded = jwt.verify(token, jwtSecret);
        req.user = await User.findById(decoded.id).select('-password');
        
        if (!req.user) {
            res.cookie('token', 'none', { expires: new Date(Date.now() + 10 * 1000), httpOnly: true });
            res.status(401);
            throw new Error('User account no longer exists. Please login again.');
        }

        // BUG FIX: Check if user was suspended after they got their token
        if (req.user.status === 'suspended') {
            res.cookie('token', 'none', { expires: new Date(Date.now() + 10 * 1000), httpOnly: true });
            res.status(403);
            throw new Error('Your account has been suspended. Session terminated.');
        }

        // BUG FIX: Ensure unverified users can't access business logic routes.
        // We allow '/me' so the frontend can retrieve the 'isVerified: false' status.
        const isAuthMe = req.originalUrl.includes('/auth/me');
        if (!req.user.isVerified && !isAuthMe) {
            res.status(403);
            throw new Error('Email verification required to access this feature.');
        }

        next();
    } catch (error) {
        // BUG FIX: Don't swallow the original JWT error. Re-throw it so asyncHandler
        // can surface the real reason (TokenExpiredError, JsonWebTokenError, etc.).
        // Only wrap it in a user-friendly message, but preserve context in logs.
        if (error.message === 'User account no longer exists. Please login again.') {
            throw error; // already user-friendly
        }
        console.error('JWT Verification failed:', error.name, error.message);
        res.cookie('token', 'none', { expires: new Date(Date.now() + 10 * 1000), httpOnly: true });
        const isExpired = error.name === 'TokenExpiredError';
        res.status(401);
        throw new Error(isExpired ? 'Session expired. Please login again.' : 'Invalid token. Please login again.');
    }
});

const authorize = (...roles) => {
    return (req, res, next) => {
        // Prevent access to standard dashboard for admins etc and vice versa
        if (!roles.includes(req.user.role)) {
            res.status(403);
            throw new Error(`Access Denied: ${req.user.role} role cannot access this area.`);
        }
        next();
    };
};

module.exports = { protect, authorize };
