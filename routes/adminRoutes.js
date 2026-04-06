const express = require('express');
const router = express.Router();
const { 
    getAgents, createAgent, updateAgentStatus, 
    getCustomers, reassignAgent, getInsights,
    exportTransactions, exportCommissions,
    getClaims, getTransactions, getCommissions, updateClaimStatus, deleteClaim,
    updateCustomer
} = require('../controllers/adminController');
const { protect, authorize } = require('../middleware/authMiddleware');
const { statusValidation } = require('../middleware/validationMiddleware');

router.use(protect);
router.use(authorize('admin'));

router.route('/agents').get(getAgents).post(createAgent);
router.route('/agents/:id/status').put(statusValidation, updateAgentStatus).patch(statusValidation, updateAgentStatus);
router.route('/customers').get(getCustomers);
router.route('/customers/:id').put(updateCustomer).patch(updateCustomer);
router.route('/customers/update/:id').put(updateCustomer).patch(updateCustomer); // Alias for flexible frontend calls
router.route('/users').get(getCustomers); // Alias for frontend consistency
router.route('/users/:id').put(updateCustomer).patch(updateCustomer); // Alias for consistency
router.route('/claims').get(getClaims);
router.route('/claims/:id/status').put(updateClaimStatus).patch(updateClaimStatus);
router.route('/claims/:id').delete(deleteClaim);
router.route('/transactions').get(getTransactions);
router.route('/commissions').get(getCommissions);
router.route('/insights').get(getInsights);
router.route('/export/transactions').get(exportTransactions);
router.route('/export/commissions').get(exportCommissions);

module.exports = router;
