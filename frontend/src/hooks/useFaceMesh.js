/**
 * useFaceMesh.js
 * ──────────────────────────────────────────────────────────────────
 * React hook that wraps @mediapipe/face_mesh for real-time face
 * landmark tracking on a <video> element.
 *
 * Usage:
 *   const { ready, results, startTracking, stopTracking } = useFaceMesh(videoRef);
 *
 * Returns:
 *   ready          – true once the model is loaded
 *   modelLoading   – true while the CDN scripts / WASM are being fetched
 *   results        – latest FaceMesh results object (see MediaPipe docs)
 *   faceDetected   – boolean: at least one face found in last frame
 *   landmarks      – normalised 3-D landmark array from the first face
 *   startTracking  – call this to begin frame-by-frame analysis
 *   stopTracking   – call this to stop processing
 *   error          – error message if model load failed
 */

import { useCallback, useEffect, useRef, useState } from 'react';

// MediaPipe CDN paths (loaded lazily from unpkg so no Vite bundling issues)
const FACE_MESH_CDN  = 'https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/face_mesh.js';
const CAMERA_CDN     = 'https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js';

let _faceMeshLoaded = false; // singleton guard

function loadScript(src) {
    return new Promise((resolve, reject) => {
        if (document.querySelector(`script[src="${src}"]`)) { resolve(); return; }
        const el = document.createElement('script');
        el.src = src;
        el.onload  = resolve;
        el.onerror = reject;
        document.head.appendChild(el);
    });
}

export default function useFaceMesh(videoRef) {
    const faceMeshRef = useRef(null);
    const cameraRef   = useRef(null);
    const frameRef    = useRef(null);

    const [ready,        setReady]        = useState(false);
    const [modelLoading, setModelLoading] = useState(true);
    const [error,        setError]        = useState(null);
    const [results,      setResults]      = useState(null);
    const [faceDetected, setFaceDetected] = useState(false);
    const [landmarks,    setLandmarks]    = useState(null);

    /* ── Load MediaPipe lazily from CDN ────────────────────────── */
    useEffect(() => {
        let cancelled = false;

        async function load(attempt = 1) {
            try {
                setModelLoading(true);
                await loadScript(FACE_MESH_CDN);
                await loadScript(CAMERA_CDN);

                if (cancelled) return;

                // FaceMesh is injected into window by the CDN scripts above
                const faceMesh = new window.FaceMesh({
                    locateFile: (file) =>
                        `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`,
                });

                faceMesh.setOptions({
                    maxNumFaces:            1,
                    // refineLandmarks off → faster, more reliable at distance
                    refineLandmarks:        false,
                    minDetectionConfidence: 0.3,   // was 0.5 — more lenient
                    minTrackingConfidence:  0.3,   // was 0.5
                });

                faceMesh.onResults((res) => {
                    if (cancelled) return;
                    setResults(res);
                    const detected = Array.isArray(res.multiFaceLandmarks) &&
                                     res.multiFaceLandmarks.length > 0;
                    setFaceDetected(detected);
                    setLandmarks(detected ? res.multiFaceLandmarks[0] : null);
                });

                await faceMesh.initialize();
                if (cancelled) return;

                faceMeshRef.current = faceMesh;
                setReady(true);
                setModelLoading(false);
            } catch (e) {
                if (cancelled) return;
                if (attempt < 3) {
                    // Retry up to 2 more times (CDN can be flaky)
                    setTimeout(() => load(attempt + 1), 2000);
                } else {
                    setModelLoading(false);
                    setError('Failed to load MediaPipe FaceMesh: ' + e.message);
                }
            }
        }

        load();

        return () => { cancelled = true; };
    }, []);

    /* ── Start tracking loop ───────────────────────────────────── */
    const startTracking = useCallback(() => {
        const video = videoRef?.current;
        if (!video || !faceMeshRef.current) return;

        if (frameRef.current) return; // loop already running

        async function detectFrame() {
            if (!faceMeshRef.current) return;
            const v = videoRef?.current;
            if (!v) return;

            // readyState >= 2 → HAVE_CURRENT_DATA: at least one frame decoded
            // Also guard against zero-dimension frames
            if (v.readyState >= 2 && v.videoWidth > 0 && !v.paused && !v.ended) {
                try {
                    await faceMeshRef.current.send({ image: v });
                } catch (_) {
                    // Silently ignore per-frame errors
                }
            }
            frameRef.current = requestAnimationFrame(detectFrame);
        }
        frameRef.current = requestAnimationFrame(detectFrame);
    }, [videoRef]);

    /* ── Manual single-frame send (when managing own video) ────── */
    const sendFrame = useCallback(async () => {
        const video = videoRef?.current;
        if (!video || !faceMeshRef.current) return;
        await faceMeshRef.current.send({ image: video });
    }, [videoRef]);

    /* ── Stop tracking ─────────────────────────────────────────── */
    const stopTracking = useCallback(() => {
        cameraRef.current?.stop();
        cameraRef.current = null;
        if (frameRef.current) { cancelAnimationFrame(frameRef.current); frameRef.current = null; }
    }, []);

    useEffect(() => () => stopTracking(), [stopTracking]);

    return {
        ready, modelLoading, error,
        results, faceDetected, landmarks,
        headPose: { pitch: 0, yaw: 0, roll: 0 },
        gazeVector: { x: 0, y: 0 },
        isLoaded: ready,
        startTracking, stopTracking, sendFrame,
    };
}
