const express = require('express');
const router = express.Router();
const { 
    getAgents, createAgent, updateAgentStatus, 
    getCustomers, reassignAgent, getInsights,
    exportTransactions, exportCommissions
} = require('../controllers/adminController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.use(protect);
router.use(authorize('admin'));

router.route('/agents').get(getAgents).post(createAgent);
router.route('/agents/:id/status').put(updateAgentStatus);
router.route('/customers').get(getCustomers);
router.route('/customers/:id/reassign').put(reassignAgent);
router.route('/insights').get(getInsights);
router.route('/export/transactions').get(exportTransactions);
router.route('/export/commissions').get(exportCommissions);

module.exports = router;
