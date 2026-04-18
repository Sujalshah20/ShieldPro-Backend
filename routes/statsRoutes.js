const express = require('express');
const router = express.Router();
const { getAdminStats, getAgentStats, getPublicStats } = require('../controllers/statsController');
const { protect, authorize } = require('../middleware/authMiddleware');

const cacheConfig = (req, res, next) => {
    res.set('Cache-Control', 'public, max-age=300, s-maxage=600'); // Cache for 5 mins
    next();
};

router.get('/public', cacheConfig, getPublicStats);
router.get('/admin', protect, authorize('admin'), getAdminStats);
router.get('/agent', protect, authorize('agent'), getAgentStats);

module.exports = router;
