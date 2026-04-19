import { useCallback, useEffect, useRef, useState } from 'react';
import api from '../services/api';
import {
    Camera, RefreshCw, CheckCircle, XCircle,
    Upload, CreditCard, RotateCcw, Loader2, ShieldCheck, AlertCircle
} from 'lucide-react';

export default function IDVerification({ sessionId, onVerified, onError }) {
    const videoRef   = useRef(null);
    const streamRef  = useRef(null);

    const [mode,      setMode]      = useState('camera');   // 'camera' | 'upload'
    const [camReady,  setCamReady]  = useState(false);
    const [preview,   setPreview]   = useState(null);
    const [status,    setStatus]    = useState('idle');     // idle | checking | verified | failed
    const [result,    setResult]    = useState(null);

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

    const captureFromCamera = useCallback(() => {
        const v = videoRef.current;
        if (!v) return;
        const canvas = document.createElement('canvas');
        canvas.width  = v.videoWidth;
        canvas.height = v.videoHeight;
        canvas.getContext('2d').drawImage(v, 0, 0);
        setPreview(canvas.toDataURL('image/jpeg', 0.85));
        streamRef.current?.getTracks().forEach(t => t.stop());
    }, []);

    const handleFileUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = ev => setPreview(ev.target.result);
        reader.readAsDataURL(file);
    };

    const retake = () => {
        setPreview(null);
        setStatus('idle');
        setResult(null);
        if (mode === 'camera') startCamera();
    };

    const submitVerification = async () => {
        if (!preview) return;
        setStatus('checking');
        try {
            const { data } = await api.post('/verification/id', {
                sessionId,
                idImage: preview,
            });
            setResult(data);
            if (data.success) {
                setStatus('verified');
                setTimeout(() => onVerified?.(preview, data), 1500);
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
        <div className="card animate-fade-up">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', gap: '0.875rem' }}>
                    <div style={{ width: 44, height: 44, borderRadius: 12, background: 'var(--brand-50)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <CreditCard size={22} color="var(--brand-500)" />
                    </div>
                    <div>
                        <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: 'var(--n-900)', letterSpacing: '-0.02em' }}>ID Card Verification</h3>
                        <p style={{ margin: '0.2rem 0 0', color: 'var(--n-500)', fontSize: '0.85rem' }}>Hold your government ID clearly in the marked area.</p>
                    </div>
                </div>
                
                <div style={{ display: 'flex', background: 'var(--n-50)', borderRadius: 8, padding: 3 }}>
                    {['camera', 'upload'].map(m => (
                        <button 
                            key={m} 
                            onClick={() => { setMode(m); setPreview(null); setStatus('idle'); }}
                            style={{ 
                                padding: '0.4rem 0.75rem', border: 'none', borderRadius: 6, fontSize: '0.75rem', 
                                fontWeight: 700, cursor: 'pointer', 
                                background: mode === m ? '#fff' : 'transparent', 
                                color: mode === m ? 'var(--brand-600)' : 'var(--n-500)',
                                boxShadow: mode === m ? 'var(--shadow-sm)' : 'none',
                                transition: 'all 0.2s',
                                display: 'flex', alignItems: 'center', gap: 6
                            }}
                        >
                            {m === 'camera' ? <Camera size={13} /> : <Upload size={13} />}
                            {m === 'camera' ? 'Webcam' : 'Upload'}
                        </button>
                    ))}
                </div>
            </div>

            <div style={{ position: 'relative', borderRadius: 'var(--r-lg)', overflow: 'hidden', background: 'var(--n-900)', border: '2px solid var(--border)', boxShadow: 'var(--shadow-md)', aspectRatio: '16/9' }}>
                {!preview ? (
                    mode === 'camera' ? (
                        <>
                            <video ref={videoRef} autoPlay muted playsInline style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                                <div style={{ width: '70%', height: '60%', border: '2px solid rgba(255,255,255,0.4)', borderRadius: 12, boxShadow: '0 0 0 9999px rgba(0,0,0,0.5)' }}>
                                    <div style={{ position: 'absolute', top: 12, left: 12, width: 24, height: 24, borderTop: '4px solid #fff', borderLeft: '4px solid #fff', borderRadius: '4px 0 0 0' }} />
                                    <div style={{ position: 'absolute', top: 12, right: 12, width: 24, height: 24, borderTop: '4px solid #fff', borderRight: '4px solid #fff', borderRadius: '0 4px 0 0' }} />
                                    <div style={{ position: 'absolute', bottom: 12, left: 12, width: 24, height: 24, borderBottom: '4px solid #fff', borderLeft: '4px solid #fff', borderRadius: '0 0 0 4px' }} />
                                    <div style={{ position: 'absolute', bottom: 12, right: 12, width: 24, height: 24, borderBottom: '4px solid #fff', borderRight: '4px solid #fff', borderRadius: '0 0 4px 0' }} />
                                </div>
                            </div>
                            {!camReady && (
                                <div style={{ position: 'absolute', inset: 0, background: 'var(--n-900)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
                                    <Loader2 size={32} color="var(--brand-400)" className="animate-spin" />
                                    <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.875rem' }}>Connecting to secure camera feed...</p>
                                </div>
                            )}
                        </>
                    ) : (
                        <label style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', cursor: 'pointer', gap: '1rem' }}>
                            <input type="file" accept="image/*" onChange={handleFileUpload} style={{ display: 'none' }} />
                            <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Upload size={32} color="var(--n-400)" />
                            </div>
                            <div style={{ textAlign: 'center' }}>
                                <p style={{ margin: 0, color: '#fff', fontSize: '1rem', fontWeight: 600 }}>Click to upload ID photo</p>
                                <p style={{ margin: '0.25rem 0 0', color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem' }}>High-resolution JPG or PNG recommended</p>
                            </div>
                        </label>
                    )
                ) : (
                    <>
                        <img src={preview} alt="Captured ID" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
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

            {status === 'verified' && (
                <div className="alert alert-success animate-fade-up" style={{ marginTop: '1.25rem' }}>
                    <ShieldCheck size={18} />
                    <span>ID card verified successfully. Matching with live face...</span>
                </div>
            )}
            {status === 'failed' && (
                <div className="alert alert-danger animate-fade-up" style={{ marginTop: '1.25rem' }}>
                    <AlertCircle size={18} />
                    <span>{result?.message || 'Verification failed. Please ensure the card is clear and try again.'}</span>
                </div>
            )}

            <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                {!preview && mode === 'camera' && (
                    <button className="btn btn-primary btn-lg" style={{ width: '100%' }} onClick={captureFromCamera} disabled={!camReady}>
                        <Camera size={18} /> Capture ID Card
                    </button>
                )}
                {preview && status !== 'verified' && (
                    <button className="btn btn-secondary btn-lg" onClick={retake} disabled={status === 'checking'}>
                        <RotateCcw size={18} /> Retake
                    </button>
                )}
                {preview && status !== 'verified' && (
                    <button className="btn btn-primary btn-lg" style={{ flex: 1 }} onClick={submitVerification} disabled={status === 'checking'}>
                        {status === 'checking'
                            ? <><Loader2 size={18} className="animate-spin" /> Analyzing ID Card…</>
                            : <><ShieldCheck size={18} /> Confirm and Verify</>
                        }
                    </button>
                )}
            </div>
        </div>
    );
}
