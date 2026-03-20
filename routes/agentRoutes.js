const express = require('express');
const router = express.Router();
const { 
    getAssignedCustomers, 
    applyOnBehalf, 
    getAgentApplications, 
    updateApplicationRemarks,
    getAgentCommissions,
    toggleApplicationFlag,
    recommendPolicy
} = require('../controllers/agentController');
const { protect, authorize } = require('../middleware/authMiddleware');
const { applicationValidation, statusValidation } = require('../middleware/validationMiddleware');

router.use(protect);
router.use(authorize('agent'));

router.get('/customers', getAssignedCustomers);
router.get('/applications', getAgentApplications);
router.put('/applications/:id/remarks', statusValidation, updateApplicationRemarks);
router.put('/applications/:id/flag', statusValidation, toggleApplicationFlag);
router.get('/commissions', getAgentCommissions);
router.post('/apply-on-behalf', applicationValidation, applyOnBehalf);
router.post('/recommend', recommendPolicy);

module.exports = router;
