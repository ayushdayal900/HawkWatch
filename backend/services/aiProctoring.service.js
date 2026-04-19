/**
 * AI Proctoring Service
 * ---------------------------------------------------------
 * This service acts as the Node.js bridge to the Python
 * AI microservice running MediaPipe + OpenCV + deepfake
 * detection models.
 *
 * In production, these functions make HTTP calls to the
 * FastAPI/Flask Python service at AI_SERVICE_URL.
 * During development / when the Python service is offline,
 * they return deterministic stub responses.
 * ---------------------------------------------------------
 * Python microservice expected endpoints:
 *   POST /analyze-frame   { frame_b64, session_id }
 *   POST /analyze-behavior { typing, mouse, baseline }
 *   POST /verify-face     { frame_b64, embedding }
 *   POST /detect-deepfake { frame_b64 }
 */

const axios = require('axios');
const logger = require('../utils/logger');
const config = require('../config');

const AI_BASE = config.aiService.url || 'http://localhost:8000';
const AI_KEY = config.aiService.apiKey || '';

const aiClient = axios.create({
    baseURL: AI_BASE,
    timeout: 8000,
    headers: { 'X-API-Key': AI_KEY },
});

// ─── Frame Analysis (MediaPipe + OpenCV + Deepfake) ─────────────────────────

/**
 * Analyze a single video frame.
 * @param {string} frameBase64 - base64-encoded JPEG/PNG frame
 * @param {string} sessionId
 * @returns {Object} analysis result
 */
async function analyzeFrame(frameBase64, sessionId) {
    try {
        const { data } = await aiClient.post('/analyze-frame', {
            frame_b64: frameBase64,
            session_id: sessionId,
        });
        return data;
    } catch (err) {
        logger.warn(`AI service unreachable, returning stub frame result: ${err.message}`);
        // For local testing without the Python service, randomly simulate some events
        const randomSimulate = Math.random();
        
        // Stub response matching production schema
        return {
            faceDetected: true,
            faceCount: 1,
            multipleFaces: randomSimulate > 0.95,
            faceConfidence: 0.95,
            landmarks: [],          // 468 MediaPipe face mesh landmarks
            headPose: {             // Euler angles from OpenCV solvePnP
                pitch: 2.1,
                yaw: -3.4,
                roll: 0.8,
            },
            gazeVector: { x: 0.01, y: 0.02 },
            gazeDeviation: randomSimulate > 0.8 && randomSimulate <= 0.9,
            deepfakeScore: 0.04,    // 0 = real, 1 = fake
            deepfakeDetected: false,
            phoneDetected: randomSimulate > 0.7 && randomSimulate <= 0.8,
            personAbsent: false,
            processingMs: 24,
        };
    }
}

// ─── Deepfake Detection (standalone) ────────────────────────────────────────

/**
 * Run deepfake detection on a frame.
 * Uses EfficientNet-based binary classifier fine-tuned on FaceForensics++.
 * @param {string} frameBase64
 * @returns {{ score: number, isDeepfake: boolean }}
 */
async function detectDeepfake(frameBase64) {
    try {
        const { data } = await aiClient.post('/detect-deepfake', { frame_b64: frameBase64 });
        return data;
    } catch (err) {
        logger.warn(`Deepfake service stub: ${err.message}`);
        return { score: 0.03, isDeepfake: false };
    }
}

// ─── Face Verification (identity check against enrollment) ──────────────────

/**
 * Verify live frame against enrolled face embedding.
 * Uses MediaPipe FaceDetection + ArcFace embedding comparison.
 * @param {string} frameBase64
 * @param {number[]} enrolledEmbedding - 512-dim face embedding vector
 * @returns {{ match: boolean, similarity: number, confidence: number }}
 */
async function verifyFaceIdentity(frameBase64, enrolledEmbedding) {
    try {
        const { data } = await aiClient.post('/verify-face', {
            frame_b64: frameBase64,
            embedding: enrolledEmbedding,
        });
        return data;
    } catch (err) {
        logger.warn(`Face verification stub: ${err.message}`);
        return { match: true, similarity: 0.92, confidence: 0.94 };
    }
}

/**
 * Extract face embedding matrix from frame proxy.
 * Uses ArcFace library running across insightFace bindings.
 * @param {string} frameBase64
 * @returns {number[]} 512-length embeddings vector topology.
 */
async function enrollFaceIdentity(frameBase64) {
    try {
        const { data } = await aiClient.post('/enroll-face', { frame_b64: frameBase64 });
        return data.embedding;
    } catch (err) {
        logger.warn(`Face enrollment stub error: ${err.message}`);
        // Mock 512-dim face vector to cleanly clear verification checks for the stub workflow.
        return Array.from({ length: 512 }, () => Math.random());
    }
}

