/**
 * LivenessDetector.jsx
 * ──────────────────────────────────────────────────────────────────
 * Uses MediaPipe FaceMesh to detect liveness by tracking three
 * specific live movements:
 *   1. Blink      (Eye Aspect Ratio / EAR dip)
 *   2. Head Left  (Nose tip moved significantly left)
 *   3. Head Right (Nose tip moved significantly right)
 *
 * Once all three boolean gates are unlocked, `onVerified()` is called.
 */

import { useEffect, useRef, useState } from 'react';
import useFaceMesh from '../hooks/useFaceMesh';
import { Camera, CheckCircle, RefreshCw, Eye, ArrowLeftRight } from 'lucide-react';

/* ── Thresholds ─────────────────────────────────────────────────── */
const EAR_THRESHOLD   = 0.18;  // If EAR < 0.18, count as blink
const NOSE_LEFT_THRESH  = 0.65;  // Normalised x-coord (camera mirrored -> left is higher x)
const NOSE_RIGHT_THRESH = 0.35;  // Normalised x-coord (right is lower x)

/* ── MediaPipe Landmark Indices ─────────────────────────────────── */
const LEFT_EYE   = [33, 160, 158, 133, 153, 144];
const RIGHT_EYE  = [362, 385, 387, 263, 373, 380];
const NOSE_TIP   = 1;

/* ── Style helpers ──────────────────────────────────────────────── */
const card  = { background: '#fff', borderRadius: 12, border: '1px solid #E2E8F0', padding: '1.5rem' };
const mkBtn = (bg) => ({
    display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
    background: bg, color: '#fff',
    border: 'none', borderRadius: 8, padding: '0.7rem 1.4rem',
    fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer',
    width: '100%', justifyContent: 'center', transition: 'opacity 0.15s',
});

/* ── Math calculation ───────────────────────────────────────────── */
// Standard Euclidean distance between two 3D points
function distance(p1, p2) {
    const dx = p1.x - p2.x;
    const dy = p1.y - p2.y;
    return Math.sqrt(dx * dx + dy * dy);
}

// Compute Eye Aspect Ratio (EAR) for one eye
function calculateEAR(landmarks, indices) {
    if (!landmarks) return 1.0;
    // P1 to P6 = distances[0]-distances[5]
    const p1 = landmarks[indices[0]]; // Outer corner
    const p2 = landmarks[indices[1]]; // Upper mid-left
    const p3 = landmarks[indices[2]]; // Upper mid-right
    const p4 = landmarks[indices[3]]; // Inner corner
    const p5 = landmarks[indices[4]]; // Lower mid-right
    const p6 = landmarks[indices[5]]; // Lower mid-left

    // vertical distances
    const v1 = distance(p2, p6);
    const v2 = distance(p3, p5);
    // horizontal distance
    const h  = distance(p1, p4);

    if (h === 0) return 0;
    return (v1 + v2) / (2.0 * h);
}

