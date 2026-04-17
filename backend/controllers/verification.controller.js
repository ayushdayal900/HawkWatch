const VerificationSession = require('../models/VerificationSession');
const VerificationRecord  = require('../models/VerificationRecord');
const User                = require('../models/User');
const { analyzeFrame, verifyFaceIdentity } = require('../services/aiProctoring.service');
const { verifyIDCard } = require('../services/rekognition.service');
const logger              = require('../utils/logger');

/* ─────────────────────────────────────────────────────────────────
 * POST /api/verification/start
 * Creates a new VerificationSession and returns the sessionId.
 * ───────────────────────────────────────────────────────────────── */
exports.startSession = async (req, res, next) => {
    try {
        const { examId } = req.body;
        if (!examId) return res.status(400).json({ success: false, message: 'examId required.' });

        const session = await VerificationSession.create({
            studentId: req.user._id,
            examId:    examId
        });

        return res.status(201).json({ success: true, sessionId: session._id });
    } catch (err) {
        next(err);
    }
};

/* ─────────────────────────────────────────────────────────────────
 * POST /api/verification/id
 * Calls AWS Rekognition to check for valid text on the ID card.
 * ───────────────────────────────────────────────────────────────── */
exports.verifyId = async (req, res, next) => {
    try {
        const { sessionId, idImage } = req.body;
        if (!sessionId || !idImage) return res.status(400).json({ success: false, message: 'sessionId and idImage required.' });

        const session = await VerificationSession.findById(sessionId);
        if (!session) return res.status(404).json({ success: false, message: 'Session not found.' });

        const aiResult = await verifyIDCard(idImage);

        if (aiResult.verified) {
            session.idVerified = true;
            await session.save();
        }

        await VerificationRecord.create({
            sessionId,
            studentId:  session.studentId,
            examId:     session.examId,
            step:       'id',
            passed:     aiResult.verified,
            confidence: aiResult.confidence,
            details:    aiResult
        });

        return res.status(200).json({ 
            success: aiResult.verified, 
            message: aiResult.message,
            confidence: aiResult.confidence
        });
    } catch (err) {
        next(err);
    }
};

/* ─────────────────────────────────────────────────────────────────
 * POST /api/verification/liveness
 * Calls Python /analyze-frame to detect faces and deepfakes.
 * ───────────────────────────────────────────────────────────────── */
exports.verifyLiveness = async (req, res, next) => {
    try {
        const { sessionId, frameBase64 } = req.body;
        if (!sessionId || !frameBase64) return res.status(400).json({ success: false, message: 'sessionId and frameBase64 required.' });

        const session = await VerificationSession.findById(sessionId);
        if (!session) return res.status(404).json({ success: false, message: 'Session not found.' });

        const aiResult = await analyzeFrame(frameBase64, sessionId);
        const passed   = aiResult.faceDetected === true && aiResult.deepfakeDetected === false;

        if (passed) {
            session.livenessPassed = true;
            await session.save();
        }

        await VerificationRecord.create({
            sessionId,
            studentId:  session.studentId,
            examId:     session.examId,
            step:       'liveness',
            passed,
            confidence: passed ? (1.0 - (aiResult.deepfakeScore || 0)) * 100 : 0,
            details:    aiResult
        });

        return res.status(200).json({
            success: true,
            passed,
            faceDetected:     aiResult.faceDetected,
            deepfakeDetected: aiResult.deepfakeDetected
        });
    } catch (err) {
        next(err);
    }
};

/* ─────────────────────────────────────────────────────────────────
 * POST /api/verification/face
 * Calls Python /verify-face using stored User embedding.
 * Handles enrollment if no embedding exists.
 * ───────────────────────────────────────────────────────────────── */
exports.verifyFace = async (req, res, next) => {
    try {
        const { sessionId, frameBase64 } = req.body;
        if (!sessionId || !frameBase64) return res.status(400).json({ success: false, message: 'sessionId and frameBase64 required.' });

        const session = await VerificationSession.findById(sessionId);
        const user    = await User.findById(req.user._id);
        if (!session || !user) return res.status(404).json({ success: false, message: 'Session/User not found.' });

        let passed = false;
        let confidence = 0;
        let details = {};

        // ENROLLMENT FLOW (First-time user)
        if (!user.faceEmbedding || !user.faceEmbedding.vector || user.faceEmbedding.vector.length === 0) {
            logger.info(`[Verification] Enrolling new face embedding for user ${user._id}`);
            
            const enrollVector = await require('../services/aiProctoring.service').enrollFaceIdentity(frameBase64);
            
            user.faceEmbedding = {
                vector: enrollVector,
                capturedAt: new Date()
            };
            await user.save();
            
            passed = true;
            confidence = 100.0;
            details = { enrollment: true };
            
            session.faceMatched = true;
            await session.save();
        } 
        // VERIFICATION FLOW
        else {
            const enrollVector = user.faceEmbedding.vector;
            const aiResult     = await verifyFaceIdentity(frameBase64, enrollVector);
            
            // Check threshold logic
            passed = aiResult.match === true && (aiResult.similarity >= 0.75 || aiResult.similarity >= 75); // Handling decimal or percentage
            confidence = aiResult.similarity > 1 ? aiResult.similarity : aiResult.similarity * 100;
            details = aiResult;

            if (passed) {
                session.faceMatched = true;
                await session.save();
            }
        }

        await VerificationRecord.create({
            sessionId,
            studentId:  session.studentId,
            examId:     session.examId,
            step:       'face',
            passed,
            confidence,
            details
        });

        return res.status(200).json({ success: true, passed, confidence });
    } catch (err) {
        next(err);
    }
};

/* ─────────────────────────────────────────────────────────────────
 * POST /api/verification/environment
 * Manual UI environment checks verification.
 * ───────────────────────────────────────────────────────────────── */
exports.verifyEnvironment = async (req, res, next) => {
    try {
        const { sessionId, checks } = req.body;
        if (!sessionId || !checks) return res.status(400).json({ success: false, message: 'sessionId and checks required.' });

        const session = await VerificationSession.findById(sessionId);
        if (!session) return res.status(404).json({ success: false, message: 'Session not found.' });

        // checks is expected to be an object e.g., { microphone: true, fullscreen: true, alone: true }
        const allPassed = Object.values(checks).every(val => val === true);

        if (allPassed) {
            session.environmentSafe = true;
            await session.save();
        }

        await VerificationRecord.create({
            sessionId,
            studentId:  session.studentId,
            examId:     session.examId,
            step:       'environment',
            passed:     allPassed,
            confidence: allPassed ? 100 : 0,
            details:    checks
        });

        return res.status(200).json({ success: true, passed: allPassed });
    } catch (err) {
        next(err);
    }
};

/* ─────────────────────────────────────────────────────────────────
 * GET /api/verification/status/:sessionId
 * Returns the session state.
 * ───────────────────────────────────────────────────────────────── */
exports.getSessionStatus = async (req, res, next) => {
    try {
        const session = await VerificationSession.findById(req.params.sessionId);
        if (!session) return res.status(404).json({ success: false, message: 'Session not found.' });
        
        return res.status(200).json({ success: true, data: session });
    } catch (err) {
        next(err);
    }
};
