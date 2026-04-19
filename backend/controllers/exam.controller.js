/**
 * controllers/exam.controller.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Exam CRUD + publish + stats for HawkWatch.
 *
 * Routes (all prefixed /api/exams):
 *   GET    /stats        — dashboard aggregate counts
 *   GET    /             — list (role-filtered)
 *   POST   /             — create (examiner | admin)
 *   GET    /:id          — single exam
 *   PUT    /:id          — update (owner examiner | admin)
 *   DELETE /:id          — delete (admin only — hard delete)
 *   PATCH  /:id/publish  — publish (owner examiner | admin)
 *   POST   /start        — student: begin exam attempt
 *   POST   /submit       — student: submit answers
 * ─────────────────────────────────────────────────────────────────────────────
 */

const Exam                = require('../models/Exam');
const ExamAttempt         = require('../models/ExamAttempt');
const StudentExamSession  = require('../models/StudentExamSession');
const VerificationSession = require('../models/VerificationSession');
const logger              = require('../utils/logger');
const asyncHandler        = require('../utils/asyncHandler');
const AppError            = require('../utils/AppError');

/* ─── Helpers ────────────────────────────────────────────────────────────── */

const toObjectId = (id) => {
    const mongoose = require('mongoose');
    return mongoose.Types.ObjectId.isValid(id) ? new mongoose.Types.ObjectId(id) : undefined;
};

/* ─────────────────────────────────────────────────────────────────────────
 * GET /api/exams/stats
 * @access  Private — examiner/admin see own stats; student sees personal stats
 * ───────────────────────────────────────────────────────────────────────── */
const getStats = asyncHandler(async (req, res) => {
    const { role, _id } = req.user;

    if (role === 'student') {
        const [total, passed] = await Promise.all([
            ExamAttempt.countDocuments({ student: _id }),
            ExamAttempt.countDocuments({ student: _id, passed: true }),
        ]);
        return res.status(200).json({
            success: true,
            data: { total, passed, failed: total - passed, published: 0, draft: 0, active: 0 },
        });
    }

    const examinerId = role === 'examiner' ? _id : null;
    const stats = await Exam.getStats(examinerId);

    return res.status(200).json({ success: true, data: stats });
});

/* ─────────────────────────────────────────────────────────────────────────
 * GET /api/exams/history
 * @access  Private — student only
 * ───────────────────────────────────────────────────────────────────────── */
const getHistory = asyncHandler(async (req, res) => {
    if (req.user.role !== 'student') {
        throw new AppError('Only students have an exam history.', 403, 'ACCESS_DENIED');
    }

    const history = await ExamAttempt.find({ student: req.user._id })
        .populate('exam', 'title duration questions totalMarks status')
        .sort({ createdAt: -1 })
        .lean();

    return res.status(200).json({ success: true, count: history.length, data: history });
});

/* ─────────────────────────────────────────────────────────────────────────
 * GET /api/exams
 * @access  Private — role-filtered
 * ───────────────────────────────────────────────────────────────────────── */
const getExams = asyncHandler(async (req, res) => {
    const filter = {};
    const { role, _id } = req.user;

    if (role === 'student') {
        filter.status = 'published';
        filter.$or = [
            { accessType: 'public' },
            { accessType: 'organization', organization: req.user.organization }
        ];
    }
    if (role === 'examiner') filter.createdBy = _id;

    if (req.query.status && role !== 'student') filter.status = req.query.status;
    if (req.query.search) {
        filter.title = { $regex: req.query.search, $options: 'i' };
    }

    const exams = await Exam.find(filter)
        .populate('createdBy', 'name email')
        .sort({ createdAt: -1 })
        .lean();

    return res.status(200).json({ success: true, count: exams.length, data: exams });
});

/* ─────────────────────────────────────────────────────────────────────────
 * GET /api/exams/:id
 * @access  Private
 * ───────────────────────────────────────────────────────────────────────── */
const getExam = asyncHandler(async (req, res) => {
    const exam = await Exam.findById(req.params.id).populate('createdBy', 'name email');
    if (!exam) {
        throw new AppError('Exam not found.', 404, 'RESOURCE_NOT_FOUND');
    }

    if (req.user.role === 'student' && !['published', 'active'].includes(exam.status)) {
        throw new AppError('This exam is not currently available.', 403, 'ACCESS_DENIED');
    }

    if (
        req.user.role === 'examiner' &&
        exam.status === 'draft' &&
        exam.createdBy._id.toString() !== req.user._id.toString()
    ) {
        throw new AppError('Access denied.', 403, 'ACCESS_DENIED');
    }

    return res.status(200).json({ success: true, data: exam });
});

/* ─────────────────────────────────────────────────────────────────────────
 * POST /api/exams
 * @access  Private (examiner | admin)
 * ───────────────────────────────────────────────────────────────────────── */
