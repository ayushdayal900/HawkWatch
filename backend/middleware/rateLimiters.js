/**
 * middleware/rateLimiters.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Pre-configured rate limiters for specific route groups.
 * Applied as middleware — non-intrusive to business logic.
 *
 * Usage:
 *   const { authLimiter, analyzeLimiter } = require('../middleware/rateLimiters');
 *   router.post('/login', authLimiter, login);
 * ─────────────────────────────────────────────────────────────────────────────
 */

const rateLimit = require('express-rate-limit');

const rateLimitResponse = (message) => ({
    success: false,
    message,
    errorCode: 'RATE_LIMIT_EXCEEDED',
});

/**
 * Auth routes (login / register / refresh) — strict limit to deter brute force.
 * 10 requests per 15 minutes per IP.
 */
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: rateLimitResponse('Too many auth attempts. Please wait 15 minutes and try again.'),
});

/**
 * Frame analysis — throttle expensive AI calls.
 * 1 request per 4 seconds per IP (mirrors the original inline limiter in proctoring.routes.js).
 */
const analyzeLimiter = rateLimit({
    windowMs: 1500, // 1.5 seconds
    max: 2,
    standardHeaders: true,
    legacyHeaders: false,
    message: rateLimitResponse('Frame analysis rate limit exceeded.'),
});

/**
 * General API write operations — moderate protection.
 * 30 requests per minute per IP.
 */
const writeLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 30,
    standardHeaders: true,
    legacyHeaders: false,
    message: rateLimitResponse('Too many requests. Please slow down.'),
});

/**
 * Verification endpoint — medium strictness.
 * 5 requests per 10 minutes per IP.
 */
const verificationLimiter = rateLimit({
    windowMs: 10 * 60 * 1000, // 10 minutes
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
    message: rateLimitResponse('Too many verification attempts. Please wait 10 minutes.'),
});

module.exports = { authLimiter, analyzeLimiter, writeLimiter, verificationLimiter };
