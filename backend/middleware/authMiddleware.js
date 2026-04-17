/**
 * middleware/authMiddleware.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Backwards-compatibility re-export.
 * The canonical implementation lives in middleware/auth.js
 * Both require paths work:
 *   require('./middleware/auth')
 *   require('./middleware/authMiddleware')
 * ─────────────────────────────────────────────────────────────────────────────
 */
module.exports = require('./auth');
