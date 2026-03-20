const express = require('express');
const router = express.Router();
const { getAdminStats, getAgentStats, getPublicStats } = require('../controllers/statsController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.get('/public', getPublicStats);
router.get('/admin', protect, authorize('admin'), getAdminStats);
router.get('/agent', protect, authorize('agent'), getAgentStats);

module.exports = router;
