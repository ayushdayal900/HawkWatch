const express = require('express');
const router = express.Router();
const { logEvent, getEvents } = require('../controllers/proctor.controller');
const { protect } = require('../middleware/authMiddleware');

router.post('/event', protect, logEvent);
router.get('/events/:examId', protect, getEvents);

module.exports = router;
