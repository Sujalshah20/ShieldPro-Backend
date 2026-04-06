const express = require('express');
const router = express.Router();
const {
    createPolicy,
    getPolicies,
    getPolicyById,
    getAvailablePolicies,
    updatePolicy,
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
    .put(protect, authorize('admin'), policyValidation, updatePolicy)
    .patch(protect, authorize('admin'), updatePolicy)
    .delete(protect, authorize('admin', 'agent'), deletePolicy);

router.route('/:id/status')
    .put(protect, authorize('admin', 'agent'), statusValidation, updatePolicyStatus)
    .patch(protect, authorize('admin', 'agent'), statusValidation, updatePolicyStatus);

module.exports = router;
