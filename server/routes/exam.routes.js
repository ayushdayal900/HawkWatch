const express = require('express');
const router = express.Router();
const {
    getExams, getExam, createExam, updateExam, deleteExam, publishExam,
} = require('../controllers/exam.controller');
const { protect, authorize } = require('../middleware/authMiddleware');

router.use(protect);

router.route('/')
    .get(getExams)
    .post(authorize('examiner', 'admin'), createExam);

router.route('/:id')
    .get(getExam)
    .put(authorize('examiner', 'admin'), updateExam)
    .delete(authorize('admin'), deleteExam);

router.patch('/:id/publish', authorize('examiner', 'admin'), publishExam);

module.exports = router;
