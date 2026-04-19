import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { examAPI } from '../services/api';
import useAuthStore from '../store/authStore';
import useUIStore from '../store/uiStore';
import Layout from '../components/Layout';
import { CheckCircle, XCircle, Clock, Download, ArrowLeft, FileText, ChevronRight } from 'lucide-react';

export default function ResultsPage() {
    const { attemptId } = useParams();
    const navigate = useNavigate();
    const { isStudent } = useAuthStore();
    
    const [attempt, setAttempt] = useState(null);
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);

    const { setPageTitle } = useUIStore();

    useEffect(() => {
        setPageTitle('Exam Results');
        const fetchData = async () => {
            setLoading(true);
            try {
                if (attemptId) {
                    const { data } = await examAPI.getAttempt(attemptId);
                    setAttempt(data.data);
                } else if (isStudent) {
                    const { data } = await examAPI.getHistory();
                    setHistory(data.data || []);
                }
            } catch (err) {
                console.error('Failed to load data', err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [attemptId, isStudent]);

    const handleDownloadPDF = () => {
        window.print();
    };

    const renderDetails = () => {
        if (!attempt) return <div style={{ padding: '2rem', textAlign: 'center' }}>Results not found.</div>;

        const { exam, score, percentage, passed, answers } = attempt;

        return (
            <div style={{ width: '100%', maxWidth: 900, margin: '0 auto', fontFamily: 'Inter, sans-serif' }}>
                <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                    <button onClick={() => navigate('/results')} style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--n-500)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '0.9rem' }}>
                        <ArrowLeft size={16} /> Back to Results
                    </button>
                    <button 
                        onClick={handleDownloadPDF} 
                        className="btn btn-primary"
                        style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                    >
                        <Download size={16} /> Download PDF
                    </button>
                </div>

                <div style={{ 
                    background: '#fff', 
                    border: '1px solid var(--border)', 
                    borderRadius: 12, 
                    padding: '2rem', 
                    marginBottom: '2rem', 
                    display: 'flex', 
                    flexWrap: 'wrap',
                    alignItems: 'center', 
                    justifyContent: 'space-between',
                    gap: '1.5rem'
                }}>
                    <div style={{ flex: '1 1 250px' }}>
                        <h1 style={{ margin: '0 0 0.5rem', color: 'var(--n-900)', fontSize: '1.5rem', fontWeight: 800 }}>{exam?.title} - Results</h1>
                        <div style={{ color: 'var(--n-500)', display: 'flex', gap: '1rem', alignItems: 'center', fontSize: '0.85rem' }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Clock size={14} /> Submitted on {new Date(attempt.submittedAt).toLocaleString()}</span>
                        </div>
                    </div>
                    
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2rem', alignItems: 'center', textAlign: 'center' }}>
                        <div>
                            <div style={{ fontSize: '2.5rem', fontWeight: 800, color: passed ? 'var(--success)' : 'var(--danger)', lineHeight: 1 }}>{percentage}%</div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--n-500)', fontWeight: 600, marginTop: 4 }}>{score} / {exam.totalMarks} PTS</div>
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

                <h2 style={{ fontSize: '1.1rem', color: 'var(--n-900)', borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem', marginBottom: '1.5rem', fontWeight: 700 }}>Question Breakdown</h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {answers.map((ans, idx) => {
                        const qObj = exam.questions.find(q => q._id === ans.question.toString());
                        const qText = qObj?.questionText || `Question ID: ${ans.question}`;
                        const correctAnsStr = qObj ? qObj.options[qObj.correctAnswer] : 'N/A';
                        const studentAnsStr = qObj && ans.answer ? qObj.options[ans.answer] : ans.answer || 'Not answered';

                        return (
                            <div key={ans._id} style={{ background: '#fff', border: `1px solid ${ans.isCorrect ? 'var(--success-bg)' : 'var(--danger-bg)'}`, borderRadius: 8, padding: '1.5rem', display: 'flex', gap: '1rem' }}>
                                <div style={{ flexShrink: 0, marginTop: 2 }}>
                                    {ans.isCorrect ? <CheckCircle color="var(--success)" size={24} /> : <XCircle color="var(--danger)" size={24} />}
                                </div>
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontSize: '1rem', color: 'var(--n-900)', fontWeight: 600, marginBottom: '1rem' }} dangerouslySetInnerHTML={{ __html: qText }} />
                                    
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
                                <div style={{ textAlign: 'right', fontWeight: 700, color: 'var(--n-500)', fontSize: '0.9rem' }}>
                                    +{ans.pointsAwarded} PT
                                </div>
                            </div>
                        );
                    })}
                </div>
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
                </div>
            );
        }

        return (
            <div style={{ width: '100%', maxWidth: 900, margin: '0 auto' }}>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--n-900)', marginBottom: '1.5rem' }}>Your Exam Results</h2>
                <div style={{ display: 'grid', gap: '1rem' }}>
                    {history.map(attempt => (
                        <Link 
                            key={attempt._id} 
                            to={`/results/${attempt._id}`}
                            style={{ 
                                display: 'flex', alignItems: 'center', justifyContent: 'space-between', 
                                flexWrap: 'wrap', gap: '1rem',
                                background: '#fff', padding: '1.25rem 1.5rem', borderRadius: 12, 
                                border: '1px solid var(--border)', textDecoration: 'none',
                                transition: 'all 0.2s',
                                boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
                            }}
                            onMouseEnter={e => Object.assign(e.currentTarget.style, { transform: 'translateY(-2px)', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', borderColor: 'var(--brand-200)' })}
                            onMouseLeave={e => Object.assign(e.currentTarget.style, { transform: 'translateY(0)', boxShadow: '0 2px 4px rgba(0,0,0,0.02)', borderColor: 'var(--border)' })}
                        >
                            <div>
                                <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--n-900)', marginBottom: 4 }}>
                                    {attempt.exam?.title || 'Unknown Exam'}
                                </div>
                                <div style={{ fontSize: '0.8rem', color: 'var(--n-500)', display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <Clock size={12} /> {new Date(attempt.submittedAt).toLocaleDateString()}
                                </div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                                <div style={{ textAlign: 'right' }}>
                                    <div style={{ fontSize: '1.25rem', fontWeight: 800, color: attempt.passed ? 'var(--success)' : 'var(--danger)', lineHeight: 1 }}>
                                        {attempt.percentage}%
                                    </div>
                                    <div style={{ fontSize: '0.7rem', color: 'var(--n-400)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: 4 }}>
                                        {attempt.passed ? 'Passed' : 'Failed'}
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
                        <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem 0' }}>
                            <div style={{ width: 32, height: 32, border: '3px solid var(--brand-500)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                        </div>
                    ) : (
                        attemptId ? renderDetails() : renderList()
                    )}
                </div>
            </div>
        </Layout>
    );
}
