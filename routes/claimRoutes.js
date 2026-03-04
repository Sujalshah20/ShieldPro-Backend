const express = require('express');
const router = express.Router();
const {
    fileClaim,
    getMyClaims,
    getAllClaims,
    updateClaimStatus
} = require('../controllers/claimController');
const { protect, authorize } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

router.route('/')
    .post(protect, upload.array('documents', 5), fileClaim)
    .get(protect, getMyClaims);

router.route('/all')
    .get(protect, authorize('agent', 'admin'), getAllClaims);

router.route('/:id/status')
    .put(protect, authorize('agent', 'admin'), updateClaimStatus);

module.exports = router;
