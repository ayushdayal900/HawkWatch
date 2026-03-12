const Exam = require('../models/Exam');
const ExamAttempt = require('../models/ExamAttempt');
const StudentExamSession = require('../models/StudentExamSession');
const VerificationSession = require('../models/VerificationSession');

// @route  GET /api/exams
// @access Private
const getExams = async (req, res, next) => {
    try {
        const filter = {};
        if (req.user.role === 'examiner') filter.createdBy = req.user._id;
        if (req.user.role === 'student') filter.status = 'published';

        const exams = await Exam.find(filter)
            .populate('createdBy', 'name email')
            .sort({ createdAt: -1 });

        res.status(200).json({ success: true, count: exams.length, data: exams });
    } catch (error) {
        next(error);
    }
};

// @route  GET /api/exams/:id
// @access Private
const getExam = async (req, res, next) => {
    try {
        const exam = await Exam.findById(req.params.id).populate('createdBy', 'name email');
        if (!exam) return res.status(404).json({ success: false, message: 'Exam not found.' });

        // Students can only see published exams
        if (req.user.role === 'student' && exam.status !== 'published') {
            return res.status(403).json({ success: false, message: 'Exam not available.' });
        }

        res.status(200).json({ success: true, data: exam });
    } catch (error) {
        // Handle invalid ObjectId format gracefully
        if (error.name === 'CastError') {
            return res.status(404).json({ success: false, message: 'Exam not found.' });
        }
        next(error);
    }
};

// @route  POST /api/exams
// @access Private (examiner, admin)
const createExam = async (req, res, next) => {
    try {
        const exam = await Exam.create({ ...req.body, createdBy: req.user._id });
        res.status(201).json({ success: true, data: exam });
    } catch (error) {
        next(error);
    }
};

// @route  PUT /api/exams/:id
// @access Private (examiner owner, admin)
const updateExam = async (req, res, next) => {
    try {
        const exam = await Exam.findById(req.params.id);
        if (!exam) return res.status(404).json({ success: false, message: 'Exam not found.' });

        if (req.user.role === 'examiner' && exam.createdBy.toString() !== req.user._id.toString()) {
            return res.status(403).json({ success: false, message: 'Not authorized to edit this exam.' });
        }

        const updated = await Exam.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            runValidators: true,
        });
        res.status(200).json({ success: true, data: updated });
    } catch (error) {
        next(error);
    }
};

// @route  DELETE /api/exams/:id
// @access Private (admin)
const deleteExam = async (req, res, next) => {
    try {
        const exam = await Exam.findByIdAndDelete(req.params.id);
        if (!exam) return res.status(404).json({ success: false, message: 'Exam not found.' });
        res.status(200).json({ success: true, message: 'Exam deleted.' });
    } catch (error) {
        next(error);
    }
};

// @route  PATCH /api/exams/:id/publish
// @access Private (examiner, admin)
const publishExam = async (req, res, next) => {
    try {
        const exam = await Exam.findByIdAndUpdate(
            req.params.id,
            { status: 'published' },
            { new: true }
        );
        if (!exam) return res.status(404).json({ success: false, message: 'Exam not found.' });
        res.status(200).json({ success: true, data: exam });
    } catch (error) {
        next(error);
    }
};

// @route  POST /api/exams/create
// @access Private (examiner, admin)
const apiCreateExam = async (req, res, next) => {
    try {
        const exam = await Exam.create({ ...req.body, createdBy: req.user._id });
        res.status(201).json({ success: true, data: exam });
    } catch (error) {
        next(error);
    }
};

// @route  GET /api/exams/list
// @access Private
const listExams = async (req, res, next) => {
    try {
        const filter = {};
        if (req.user.role === 'examiner') filter.createdBy = req.user._id;
        
        const exams = await Exam.find(filter)
            .populate('createdBy', 'name email')
            .sort({ createdAt: -1 });

        res.status(200).json({ success: true, count: exams.length, data: exams });
    } catch (error) {
        next(error);
    }
};

// @route  POST /api/exams/start
// @access Private (student)
const startExam = async (req, res, next) => {
    try {
        const { examId } = req.body;
        
        // 1. Verify that the student has passed all verification checks right before this
        const verifySession = await VerificationSession.findOne({
            studentId: req.user._id,
            examId,
            idVerified: true,
            faceMatched: true,
            livenessPassed: true,
            environmentSafe: true
        }).sort({ timestamp: -1 });

        if (!verifySession) {
            return res.status(403).json({ success: false, message: 'Verification incomplete or failed. Please complete the full verification flow before starting the exam.' });
        }

        // 2. Check for existing session
        const existingSession = await StudentExamSession.findOne({
            studentId: req.user._id,
            examId,
            endTimestamp: { $exists: false }
        });
        
        if (existingSession) {
            return res.status(200).json({ success: true, data: existingSession, message: 'Resumed existing session' });
        }

        const session = await StudentExamSession.create({
            studentId: req.user._id,
            examId,
            answers: []
        });
        
        res.status(201).json({ success: true, data: session });
    } catch (error) {
        next(error);
    }
};

// @route  POST /api/exams/submit
// @access Private (student)
const submitExam = async (req, res, next) => {
    try {
        const { examId, answers } = req.body;
        
        let session = await StudentExamSession.findOne({
            studentId: req.user._id,
            examId,
            endTimestamp: { $exists: false }
        });
        
        if (!session) {
            return res.status(404).json({ success: false, message: 'Active exam session not found.' });
        }

        session.answers = answers;
        session.endTimestamp = Date.now();
        await session.save();
        
        res.status(200).json({ success: true, data: session, message: 'Exam submitted successfully.' });
    } catch (error) {
        next(error);
    }
};

module.exports = { getExams, getExam, createExam, updateExam, deleteExam, publishExam, apiCreateExam, listExams, startExam, submitExam };
