const { body, validationResult } = require('express-validator');

const validateRegister = [
    body('name')
        .trim()
        .isLength({ min: 3 })
        .withMessage('First Name must be at least 3 characters long'),
    body('email')
        .trim()
        .isEmail()
        .withMessage('Please provide a valid email address'),
    body('phone')
        .trim()
        .matches(/^[0-9]{10}$/)
        .withMessage('Phone number must be a valid 10-digit number'),
    body('password')
        .isLength({ min: 8 })
        .withMessage('Password must be at least 8 characters long')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/)
        .withMessage('Password must include 1 uppercase, 1 lowercase, 1 number, and 1 special character'),
    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        next();
    }
];

const validateLogin = [
    body('email')
        .trim()
        .isEmail()
        .withMessage('Please provide a valid email address'),
    body('password')
        .exists()
        .withMessage('Password is required'),
    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        next();
    }
];

module.exports = {
    validateRegister,
    validateLogin
};
