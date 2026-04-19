import { useCallback, useEffect, useRef, useState } from 'react';
import api from '../services/api';
import useFaceMesh from '../hooks/useFaceMesh';
import { CheckCircle, Eye, AlertCircle, RefreshCw, Loader2, ArrowRight } from 'lucide-react';

const PROMPTS = [
    { id: 'left',  label: 'Turn Left',   emoji: '⬅️',  dir: 'left'  },
    { id: 'right', label: 'Turn Right',  emoji: '➡️',  dir: 'right' },
    { id: 'up',    label: 'Look Up',     emoji: '⬆️',  dir: 'up'    },
    { id: 'down',  label: 'Look Down',   emoji: '⬇️',  dir: 'down'  },
];

const IDX = {
    noseTip:  1,
    leftEar:  234,
    rightEar: 454,
    chin:     152,
    forehead: 10,
};

function classifyDirection(landmarks) {
    if (!landmarks || landmarks.length < 468) return null;

    const nose     = landmarks[IDX.noseTip];
    const leftEar  = landmarks[IDX.leftEar];
    const rightEar = landmarks[IDX.rightEar];
    const chin     = landmarks[IDX.chin];
    const forehead = landmarks[IDX.forehead];

    if (!nose || !leftEar || !rightEar || !chin || !forehead) return null;

    const earMidX  = (leftEar.x + rightEar.x) / 2;
    const yaw      = nose.x - earMidX;
    const vertMid  = (chin.y + forehead.y) / 2;
    const pitch    = nose.y - vertMid;

    const faceWidth = Math.abs(leftEar.x - rightEar.x);
    const YAW_THR   = faceWidth * 0.07;
    const PITCH_THR = faceWidth * 0.05;

    if      (yaw  >  YAW_THR)   return 'left';
    else if (yaw  < -YAW_THR)   return 'right';
    else if (pitch < -PITCH_THR) return 'up';
    else if (pitch >  PITCH_THR) return 'down';
    else                         return 'center';
}

function GoalCard({ prompt, state, holdPct }) {
    // state: 'waiting' | 'active' | 'holding' | 'passed'
    const isActive = state === 'active' || state === 'holding';
    const isPassed = state === 'passed';

    return (
        <div style={{
            display: 'flex', alignItems: 'center', gap: '1rem',
            padding: '1rem', borderRadius: 'var(--r-md)',
            background: isPassed ? 'var(--success-bg)' : isActive ? 'var(--brand-50)' : 'var(--n-50)',
            border: `1px solid ${isPassed ? 'var(--success)' : isActive ? 'var(--brand-300)' : 'var(--border)'}`,
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            position: 'relative', overflow: 'hidden',
        }}>
            {state === 'holding' && (
                <div style={{
                    position: 'absolute', left: 0, bottom: 0, height: 4,
                    width: `${holdPct}%`, background: 'var(--success)',
                    transition: 'width 0.1s linear',
                    boxShadow: '0 0 10px var(--success)'
                }} />
            )}
            <div style={{ 
                width: 32, height: 32, borderRadius: 8, 
                background: isPassed ? 'var(--success)' : isActive ? 'var(--brand-500)' : 'var(--n-200)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', transition: 'all 0.3s'
            }}>
                {isPassed ? <CheckCircle size={18} /> : <span>{prompt.emoji}</span>}
            </div>
            <div style={{ flex: 1 }}>
                <div style={{ fontSize: '0.875rem', fontWeight: 700, color: isPassed ? 'var(--success-txt)' : 'var(--n-800)' }}>
                    {prompt.label}
                </div>
                <div style={{ fontSize: '0.7rem', color: isPassed ? 'var(--success-txt)' : 'var(--n-500)', opacity: 0.8, marginTop: 1 }}>
                    {state === 'waiting'  && 'Pending detection...'}
                    {state === 'active'   && 'Turn your head now'}
                    {state === 'holding'  && 'Hold position...'}
                    {state === 'passed'   && 'Biometrics captured'}
                </div>
            </div>
        </div>
    );
}

const HOLD_MS = 800;
const TICK_MS = 80;

