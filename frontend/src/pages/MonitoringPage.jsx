import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import StudentMonitorCard from '../components/StudentMonitorCard';
import AlertLogTable from '../components/AlertLogTable';
import useAuthStore from '../store/authStore';
import useProctoringStore from '../store/proctoringStore';
import { examAPI } from '../services/api';
import {
    Activity, Users, ShieldAlert, TrendingUp,
    Search, Filter, RefreshCw, Eye, Terminal, Zap,
    Shield, ArrowUpRight
} from 'lucide-react';

const FILTERS = [
    { key: 'all',      label: 'All Active' },
    { key: 'critical', label: 'Critical' },
    { key: 'high',     label: 'High Risk' },
    { key: 'medium',   label: 'Medium' },
    { key: 'low',      label: 'Secure' },
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

    const [liveEvents,   setLiveEvents]   = useState([]);
    const [exams,        setExams]        = useState([]);
    const [filter,       setFilter]       = useState('all');
    const [searchTerm,   setSearchTerm]   = useState('');
    const [refreshing,   setRefreshing]   = useState(false);
    const [selectedExam, setSelectedExam] = useState(null);

    useEffect(() => {
        examAPI.getAll().then(r => {
            const list = r.data.data || [];
            setExams(list);
            if (list.length > 0) setSelectedExam(list[0]._id);
        }).catch(() => {});
    }, []);

    useEffect(() => {
        if (token && selectedExam) {
            connectSocket(token, 'examiner', selectedExam);
        }
        return () => disconnectSocket();
    }, [token, selectedExam, connectSocket, disconnectSocket]);

    useEffect(() => {
        if (!socket) return;
        const handleEvent = d => {
            setLiveEvents(prev => [d.event, ...prev].slice(0, 200));
        };
        socket.on('student-event', handleEvent);
        return () => socket.off('student-event', handleEvent);
    }, [socket]);

    useEffect(() => {
        fetchActiveSessions();
        const id = setInterval(fetchActiveSessions, 20_000);
        return () => clearInterval(id);
    }, [fetchActiveSessions]);

    const handleRefresh = async () => {
        setRefreshing(true);
        await fetchActiveSessions().catch(() => {});
        setTimeout(() => setRefreshing(false), 800);
    };

    const sessionData = useMemo(() => {
        return activeSessions.map(s => {
            const sessionEvents = liveEvents.filter(e =>
                e?.sessionId === s._id || (e?.studentId?._id || e?.studentId) === (s.student?._id || s.student)
            );
            const flagCount  = sessionEvents.length;
            const riskScore  = Math.min(100, flagCount * 8 + (s.riskScore || 0));
            const lastFlag   = sessionEvents[0] || null;
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
        total:    sessionData.length,
        critical: sessionData.filter(s => s.riskScore >= 75).length,
        flagged:  liveEvents.length,
        avgRisk:  sessionData.length ? Math.round(sessionData.reduce((a, s) => a + s.riskScore, 0) / sessionData.length) : 0,
    }), [sessionData, liveEvents]);

    return (
        <div style={{ display: 'flex' }}>
            <Sidebar />
            <main className="main-content">
                <Navbar title="Mission Control" />

                {/* Metrics */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.25rem', marginBottom: '2rem' }}>
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
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem', background: '#fff', padding: '0.75rem', borderRadius: 12, border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
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

                    <div style={{ display: 'flex', background: 'var(--n-100)', borderRadius: 8, padding: 3 }}>
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
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 400px', gap: '2rem', alignItems: 'start' }}>
                    <div>
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
                                {visibleSessions.map(session => (
                                    <StudentMonitorCard key={session._id} session={session} student={session.student} riskScore={session.riskScore} flagCount={session.flagCount} lastFlag={session.lastFlag} onExpand={s => navigate(`/proctor-report/${s._id}`)} />
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="card" style={{ position: 'sticky', top: '2rem', maxHeight: 'calc(100vh - 12rem)', display: 'flex', flexDirection: 'column', background: 'var(--n-900)', border: '1px solid #1e293b' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', padding: '0.25rem 0.5rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <div style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--danger)', boxShadow: '0 0 10px var(--danger)', animation: 'pulse 2s infinite' }} />
                                <h3 style={{ margin: 0, fontSize: '0.85rem', fontWeight: 800, color: '#fff', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                    Live Telemetry Feed
                                </h3>
                            </div>
                            <div className="badge badge-danger" style={{ fontSize: '0.65rem' }}>{liveEvents.length} EVENTS</div>
                        </div>
                        
                        <div style={{ flex: 1, overflowY: 'auto', paddingRight: 4 }}>
                            <AlertLogTable events={liveEvents} darkVariant={true} />
                        </div>

                        <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', gap: 8, color: 'rgba(255,255,255,0.4)', fontSize: '0.7rem' }}>
                            <Terminal size={12} />
                            <span>Encrypted Websocket Stream Active</span>
                        </div>
                    </div>
                </div>

                <style>{`
                    @keyframes pulse {
                        0% { opacity: 1; }
                        50% { opacity: 0.5; }
                        100% { opacity: 1; }
                    }
                `}</style>
            </main>
        </div>
    );
}
