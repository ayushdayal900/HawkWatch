import { useCallback, useEffect, useRef, useState } from 'react';
import api from '../services/api';
import useFaceMesh from '../hooks/useFaceMesh';
import {
    Camera, RefreshCw, CheckCircle, XCircle, RotateCcw,
    Loader2, ShieldCheck, AlertCircle, UserCheck
} from 'lucide-react';

function ConfidenceMeter({ score }) {
    const pct   = Math.min(100, Math.max(0, score));
    const level = pct >= 85 ? 'success' : pct >= 70 ? 'warning' : 'danger';
    const color = `var(--${level})`;
    
    return (
        <div style={{ marginTop: '1rem', background: 'var(--n-50)', padding: '1rem', borderRadius: 'var(--r-md)', border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--n-500)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Verification Confidence</span>
                <span style={{ fontSize: '0.875rem', color, fontWeight: 800 }}>{pct.toFixed(1)}%</span>
            </div>
            <div style={{ height: 6, background: 'var(--n-200)', borderRadius: 99, overflow: 'hidden' }}>
                <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 99, transition: 'width 1s cubic-bezier(0.4, 0, 0.2, 1)' }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
                <span style={{ fontSize: '0.65rem', color: 'var(--n-400)' }}>Required: 75.0%</span>
                <span style={{ fontSize: '0.65rem', color: 'var(--n-400)', fontWeight: 600 }}>{pct >= 75 ? 'Match Confirmed' : 'Inconclusive'}</span>
            </div>
        </div>
    );
}

