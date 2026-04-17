/**
 * FaceVerification.jsx
 * ──────────────────────────────────────────────────────────────────
 * Captures the student's live face and sends it (along with the
 * already-captured ID image) to POST /api/verification/face.
 * Returns a confidence score from the backend placeholder.
 *
 * Props:
 *   studentId    (string)
 *   idImageB64   (string)  – base64 from IDVerification step
 *   onVerified   (result)  – called when match passes
 *   onError      ()        – called on failure / low score
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import api from '../services/api';
import useFaceMesh from '../hooks/useFaceMesh';
import {
    Camera, RefreshCw, CheckCircle, XCircle, RotateCcw,
} from 'lucide-react';

/* ── style helpers ──────────────────────────────────────────────── */
const card  = { background: '#fff', borderRadius: 12, border: '1px solid #E2E8F0', padding: '1.5rem' };
const mkBtn = (bg, full = false, disabled = false) => ({
    display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
    background: disabled ? '#CBD5E1' : bg, color: '#fff',
    border: 'none', borderRadius: 8, padding: '0.7rem 1.4rem',
    fontWeight: 600, fontSize: '0.875rem', cursor: disabled ? 'not-allowed' : 'pointer',
    width: full ? '100%' : undefined, justifyContent: full ? 'center' : undefined,
    transition: 'opacity 0.15s',
});

const CONFIDENCE_THRESHOLD = 75; // % minimum to pass

/* ── Confidence meter ───────────────────────────────────────────── */
function ConfidenceMeter({ score }) {
    const pct   = Math.min(100, Math.max(0, score));
    const color = pct >= CONFIDENCE_THRESHOLD ? '#22C55E' : pct >= 50 ? '#F59E0B' : '#EF4444';
    return (
        <div style={{ marginTop: '0.65rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontSize: '0.72rem', color: '#64748B', fontWeight: 600 }}>Match Confidence</span>
                <span style={{ fontSize: '0.72rem', color, fontWeight: 700 }}>{pct.toFixed(1)}%</span>
            </div>
            <div style={{ height: 7, background: '#E2E8F0', borderRadius: 99, overflow: 'hidden' }}>
                <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 99, transition: 'width 0.6s ease' }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 2 }}>
                <span style={{ fontSize: '0.65rem', color: '#94A3B8' }}>Threshold: {CONFIDENCE_THRESHOLD}%</span>
            </div>
        </div>
    );
}

