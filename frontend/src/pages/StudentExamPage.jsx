import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api, { proctoringAPI } from '../services/api';
import ProctoringOverlay from '../components/ProctoringOverlay';
import { Clock, ChevronLeft, ChevronRight, Send, AlertTriangle } from 'lucide-react';

export default function StudentExamPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    
    const [exam, setExam] = useState(null);
    const [examSession, setExamSession] = useState(null);
    const [procSessionId, setProcSessionId] = useState(null);
    
    const [answers, setAnswers] = useState({});
    const [currentQ, setCurrentQ] = useState(0);
    const [timeLeft, setTimeLeft] = useState(0);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    // Initial session hook
    useEffect(() => {
        let mounted = true;
        const init = async () => {
            try {
                // 1. Fetch exam configuration
                const { data: examData } = await api.get(`/exams/${id}`);
                setExam(examData.data);
                
                // 2. Start or Recover Session
                let sessionDetails;
                try {
                    const { data } = await api.post('/exams/start', { examId: id });
                    sessionDetails = data.data;
                } catch (e) {
                    if (e.response?.status === 403) {
                        return navigate(`/student-exam/${id}/verify`);
                    }
                    throw e;
                }
                
                setExamSession(sessionDetails);

                // Recover prior answers
                if (sessionDetails.answers && sessionDetails.answers.length > 0) {
                    const recovered = {};
                    sessionDetails.answers.forEach(a => recovered[a.questionId] = a.answer);
                    setAnswers(recovered);
                }

                // Timer sync
                const passedTime = Math.floor((Date.now() - new Date(sessionDetails.startTimestamp).getTime()) / 1000);
                const remaining = (examData.data.duration * 60) - passedTime;
                setTimeLeft(remaining > 0 ? remaining : 0);

                // 3. Start Proctoring 
                const { data: procData } = await proctoringAPI.startSession({ examId: id });
                if (mounted) setProcSessionId(procData.data._id);
                
            } catch (err) {
                console.error(err);
                if (err.response?.status === 409) {
                    // Proctoring session might already be active.
                    setProcSessionId(err.response.data.sessionId); 
                }
            } finally {
                if (mounted) setLoading(false);
            }
        };
        init();
        return () => { mounted = false; };
    }, [id, navigate]);

    // Timer Loop
    useEffect(() => {
        if (!examSession || timeLeft <= 0 || loading) return;
        const interval = setInterval(() => {
            setTimeLeft(t => {
                if (t <= 1) {
                    clearInterval(interval);
                    autoSubmit();
                    return 0;
                }
                return t - 1;
            });
        }, 1000);
        return () => clearInterval(interval);
    }, [examSession, timeLeft, loading]);

    // Formatting
    const formatTime = (secs) => {
        const h = Math.floor(secs / 3600);
        const m = Math.floor((secs % 3600) / 60);
        const s = secs % 60;
        return `${h > 0 ? h + ':' : ''}${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    // Auto-save logic
    const handleAnswer = async (questionId, ans) => {
        setAnswers(prev => ({ ...prev, [questionId]: ans }));
        try {
            await api.post(`/exams/${id}/save-answer`, { questionId, answer: ans });
        } catch (e) {
            console.error('Failed to auto-save answer:', e);
        }
    };

    // Submit procedure
    const [terminatingReason, setTerminatingReason] = useState(null);
    const autoSubmit = async (reason = null) => {
        if (submitting) return;
        setSubmitting(true);
        if (reason) setTerminatingReason(reason);

        try {
            // End proctoring explicitly
            if (procSessionId) {
                await proctoringAPI.endSession(procSessionId).catch(() => {});
            }
            // Submit exam securely
            const { data } = await api.post('/exams/submit', { examId: id, answers: Object.entries(answers) });
            
            navigate(`/student/results/${data.data.attemptId}`, { replace: true });
        } catch (e) {
            setSubmitting(false);
        }
    };

    if (loading) return <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Loading Secure Exam Container...</div>;
    if (!exam) return <div>Exam not available.</div>;

    const questions = exam.questions || [];
    const activeQ = questions[currentQ];

    return (
        <div style={{ display: 'flex', height: '100vh', background: '#F8FAFC', fontFamily: 'Inter, sans-serif' }}>
            {/* Proctoring Viewport Block */}
            {procSessionId && (
                <ProctoringOverlay 
                    sessionId={procSessionId} 
                    examId={id} 
                    onSessionTerminated={(reason) => autoSubmit(reason || 'Proctoring Intervention')}
                />
            )}

            {/* Left Nav Pane */}
            <div style={{ width: 260, flexShrink: 0, background: '#fff', borderRight: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column' }}>
                <div style={{ padding: '1rem', borderBottom: '1px solid #E2E8F0', background: '#0F172A', color: '#fff' }}>
                    <h2 style={{ fontSize: '1rem', fontWeight: 700, margin: '0 0 0.25rem' }}>HawkWatch Exam</h2>
                    <p style={{ margin: 0, fontSize: '0.75rem', opacity: 0.8 }}>{exam.title}</p>
                </div>
                <div style={{ padding: '1rem', flex: 1, overflowY: 'auto' }}>
                    <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748B', marginBottom: '0.75rem' }}>QUESTIONS MAP</div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                        {questions.map((q, idx) => {
                            const isAns = answers[q._id] !== undefined;
                            const isCur = currentQ === idx;
                            return (
                                <button
                                    key={q._id}
                                    onClick={() => setCurrentQ(idx)}
                                    style={{
                                        aspectRatio: '1', borderRadius: 6, fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer',
                                        border: isCur ? '2px solid #3B82F6' : '1px solid transparent',
                                        background: isAns ? '#10B981' : '#E2E8F0',
                                        color: isAns ? '#fff' : '#475569',
                                        transition: 'all 0.2s'
                                    }}
                                >
                                    {idx + 1}
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Center Main Space */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative' }}>
                {terminatingReason && (
                    <div style={{ position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.9)', zIndex: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                        <AlertTriangle size={48} color="#DC2626" />
                        <h2 style={{ color: '#1E293B', marginTop: 10 }}>Exam Terminating</h2>
                        <p style={{ color: '#64748B' }}>{terminatingReason}</p>
                    </div>
                )}
                
                {/* Header bar */}
                <div style={{ padding: '1rem 2rem', background: '#fff', borderBottom: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 600, color: '#1E293B' }}>Question {currentQ + 1} of {questions.length}</h3>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: timeLeft < 300 ? '#FEF2F2' : '#F1F5F9', color: timeLeft < 300 ? '#DC2626' : '#334155', padding: '0.5rem 1rem', borderRadius: 99, fontWeight: 700, fontSize: '1.1rem' }}>
                        <Clock size={18} /> {formatTime(timeLeft)}
                    </div>
                </div>

                {/* Question area */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '2rem' }}>
                    {activeQ ? (
                        <div style={{ background: '#fff', borderRadius: 12, padding: '2rem', border: '1px solid #E2E8F0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', maxWidth: 800, margin: '0 auto' }}>
                            <div style={{ fontSize: '1.1rem', color: '#1E293B', marginBottom: '2rem', lineHeight: 1.6 }} dangerouslySetInnerHTML={{ __html: activeQ.questionText }} />
                            
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                {activeQ.options?.map((opt, i) => (
                                    <label key={i} style={{ 
                                        display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', borderRadius: 8, cursor: 'pointer', border: '1px solid',
                                        borderColor: answers[activeQ._id] === String(i) ? '#3B82F6' : '#E2E8F0',
                                        background: answers[activeQ._id] === String(i) ? '#EFF6FF' : '#fff',
                                        transition: 'all 0.2s'
                                    }}>
                                        <input 
                                            type="radio" 
                                            name={activeQ._id} 
                                            checked={answers[activeQ._id] === String(i)} 
                                            onChange={() => handleAnswer(activeQ._id, String(i))}
                                            style={{ width: 18, height: 18, cursor: 'pointer' }}
                                        />
                                        <span style={{ fontSize: '1rem', color: '#334155' }}>{opt}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div>No matching question topology found.</div>
                    )}
                </div>

                {/* Footer Controls */}
                <div style={{ padding: '1rem 2rem', background: '#fff', borderTop: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between' }}>
                    <button 
                        onClick={() => setCurrentQ(q => Math.max(0, q - 1))} 
                        disabled={currentQ === 0}
                        style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '0.6rem 1.25rem', borderRadius: 8, border: '1px solid #E2E8F0', background: '#fff', color: currentQ === 0 ? '#94A3B8' : '#334155', cursor: currentQ === 0 ? 'not-allowed' : 'pointer', fontWeight: 600 }}
                    >
                        <ChevronLeft size={16} /> Previous
                    </button>
                    
                    {currentQ === questions.length - 1 ? (
                        <button 
                            onClick={async () => {
                                if (window.confirm('Are you sure you want to submit your exam right now? You cannot undo this.')) {
                                    autoSubmit('Student finalized attempt');
                                }
                            }}
                            disabled={submitting}
                            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '0.6rem 1.5rem', borderRadius: 8, border: 'none', background: '#10B981', color: '#fff', cursor: 'pointer', fontWeight: 700 }}
                        >
                            {submitting ? 'Submitting...' : <><Send size={16} /> Submit Exam</>}
                        </button>
                    ) : (
                        <button 
                            onClick={() => setCurrentQ(q => Math.min(questions.length - 1, q + 1))}
                            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '0.6rem 1.25rem', borderRadius: 8, border: 'none', background: '#3B82F6', color: '#fff', cursor: 'pointer', fontWeight: 600 }}
                        >
                            Next <ChevronRight size={16} />
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
