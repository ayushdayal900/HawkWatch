/**
 * utils/jwt.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Centralised JWT helpers for HawkWatch.
 *
 * Exports:
 *   generateAccessToken(userId, role) → signed access token (15 min)
 *   generateRefreshToken(userId)      → signed refresh token (7 d)
 *   verifyToken(token)                → decoded payload or throws
 *
 * Secrets used:
 *   JWT_ACCESS_SECRET  — for signing/verifying access tokens
 *   JWT_REFRESH_SECRET — for signing/verifying refresh tokens
 *
 * Falls back gracefully to JWT_SECRET if JWT_ACCESS_SECRET is not set so that
 * existing deployments with a single secret keep working during migration.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const jwt = require('jsonwebtoken');
const config = require('../config');

/** @returns {string} The access-token signing secret */
const accessSecret = () =>
    config.auth.jwtAccessSecret || config.auth.jwtSecret;

/** @returns {string} The refresh-token signing secret */
const refreshSecret = () =>
    config.auth.jwtRefreshSecret;

/**
 * Generate a short-lived JWT access token.
 *
 * @param {string|import('mongoose').Types.ObjectId} userId - The user's MongoDB _id
 * @param {string} role - The user's role ('student' | 'examiner' | 'admin')
 * @returns {string} Signed JWT access token (expires in 15 minutes)
 * @throws {Error} If JWT_ACCESS_SECRET / JWT_SECRET is not configured
 */
const generateAccessToken = (userId, role) => {
    const secret = accessSecret();
    if (!secret) {
        throw new Error('JWT_ACCESS_SECRET is not configured in the environment.');
    }

    return jwt.sign(
        { id: userId.toString(), role },
        secret,
        { expiresIn: config.auth.jwtExpire || '15m' }
    );
};

/**
 * Generate a long-lived JWT refresh token.
 *
 * @param {string|import('mongoose').Types.ObjectId} userId - The user's MongoDB _id
 * @returns {string} Signed JWT refresh token (expires in 7 days)
 * @throws {Error} If JWT_REFRESH_SECRET is not configured
 */
const generateRefreshToken = (userId) => {
    const secret = refreshSecret();
    if (!secret) {
        throw new Error('JWT_REFRESH_SECRET is not configured in the environment.');
    }

    return jwt.sign(
        { id: userId.toString() },
        secret,
        { expiresIn: config.auth.jwtRefreshExpire || '7d' }
    );
};

/**
 * Verify a JWT (access or refresh) and return its decoded payload.
 *
 * @param {string} token  - The raw JWT string
 * @param {'access'|'refresh'} [type='access'] - Which secret to use
 * @returns {object} Decoded JWT payload
 * @throws {import('jsonwebtoken').JsonWebTokenError | import('jsonwebtoken').TokenExpiredError}
 */
const verifyToken = (token, type = 'access') => {
    const secret = type === 'refresh' ? refreshSecret() : accessSecret();
    if (!secret) {
        throw new Error(`JWT secret for type "${type}" is not configured.`);
    }
    return jwt.verify(token, secret);
};

module.exports = { generateAccessToken, generateRefreshToken, verifyToken };
