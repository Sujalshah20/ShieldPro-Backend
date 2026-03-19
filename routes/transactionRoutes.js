const express = require('express');
const router = express.Router();
const { processPayment, getTransactions, getMyTransactions } = require('../controllers/transactionController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.post('/process', protect, processPayment);
router.get('/my', protect, getMyTransactions);
router.get('/', protect, authorize('admin'), getTransactions);

module.exports = router;
