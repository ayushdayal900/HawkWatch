import { useEffect, useRef, useState } from 'react';
import api from '../services/api';
import { Camera, CheckCircle, RefreshCw, Eye } from 'lucide-react';

/* ── Style helpers ──────────────────────────────────────────────── */
const card  = { background: '#fff', borderRadius: 12, border: '1px solid #E2E8F0', padding: '1.5rem' };
const mkBtn = (bg) => ({
    display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
    background: bg, color: '#fff',
    border: 'none', borderRadius: 8, padding: '0.7rem 1.4rem',
    fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer',
    width: '100%', justifyContent: 'center', transition: 'opacity 0.15s',
});

export default function LivenessDetector({ sessionId, onVerified }) {
    const videoRef = useRef(null);
    const [camReady, setCamReady] = useState(false);
    
    // Status trackers for 4 frames
    const [captures, setCaptures] = useState(0); 
    const [passes, setPasses] = useState(0);
    const [status, setStatus] = useState('idle'); // idle | scanning | verified | failed

    const INSTRUCTIONS = ['See Left ⬅️', 'See Right ➡️', 'See Up ⬆️', 'See Down ⬇️'];

    useEffect(() => {
        let stream;
        navigator.mediaDevices
            .getUserMedia({ video: { width: 640, height: 480, facingMode: 'user' }, audio: false })
            .then(s => {
                stream = s;
                if (videoRef.current) videoRef.current.srcObject = s;
                setCamReady(true);
            })
            .catch(() => setCamReady(false));
            
        return () => stream?.getTracks().forEach(t => t.stop());
    }, []);

    // Polling interval
    useEffect(() => {
        if (!camReady || status !== 'scanning') return;

        const v = videoRef.current;
        let localCaptures = captures;
        let localPasses = passes;

        const interval = setInterval(async () => {
            if (localCaptures >= 4) {
                clearInterval(interval);
                setStatus(localPasses >= 3 ? 'verified' : 'failed');
                return;
            }

            if (v && v.videoWidth) {
                const canvas = document.createElement('canvas');
                canvas.width = v.videoWidth;
                canvas.height = v.videoHeight;
                canvas.getContext('2d').drawImage(v, 0, 0);
                const frameB64 = canvas.toDataURL('image/jpeg', 0.85);

                localCaptures += 1;
                setCaptures(localCaptures);

                try {
                    const { data } = await api.post('/verification/liveness', {
                        sessionId,
                        frameBase64: frameB64
                    });
                    
                    // faceDetected=true and deepfakeDetected=false
                    if (data.passed) {
                        localPasses += 1;
                        setPasses(localPasses);
                    }
                } catch (e) {
                    // API Call failure counts as failure
                }

                if (localCaptures >= 4) {
                    clearInterval(interval);
                    setStatus(localPasses >= 3 ? 'verified' : 'failed');
                }
            }
        }, 2200);

        return () => clearInterval(interval);
    }, [camReady, status, sessionId]); // Removed captures/passes from dep to prevent re-triggering

    const toggleScan = () => {
        setCaptures(0);
        setPasses(0);
        setStatus('scanning');
    };

    return (
        <div style={card} className="animate-fade-up">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1.25rem' }}>
                <div style={{ width: 36, height: 36, borderRadius: 8, background: '#ECFDF5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Eye size={18} color="#10B981" />
                </div>
                <div>
                    <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#1E293B' }}>Liveness Verification</h3>
                    <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748B' }}>
                        Verifying presence using AI Deepfake Detection. Follow the directions.
                    </p>
                </div>
            </div>

            <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-start' }}>
                <div style={{ width: 220, flexShrink: 0 }}>
                    <div style={{ position: 'relative', borderRadius: 12, overflow: 'hidden', background: '#0F172A', aspectRatio: '4/3' }}>
                        <video ref={videoRef} autoPlay muted playsInline style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }} />
                        
                        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                            <div style={{ width: '60%', height: '80%', border: '2px solid rgba(255,255,255,0.7)', borderRadius: '50%' }} />
                        </div>

                        {status === 'scanning' && (
                            <div style={{ position: 'absolute', inset: 0, background: 'rgba(15,23,42,0.6)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                                <RefreshCw size={24} color="#38BDF8" style={{ animation: 'spin 1.5s linear infinite' }} />
                                <span style={{ color: '#bae6fd', fontSize: '0.72rem', fontWeight: 600 }}>Capturing Frame {captures + 1}/4</span>
                                <span style={{ color: '#fff', fontSize: '1.2rem', fontWeight: 700, marginTop: 4 }}>{INSTRUCTIONS[captures] || ''}</span>
                            </div>
                        )}
                        {status === 'verified' && (
                            <div style={{ position: 'absolute', inset: 0, background: 'rgba(34,197,94,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <CheckCircle size={48} color="#22C55E" />
                            </div>
                        )}
                    </div>
                </div>

                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {[1, 2, 3, 4].map(i => {
                        const isDone = captures >= i;
                        const hasPassed = isDone && passes >= (i - (captures - passes)); // Approximate representation
                        const inst = INSTRUCTIONS[i - 1];

                        return (
                            <GoalCard
                                key={i}
                                icon={<Eye size={18} />}
                                title={`Frame ${i} : ${inst.replace(/[\u{1F300}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F900}-\u{1F9FF}\u{1F1E0}-\u{1F1FF}]/ug, '').trim()}`}
                                desc={!isDone ? 'Waiting to capture...' : hasPassed ? 'Passed AI Check' : 'Failed AI Check'}
                                isDone={isDone}
                                isActive={status === 'scanning' && captures === i - 1}
                            />
                        );
                    })}
                </div>
            </div>

            {status === 'failed' && (
                <div style={{ marginTop: '1rem', padding: '0.75rem', background: '#FEF2F2', color: '#DC2626', fontSize: '0.8rem', borderRadius: 8, border: '1px solid #FECACA' }}>
                    Verification failed! You failed the Deepfake / AI Face Detection parameters. At least 2 of 3 frames must pass. Try again.
                </div>
            )}

            <div style={{ marginTop: '1.25rem' }}>
                {status === 'verified' ? (
                    <button style={mkBtn('#22C55E')} onClick={onVerified}>Liveness Confirmed — Continue</button>
                ) : (
                    <button style={mkBtn(status === 'scanning' ? '#CBD5E1' : '#10B981')} onClick={toggleScan} disabled={!camReady || status === 'scanning'}>
                        {status === 'scanning' ? 'Analyzing via Deepfake Proxy...' : captures > 0 ? 'Restart Scan' : 'Start Scan'}
                    </button>
                )}
            </div>

            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
    );
}

function GoalCard({ icon, title, desc, isDone, isActive }) {
    const bg = isDone ? '#F0FDF4' : isActive ? '#ECFDF5' : '#F8FAFC';
    const border = isDone ? '#BBF7D0' : isActive ? '#6EE7B7' : '#E2E8F0';
    const color = isDone ? '#15803D' : isActive ? '#059669' : '#64748B';

    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.85rem 1rem', borderRadius: 10, background: bg, border: `1.5px solid ${border}` }}>
            <div style={{ color }}>{isDone ? <CheckCircle size={22} /> : icon}</div>
            <div>
                <p style={{ margin: 0, fontSize: '0.875rem', fontWeight: 600, color: '#1E293B' }}>{title}</p>
                <p style={{ margin: 0, fontSize: '0.72rem', color: '#64748B' }}>{desc}</p>
            </div>
        </div>
    );
}
