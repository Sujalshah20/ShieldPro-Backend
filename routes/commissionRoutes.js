const express = require('express');
const router = express.Router();
const { getAllCommissions, updateCommissionStatus } = require('../controllers/commissionController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.use(protect);
router.use(authorize('admin'));

router.get('/', getAllCommissions);
router.put('/:id/status', updateCommissionStatus);

module.exports = router;
