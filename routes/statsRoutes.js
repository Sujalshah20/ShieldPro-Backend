const express = require('express');
const router = express.Router();
const { getAdminStats } = require('../controllers/statsController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.get('/admin', protect, authorize('admin'), getAdminStats);

module.exports = router;
