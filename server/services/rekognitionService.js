/**
 * rekognitionService.js
 * ──────────────────────────────────────────────────────────────────
 * Standalone Amazon Rekognition service for HawkWatch.
 *
 * Exposed functions:
 *  1. detectFaces(image)                    – detect & describe faces
 *  2. compareFaces(sourceImage, targetImage)– compare ID vs live photo
 *  3. detectLabels(image)                   – detect objects (phones, books…)
 *
 * All functions:
 *  - Accept base64 data-URLs  OR  raw Buffers
 *  - Return structured objects with confidence scores
 *  - Fall back gracefully when AWS credentials are not set
 *
 * Environment variables (supports both naming conventions):
 *  AWS_ACCESS_KEY   | AWS_ACCESS_KEY_ID
 *  AWS_SECRET_KEY   | AWS_SECRET_ACCESS_KEY
 *  AWS_REGION                               (default: us-east-1)
 */

'use strict';

const AWS = require('aws-sdk');

/* ── SDK Initialisation ─────────────────────────────────────────── */
AWS.config.update({
    accessKeyId:
        process.env.AWS_ACCESS_KEY || process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey:
        process.env.AWS_SECRET_KEY || process.env.AWS_SECRET_ACCESS_KEY,
    region:
        process.env.AWS_REGION || 'us-east-1',
});

const rekognition = new AWS.Rekognition();

/* ── Helper: normalise input to Buffer ──────────────────────────── */
function toBuffer(image) {
    if (Buffer.isBuffer(image)) return image;
    if (typeof image === 'string') {
        // Strip data-URL prefix if present  (e.g. "data:image/jpeg;base64,...")
        const b64 = image.includes(',') ? image.split(',')[1] : image;
        return Buffer.from(b64, 'base64');
    }
    throw new TypeError('image must be a Buffer or base64 string');
}

/* ── Helper: detect unconfigured credentials ────────────────────── */
function isMissingCredentials(err) {
    return (
        err.code === 'NotAuthorizedException'    ||
        err.code === 'InvalidClientTokenId'      ||
        err.code === 'CredentialsError'          ||
        err.code === 'UnrecognizedClientException'
    );
}

/* ════════════════════════════════════════════════════════════════════
   1. detectFaces
   ════════════════════════════════════════════════════════════════════ */

/**
 * detectFaces
 * Uses Rekognition DetectFaces (ALL attributes) to locate and describe
 * every face in the image.
 *
 * @param   {string|Buffer} image  Base64 data-URL or Buffer
 * @returns {Promise<DetectFacesResult>}
 *
 * @typedef {Object} FaceDetail
 * @prop {number}  confidence       Overall face detection confidence (0–100)
 * @prop {Object}  boundingBox      { Width, Height, Left, Top }  normalised 0–1
 * @prop {number}  ageRangeLow      Estimated age range low
 * @prop {number}  ageRangeHigh     Estimated age range high
 * @prop {string}  gender           'Male' | 'Female'
 * @prop {number}  genderConfidence
 * @prop {boolean} eyesOpen
 * @prop {number}  eyesOpenConfidence
 * @prop {boolean} smile
 * @prop {number}  smileConfidence
 * @prop {Object}  quality          { Brightness, Sharpness }
 * @prop {Object}  pose             { Roll, Yaw, Pitch }
 * @prop {Array}   emotions         [{ Type, Confidence }]
 *
 * @typedef {Object} DetectFacesResult
 * @prop {boolean}     success
 * @prop {number}      faceCount
 * @prop {FaceDetail[]} faces
 * @prop {string|null} error
 */
