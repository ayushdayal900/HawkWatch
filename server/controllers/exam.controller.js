const Exam = require('../models/Exam');
const ExamAttempt = require('../models/ExamAttempt');

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

        // Students only see published exams
        if (req.user.role === 'student' && exam.status !== 'published') {
            return res.status(403).json({ success: false, message: 'Exam not available.' });
        }

        res.status(200).json({ success: true, data: exam });
    } catch (error) {
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

module.exports = { getExams, getExam, createExam, updateExam, deleteExam, publishExam };
