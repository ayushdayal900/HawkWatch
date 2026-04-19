/**
 * routes/auth.routes.js
 * ─────────────────────────────────────────────────────────────────────────────
 * All routes are prefixed with /api/auth (mounted in server.js)
 *
 *   POST   /register        — Public  — Create account
 *   POST   /login           — Public  — Get access + refresh tokens
 *   POST   /refresh         — Public  — Rotate token pair
 *   GET    /me              — Private — Current user profile
 *   POST   /logout          — Private — Invalidate refresh token
 *   PATCH  /me              — Private — Update own profile fields
 * ─────────────────────────────────────────────────────────────────────────────
 */

const express  = require('express');
const { body } = require('express-validator');
const router   = express.Router();

const {
    register,
    login,
    refreshToken,
    getMe,
    logout,
    updateProfile,
} = require('../controllers/auth.controller');

const { protect } = require('../middleware/auth');

/* ─── Validation rule-sets ─────────────────────────────────────────────── */

const validateRegister = [
    body('name')
        .trim()
        .notEmpty()  .withMessage('Full name is required.')
        .isLength({ max: 100 }).withMessage('Name cannot exceed 100 characters.'),

    body('email')
        .trim()
        .notEmpty()  .withMessage('Email is required.')
        .isEmail()   .withMessage('Please provide a valid email address.')
        .normalizeEmail(),

    body('password')
        .notEmpty()  .withMessage('Password is required.')
        .isLength({ min: 8 }).withMessage('Password must be at least 8 characters.')
        .matches(/[A-Z]/)    .withMessage('Password must contain at least one uppercase letter.')
        .matches(/[0-9]/)    .withMessage('Password must contain at least one number.'),

    body('role')
        .optional()
        .isIn(['student', 'examiner'])
        .withMessage('Role must be one of: student, examiner.'),

    body('institution')
        .optional()
        .trim()
        .isLength({ max: 200 }).withMessage('Institution name is too long.'),
];

const validateLogin = [
    body('email')
        .trim()
        .notEmpty().withMessage('Email is required.')
        .isEmail() .withMessage('Please provide a valid email address.')
        .normalizeEmail(),

    body('password')
        .notEmpty().withMessage('Password is required.'),
];

const validateRefresh = [
    body('refreshToken')
        .notEmpty().withMessage('Refresh token is required.'),
];

/* ─── Routes ───────────────────────────────────────────────────────────── */

// Public
router.post('/register', validateRegister, register);
router.post('/login',    validateLogin,    login);
router.post('/refresh',  validateRefresh,  refreshToken);

// Private
router.get ('/me',     protect, getMe);
router.patch('/me',    protect, updateProfile);
router.post('/logout', protect, logout);

module.exports = router;
