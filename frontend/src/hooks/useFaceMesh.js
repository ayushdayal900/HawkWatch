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

    const [ready,       setReady]       = useState(false);
    const [error,       setError]       = useState(null);
    const [results,     setResults]     = useState(null);
    const [faceDetected, setFaceDetected] = useState(false);
    const [landmarks,   setLandmarks]   = useState(null);

    /* ── Load MediaPipe lazily from CDN ────────────────────────── */
    useEffect(() => {
        let cancelled = false;
        async function load() {
            try {
                await loadScript(FACE_MESH_CDN);
                await loadScript(CAMERA_CDN);

                if (cancelled) return;

                // FaceMesh and Camera are injected into window by the CDN scripts above
                const faceMesh = new window.FaceMesh({
                    locateFile: (file) =>
                        `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`,
                });

                faceMesh.setOptions({
                    maxNumFaces:          1,
                    refineLandmarks:      true,
                    minDetectionConfidence: 0.5,
                    minTrackingConfidence:  0.5,
                });

                faceMesh.onResults((res) => {
                    if (cancelled) return;
                    setResults(res);
                    const detected = res.multiFaceLandmarks?.length > 0;
                    setFaceDetected(detected);
                    setLandmarks(detected ? res.multiFaceLandmarks[0] : null);
                });

                await faceMesh.initialize();
                faceMeshRef.current = faceMesh;
                _faceMeshLoaded = true;
                if (!cancelled) setReady(true);
            } catch (e) {
                if (!cancelled) setError('Failed to load MediaPipe FaceMesh: ' + e.message);
            }
        }
        if (!_faceMeshLoaded) {
            load();
        } else {
            // Defer to avoid set-state-in-effect warning
            const t = setTimeout(() => { if (!cancelled) setReady(true); }, 0);
            return () => { cancelled = true; clearTimeout(t); };
        }
        return () => { cancelled = true; };
    }, []);

    /* ── Start tracking loop ───────────────────────────────────── */
    const startTracking = useCallback(() => {
        const video = videoRef?.current;
        if (!video || !faceMeshRef.current || !window.Camera) return;
        const cam = new window.Camera(video, {
            onFrame: async () => {
                if (faceMeshRef.current) {
                    await faceMeshRef.current.send({ image: video });
                }
            },
            width: 640,
            height: 480,
        });
        cameraRef.current = cam;
        cam.start();
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

    return { ready, error, results, faceDetected, landmarks, headPose: { pitch: 0, yaw: 0, roll: 0 }, gazeVector: { x: 0, y: 0 }, isLoaded: ready, startTracking, stopTracking, sendFrame };
}
