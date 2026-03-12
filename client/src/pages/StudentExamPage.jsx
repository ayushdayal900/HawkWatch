import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import api from '../services/api';
import Sidebar from '../components/Sidebar';
import Navbar from '../components/Navbar';
import ProctoringOverlay from '../components/ProctoringOverlay';
import { Clock, ChevronLeft, ChevronRight, Send, AlertTriangle, BookOpen, Timer } from 'lucide-react';
import toast from 'react-hot-toast';

/* ── Countdown hook ─────────────────────────────────────────────── */
function useCountdown(totalSeconds) {
    // Use a ref to hold the true seconds value and derive display from it.
    const [remaining, setRemaining] = useState(0);
    const totalRef = useRef(totalSeconds);

    useEffect(() => {
        totalRef.current = totalSeconds;
    }, [totalSeconds]);

    useEffect(() => {
        if (!totalSeconds) {
            // Use a minimal async update to avoid synchronous setState-in-effect
            const t = setTimeout(() => setRemaining(0), 0);
            return () => clearTimeout(t);
        }

        // Start the interval; on first tick we set the full duration, then count down
        let current = totalSeconds;
        const id = setInterval(() => {
            setRemaining(current);
            current -= 1;
            if (current < 0) clearInterval(id);
        }, 1000);

        return () => clearInterval(id);
    }, [totalSeconds]);

    const mm = String(Math.floor(remaining / 60)).padStart(2, '0');
    const ss = String(remaining % 60).padStart(2, '0');
    return { remaining, display: `${mm}:${ss}` };
}


/* ── QuestionCard ───────────────────────────────────────────────── */
function QuestionCard({ question, currentAnswer, onAnswer }) {
    if (!question) return null;
    return (
        <div className="card" style={{ padding: '2rem', flexGrow: 1 }}>
            <p style={{ fontSize: '1rem', fontWeight: 600, color: '#1E293B', marginBottom: '1.5rem', lineHeight: 1.6 }}>
                {question.questionText || question.stem}
            </p>
            {question.options && question.options.map((opt, i) => {
                const isSelected = currentAnswer === opt.label;
                return (
                    <label key={i} style={{
                        display: 'flex', alignItems: 'center', gap: '0.75rem',
                        padding: '0.85rem 1rem', marginBottom: '0.65rem',
                        border: `2px solid ${isSelected ? '#3B82F6' : '#E2E8F0'}`,
                        borderRadius: 10, cursor: 'pointer',
                        background: isSelected ? '#EFF6FF' : '#fff',
                        color: isSelected ? '#1D4ED8' : '#334155',
                        transition: 'all 0.15s', fontWeight: isSelected ? 600 : 400
                    }}>
                        <input
                            type="radio" name="answer" checked={isSelected}
                            onChange={() => onAnswer(opt.label)}
                            style={{ accentColor: '#3b82f6', width: 16, height: 16 }}
                        />
                        <span style={{ fontWeight: 700, minWidth: 20, color: '#3B82F6' }}>{opt.label}.</span>
                        {opt.text}
                    </label>
                );
            })}
        </div>
    );
}

