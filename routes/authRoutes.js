const express = require('express');
const router = express.Router();
const { registerUser, loginUser, forgotPassword, verifyEmail } = require('../controllers/authController');

router.post('/register', registerUser);
router.post('/login', loginUser);
router.post('/forgot-password', forgotPassword);
router.get('/verify/:token', verifyEmail);

module.exports = router;
