const jwt = require('jsonwebtoken');
const asyncHandler = require('express-async-handler');
const User = require('../models/User');

const protect = asyncHandler(async (req, res, next) => {
    let token;

    // Check if token exists in cookies instead of headers
    if (req.cookies.token && req.cookies.token !== 'none') {
        token = req.cookies.token;
    } 
    // Fallback for postman or old mobile apps
    else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
        res.status(401);
        throw new Error('Not authorized to access this route. Please login.');
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = await User.findById(decoded.id).select('-password');
        next();
    } catch (error) {
        res.status(401);
        throw new Error('Session expired or invalid token. Please login again.');
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