/* ── Main Component ─────────────────────────────────────────────── */
export default function StudentExamPage() {
    const { id } = useParams();
    const navigate = useNavigate();

    const [exam, setExam] = useState(null);
    const [currentQ, setCurrentQ] = useState(0);
    const [answers, setAnswers] = useState({});
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [started, setStarted] = useState(false);
    const [finished, setFinished] = useState(false);
    const [confirmSubmit, setConfirmSubmit] = useState(false);

    const [searchParams] = useSearchParams();
    const verifiedParam  = searchParams.get('verified') === '1';

    // Guard: only auto-submit once the timer has actually been ticking
    const hasStartedTimer = useRef(false);

    const { remaining, display: timeDisplay } = useCountdown(
        started && exam && !finished ? exam.duration * 60 : 0
    );

    // Load exam
    useEffect(() => {
        api.get(`/exams/${id}`)
            .then(res => {
                setExam(res.data.data);
                // If coming back from verification page, skip intro card
                if (verifiedParam) setStarted(true);
            })
            .catch(() => { toast.error('Exam not found.'); navigate('/exams'); })
            .finally(() => setLoading(false));
    }, [id, navigate, verifiedParam]);

    // Auto-submit on timer expiry
    const handleSubmit = useCallback(async (autoSubmit = false) => {
        if (submitting) return;
        setSubmitting(true);
        try {
            const formattedAnswers = Object.keys(answers).map(qId => ({ questionId: qId, answer: answers[qId] }));
            await api.post('/exams/submit', { examId: id, answers: formattedAnswers });
            setFinished(true);
            toast.success(autoSubmit ? 'Time is up! Exam submitted.' : 'Exam submitted successfully!');
        } catch {
            toast.error('Failed to submit. Please try again.');
        } finally {
            setSubmitting(false);
        }
    }, [submitting, answers, id]);

    // Track whether the timer was ever non-zero (i.e. actually running)
    useEffect(() => {
        if (started && remaining > 0) hasStartedTimer.current = true;
    }, [remaining, started]);

    // Auto-submit ONLY when the running timer reaches 0
    useEffect(() => {
        if (started && hasStartedTimer.current && remaining === 0 && !finished) {
            handleSubmit(true);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [remaining, started, finished]);


    const handleAnswer = (val) => {
        const qId = exam.questions[currentQ]._id;
        setAnswers(prev => ({ ...prev, [qId]: val }));
    };

    /* ── Loading skeleton ───────────────────────────────────────── */
    if (loading) {
        return (
            <div style={{ display: 'flex' }}>
                <Sidebar />
                <main className="main-content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div className="skeleton" style={{ width: 480, height: 250, borderRadius: 12 }} />
                </main>
            </div>
        );
    }

    /* ── Finished screen ────────────────────────────────────────── */
    if (finished) {
        return (
            <div style={{ display: 'flex' }}>
                <Sidebar />
                <main className="main-content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div className="card animate-fade-up" style={{ textAlign: 'center', padding: '3rem', maxWidth: 440 }}>
                        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🎉</div>
                        <h2 style={{ color: '#1E293B', marginBottom: '0.5rem', fontSize: '1.4rem', fontWeight: 700 }}>Exam Submitted!</h2>
                        <p style={{ color: '#64748B', marginBottom: '2rem' }}>Your answers have been recorded successfully.</p>
                        <button className="btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '0.8rem' }} onClick={() => navigate('/dashboard')}>
                            Return to Dashboard
                        </button>
                    </div>
                </main>
            </div>
        );
    }

    /* ── Pre-exam intro card ─────────────────────────────────────── */
    if (!started && exam) {
        return (
            <>
                <div style={{ display: 'flex' }}>
                    <Sidebar />
                    <main className="main-content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <div className="card animate-fade-up" style={{ maxWidth: 500, width: '100%', padding: '2.5rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
                                <div style={{ width: 44, height: 44, borderRadius: 10, background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <BookOpen size={22} color="#3B82F6" />
                                </div>
                                <div>
                                    <h1 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 700, color: '#1E293B' }}>{exam.title}</h1>
                                    <span className="badge badge-blue" style={{ marginTop: 4 }}>Exam</span>
                                </div>
                            </div>

                            {exam.description && (
                                <p style={{ color: '#64748B', marginBottom: '1.5rem', lineHeight: 1.65, fontSize: '0.9rem' }}>{exam.description}</p>
                            )}

                            <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '2rem', padding: '1rem', background: '#F8FAFC', borderRadius: 10, border: '1px solid #E2E8F0' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#334155', fontWeight: 600, fontSize: '0.9rem' }}>
                                    <Timer size={18} color="#3B82F6" /> {exam.duration} minutes
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#334155', fontWeight: 600, fontSize: '0.9rem' }}>
                                    <BookOpen size={18} color="#8B5CF6" /> {exam.questions?.length || 0} questions
                                </div>
                            </div>

                            <div style={{ padding: '0.85rem 1rem', background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 8, marginBottom: '1.75rem', display: 'flex', gap: '0.5rem', alignItems: 'flex-start', fontSize: '0.825rem', color: '#92400E' }}>
                                <AlertTriangle size={15} style={{ marginTop: 1, flexShrink: 0 }} />
                                Once started, the timer will begin and cannot be paused. Verification is required before entering the exam.
                            </div>

                            <button className="btn-primary" onClick={() => navigate(`/exam-verification/${id}`)} style={{ width: '100%', justifyContent: 'center', padding: '0.85rem', fontSize: '1rem' }}>
                                Start Exam
                            </button>
                        </div>
                    </main>
                </div>
            </>
        );
    }

    /* ── Exam interface ─────────────────────────────────────────── */
    const currentQuestion = exam.questions[currentQ];
    const isLowTime = remaining < 300;

    return (
        <div style={{ display: 'flex', minHeight: '100vh', background: '#F8FAFC' }}>
            <Sidebar />
            <div style={{ marginLeft: 240, flex: 1, display: 'flex', flexDirection: 'column' }}>

                {/* Top bar */}
                <div style={{ padding: '0.85rem 2rem', background: '#fff', borderBottom: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, zIndex: 50 }}>
                    <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#1E293B' }}>{exam.title}</h2>

                    {/* Question nav dots */}
                    <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                        {exam.questions.map((_, i) => (
                            <button key={i} onClick={() => setCurrentQ(i)} style={{
                                width: 30, height: 30, borderRadius: '50%', border: 'none',
                                background: i === currentQ ? '#3B82F6' : answers[exam.questions[i]._id] ? '#22C55E' : '#E2E8F0',
                                color: i === currentQ || answers[exam.questions[i]._id] ? '#fff' : '#64748B',
                                cursor: 'pointer', fontWeight: 700, fontSize: '0.75rem',
                                transition: 'all 0.15s',
                            }}>
                                {i + 1}
                            </button>
                        ))}
                    </div>

                    {/* Timer */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700, fontSize: '1.25rem', color: isLowTime ? '#DC2626' : '#1E293B', background: isLowTime ? '#FEF2F2' : '#F8FAFC', padding: '0.4rem 1rem', borderRadius: 8, border: `1px solid ${isLowTime ? '#FECACA' : '#E2E8F0'}` }}>
                        <Clock size={20} color={isLowTime ? '#DC2626' : '#3B82F6'} />
                        {timeDisplay}
                    </div>
                </div>

                {/* Body */}
                <div style={{ flex: 1, display: 'flex', gap: '1.5rem', padding: '1.5rem 2rem' }}>

                    {/* Left: webcam panel */}
                    <div style={{ width: 300, flexShrink: 0 }}>
                        <div className="card" style={{ padding: '1rem', position: 'sticky', top: '5rem' }}>
                            <div style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#64748B', marginBottom: '0.75rem' }}>Live Monitoring</div>
                            <ProctoringOverlay sessionId={null} examId={id} onSessionTerminated={() => handleSubmit(true)} />
                        </div>
                    </div>

                    {/* Right: question + navigation */}
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <p style={{ margin: 0, fontSize: '0.825rem', color: '#64748B', fontWeight: 500 }}>
                            Question <strong style={{ color: '#1E293B' }}>{currentQ + 1}</strong> of {exam.questions.length}
                        </p>

                        <QuestionCard
                            question={currentQuestion}
                            currentAnswer={answers[currentQuestion._id]}
                            onAnswer={handleAnswer}
                        />

                        {/* Bottom nav */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem' }}>
                            <button className="btn-secondary" onClick={() => setCurrentQ(q => Math.max(0, q - 1))} disabled={currentQ === 0}>
                                <ChevronLeft size={16} /> Previous
                            </button>

                            {currentQ < exam.questions.length - 1 ? (
                                <button className="btn-primary" onClick={() => setCurrentQ(q => q + 1)}>
                                    Next <ChevronRight size={16} />
                                </button>
                            ) : (
                                <button
                                    className="btn-primary"
                                    onClick={() => setConfirmSubmit(true)}
                                    disabled={submitting}
                                    style={{ background: '#22C55E' }}
                                >
                                    Submit Exam <Send size={16} />
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* ── Confirm submit modal ──────────────────── */}
                {confirmSubmit && (
                    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <div className="card animate-fade-up" style={{ maxWidth: 420, width: '90%', padding: '2rem', textAlign: 'center' }}>
                            <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>📋</div>
                            <h3 style={{ margin: '0 0 0.5rem', color: '#1E293B', fontWeight: 700 }}>Ready to Submit?</h3>
                            <p style={{ color: '#64748B', marginBottom: '0.25rem', fontSize: '0.9rem' }}>
                                You have answered <strong style={{ color: '#1E293B' }}>{Object.keys(answers).length}</strong> of <strong style={{ color: '#1E293B' }}>{exam.questions.length}</strong> questions.
                            </p>
                            {Object.keys(answers).length < exam.questions.length && (
                                <p style={{ color: '#D97706', fontSize: '0.82rem', marginBottom: '1.25rem', background: '#FFFBEB', padding: '0.5rem 0.75rem', borderRadius: 6 }}>
                                    ⚠️ {exam.questions.length - Object.keys(answers).length} question(s) unanswered.
                                </p>
                            )}
                            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem' }}>
                                <button className="btn-secondary" style={{ flex: 1, justifyContent: 'center' }} onClick={() => setConfirmSubmit(false)}>
                                    Go Back
                                </button>
                                <button
                                    className="btn-primary"
                                    style={{ flex: 1, justifyContent: 'center', background: '#22C55E' }}
                                    disabled={submitting}
                                    onClick={() => { setConfirmSubmit(false); handleSubmit(false); }}
                                >
                                    {submitting ? 'Submitting…' : 'Confirm Submit'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
