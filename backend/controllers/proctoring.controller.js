const ProctoringSession = require('../models/ProctoringSession');
const ExamAttempt = require('../models/ExamAttempt');
const aiService = require('../services/aiProctoring.service');
const logger = require('../utils/logger');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');

// @route  POST /api/proctoring/start
// @access Private (student)
const startSession = asyncHandler(async (req, res) => {
    const { examId, attemptId } = req.body;

    // Check for existing active session
    const existing = await ProctoringSession.findOne({
        exam: examId,
        student: req.user._id,
        status: 'active',
    });
    if (existing) {
        return res.status(409).json({ success: false, message: 'Session already active.', sessionId: existing._id });
    }

    const session = await ProctoringSession.create({
        exam: examId,
        student: req.user._id,
        examAttempt: attemptId,
        status: 'active',
        startedAt: new Date(),
    });

    logger.info(`Proctoring session started: ${session._id} for student ${req.user._id}`);
    res.status(201).json({ success: true, data: session });
});

// @route  POST /api/proctoring/:sessionId/end
// @access Private (student)
const endSession = asyncHandler(async (req, res) => {
    const session = await ProctoringSession.findById(req.params.sessionId);
    if (!session) throw new AppError('Session not found.', 404, 'RESOURCE_NOT_FOUND');

    session.status = 'completed';
    session.endedAt = new Date();
    await session.save();

    logger.info(`Proctoring session ended: ${session._id}`);
    res.status(200).json({ success: true, data: session });
});

// @route  POST /api/proctoring/:sessionId/flag
// @access Private (student — sent from client AI detection)
const flagEvent = asyncHandler(async (req, res) => {
    const { type, severity, confidence, details, frameData } = req.body;
    const session = await ProctoringSession.findById(req.params.sessionId);
    if (!session) throw new AppError('Session not found.', 404, 'RESOURCE_NOT_FOUND');

    const flag = { type, severity, confidence, details, frameData, timestamp: new Date() };
    session.flags.push(flag);
    session.flagCount = session.flags.length;

    // Recompute risk score via AI service
    const riskScore = await aiService.computeRiskScore(session);
    session.riskScore = riskScore;

    // Auto-terminate if flag limit reached
    const exam = await require('../models/Exam').findById(session.exam).select('proctoring');
    if (exam?.proctoring?.flagThreshold && session.flagCount >= exam.proctoring.flagThreshold) {
        session.status = 'terminated';
        session.terminationReason = `Exceeded flag threshold (${exam.proctoring.flagThreshold} flags)`;
        session.endedAt = new Date();

        // Also auto-submit the exam attempt
        await ExamAttempt.findByIdAndUpdate(session.examAttempt, {
            status: 'terminated',
            submittedAt: new Date(),
        });

        logger.warn(`Session ${session._id} auto-terminated due to excessive flags.`);
    }

    await session.save();

    req.app.get('io').to(`proctor:${session._id}`).emit('flag-event', { 
        sessionId: session._id, flag, riskScore: session.riskScore, student: session.student 
    });

    res.status(200).json({ success: true, flagCount: session.flagCount, riskScore: session.riskScore });
});

// @route  POST /api/proctoring/:sessionId/analyze-frame
// @access Private (student)
const analyzeFrame = asyncHandler(async (req, res) => {
    const { frameBase64, timestamp } = req.body;
    const session = await ProctoringSession.findById(req.params.sessionId);
    if (!session) throw new AppError('Session not found.', 404, 'RESOURCE_NOT_FOUND');

    // Forward to AI microservice (MediaPipe + deepfake)
    const result = await aiService.analyzeFrame(frameBase64, session._id.toString());

    // Update session frame summary
    session.frameAnalysisSummary.totalFramesAnalyzed += 1;
    if (result.faceDetected) session.frameAnalysisSummary.faceDetectedFrames += 1;
    if (result.multipleFaces) session.frameAnalysisSummary.multipleFacesFrames += 1;
    if (!result.faceDetected) session.frameAnalysisSummary.faceAbsentFrames += 1;

    if (result.deepfakeScore !== undefined) {
        session.frameAnalysisSummary.deepfakeScores.push(result.deepfakeScore);
        const scores = session.frameAnalysisSummary.deepfakeScores;
        session.frameAnalysisSummary.avgDeepfakeScore =
            scores.reduce((a, b) => a + b, 0) / scores.length;
    }

    // Auto-flag based on AI result
    const flags = await aiService.generateFlags(result);
    for (const flag of flags) {
        session.flags.push({ ...flag, timestamp: new Date() });
        session.flagCount += 1;
    }

    // Recompute risk score based on new flags and frame analysis
    const riskScore = await aiService.computeRiskScore(session);
    session.riskScore = riskScore;

    await session.save();

    // Emit socket event if new flags were generated
    if (flags.length > 0) {
        const io = req.app.get('io');
        if (io) {
            io.to(`proctor:${session._id}`).emit('flag-event', { 
                sessionId: session._id, 
                flags, 
                riskScore: session.riskScore, 
                student: session.student 
            });
        }
    }

    res.status(200).json({ 
        success: true, 
        result, 
        flagsGenerated: flags.length,
        riskScore: session.riskScore
    });
});

