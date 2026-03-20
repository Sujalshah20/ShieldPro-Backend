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
const { policyValidation, statusValidation } = require('../middleware/validationMiddleware');

router.route('/')
    .post(protect, authorize('admin', 'agent'), policyValidation, createPolicy)
    .get(protect, getPolicies);

router.route('/available')
    .get(protect, getAvailablePolicies);

router.route('/:id')
    .get(protect, getPolicyById)
    .delete(protect, authorize('admin'), deletePolicy);

router.route('/:id/status')
    .put(protect, authorize('admin', 'agent'), statusValidation, updatePolicyStatus);

module.exports = router;
