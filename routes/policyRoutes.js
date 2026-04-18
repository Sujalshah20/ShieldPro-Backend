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

const cacheConfig = (req, res, next) => {
    res.set('Cache-Control', 'public, max-age=300, s-maxage=600'); // Cache for 5 mins
    next();
};

router.route('/available')
    .get(cacheConfig, getAvailablePolicies);

router.route('/:id')
    .get(protect, getPolicyById)
    .put(protect, authorize('admin'), policyValidation, updatePolicy)
    .patch(protect, authorize('admin'), updatePolicy)
    .delete(protect, authorize('admin', 'agent'), deletePolicy);

router.route('/:id/status')
    .put(protect, authorize('admin', 'agent'), statusValidation, updatePolicyStatus)
    .patch(protect, authorize('admin', 'agent'), statusValidation, updatePolicyStatus);

module.exports = router;
