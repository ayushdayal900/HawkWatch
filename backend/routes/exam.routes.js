/**
 * routes/exam.routes.js
 * ─────────────────────────────────────────────────────────────────────────────
 * All routes are prefixed with /api/exams (mounted in server.js).
 *
 *   GET    /stats        — examiner/admin: aggregate counts; student: attempt history
 *   GET    /             — list (role-filtered: students=published, examiners=own, admin=all)
 *   POST   /             — create exam (examiner | admin)
 *   GET    /:id          — single exam
 *   PUT    /:id          — update (owner examiner | admin)
 *   DELETE /:id          — hard delete (admin only)
 *   PATCH  /:id/publish  — publish (owner examiner | admin)
 *   POST   /start        — student: start exam session (after verification)
 *   POST   /submit       — student: submit answers
 * ─────────────────────────────────────────────────────────────────────────────
 */

const express  = require('express');
const router   = express.Router();

const {
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
} = require('../controllers/exam.controller');

const { protect, authorize } = require('../middleware/auth');

// All exam routes require authentication
router.use(protect);

/* ─── Aggregate / action routes (before /:id to avoid capture) ──────── */
router.get  ('/stats',   getStats);
router.get  ('/history', authorize('student'), getHistory);
router.post ('/start',   startExam);
router.post ('/:id/submit', authorize('student'), submitExam);
router.post ('/:id/save-answer', authorize('student'), require('../controllers/exam.controller').saveAnswer);
router.get  ('/session/:examId', authorize('student'), require('../controllers/exam.controller').getExamSession);
router.get  ('/attempt/:id',     require('../controllers/exam.controller').getExamAttempt);

/* ─── Collection routes ─────────────────────────────────────────────── */
const { validateBody, examCreateSchema } = require('../middleware/validation');

router.route('/')
    .get (getExams)
    .post(authorize('examiner', 'admin'), validateBody(examCreateSchema), createExam);

/* ─── Member routes ─────────────────────────────────────────────────── */
router.route('/:id')
    .get   (getExam)
    .put   (authorize('examiner', 'admin'), updateExam)
    .delete(authorize('admin'),             deleteExam);

router.patch('/:id/publish', authorize('examiner', 'admin'), publishExam);

module.exports = router;
