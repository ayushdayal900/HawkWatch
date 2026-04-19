/**
 * services/riskEngine.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Synchronous risk scoring for ProctorEvent arrays (used by proctor.controller).
 * The async version for full ProctoringSession objects lives in aiProctoring.service.js.
 *
 * Exports:
 *   RISK_WEIGHTS     — mapping of eventType → weight
 *   calculateRiskScore(events) → { riskScore, riskLevel }
 * ─────────────────────────────────────────────────────────────────────────────
 */

const RISK_WEIGHTS = {
    face_not_detected:   5,
    multiple_faces:     10,
    tab_switch:          3,
    fullscreen_exit:     3,
    inactivity:          2,
    keyboard_shortcut:   3,
    copy_paste:          3,
    gaze_deviation:      3,
    head_pose_violation: 4,
    deepfake_detected:  10,
    phone_detected:     10,
    person_absent:       6,
    behavioral_anomaly:  4,
    face_mismatch:       8,
    audio_anomaly:       3,
    camera_off:          40,
    camera_blocked:      50,
};

/**
 * Calculate a composite risk score from an array of ProctorEvent documents.
 * @param {Array} events - ProctorEvent documents (must have eventType, riskWeight)
 * @returns {{ riskScore: number, riskLevel: string }}
 */
function calculateRiskScore(events = []) {
    const totalWeight = events.reduce((sum, e) => {
        // Prefer stored riskWeight; fall back to RISK_WEIGHTS table; then 0
        const w = (e.riskWeight !== undefined && e.riskWeight !== null)
            ? e.riskWeight
            : (RISK_WEIGHTS[e.eventType] || 0);
        return sum + w;
    }, 0);

    // Normalize: cap at 100 (50 raw weight points = 100 risk)
    const riskScore = Math.min(Math.round((totalWeight / 50) * 100), 100);

    let riskLevel = 'low';
    if (riskScore >= 75)      riskLevel = 'critical';
    else if (riskScore >= 50) riskLevel = 'high';
    else if (riskScore >= 25) riskLevel = 'medium';

    return { riskScore, riskLevel };
}

module.exports = { RISK_WEIGHTS, calculateRiskScore };
