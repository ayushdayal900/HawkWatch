/**
 * middleware/auth.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Reusable authentication & authorisation middleware for HawkWatch.
 *
 * Exports:
 *   protect    — Verify JWT access token, attach req.user
 *   authorize  — Role-based access control (RBAC)
 *   optionalAuth — Soft protect: attach user if token present, never block
 *
 * Usage:
 *   const { protect, authorize } = require('../middleware/auth');
 *
 *   router.get('/me',             protect, getMe);
 *   router.post('/exams',         protect, authorize('examiner','admin'), createExam);
 *   router.get('/public-results', optionalAuth, getResults);
 * ─────────────────────────────────────────────────────────────────────────────
 */

const jwt     = require('jsonwebtoken');
const User    = require('../models/User');
const logger  = require('../utils/logger');

/* ──────────────────────────────────────────────────────────────────────────
 * protect
 * Verifies the access token from:
 *   1.  Authorization: Bearer <token>  header  (preferred)
 *   2.  req.cookies.token              cookie   (fallback)
 * Attaches the authenticated user to req.user and calls next().
 * Returns 401 if token is missing, invalid, or expired.
 * Returns 403 if the account is deactivated.
 * ────────────────────────────────────────────────────────────────────────── */
const protect = async (req, res, next) => {
    let token;

    // 1 — Bearer header
    const auth = req.headers.authorization;
    if (auth && auth.startsWith('Bearer ')) {
        token = auth.split(' ')[1];
    }
    // 2 — Cookie fallback
    else if (req.cookies && req.cookies.token) {
        token = req.cookies.token;
    }

    if (!token) {
        return res.status(401).json({
            success: false,
            message: 'Not authorised. No token provided.',
        });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        const user = await User.findById(decoded.id).select('-password -refreshToken');
        if (!user) {
            return res.status(401).json({ success: false, message: 'User not found.' });
        }

        if (!user.isActive) {
            return res.status(403).json({ success: false, message: 'Account has been deactivated.' });
        }

        req.user = user;
        next();
    } catch (err) {
        const isExpired = err.name === 'TokenExpiredError';
        logger.warn(`JWT ${isExpired ? 'expired' : 'invalid'}: ${err.message} — ${req.method} ${req.originalUrl}`);

        return res.status(401).json({
            success: false,
            message: isExpired ? 'Token has expired. Please sign in again.' : 'Invalid token.',
            code: isExpired ? 'TOKEN_EXPIRED' : 'TOKEN_INVALID',
        });
    }
};

/* ──────────────────────────────────────────────────────────────────────────
 * authorize(...roles)
 * Factory that returns a middleware checking req.user.role against the
 * allowlist.  Must be used AFTER protect.
 *
 * Example:
 *   router.delete('/:id', protect, authorize('admin'), deleteUser);
 * ────────────────────────────────────────────────────────────────────────── */
const authorize = (...roles) => (req, res, next) => {
    if (!req.user) {
        // Guard: protect should always run first
        return res.status(401).json({ success: false, message: 'Not authenticated.' });
    }

    if (!roles.includes(req.user.role)) {
        logger.warn(
            `Authorisation denied — role="${req.user.role}" attempted "${req.method} ${req.originalUrl}" (requires: ${roles.join('|')})`
        );
        return res.status(403).json({
            success: false,
            message: `Access denied. Required role: ${roles.join(' or ')}.`,
        });
    }

    next();
};

/* ──────────────────────────────────────────────────────────────────────────
 * optionalAuth
 * Soft version of protect — attaches req.user when a valid token is present
 * but never blocks the request when the token is absent or invalid.
 * Useful for endpoints that have both public and authenticated views.
 * ────────────────────────────────────────────────────────────────────────── */
const optionalAuth = async (req, res, next) => {
    let token;

    const auth = req.headers.authorization;
    if (auth && auth.startsWith('Bearer ')) {
        token = auth.split(' ')[1];
    } else if (req.cookies && req.cookies.token) {
        token = req.cookies.token;
    }

    if (!token) return next();

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id).select('-password -refreshToken');
        if (user && user.isActive) req.user = user;
    } catch {
        // Silently ignore invalid/expired token in optional mode
    }

    next();
};

module.exports = { protect, authorize, optionalAuth };
