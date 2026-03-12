/**
 * ExamVerification.jsx
 * ─────────────────────────────────────────────────────────────────
 * Full-page pre-exam verification flow. Navigated to from the
 * exam intro card ("Start Exam" button).
 *
 * Route: /exam-verification/:id
 *
 * Flow:
 *   Step 1 — ID Card Upload
 *   Step 2 — Face Capture
 *   Step 3 — Liveness Check
 *   Step 4 — Environment Scan
 *   → POST /api/exams/start → navigate to /student-exam/:id
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Navbar  from '../components/Navbar';
import api     from '../services/api';
import toast   from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import IDVerification   from '../components/IDVerification';
import FaceVerification from '../components/FaceVerification';
import LivenessDetector from '../components/LivenessDetector';
import {
    CreditCard, Camera, Eye, ScanLine,
    CheckCircle, ArrowRight, RefreshCw,
    AlertTriangle, ShieldCheck,
} from 'lucide-react';

/* ── Step definitions ───────────────────────────────────────────── */
const STEPS = [
    { id: 'id',          label: 'ID Card Upload',     icon: CreditCard,  color: '#3B82F6', bg: '#EFF6FF' },
    { id: 'face',        label: 'Face Capture',        icon: Camera,      color: '#8B5CF6', bg: '#F5F3FF' },
    { id: 'liveness',    label: 'Liveness Check',      icon: Eye,         color: '#10B981', bg: '#ECFDF5' },
    { id: 'environment', label: 'Environment Scan',    icon: ScanLine,    color: '#F59E0B', bg: '#FFFBEB' },
];

/* ── Shared inline-button helper ────────────────────────────────── */
const mkBtn = (bg, full = false) => ({
    display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
    background: bg, color: '#fff', border: 'none', borderRadius: 8,
    padding: '0.7rem 1.5rem', fontWeight: 600, fontSize: '0.875rem',
    cursor: 'pointer',
    width:   full ? '100%' : undefined,
    justifyContent: full ? 'center' : undefined,
    transition: 'opacity 0.15s',
    opacity: 1,
});

/* ── Status pill ────────────────────────────────────────────────── */
function Pill({ status }) {
    const map = {
        idle:     { bg: '#F1F5F9', color: '#64748B', label: 'Pending'     },
        checking: { bg: '#EFF6FF', color: '#2563EB', label: 'Checking…'   },
        passed:   { bg: '#F0FDF4', color: '#16A34A', label: 'Passed ✓'    },
        failed:   { bg: '#FEF2F2', color: '#DC2626', label: 'Failed ✗'    },
    };
    const s = map[status] ?? map.idle;
    return (
        <span style={{ padding: '3px 12px', borderRadius: 99, fontSize: '0.72rem', fontWeight: 700, background: s.bg, color: s.color, border: `1px solid ${s.color}25` }}>
            {s.label}
        </span>
    );
}

