const express = require('express');
const router = express.Router();
const {
    createPolicy,
    getPolicies,
    getPolicyById,
    getAvailablePolicies
} = require('../controllers/policyController');
const { protect } = require('../middleware/authMiddleware');

router.route('/')
    .post(protect, createPolicy)
    .get(protect, getPolicies);

router.route('/available')
    .get(getAvailablePolicies);

router.route('/:id')
    .get(protect, getPolicyById);

module.exports = router;
