const express = require('express');
const router = express.Router();
const {
    fileClaim,
    getMyClaims,
    getAllClaims,
    updateClaimStatus,
    deleteClaim
} = require('../controllers/claimController');
const { protect, authorize } = require('../middleware/authMiddleware');
const { claimValidation, statusValidation } = require('../middleware/validationMiddleware');
const upload = require('../middleware/uploadMiddleware');

router.route('/')
    .post(protect, upload.array('documents', 5), claimValidation, fileClaim)
    .get(protect, getMyClaims);

router.route('/all')
    .get(protect, authorize('agent', 'admin'), getAllClaims);

router.route('/:id/status')
    .put(protect, authorize('agent', 'admin'), statusValidation, updateClaimStatus)
    .delete(protect, authorize('admin', 'agent'), deleteClaim);

module.exports = router;
