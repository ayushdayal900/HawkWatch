/**
 * verification.routes.js
 * POST /api/verification/id-card  → verifyIdCard
 * POST /api/verification/face     → verifyFace
 * GET  /api/verification/record/:studentId → getVerificationRecord
 */

const express    = require('express');
const router     = express.Router();
const { protect, authorize } = require('../middleware/auth');
const {
    verifyIdCard,
    verifyFace,
    verifyFaceMatch,
    scanEnvironment,
    createVerificationSession,
    getVerificationRecord,
} = require('../controllers/verification.controller');

// All routes require authentication
router.use(protect);

// Students trigger these during the verification flow
router.post('/id-card', verifyIdCard);
router.post('/face',    verifyFace);
router.post('/face-match', verifyFaceMatch);
router.post('/environment-scan', scanEnvironment);
router.post('/session', createVerificationSession);

// Examiners / admins can view records
router.get('/record/:studentId', authorize('examiner', 'admin'), getVerificationRecord);

module.exports = router;
