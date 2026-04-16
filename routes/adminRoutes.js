const express = require('express');
const router = express.Router();
const { 
    getAgents, createAgent, updateAgentStatus, 
    getCustomers, reassignAgent, getInsights,
    exportTransactions, exportCommissions,
    getTransactions, getCommissions,
    updateCustomer, getAgentApplications,
    updateAgentApplicationStatus,
    getAdmins, createAdmin, deleteCustomer
} = require('../controllers/adminController');
const { updateClaimStatus, deleteClaim, getAllClaims: getClaims } = require('../controllers/claimController');
const { protect, authorize } = require('../middleware/authMiddleware');
const { statusValidation } = require('../middleware/validationMiddleware');

router.use(protect);
// Allow all admin roles for general admin routes
router.use(authorize('super-admin', 'admin', 'sub-admin'));

router.route('/agents').get(getAgents).post(createAgent);
router.route('/agents/:id/status').put(statusValidation, updateAgentStatus).patch(statusValidation, updateAgentStatus);
router.route('/customers').get(getCustomers);
router.route('/customers/:id').put(updateCustomer).patch(updateCustomer).delete(deleteCustomer);
router.route('/customers/update/:id').put(updateCustomer).patch(updateCustomer); 
router.route('/users').get(getCustomers); 
router.route('/users/:id').put(updateCustomer).patch(updateCustomer); 
router.route('/claims').get(getClaims);
router.route('/claims/:id/status').put(updateClaimStatus).patch(updateClaimStatus);
router.route('/claims/:id').delete(deleteClaim);
router.route('/transactions').get(getTransactions);
router.route('/commissions').get(getCommissions);
router.route('/insights').get(getInsights);
router.route('/export/transactions').get(exportTransactions);
router.route('/export/commissions').get(exportCommissions);

// Agent Applications
router.route('/agent-applications').get(getAgentApplications);
router.route('/agent-applications/:id/status').put(updateAgentApplicationStatus);

// Admin Management (Super Admin ONLY)
router.route('/admins').get(authorize('super-admin'), getAdmins).post(authorize('super-admin'), createAdmin);

module.exports = router;
