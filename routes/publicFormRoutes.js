const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const { 
    submitAgentApplication, 
    submitAdminAccessRequest 
} = require('../controllers/publicFormController');

// Rate limiting: maximum 5 requests per hour per IP to prevent spam on public forms
const formLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 5, 
    message: { message: 'Too many requests created from this IP, please try again after an hour' }
});

router.post('/agent-application', formLimiter, submitAgentApplication);
router.post('/admin-access', formLimiter, submitAdminAccessRequest);

module.exports = router;
