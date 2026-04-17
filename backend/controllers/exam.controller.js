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

/* ─── Helpers ────────────────────────────────────────────────────────────── */

/** Safely cast a string to mongoose ObjectId or return undefined */
const toObjectId = (id) => {
    const mongoose = require('mongoose');
    return mongoose.Types.ObjectId.isValid(id) ? new mongoose.Types.ObjectId(id) : undefined;
};

/* ─────────────────────────────────────────────────────────────────────────
 * GET /api/exams/stats
 * @access  Private — examiner/admin see own stats; student sees personal stats
 * ───────────────────────────────────────────────────────────────────────── */
const getStats = async (req, res, next) => {
    try {
        const { role, _id } = req.user;

        if (role === 'student') {
            // Return student's personal attempt history counts
            const [total, passed] = await Promise.all([
                ExamAttempt.countDocuments({ student: _id }),
                ExamAttempt.countDocuments({ student: _id, passed: true }),
            ]);
            return res.status(200).json({
                success: true,
                data: { total, passed, failed: total - passed, published: 0, draft: 0, active: 0 },
            });
        }

        // Examiner: scope to own exams; Admin: platform-wide
        const examinerId = role === 'examiner' ? _id : null;
        const stats = await Exam.getStats(examinerId);

        return res.status(200).json({ success: true, data: stats });
    } catch (err) {
        next(err);
    }
};

/* ─────────────────────────────────────────────────────────────────────────
 * GET /api/exams/history
 * @access  Private — student only
 * ───────────────────────────────────────────────────────────────────────── */
const getHistory = async (req, res, next) => {
    try {
        if (req.user.role !== 'student') {
            return res.status(403).json({ success: false, message: 'Only students have an exam history.' });
        }

        const history = await ExamAttempt.find({ student: req.user._id })
            .populate('exam', 'title duration questions totalMarks status')
            .sort({ createdAt: -1 })
            .lean();

        return res.status(200).json({ success: true, count: history.length, data: history });
    } catch (err) {
        next(err);
    }
};

/* ─────────────────────────────────────────────────────────────────────────
 * GET /api/exams
 * @access  Private — role-filtered
 * ───────────────────────────────────────────────────────────────────────── */
const getExams = async (req, res, next) => {
    try {
        const filter = {};
        const { role, _id } = req.user;

        if (role === 'student')  filter.status = 'published';
        if (role === 'examiner') filter.createdBy = _id;
        // admin: no filter — sees everything

        // Optional query filters from the client
        if (req.query.status && role !== 'student') filter.status = req.query.status;
        if (req.query.search) {
            filter.title = { $regex: req.query.search, $options: 'i' };
        }

        const exams = await Exam.find(filter)
            .populate('createdBy', 'name email')
            .sort({ createdAt: -1 })
            .lean();

        return res.status(200).json({ success: true, count: exams.length, data: exams });
    } catch (err) {
        next(err);
    }
};

/* ─────────────────────────────────────────────────────────────────────────
 * GET /api/exams/:id
 * @access  Private
 * ───────────────────────────────────────────────────────────────────────── */
const getExam = async (req, res, next) => {
    try {
        const exam = await Exam.findById(req.params.id).populate('createdBy', 'name email');
        if (!exam) {
            return res.status(404).json({ success: false, message: 'Exam not found.' });
        }

        // Students can only see published exams
        if (req.user.role === 'student' && !['published', 'active'].includes(exam.status)) {
            return res.status(403).json({ success: false, message: 'This exam is not currently available.' });
        }

        // Examiners can only see their own draft exams
        if (
            req.user.role === 'examiner' &&
            exam.status === 'draft' &&
            exam.createdBy._id.toString() !== req.user._id.toString()
        ) {
            return res.status(403).json({ success: false, message: 'Access denied.' });
        }

        return res.status(200).json({ success: true, data: exam });
    } catch (err) {
        if (err.name === 'CastError') {
            return res.status(404).json({ success: false, message: 'Exam not found.' });
        }
        next(err);
    }
};