export default function FaceVerification({ sessionId, onVerified, onError }) {
    const videoRef  = useRef(null);
    const streamRef = useRef(null);

    const [camReady,  setCamReady]  = useState(false);
    const [preview,   setPreview]   = useState(null);
    const [status,    setStatus]    = useState('idle');     // idle | checking | verified | failed
    const [result,    setResult]    = useState(null);

    const { ready: meshReady, modelLoading, faceDetected, startTracking, stopTracking } = useFaceMesh(videoRef);

    const startCamera = useCallback(() => {
        navigator.mediaDevices
            .getUserMedia({ video: { width: 640, height: 480, facingMode: 'user' }, audio: false })
            .then(stream => {
                streamRef.current = stream;
                if (videoRef.current) videoRef.current.srcObject = stream;
            })
            .catch(() => setCamReady(false));
    }, []);

    useEffect(() => {
        startCamera();
        return () => streamRef.current?.getTracks().forEach(t => t.stop());
    }, [startCamera]);

    useEffect(() => {
        if (camReady && meshReady && !preview) startTracking();
        else stopTracking();
    }, [camReady, meshReady, preview, startTracking, stopTracking]);

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

    const retake = () => {
        setPreview(null);
        setStatus('idle');
        setResult(null);
        startCamera();
    };

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
                setTimeout(() => onVerified?.(data), 2000);
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
        <div className="card animate-fade-up">
            <div style={{ display: 'flex', gap: '0.875rem', marginBottom: '1.5rem' }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: 'var(--brand-50)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <UserCheck size={22} color="var(--brand-500)" />
                </div>
                <div>
                    <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: 'var(--n-900)', letterSpacing: '-0.02em' }}>Facial Biometrics</h3>
                    <p style={{ margin: '0.2rem 0 0', color: 'var(--n-500)', fontSize: '0.85rem' }}>Look directly at the camera to verify your identity.</p>
                </div>
            </div>

            <div style={{ position: 'relative', borderRadius: 'var(--r-lg)', overflow: 'hidden', background: 'var(--n-900)', border: '2px solid var(--border)', boxShadow: 'var(--shadow-md)', aspectRatio: '4/3' }}>
                {!preview ? (
                    <>
                        <video
                            ref={videoRef}
                            autoPlay
                            muted
                            playsInline
                            onLoadedData={() => setCamReady(true)}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                        {/* Oval guide */}
                        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                            <div style={{ 
                                width: '55%', height: '75%', 
                                border: `3px solid ${faceDetected ? 'var(--success)' : 'rgba(255,255,255,0.2)'}`, 
                                borderRadius: '50%', 
                                boxShadow: '0 0 0 9999px rgba(0,0,0,0.5)',
                                transition: 'all 0.3s'
                            }} />
                        </div>
                        
                        {/* AI Status Badge */}
                        <div style={{ position: 'absolute', top: 12, left: 0, right: 0, display: 'flex', justifyContent: 'center', pointerEvents: 'none' }}>
                            <div style={{
                                background: modelLoading ? 'var(--n-700)' : faceDetected ? 'var(--success)' : 'var(--danger)',
                                color: '#fff', padding: '4px 12px', borderRadius: 99, fontSize: '0.7rem',
                                fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em',
                                display: 'flex', alignItems: 'center', gap: 6, boxShadow: 'var(--shadow-lg)'
                            }}>
                                {modelLoading ? (
                                    <><Loader2 size={12} className="animate-spin" /> Neural Engine Loading</>
                                ) : faceDetected ? (
                                    <><CheckCircle size={12} /> Target Locked</>
                                ) : (
                                    <><AlertCircle size={12} /> Positioning Face...</>
                                )}
                            </div>
                        </div>

                        {!camReady && (
                            <div style={{ position: 'absolute', inset: 0, background: 'var(--n-900)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
                                <Camera size={32} color="var(--brand-400)" />
                                <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.875rem' }}>Camera access required</p>
                            </div>
                        )}
                    </>
                ) : (
                    <>
                        <img src={preview} alt="Captured face" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        {status === 'verified' && (
                            <div className="animate-fade-in" style={{ position: 'absolute', inset: 0, background: 'rgba(16,185,129,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}>
                                <div style={{ background: '#fff', borderRadius: '50%', padding: '1rem', boxShadow: 'var(--shadow-xl)' }}>
                                    <CheckCircle size={64} color="var(--success)" />
                                </div>
                            </div>
                        )}
                        {status === 'failed' && (
                            <div className="animate-fade-in" style={{ position: 'absolute', inset: 0, background: 'rgba(239,68,68,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}>
                                <div style={{ background: '#fff', borderRadius: '50%', padding: '1rem', boxShadow: 'var(--shadow-xl)' }}>
                                    <XCircle size={64} color="var(--danger)" />
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>

            {result?.confidence !== undefined && <ConfidenceMeter score={result.confidence} />}

            {status === 'verified' && (
                <div className="alert alert-success animate-fade-up" style={{ marginTop: '1.25rem' }}>
                    <ShieldCheck size={18} />
                    <span>Identity confirmed. Proceeding to liveness verification...</span>
                </div>
            )}
            {status === 'failed' && (
                <div className="alert alert-danger animate-fade-up" style={{ marginTop: '1.25rem' }}>
                    <AlertCircle size={18} />
                    <span>{result?.message || 'Identity match failed. Please ensure your face is well-lit.'}</span>
                </div>
            )}

            <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                {!preview && (
                    <button className="btn btn-primary btn-lg" style={{ width: '100%' }} onClick={captureFace} disabled={!camReady || !faceDetected}>
                        <Camera size={18} /> Capture Biometrics
                    </button>
                )}
                {preview && status !== 'verified' && (
                    <button className="btn btn-secondary btn-lg" onClick={retake} disabled={status === 'checking'}>
                        <RotateCcw size={18} /> Retake
                    </button>
                )}
                {preview && status !== 'verified' && (
                    <button className="btn btn-primary btn-lg" style={{ flex: 1 }} onClick={submitMatch} disabled={status === 'checking'}>
                        {status === 'checking'
                            ? <><Loader2 size={18} className="animate-spin" /> Analyzing Match…</>
                            : <><ShieldCheck size={18} /> Verify Identity</>
                        }
                    </button>
                )}
            </div>
        </div>
    );
}