/* ── Status banner ──────────────────────────────────────────────── */
function Banner({ type, children }) {
    const styles = {
        success: { bg: '#F0FDF4', border: '#BBF7D0', color: '#15803D', Icon: CheckCircle },
        error:   { bg: '#FEF2F2', border: '#FECACA', color: '#DC2626', Icon: XCircle    },
    };
    const s = styles[type];
    return (
        <div style={{ marginTop: '0.85rem', padding: '0.65rem 0.9rem', background: s.bg, border: `1px solid ${s.border}`, borderRadius: 8, fontSize: '0.8rem', color: s.color, display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
            <s.Icon size={14} style={{ flexShrink: 0, marginTop: 1 }} />
            <span>{children}</span>
        </div>
    );
}

/* ── Main Component ─────────────────────────────────────────────── */
export default function FaceVerification({ sessionId, onVerified, onError }) {
    const videoRef  = useRef(null);
    const streamRef = useRef(null);

    const [camReady,  setCamReady]  = useState(false);
    const [preview,   setPreview]   = useState(null);
    const [status,    setStatus]    = useState('idle');
    const [result,    setResult]    = useState(null);

    /* MediaPipe real-time face detection */
    const { ready: meshReady, modelLoading, faceDetected, startTracking, stopTracking } = useFaceMesh(videoRef);

    const startCamera = useCallback(() => {
        navigator.mediaDevices
            .getUserMedia({ video: { width: 640, height: 480, facingMode: 'user' }, audio: false })
            .then(stream => {
                streamRef.current = stream;
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                    // camReady is set via onLoadedData on the <video> element
                    // so we only flip it once the video is truly playing frames
                }
            })
            .catch(() => setCamReady(false));
    }, []);

    useEffect(() => {
        startCamera();
        return () => streamRef.current?.getTracks().forEach(t => t.stop());
    }, [startCamera]);

    /* Start MediaPipe tracking once camera and model are both ready */
    useEffect(() => {
        if (camReady && meshReady && !preview) startTracking();
        else stopTracking();
    }, [camReady, meshReady, preview, startTracking, stopTracking]);

    /* Capture face frame */
    const captureFace = useCallback(() => {
        const v = videoRef.current;
        if (!v) return;
        const canvas = document.createElement('canvas');
        canvas.width  = v.videoWidth;
        canvas.height = v.videoHeight;
        canvas.getContext('2d').drawImage(v, 0, 0);
        setPreview(canvas.toDataURL('image/jpeg', 0.85));
        streamRef.current?.getTracks().forEach(t => t.stop());
    }, []);

    /* Retake */
    const retake = () => {
        setPreview(null);
        setStatus('idle');
        setResult(null);
        startCamera();
    };

    /* Submit to backend */
    const submitMatch = async () => {
        if (!preview) return;
        setStatus('checking');
        try {
            const { data } = await api.post('/verification/face', {
                sessionId,
                frameBase64: preview,
            });
            setResult(data);
            if (data.passed) {
                setStatus('verified');
                onVerified?.(data);
            } else {
                setStatus('failed');
                onError?.();
            }
        } catch {
            setStatus('failed');
            setResult({ passed: false, confidence: 0, message: 'Server error during face match.' });
            onError?.();
        }
    };

    return (
        <div style={card}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1rem' }}>
                <div style={{ width: 36, height: 36, borderRadius: 8, background: '#F5F3FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Camera size={18} color="#8B5CF6" />
                </div>
                <div>
                    <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#1E293B' }}>Face Verification</h3>
                    <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748B' }}>Look directly at the camera — your face will be matched with your ID.</p>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem' }}>
                {/* Live webcam / captured preview */}
                <div>
                    <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>Live / Captured</div>
                    <div style={{ position: 'relative', borderRadius: 10, overflow: 'hidden', background: '#0F172A', aspectRatio: '4/3' }}>
                        {!preview ? (
                            <>
                                <video
                                    ref={videoRef}
                                    autoPlay
                                    muted
                                    playsInline
                                    onLoadedData={() => setCamReady(true)}
                                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                                />
                                {/* Oval face guide */}
                                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                                    <div style={{ width: '55%', height: '80%', border: `2.5px solid ${faceDetected ? 'rgba(34,197,94,0.85)' : 'rgba(139,92,246,0.75)'}`, borderRadius: '50%', boxShadow: `0 0 0 9999px rgba(0,0,0,0.38)`, transition: 'border-color 0.2s' }} />
                                </div>
                                {/* Real-time face status pill */}
                                <div style={{ position: 'absolute', top: 8, left: 0, right: 0, display: 'flex', justifyContent: 'center', pointerEvents: 'none' }}>
                                    <span style={{
                                        background: modelLoading
                                            ? 'rgba(100,116,139,0.85)'
                                            : faceDetected
                                                ? 'rgba(22,163,74,0.9)'
                                                : 'rgba(220,38,38,0.85)',
                                        color: '#fff',
                                        padding: '3px 10px', borderRadius: 99, fontSize: '0.68rem',
                                        fontWeight: 700, backdropFilter: 'blur(4px)', transition: 'background 0.25s',
                                    }}>
                                        {modelLoading
                                            ? '⏳ Loading model…'
                                            : faceDetected
                                                ? '✓ Face Detected'
                                                : '✗ No face in frame'}
                                    </span>
                                </div>
                                {!camReady && (
                                    <div style={{ position: 'absolute', inset: 0, background: 'rgba(15,23,42,0.92)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                                        <Camera size={26} color="#EF4444" />
                                        <p style={{ color: '#FCA5A5', margin: 0, fontSize: '0.78rem', textAlign: 'center' }}>Camera permission required</p>
                                    </div>
                                )}
                            </>
                        ) : (
                            <>
                                <img src={preview} alt="Captured face" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                                {status === 'verified' && (
                                    <div style={{ position: 'absolute', inset: 0, background: 'rgba(22,163,74,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <CheckCircle size={52} color="#22C55E" />
                                    </div>
                                )}
                                {status === 'failed' && (
                                    <div style={{ position: 'absolute', inset: 0, background: 'rgba(220,38,38,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <XCircle size={52} color="#EF4444" />
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* Confidence bar (shown after result) */}
            {result?.confidence !== undefined && <ConfidenceMeter score={result.confidence} />}

            {/* Banners */}
            {status === 'verified' && (
                <Banner type="success">Face matched with ID card — confidence {result?.confidence?.toFixed(1)}%. Identity confirmed.</Banner>
            )}
            {status === 'failed' && (
                <Banner type="error">{result?.message || `Confidence too low (${result?.confidence?.toFixed(1)}%). Please retake with better lighting.`}</Banner>
            )}

            {/* Actions */}
            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.1rem' }}>
                {!preview && (
                    <button style={mkBtn('#8B5CF6', true, !camReady || !faceDetected)} onClick={captureFace} disabled={!camReady || !faceDetected}>
                        <Camera size={14} /> {faceDetected ? 'Capture Face' : 'Align face in oval'}
                    </button>
                )}
                {preview && status !== 'verified' && (
                    <button style={mkBtn('#64748B')} onClick={retake}>
                        <RotateCcw size={14} /> Retake
                    </button>
                )}
                {preview && status !== 'verified' && (
                    <button style={mkBtn('#8B5CF6', true, status === 'checking')} onClick={submitMatch} disabled={status === 'checking'}>
                        {status === 'checking'
                            ? <><RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} /> Matching face…</>
                            : <><CheckCircle size={14} /> Verify Face Match</>
                        }
                    </button>
                )}
            </div>

            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
    );
}
