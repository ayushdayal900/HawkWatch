const express = require('express');
const router = express.Router();
const {
    startSession, endSession, flagEvent, analyzeFrame, updateBehavioral, getReport,
} = require('../controllers/proctoring.controller');
const { protect, authorize } = require('../middleware/authMiddleware');

router.use(protect);

const rateLimit = require('express-rate-limit');
const analyzeLimiter = rateLimit({
    windowMs: 4000, 
    max: 1 // 1 request per 4 seconds
});

// Student endpoints
router.post('/start', authorize('student'), startSession);
router.post('/:sessionId/end', authorize('student'), endSession);
router.post('/:sessionId/flag', authorize('student'), flagEvent);
router.post('/:sessionId/analyze-frame', authorize('student'), analyzeLimiter, analyzeFrame);
router.post('/:sessionId/behavioral', authorize('student'), updateBehavioral);

// Examiner/Admin endpoints
router.get('/active', authorize('examiner', 'admin'), require('../controllers/proctoring.controller').getActiveSessions);
router.get('/:sessionId/report', authorize('examiner', 'admin'), getReport);
router.patch('/:sessionId/review', authorize('examiner', 'admin'), require('../controllers/proctoring.controller').reviewSession);

module.exports = router;