// ─── Behavioral Biometrics ───────────────────────────────────────────────────

/**
 * Analyze typing rhythm and mouse dynamics against user's baseline.
 * Anomaly detection using one-class SVM / Autoencoder.
 * @param {Object} typingRhythm   - { keyPressEvents, dwellTimes, flightTimes }
 * @param {Object} mouseDynamics  - { speeds, angles, curvatures }
 * @param {Object} baseline       - stored biometric profile from enrollment
 * @returns {{ typing: number, mouse: number, overall: number }} anomaly scores [0-1]
 */
async function analyzeBehavior(typingRhythm, mouseDynamics, baseline) {
    try {
        const { data } = await aiClient.post('/analyze-behavior', {
            typing: typingRhythm,
            mouse: mouseDynamics,
            baseline,
        });
        return data;
    } catch (err) {
        logger.warn(`Behavioral biometrics stub: ${err.message}`);
        return { typing: 0.08, mouse: 0.12, overall: 0.10 };
    }
}

// ─── Flag Generation from Frame Result ──────────────────────────────────────

/**
 * Convert AI analysis result into structured flag events.
 * @param {Object} result - from analyzeFrame()
 * @returns {Array} flags to push to session
 */
async function generateFlags(result) {
    const flags = [];
    const thresholds = {
        FACE_CONFIDENCE: parseFloat(config.thresholds.faceConfidence || '0.7'),
        DEEPFAKE_SCORE: parseFloat(config.thresholds.deepfakeScore || '0.6'),
        GAZE_DEVIATION: true,
    };

    if (!result.faceDetected) {
        flags.push({ type: 'face_not_detected', severity: 'high', confidence: 0.90 });
    }
    // Person absent: low confidence threshold even if face is barely detected
    if (result.faceConfidence < 0.3) {
        flags.push({ type: 'person_absent', severity: 'high', confidence: 1.0 - result.faceConfidence });
    }

    if (result.multipleFaces) {
        flags.push({ type: 'multiple_faces', severity: 'critical', confidence: 0.95 });
    }
    if (result.gazeDeviation) {
        flags.push({ type: 'gaze_deviation', severity: 'medium', confidence: 0.80 });
    }
    
    // Head pose violation check
    if (result.headPose) {
        if (Math.abs(result.headPose.yaw) > 30 || Math.abs(result.headPose.pitch) > 25) {
            flags.push({ type: 'head_pose_violation', severity: 'medium', confidence: 0.85 });
        }
    }

    if (result.deepfakeScore >= thresholds.DEEPFAKE_SCORE) {
        flags.push({ type: 'deepfake_detected', severity: 'critical', confidence: result.deepfakeScore });
    }
    if (result.phoneDetected) {
        flags.push({ type: 'phone_detected', severity: 'high', confidence: 0.88 });
    }

    return flags;
}

// ─── Composite Risk Score ────────────────────────────────────────────────────

const RISK_WEIGHTS = {
    face_not_detected: 5,
    multiple_faces: 10,
    tab_switch: 3,
    fullscreen_exit: 3,
    inactivity: 2,
    keyboard_shortcut: 3,
    copy_paste: 3,
    gaze_deviation: 3,
    head_pose_violation: 4,
    deepfake_detected: 10,
    phone_detected: 10,
    person_absent: 6,
};

/**
 * Compute composite risk score for a session (0–100).
 */
async function computeRiskScore(session) {
    const { frameAnalysisSummary: fs, behavioralMetrics: bm, flags } = session;

    const totalFrames = fs?.totalFramesAnalyzed || 1;
    const faceAbsenceRate = (fs?.faceAbsentFrames || 0) / totalFrames;        // 0–1
    const deepfakeAvg = fs?.avgDeepfakeScore || 0;                 // 0–1
    const behavioralAnomaly = bm?.overallAnomalyScore || 0;             // 0–1

    // Flag score: weighted by discrete mapping + severity fallback
    const severityWeights = { low: 1, medium: 3, high: 6, critical: 10 };
    const flagsRisk = flags.reduce((sum, f) => {
        const directWeight = RISK_WEIGHTS[f.type];
        return sum + (directWeight || severityWeights[f.severity] || 1);
    }, 0);

    const flagScore = Math.min(flagsRisk / 50, 1); // Normalize to 0-1 mapped

    const riskScore = (
        faceAbsenceRate * 20 +
        deepfakeAvg * 30 +
        behavioralAnomaly * 15 +
        flagScore * 35
    );

    return Math.min(Math.round(riskScore), 100);
}

module.exports = {
    analyzeFrame,
    detectDeepfake,
    verifyFaceIdentity,
    enrollFaceIdentity,
    analyzeBehavior,
    generateFlags,
    computeRiskScore,
};
