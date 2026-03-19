const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const { 
    registerUser, loginUser, logoutUser, getMe, oauthLogin, 
    forgotPassword, verifyEmail, resetPassword 
} = require('../controllers/authController');
const { validateRegister, validateLogin } = require('../middleware/authValidator');
const { protect } = require('../middleware/authMiddleware');

const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // block after 5 requests total (this limits spam requests regardless of account)
    message: { message: 'Too many login attempts from this IP, please try again after 15 minutes' },
    standardHeaders: true,
    legacyHeaders: false,
});

router.post('/register', validateRegister, registerUser);
router.post('/login', loginLimiter, validateLogin, loginUser);
router.post('/logout', protect, logoutUser);
router.get('/me', protect, getMe);
router.post('/oauth', oauthLogin);
router.post('/verify-otp', verifyOTP);
router.post('/forgot-password', forgotPassword);
router.get('/verify/:token', verifyEmail);
router.post('/reset-password', resetPassword);

module.exports = router;
