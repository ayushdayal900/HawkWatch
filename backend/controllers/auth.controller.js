const { validationResult } = require('express-validator');
const User   = require('../models/User');
const { generateAccessToken, generateRefreshToken, verifyToken } = require('../utils/jwt');
const logger = require('../utils/logger');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');

/* ─────────────────────────────────────────────────────────────────────────
 * Helpers
 * ───────────────────────────────────────────────────────────────────────── */

const generateTokens = (user) => ({
    accessToken:  generateAccessToken(user._id, user.role),
    refreshToken: generateRefreshToken(user._id),
});

const publicUser = (user) => ({
    id:          user._id,
    name:        user.name,
    email:       user.email,
    role:        user.role,
    institution: user.institution  || null,
    profileImage:user.profileImage || null,
    isVerified:  user.isVerified,
});

const validateRequest = (req) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const message = errors.array().map((e) => `${e.path}: ${e.msg}`).join(', ');
        throw new AppError(message, 422, 'VALIDATION_FAILED');
    }
};

/* ─────────────────────────────────────────────────────────────────────────
 * @route   POST /api/auth/register
 * @access  Public
 * ───────────────────────────────────────────────────────────────────────── */
const register = asyncHandler(async (req, res) => {
    validateRequest(req);

    const { name, email, password, institution, organization } = req.body;

    const allowedPublicRoles = ['student', 'examiner'];
    const role = allowedPublicRoles.includes(req.body.role) ? req.body.role : 'student';

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
        throw new AppError('An account with this email already exists.', 409, 'EMAIL_TAKEN');
    }

    const user = await User.create({ 
        name, 
        email, 
        password, 
        role, 
        institution,
        organization: organization || null
    });

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
});

/* ─────────────────────────────────────────────────────────────────────────
 * @route   POST /api/auth/login
 * @access  Public
 * ───────────────────────────────────────────────────────────────────────── */
const login = asyncHandler(async (req, res) => {
    validateRequest(req);

    const { email, password } = req.body;

    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');

    if (!user || !(await user.comparePassword(password))) {
        throw new AppError('Invalid email or password.', 401, 'INVALID_CREDENTIALS');
    }

    if (!user.isActive) {
        throw new AppError('Your account has been deactivated. Contact support.', 403, 'ACCOUNT_DEACTIVATED');
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
});

/* ─────────────────────────────────────────────────────────────────────────
 * @route   POST /api/auth/refresh
 * @access  Public (refresh token required)
 * ───────────────────────────────────────────────────────────────────────── */
const refreshToken = asyncHandler(async (req, res) => {
    const { refreshToken: incoming } = req.body;
    if (!incoming) {
        throw new AppError('Refresh token is required.', 400, 'MISSING_REFRESH_TOKEN');
    }

    let decoded;
    try {
        decoded = verifyToken(incoming, 'refresh');
    } catch (err) {
        if (err.name === 'TokenExpiredError') {
            throw new AppError('Refresh token has expired. Please sign in again.', 401, 'INVALID_REFRESH_TOKEN');
        }
        throw new AppError('Invalid refresh token.', 401, 'INVALID_REFRESH_TOKEN');
    }

    const user = await User.findById(decoded.id).select('+refreshToken');
    if (!user || user.refreshToken !== incoming) {
        throw new AppError('Refresh token mismatch. Please sign in again.', 401, 'REFRESH_TOKEN_REUSE');
    }

    const { accessToken, refreshToken: newRefresh } = generateTokens(user);
    user.refreshToken = newRefresh;
    await user.save({ validateBeforeSave: false });

    return res.status(200).json({
        success:      true,
        accessToken,
        refreshToken: newRefresh,
    });
});

/* ─────────────────────────────────────────────────────────────────────────
 * @route   GET /api/auth/me
 * @access  Private
 * ───────────────────────────────────────────────────────────────────────── */
const getMe = asyncHandler(async (req, res) => {
    res.status(200).json({
        success: true,
        user:    publicUser(req.user),
    });
});

/* ─────────────────────────────────────────────────────────────────────────
 * @route   POST /api/auth/logout
 * @access  Private
 * ───────────────────────────────────────────────────────────────────────── */
const logout = asyncHandler(async (req, res) => {
    await User.findByIdAndUpdate(req.user._id, { refreshToken: null });
    logger.info(`[Auth] Logout: ${req.user.email}`);
    return res.status(200).json({ success: true, message: 'Logged out successfully.' });
});

module.exports = { register, login, refreshToken, getMe, logout };
