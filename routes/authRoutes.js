const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const { registerUser, loginUser, forgotPassword, verifyEmail, resetPassword } = require('../controllers/authController');
const { validateRegister, validateLogin } = require('../middleware/authValidator');

// Rate limiting for login (5 attempts per 15 minutes per IP)
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // block after 5 requests
    message: { message: 'Too many login attempts from this IP, please try again after 15 minutes' },
    standardHeaders: true,
    legacyHeaders: false,
});

router.post('/register', validateRegister, registerUser);
router.post('/login', loginLimiter, validateLogin, loginUser);
router.post('/forgot-password', forgotPassword);
router.get('/verify/:token', verifyEmail);
router.post('/reset-password/:token', resetPassword);

module.exports = router;
