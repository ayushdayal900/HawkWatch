/**
 * upload.middleware.js
 * ──────────────────────────────────────────────────────────────────
 * Multer configuration for image file uploads.
 * Used by verification routes when clients send multipart/form-data
 * instead of base64 JSON payloads.
 *
 * Accepted:
 *   field names: idImage | liveImage | frame
 *   types:       image/jpeg | image/png | image/webp
 *   max size:    10 MB per file
 */

const multer = require('multer');

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

/* Use memory storage — files kept as Buffer (req.file.buffer) */
const storage = multer.memoryStorage();

function fileFilter(_req, file, cb) {
    if (ALLOWED_TYPES.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error(`Unsupported file type: ${file.mimetype}. Allowed: ${ALLOWED_TYPES.join(', ')}`));
    }
}

const upload = multer({
    storage,
    fileFilter,
    limits: { fileSize: MAX_SIZE_BYTES },
});

/**
 * Single-field helpers for routes:
 *   upload.single('idImage')
 *   upload.single('liveImage')
 *
 * Mixed upload (both ID + face in one request):
 *   upload.fields([{ name: 'idImage', maxCount: 1 }, { name: 'liveImage', maxCount: 1 }])
 */
module.exports = upload;