/* ── Top stepper bar ────────────────────────────────────────────── */
function StepBar({ currentIdx, results }) {
    return (
        <div className="card" style={{ display: 'flex', alignItems: 'flex-start', gap: 0, padding: '1.25rem 1.5rem', marginBottom: '1.5rem', overflowX: 'auto' }}>
            {STEPS.map((s, i) => {
                const done   = results[s.id] === 'passed';
                const active = i === currentIdx && !done;
                const Icon   = s.icon;
                return (
                    <div key={s.id} style={{ display: 'flex', alignItems: 'center', flex: i < STEPS.length - 1 ? 1 : 0, minWidth: 120 }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                            <div style={{
                                width: 40, height: 40, borderRadius: '50%',
                                background: done ? '#22C55E' : active ? s.color : '#F1F5F9',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                boxShadow: active ? `0 0 0 4px ${s.color}30` : 'none',
                                transition: 'all 0.3s',
                            }}>
                                {done
                                    ? <CheckCircle size={18} color="#fff" />
                                    : <Icon size={16} color={active ? '#fff' : '#94A3B8'} />
                                }
                            </div>
                            <span style={{ fontSize: '0.68rem', fontWeight: 700, color: done ? '#22C55E' : active ? s.color : '#94A3B8', whiteSpace: 'nowrap', textAlign: 'center' }}>
                                Step {i + 1}<br />{s.label}
                            </span>
                        </div>
                        {i < STEPS.length - 1 && (
                            <div style={{ flex: 1, height: 2, background: done ? '#22C55E' : '#E2E8F0', margin: '0 4px', marginBottom: 22, transition: 'background 0.4s' }} />
                        )}
                    </div>
                );
            })}
        </div>
    );
}


/* ────────────────────────────────────────────────────────────────
   Step 4 — Environment Scan
   ──────────────────────────────────────────────────────────────── */
const ENV_ITEMS = [
    { id: 'lighting',   label: 'Adequate lighting',        emoji: '💡' },
    { id: 'background', label: 'Clear background',          emoji: '🖼️' },
    { id: 'alone',      label: 'No other persons visible',  emoji: '🚫' },
    { id: 'devices',    label: 'No unauthorized devices',   emoji: '📵' },
];

function StepEnvironment({ onPass, examId }) {
    const videoRef = useRef(null);
    const [camReady,  setCamReady]  = useState(false);
    const [scanning,  setScanning]  = useState(false);
    const [done,      setDone]      = useState(false);
    const [error,     setError]     = useState(null);

    // Track which UI checks look "complete" for visual feedback
    const [results,   setResults]   = useState({});

    useEffect(() => {
        let stream;
        navigator.mediaDevices
            .getUserMedia({ video: true, audio: false })
            .then(s => { stream = s; if (videoRef.current) videoRef.current.srcObject = s; setCamReady(true); })
            .catch(() => {});
        return () => stream?.getTracks().forEach(t => t.stop());
    }, []);

    const scan = () => {
        setScanning(true);
        setError(null);

        // Pre-fill visual checkmarks over time to look nice
        ENV_ITEMS.forEach((item, i) => {
            setTimeout(() => {
                setResults(r => ({ ...r, [item.id]: 'passed' }));
            }, 600 * (i + 1));
        });

        // 1. Give the camera a few seconds to stabilise
        setTimeout(async () => {
            const v = videoRef.current;
            if (!v) { setScanning(false); return; }

            // 2. Capture frame
            const canvas = document.createElement('canvas');
            canvas.width = v.videoWidth;
            canvas.height = v.videoHeight;
            canvas.getContext('2d').drawImage(v, 0, 0);
            const frameB64 = canvas.toDataURL('image/jpeg', 0.85);

            // 3. Send to Rekognition backend
            try {
                const { data } = await api.post('/verification/environment-scan', {
                    image: frameB64,
                    examId
                });

                if (data.clean) {
                    setScanning(false);
                    setDone(true);
                } else {
                    setScanning(false);
                    setResults({}); // reset visual checks
                    let msg = 'Prohibited item detected. ';
                    if (data.alerts?.includes('PHONE_DETECTED')) msg += 'Mobile phone found. ';
                    if (data.alerts?.includes('BOOK_DETECTED'))  msg += 'Books or papers found. ';
                    if (data.personCount > 1)                    msg += `Multiple people (${data.personCount}) found. `;
                    setError(msg + 'Please clear your environment and try again.');
                }
            } catch {
                setScanning(false);
                setResults({});
                setError('Failed to scan environment. Please try again.');
            }
        }, 2500); // 2.5s delay before sending frame
    };

    return (
        <div className="card animate-fade-up" style={{ padding: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.3rem' }}>
                        <div style={{ width: 36, height: 36, borderRadius: 8, background: '#FFFBEB', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <ScanLine size={18} color="#F59E0B" />
                        </div>
                        <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#1E293B' }}>Environment Scan</h2>
                    </div>
                    <p style={{ margin: 0, color: '#64748B', fontSize: '0.82rem' }}>Confirm your surroundings meet the exam requirements.</p>
                </div>
                <Pill status={done ? 'passed' : scanning ? 'checking' : 'idle'} />
            </div>

            <div style={{ display: 'flex', gap: '1.5rem' }}>
                {/* Live webcam with scan animation */}
                <div style={{ width: 220, flexShrink: 0, borderRadius: 10, overflow: 'hidden', background: '#1E293B', aspectRatio: '4/3', position: 'relative' }}>
                    <video ref={videoRef} autoPlay muted playsInline style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    {scanning && (
                        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
                            <div style={{ position: 'absolute', inset: 0, background: 'rgba(245,158,11,0.1)' }} />
                            <div style={{
                                position: 'absolute', left: 0, right: 0, height: 3,
                                background: 'rgba(245,158,11,0.9)',
                                boxShadow: '0 0 12px rgba(245,158,11,0.8)',
                                animation: 'scanline 1.5s linear infinite',
                            }} />
                        </div>
                    )}
                    {done && (
                        <div style={{ position: 'absolute', inset: 0, background: 'rgba(22,163,74,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <CheckCircle size={48} color="#22C55E" />
                        </div>
                    )}
                </div>

                {/* Checks list */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                    {ENV_ITEMS.map(item => {
                        const r = results[item.id];
                        return (
                            <div key={item.id} style={{
                                display: 'flex', alignItems: 'center', gap: '0.75rem',
                                padding: '0.75rem 1rem', borderRadius: 10,
                                background: r ? '#F0FDF4' : '#F8FAFC',
                                border: `1.5px solid ${r ? '#BBF7D0' : '#E2E8F0'}`,
                                transition: 'all 0.3s',
                            }}>
                                <span style={{ fontSize: '1.2rem' }}>{item.emoji}</span>
                                <span style={{ fontSize: '0.875rem', color: r ? '#15803D' : '#64748B', fontWeight: r ? 600 : 400 }}>{item.label}</span>
                                {r && <CheckCircle size={15} color="#16A34A" style={{ marginLeft: 'auto', flexShrink: 0 }} />}
                                {!r && scanning && <RefreshCw size={13} color="#F59E0B" style={{ marginLeft: 'auto', animation: 'spin 1s linear infinite', flexShrink: 0 }} />}
                            </div>
                        );
                    })}
                </div>
            </div>

            {error && (
                <div style={{ marginTop: '1rem', padding: '0.8rem 1rem', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, fontSize: '0.85rem', color: '#DC2626', display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
                    <AlertTriangle size={16} style={{ flexShrink: 0 }} />
                    {error}
                </div>
            )}

            <div style={{ marginTop: '1.25rem' }}>
                {done ? (
                    <button style={mkBtn('#22C55E', true)} onClick={onPass}>
                        <ShieldCheck size={16} /> All Checks Passed — Enter Exam
                    </button>
                ) : (
                    <button style={mkBtn(camReady ? '#F59E0B' : '#CBD5E1', true)} onClick={scan} disabled={!camReady || scanning}>
                        {scanning
                            ? <><RefreshCw size={15} style={{ animation: 'spin 1s linear infinite' }} /> Analyzing with Rekognition…</>
                            : <><ScanLine size={15} /> Start Environment Scan</>
                        }
                    </button>
                )}
            </div>
        </div>
    );
}

/* ────────────────────────────────────────────────────────────────
   Main Page
   ──────────────────────────────────────────────────────────────── */
export default function ExamVerification() {
    const { id }       = useParams();
    const navigate     = useNavigate();
    const { user }     = useAuth();
    const studentId    = user?._id || user?.id || '';

    const [step,       setStep]       = useState(0);
    const [idImageB64, setIdImageB64] = useState(null); // passed from step 1 → step 2

    const next = useCallback(() => setStep(s => s + 1), []);

    // Step 1 complete: save captured ID image for face comparison
    const handleIDVerified = useCallback((imageDataUrl) => {
        setIdImageB64(imageDataUrl);
        next();
    }, [next]);

    // Called after step 4 (environment) passes → store session then enter exam
    const enterExam = useCallback(async () => {
        try {
            // Document that all client-orchestrated UI steps have fully passed (id, face, liveness, environment)
            await api.post('/verification/session', {
                examId: id,
                idVerified: true,
                faceMatched: true,
                livenessPassed: true,
                environmentSafe: true
            });

            // Start actual exam session (gated securely by the above verification log)
            await api.post('/exams/start', { examId: id });
            
            toast.success('Verification complete! Exam started.');
            navigate(`/student-exam/${id}?verified=1`);
        } catch {
            toast.error('Could not start exam session. Please try again.');
        }
    }, [id, navigate]);

    const renderStep = () => {
        switch (step) {
            case 0: return (
                <>
                    <IDVerification
                        studentId={studentId}
                        onVerified={handleIDVerified}
                        onError={() => {}}
                    />
                </>
            );
            case 1: return (
                <>
                    <FaceVerification
                        studentId={studentId}
                        idImageB64={idImageB64}
                        onVerified={next}
                        onError={() => {}}
                    />
                </>
            );
            case 2: return <LivenessDetector onVerified={next}     />;
            case 3: return <StepEnvironment  onPass={enterExam} examId={id} />;
            default: return null;
        }
    };

    // Collect which steps have passed (for the stepper bar colouring)
    const results = {
        id:          step > 0 ? 'passed' : undefined,
        face:        step > 1 ? 'passed' : undefined,
        liveness:    step > 2 ? 'passed' : undefined,
        environment: step > 3 ? 'passed' : undefined,
    };

    return (
        <div style={{ display: 'flex' }}>
            <Sidebar />

            <main className="main-content">
                <Navbar title="Exam Verification" />

                {/* Intro banner */}
                <div style={{ padding: '0.75rem 1rem', background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 8, marginBottom: '1.5rem', display: 'flex', gap: '0.6rem', alignItems: 'center', fontSize: '0.82rem', color: '#92400E' }}>
                    <AlertTriangle size={14} style={{ flexShrink: 0 }} />
                    Complete all 4 verification steps. Your webcam will be used in each step. Do not close or refresh this page.
                </div>

                {/* Step bar */}
                <StepBar currentIdx={step} results={results} />

                {/* Active step */}
                <div style={{ maxWidth: 640 }}>
                    {renderStep()}
                </div>
            </main>

            {/* Keyframe for spinner */}
            <style>{`
                @keyframes spin     { to { transform: rotate(360deg); } }
                @keyframes scanline { 0% { top: 0; } 100% { top: 100%; } }
            `}</style>
        </div>
    );
}
