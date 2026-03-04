const express = require('express');
const router = express.Router();
const {
    buyPolicy,
    getMyPolicies
} = require('../controllers/userPolicyController');
const { protect } = require('../middleware/authMiddleware');

router.route('/')
    .post(protect, buyPolicy)
    .get(protect, getMyPolicies);

module.exports = router;
