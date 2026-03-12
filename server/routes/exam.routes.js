const express = require('express');
const router = express.Router();
const {
    getExams, getExam, createExam, updateExam, deleteExam, publishExam,
    apiCreateExam, listExams, startExam, submitExam
} = require('../controllers/exam.controller');
const { protect, authorize } = require('../middleware/authMiddleware');

router.use(protect);

router.post('/create', authorize('examiner', 'admin'), apiCreateExam);
router.get('/list', listExams);
router.post('/start', startExam);   // any authenticated user
router.post('/submit', submitExam); // any authenticated user

router.route('/')
    .get(getExams)
    .post(authorize('examiner', 'admin'), createExam);

router.route('/:id')
    .get(getExam)
    .put(authorize('examiner', 'admin'), updateExam)
    .delete(authorize('admin'), deleteExam);

router.patch('/:id/publish', authorize('examiner', 'admin'), publishExam);

module.exports = router;
