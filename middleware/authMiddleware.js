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
        const jwtSecret = process.env.JWT_SECRET || 'fallback_shieldpro_jwt_secret_key_2026';
        const decoded = jwt.verify(token, jwtSecret);
        req.user = await User.findById(decoded.id).select('-password');
        
        if (!req.user) {
            res.cookie('token', 'none', { expires: new Date(Date.now() + 10 * 1000), httpOnly: true });
            res.status(401);
            throw new Error('User account no longer exists. Please login again.');
        }

        next();
    } catch (error) {
        res.cookie('token', 'none', { expires: new Date(Date.now() + 10 * 1000), httpOnly: true });
        res.status(401);
        throw new Error('Session expired or invalid. Please login again.');
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