const createExam = asyncHandler(async (req, res) => {
    const { title, description, instructions, duration, passingMarks, questions, proctoring, tags, category, accessType, organization } = req.body;

    if (!title?.trim()) {
        throw new AppError('Exam title is required.', 422, 'VALIDATION_FAILED');
    }
    if (!duration || duration < 5) {
        throw new AppError('Duration must be at least 5 minutes.', 422, 'VALIDATION_FAILED');
    }

    const exam = await Exam.create({
        title:        title.trim(),
        description,
        instructions,
        duration,
        passingMarks: passingMarks || 0,
        questions:    questions    || [],
        proctoring,
        tags,
        category,
        accessType: accessType || 'public',
        organization: accessType === 'organization' ? organization || req.user.organization : null,
        createdBy: req.user._id,
        status:    'draft',
    });

    logger.info(`[Exam] Created: "${exam.title}" by ${req.user.email}`);
    return res.status(201).json({ success: true, message: 'Exam created.', data: exam });
});

/* ─────────────────────────────────────────────────────────────────────────
 * PUT /api/exams/:id
 * @access  Private (owner examiner | admin)
 * ───────────────────────────────────────────────────────────────────────── */
const updateExam = asyncHandler(async (req, res) => {
    const exam = await Exam.findById(req.params.id);
    if (!exam) {
        throw new AppError('Exam not found.', 404, 'RESOURCE_NOT_FOUND');
    }

    if (req.user.role === 'examiner' && exam.createdBy.toString() !== req.user._id.toString()) {
        throw new AppError('Not authorised to edit this exam.', 403, 'ACCESS_DENIED');
    }

    if (['completed', 'archived'].includes(exam.status)) {
        throw new AppError(`Cannot edit a ${exam.status} exam.`, 409, 'CONFLICT');
    }

    const { status: _ignored, createdBy: _also, ...safeBody } = req.body;

    Object.assign(exam, safeBody);
    await exam.save();

    logger.info(`[Exam] Updated: "${exam.title}" by ${req.user.email}`);
    return res.status(200).json({ success: true, data: exam });
});

/* ─────────────────────────────────────────────────────────────────────────
 * DELETE /api/exams/:id
 * @access  Private (admin only — hard delete)
 * ───────────────────────────────────────────────────────────────────────── */
const deleteExam = asyncHandler(async (req, res) => {
    const exam = await Exam.findByIdAndDelete(req.params.id);
    if (!exam) {
        throw new AppError('Exam not found.', 404, 'RESOURCE_NOT_FOUND');
    }
    logger.info(`[Exam] Deleted: "${exam.title}" by ${req.user.email}`);
    return res.status(200).json({ success: true, message: 'Exam deleted successfully.' });
});

/* ─────────────────────────────────────────────────────────────────────────
 * PATCH /api/exams/:id/publish
 * @access  Private (owner examiner | admin)
 * ───────────────────────────────────────────────────────────────────────── */
const publishExam = asyncHandler(async (req, res) => {
    const exam = await Exam.findById(req.params.id);
    if (!exam) {
        throw new AppError('Exam not found.', 404, 'RESOURCE_NOT_FOUND');
    }

    if (req.user.role === 'examiner' && exam.createdBy.toString() !== req.user._id.toString()) {
        throw new AppError('Not authorised to publish this exam.', 403, 'ACCESS_DENIED');
    }

    if (exam.questions.length === 0) {
        throw new AppError('Cannot publish an exam with no questions. Add at least one question first.', 422, 'VALIDATION_FAILED');
    }

    if (exam.status === 'published') {
        throw new AppError('Exam is already published.', 409, 'CONFLICT');
    }

    exam.status = 'published';
    await exam.save();

    logger.info(`[Exam] Published: "${exam.title}" by ${req.user.email}`);
    return res.status(200).json({ success: true, message: 'Exam published successfully.', data: exam });
});

/* ─────────────────────────────────────────────────────────────────────────
 * POST /api/exams/start
 * @access  Private (student)
 * ───────────────────────────────────────────────────────────────────────── */
const startExam = asyncHandler(async (req, res) => {
    const { examId } = req.body;

    const verifySession = await VerificationSession.findOne({
        studentId:       req.user._id,
        examId,
        idVerified:      true,
        faceMatched:     true,
        livenessPassed:  true,
        environmentSafe: true,
    }).sort({ createdAt: -1 });

    if (!verifySession) {
        throw new AppError('Verification incomplete or failed. Complete the full verification flow before starting.', 403, 'VERIFICATION_FAILED');
    }

    const existing = await StudentExamSession.findOne({
        studentId:    req.user._id,
        examId,
        endTimestamp: { $exists: false },
    });
    if (existing) {
        return res.status(200).json({ success: true, data: existing, message: 'Resumed existing session.' });
    }

    const session = await StudentExamSession.create({
        studentId: req.user._id,
        examId,
        answers:   [],
    });

    return res.status(201).json({ success: true, data: session });
});

/* ─────────────────────────────────────────────────────────────────────────
 * POST /api/exams/:id/save-answer
 * @access  Private (student)
 * ───────────────────────────────────────────────────────────────────────── */
