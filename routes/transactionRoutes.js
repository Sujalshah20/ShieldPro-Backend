const express = require('express');
const router = express.Router();
const { processPayment } = require('../controllers/transactionController');
const { protect } = require('../middleware/authMiddleware');

router.post('/process', protect, processPayment);

module.exports = router;
