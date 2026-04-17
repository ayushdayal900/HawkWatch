import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { examAPI } from '../services/api';
import { CheckCircle, XCircle, Clock, Download, ArrowLeft } from 'lucide-react';

export default function ResultsPage() {
    const { attemptId } = useParams();
    const [attempt, setAttempt] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchAttempt = async () => {
            try {
                const { data } = await examAPI.getAttempt(attemptId);
                setAttempt(data.data);
            } catch (err) {
                console.error('Failed to load attempt', err);
            } finally {
                setLoading(false);
            }
        };
        fetchAttempt();
    }, [attemptId]);

    if (loading) return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading Results...</div>;
    if (!attempt) return <div style={{ padding: '2rem', textAlign: 'center' }}>Results not found.</div>;

    const { exam, score, percentage, passed, answers } = attempt;

    const handleDownloadPDF = () => {
        window.print();
    };

    return (
        <div style={{ maxWidth: 900, margin: '0 auto', padding: '2rem', fontFamily: 'Inter, sans-serif' }}>
            
            {/* Header / Actions */}
            <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <Link to="/student" style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#64748B', textDecoration: 'none', fontWeight: 600 }}>
                    <ArrowLeft size={16} /> Back to Dashboard
                </Link>
                <button 
                    onClick={handleDownloadPDF} 
                    style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '0.6rem 1.25rem', background: '#3B82F6', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}
                >
                    <Download size={16} /> Download PDF
                </button>
            </div>

            {/* Results Overview Card */}
            <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 12, padding: '2rem', marginBottom: '2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                <div>
                    <h1 style={{ margin: '0 0 0.5rem', color: '#1E293B', fontSize: '1.75rem' }}>{exam?.title} - Results</h1>
                    <div style={{ color: '#64748B', display: 'flex', gap: '1rem', alignItems: 'center' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Clock size={14} /> Submitted on {new Date(attempt.submittedAt).toLocaleString()}</span>
                    </div>
                </div>
                
                <div style={{ display: 'flex', gap: '2rem', alignItems: 'center', textAlign: 'center' }}>
                    <div>
                        <div style={{ fontSize: '2.5rem', fontWeight: 800, color: passed ? '#10B981' : '#EF4444', lineHeight: 1 }}>{percentage}%</div>
                        <div style={{ fontSize: '0.8rem', color: '#64748B', fontWeight: 600, marginTop: 4 }}>{score} / {exam.totalMarks} PTS</div>
                    </div>
                    {passed ? (
                        <div style={{ background: '#D1FAE5', color: '#065F46', padding: '0.75rem 1.5rem', borderRadius: 8, fontWeight: 700, fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: 8 }}>
                            <CheckCircle /> PASSED
                        </div>
                    ) : (
                        <div style={{ background: '#FEE2E2', color: '#991B1B', padding: '0.75rem 1.5rem', borderRadius: 8, fontWeight: 700, fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: 8 }}>
                            <XCircle /> FAILED
                        </div>
                    )}
                </div>
            </div>

            {/* Breakdown List */}
            <h2 style={{ fontSize: '1.25rem', color: '#1E293B', borderBottom: '2px solid #E2E8F0', paddingBottom: '0.5rem', marginBottom: '1.5rem' }}>Question Breakdown</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {answers.map((ans, idx) => {
                    const qObj = exam.questions.find(q => q._id === ans.question.toString());
                    const qText = qObj?.questionText || `Question ID: ${ans.question}`;
                    const correctAnsStr = qObj ? qObj.options[qObj.correctAnswer] : 'N/A';
                    const studentAnsStr = qObj && ans.answer ? qObj.options[ans.answer] : ans.answer || 'Not answered';

                    return (
                        <div key={ans._id} style={{ background: '#fff', border: `1px solid ${ans.isCorrect ? '#A7F3D0' : '#FECACA'}`, borderRadius: 8, padding: '1.5rem', display: 'flex', gap: '1rem' }}>
                            <div style={{ flexShrink: 0, marginTop: 2 }}>
                                {ans.isCorrect ? <CheckCircle color="#10B981" size={24} /> : <XCircle color="#EF4444" size={24} />}
                            </div>
                            <div style={{ flex: 1 }}>
                                <div style={{ fontSize: '1.05rem', color: '#1E293B', fontWeight: 600, marginBottom: '1rem' }} dangerouslySetInnerHTML={{ __html: qText }} />
                                
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', background: '#F8FAFC', padding: '1rem', borderRadius: 8 }}>
                                    <div>
                                        <div style={{ fontSize: '0.7rem', color: '#64748B', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 4 }}>Your Answer</div>
                                        <div style={{ color: ans.isCorrect ? '#10B981' : '#EF4444', fontWeight: 600 }}>{studentAnsStr}</div>
                                    </div>
                                    {!ans.isCorrect && (
                                        <div>
                                            <div style={{ fontSize: '0.7rem', color: '#64748B', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 4 }}>Correct Answer</div>
                                            <div style={{ color: '#10B981', fontWeight: 600 }}>{correctAnsStr}</div>
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div style={{ textAlign: 'right', fontWeight: 700, color: '#64748B', fontSize: '0.9rem' }}>
                                +{ans.pointsAwarded} PT
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Print Styles */}
            <style>{`
                @media print {
                    body { background: #fff; }
                    .no-print { display: none !important; }
                    * { box-shadow: none !important; }
                }
            `}</style>
        </div>
    );
}
