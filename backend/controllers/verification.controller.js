const VerificationSession = require('../models/VerificationSession');
const VerificationRecord  = require('../models/VerificationRecord');
const User                = require('../models/User');
const { analyzeFrame, verifyFaceIdentity } = require('../services/aiProctoring.service');
const { verifyIDCard, scanEnvironment }    = require('../services/rekognition.service');
const logger              = require('../utils/logger');
const asyncHandler        = require('../utils/asyncHandler');
const AppError            = require('../utils/AppError');

/* ─────────────────────────────────────────────────────────────────
 * POST /api/verification/start
 * Creates a new VerificationSession and returns the sessionId.
 * ───────────────────────────────────────────────────────────────── */
exports.startSession = asyncHandler(async (req, res) => {
    const { examId } = req.body;
    if (!examId) throw new AppError('examId required.', 400, 'VALIDATION_FAILED');

    const session = await VerificationSession.create({
        studentId: req.user._id,
        examId:    examId
    });

    return res.status(201).json({ success: true, sessionId: session._id });
});

/* ─────────────────────────────────────────────────────────────────
 * POST /api/verification/id
 * Calls AWS Rekognition to check for valid text on the ID card.
 * ───────────────────────────────────────────────────────────────── */
exports.verifyId = asyncHandler(async (req, res) => {
    const { sessionId, idImage } = req.body;
    if (!sessionId || !idImage) throw new AppError('sessionId and idImage required.', 400, 'VALIDATION_FAILED');

    const session = await VerificationSession.findById(sessionId);
    if (!session) throw new AppError('Session not found.', 404, 'RESOURCE_NOT_FOUND');

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
});

/* ─────────────────────────────────────────────────────────────────
 * POST /api/verification/liveness
 * Calls Python /analyze-frame to detect faces and deepfakes.
 * ───────────────────────────────────────────────────────────────── */
exports.verifyLiveness = asyncHandler(async (req, res) => {
    const { sessionId, frameBase64, clientVerified } = req.body;
    if (!sessionId) throw new AppError('sessionId required.', 400, 'VALIDATION_FAILED');

    const session = await VerificationSession.findById(sessionId);
    if (!session) throw new AppError('Session not found.', 404, 'RESOURCE_NOT_FOUND');

    let passed = false;
    let aiResult = {};

    // If the client already confirmed via MediaPipe direction detection,
    // trust the client result and skip the (optional) deepfake AI call.
    if (clientVerified === true) {
        passed = true;
        aiResult = { clientVerified: true, faceDetected: true, deepfakeDetected: false };
    } else {
        if (!frameBase64) throw new AppError('frameBase64 required.', 400, 'VALIDATION_FAILED');
        aiResult = await analyzeFrame(frameBase64, sessionId);
        passed   = aiResult.faceDetected === true && aiResult.deepfakeDetected === false;
    }

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
});


/* ─────────────────────────────────────────────────────────────────
 * POST /api/verification/face
 * Calls Python /verify-face using stored User embedding.
 * Handles enrollment if no embedding exists.
 * ───────────────────────────────────────────────────────────────── */
exports.verifyFace = asyncHandler(async (req, res) => {
    const { sessionId, frameBase64 } = req.body;
    if (!sessionId || !frameBase64) throw new AppError('sessionId and frameBase64 required.', 400, 'VALIDATION_FAILED');

    const session = await VerificationSession.findById(sessionId);
    const user    = await User.findById(req.user._id);
    if (!session || !user) throw new AppError('Session/User not found.', 404, 'RESOURCE_NOT_FOUND');

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
});

/* ─────────────────────────────────────────────────────────────────
 * POST /api/verification/environment
 * Manual UI environment checks verification.
 * ───────────────────────────────────────────────────────────────── */
exports.verifyEnvironment = asyncHandler(async (req, res) => {
    const { sessionId, frameBase64 } = req.body;
    if (!sessionId) throw new AppError('sessionId required.', 400, 'VALIDATION_FAILED');

    const session = await VerificationSession.findById(sessionId);
    if (!session) throw new AppError('Session not found.', 404, 'RESOURCE_NOT_FOUND');

    // Run real environment scan via Rekognition DetectFaces + DetectLabels
    const scan = await scanEnvironment(frameBase64 || '');

    const {
        checks:   { lighting, alone, noDevices, background },
        allPassed,
        details,
    } = scan;

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
        details:    { lighting, alone, noDevices, background, ...details },
    });

    return res.status(200).json({
        success:   true,
        passed:    allPassed,
        checks:    { lighting, alone, noDevices, background },
        details,
    });
});

/* ─────────────────────────────────────────────────────────────────
 * GET /api/verification/status/:sessionId
 * Returns the session state.
 * ───────────────────────────────────────────────────────────────── */
exports.getSessionStatus = asyncHandler(async (req, res) => {
    const session = await VerificationSession.findById(req.params.sessionId);
    if (!session) throw new AppError('Session not found.', 404, 'RESOURCE_NOT_FOUND');
    
    return res.status(200).json({ success: true, data: session });
});
