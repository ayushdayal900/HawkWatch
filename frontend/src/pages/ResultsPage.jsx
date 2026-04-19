import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { examAPI } from '../services/api';
import useAuthStore from '../store/authStore';
import useUIStore from '../store/uiStore';
import Layout from '../components/Layout';
import { CheckCircle, XCircle, Clock, Download, ArrowLeft, FileText, ChevronRight, Loader2 } from 'lucide-react';

export default function ResultsPage() {
    const { attemptId } = useParams();
    const navigate = useNavigate();
    const { isStudent } = useAuthStore();

    const [attempt, setAttempt] = useState(null);
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const { setPageTitle } = useUIStore();

    useEffect(() => {
        setPageTitle('Exam Results');
        const fetchData = async () => {
            setLoading(true);
            setError(null);
            try {
                if (attemptId) {
                    // Try to load from API
                    const { data } = await examAPI.getAttempt(attemptId);
                    const attemptData = data.data || data;
                    setAttempt(attemptData);
                } else if (isStudent) {
                    const { data } = await examAPI.getHistory();
                    setHistory(data.data || []);
                }
            } catch (err) {
                console.error('Failed to load results:', err);
                // Fallback: try to read cached result from sessionStorage
                if (attemptId) {
                    try {
                        const cached = sessionStorage.getItem(`exam_result_${attemptId}`);
                        if (cached) {
                            const parsed = JSON.parse(cached);
                            // Build a minimal attempt object from the cached submission result
                            setAttempt({
                                _id: attemptId,
                                score: parsed.score,
                                percentage: parsed.percentage,
                                passed: parsed.passed,
                                submittedAt: new Date().toISOString(),
                                answers: [],
                                exam: { title: 'Exam', totalMarks: parsed.totalMarks, questions: [] },
                                _fromCache: true,
                            });
                            return;
                        }
                    } catch { /* ignore */ }
                }
                setError(err.error || err.message || 'Could not load results.');
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [attemptId, isStudent]);

    const handleDownloadPDF = () => {
        window.print();
    };

    const safeOptionLabel = (qObj, index) => {
        if (!qObj || !Array.isArray(qObj.options)) return String(index ?? 'N/A');
        const opt = qObj.options[index];
        if (!opt) return String(index ?? 'N/A');
        return typeof opt === 'object' ? (opt.text || opt.label || JSON.stringify(opt)) : String(opt);
    };

    const renderDetails = () => {
        if (!attempt) {
            return (
                <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--n-500)' }}>
                    <FileText size={48} color="var(--n-200)" style={{ marginBottom: '1rem' }} />
                    <h3>Result Not Found</h3>
                    <p>This result could not be found. It may have been removed or you may not have permission to view it.</p>
                    <button onClick={() => navigate('/results')} className="btn btn-secondary" style={{ marginTop: '1.5rem' }}>
                        View All Results
                    </button>
                </div>
            );
        }

        const { exam, score, percentage, passed, answers, submittedAt, _fromCache } = attempt;
        const totalMarks = exam?.totalMarks || 0;

        return (
            <div style={{ width: '100%', maxWidth: 900, margin: '0 auto', fontFamily: 'Inter, sans-serif' }}>
                {/* Navigation bar */}
                <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
                    <button
                        onClick={() => navigate('/results')}
                        style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--n-500)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '0.9rem' }}
                    >
                        <ArrowLeft size={16} /> Back to Results
                    </button>
                    <button onClick={handleDownloadPDF} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Download size={16} /> Download PDF
                    </button>
                </div>

                {/* Score summary card */}
                <div style={{
                    background: '#fff', border: '1px solid var(--border)', borderRadius: 12,
                    padding: '2rem', marginBottom: '2rem',
                    display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '1.5rem'
                }}>
                    <div style={{ flex: '1 1 250px' }}>
                        <h1 style={{ margin: '0 0 0.5rem', color: 'var(--n-900)', fontSize: '1.5rem', fontWeight: 800 }}>
                            {exam?.title || 'Exam'} — Results
                        </h1>
                        <div style={{ color: 'var(--n-500)', display: 'flex', gap: '1rem', alignItems: 'center', fontSize: '0.85rem' }}>
                            {submittedAt && (
                                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                    <Clock size={14} />
                                    Submitted {new Date(submittedAt).toLocaleString()}
                                </span>
                            )}
                        </div>
                        {_fromCache && (
                            <div style={{ marginTop: 8, fontSize: '0.75rem', color: 'var(--warning)', fontWeight: 600 }}>
                                ⚠ Showing cached result — detailed question breakdown unavailable
                            </div>
                        )}
                    </div>

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2rem', alignItems: 'center', textAlign: 'center' }}>
                        <div>
                            <div style={{ fontSize: '2.5rem', fontWeight: 800, color: passed ? 'var(--success)' : 'var(--danger)', lineHeight: 1 }}>
                                {typeof percentage === 'number' ? percentage.toFixed(1) : '0.0'}%
                            </div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--n-500)', fontWeight: 600, marginTop: 4 }}>
                                {score ?? 0} / {totalMarks} pts
                            </div>
                        </div>
                        {passed ? (
                            <div style={{ background: 'var(--success-bg)', color: 'var(--success)', padding: '0.75rem 1.5rem', borderRadius: 8, fontWeight: 700, fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: 8 }}>
                                <CheckCircle /> PASSED
                            </div>
                        ) : (
                            <div style={{ background: 'var(--danger-bg)', color: 'var(--danger)', padding: '0.75rem 1.5rem', borderRadius: 8, fontWeight: 700, fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: 8 }}>
                                <XCircle /> FAILED
                            </div>
                        )}
                    </div>
                </div>

                {/* Question breakdown — only if we have answers */}
                {Array.isArray(answers) && answers.length > 0 && (
                    <>
                        <h2 style={{ fontSize: '1.1rem', color: 'var(--n-900)', borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem', marginBottom: '1.5rem', fontWeight: 700 }}>
                            Question Breakdown
                        </h2>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {answers.map((ans, idx) => {
                                const qId = ans.question?.toString();
                                const qObj = Array.isArray(exam?.questions)
                                    ? exam.questions.find(q => q._id?.toString() === qId || q.id?.toString() === qId)
                                    : null;
                                const qText = qObj?.questionText || qObj?.text || `Question ${idx + 1}`;
                                const correctAnsStr = safeOptionLabel(qObj, qObj?.correctAnswer);
                                const studentAnsStr = ans.answer !== null && ans.answer !== undefined
                                    ? safeOptionLabel(qObj, ans.answer)
                                    : 'Not answered';

                                return (
                                    <div
                                        key={ans._id || idx}
                                        style={{
                                            background: '#fff',
                                            border: `1px solid ${ans.isCorrect ? '#BBF7D0' : '#FECACA'}`,
                                            borderRadius: 8, padding: '1.5rem',
                                            display: 'flex', gap: '1rem'
                                        }}
                                    >
                                        <div style={{ flexShrink: 0, marginTop: 2 }}>
                                            {ans.isCorrect
                                                ? <CheckCircle color="var(--success)" size={24} />
                                                : <XCircle color="var(--danger)" size={24} />
                                            }
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <div
                                                style={{ fontSize: '1rem', color: 'var(--n-900)', fontWeight: 600, marginBottom: '1rem' }}
                                                dangerouslySetInnerHTML={{ __html: qText }}
                                            />
                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', background: 'var(--n-50)', padding: '1rem', borderRadius: 8 }}>
                                                <div>
                                                    <div style={{ fontSize: '0.7rem', color: 'var(--n-500)', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 4 }}>Your Answer</div>
                                                    <div style={{ color: ans.isCorrect ? 'var(--success)' : 'var(--danger)', fontWeight: 600 }}>{studentAnsStr}</div>
                                                </div>
                                                {!ans.isCorrect && (
                                                    <div>
                                                        <div style={{ fontSize: '0.7rem', color: 'var(--n-500)', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 4 }}>Correct Answer</div>
                                                        <div style={{ color: 'var(--success)', fontWeight: 600 }}>{correctAnsStr}</div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <div style={{ textAlign: 'right', fontWeight: 700, color: 'var(--n-500)', fontSize: '0.9rem', flexShrink: 0 }}>
                                            +{ans.pointsAwarded ?? 0} pt
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </>
                )}

                {/* No answers fallback */}
                {(!Array.isArray(answers) || answers.length === 0) && !_fromCache && (
                    <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--n-400)', fontSize: '0.9rem' }}>
                        No detailed answer breakdown available for this attempt.
                    </div>
                )}
            </div>
        );
    };

    const renderList = () => {
        if (!isStudent) {
            return (
                <div className="empty-state" style={{ padding: '4rem 0' }}>
                    <FileText size={48} color="var(--n-200)" />
                    <h3 style={{ marginTop: '1rem', color: 'var(--n-800)', fontSize: '1.25rem' }}>Select an Exam</h3>
                    <p style={{ marginTop: '0.5rem', color: 'var(--n-500)', maxWidth: 400 }}>
                        Navigate to the Exams section to view detailed reports and analytics for specific exam sessions.
                    </p>
                    <Link to="/exams" className="btn btn-primary" style={{ marginTop: '1.5rem' }}>Go to Exams</Link>
                </div>
            );
        }

        if (history.length === 0) {
            return (
                <div className="empty-state" style={{ padding: '4rem 0' }}>
                    <FileText size={48} color="var(--n-200)" />
                    <h3 style={{ marginTop: '1rem', color: 'var(--n-800)', fontSize: '1.25rem' }}>No Results Yet</h3>
                    <p style={{ marginTop: '0.5rem', color: 'var(--n-500)', maxWidth: 400 }}>
                        You haven't completed any exams yet. Once you do, your results will appear here.
                    </p>
                    <Link to="/exams" className="btn btn-primary" style={{ marginTop: '1.5rem' }}>Take an Exam</Link>
                </div>
            );
        }

        return (
            <div style={{ width: '100%', maxWidth: 900, margin: '0 auto' }}>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--n-900)', marginBottom: '1.5rem' }}>Your Exam Results</h2>
                <div style={{ display: 'grid', gap: '1rem' }}>
                    {history.map(item => (
                        <Link
                            key={item._id}
                            to={`/results/${item._id}`}
                            style={{
                                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                flexWrap: 'wrap', gap: '1rem',
                                background: '#fff', padding: '1.25rem 1.5rem', borderRadius: 12,
                                border: '1px solid var(--border)', textDecoration: 'none',
                                transition: 'all 0.2s', boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
                            }}
                            onMouseEnter={e => Object.assign(e.currentTarget.style, { transform: 'translateY(-2px)', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', borderColor: 'var(--brand-200)' })}
                            onMouseLeave={e => Object.assign(e.currentTarget.style, { transform: 'translateY(0)', boxShadow: '0 2px 4px rgba(0,0,0,0.02)', borderColor: 'var(--border)' })}
                        >
                            <div>
                                <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--n-900)', marginBottom: 4 }}>
                                    {item.exam?.title || 'Unknown Exam'}
                                </div>
                                <div style={{ fontSize: '0.8rem', color: 'var(--n-500)', display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <Clock size={12} />
                                    {item.submittedAt ? new Date(item.submittedAt).toLocaleDateString() : 'Date unavailable'}
                                    {' · '}
                                    {item.score ?? 0} / {item.exam?.totalMarks ?? '?'} pts
                                </div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                                <div style={{ textAlign: 'right' }}>
                                    <div style={{ fontSize: '1.25rem', fontWeight: 800, color: item.passed ? 'var(--success)' : 'var(--danger)', lineHeight: 1 }}>
                                        {typeof item.percentage === 'number' ? item.percentage.toFixed(1) : '0.0'}%
                                    </div>
                                    <div style={{ fontSize: '0.7rem', color: 'var(--n-400)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: 4 }}>
                                        {item.passed ? 'Passed' : 'Failed'}
                                    </div>
                                </div>
                                <ChevronRight size={20} color="var(--n-400)" />
                            </div>
                        </Link>
                    ))}
                </div>
            </div>
        );
    };

    return (
        <Layout>
            <div className="animate-fade-in">
                <div style={{ padding: '0 0 2rem' }}>
                    {loading ? (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '6rem 0', gap: '1rem' }}>
                            <Loader2 size={36} className="animate-spin" color="var(--brand-500)" />
                            <p style={{ color: 'var(--n-400)', fontWeight: 600 }}>Loading your results...</p>
                        </div>
                    ) : error ? (
                        <div className="empty-state" style={{ padding: '4rem 0' }}>
                            <XCircle size={48} color="var(--danger)" />
                            <h3 style={{ marginTop: '1rem', color: 'var(--n-800)' }}>Failed to Load Results</h3>
                            <p style={{ color: 'var(--n-500)', maxWidth: 400, marginTop: '0.5rem' }}>{error}</p>
                            <button onClick={() => window.location.reload()} className="btn btn-primary" style={{ marginTop: '1.5rem' }}>
                                Try Again
                            </button>
                        </div>
                    ) : (
                        attemptId ? renderDetails() : renderList()
                    )}
                </div>
            </div>
        </Layout>
    );
}
