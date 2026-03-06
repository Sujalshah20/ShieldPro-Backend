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
const { protect } = require('../middleware/authMiddleware');

router.route('/')
    .post(protect, createPolicy)
    .get(protect, getPolicies);

router.route('/available')
    .get(getAvailablePolicies);

router.route('/:id')
    .get(protect, getPolicyById)
    .delete(protect, deletePolicy);

router.route('/:id/status')
    .put(protect, updatePolicyStatus);

module.exports = router;
