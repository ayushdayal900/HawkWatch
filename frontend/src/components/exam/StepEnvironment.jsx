import { useRef, useState, useEffect } from 'react';
import api from '../../services/api';
import { ScanLine, CheckCircle, XCircle, RefreshCw, AlertTriangle, ShieldCheck, Loader2 } from 'lucide-react';

const ENV_ITEMS = [
    { id: 'lighting',   label: 'Adequate lighting',          emoji: '💡', failHint: 'Improve lighting — turn on a lamp or face a window.' },
    { id: 'alone',      label: 'Only you in frame',          emoji: '🚫', failHint: 'Make sure no other people are visible in the camera.' },
    { id: 'noDevices',  label: 'No unauthorized devices',    emoji: '📵', failHint: 'Remove phones, laptops or other devices from view.' },
    { id: 'background', label: 'No other persons in bg',     emoji: '🖼️', failHint: 'Make sure your background is clear.' },
];

export default function StepEnvironment({ onPass, sessionId }) {
    const videoRef = useRef(null);
    const [camReady,  setCamReady]  = useState(false);
    const [scanning,  setScanning]  = useState(false);
    const [done,      setDone]      = useState(false);
    const [error,     setError]     = useState(null);
    const [results,   setResults]   = useState({ lighting: null, alone: null, noDevices: null, background: null });

    useEffect(() => {
        let stream;
        navigator.mediaDevices
            .getUserMedia({ video: { width: 640, height: 480, facingMode: 'user' }, audio: false })
            .then(s => { stream = s; if (videoRef.current) videoRef.current.srcObject = s; })
            .catch(() => {});
        return () => stream?.getTracks().forEach(t => t.stop());
    }, []);

    const scan = async () => {
        if (!videoRef.current) return;
        setScanning(true);
        setError(null);
        setResults({ lighting: null, alone: null, noDevices: null, background: null });

        await new Promise(r => setTimeout(r, 1500));

        const v = videoRef.current;
        const canvas = document.createElement('canvas');
        canvas.width  = v.videoWidth  || 640;
        canvas.height = v.videoHeight || 480;
        canvas.getContext('2d').drawImage(v, 0, 0);
        const frameBase64 = canvas.toDataURL('image/jpeg', 0.85);

        try {
            const { data } = await api.post('/verification/environment', { sessionId, frameBase64 });
            const c = data.checks || {};
            setResults({
                lighting:   c.lighting   ?? true,
                alone:      c.alone      ?? true,
                noDevices:  c.noDevices  ?? true,
                background: c.background ?? true,
            });

            if (data.passed) {
                setDone(true);
            } else {
                const failed = Object.entries(c)
                    .filter(([, v]) => !v)
                    .map(([k]) => ENV_ITEMS.find(i => i.id === k)?.failHint)
                    .filter(Boolean);
                setError(failed.join(' | ') || 'Environment check failed. Adjust your setup and retry.');
            }
        } catch (e) {
            setError(e.response?.data?.message || 'Scan failed — please check connection.');
        } finally {
            setScanning(false);
        }
    };

    return (
        <div className="card animate-fade-up">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', gap: '0.875rem' }}>
                    <div style={{ width: 44, height: 44, borderRadius: 12, background: 'var(--warning-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <ScanLine size={22} color="var(--warning)" />
                    </div>
                    <div>
                        <h2 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: 'var(--n-900)', letterSpacing: '-0.02em' }}>Environment Scan</h2>
                        <p style={{ margin: '0.2rem 0 0', color: 'var(--n-500)', fontSize: '0.85rem' }}>
                            We need to verify your workspace is secure for this exam.
                        </p>
                    </div>
                </div>
                <span className={`badge ${done ? 'badge-success' : scanning ? 'badge-info' : 'badge-neutral'}`}>
                    {done ? 'Passed' : scanning ? 'Scanning...' : 'Ready'}
                </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '1.5rem' }}>
                <div style={{ position: 'relative', borderRadius: 'var(--r-lg)', overflow: 'hidden', background: 'var(--n-900)', aspectRatio: '4/3', border: '2px solid var(--border)' }}>
                    <video ref={videoRef} autoPlay muted playsInline
                        onLoadedData={() => setCamReady(true)}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    {scanning && (
                        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
                            <div style={{ position: 'absolute', inset: 0, background: 'rgba(59,130,246,0.1)' }} />
                            <div style={{
                                position: 'absolute', left: 0, right: 0, height: 4,
                                background: 'var(--brand-500)',
                                boxShadow: '0 0 15px var(--brand-500)',
                                animation: 'scanline 2s linear infinite',
                                zIndex: 10
                            }} />
                        </div>
                    )}
                    {done && (
                        <div style={{ position: 'absolute', inset: 0, background: 'rgba(16,185,129,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(2px)' }}>
                            <div style={{ background: '#fff', borderRadius: '50%', padding: '0.75rem', boxShadow: 'var(--shadow-lg)' }}>
                                <CheckCircle size={48} color="var(--success)" />
                            </div>
                        </div>
                    )}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                    {ENV_ITEMS.map(item => {
                        const r = results[item.id];
                        const isChecking = scanning && r === null;
                        return (
                            <div key={item.id} style={{
                                display: 'flex', alignItems: 'center', gap: '0.75rem',
                                padding: '0.875rem 1rem', borderRadius: 'var(--r-md)',
                                background: r === true ? 'var(--success-bg)' : r === false ? 'var(--danger-bg)' : 'var(--n-50)',
                                border: `1px solid ${r === true ? '#A7F3D0' : r === false ? '#FECACA' : 'var(--border)'}`,
                                transition: 'all 0.2s',
                            }}>
                                <span style={{ fontSize: '1.25rem' }}>{item.emoji}</span>
                                <span style={{ fontSize: '0.875rem', color: r === true ? 'var(--success-txt)' : r === false ? 'var(--danger-txt)' : 'var(--n-600)', fontWeight: r !== null ? 700 : 500, flex: 1 }}>
                                    {item.label}
                                </span>
                                {r === true  && <CheckCircle size={16} color="var(--success)" />}
                                {r === false && <XCircle size={16} color="var(--danger)" />}
                                {isChecking  && <RefreshCw size={14} color="var(--brand-500)" className="animate-spin" />}
                            </div>
                        );
                    })}
                </div>
            </div>

            {error && (
                <div className="alert alert-danger" style={{ marginTop: '1.5rem' }}>
                    <AlertTriangle size={18} />
                    <span>{error}</span>
                </div>
            )}

            <div style={{ marginTop: '1.75rem' }}>
                {done ? (
                    <button className="btn btn-success btn-lg" style={{ width: '100%' }} onClick={onPass}>
                        <ShieldCheck size={18} /> Enter Exam Environment
                    </button>
                ) : (
                    <button 
                        className={`btn ${camReady ? 'btn-primary' : 'btn-secondary'} btn-lg`} 
                        style={{ width: '100%' }} 
                        onClick={scan} 
                        disabled={!camReady || scanning}
                    >
                        {scanning
                            ? <><Loader2 size={18} className="animate-spin" /> Performing AI Analysis…</>
                            : <><ScanLine size={18} /> {error ? 'Retry Environment Scan' : 'Begin Scan'}</>
                        }
                    </button>
                )}
            </div>
            <style>{`@keyframes scanline { 0% { top: 0; } 100% { top: 100%; } }`}</style>
        </div>
    );
}