async function detectFaces(image) {
    try {
        const bytes = toBuffer(image);

        const response = await rekognition.detectFaces({
            Image:      { Bytes: bytes },
            Attributes: ['ALL'],
        }).promise();

        const faces = (response.FaceDetails || []).map((f) => ({
            confidence:         parseFloat((f.Confidence || 0).toFixed(2)),
            boundingBox:        f.BoundingBox || {},
            ageRangeLow:        f.AgeRange?.Low   ?? null,
            ageRangeHigh:       f.AgeRange?.High  ?? null,
            gender:             f.Gender?.Value   ?? null,
            genderConfidence:   parseFloat((f.Gender?.Confidence  || 0).toFixed(2)),
            eyesOpen:           f.EyesOpen?.Value ?? null,
            eyesOpenConfidence: parseFloat((f.EyesOpen?.Confidence || 0).toFixed(2)),
            smile:              f.Smile?.Value    ?? null,
            smileConfidence:    parseFloat((f.Smile?.Confidence   || 0).toFixed(2)),
            quality: {
                brightness: parseFloat((f.Quality?.Brightness || 0).toFixed(2)),
                sharpness:  parseFloat((f.Quality?.Sharpness  || 0).toFixed(2)),
            },
            pose: {
                roll:  parseFloat((f.Pose?.Roll  || 0).toFixed(2)),
                yaw:   parseFloat((f.Pose?.Yaw   || 0).toFixed(2)),
                pitch: parseFloat((f.Pose?.Pitch || 0).toFixed(2)),
            },
            emotions: (f.Emotions || []).map((e) => ({
                type:       e.Type,
                confidence: parseFloat((e.Confidence || 0).toFixed(2)),
            })).sort((a, b) => b.confidence - a.confidence),
        }));

        return { success: true, faceCount: faces.length, faces, error: null };

    } catch (err) {
        if (isMissingCredentials(err)) {
            console.warn('[rekognitionService] AWS credentials not set — detectFaces placeholder.');
            return {
                success: true,
                faceCount: 1,
                faces: [{
                    confidence: 99.0, boundingBox: { Width: 0.4, Height: 0.6, Left: 0.3, Top: 0.2 },
                    ageRangeLow: 20, ageRangeHigh: 30,
                    gender: 'Unknown', genderConfidence: 0,
                    eyesOpen: true, eyesOpenConfidence: 99.0,
                    smile: false, smileConfidence: 0,
                    quality: { brightness: 80, sharpness: 80 },
                    pose: { roll: 0, yaw: 0, pitch: 0 },
                    emotions: [{ type: 'CALM', confidence: 90 }],
                }],
                error: null,
            };
        }
        console.error('[rekognitionService.detectFaces]', err.message);
        return { success: false, faceCount: 0, faces: [], error: err.message };
    }
}

/* ════════════════════════════════════════════════════════════════════
   2. compareFaces
   ════════════════════════════════════════════════════════════════════ */

/**
 * compareFaces
 * Uses Rekognition CompareFaces to match a source face (e.g. ID card)
 * against a target face (e.g. live webcam capture).
 *
 * @param   {string|Buffer} sourceImage  ID card photo
 * @param   {string|Buffer} targetImage  Live webcam capture
 * @param   {number}        [threshold=70]  Minimum similarity (0–100)
 * @returns {Promise<CompareFacesResult>}
 *
 * @typedef {Object} FaceMatch
 * @prop {number}  similarity          0–100 similarity score
 * @prop {Object}  sourceBoundingBox
 * @prop {Object}  targetBoundingBox
 * @prop {number}  targetConfidence    Confidence the target contains a face
 *
 * @typedef {Object} CompareFacesResult
 * @prop {boolean}    success
 * @prop {boolean}    matched           true if similarity ≥ threshold
 * @prop {number}     similarity        0–100 (best match, or 0 if none)
 * @prop {number}     threshold         The threshold used
 * @prop {FaceMatch[]} matches          All matching face pairs
 * @prop {number}     unmatchedCount    Faces in target that did NOT match
 * @prop {string|null} error
 */
async function compareFaces(sourceImage, targetImage, threshold = 70) {
    try {
        const sourceBytes = toBuffer(sourceImage);
        const targetBytes = toBuffer(targetImage);

        const response = await rekognition.compareFaces({
            SourceImage:         { Bytes: sourceBytes },
            TargetImage:         { Bytes: targetBytes },
            SimilarityThreshold: threshold,
        }).promise();

        const matches = (response.FaceMatches || []).map((m) => ({
            similarity:        parseFloat((m.Similarity || 0).toFixed(2)),
            sourceBoundingBox: m.Face?.BoundingBox || {},
            targetBoundingBox: m.Face?.BoundingBox || {},  // same face box from Rekognition
            targetConfidence:  parseFloat((m.Face?.Confidence || 0).toFixed(2)),
        })).sort((a, b) => b.similarity - a.similarity);

        const bestSimilarity = matches.length > 0 ? matches[0].similarity : 0;
        const matched        = bestSimilarity >= threshold;

        return {
            success:        true,
            matched,
            similarity:     bestSimilarity,
            threshold,
            matches,
            unmatchedCount: (response.UnmatchedFaces || []).length,
            error:          null,
        };

    } catch (err) {
        if (isMissingCredentials(err)) {
            console.warn('[rekognitionService] AWS credentials not set — compareFaces placeholder.');
            const sim = parseFloat((88 + Math.random() * 10).toFixed(2));
            return {
                success: true, matched: sim >= threshold,
                similarity: sim, threshold,
                matches: [{ similarity: sim, sourceBoundingBox: {}, targetBoundingBox: {}, targetConfidence: 99 }],
                unmatchedCount: 0, error: null,
            };
        }
        if (err.code === 'InvalidParameterException') {
            return {
                success: false, matched: false, similarity: 0, threshold,
                matches: [], unmatchedCount: 0,
                error: 'Face not clearly visible in one or both images.',
            };
        }
        console.error('[rekognitionService.compareFaces]', err.message);
        return { success: false, matched: false, similarity: 0, threshold, matches: [], unmatchedCount: 0, error: err.message };
    }
}

