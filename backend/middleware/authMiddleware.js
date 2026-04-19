/**
 * middleware/authMiddleware.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Backward-compatibility re-export.
 * The canonical implementation lives in middleware/auth.js which exports:
 *   protect, authorize, optionalAuth
 *
 * Both require paths work identically:
 *   require('./middleware/auth')           ← preferred (canonical)
 *   require('./middleware/authMiddleware') ← legacy alias (still supported)
 * ─────────────────────────────────────────────────────────────────────────────
 */
module.exports = require('./auth');

