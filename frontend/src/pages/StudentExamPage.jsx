import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api, { proctoringAPI } from '../services/api';
import ProctoringOverlay from '../components/ProctoringOverlay';
import { AlertTriangle, RefreshCw, Loader2, ShieldAlert } from 'lucide-react';
import useNotificationStore from '../store/notificationStore';
import toast from 'react-hot-toast';

import useExamStore from '../store/examStore';
import ExamHeader from '../components/exam/ExamHeader';
import ExamNavigation from '../components/exam/ExamNavigation';
import ExamQuestion from '../components/exam/ExamQuestion';
import ExamFooter from '../components/exam/ExamFooter';

export default function StudentExamPage() {
    const { id } = useParams();
    const navigate = useNavigate();

    const {
        currentExam, examAttempt, questions, answers, timeRemaining,
        setCurrentExam, setExamAttempt, setAnswer, setTimeRemaining, clearExam
    } = useExamStore();

    const [procSessionId, setProcSessionId] = useState(null);
    const [currentQ, setCurrentQ] = useState(0);
    const [loading, setLoading] = useState(true);
    const [pageError, setPageError] = useState(null);
    const [submitting, setSubmitting] = useState(false);
    const [terminatingReason, setTerminatingReason] = useState(null);

    // Initial session hook
    useEffect(() => {
        let mounted = true;
        const init = async () => {
            try {
                // 1. Fetch exam configuration
                const { data: examData } = await api.get(`/exams/${id}`);
                if (!mounted) return;
                const examObj = examData.data || examData;
                setCurrentExam(examObj);

                // 2. Recover (or start) session.
                let sessionDetails;
                try {
                    const { data: sessData } = await api.get(`/exams/session/${id}`);
                    sessionDetails = sessData.data || sessData;
                } catch (getErr) {
                    // Check direct status property (from standardized API service)
                    const status = getErr.status || getErr.response?.status;
                    
                    if (status === 404 || status === 400) {
                        const { data: startData } = await api.post('/exams/start', { examId: id });
                        sessionDetails = startData.data || startData;
                    } else if (status === 403) {
                        navigate(`/exam-verification/${id}`);
                        return;
                    } else {
                        throw getErr;
                    }
                }

                if (!mounted) return;
                setExamAttempt(sessionDetails);

                // Recover prior answers
                if (sessionDetails?.answers?.length > 0) {
                    sessionDetails.answers.forEach(a => setAnswer(a.questionId, a.answer));
                }

                // Timer sync
                const passedTime = Math.floor(
                    (Date.now() - new Date(sessionDetails.startTimestamp).getTime()) / 1000
                );
                const remaining = (examObj.duration * 60) - passedTime;
                setTimeRemaining(remaining > 0 ? remaining : 0);

                // 3. Start Proctoring — recover existing session if 409
                try {
                    const { data: procData } = await proctoringAPI.startSession({ 
                        examId: id, 
                        attemptId: sessionDetails._id || sessionDetails.id 
                    });
                    if (mounted) setProcSessionId(procData?.data?._id || procData?._id || null);
                } catch (procErr) {
                    const status = procErr.status || procErr.response?.status;
                    if (status === 409) {
                        // Session already exists — try to get sessionId from error response
                        const sid = procErr.data?.sessionId 
                            || procErr.response?.data?.sessionId;
                        if (sid && mounted) {
                            setProcSessionId(sid);
                        } else {
                            // Fallback: fetch all active sessions and find ours
                            try {
                                const existingSession = await proctoringAPI.getSessionForExam(id);
                                if (existingSession?._id && mounted) {
                                    setProcSessionId(existingSession._id);
                                }
                            } catch { /* non-fatal — proctoring unavailable */ }
                        }
                    }
                }

            } catch (err) {
                if (mounted) {
                    setPageError(
                        err.response?.data?.message || err.message || 'Could not load exam.'
                    );
                }
            } finally {
                if (mounted) setLoading(false);
            }
        };
        init();
        return () => { 
            mounted = false; 
            clearExam(); 
        };
    }, [id, navigate, setCurrentExam, setExamAttempt, setAnswer, setTimeRemaining, clearExam]);

    // Timer Loop
    useEffect(() => {
        if (!examAttempt || timeRemaining === null || timeRemaining <= 0 || loading) return;
        const interval = setInterval(() => {
            setTimeRemaining(timeRemaining - 1);
            if (timeRemaining <= 1) {
                clearInterval(interval);
                autoSubmit('Time Expired');
            }
        }, 1000);
        return () => clearInterval(interval);
    }, [examAttempt, timeRemaining, loading, setTimeRemaining]);

    const formatTime = (secs) => {
        const h = Math.floor(secs / 3600);
        const m = Math.floor((secs % 3600) / 60);
        const s = secs % 60;
        return `${h > 0 ? h + ':' : ''}${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    // Auto-save logic
    const handleAnswer = useCallback(async (questionId, ans) => {
        setAnswer(questionId, ans);
        try {
            await api.post(`/exams/${id}/save-answer`, { questionId, answer: ans });
        } catch (e) {
            console.error('Failed to auto-save answer:', e);
        }
    }, [id, setAnswer]);

    const autoSubmit = useCallback(async (reason = null) => {
        if (submitting) return;
        setSubmitting(true);
        if (reason) setTerminatingReason(reason);

        try {
            if (procSessionId) {
                await proctoringAPI.endSession(procSessionId).catch(() => {});
            }
            const currentAnswers = useExamStore.getState().answers;
            const { data } = await api.post(`/exams/${id}/submit`, {
                examId: id,
                answers: Object.entries(currentAnswers)
            });
            
            const result = data.data || data;
            const attemptId = result.attemptId;

            // Cache result in sessionStorage as fallback for ResultsPage
            if (attemptId) {
                try {
                    sessionStorage.setItem(`exam_result_${attemptId}`, JSON.stringify(result));
                } catch { /* non-fatal */ }
            }

            useNotificationStore.getState().addNotification(
                `Exam Completed: Your attempt for "${currentExam?.title}" has been submitted successfully.`
            );

            // Navigate to the correct results route
            navigate(`/results/${attemptId}`, { replace: true });
        } catch (e) {
            setSubmitting(false);
            setTerminatingReason(null);
            toast.error(e.error || e.message || 'Submission failed. Please try again.');
        }
    }, [id, navigate, procSessionId, submitting, currentExam]);

    if (loading) return (
        <div className="empty-state" style={{ height: '100vh', background: 'var(--bg)' }}>
            <Loader2 size={40} className="animate-spin" color="var(--brand-500)" />
            <h3 style={{ marginTop: '1rem' }}>Initializing Secure Container</h3>
            <p>Loading your exam environment and activating AI proctoring...</p>
        </div>
    );

    if (pageError) return (
        <div className="empty-state" style={{ height: '100vh', background: 'var(--bg)', padding: '2rem' }}>
            <div style={{ background: 'var(--danger-bg)', padding: '1.5rem', borderRadius: '50%', marginBottom: '1rem' }}>
                <ShieldAlert size={40} color="var(--danger)" />
            </div>
            <h3>Critical Access Error</h3>
            <p style={{ maxWidth: 420 }}>{pageError}</p>
            <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                <button onClick={() => window.location.reload()} className="btn btn-primary">
                    <RefreshCw size={16} /> Retry Connection
                </button>
                <button onClick={() => navigate('/exams')} className="btn btn-secondary">
                    Back to Dashboard
                </button>
            </div>
        </div>
    );

    if (!currentExam) return (
        <div className="empty-state" style={{ height: '100vh' }}>
            <p>Exam configuration unavailable.</p>
        </div>
    );

    const activeQ = questions[currentQ];

    return (
        <div className="exam-shell" style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
            {procSessionId && (
                <ProctoringOverlay 
                    sessionId={procSessionId} 
                    examId={id} 
                    onSessionTerminated={(reason) => autoSubmit(reason || 'Proctoring Intervention')}
                />
            )}

            <div className="exam-shell-inner" style={{ flex: 1, display: 'flex', overflow: 'hidden', position: 'relative' }}>
                <ExamNavigation 
                    examTitle={currentExam.title} 
                    questions={questions} 
                    currentQ={currentQ} 
                    answers={answers} 
                    setCurrentQ={setCurrentQ} 
                />

                <main className="exam-main" style={{ flex: 1, overflowY: 'auto', position: 'relative', display: 'flex', flexDirection: 'column' }}>
                {terminatingReason && (
                    <div className="modal-overlay" style={{ zIndex: 10000 }}>
                        <div className="modal-panel" style={{ textAlign: 'center', padding: '3rem' }}>
                            <div style={{ background: 'var(--danger-bg)', width: 64, height: 64, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
                                <AlertTriangle size={32} color="var(--danger)" />
                            </div>
                            <h2 style={{ color: 'var(--n-900)', fontWeight: 800, letterSpacing: '-0.02em' }}>Session Terminating</h2>
                            <p style={{ color: 'var(--n-500)', marginTop: '0.5rem' }}>{terminatingReason}</p>
                            
                            {!submitting ? (
                                <div style={{ marginTop: '2rem' }}>
                                    <button className="btn btn-primary" onClick={() => autoSubmit(terminatingReason)}>
                                        Retry Submission
                                    </button>
                                </div>
                            ) : (
                                <>
                                    <div className="skeleton" style={{ height: 4, marginTop: '2rem', width: '100%' }} />
                                    <p style={{ fontSize: '0.75rem', color: 'var(--n-400)', marginTop: '1rem' }}>Auto-submitting your progress...</p>
                                </>
                            )}
                        </div>
                    </div>
                )}
                
                <ExamHeader 
                    currentQ={currentQ} 
                    totalQ={questions.length} 
                    timeLeft={timeRemaining} 
                    formatTime={formatTime} 
                />

                <div className="exam-content">
                    <ExamQuestion 
                        activeQ={activeQ} 
                        answers={answers} 
                        handleAnswer={handleAnswer}
                        questionIndex={currentQ}
                        totalQuestions={questions.length}
                    />
                </div>

                <ExamFooter 
                    currentQ={currentQ} 
                    totalQ={questions.length} 
                    questions={questions}
                    answers={answers}
                    setCurrentQ={setCurrentQ} 
                    submitting={submitting} 
                    autoSubmit={autoSubmit} 
                />
                </main>
            </div>
        </div>
    );
}