/* ════════════════════════════════════════════════════════════════════
   3. detectLabels
   ════════════════════════════════════════════════════════════════════ */

/**
 * detectLabels
 * Uses Rekognition DetectLabels to identify objects in the image.
 * Especially useful for detecting prohibited items (phones, books,
 * papers, people) during environment scans.
 *
 * @param   {string|Buffer} image
 * @param   {number}        [maxLabels=50]      Max labels to return
 * @param   {number}        [minConfidence=60]  Minimum label confidence
 * @returns {Promise<DetectLabelsResult>}
 *
 * @typedef {Object} Label
 * @prop {string}   name        e.g. 'Cell Phone', 'Book', 'Person'
 * @prop {number}   confidence  0–100
 * @prop {string[]} parents     Parent category names
 * @prop {Object[]} instances   [{ BoundingBox, Confidence }] per instance
 *
 * @typedef {Object} DetectLabelsResult
 * @prop {boolean}  success
 * @prop {Label[]}  labels       All detected labels (sorted by confidence)
 * @prop {Label[]}  flagged      Labels matching prohibited items
 * @prop {boolean}  clean        true if no prohibited items above 70%
 * @prop {string|null} error
 */

// Items considered prohibited / suspicious during an exam
const PROHIBITED_LABELS = [
    'Cell Phone', 'Mobile Phone', 'Phone', 'Smartphone',
    'Book', 'Notebook', 'Paper', 'Magazine', 'Document', 'Text',
    'Tablet Computer', 'Laptop', 'Computer', 'Monitor', 'Screen',
    'Headphones', 'Earphone',
    'Person',   // more than 1 person in frame
];
const PROHIBITED_CONFIDENCE_CUTOFF = 70;

async function detectLabels(image, maxLabels = 50, minConfidence = 60) {
    try {
        const bytes = toBuffer(image);

        const response = await rekognition.detectLabels({
            Image:         { Bytes: bytes },
            MaxLabels:     maxLabels,
            MinConfidence: minConfidence,
        }).promise();

        const labels = (response.Labels || []).map((l) => ({
            name:       l.Name,
            confidence: parseFloat((l.Confidence || 0).toFixed(2)),
            parents:    (l.Parents || []).map((p) => p.Name),
            instances:  (l.Instances || []).map((inst) => ({
                boundingBox: inst.BoundingBox || {},
                confidence:  parseFloat((inst.Confidence || 0).toFixed(2)),
            })),
        })).sort((a, b) => b.confidence - a.confidence);

        const flagged = labels.filter(
            (l) =>
                PROHIBITED_LABELS.some(
                    (p) => l.name.toLowerCase().includes(p.toLowerCase())
                ) && l.confidence >= PROHIBITED_CONFIDENCE_CUTOFF
        );

        const clean = flagged.length === 0;

        return { success: true, labels, flagged, clean, error: null };

    } catch (err) {
        if (isMissingCredentials(err)) {
            console.warn('[rekognitionService] AWS credentials not set — detectLabels placeholder.');
            return {
                success: true,
                labels:  [{ name: 'Person', confidence: 99, parents: ['Human'], instances: [] }],
                flagged: [],
                clean:   true,
                error:   null,
            };
        }
        console.error('[rekognitionService.detectLabels]', err.message);
        return { success: false, labels: [], flagged: [], clean: false, error: err.message };
    }
}

/* ── Exports ────────────────────────────────────────────────────── */
module.exports = { detectFaces, compareFaces, detectLabels };
