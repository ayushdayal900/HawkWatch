/**
 * LivenessDetector.jsx
 * ─────────────────────────────────────────────────────────────────
 * Uses MediaPipe FaceMesh landmarks to detect REAL head direction.
 * Each prompt (Left / Right / Up / Down) is validated ONLY when the
 * user actually turns their head in that direction.
 *
 * Detection logic:
 *   • Yaw  (left/right) – compare nose-tip X to midpoint of ear anchors
 *   • Pitch (up/down)   – compare nose-tip Y to chin / forehead anchors
 *
 * Thresholds are normalised (0–1 image coords) so they are
 * resolution-independent.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import api from '../services/api';
import useFaceMesh from '../hooks/useFaceMesh';
import { CheckCircle, XCircle, Eye, AlertCircle, RefreshCw } from 'lucide-react';

/* ── Style helpers ─────────────────────────────────────────────── */
const card  = { background: '#fff', borderRadius: 12, border: '1px solid #E2E8F0', padding: '1.5rem' };
const mkBtn = (bg, disabled = false) => ({
    display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
    background: disabled ? '#CBD5E1' : bg, color: '#fff',
    border: 'none', borderRadius: 8, padding: '0.7rem 1.4rem',
    fontWeight: 600, fontSize: '0.875rem',
    cursor: disabled ? 'not-allowed' : 'pointer',
    width: '100%', justifyContent: 'center', transition: 'opacity 0.15s',
});

/* ── Prompts ──────────────────────────────────────────────────── */
const PROMPTS = [
    { id: 'left',  label: 'Look Left',  emoji: '⬅️',  dir: 'left'  },
    { id: 'right', label: 'Look Right', emoji: '➡️',  dir: 'right' },
    { id: 'up',    label: 'Look Up',    emoji: '⬆️',  dir: 'up'    },
    { id: 'down',  label: 'Look Down',  emoji: '⬇️',  dir: 'down'  },
];

/* ── MediaPipe landmark indices ───────────────────────────────── */
// 468 total landmarks from FaceMesh (refineLandmarks: false)
const IDX = {
    noseTip:  1,    // tip of nose
    leftEar:  234,  // left cheek/temple anchor  (camera-left  = user's RIGHT)
    rightEar: 454,  // right cheek/temple anchor (camera-right = user's LEFT)
    chin:     152,  // bottom of chin
    forehead: 10,   // top of forehead
};

/* ── Head direction classifier ────────────────────────────────── */
// Returns 'left'|'right'|'up'|'down'|'center'|null (null = no face)
//
// ⚠️  Mirror correction:
//   The <video> is displayed with transform: scaleX(-1) (mirror mode),
//   but MediaPipe receives the RAW (un-mirrored) camera frame.
//   So when the user turns their head LEFT (from their POV):
//     → In the raw frame the nose moves to the RIGHT  (positive X shift)
//     → yaw = nose.x - earMidX  >  0
//   Therefore yaw > 0  ⟹ user turned LEFT  (opposite of naive intuition).
function classifyDirection(landmarks) {
    if (!landmarks || landmarks.length < 468) return null;

    const nose     = landmarks[IDX.noseTip];
    const leftEar  = landmarks[IDX.leftEar];
    const rightEar = landmarks[IDX.rightEar];
    const chin     = landmarks[IDX.chin];
    const forehead = landmarks[IDX.forehead];

    if (!nose || !leftEar || !rightEar || !chin || !forehead) return null;

    // Horizontal midpoint of both ear anchors
    const earMidX  = (leftEar.x + rightEar.x) / 2;
    const yaw      = nose.x - earMidX; // positive = nose shifted camera-right

    // Vertical midpoint between forehead and chin
    const vertMid  = (chin.y + forehead.y) / 2;
    const pitch    = nose.y - vertMid;  // positive = nose shifted downward

    // Adaptive thresholds — 7% of face width for yaw, 5% for pitch
    const faceWidth = Math.abs(leftEar.x - rightEar.x);
    const YAW_THR   = faceWidth * 0.07;
    const PITCH_THR = faceWidth * 0.05;

    // Mirror-corrected mapping:
    if      (yaw  >  YAW_THR)   return 'left';   // nose went camera-right → user's LEFT
    else if (yaw  < -YAW_THR)   return 'right';  // nose went camera-left  → user's RIGHT
    else if (pitch < -PITCH_THR) return 'up';
    else if (pitch >  PITCH_THR) return 'down';
    else                         return 'center';
}

