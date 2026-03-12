const { validationResult } = require('express-validator');
const User   = require('../models/User');
const jwt    = require('jsonwebtoken');
const logger = require('../utils/logger');

/* ─────────────────────────────────────────────────────────────────────────
 * Helpers
 * ───────────────────────────────────────────────────────────────────────── */

/**
 * Generate a short-lived access token + long-lived refresh token.
 * Role is embedded in the access token payload to avoid an extra DB hit
 * inside the protect middleware on every request.
 */
const generateTokens = (user) => {
    const accessToken = jwt.sign(
        { id: user._id, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRE || '7d' }
    );

    const refreshToken = jwt.sign(
        { id: user._id },
        process.env.JWT_REFRESH_SECRET,
        { expiresIn: process.env.JWT_REFRESH_EXPIRE || '30d' }
    );

    return { accessToken, refreshToken };
};

/** Standardised public user shape returned in all auth responses */
const publicUser = (user) => ({
    id:          user._id,
    name:        user.name,
    email:       user.email,
    role:        user.role,
    institution: user.institution  || null,
    profileImage:user.profileImage || null,
    isVerified:  user.isVerified,
});

/** Send 422 with express-validator error details */
const sendValidationErrors = (res, errors) =>
    res.status(422).json({
        success: false,
        message: 'Validation failed.',
        errors:  errors.array().map((e) => ({ field: e.path, message: e.msg })),
    });

/* ─────────────────────────────────────────────────────────────────────────
 * @route   POST /api/auth/register
 * @access  Public
 * ───────────────────────────────────────────────────────────────────────── */
const register = async (req, res, next) => {
    // 1 — Validate request body
    const errors = validationResult(req);
    if (!errors.isEmpty()) return sendValidationErrors(res, errors);

    try {
        const { name, email, password, institution } = req.body;

        // Role guard: public sign-up can only be student or examiner.
        // Admin can only be set by another admin (not implemented here yet).
        const allowedPublicRoles = ['student', 'examiner'];
        const role = allowedPublicRoles.includes(req.body.role) ? req.body.role : 'student';

        // 2 — Duplicate email check
        const existing = await User.findOne({ email: email.toLowerCase() });
        if (existing) {
            return res.status(409).json({
                success: false,
                message: 'An account with this email already exists.',
                code:    'EMAIL_TAKEN',
            });
        }

        // 3 — Create user (password hashed by pre-save hook in User model)
        const user = await User.create({ name, email, password, role, institution });

        // 4 — Issue tokens
        const { accessToken, refreshToken } = generateTokens(user);
        user.refreshToken = refreshToken;
        await user.save({ validateBeforeSave: false });

        logger.info(`[Auth] Registered: ${email} (role=${role})`);

        return res.status(201).json({
            success:      true,
            message:      'Registration successful.',
            accessToken,
            refreshToken,
            user:         publicUser(user),
        });
    } catch (err) {
        next(err);
    }
};

/* ─────────────────────────────────────────────────────────────────────────
 * @route   POST /api/auth/login
 * @access  Public
 * ───────────────────────────────────────────────────────────────────────── */
const login = async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return sendValidationErrors(res, errors);

    try {
        const { email, password } = req.body;

        // select('+password') because password is excluded by default
        const user = await User.findOne({ email: email.toLowerCase() }).select('+password');

        // Use a single generic error for both "not found" and "wrong password"
        // to prevent user enumeration attacks.
        if (!user || !(await user.comparePassword(password))) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password.',
                code:    'INVALID_CREDENTIALS',
            });
        }

        if (!user.isActive) {
            return res.status(403).json({
                success: false,
                message: 'Your account has been deactivated. Contact support.',
                code:    'ACCOUNT_DEACTIVATED',
            });
        }

        const { accessToken, refreshToken } = generateTokens(user);
        user.refreshToken = refreshToken;
        user.lastLogin    = new Date();
        await user.save({ validateBeforeSave: false });

        logger.info(`[Auth] Login: ${email} (role=${user.role})`);

        return res.status(200).json({
            success:      true,
            accessToken,
            refreshToken,
            user:         publicUser(user),
        });
    } catch (err) {
        next(err);
    }
};

/* ─────────────────────────────────────────────────────────────────────────
 * @route   POST /api/auth/refresh
 * @access  Public (refresh token required)
 * ───────────────────────────────────────────────────────────────────────── */
const refreshToken = async (req, res, next) => {
    try {
        const { refreshToken: incoming } = req.body;
        if (!incoming) {
            return res.status(400).json({
                success: false,
                message: 'Refresh token is required.',
                code:    'MISSING_REFRESH_TOKEN',
            });
        }

        let decoded;
        try {
            decoded = jwt.verify(incoming, process.env.JWT_REFRESH_SECRET);
        } catch (err) {
            return res.status(401).json({
                success: false,
                message: err.name === 'TokenExpiredError'
                    ? 'Refresh token has expired. Please sign in again.'
                    : 'Invalid refresh token.',
                code: 'INVALID_REFRESH_TOKEN',
            });
        }

        const user = await User.findById(decoded.id).select('+refreshToken');
        if (!user || user.refreshToken !== incoming) {
            return res.status(401).json({
                success: false,
                message: 'Refresh token mismatch. Please sign in again.',
                code:    'REFRESH_TOKEN_REUSE',
            });
        }

        const { accessToken, refreshToken: newRefresh } = generateTokens(user);
        user.refreshToken = newRefresh;
        await user.save({ validateBeforeSave: false });

        return res.status(200).json({
            success:      true,
            accessToken,
            refreshToken: newRefresh,
        });
    } catch (err) {
        next(err);
    }
};

/* ─────────────────────────────────────────────────────────────────────────
 * @route   GET /api/auth/me
 * @access  Private
 * ───────────────────────────────────────────────────────────────────────── */
const getMe = (req, res) => {
    res.status(200).json({
        success: true,
        user:    publicUser(req.user),
    });
};

/* ─────────────────────────────────────────────────────────────────────────
 * @route   POST /api/auth/logout
 * @access  Private
 * ───────────────────────────────────────────────────────────────────────── */
const logout = async (req, res, next) => {
    try {
        await User.findByIdAndUpdate(req.user._id, { refreshToken: null });
        logger.info(`[Auth] Logout: ${req.user.email}`);
        return res.status(200).json({ success: true, message: 'Logged out successfully.' });
    } catch (err) {
        next(err);
    }
};

module.exports = { register, login, refreshToken, getMe, logout };
