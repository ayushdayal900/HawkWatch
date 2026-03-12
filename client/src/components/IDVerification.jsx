/**
 * IDVerification.jsx
 * ──────────────────────────────────────────────────────────────────
 * Captures an ID card photo via webcam OR file upload.
 * Sends to POST /api/verification/id-card and returns the result.
 *
 * Props:
 *   studentId  (string)
 *   onVerified (imageDataUrl, result) – called when backend says verified
 *   onError    ()                     – called on error / failed check
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import api from '../services/api';
import {
    Camera, RefreshCw, CheckCircle, XCircle,
    Upload, CreditCard, RotateCcw,
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

/* ── Status banner ──────────────────────────────────────────────── */
function Banner({ type, children }) {
    const styles = {
        success: { bg: '#F0FDF4', border: '#BBF7D0', color: '#15803D', Icon: CheckCircle },
        error:   { bg: '#FEF2F2', border: '#FECACA', color: '#DC2626', Icon: XCircle    },
    };
    const s = styles[type];
    return (
        <div style={{ marginTop: '0.85rem', padding: '0.65rem 0.9rem', background: s.bg, border: `1px solid ${s.border}`, borderRadius: 8, fontSize: '0.8rem', color: s.color, display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <s.Icon size={14} style={{ flexShrink: 0 }} />
            {children}
        </div>
    );
}

/* ── Main Component ─────────────────────────────────────────────── */
export default function IDVerification({ studentId, onVerified, onError }) {
    const videoRef   = useRef(null);
    const streamRef  = useRef(null);

    const [mode,      setMode]      = useState('camera');   // 'camera' | 'upload'
    const [camReady,  setCamReady]  = useState(false);
    const [preview,   setPreview]   = useState(null);       // base64 or object URL
    const [status,    setStatus]    = useState('idle');     // idle | checking | verified | failed
    const [result,    setResult]    = useState(null);       // backend response

    /* Start webcam */
    const startCamera = useCallback(() => {
        navigator.mediaDevices
            .getUserMedia({ video: { width: 1280, height: 720 }, audio: false })
            .then(stream => {
                streamRef.current = stream;
                if (videoRef.current) videoRef.current.srcObject = stream;
                setCamReady(true);
            })
            .catch(() => setCamReady(false));
    }, []);

    useEffect(() => {
        if (mode === 'camera') startCamera();
        return () => streamRef.current?.getTracks().forEach(t => t.stop());
    }, [mode, startCamera]);

    /* Capture frame from webcam */
    const captureFromCamera = useCallback(() => {
        const v = videoRef.current;
        if (!v) return;
        const canvas = document.createElement('canvas');
        canvas.width  = v.videoWidth;
        canvas.height = v.videoHeight;
        canvas.getContext('2d').drawImage(v, 0, 0);
        setPreview(canvas.toDataURL('image/jpeg', 0.85));
        // Stop camera preview after capture - user sees still image
        streamRef.current?.getTracks().forEach(t => t.stop());
    }, []);

    /* Handle file upload */
    const handleFileUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = ev => setPreview(ev.target.result);
        reader.readAsDataURL(file);
    };

    /* Retake */
    const retake = () => {
        setPreview(null);
        setStatus('idle');
        setResult(null);
        if (mode === 'camera') startCamera();
    };

    /* Submit to backend */
    const submitVerification = async () => {
        if (!preview) return;
        setStatus('checking');
        try {
            const { data } = await api.post('/verification/id-card', {
                studentId,
                idImage: preview,
            });
            setResult(data);
            if (data.verified) {
                setStatus('verified');
                onVerified?.(preview, data);
            } else {
                setStatus('failed');
                onError?.();
            }
        } catch {
            setStatus('failed');
            setResult({ verified: false, message: 'Server error during ID verification.' });
            onError?.();
        }
    };

    return (
        <div style={card}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1rem' }}>
                <div style={{ width: 36, height: 36, borderRadius: 8, background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <CreditCard size={18} color="#3B82F6" />
                </div>
                <div>
                    <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#1E293B' }}>ID Card Capture</h3>
                    <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748B' }}>Hold your government-issued ID clearly in frame.</p>
                </div>
                {/* Mode toggle */}
                <div style={{ marginLeft: 'auto', display: 'flex', border: '1px solid #E2E8F0', borderRadius: 8, overflow: 'hidden' }}>
                    {['camera', 'upload'].map(m => (
                        <button key={m} onClick={() => { setMode(m); setPreview(null); setStatus('idle'); }}
                            style={{ padding: '0.35rem 0.8rem', border: 'none', fontSize: '0.72rem', fontWeight: 600, cursor: 'pointer', background: mode === m ? '#3B82F6' : '#fff', color: mode === m ? '#fff' : '#64748B', display: 'flex', alignItems: 'center', gap: 4 }}>
                            {m === 'camera' ? <Camera size={12} /> : <Upload size={12} />}
                            {m === 'camera' ? 'Webcam' : 'Upload'}
                        </button>
                    ))}
                </div>
            </div>

            {/* Viewport */}
            {!preview ? (
                mode === 'camera' ? (
                    <div style={{ position: 'relative', borderRadius: 10, overflow: 'hidden', background: '#0F172A', aspectRatio: '16/9' }}>
                        <video ref={videoRef} autoPlay muted playsInline style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                        {/* ID card guide rect */}
                        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                            <div style={{ width: '70%', height: '55%', border: '2.5px solid rgba(59,130,246,0.7)', borderRadius: 10, boxShadow: '0 0 0 9999px rgba(0,0,0,0.4)' }}>
                                <div style={{ position: 'absolute', top: -1, left: -1, width: 18, height: 18, borderTop: '3px solid #3B82F6', borderLeft: '3px solid #3B82F6', borderRadius: '3px 0 0 0' }} />
                                <div style={{ position: 'absolute', top: -1, right: -1, width: 18, height: 18, borderTop: '3px solid #3B82F6', borderRight: '3px solid #3B82F6', borderRadius: '0 3px 0 0' }} />
                                <div style={{ position: 'absolute', bottom: -1, left: -1, width: 18, height: 18, borderBottom: '3px solid #3B82F6', borderLeft: '3px solid #3B82F6', borderRadius: '0 0 0 3px' }} />
                                <div style={{ position: 'absolute', bottom: -1, right: -1, width: 18, height: 18, borderBottom: '3px solid #3B82F6', borderRight: '3px solid #3B82F6', borderRadius: '0 0 3px 0' }} />
                            </div>
                        </div>
                        {!camReady && (
                            <div style={{ position: 'absolute', inset: 0, background: 'rgba(15,23,42,0.9)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                                <Camera size={28} color="#EF4444" />
                                <p style={{ color: '#FCA5A5', margin: 0, fontSize: '0.8rem', textAlign: 'center' }}>Camera permission required</p>
                            </div>
                        )}
                    </div>
                ) : (
                    <label style={{ display: 'block', border: '2px dashed #CBD5E1', borderRadius: 10, padding: '2.5rem', textAlign: 'center', cursor: 'pointer', background: '#F8FAFC' }}>
                        <input type="file" accept="image/*" onChange={handleFileUpload} style={{ display: 'none' }} />
                        <Upload size={36} color="#CBD5E1" style={{ marginBottom: 10 }} />
                        <p style={{ margin: 0, color: '#64748B', fontSize: '0.875rem', fontWeight: 500 }}>Click or drag to upload your ID image</p>
                        <p style={{ margin: '0.25rem 0 0', color: '#94A3B8', fontSize: '0.72rem' }}>JPG · PNG · WEBP — max 10 MB</p>
                    </label>
                )
            ) : (
                /* Preview after capture / upload */
                <div style={{ position: 'relative', borderRadius: 10, overflow: 'hidden', background: '#0F172A' }}>
                    <img src={preview} alt="ID preview" style={{ width: '100%', maxHeight: 280, objectFit: 'contain', display: 'block' }} />
                    {status === 'verified' && (
                        <div style={{ position: 'absolute', inset: 0, background: 'rgba(22,163,74,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <CheckCircle size={52} color="#22C55E" />
                        </div>
                    )}
                    {status === 'failed' && (
                        <div style={{ position: 'absolute', inset: 0, background: 'rgba(220,38,38,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <XCircle size={52} color="#EF4444" />
                        </div>
                    )}
                </div>
            )}

            {/* Status banners */}
            {status === 'verified' && (
                <Banner type="success">ID verified — name and photo authenticated. Confidence: {result?.confidence ?? 'N/A'}%</Banner>
            )}
            {status === 'failed' && (
                <Banner type="error">{result?.message || 'ID verification failed. Please retake a clearer photo.'}</Banner>
            )}

            {/* Action buttons */}
            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.1rem' }}>
                {/* Capture / retake */}
                {!preview && mode === 'camera' && (
                    <button style={mkBtn('#3B82F6', true, !camReady)} onClick={captureFromCamera} disabled={!camReady}>
                        <Camera size={14} /> Capture ID Card
                    </button>
                )}
                {preview && status !== 'verified' && (
                    <button style={{ ...mkBtn('#64748B'), flexShrink: 0 }} onClick={retake}>
                        <RotateCcw size={14} /> Retake
                    </button>
                )}
                {/* Submit */}
                {preview && status !== 'verified' && (
                    <button style={mkBtn('#3B82F6', true, status === 'checking')} onClick={submitVerification} disabled={status === 'checking'}>
                        {status === 'checking'
                            ? <><RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} /> Verifying…</>
                            : <><CheckCircle size={14} /> Verify ID</>
                        }
                    </button>
                )}
            </div>

            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
    );
}