/* ─────────────────────────────────────────────────────────────────────────
 * POST /api/exams
 * @access  Private (examiner | admin)
 * ───────────────────────────────────────────────────────────────────────── */
const createExam = async (req, res, next) => {
    try {
        const { title, description, instructions, duration, passingMarks, questions, proctoring, tags, category } = req.body;

        if (!title?.trim()) {
            return res.status(422).json({ success: false, message: 'Exam title is required.' });
        }
        if (!duration || duration < 5) {
            return res.status(422).json({ success: false, message: 'Duration must be at least 5 minutes.' });
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
            createdBy: req.user._id,
            status:    'draft',
        });

        logger.info(`[Exam] Created: "${exam.title}" by ${req.user.email}`);
        return res.status(201).json({ success: true, message: 'Exam created.', data: exam });
    } catch (err) {
        next(err);
    }
};

/* ─────────────────────────────────────────────────────────────────────────
 * PUT /api/exams/:id
 * @access  Private (owner examiner | admin)
 * ───────────────────────────────────────────────────────────────────────── */
const updateExam = async (req, res, next) => {
    try {
        const exam = await Exam.findById(req.params.id);
        if (!exam) {
            return res.status(404).json({ success: false, message: 'Exam not found.' });
        }

        if (req.user.role === 'examiner' && exam.createdBy.toString() !== req.user._id.toString()) {
            return res.status(403).json({ success: false, message: 'Not authorised to edit this exam.' });
        }

        // Cannot edit a completed or archived exam
        if (['completed', 'archived'].includes(exam.status)) {
            return res.status(409).json({ success: false, message: `Cannot edit a ${exam.status} exam.` });
        }

        // Prevent directly setting status through update — use PATCH /publish for that
        const { status: _ignored, createdBy: _also, ...safeBody } = req.body;

        Object.assign(exam, safeBody);
        await exam.save(); // triggers pre-save hook for totalMarks

        logger.info(`[Exam] Updated: "${exam.title}" by ${req.user.email}`);
        return res.status(200).json({ success: true, data: exam });
    } catch (err) {
        next(err);
    }
};

/* ─────────────────────────────────────────────────────────────────────────
 * DELETE /api/exams/:id
 * @access  Private (admin only — hard delete)
 * ───────────────────────────────────────────────────────────────────────── */
const deleteExam = async (req, res, next) => {
    try {
        const exam = await Exam.findByIdAndDelete(req.params.id);
        if (!exam) {
            return res.status(404).json({ success: false, message: 'Exam not found.' });
        }
        logger.info(`[Exam] Deleted: "${exam.title}" by ${req.user.email}`);
        return res.status(200).json({ success: true, message: 'Exam deleted successfully.' });
    } catch (err) {
        next(err);
    }
};

/* ─────────────────────────────────────────────────────────────────────────
 * PATCH /api/exams/:id/publish
 * @access  Private (owner examiner | admin)
 * ───────────────────────────────────────────────────────────────────────── */
const publishExam = async (req, res, next) => {
    try {
        const exam = await Exam.findById(req.params.id);
        if (!exam) {
            return res.status(404).json({ success: false, message: 'Exam not found.' });
        }

        if (req.user.role === 'examiner' && exam.createdBy.toString() !== req.user._id.toString()) {
            return res.status(403).json({ success: false, message: 'Not authorised to publish this exam.' });
        }

        if (exam.questions.length === 0) {
            return res.status(422).json({
                success: false,
                message: 'Cannot publish an exam with no questions. Add at least one question first.',
            });
        }

        if (exam.status === 'published') {
            return res.status(409).json({ success: false, message: 'Exam is already published.' });
        }

        exam.status = 'published';
        await exam.save();

        logger.info(`[Exam] Published: "${exam.title}" by ${req.user.email}`);
        return res.status(200).json({ success: true, message: 'Exam published successfully.', data: exam });
    } catch (err) {
        next(err);
    }
};

