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

router.use(protect);
router.use(authorize('agent'));

router.get('/customers', getAssignedCustomers);
router.get('/applications', getAgentApplications);
router.put('/applications/:id/remarks', updateApplicationRemarks);
router.put('/applications/:id/flag', toggleApplicationFlag);
router.get('/commissions', getAgentCommissions);
router.post('/apply-on-behalf', applyOnBehalf);
router.post('/recommend', recommendPolicy);

module.exports = router;