/* ── GoalCard ─────────────────────────────────────────────────── */
function GoalCard({ prompt, state, holdPct }) {
    // state: 'waiting' | 'active' | 'holding' | 'passed' | 'failed'
    const styles = {
        waiting: { bg: '#F8FAFC', border: '#E2E8F0', titleColor: '#94A3B8' },
        active:  { bg: '#EFF6FF', border: '#93C5FD', titleColor: '#1D4ED8' },
        holding: { bg: '#ECFDF5', border: '#6EE7B7', titleColor: '#059669' },
        passed:  { bg: '#F0FDF4', border: '#BBF7D0', titleColor: '#15803D' },
        failed:  { bg: '#FEF2F2', border: '#FECACA', titleColor: '#DC2626' },
    };
    const s = styles[state] || styles.waiting;

    return (
        <div style={{
            display: 'flex', alignItems: 'center', gap: '1rem',
            padding: '0.85rem 1rem', borderRadius: 10,
            background: s.bg, border: `1.5px solid ${s.border}`,
            transition: 'all 0.25s',
            position: 'relative', overflow: 'hidden',
        }}>
            {/* Hold-progress bar */}
            {state === 'holding' && (
                <div style={{
                    position: 'absolute', left: 0, bottom: 0, height: 3,
                    width: `${holdPct}%`, background: '#10B981',
                    transition: 'width 0.1s linear',
                }} />
            )}
            <span style={{ fontSize: '1.4rem' }}>{prompt.emoji}</span>
            <div style={{ flex: 1 }}>
                <p style={{ margin: 0, fontSize: '0.875rem', fontWeight: 700, color: s.titleColor }}>
                    {prompt.label}
                </p>
                <p style={{ margin: 0, fontSize: '0.72rem', color: '#64748B', marginTop: 1 }}>
                    {state === 'waiting'  && 'Waiting…'}
                    {state === 'active'   && '👀 Turn your head now'}
                    {state === 'holding'  && '✅ Hold it…'}
                    {state === 'passed'   && 'Passed ✓'}
                    {state === 'failed'   && 'Failed ✗'}
                </p>
            </div>
            {state === 'passed' && <CheckCircle size={20} color="#22C55E" />}
            {state === 'failed' && <XCircle     size={20} color="#EF4444" />}
        </div>
    );
}

/* ── Direction indicator overlay ──────────────────────────────── */
function DirectionIndicator({ required, current }) {
    const match = required && current === required;
    return (
        <div style={{
            position: 'absolute', bottom: 8, left: 0, right: 0,
            display: 'flex', justifyContent: 'center', pointerEvents: 'none',
        }}>
            <span style={{
                background: match ? 'rgba(16,185,129,0.92)' : 'rgba(15,23,42,0.72)',
                color: '#fff', padding: '4px 12px', borderRadius: 99,
                fontSize: '0.72rem', fontWeight: 700, backdropFilter: 'blur(4px)',
                transition: 'background 0.2s',
            }}>
                {current ? `Head: ${current}` : 'No face'}
                {required && ` — need: ${required}`}
            </span>
        </div>
    );
}

