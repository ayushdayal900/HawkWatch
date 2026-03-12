/**
 * verification.controller.js
 * ──────────────────────────────────────────────────────────────────
 * Handles the full verification pipeline:
 *
 *  POST /api/verification/id-card
 *    1. Receive ID card image (base64)
 *    2. Run Rekognition detectFaces()  — checks face presence + quality
 *    3. Store image in the in-process temp store (TTL 30 min)
 *    4. Persist metadata to MongoDB (no large image blob in DB)
 *    5. Return { verified, confidence }
 *
 *  POST /api/verification/face
 *    1. Receive live webcam image
 *    2. Pull stored ID image from temp store (or DB fallback)
 *    3. Run Rekognition compareFaces()
 *    4. Persist result to MongoDB
 *    5. Return { matched, confidence }
 *
 *  GET /api/verification/record/:studentId
 *    Returns stored verification metadata (no images).
 *
 * Quality thresholds (env-configurable):
 *  VERIFY_MIN_BRIGHTNESS    (default 25)
 *  VERIFY_MIN_SHARPNESS     (default 20)
 *  VERIFY_MIN_FACE_CONF     (default 80)
 *  REKOGNITION_SIMILARITY_THRESHOLD (default 70)
 */

'use strict';

const VerificationRecord = require('../models/VerificationRecord');
const rekogSvc           = require('../services/rekognitionService');   // new focused service
const rekognitionCompat  = require('../services/rekognition.service');  // S3 upload helper
const ProctorEvent       = require('../models/ProctorEvent');
const VerificationSession= require('../models/VerificationSession');

/* ════════════════════════════════════════════════════════════════════
   IN-PROCESS TEMP STORE
   Key:   studentId  (string)
   Value: { image: base64, storedAt: Date, examId }
   TTL:   30 minutes — flushed by a cleanup interval
   Note:  For multi-instance / production use, swap this Map for
          Redis or an S3 pre-signed URL pattern.
   ════════════════════════════════════════════════════════════════════ */
const tempStore = new Map();
const TEMP_TTL_MS = 30 * 60 * 1000; // 30 minutes

// Cleanup stale entries every 5 minutes
setInterval(() => {
    const now = Date.now();
    for (const [key, val] of tempStore.entries()) {
        if (now - val.storedAt > TEMP_TTL_MS) tempStore.delete(key);
    }
}, 5 * 60 * 1000);

/* ── Quality thresholds ─────────────────────────────────────────── */
const MIN_BRIGHTNESS = parseFloat(process.env.VERIFY_MIN_BRIGHTNESS || '25');
const MIN_SHARPNESS  = parseFloat(process.env.VERIFY_MIN_SHARPNESS  || '20');
const MIN_FACE_CONF  = parseFloat(process.env.VERIFY_MIN_FACE_CONF  || '80');

/* ════════════════════════════════════════════════════════════════════
   POST /api/verification/id-card
   Body: { studentId, idImage [base64], examId? }
   ════════════════════════════════════════════════════════════════════ */
exports.verifyIdCard = async (req, res) => {
    try {
        const { studentId, idImage, examId = null } = req.body;

        /* ── 1. Input validation ──────────────────────────────────── */
        if (!studentId || !idImage) {
            return res.status(400).json({
                success: false,
                message: 'studentId and idImage are required.',
            });
        }

        /* ── 2. Rekognition detectFaces() ────────────────────────── */
        const faceResult = await rekogSvc.detectFaces(idImage);

        if (!faceResult.success) {
            return res.status(502).json({
                success:    false,
                verified:   false,
                confidence: 0,
                message:    'Face detection service unavailable: ' + faceResult.error,
            });
        }

        /* ── 3. Check: at least one face present ─────────────────── */
        if (faceResult.faceCount === 0) {
            return res.status(200).json({
                success:    true,
                verified:   false,
                confidence: 0,
                message:    'No face detected on the ID card. Please retake a clearer photo.',
                quality:    null,
            });
        }

        const face = faceResult.faces[0]; // primary / highest-confidence face

        /* ── 4. Quality gate ─────────────────────────────────────── */
        const { brightness, sharpness } = face.quality;
        const qualityPassed = (
            face.confidence  >= MIN_FACE_CONF   &&
            brightness       >= MIN_BRIGHTNESS  &&
            sharpness        >= MIN_SHARPNESS
        );

        if (!qualityPassed) {
            return res.status(200).json({
                success:    true,
                verified:   false,
                confidence: face.confidence,
                message:    `Image quality insufficient (brightness: ${brightness}, sharpness: ${sharpness}). Please use better lighting and hold the ID steady.`,
                quality:    face.quality,
            });
        }

        /* ── 5. Store ID image in temp store ─────────────────────── */
        const tempKey = `${studentId}:${examId || 'noexam'}`;
        tempStore.set(tempKey, {
            image:    idImage,
            storedAt: Date.now(),
            examId,
        });

        /* ── 6. Optionally upload to S3 ──────────────────────────── */
        const s3Key = await rekognitionCompat.uploadImageToS3(
            idImage,
            `verifications/${studentId}/id_${Date.now()}.jpg`
        );

        /* ── 7. Persist metadata to MongoDB (no image blob) ──────── */
        const record = await VerificationRecord.findOneAndUpdate(
            { studentId, examId },
            {
                $set: {
                    idImage:      s3Key || '[temp]',   // store S3 key or placeholder
                    idVerified:   true,
                    idConfidence: face.confidence,
                    idVerifiedAt: new Date(),
                },
            },
            { upsert: true, new: true }
        );

        /* ── 8. Return result ────────────────────────────────────── */
        return res.status(200).json({
            success:    true,
            verified:   true,
            confidence: face.confidence,
            message:    `ID card accepted — face detected with ${face.confidence}% confidence.`,
            quality:    face.quality,
            faceCount:  faceResult.faceCount,
            recordId:   record._id,
        });

    } catch (err) {
        console.error('[verifyIdCard]', err);
        return res.status(500).json({ success: false, message: 'Internal server error.' });
    }
};

