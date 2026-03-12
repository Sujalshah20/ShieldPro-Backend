const express = require('express');
const router = express.Router();
const { 
    submitApplication, 
    getMyApplications, 
    getAllApplications, 
    updateApplicationStatus 
} = require('../controllers/applicationController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.route('/')
    .post(protect, submitApplication)
    .get(protect, authorize('admin', 'agent'), getAllApplications);

router.get('/my', protect, getMyApplications);

router.put('/:id/status', protect, authorize('admin', 'agent'), updateApplicationStatus);

module.exports = router;