export default function LivenessDetector({ sessionId, onVerified }) {
    const videoRef  = useRef(null);
    const streamRef = useRef(null);

    const [camReady,     setCamReady]     = useState(false);
    const [started,      setStarted]      = useState(false);
    const [promptIdx,    setPromptIdx]    = useState(0);
    const [stepStates,   setStepStates]   = useState(PROMPTS.map(() => 'waiting'));
    const [holdPct,      setHoldPct]      = useState(0);
    const [currentDir,   setCurrentDir]   = useState(null);
    const [allDone,      setAllDone]      = useState(false);
    const [confirming,   setConfirming]   = useState(false);

    const promptIdxRef  = useRef(0);
    const holdStartRef  = useRef(null);
    const tickRef       = useRef(null);
    const landmarksRef  = useRef(null);

    const { ready: meshReady, modelLoading, faceDetected, landmarks, startTracking, stopTracking } = useFaceMesh(videoRef);

    useEffect(() => { landmarksRef.current = landmarks; }, [landmarks]);

    useEffect(() => {
        let s;
        navigator.mediaDevices
            .getUserMedia({ video: { width: 640, height: 480, facingMode: 'user' }, audio: false })
            .then(stream => {
                s = stream;
                streamRef.current = stream;
                if (videoRef.current) videoRef.current.srcObject = stream;
            })
            .catch(() => setCamReady(false));
        return () => s?.getTracks().forEach(t => t.stop());
    }, []);

    useEffect(() => {
        if (camReady && meshReady && started) startTracking();
        return () => stopTracking();
    }, [camReady, meshReady, started, startTracking, stopTracking]);

    useEffect(() => {
        if (!started || allDone) return;

        tickRef.current = setInterval(() => {
            const idx = promptIdxRef.current;
            if (idx >= PROMPTS.length) return;

            const required = PROMPTS[idx].dir;
            const dir = classifyDirection(landmarksRef.current);
            setCurrentDir(dir);

            if (dir === required) {
                if (!holdStartRef.current) holdStartRef.current = performance.now();
                const elapsed = performance.now() - holdStartRef.current;
                const pct = Math.min(100, (elapsed / HOLD_MS) * 100);
                setHoldPct(pct);
                setStepStates(prev => prev.map((s, i) => i === idx ? 'holding' : s));

                if (elapsed >= HOLD_MS) {
                    holdStartRef.current = null;
                    setHoldPct(0);
                    setStepStates(prev => prev.map((s, i) => i === idx ? 'passed' : s));
                    const nextIdx = idx + 1;
                    promptIdxRef.current = nextIdx;
                    setPromptIdx(nextIdx);

                    if (nextIdx >= PROMPTS.length) {
                        clearInterval(tickRef.current);
                        setAllDone(true);
                        stopTracking();
                    } else {
                        setStepStates(prev => prev.map((s, i) => i === nextIdx ? 'active' : s));
                    }
                }
            } else {
                if (holdStartRef.current) {
                    holdStartRef.current = null;
                    setHoldPct(0);
                    setStepStates(prev => prev.map((s, i) => i === idx ? 'active' : s));
                }
            }
        }, TICK_MS);

        return () => clearInterval(tickRef.current);
    }, [started, allDone, stopTracking]);

    useEffect(() => {
        if (!allDone || !sessionId) return;
        const confirmLiveness = async () => {
            setConfirming(true);
            try {
                const v = videoRef.current;
                let frameBase64 = null;
                if (v && v.videoWidth > 0) {
                    const canvas = document.createElement('canvas');
                    canvas.width  = v.videoWidth;
                    canvas.height = v.videoHeight;
                    canvas.getContext('2d').drawImage(v, 0, 0);
                    frameBase64 = canvas.toDataURL('image/jpeg', 0.85);
                }
                await api.post('/verification/liveness', { sessionId, frameBase64: frameBase64 || '', clientVerified: true });
            } catch (e) {
                console.warn('Liveness backend confirm failed:', e.message);
            } finally {
                setConfirming(false);
            }
        };
        confirmLiveness();
    }, [allDone, sessionId]);

    const handleStart = useCallback(() => {
        promptIdxRef.current = 0;
        holdStartRef.current = null;
        setPromptIdx(0);
        setHoldPct(0);
        setAllDone(false);
        setStepStates(PROMPTS.map((_, i) => i === 0 ? 'active' : 'waiting'));
        setStarted(true);
    }, []);

    return (
        <div className="card animate-fade-up">
            <div style={{ display: 'flex', gap: '0.875rem', marginBottom: '1.5rem' }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: 'var(--success-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Eye size={22} color="var(--success)" />
                </div>
                <div>
                    <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: 'var(--n-900)', letterSpacing: '-0.02em' }}>Liveness Detection</h3>
                    <p style={{ margin: '0.2rem 0 0', color: 'var(--n-500)', fontSize: '0.85rem' }}>Randomized movement checks to prevent spoofing attempts.</p>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                <div style={{ position: 'relative', borderRadius: 'var(--r-lg)', overflow: 'hidden', background: 'var(--n-900)', border: '2px solid var(--border)', aspectRatio: '4/3' }}>
                    <video
                        ref={videoRef}
                        autoPlay muted playsInline
                        onLoadedData={() => setCamReady(true)}
                        style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }}
                    />
                    
                    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                        <div style={{ width: '60%', height: '80%', border: `2px solid ${faceDetected ? 'var(--success)' : 'rgba(255,255,255,0.2)'}`, borderRadius: '50%', transition: 'all 0.3s' }} />
                    </div>

                    {started && !allDone && (
                        <div style={{ position: 'absolute', inset: 0, background: 'rgba(15,23,42,0.4)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '1rem' }}>
                             <div className="badge badge-info" style={{ position: 'absolute', top: 12, left: 12 }}>
                                {promptIdx + 1} of 4
                             </div>
                             <div style={{ color: '#fff', fontSize: '1.5rem', fontWeight: 900, textShadow: '0 2px 10px rgba(0,0,0,0.5)' }}>
                                {PROMPTS[promptIdx].label} {PROMPTS[promptIdx].emoji}
                             </div>
                             {currentDir && (
                                <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', fontWeight: 700, color: currentDir === PROMPTS[promptIdx].dir ? 'var(--success)' : '#fff', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                                    Detected: {currentDir}
                                </div>
                             )}
                        </div>
                    )}

                    {modelLoading && (
                        <div style={{ position: 'absolute', inset: 0, background: 'var(--n-900)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
                            <Loader2 size={32} color="var(--brand-400)" className="animate-spin" />
                            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.875rem' }}>Loading Vision AI...</p>
                        </div>
                    )}

                    {allDone && (
                        <div style={{ position: 'absolute', inset: 0, background: 'rgba(16,185,129,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}>
                            <div style={{ background: '#fff', borderRadius: '50%', padding: '1rem', boxShadow: 'var(--shadow-xl)' }}>
                                <CheckCircle size={64} color="var(--success)" />
                            </div>
                        </div>
                    )}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {PROMPTS.map((p, i) => (
                        <GoalCard key={p.id} prompt={p} state={stepStates[i]} holdPct={i === promptIdx ? holdPct : 0} />
                    ))}
                </div>
            </div>

            {started && !allDone && !faceDetected && (
                <div className="alert alert-warning animate-fade-up" style={{ marginTop: '1.5rem' }}>
                    <AlertCircle size={18} />
                    <span>Face lost. Please center yourself and try again.</span>
                </div>
            )}

            <div style={{ marginTop: '1.75rem' }}>
                {allDone ? (
                    <button className="btn btn-success btn-lg" style={{ width: '100%' }} onClick={onVerified} disabled={confirming}>
                        {confirming ? <><Loader2 size={18} className="animate-spin" /> Syncing...</> : <><CheckCircle size={18} /> All Checks Passed — Continue <ArrowRight size={18} /></>}
                    </button>
                ) : (
                    <button className="btn btn-primary btn-lg" style={{ width: '100%' }} onClick={handleStart} disabled={!camReady || modelLoading}>
                        {started ? 'Restart Verification' : 'Begin Liveness Check'}
                    </button>
                )}
            </div>
        </div>
    );
}
