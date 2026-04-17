/**
 * utils/logger.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Winston logger for HawkWatch.
 *
 * Levels (lowest number = highest priority):
 *   error  0
 *   warn   1
 *   info   2
 *   http   3
 *   debug  4
 *
 * Transports:
 *   development — Console (colorised, all levels ≤ debug)
 *   production  — File only:
 *                   logs/error.log    (level: error)
 *                   logs/combined.log (level: info  — http & debug excluded)
 *
 * Usage:
 *   const logger = require('./utils/logger');
 *   logger.info('Server started');
 *   logger.error('Something broke', { extra: data });
 * ─────────────────────────────────────────────────────────────────────────────
 */

const winston = require('winston');
const path    = require('path');

/* ─── Custom level definitions ──────────────────────────────────────────── */
const levels = {
    error: 0,
    warn:  1,
    info:  2,
    http:  3,
    debug: 4,
};

const colors = {
    error: 'red',
    warn:  'yellow',
    info:  'green',
    http:  'magenta',
    debug: 'white',
};

winston.addColors(colors);

/* ─── Format helpers ────────────────────────────────────────────────────── */
const timestampFmt = winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' });

/** Colourised, human-readable format for the console */
const consoleFormat = winston.format.combine(
    timestampFmt,
    winston.format.colorize({ all: true }),
    winston.format.printf(({ timestamp, level, message }) =>
        `${timestamp} [${level}]: ${message}`
    )
);

/** Plain JSON-free format for log files */
const fileFormat = winston.format.combine(
    timestampFmt,
    winston.format.errors({ stack: true }),
    winston.format.printf(({ timestamp, level, message, stack }) =>
        stack
            ? `${timestamp} [${level}]: ${message}\n${stack}`
            : `${timestamp} [${level}]: ${message}`
    )
);

/* ─── Transport factory ─────────────────────────────────────────────────── */
const isDev = process.env.NODE_ENV !== 'production';

/**
 * Resolve an absolute path inside the project's `logs/` directory.
 * @param {string} filename
 * @returns {string}
 */
const logPath = (filename) => path.join(__dirname, '../logs', filename);

const buildTransports = () => {
    if (isDev) {
        // Development: console only, all levels visible
        return [new winston.transports.Console({ format: consoleFormat })];
    }

    // Production: file transports only (no ANSI colour codes in log files)
    return [
        new winston.transports.File({
            filename: logPath('error.log'),
            level:    'error',
            format:   fileFormat,
        }),
        new winston.transports.File({
            filename: logPath('combined.log'),
            level:    'info',   // captures error + warn + info; omits http & debug
            format:   fileFormat,
        }),
    ];
};

/* ─── Logger instance ───────────────────────────────────────────────────── */
const logger = winston.createLogger({
    level:      isDev ? 'debug' : 'info',
    levels,
    transports: buildTransports(),
    // Prevent Winston from exiting on unhandled exceptions in production
    exitOnError: false,
});

module.exports = logger;