const saveAnswer = asyncHandler(async (req, res) => {
    const { questionId, answer } = req.body;
    const examId = req.params.id;

    const session = await StudentExamSession.findOne({
        studentId: req.user._id,
        examId,
        endTimestamp: { $exists: false },
    });

    if (!session) {
        throw new AppError('Active exam session not found.', 404, 'RESOURCE_NOT_FOUND');
    }

    const existingIdx = session.answers.findIndex(a => a.questionId.toString() === questionId.toString());
    if (existingIdx !== -1) {
        session.answers[existingIdx].answer = answer;
    } else {
        session.answers.push({ questionId, answer });
    }
    await session.save();

    return res.status(200).json({ success: true });
});

/* ─────────────────────────────────────────────────────────────────────────
 * GET /api/exams/session/:examId
 * @access  Private (student)
 * ───────────────────────────────────────────────────────────────────────── */
const getExamSession = asyncHandler(async (req, res) => {
    const session = await StudentExamSession.findOne({
        studentId: req.user._id,
        examId: req.params.examId,
        endTimestamp: { $exists: false },
    });

    if (!session) {
        throw new AppError('Active exam session not found.', 404, 'RESOURCE_NOT_FOUND');
    }

    return res.status(200).json({ success: true, data: session });
});

/* ─────────────────────────────────────────────────────────────────────────
 * POST /api/exams/submit
 * @access  Private (student)
 * ───────────────────────────────────────────────────────────────────────── */
const submitExam = asyncHandler(async (req, res) => {
    const { examId, answers } = req.body;

    const session = await StudentExamSession.findOne({
        studentId: req.user._id,
        examId,
        endTimestamp: { $exists: false },
    });
    
    if (!session) {
        throw new AppError('Active exam session not found.', 404, 'RESOURCE_NOT_FOUND');
    }

    const exam = await Exam.findById(examId);
    if (!exam) throw new AppError('Exam logic missing.', 404, 'RESOURCE_NOT_FOUND');

    let normalizedAnswers = [];
    if (Array.isArray(answers) && answers[0] && Array.isArray(answers[0])) {
        normalizedAnswers = answers.map(([qId, ans]) => ({ questionId: qId, answer: ans }));
    } else if (Array.isArray(answers)) {
        normalizedAnswers = answers;
    }

    let totalScore = 0;
    const processedAnswers = [];

    for (const q of exam.questions) {
        const studentAns = normalizedAnswers.find(a => a.questionId.toString() === q._id.toString());
        let isCorrect = false;
        let earned = 0;

        if (studentAns && studentAns.answer !== undefined && studentAns.answer !== null) {
            if (q.type === 'mcq') {
                if (String(studentAns.answer) === String(q.correctAnswer)) {
                    isCorrect = true;
                    earned = q.points || 1;
                }
            }
        }

        totalScore += earned;
        processedAnswers.push({
            question: q._id,
            answer: studentAns ? studentAns.answer : null,
            isCorrect,
            pointsAwarded: earned,
            timeTaken: 0, 
        });
    }

    const percentage = parseFloat(((totalScore / exam.totalMarks) * 100).toFixed(2));
    const passed = totalScore >= exam.passingMarks;

    session.endTimestamp = Date.now();
    session.answers = normalizedAnswers;
    await session.save();

    const timeTaken = Math.round((session.endTimestamp - session.startTimestamp) / 1000);

    const attempt = await ExamAttempt.create({
        exam: examId,
        student: req.user._id,
        answers: processedAnswers,
        score: totalScore,
        percentage,
        passed,
        status: 'submitted',
        startedAt: session.startTimestamp,
        submittedAt: Date.now(),
    });

    return res.status(200).json({ 
        success: true, 
        data: { 
            attemptId: attempt._id,
            score: totalScore, 
            totalMarks: exam.totalMarks, 
            percentage, 
            passed, 
            timeTaken 
        }, 
        message: 'Exam submitted successfully.' 
    });
});

/* ─────────────────────────────────────────────────────────────────────────
 * GET /api/exams/attempt/:id
 * @access  Private (student / examiner / admin)
 * ───────────────────────────────────────────────────────────────────────── */
const getExamAttempt = asyncHandler(async (req, res) => {
    const attempt = await ExamAttempt.findById(req.params.id).populate('exam');
    if (!attempt) throw new AppError('Attempt not found.', 404, 'RESOURCE_NOT_FOUND');
    if (req.user.role === 'student' && attempt.student.toString() !== req.user._id.toString()) {
        throw new AppError('Access denied.', 403, 'ACCESS_DENIED');
    }
    return res.status(200).json({ success: true, data: attempt });
});

module.exports = {
    getStats,
    getHistory,
    getExams,
    getExam,
    createExam,
    updateExam,
    deleteExam,
    publishExam,
    startExam,
    submitExam,
    saveAnswer,
    getExamSession,
    getExamAttempt
};