// @route  POST /api/proctoring/:sessionId/behavioral
// @access Private (student)
const updateBehavioral = asyncHandler(async (req, res) => {
    const { typingRhythm, mouseDynamics } = req.body;
    const session = await ProctoringSession.findById(req.params.sessionId);
    if (!session) throw new AppError('Session not found.', 404, 'RESOURCE_NOT_FOUND');

    // Compute anomaly score via AI service
    const anomalyScore = await aiService.analyzeBehavior(
        typingRhythm,
        mouseDynamics,
        req.user.biometricBaseline
    );

    session.behavioralMetrics = {
        typingRhythm: {
            avgDwellTime: typingRhythm.avgDwellTime,
            avgFlightTime: typingRhythm.avgFlightTime,
            anomalyScore: anomalyScore.typing,
        },
        mouseDynamics: {
            avgSpeed: mouseDynamics.avgSpeed,
            curvatureIndex: mouseDynamics.curvatureIndex,
            anomalyScore: anomalyScore.mouse,
        },
        overallAnomalyScore: anomalyScore.overall,
    };

    await session.save();
    res.status(200).json({ success: true, anomalyScore });
});

/* ─────────────────────────────────────────────────────────────────────────
 * GET /api/proctoring/:sessionId/report
 * @access  Private (examiner, admin)
 * ───────────────────────────────────────────────────────────────────────── */
const getReport = asyncHandler(async (req, res) => {
    const session = await ProctoringSession.findById(req.params.sessionId)
        .populate('student', 'name email avatar')
        .populate('exam', 'title duration totalMarks')
        .populate('reviewedBy', 'name email');

    if (!session) throw new AppError('Session not found.', 404, 'RESOURCE_NOT_FOUND');
    res.status(200).json({ success: true, data: session });
});

/* ─────────────────────────────────────────────────────────────────────────
 * PATCH /api/proctoring/:sessionId/review
 * @access  Private (examiner, admin)
 * ───────────────────────────────────────────────────────────────────────── */
const reviewSession = asyncHandler(async (req, res) => {
    const { reviewNotes } = req.body;
    const session = await ProctoringSession.findById(req.params.sessionId);
    
    if (!session) throw new AppError('Session not found.', 404, 'RESOURCE_NOT_FOUND');

    session.reviewNotes = reviewNotes;
    session.reviewedBy = req.user._id;
    session.reviewedAt = Date.now();
    session.status = session.status === 'active' ? session.status : 'reviewed'; 
    
    await session.save();
    res.status(200).json({ success: true, data: session });
});

/* ─────────────────────────────────────────────────────────────────────────
 * GET /api/proctoring/active
 * @access  Private (examiner, admin)
 * ───────────────────────────────────────────────────────────────────────── */
const getActiveSessions = asyncHandler(async (req, res) => {
    const query = { status: 'active' };
    
    if (req.user.role === 'examiner') {
        const myExams = await require('../models/Exam').find({ createdBy: req.user._id }).select('_id');
        query.exam = { $in: myExams.map(e => e._id) };
    }

    const sessions = await ProctoringSession.find(query)
        .populate('student', 'name email avatar')
        .populate('exam', 'title')
        .sort({ riskScore: -1 });

    res.status(200).json({ success: true, count: sessions.length, data: sessions });
});

module.exports = { startSession, endSession, flagEvent, analyzeFrame, updateBehavioral, getReport, reviewSession, getActiveSessions };