/* ════════════════════════════════════════════════════════════════════
   POST /api/verification/face
   Body: { studentId, liveImage [base64], idImage? [base64], examId? }
   ════════════════════════════════════════════════════════════════════ */
exports.verifyFace = async (req, res) => {
    try {
        const { studentId, liveImage, idImage = null, examId = null } = req.body;

        if (!studentId || !liveImage) {
            return res.status(400).json({
                success: false,
                message: 'studentId and liveImage are required.',
            });
        }

        /* ── Resolve reference ID image ──────────────────────────── */
        let referenceImage = idImage;

        // 1st priority: temp store (freshest, in-memory)
        if (!referenceImage) {
            const tempKey = `${studentId}:${examId || 'noexam'}`;
            referenceImage = tempStore.get(tempKey)?.image || null;
        }

        // 2nd priority: MongoDB record (for persistence across restarts)
        if (!referenceImage) {
            const existing = await VerificationRecord
                .findOne({ studentId, examId })
                .sort({ createdAt: -1 });
            referenceImage = existing?.idImage?.startsWith('data:') ? existing.idImage : null;
        }

        /* ── Run Rekognition compareFaces ────────────────────────── */
        const threshold  = parseFloat(process.env.REKOGNITION_SIMILARITY_THRESHOLD || '70');
        const cmpResult  = await rekogSvc.compareFaces(referenceImage, liveImage, threshold);

        /* ── Upload live image to S3 ─────────────────────────────── */
        await rekognitionCompat.uploadImageToS3(
            liveImage,
            `verifications/${studentId}/face_${Date.now()}.jpg`
        );

        /* ── Persist result ──────────────────────────────────────── */
        await VerificationRecord.findOneAndUpdate(
            { studentId, examId },
            {
                $set: {
                    liveImage:      '[temp]',
                    faceMatched:    cmpResult.matched,
                    faceConfidence: cmpResult.similarity,
                    faceMatchedAt:  cmpResult.matched ? new Date() : null,
                },
            },
            { upsert: true, new: true }
        );

        return res.status(200).json({
            success:       true,
            matched:       cmpResult.matched,
            confidence:    cmpResult.similarity,
            threshold,
            unmatchedCount: cmpResult.unmatchedCount,
            message:       cmpResult.matched
                ? `Face matched — similarity ${cmpResult.similarity}%.`
                : `Face match failed — similarity ${cmpResult.similarity}% is below the ${threshold}% threshold.`,
        });

    } catch (err) {
        console.error('[verifyFace]', err);
        return res.status(500).json({ success: false, message: 'Internal server error.' });
    }
};

/* ════════════════════════════════════════════════════════════════════
   POST /api/verification/face-match
   Body: { idImage [base64], liveImage [base64] }
   ════════════════════════════════════════════════════════════════════ */
