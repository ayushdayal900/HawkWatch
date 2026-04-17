const express    = require('express');
const router     = express.Router();
const { protect } = require('../middleware/auth');
const {
    startSession,
    verifyId,
    verifyLiveness,
    verifyFace,
    verifyEnvironment,
    getSessionStatus,
} = require('../controllers/verification.controller');

// All verification routes require authentication
router.use(protect);

router.post('/start',       startSession);
router.post('/id',          verifyId);
router.post('/liveness',    verifyLiveness);
router.post('/face',        verifyFace);
router.post('/environment', verifyEnvironment);

router.get('/status/:sessionId', getSessionStatus);

module.exports = router;
