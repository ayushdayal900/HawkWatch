/**
 * controllers/proctor.controller.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Backward-compatibility shim.
 * The canonical implementation for logEvent and getEvents now lives in
 * proctoring.controller.js (unified controller).
 *
 * Both require paths continue to work:
 *   require('../controllers/proctor.controller')   → { logEvent, getEvents }
 *   require('../controllers/proctoring.controller') → all exports
 * ─────────────────────────────────────────────────────────────────────────────
 */
const { logEvent, getEvents } = require('./proctoring.controller');

module.exports = { logEvent, getEvents };