/* ─────────────────────────────────────────────────────────────────────────
 * POST /api/exams/start
 * @access  Private (student)
 * ───────────────────────────────────────────────────────────────────────── */
const startExam = async (req, res, next) => {
    try {
        const { examId } = req.body;

        // 1. Verification gate
        const verifySession = await VerificationSession.findOne({
            studentId:       req.user._id,
            examId,
            idVerified:      true,
            faceMatched:     true,
            livenessPassed:  true,
            environmentSafe: true,
        }).sort({ createdAt: -1 });

        if (!verifySession) {
            return res.status(403).json({
                success: false,
                message: 'Verification incomplete or failed. Complete the full verification flow before starting.',
            });
        }

        // 2. Resume existing active session
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
    } catch (err) {
        next(err);
    }
};

/* ─────────────────────────────────────────────────────────────────────────
 * POST /api/exams/:id/save-answer
 * @access  Private (student)
 * ───────────────────────────────────────────────────────────────────────── */
const saveAnswer = async (req, res, next) => {
    try {
        const { questionId, answer } = req.body;
        const examId = req.params.id;

        const session = await StudentExamSession.findOne({
            studentId: req.user._id,
            examId,
            endTimestamp: { $exists: false },
        });

        if (!session) {
            return res.status(404).json({ success: false, message: 'Active exam session not found.' });
        }

        const existingIdx = session.answers.findIndex(a => a.questionId.toString() === questionId.toString());
        if (existingIdx !== -1) {
            session.answers[existingIdx].answer = answer;
        } else {
            session.answers.push({ questionId, answer });
        }
        await session.save();

        return res.status(200).json({ success: true });
    } catch (err) {
        next(err);
    }
};

/* ─────────────────────────────────────────────────────────────────────────
 * GET /api/exams/session/:examId
 * @access  Private (student)
 * ───────────────────────────────────────────────────────────────────────── */
const getExamSession = async (req, res, next) => {
    try {
        const session = await StudentExamSession.findOne({
            studentId: req.user._id,
            examId: req.params.examId,
            endTimestamp: { $exists: false },
        });

        if (!session) {
            return res.status(404).json({ success: false, message: 'Active exam session not found.' });
        }

        return res.status(200).json({ success: true, data: session });
    } catch (err) {
        next(err);
    }
};

/* ─────────────────────────────────────────────────────────────────────────
 * POST /api/exams/submit
 * @access  Private (student)
 * ───────────────────────────────────────────────────────────────────────── */
const submitExam = async (req, res, next) => {
    try {
        const { examId, answers } = req.body; // array of { questionId, answer } or kv object

        const session = await StudentExamSession.findOne({
            studentId: req.user._id,
            examId,
            endTimestamp: { $exists: false },
        });
        
        if (!session) {
            return res.status(404).json({ success: false, message: 'Active exam session not found.' });
        }

        const exam = await Exam.findById(examId);
        if (!exam) return res.status(404).json({ success: false, message: 'Exam logic missing.' });

        // Normalise incoming answers based on format Object.entries(answers) sends [ [id, value] ]
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
                // MCQ grading
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

        // Auto end session
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
    } catch (err) {
        next(err);
    }
};

/* ─────────────────────────────────────────────────────────────────────────
 * GET /api/exams/attempt/:id
 * @access  Private (student / examiner / admin)
 * ───────────────────────────────────────────────────────────────────────── */
const getExamAttempt = async (req, res, next) => {
    try {
        const attempt = await ExamAttempt.findById(req.params.id).populate('exam');
        if (!attempt) return res.status(404).json({ success: false, message: 'Attempt not found.' });
        if (req.user.role === 'student' && attempt.student.toString() !== req.user._id.toString()) {
            return res.status(403).json({ success: false, message: 'Access denied.' });
        }
        return res.status(200).json({ success: true, data: attempt });
    } catch (err) {
        next(err);
    }
};

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
