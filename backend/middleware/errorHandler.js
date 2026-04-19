const logger = require('../utils/logger');
const config = require('../config');

/**
 * Global Express error handler
 */
const errorHandler = (err, req, res, next) => {
    let statusCode = err.statusCode || 500;
    let message = err.message || 'Internal Server Error';
    let errorCode = err.errorCode || 'INTERNAL_ERROR';

    // Mongoose bad ObjectId
    if (err.name === 'CastError') {
        message = `Resource not found with id: ${err.value}`;
        statusCode = 404;
        errorCode = 'RESOURCE_NOT_FOUND';
    }

    // Mongoose duplicate key
    if (err.code === 11000) {
        const field = Object.keys(err.keyValue)[0];
        message = `Duplicate value for field: ${field}`;
        statusCode = 409;
        errorCode = 'DUPLICATE_RESOURCE';
    }

    // Mongoose validation error
    if (err.name === 'ValidationError') {
        message = Object.values(err.errors)
            .map((val) => val.message)
            .join(', ');
        statusCode = 400;
        errorCode = 'VALIDATION_ERROR';
    }

    // JWT errors
    if (err.name === 'JsonWebTokenError') {
        message = 'Invalid token';
        statusCode = 401;
        errorCode = 'INVALID_TOKEN';
    }

    if (err.name === 'TokenExpiredError') {
        message = 'Token expired';
        statusCode = 401;
        errorCode = 'TOKEN_EXPIRED';
    }

    logger.error(`[${req.method}] ${req.originalUrl} - ${statusCode} - ${message}`, {
        errorCode,
        stack: err.stack,
        ip: req.ip
    });

    res.status(statusCode).json({
        success: false,
        message,
        errorCode,
        ...(config.env === 'development' && { stack: err.stack }),
    });
};

module.exports = errorHandler;
