const express = require('express');
const router  = express.Router();

const {
    startSession,
    endSession,
    flagEvent,
    analyzeFrame,
    updateBehavioral,
    getReport,
    getActiveSessions,
    reviewSession,
} = require('../controllers/proctoring.controller');

const { protect, authorize }   = require('../middleware/auth');
const { analyzeLimiter }       = require('../middleware/rateLimiters');

// All proctoring routes require authentication
router.use(protect);

// ── Student endpoints ──────────────────────────────────────────────────────
router.post('/start',                    authorize('student'), startSession);
router.post('/:sessionId/end',           authorize('student'), endSession);
router.post('/:sessionId/flag',          authorize('student'), flagEvent);
router.post('/:sessionId/analyze-frame', authorize('student'), analyzeLimiter, analyzeFrame);
router.post('/:sessionId/behavioral',    authorize('student'), updateBehavioral);

// ── Examiner / Admin endpoints ─────────────────────────────────────────────
router.get  ('/active',            authorize('examiner', 'admin'), getActiveSessions);
router.get  ('/:sessionId/report', authorize('examiner', 'admin'), getReport);
router.patch('/:sessionId/review', authorize('examiner', 'admin'), reviewSession);

module.exports = router;