export default function LivenessDetector({ onVerified }) {
    const videoRef = useRef(null);

    const { ready, faceDetected, landmarks, startTracking, stopTracking } = useFaceMesh(videoRef);

    // Start tracking as soon as MediaPipe arrives
    useEffect(() => {
        if (ready) startTracking();
        return () => stopTracking();
    }, [ready, startTracking, stopTracking]);

    // Track completed goals
    const [hasBlinked,    setHasBlinked]    = useState(false);
    const [hasTurnedLeft, setHasTurnedLeft] = useState(false);
    const [hasTurnedRight,setHasTurnedRight]= useState(false);

    // Real-time analysis computed purely during render (no side-effects)
    let isBlinking = false;
    let isTurningL = false;
    let isTurningR = false;

    if (landmarks) {
        // 1. Blink detection
        const leftEar  = calculateEAR(landmarks, LEFT_EYE);
        const rightEar = calculateEAR(landmarks, RIGHT_EYE);
        const ear = (leftEar + rightEar) / 2.0;
        if (ear < EAR_THRESHOLD) isBlinking = true;

        // 2. Head turn detection (mirrored coordinates)
        const noseX = landmarks[NOSE_TIP].x;
        if (noseX > NOSE_LEFT_THRESH)  isTurningL = true;
        if (noseX < NOSE_RIGHT_THRESH) isTurningR = true;
    }

    // Commit "has done" flags in a short timeout (or clean effect) if we just successfully hit one
    useEffect(() => {
        if (!landmarks) return;
        const ts = [];
        if (isBlinking && !hasBlinked)    ts.push(setTimeout(() => setHasBlinked(true), 0));
        if (isTurningL && !hasTurnedLeft) ts.push(setTimeout(() => setHasTurnedLeft(true), 0));
        if (isTurningR && !hasTurnedRight)ts.push(setTimeout(() => setHasTurnedRight(true), 0));
        return () => ts.forEach(clearTimeout);
    }, [isBlinking, isTurningL, isTurningR, hasBlinked, hasTurnedLeft, hasTurnedRight, landmarks]);

    // Check completion condition
    const allPassed = hasBlinked && hasTurnedLeft && hasTurnedRight;

    return (
        <div style={card} className="animate-fade-up">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1.25rem' }}>
                <div style={{ width: 36, height: 36, borderRadius: 8, background: '#ECFDF5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Eye size={18} color="#10B981" />
                </div>
                <div>
                    <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#1E293B' }}>Liveness Verification</h3>
                    <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748B' }}>Follow the prompts below to prove you are physically present.</p>
                </div>
            </div>

            <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-start' }}>
                {/* Visual Tracker */}
                <div style={{ width: 220, flexShrink: 0 }}>
                    <div style={{ position: 'relative', borderRadius: 12, overflow: 'hidden', background: '#0F172A', aspectRatio: '4/3' }}>
                        {/* Mirror the video so left means left */}
                        <video
                            ref={videoRef} autoPlay muted playsInline
                            style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }}
                        />

                        {/* Guide box */}
                        <div style={{ position: 'absolute', inset: 0, border: `2px solid ${allPassed ? '#22C55E' : '#10B981'}`, opacity: 0.5, borderRadius: 12, pointerEvents: 'none' }} />

                        {/* Loading / Ready state */}
                        {!ready && (
                            <div style={{ position: 'absolute', inset: 0, background: 'rgba(15,23,42,0.8)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                                <RefreshCw size={24} color="#38BDF8" style={{ animation: 'spin 1.5s linear infinite' }} />
                                <span style={{ color: '#bae6fd', fontSize: '0.72rem', fontWeight: 600 }}>Loading ML Model…</span>
                            </div>
                        )}

                        {ready && !faceDetected && !allPassed && (
                            <div style={{ position: 'absolute', inset: 0, background: 'rgba(15,23,42,0.6)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                                <Camera size={24} color="#F87171" />
                                <span style={{ color: '#fecaca', fontSize: '0.72rem', fontWeight: 600 }}>No face visible</span>
                            </div>
                        )}
                        
                        {allPassed && (
                            <div style={{ position: 'absolute', inset: 0, background: 'rgba(34,197,94,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <CheckCircle size={48} color="#22C55E" />
                            </div>
                        )}
                    </div>
                </div>

                {/* Requirements checklist */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                    <GoalCard
                        icon={<Eye size={18} />}
                        title="Blink your eyes"
                        desc="Close both eyes completely"
                        isDone={hasBlinked}
                        isActive={isBlinking}
                    />
                    <GoalCard
                        icon={<ArrowLeftRight size={18} />}
                        title="Turn head Left"
                        desc="Rotate your head to your left side"
                        isDone={hasTurnedLeft}
                        isActive={isTurningL}
                    />
                    <GoalCard
                        icon={<ArrowLeftRight size={18} />}
                        title="Turn head Right"
                        desc="Rotate your head to your right side"
                        isDone={hasTurnedRight}
                        isActive={isTurningR}
                    />
                </div>
            </div>

            <div style={{ marginTop: '1.25rem' }}>
                <button
                    style={mkBtn(allPassed ? '#22C55E' : '#CBD5E1')}
                    onClick={() => { if (allPassed && onVerified) onVerified(); }}
                    disabled={!allPassed}
                >
                    {allPassed ? 'Liveness Confirmed — Continue' : 'Please complete all actions above…'}
                </button>
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
        <div style={{
            display: 'flex', alignItems: 'center', gap: '1rem',
            padding: '0.85rem 1rem', borderRadius: 10,
            background: bg, border: `1.5px solid ${border}`,
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            transform: isActive && !isDone ? 'scale(1.02)' : 'none',
        }}>
            <div style={{ color, transition: 'color 0.3s' }}>{isDone ? <CheckCircle size={22} /> : icon}</div>
            <div>
                <p style={{ margin: 0, fontSize: '0.875rem', fontWeight: isDone || isActive ? 700 : 500, color: isDone ? '#166534' : '#1E293B', transition: 'color 0.3s' }}>
                    {title}
                </p>
                <p style={{ margin: 0, fontSize: '0.72rem', color: '#64748B' }}>{desc}</p>
            </div>
        </div>
    );
}