/* ── Main component ───────────────────────────────────────────── */
const HOLD_MS    = 800;  // ms user must hold correct direction to confirm
const TICK_MS    = 80;   // polling interval

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
    const [failed,       setFailed]       = useState(false);
    const [confirming,   setConfirming]   = useState(false);  // backend call in progress
    const [confirmError, setConfirmError] = useState(null);

    // Refs for the validation loop (avoids stale closures in setInterval)
    const promptIdxRef  = useRef(0);
    const holdStartRef  = useRef(null);   // timestamp when correct direction started
    const tickRef       = useRef(null);
    const landmarksRef  = useRef(null);   // always-fresh landmarks, avoids stale closure

    /* ── Face mesh hook ─────────────────────────────────────────── */
    const { ready: meshReady, modelLoading, faceDetected, landmarks, startTracking, stopTracking } = useFaceMesh(videoRef);

    // Keep landmarksRef always current so setInterval never reads stale data
    useEffect(() => { landmarksRef.current = landmarks; }, [landmarks]);

    /* ── Camera ─────────────────────────────────────────────────── */
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

    /* ── Start tracking once both cam and model are ready ───────── */
    useEffect(() => {
        if (camReady && meshReady && started) {
            startTracking();
        }
        return () => {
            if (!started) stopTracking();
        };
    }, [camReady, meshReady, started, startTracking, stopTracking]);

    /* ── Validation loop ────────────────────────────────────────── */
    // Does NOT include `landmarks` in deps — reads from landmarksRef instead
    // so the interval is created once and always has fresh data.
    useEffect(() => {
        if (!started || allDone || failed) return;

        tickRef.current = setInterval(() => {
            const idx = promptIdxRef.current;
            if (idx >= PROMPTS.length) return;

            const required = PROMPTS[idx].dir;
            // Use ref so we always get the latest landmarks without restarting the interval
            const dir = classifyDirection(landmarksRef.current);
            setCurrentDir(dir);   // update display

            if (dir === required) {
                if (!holdStartRef.current) {
                    holdStartRef.current = performance.now();
                }
                const elapsed = performance.now() - holdStartRef.current;
                const pct = Math.min(100, (elapsed / HOLD_MS) * 100);
                setHoldPct(pct);
                setStepStates(prev => prev.map((s, i) => i === idx ? 'holding' : s));

                if (elapsed >= HOLD_MS) {
                    // ✅ Prompt PASSED
                    holdStartRef.current = null;
                    setHoldPct(0);
                    setStepStates(prev => prev.map((s, i) => i === idx ? 'passed' : s));

                    const nextIdx = idx + 1;
                    promptIdxRef.current = nextIdx;
                    setPromptIdx(nextIdx);

                    if (nextIdx >= PROMPTS.length) {
                        clearInterval(tickRef.current);
                        tickRef.current = null;
                        setAllDone(true);
                        stopTracking();
                    } else {
                        setStepStates(prev => prev.map((s, i) => i === nextIdx ? 'active' : s));
                    }
                }
            } else {
                // Wrong direction — reset hold timer
                if (holdStartRef.current) {
                    holdStartRef.current = null;
                    setHoldPct(0);
                    setStepStates(prev => prev.map((s, i) => i === idx ? 'active' : s));
                }
            }
        }, TICK_MS);

        return () => { clearInterval(tickRef.current); tickRef.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [started, allDone, failed, stopTracking]); // ← NO `landmarks` here — use ref instead

    /* ── Confirm with backend once all done ─────────────────────── */
    useEffect(() => {
        if (!allDone || !sessionId) return;

        // Capture a frame and send to backend to set livenessPassed = true
        const confirmLiveness = async () => {
            setConfirming(true);
            setConfirmError(null);
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
                await api.post('/verification/liveness', {
                    sessionId,
                    frameBase64: frameBase64 || '',
                    clientVerified: true,  // signal that client-side direction check passed
                });
            } catch (e) {
                // Non-fatal: log but don't block the user
                console.warn('Liveness backend confirm failed (non-fatal):', e.message);
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
        setCurrentDir(null);
        setAllDone(false);
        setFailed(false);
        setStepStates(PROMPTS.map((_, i) => i === 0 ? 'active' : 'waiting'));
        setStarted(true);
    }, []);

    const canStart = camReady && meshReady;

    return (
        <div style={card} className="animate-fade-up">
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1.25rem' }}>
                <div style={{ width: 36, height: 36, borderRadius: 8, background: '#ECFDF5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Eye size={18} color="#10B981" />
                </div>
                <div>
                    <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#1E293B' }}>Liveness Verification</h3>
                    <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748B' }}>
                        Follow each direction prompt — hold until confirmed.
                    </p>
                </div>
            </div>

            <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-start' }}>
                {/* Webcam */}
                <div style={{ width: 220, flexShrink: 0 }}>
                    <div style={{ position: 'relative', borderRadius: 12, overflow: 'hidden', background: '#0F172A', aspectRatio: '4/3' }}>
                        <video
                            ref={videoRef}
                            autoPlay muted playsInline
                            onLoadedData={() => setCamReady(true)}
                            style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)', display: 'block' }}
                        />

                        {/* Face oval guide */}
                        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                            <div style={{
                                width: '60%', height: '80%',
                                border: `2px solid ${faceDetected ? 'rgba(34,197,94,0.8)' : 'rgba(255,255,255,0.4)'}`,
                                borderRadius: '50%', transition: 'border-color 0.3s',
                            }} />
                        </div>

                        {/* Current prompt overlay */}
                        {started && !allDone && promptIdx < PROMPTS.length && (
                            <div style={{
                                position: 'absolute', top: 0, left: 0, right: 0,
                                background: 'rgba(15,23,42,0.7)',
                                padding: '6px 0', textAlign: 'center',
                            }}>
                                <span style={{ color: '#fff', fontSize: '1.1rem', fontWeight: 800 }}>
                                    {PROMPTS[promptIdx].emoji} {PROMPTS[promptIdx].label}
                                </span>
                            </div>
                        )}

                        {/* Model loading overlay */}
                        {modelLoading && (
                            <div style={{ position: 'absolute', inset: 0, background: 'rgba(15,23,42,0.75)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                                <div style={{ width: 28, height: 28, border: '3px solid #38BDF8', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                                <span style={{ color: '#bae6fd', fontSize: '0.72rem', fontWeight: 600 }}>Loading AI model…</span>
                            </div>
                        )}

                        {/* Success overlay */}
                        {allDone && (
                            <div style={{ position: 'absolute', inset: 0, background: 'rgba(22,163,74,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <CheckCircle size={52} color="#22C55E" />
                            </div>
                        )}

                        {/* Live direction indicator */}
                        {started && !allDone && (
                            <DirectionIndicator required={PROMPTS[promptIdx]?.dir} current={currentDir} />
                        )}
                    </div>

                    {/* Face status pill */}
                    <div style={{ marginTop: 6, textAlign: 'center' }}>
                        <span style={{
                            fontSize: '0.68rem', fontWeight: 700, padding: '2px 10px', borderRadius: 99,
                            background: faceDetected ? '#F0FDF4' : '#FEF2F2',
                            color:      faceDetected ? '#15803D' : '#DC2626',
                            border:     `1px solid ${faceDetected ? '#BBF7D0' : '#FECACA'}`,
                        }}>
                            {faceDetected ? '✓ Face detected' : '✗ No face'}
                        </span>
                    </div>
                </div>

                {/* Step list */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                    {PROMPTS.map((p, i) => (
                        <GoalCard
                            key={p.id}
                            prompt={p}
                            state={stepStates[i]}
                            holdPct={i === promptIdx ? holdPct : 0}
                        />
                    ))}
                </div>
            </div>

            {/* Warning: no face */}
            {started && !allDone && !faceDetected && (
                <div style={{ marginTop: '0.85rem', padding: '0.65rem 0.9rem', background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 8, fontSize: '0.78rem', color: '#92400E', display: 'flex', gap: 6, alignItems: 'center' }}>
                    <AlertCircle size={14} /> No face detected — center your face in the oval.
                </div>
            )}

            {/* CTA */}
            <div style={{ marginTop: '1.25rem' }}>
                {allDone ? (
                    <button style={mkBtn(confirming ? '#CBD5E1' : '#22C55E', confirming)} onClick={onVerified} disabled={confirming}>
                        {confirming
                            ? <><RefreshCw size={15} style={{ animation: 'spin 1s linear infinite' }} /> Confirming with server…</>
                            : <><CheckCircle size={15} /> Liveness Confirmed — Continue</>
                        }
                    </button>
                ) : (
                    <button
                        style={mkBtn(canStart ? '#10B981' : '#CBD5E1', !canStart)}
                        onClick={handleStart}
                        disabled={!canStart}
                    >
                        {modelLoading
                            ? '⏳ Loading model…'
                            : started
                                ? '🔄 Restart'
                                : '▶ Start Liveness Check'}
                    </button>
                )}
            </div>

            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
    );
}
