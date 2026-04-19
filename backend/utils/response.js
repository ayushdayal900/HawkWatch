/**
 * utils/response.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Standardized response helpers for consistent API output.
 * Non-intrusive — existing controllers using res.status(...).json(...) directly
 * are NOT required to migrate; these helpers are additive only.
 *
 * Usage:
 *   const { sendSuccess, sendError, sendPaginated } = require('../utils/response');
 *   sendSuccess(res, 200, 'Exam created.', { exam });
 *   sendError(res, 404, 'Exam not found.', 'RESOURCE_NOT_FOUND');
 * ─────────────────────────────────────────────────────────────────────────────
 */

/**
 * Send a successful response.
 * @param {import('express').Response} res
 * @param {number} statusCode
 * @param {string} message
 * @param {*} data
 * @param {Object} [extra] - any additional top-level fields
 */
const sendSuccess = (res, statusCode = 200, message = 'Success', data = null, extra = {}) => {
    const body = { success: true, message, ...extra };
    if (data !== null && data !== undefined) body.data = data;
    return res.status(statusCode).json(body);
};

/**
 * Send an error response.
 * @param {import('express').Response} res
 * @param {number} statusCode
 * @param {string} message
 * @param {string} [errorCode]
 */
const sendError = (res, statusCode = 500, message = 'Internal Server Error', errorCode = 'INTERNAL_ERROR') => {
    return res.status(statusCode).json({ success: false, message, errorCode });
};

/**
 * Send a paginated list response.
 * @param {import('express').Response} res
 * @param {Array}  data
 * @param {Object} pagination - { page, limit, total, totalPages }
 */
const sendPaginated = (res, data = [], pagination = {}) => {
    return res.status(200).json({
        success: true,
        count: data.length,
        pagination,
        data,
    });
};

module.exports = { sendSuccess, sendError, sendPaginated };
