const express = require('express');
const router = express.Router();
const {
    createPolicy,
    getPolicies,
    getPolicyById,
    getAvailablePolicies,
    updatePolicyStatus,
    deletePolicy
} = require('../controllers/policyController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.route('/')
    .post(protect, authorize('admin', 'agent'), createPolicy)
    .get(protect, getPolicies);

router.route('/available')
    .get(protect, getAvailablePolicies);

router.route('/:id')
    .get(protect, getPolicyById)
    .delete(protect, authorize('admin'), deletePolicy);

router.route('/:id/status')
    .put(protect, authorize('admin', 'agent'), updatePolicyStatus);

module.exports = router;
