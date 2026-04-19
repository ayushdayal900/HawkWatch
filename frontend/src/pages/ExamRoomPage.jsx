import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { examAPI, proctoringAPI } from '../services/api';
import ProctoringOverlay from '../components/ProctoringOverlay';
import { Clock, ChevronLeft, ChevronRight, Send, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';

function useCountdown(seconds) {
    const [remaining, setRemaining] = useState(seconds);
    useEffect(() => {
        if (!seconds) return;
        const id = setInterval(() => setRemaining((s) => Math.max(0, s - 1)), 1000);
        return () => clearInterval(id);
    }, [seconds]);
    const mm = String(Math.floor(remaining / 60)).padStart(2, '0');
    const ss = String(remaining % 60).padStart(2, '0');
    return { remaining, display: `${mm}:${ss}` };
}

export default function ExamRoomPage() {
    const { id } = useParams();
    const navigate = useNavigate();

    const [exam, setExam] = useState(null);
    const [sessionId, setSessionId] = useState(null);
    // eslint-disable-next-line no-unused-vars
    const [attemptId, setAttemptId] = useState(null);
    const [currentQ, setCurrentQ] = useState(0);
    const [answers, setAnswers] = useState({});
    // eslint-disable-next-line no-unused-vars
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [phase, setPhase] = useState('loading'); // loading | ready | exam | submitted | terminated

    const { remaining, display: timeDisplay } = useCountdown(
        phase === 'exam' && exam ? exam.duration * 60 : 0
    );

    // Load exam
    useEffect(() => {
        examAPI.getById(id)
            .then((r) => { setExam(r.data.data); setPhase('ready'); })
            .catch(() => { toast.error('Failed to load exam.'); navigate('/exams'); })
            .finally(() => setLoading(false));
    }, [id, navigate]);

    // Auto-submit on time up
    useEffect(() => {
        if (phase === 'exam' && remaining === 0) {
            handleSubmit(true);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [remaining, phase]);

    const startExam = async () => {
        try {
            const { data } = await proctoringAPI.startSession({ examId: id, attemptId: null });
            setSessionId(data.data._id);
            setPhase('exam');
        } catch {
            toast.error('Could not start proctoring session.');
        }
    };

    const handleAnswer = (qId, value) => {
        setAnswers((prev) => ({ ...prev, [qId]: value }));
    };

    const handleSubmit = async (autoSubmit = false) => {
        if (submitting) return;
        setSubmitting(true);
        try {
            if (sessionId) await proctoringAPI.endSession(sessionId);
            toast.success(autoSubmit ? 'Time up! Exam auto-submitted.' : 'Exam submitted successfully!');
            setPhase('submitted');
        } catch {
            toast.error('Submission failed.');
        } finally {
            setSubmitting(false);
        }
    };

    const handleTerminated = (reason) => {
        toast.error(`Session terminated: ${reason}`);
        setPhase('terminated');
    };

    // ── READY screen ──────────────────────────────────────────
    if (phase === 'ready' && exam) {
        return (
            <div style={{
                minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'radial-gradient(ellipse at 50% 30%, #111a30, #0a0f1e)'
            }}>
                <div className="card animate-fade-up" style={{ maxWidth: 540, width: '90%', padding: '2rem' }}>
                    <h1 style={{ margin: '0 0 0.5rem', fontWeight: 700, fontSize: '1.4rem', color: '#f1f5f9' }}>{exam.title}</h1>
                    <p style={{ margin: '0 0 1.5rem', color: '#64748b', fontSize: '0.85rem' }}>{exam.description}</p>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem', marginBottom: '1.5rem' }}>
                        {[
                            { label: 'Duration', val: `${exam.duration} min` },
                            { label: 'Questions', val: exam.questions?.length },
                            { label: 'Total Marks', val: exam.totalMarks },
                        ].map(({ label, val }) => (
                            <div key={label} className="card" style={{ padding: '0.75rem', textAlign: 'center' }}>
                                <div style={{ fontSize: '1.3rem', fontWeight: 700, color: '#3b82f6' }}>{val}</div>
                                <div style={{ fontSize: '0.7rem', color: '#64748b' }}>{label}</div>
                            </div>
                        ))}
                    </div>

                    {exam.proctoring?.enabled && (
                        <div style={{
                            background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)',
                            borderRadius: 8, padding: '0.85rem 1rem', marginBottom: '1.5rem', fontSize: '0.8rem', color: '#fbbf24'
                        }}>
                            <div style={{ fontWeight: 600, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                                <AlertTriangle size={14} /> AI Proctoring is Active
                            </div>
                            <ul style={{ margin: 0, paddingLeft: '1.2rem', color: '#f59e0b', lineHeight: 1.7 }}>
                                {exam.proctoring.webcamRequired && <li>Webcam must remain on throughout</li>}
                                {exam.proctoring.faceDetection && <li>Face detection running continuously</li>}
                                {exam.proctoring.deepfakeDetection && <li>Deepfake analysis on every frame</li>}
                                {exam.proctoring.behavioralBiometrics && <li>Keyboard & mouse patterns monitored</li>}
                                {exam.proctoring.fullscreenRequired && <li>Must stay in fullscreen mode</li>}
                                <li>Tab switching limited to {exam.proctoring.tabSwitchLimit} times</li>
                            </ul>
                        </div>
                    )}

                    <button className="btn-primary" onClick={startExam} style={{ width: '100%', justifyContent: 'center' }}>
                        Start Exam
                    </button>
                </div>
            </div>
        );
    }

    // ── EXAM screen ──────────────────────────────────────────
    if (phase === 'exam' && exam) {
        const questions = exam.questions || [];
        const q = questions[currentQ];

        return (
            <div style={{ minHeight: '100vh', background: '#0a0f1e', display: 'flex', flexDirection: 'column' }}>
                {/* Header */}
                <div style={{
                    background: '#0d1424', borderBottom: '1px solid rgba(255,255,255,0.06)',
                    padding: '0.75rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between'
                }}>
                    <div style={{ fontWeight: 700, color: '#f1f5f9', fontSize: '0.95rem' }}>{exam.title}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: remaining < 300 ? '#ef4444' : '#fbbf24', fontWeight: 700 }}>
                            <Clock size={15} /> {timeDisplay}
                        </span>
                        <span style={{ fontSize: '0.78rem', color: '#64748b' }}>Q {currentQ + 1}/{questions.length}</span>
                    </div>
                </div>

                <div className="exam-layout" style={{ flex: 1, display: 'flex', flexWrap: 'wrap', overflow: 'hidden' }}>
                    {/* Question pane */}
                    <div style={{ flex: '1 1 320px', padding: '1.5rem', overflowY: 'auto' }}>
                        {/* Question nav */}
                        <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
                            {questions.map((_, i) => (
                                <button key={i} onClick={() => setCurrentQ(i)} style={{
                                    width: 32, height: 32, borderRadius: 6, fontSize: '0.75rem', fontWeight: 600, border: 'none', cursor: 'pointer',
                                    background: answers[questions[i]._id] ? '#3b82f6' : i === currentQ ? '#1a2744' : '#111a30',
                                    color: answers[questions[i]._id] ? '#fff' : i === currentQ ? '#60a5fa' : '#64748b',
                                    outline: i === currentQ ? '2px solid #3b82f6' : 'none',
                                }}>
                                    {i + 1}
                                </button>
                            ))}
                        </div>

                        <div className="card animate-fade-up">
                            <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.75rem' }}>
                                Question {currentQ + 1} · {q?.points || 1} pt{q?.points !== 1 ? 's' : ''}
                            </div>
                            <p style={{ fontSize: '1rem', color: '#e2e8f0', lineHeight: 1.6, margin: '0 0 1.5rem' }}>{q?.stem}</p>

                            {q?.type === 'mcq' && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                                    {q.options.map((opt) => {
                                        const selected = answers[q._id] === opt.label;
                                        return (
                                            <label key={opt.label} style={{
                                                display: 'flex', alignItems: 'center', gap: '0.75rem',
                                                padding: '0.75rem 1rem', borderRadius: 8, cursor: 'pointer',
                                                border: `1px solid ${selected ? '#3b82f6' : 'rgba(255,255,255,0.08)'}`,
                                                background: selected ? 'rgba(59,130,246,0.1)' : 'transparent',
                                                transition: 'all 0.15s',
                                            }}>
                                                <input type="radio" name={q._id} value={opt.label} checked={selected}
                                                    onChange={() => handleAnswer(q._id, opt.label)} style={{ accentColor: '#3b82f6' }} />
                                                <span style={{ fontSize: '0.875rem', color: selected ? '#93c5fd' : '#cbd5e1' }}>{opt.text}</span>
                                            </label>
                                        );
                                    })}
                                </div>
                            )}

                            {q?.type === 'short-answer' && (
                                <textarea className="input" rows={4} placeholder="Type your answer here…"
                                    value={answers[q._id] || ''}
                                    onChange={(e) => handleAnswer(q._id, e.target.value)}
                                    style={{ resize: 'vertical' }} />
                            )}
                        </div>

                        {/* Navigation */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.25rem' }}>
                            <button className="btn-secondary" onClick={() => setCurrentQ((n) => Math.max(n - 1, 0))} disabled={currentQ === 0}>
                                <ChevronLeft size={16} /> Previous
                            </button>
                            {currentQ < questions.length - 1 ? (
                                <button className="btn-primary" onClick={() => setCurrentQ((n) => n + 1)}>
                                    Next <ChevronRight size={16} />
                                </button>
                            ) : (
                                <button className="btn-primary" onClick={() => handleSubmit(false)} disabled={submitting}
                                    style={{ background: '#10b981' }}>
                                    <Send size={15} /> {submitting ? 'Submitting…' : 'Submit Exam'}
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Proctoring panel */}
                    <div style={{ flex: '0 0 320px', background: '#0d1424', borderLeft: '1px solid rgba(255,255,255,0.06)', borderTop: '1px solid rgba(255,255,255,0.06)', padding: '1.25rem', overflowY: 'auto' }}>
                        <div style={{ fontSize: '0.72rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.75rem' }}>
                            Proctoring Monitor
                        </div>
                        <ProctoringOverlay sessionId={sessionId} onSessionTerminated={handleTerminated} />
                    </div>
                </div>
            </div>
        );
    }

    // ── SUBMITTED / TERMINATED / LOADING screens ──────────────
    const isTerminated = phase === 'terminated';
    if (phase === 'submitted' || phase === 'terminated') {
        return (
            <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0a0f1e' }}>
                <div className="card animate-fade-up" style={{ maxWidth: 480, width: '100%', textAlign: 'center', padding: '3rem 2rem' }}>
                    <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>{isTerminated ? '🚫' : '✅'}</div>
                    <h2 style={{ fontWeight: 700, fontSize: '1.4rem', color: '#f1f5f9', margin: '0 0 0.5rem' }}>
                        {isTerminated ? 'Session Terminated' : 'Exam Submitted!'}
                    </h2>
                    <p style={{ color: '#64748b', marginBottom: '1.5rem', fontSize: '0.875rem' }}>
                        {isTerminated
                            ? 'Your exam session was terminated due to proctoring violations.'
                            : 'Your responses have been recorded. Results will be available soon.'}
                    </p>
                    <button className="btn-primary" onClick={() => navigate('/exams')} style={{ margin: 'auto', justifyContent: 'center' }}>
                        Back to Exams
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0a0f1e' }}>
            <div className="skeleton" style={{ width: 300, height: 200, borderRadius: 12 }} />
        </div>
    );
}
