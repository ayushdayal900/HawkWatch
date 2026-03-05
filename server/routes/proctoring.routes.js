const express = require('express');
const router = express.Router();
const {
    startSession, endSession, flagEvent, analyzeFrame, updateBehavioral, getReport,
} = require('../controllers/proctoring.controller');
const { protect, authorize } = require('../middleware/authMiddleware');

router.use(protect);

// Student endpoints
router.post('/start', authorize('student'), startSession);
router.post('/:sessionId/end', authorize('student'), endSession);
router.post('/:sessionId/flag', authorize('student'), flagEvent);
router.post('/:sessionId/analyze-frame', authorize('student'), analyzeFrame);
router.post('/:sessionId/behavioral', authorize('student'), updateBehavioral);

// Examiner/Admin endpoints
router.get('/:sessionId/report', authorize('examiner', 'admin'), getReport);

module.exports = router;
