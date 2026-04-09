const { body, validationResult } = require('express-validator');

const validateRegister = [
    body('name')
        .trim()
        .isLength({ min: 3, max: 50 })
        .withMessage('Name must be between 3 and 50 characters'),
    body('email')
        .trim()
        .normalizeEmail()
        .isEmail()
        .withMessage('Please provide a valid email address'),
    body('phone')
        .trim()
        .matches(/^[0-9]{10}$/)
        .withMessage('Phone number must be a valid 10-digit number'),
    body('password')
        .trim() // Trim only for validation check (to catch leading/trailing spaces as errors or just allow them)
        // Actually, we should allow spaces, but regex often fails them. 
        // For simplicity with Google Autofill, trimming at the boundaries is common.
        .isLength({ min: 8, max: 20 })
        .withMessage('Password must be 8-20 characters long')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/)
        .withMessage('Password must include 1 uppercase, 1 lowercase, 1 number, and 1 special character (@, $, !, %, *, ?, &)'),
    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ 
                message: errors.array()[0].msg, // Return the first error's message
                errors: errors.array() 
            });
        }
        next();
    }
];

const validateLogin = [
    body('email')
        .trim()
        .normalizeEmail()
        .isEmail()
        .withMessage('Please provide a valid email address'),
    body('password')
        .trim()
        .exists()
        .withMessage('Password is required'),
    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ 
                message: errors.array()[0].msg, 
                errors: errors.array() 
            });
        }
        next();
    }
];

const validateResetPassword = [
    body('email')
        .trim()
        .normalizeEmail()
        .isEmail()
        .withMessage('Please provide a valid email address'),
    body('otp')
        .isLength({ min: 6, max: 6 })
        .withMessage('OTP must be 6 digits'),
    body('password')
        .trim()
        .isLength({ min: 8, max: 20 })
        .withMessage('Password must be 8-20 characters long')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/)
        .withMessage('Password must include 1 uppercase, 1 lowercase, 1 number, and 1 special character'),
    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ 
                message: errors.array()[0].msg, 
                errors: errors.array() 
            });
        }
        next();
    }
];

module.exports = {
    validateRegister,
    validateLogin,
    validateResetPassword
};
