import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { proctoringAPI } from '../services/api';
import AlertLogTable from '../components/AlertLogTable';
import { ShieldAlert, Activity, FileText, ArrowLeft, Send, CheckCircle, Download } from 'lucide-react';

export default function ProctoringReportPage() {
    const { sessionId } = useParams();
    const [report, setReport] = useState(null);
    const [loading, setLoading] = useState(true);
    const [notes, setNotes] = useState('');
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        const fetchReport = async () => {
            try {
                const { data } = await proctoringAPI.getReport(sessionId);
                setReport(data.data);
                setNotes(data.data.reviewNotes || '');
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchReport();
    }, [sessionId]);

    const handleReviewSubmit = async () => {
        setSubmitting(true);
        try {
            await proctoringAPI.submitReview(sessionId, { reviewNotes: notes });
            const { data } = await proctoringAPI.getReport(sessionId);
            setReport(data.data);
        } catch (err) {
            console.error(err);
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return <div style={{ padding: '3rem', textAlign: 'center' }}>Loading Aggregated Report...</div>;
    if (!report) return <div style={{ padding: '3rem', textAlign: 'center' }}>Report not found.</div>;

    const { student, exam, flags, riskScore, frameAnalysisSummary: fs, behavioralMetrics: bm, status } = report;
    const rc = riskScore >= 75 ? '#DC2626' : riskScore >= 50 ? '#D97706' : riskScore >= 25 ? '#F59E0B' : '#10B981';

    // SVG Timeline bounds mappings
    const startTime = new Date(report.startedAt).getTime();
    const endTime = report.endedAt ? new Date(report.endedAt).getTime() : Date.now();
    const duration = endTime - startTime;

    const getSevY = (sev) => ({ 'critical': 10, 'high': 35, 'medium': 60, 'low': 85 }[sev] || 85);
    const getSevColor = (sev) => ({ 'critical': '#DC2626', 'high': '#E11D48', 'medium': '#D97706', 'low': '#16A34A' }[sev] || '#64748B');

    return (
        <div style={{ maxWidth: 1000, margin: '0 auto', padding: '2rem', fontFamily: 'Inter, sans-serif' }}>
            <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <Link to="/examiner" style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#64748B', textDecoration: 'none', fontWeight: 600 }}>
                    <ArrowLeft size={16} /> Back to Dashboard
                </Link>
                <div style={{ display: 'flex', gap: '1rem' }}>
                    <button onClick={() => window.print()} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '0.6rem 1.25rem', background: '#fff', border: '1px solid #E2E8F0', color: '#1E293B', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}>
                        <Download size={16} /> Export PDF
                    </button>
                    {status === 'reviewed' && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '0.6rem 1.25rem', background: '#D1FAE5', color: '#065F46', borderRadius: 8, fontWeight: 700 }}>
                            <CheckCircle size={16} /> Reviewed
                        </div>
                    )}
                </div>
            </div>

            {/* Header Identity */}
            <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 12, padding: '2rem', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                    <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#F1F5F9', border: '2px solid #E2E8F0', overflow: 'hidden' }}>
                        {student?.avatar ? (
                            <img src={student.avatar} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94A3B8', fontWeight: 700, fontSize: '1.5rem' }}>
                                {student?.name?.charAt(0).toUpperCase()}
                            </div>
                        )}
                    </div>
                    <div>
                        <h1 style={{ margin: '0 0 0.25rem', color: '#1E293B', fontSize: '1.5rem' }}>{student?.name || 'Unknown User'}</h1>
                        <div style={{ color: '#64748B', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                            <FileText size={14} /> {exam?.title || 'Unknown Exam'}
                        </div>
                        <div style={{ color: '#94A3B8', fontSize: '0.75rem', marginTop: 4 }}>
                            {new Date(report.startedAt).toLocaleString()} — {report.endedAt ? new Date(report.endedAt).toLocaleString() : 'In Progress'}
                        </div>
                    </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.7rem', color: '#64748B', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em' }}>Composite Risk</div>
                    <div style={{ fontSize: '3rem', fontWeight: 800, color: rc, lineHeight: 1 }}>{Math.round(riskScore)}<span style={{ fontSize: '1.25rem', color: '#94A3B8' }}>/100</span></div>
                </div>
            </div>

            {/* SVG Timeline */}
            <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 12, padding: '1.5rem', marginBottom: '1.5rem' }}>
                <h3 style={{ margin: '0 0 1rem', fontSize: '1.1rem', color: '#1E293B', display: 'flex', alignItems: 'center', gap: 6 }}><Activity size={18} /> Flag Timeline</h3>
                
                <div style={{ position: 'relative', height: 120, borderBottom: '2px solid #E2E8F0', borderLeft: '2px solid #E2E8F0' }}>
                    <svg width="100%" height="100%" style={{ overflow: 'visible' }}>
                        {/* Y-axis guidelines */}
                        <line x1="0" y1="10" x2="100%" y2="10" stroke="#F1F5F9" strokeDasharray="4" />
                        <text x="-5" y="14" fontSize="10" fill="#94A3B8" textAnchor="end">Critical</text>
                        
                        <line x1="0" y1="35" x2="100%" y2="35" stroke="#F1F5F9" strokeDasharray="4" />
                        <text x="-5" y="39" fontSize="10" fill="#94A3B8" textAnchor="end">High</text>
                        
                        <line x1="0" y1="60" x2="100%" y2="60" stroke="#F1F5F9" strokeDasharray="4" />
                        <text x="-5" y="64" fontSize="10" fill="#94A3B8" textAnchor="end">Medium</text>
                        
                        <line x1="0" y1="85" x2="100%" y2="85" stroke="#F1F5F9" strokeDasharray="4" />
                        <text x="-5" y="89" fontSize="10" fill="#94A3B8" textAnchor="end">Low</text>

                        {/* Plots */}
                        {flags.map((f, i) => {
                            const pct = Math.max(0, Math.min(100, ((new Date(f.timestamp).getTime() - startTime) / Math.max(1, duration)) * 100));
                            return (
                                <circle 
                                    key={i} 
                                    cx={`${pct}%`} 
                                    cy={getSevY(f.severity)} 
                                    r="4" 
                                    fill={getSevColor(f.severity)} 
                                    stroke="#fff" 
                                    strokeWidth="1"
                                >
                                    <title>{f.type} @ {new Date(f.timestamp).toLocaleTimeString()}</title>
                                </circle>
                            );
                        })}
                    </svg>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: '0.75rem', color: '#94A3B8' }}>
                    <span>Start</span>
                    <span>End</span>
                </div>
            </div>

            {/* Sub-Metrics Container */}
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: '1.5rem', marginBottom: '1.5rem' }}>
                <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 12, padding: '1.5rem' }}>
                    <h3 style={{ margin: '0 0 1rem', fontSize: '1.1rem', color: '#1E293B', display: 'flex', alignItems: 'center', gap: 6 }}><Activity size={18} /> Deepfake & Frame Analytics</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <div>
                            <div style={{ fontSize: '0.7rem', color: '#64748B', fontWeight: 600, textTransform: 'uppercase' }}>Avg Deepfake Score</div>
                            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: (fs?.avgDeepfakeScore || 0) > 0.5 ? '#DC2626' : '#10B981' }}>{((fs?.avgDeepfakeScore || 0) * 100).toFixed(1)}%</div>
                        </div>
                        <div>
                            <div style={{ fontSize: '0.7rem', color: '#64748B', fontWeight: 600, textTransform: 'uppercase' }}>Face Absence</div>
                            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: ((fs?.faceAbsentFrames || 0) / Math.max(fs?.totalFramesAnalyzed || 1, 1)) > 0.2 ? '#DC2626' : '#10B981' }}>
                                {(((fs?.faceAbsentFrames || 0) / Math.max(fs?.totalFramesAnalyzed || 1, 1)) * 100).toFixed(1)}%
                            </div>
                        </div>
                        <div>
                            <div style={{ fontSize: '0.7rem', color: '#64748B', fontWeight: 600, textTransform: 'uppercase' }}>Multiple Faces Detected</div>
                            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: (fs?.multipleFacesFrames || 0) > 0 ? '#DC2626' : '#1E293B' }}>{fs?.multipleFacesFrames || 0}</div>
                        </div>
                    </div>
                </div>

                <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 12, padding: '1.5rem' }}>
                    <h3 style={{ margin: '0 0 1rem', fontSize: '1.1rem', color: '#1E293B', display: 'flex', alignItems: 'center', gap: 6 }}><ShieldAlert size={18} /> Behavioral Biometrics</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <div>
                            <div style={{ fontSize: '0.7rem', color: '#64748B', fontWeight: 600, textTransform: 'uppercase' }}>Typing Anomaly</div>
                            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: (bm?.typingRhythm?.anomalyScore || 0) > 0.5 ? '#DC2626' : '#10B981' }}>{((bm?.typingRhythm?.anomalyScore || 0) * 100).toFixed(1)}%</div>
                        </div>
                        <div>
                            <div style={{ fontSize: '0.7rem', color: '#64748B', fontWeight: 600, textTransform: 'uppercase' }}>Mouse Anomaly</div>
                            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: (bm?.mouseDynamics?.anomalyScore || 0) > 0.5 ? '#DC2626' : '#10B981' }}>{((bm?.mouseDynamics?.anomalyScore || 0) * 100).toFixed(1)}%</div>
                        </div>
                        <div style={{ gridColumn: 'span 2' }}>
                            <div style={{ fontSize: '0.7rem', color: '#64748B', fontWeight: 600, textTransform: 'uppercase' }}>Composite Behavior Shift</div>
                            <div style={{ width: '100%', height: 6, background: '#F1F5F9', borderRadius: 3, marginTop: 4 }}>
                                <div style={{ height: '100%', background: (bm?.overallAnomalyScore || 0) > 0.5 ? '#DC2626' : '#10B981', borderRadius: 3, width: `${(bm?.overallAnomalyScore || 0) * 100}%` }} />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Alert List */}
            <div style={{ marginBottom: '1.5rem', background: '#fff', borderRadius: 12, padding: '1.5rem', border: '1px solid #E2E8F0' }}>
                <AlertLogTable flags={flags} />
            </div>

            {/* Review Flow */}
            <div className="no-print" style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 12, padding: '1.5rem' }}>
                <h3 style={{ margin: '0 0 1rem', fontSize: '1.1rem', color: '#1E293B' }}>Examiner Review</h3>
                <textarea 
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Enter review notes about this student's proctoring session..."
                    rows={4}
                    style={{ width: '100%', padding: '0.75rem', borderRadius: 8, border: '1px solid #CBD5E1', fontFamily: 'inherit', resize: 'vertical', marginBottom: '1rem' }}
                />
                <button 
                    onClick={handleReviewSubmit}
                    disabled={submitting}
                    style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '0.6rem 1.25rem', background: '#3B82F6', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}
                >
                    <Send size={16} /> {submitting ? 'Saving...' : 'Submit Review'}
                </button>
            </div>

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