exports.verifyFaceMatch = async (req, res) => {
    try {
        const { idImage, liveImage } = req.body;

        if (!idImage || !liveImage) {
            return res.status(400).json({
                success: false,
                message: 'Both idImage and liveImage are required.',
            });
        }

        /* ── Run Rekognition compareFaces with 20% threshold ─────── */
        const threshold = 20;
        const cmpResult = await rekogSvc.compareFaces(idImage, liveImage, threshold);

        /* ── Return requested exact payload format ───────────────── */
        return res.status(200).json({
            match:      cmpResult.matched,
            confidence: cmpResult.similarity,
            success:    true,
        });

    } catch (err) {
        console.error('[verifyFaceMatch]', err);
        return res.status(500).json({ success: false, message: 'Internal server error.' });
    }
};

/* ════════════════════════════════════════════════════════════════════
   POST /api/verification/environment-scan
   Body: { image [base64], examId? }
   ════════════════════════════════════════════════════════════════════ */
exports.scanEnvironment = async (req, res) => {
    try {
        const { image, examId } = req.body;
        const studentId = req.user?.id || req.body.studentId;

        if (!image) {
            return res.status(400).json({ success: false, message: 'image is required.' });
        }

        // 1. Run detectLabels
        const labelResult = await rekogSvc.detectLabels(image);

        if (!labelResult.success) {
            return res.status(502).json({ success: false, message: 'Detection service unavailable: ' + labelResult.error });
        }

        const alerts = [];

        // 2. Check for prohibited object labels
        if (!labelResult.clean && labelResult.flagged.length > 0) {
            const hasPhone = labelResult.flagged.some(f => f.name.toLowerCase().includes('phone'));
            const hasBook  = labelResult.flagged.some(f => f.name.toLowerCase().includes('book') || f.name.toLowerCase().includes('paper'));
            const hasScreen= labelResult.flagged.some(f => ['screen', 'computer', 'monitor', 'laptop', 'tablet'].some(n => f.name.toLowerCase().includes(n)));

            if (hasPhone) alerts.push('PHONE_DETECTED');
            if (hasBook)  alerts.push('BOOK_DETECTED');
            if (hasScreen)alerts.push('SCREEN_DETECTED');
        }

        // 3. Count persons
        const personLabel = labelResult.labels.find(l => l.name === 'Person');
        const personCount = personLabel ? personLabel.instances.length : 0;

        if (personCount > 1) {
            alerts.push('MULTIPLE_PERSON_DETECTED');
        }

        // 4. Log to ProctorEvent if an exam is active
        if (alerts.length > 0 && examId && studentId) {
            const events = alerts.map(eventType => ({
                studentId,
                examId,
                eventType,
                riskWeight: 10,
                timestamp: new Date()
            }));
            await ProctorEvent.insertMany(events);
        }

        return res.status(200).json({
            success: true,
            alerts,
            clean: alerts.length === 0,
            personCount
        });

    } catch (err) {
        console.error('[scanEnvironment]', err);
        return res.status(500).json({ success: false, message: 'Internal server error.' });
    }
};

/* ════════════════════════════════════════════════════════════════════
   POST /api/verification/session
   Saves the completion state of the multi-step verification
   ════════════════════════════════════════════════════════════════════ */
exports.createVerificationSession = async (req, res) => {
    try {
        const { examId, idVerified, faceMatched, livenessPassed, environmentSafe } = req.body;
        const studentId = req.user?.id || req.body.studentId;

        if (!examId) {
            return res.status(400).json({ success: false, message: 'examId is required.' });
        }

        const session = await VerificationSession.create({
            studentId,
            examId,
            idVerified,
            faceMatched,
            livenessPassed,
            environmentSafe
        });

        return res.status(201).json({ success: true, data: session });
    } catch (err) {
        console.error('[createVerificationSession]', err);
        return res.status(500).json({ success: false, message: 'Internal server error.' });
    }
};

/* ════════════════════════════════════════════════════════════════════
   GET /api/verification/record/:studentId
   ════════════════════════════════════════════════════════════════════ */
exports.getVerificationRecord = async (req, res) => {
    try {
        const { studentId } = req.params;
        const { examId }    = req.query;

        const query = { studentId };
        if (examId) query.examId = examId;

        const record = await VerificationRecord
            .findOne(query)
            .sort({ createdAt: -1 })
            .select('-idImage -liveImage');   // omit large image fields

        if (!record) {
            return res.status(404).json({ success: false, message: 'No verification record found.' });
        }

        // Also include temp store status
        const tempKey   = `${studentId}:${examId || 'noexam'}`;
        const inTempStore = tempStore.has(tempKey);

        return res.status(200).json({
            success: true,
            data:    record,
            meta:    { idImageInTempStore: inTempStore },
        });

    } catch (err) {
        console.error('[getVerificationRecord]', err);
        return res.status(500).json({ success: false, message: 'Internal server error.' });
    }
};
