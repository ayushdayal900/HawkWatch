import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import StudentMonitorCard from '../components/StudentMonitorCard';
import AlertLogTable from '../components/AlertLogTable';
import useAuthStore from '../store/authStore';
import useUIStore from '../store/uiStore';
import Layout from '../components/Layout';
import useProctoringStore from '../store/proctoringStore';
import { socketService } from '../services/socket';
import { examAPI } from '../services/api';
import {
    Activity, Users, ShieldAlert, TrendingUp,
    Search, Filter, RefreshCw, Eye, Terminal, Zap,
    Shield, ArrowUpRight
} from 'lucide-react';

const FILTERS = [
    { key: 'all', label: 'All Active' },
    { key: 'critical', label: 'Critical' },
    { key: 'high', label: 'High Risk' },
    { key: 'medium', label: 'Medium' },
    { key: 'low', label: 'Secure' },
];

function riskLevel(score) {
    if (score >= 75) return 'critical';
    if (score >= 50) return 'high';
    if (score >= 25) return 'medium';
    return 'low';
}

export default function MonitoringPage() {
    const { token } = useAuthStore();
    const { connectSocket, disconnectSocket, activeSessions, fetchActiveSessions, socket } = useProctoringStore();
    const navigate = useNavigate();

    const [liveEvents, setLiveEvents] = useState([]);
    const [videoStreams, setVideoStreams] = useState({});
    const [exams, setExams] = useState([]);
    const [filter, setFilter] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [refreshing, setRefreshing] = useState(false);
    const [selectedExam, setSelectedExam] = useState(null);
    const { setPageTitle } = useUIStore();

    useEffect(() => {
        setPageTitle('Mission Control');
        examAPI.getAll().then(r => {
            const list = r.data.data || [];
            setExams(list);
            if (list.length > 0) setSelectedExam(list[0]._id);
        }).catch(() => { });
    }, []);

    useEffect(() => {
        if (token && selectedExam) {
            connectSocket(token, 'examiner', selectedExam);
            socketService.connect(token);
            // Join the exam-wide proctor room on BOTH sockets so we catch video from either
            socketService.joinSession(selectedExam, 'examiner');
            socketService.joinProctorRoom(selectedExam);
        }
        return () => {
            disconnectSocket();
            socketService.disconnect();
        };
    }, [token, selectedExam, connectSocket, disconnectSocket]);

    useEffect(() => {
        if (!socket) return;
        const handleEvent = d => {
            // Unify event format for live feed
            const eventPayload = d.event || d.data || d.flagData || d;
            setLiveEvents(prev => [eventPayload, ...prev].slice(0, 200));
        };

        const handleVideoStream = (data) => {
            if (data?.sessionId && data?.frame) {
                setVideoStreams(prev => ({
                    ...prev,
                    [data.sessionId]: data.frame
                }));
            }
        };
        
        socket.on('student-event', handleEvent);
        socket.on('flag-event', handleEvent);
        socket.on('video_stream', handleVideoStream);
        socketService.onCheatingDetected(handleEvent);
        socketService.onSessionUpdate(handleEvent);
        socketService.onVideoStream(handleVideoStream); // also listen on socketService socket
        
        return () => {
            socket.off('student-event', handleEvent);
            socket.off('flag-event', handleEvent);
            socket.off('video_stream', handleVideoStream);
            socketService.offCheatingDetected(handleEvent);
            socketService.offSessionUpdate(handleEvent);
            socketService.offVideoStream(handleVideoStream);
        };
    }, [socket]);

    useEffect(() => {
        if (!selectedExam) return;
        fetchActiveSessions(selectedExam);
        const id = setInterval(() => fetchActiveSessions(selectedExam), 15_000);
        return () => clearInterval(id);
    }, [fetchActiveSessions, selectedExam]);

    const handleRefresh = async () => {
        setRefreshing(true);
        await fetchActiveSessions().catch(() => { });
        setTimeout(() => setRefreshing(false), 800);
    };

    const sessionData = useMemo(() => {
        return activeSessions.map(s => {
            const sessionEvents = liveEvents.filter(e =>
                e?.sessionId === s._id || (e?.studentId?._id || e?.studentId) === (s.student?._id || s.student)
            );
            const flagCount = sessionEvents.length;
            const riskScore = Math.min(100, flagCount * 8 + (s.riskScore || 0));
            const lastFlag = sessionEvents[0] || null;
            return { ...s, flagCount, riskScore, lastFlag, student: s.student || s.studentId };
        });
    }, [activeSessions, liveEvents]);

    const visibleSessions = useMemo(() => {
        return sessionData
            .filter(s => filter === 'all' || riskLevel(s.riskScore) === filter)
            .filter(s => {
                if (!searchTerm) return true;
                const name = (s.student?.name || '').toLowerCase();
                return name.includes(searchTerm.toLowerCase());
            })
            .sort((a, b) => b.riskScore - a.riskScore);
    }, [sessionData, filter, searchTerm]);

    const stats = useMemo(() => ({
        total: sessionData.length,
        critical: sessionData.filter(s => s.riskScore >= 75).length,
        flagged: liveEvents.length,
        avgRisk: sessionData.length ? Math.round(sessionData.reduce((a, s) => a + s.riskScore, 0) / sessionData.length) : 0,
    }), [sessionData, liveEvents]);

    return (
        <Layout>
            <div className="animate-fade-in">
                {/* Metrics */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem', marginBottom: '2rem' }}>
                    {[
                        { icon: Users, label: 'Active Candidates', value: stats.total, color: 'var(--brand-500)' },
                        { icon: ShieldAlert, label: 'Critical Incidents', value: stats.critical, color: 'var(--danger)' },
                        { icon: Activity, label: 'Real-time Flags', value: stats.flagged, color: 'var(--warning)' },
                        { icon: TrendingUp, label: 'Avg System Risk', value: `${stats.avgRisk}%`, color: 'var(--success)' },
                    ].map((s) => (
                        <div key={s.label} className="card" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            <div style={{ width: 44, height: 44, borderRadius: 12, background: 'var(--n-50)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <s.icon size={22} color={s.color} />
                            </div>
                            <div>
                                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--n-400)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{s.label}</div>
                                <div style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--n-900)', letterSpacing: '-0.02em' }}>{s.value}</div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Command Bar */}
                <div className="monitor-command-bar" style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem', background: '#fff', padding: '0.75rem', borderRadius: 12, border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)', flexWrap: 'wrap' }}>
                    <div style={{ position: 'relative', width: 220 }}>
                        <Shield size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--n-400)' }} />
                        <select className="input" style={{ paddingLeft: '2.5rem', height: '2.5rem', appearance: 'none', border: 'none', background: 'var(--n-50)' }} value={selectedExam || ''} onChange={e => setSelectedExam(e.target.value)}>
                            {exams.map(ex => <option key={ex._id} value={ex._id}>{ex.title}</option>)}
                        </select>
                    </div>

                    <div style={{ height: 24, width: 1, background: 'var(--border)' }} />

                    <div style={{ position: 'relative', flex: 1 }}>
                        <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--n-400)' }} />
                        <input className="input" placeholder="Query active session..." style={{ paddingLeft: '2.5rem', height: '2.5rem', border: 'none', background: 'transparent' }} value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                    </div>

                    <div className="monitor-filter-pills" style={{ display: 'flex', background: 'var(--n-100)', borderRadius: 8, padding: 3 }}>
                        {FILTERS.map(f => (
                            <button key={f.key} onClick={() => setFilter(f.key)} style={{ padding: '0.4rem 0.85rem', borderRadius: 6, border: 'none', fontSize: '0.75rem', fontWeight: 800, cursor: 'pointer', background: filter === f.key ? '#fff' : 'transparent', color: filter === f.key ? 'var(--brand-600)' : 'var(--n-500)', boxShadow: filter === f.key ? 'var(--shadow-sm)' : 'none', transition: 'all 0.2s' }}>
                                {f.label}
                            </button>
                        ))}
                    </div>

                    <button className="btn btn-secondary btn-sm" onClick={handleRefresh} title="Sync Nodes">
                        <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
                    </button>
                </div>

                {/* Operations Floor */}
                <div style={{ display: 'flex', flexDirection: 'row', gap: '2rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                    
                    {/* Live Student Nodes */}
                    <div style={{ flex: '1 1 60%' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
                            <Zap size={18} color="var(--brand-500)" />
                            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800 }}>Live Nodes</h3>
                        </div>
                        {visibleSessions.length === 0 ? (
                            <div className="card empty-state" style={{ padding: '4rem 2rem' }}>
                                <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--n-50)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem' }}>
                                    <Eye size={32} color="var(--n-200)" />
                                </div>
                                <h3 style={{ color: 'var(--n-800)', fontWeight: 800 }}>Radar Sweep: No Signals</h3>
                                <p style={{ color: 'var(--n-500)', fontSize: '0.9rem', maxWidth: 300, margin: '0.5rem auto' }}>
                                    Waiting for students to join the session. Real-time telemetry will appear here once candidates initialize.
                                </p>
                            </div>
                        ) : (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.25rem' }}>
                                {visibleSessions.map(session => {
                                    // Map risk score to string enum
                                    let status = 'safe';
                                    if (session.riskScore >= 75) status = 'cheating';
                                    else if (session.riskScore >= 40) status = 'warning';
                                    
                                    return (
                                        <StudentMonitorCard 
                                            key={session._id} 
                                            session={{...session, status}} 
                                            student={session.student} 
                                            riskScore={session.riskScore} 
                                            flagCount={session.flagCount} 
                                            lastFlag={session.lastFlag} 
                                            liveFrame={videoStreams[session._id]}
                                            onExpand={s => navigate(`/proctor-report/${s._id}`)} 
                                        />
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Real-Time Telemetry Feed */}
                    <div style={{ flex: '1 1 35%', minWidth: '320px' }} className="card">
                        <AlertLogTable flags={liveEvents} />
                    </div>
                </div>

                <style>{`
                    @keyframes pulse {
                        0% { opacity: 1; }
                        50% { opacity: 0.5; }
                        100% { opacity: 1; }
                    }
                `}</style>
            </div>
        </Layout>
    );
}
