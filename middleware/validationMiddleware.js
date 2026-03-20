const { body, param, validationResult } = require('express-validator');

const validate = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    next();
};

const policyValidation = [
    body('policyName').trim().notEmpty().withMessage('Policy name is required'),
    body('policyType').isIn(['Life', 'Health', 'Vehicle', 'Home', 'Travel', 'Auto', 'Property']).withMessage('Invalid policy type'),
    body('premiumAmount').isNumeric().withMessage('Premium amount must be a number'),
    body('coverageAmount').isNumeric().withMessage('Coverage amount must be a number'),
    body('durationYears').isInt({ min: 1 }).withMessage('Duration must be at least 1 year'),
    validate
];

const claimValidation = [
    body('userPolicyId').isMongoId().withMessage('Invalid User Policy ID'),
    body('amount').isNumeric().withMessage('Amount must be a number'),
    body('description').trim().notEmpty().withMessage('Description is required'),
    validate
];

const applicationValidation = [
    body('customerId').optional().isMongoId().withMessage('Invalid Customer ID'),
    body('policyId').isMongoId().withMessage('Invalid Policy ID'),
    body('formData').isObject().withMessage('Form data is required'),
    validate
];

const statusValidation = [
    param('id').isMongoId().withMessage('Invalid ID'),
    body('status').notEmpty().withMessage('Status is required'),
    validate
];

module.exports = {
    policyValidation,
    claimValidation,
    applicationValidation,
    statusValidation
};
