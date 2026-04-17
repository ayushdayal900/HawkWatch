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
    CheckCircle, XCircle, ArrowRight, RefreshCw,
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

function StepEnvironment({ onPass, sessionId }) {
    const videoRef = useRef(null);
    const [camReady,  setCamReady]  = useState(false);
    const [scanning,  setScanning]  = useState(false);
    const [done,      setDone]      = useState(false);
    const [error,     setError]     = useState(null);

    // Per-check results: null = not checked, true = passed, false = failed
    const [results, setResults] = useState({
        lighting:   null,
        alone:      null,
        noDevices:  null,
        background: null,
    });

    const ENV_ITEMS = [
        { id: 'lighting',   label: 'Adequate lighting',          emoji: '💡', failHint: 'Improve lighting — turn on a lamp or face a window.' },
        { id: 'alone',      label: 'Only you in frame',          emoji: '🚫', failHint: 'Make sure no other people are visible in the camera.' },
        { id: 'noDevices',  label: 'No unauthorized devices',    emoji: '📵', failHint: 'Remove phones, laptops or other devices from view.' },
        { id: 'background', label: 'No other persons in bg',     emoji: '🖼️', failHint: 'Make sure your background is clear.' },
    ];

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

        // Allow camera a moment to stabilise
        await new Promise(r => setTimeout(r, 1500));

        // Capture frame
        const v = videoRef.current;
        const canvas = document.createElement('canvas');
        canvas.width  = v.videoWidth  || 640;
        canvas.height = v.videoHeight || 480;
        canvas.getContext('2d').drawImage(v, 0, 0);
        const frameBase64 = canvas.toDataURL('image/jpeg', 0.85);

        try {
            const { data } = await api.post('/verification/environment', {
                sessionId,
                frameBase64,
            });

            // Update each check result individually
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
            setError(e.response?.data?.message || 'Scan failed — please check your connection and retry.');
        } finally {
            setScanning(false);
        }
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
                    <p style={{ margin: 0, color: '#64748B', fontSize: '0.82rem' }}>
                        AWS Rekognition will analyse your webcam frame for lighting, devices, and presence.
                    </p>
                </div>
                <Pill status={done ? 'passed' : scanning ? 'checking' : 'idle'} />
            </div>

            <div style={{ display: 'flex', gap: '1.5rem' }}>
                {/* Live webcam */}
                <div style={{ width: 220, flexShrink: 0, borderRadius: 10, overflow: 'hidden', background: '#1E293B', aspectRatio: '4/3', position: 'relative' }}>
                    <video ref={videoRef} autoPlay muted playsInline
                        onLoadedData={() => setCamReady(true)}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
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
                        const r = results[item.id]; // null | true | false
                        const isChecking = scanning && r === null;
                        const bg     = r === true ? '#F0FDF4' : r === false ? '#FEF2F2' : '#F8FAFC';
                        const border = r === true ? '#BBF7D0' : r === false ? '#FECACA' : '#E2E8F0';
                        return (
                            <div key={item.id} style={{
                                display: 'flex', alignItems: 'center', gap: '0.75rem',
                                padding: '0.75rem 1rem', borderRadius: 10,
                                background: bg, border: `1.5px solid ${border}`,
                                transition: 'all 0.3s',
                            }}>
                                <span style={{ fontSize: '1.2rem' }}>{item.emoji}</span>
                                <span style={{ fontSize: '0.875rem', color: r === true ? '#15803D' : r === false ? '#DC2626' : '#64748B', fontWeight: r !== null ? 600 : 400, flex: 1 }}>
                                    {item.label}
                                </span>
                                {r === true  && <CheckCircle size={15} color="#16A34A" style={{ flexShrink: 0 }} />}
                                {r === false && <XCircle     size={15} color="#DC2626" style={{ flexShrink: 0 }} />}
                                {isChecking  && <RefreshCw   size={13} color="#F59E0B" style={{ flexShrink: 0, animation: 'spin 1s linear infinite' }} />}
                            </div>
                        );
                    })}
                </div>
            </div>

            {error && (
                <div style={{ marginTop: '1rem', padding: '0.8rem 1rem', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, fontSize: '0.85rem', color: '#DC2626', display: 'flex', gap: '0.6rem', alignItems: 'flex-start' }}>
                    <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: 1 }} />
                    <span>{error}</span>
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
                            : <><ScanLine size={15} /> {error ? 'Retry Scan' : 'Start Environment Scan'}</>
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
    const [sessionId,  setSessionId]  = useState(null);
    const [loading,    setLoading]    = useState(true);

    const next = useCallback(() => setStep(s => s + 1), []);

    // Session initialization
    useEffect(() => {
        const initSession = async () => {
            try {
                const { data } = await api.post('/verification/start', { examId: id });
                setSessionId(data.sessionId);
            } catch (err) {
                toast.error('Failed to start verification session.');
            } finally {
                setLoading(false);
            }
        };
        initSession();
    }, [id]);


    // Called after step 4 (environment) passes → store session then enter exam
    const enterExam = useCallback(async () => {
        try {
            // Start actual exam session
            await api.post('/exams/start', { examId: id });
            
            toast.success('Verification complete! Exam started.');
            navigate(`/student-exam/${id}?verified=1`);
        } catch {
            toast.error('Could not start exam session. Please try again.');
        }
    }, [id, navigate]);

    const renderStep = () => {
        if (loading || !sessionId) return <div style={{ padding: '2rem' }}>Starting secure verification session...</div>;

        switch (step) {
            case 0: return <IDVerification sessionId={sessionId} onVerified={next} onError={() => {}} />;
            case 1: return <FaceVerification sessionId={sessionId} onVerified={next} onError={() => {}} />;
            case 2: return <LivenessDetector sessionId={sessionId} onVerified={next} />;
            case 3: return <StepEnvironment  sessionId={sessionId} onPass={enterExam} />;
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
