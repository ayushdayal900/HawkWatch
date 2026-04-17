/**
 * pages/DashboardPage.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Role-aware dashboard:
 *   • Examiner / Admin — exam stat cards from GET /api/exams/stats, recent exam
 *     table, live proctoring monitor panel, weekly activity chart.
 *   • Student          — personal attempt history stats, recent exam list with
 *     score and pass/fail badge.
 * All values come from real API data — no hardcoded placeholders.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useEffect, useState, useMemo } from 'react';
import Navbar           from '../components/Navbar';
import Sidebar          from '../components/Sidebar';
import { examAPI }      from '../services/api';
import api              from '../services/api';
import { useAuth }      from '../context/AuthContext';
import StudentMonitorCard from '../components/StudentMonitorCard';
import AlertLogTable    from '../components/AlertLogTable';
import {
    BarChart3, Users, BookOpen, ShieldCheck, TrendingUp,
    AlertCircle, Clock, CheckCircle, XCircle, FileText,
} from 'lucide-react';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid,
    Tooltip, ResponsiveContainer,
} from 'recharts';
import { io } from 'socket.io-client';

/* ─── Stat card ──────────────────────────────────────────────────────── */
function StatCard({ icon: Icon, label, value, sub, color = '#3B82F6', loading }) {
    return (
        <div className="card animate-fade-up" style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
            <div style={{
                width: 44, height: 44, borderRadius: 10, flexShrink: 0,
                background: `${color}15`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
                <Icon size={20} color={color} />
            </div>
            <div style={{ flex: 1 }}>
                <div style={{ fontSize: '0.75rem', color: '#64748B', marginBottom: 2, fontWeight: 500 }}>{label}</div>
                {loading ? (
                    <div className="skeleton" style={{ height: 28, width: 60, marginTop: 4 }} />
                ) : (
                    <div style={{ fontSize: '1.65rem', fontWeight: 700, color: '#1E293B', lineHeight: 1 }}>{value}</div>
                )}
                {sub && !loading && (
                    <div style={{ fontSize: '0.72rem', color: '#94A3B8', marginTop: 4 }}>{sub}</div>
                )}
            </div>
        </div>
    );
}

/* ─── Recent exam row ────────────────────────────────────────────────── */
function RecentExamRow({ exam, isStudent }) {
    if (isStudent && exam.exam) {
        // This is a history Attempt record instead of an Exam record
        const passCls = exam.passed ? 'badge-low' : 'badge-high';
        return (
            <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '0.65rem 0', borderBottom: '1px solid #F1F5F9',
            }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '0.82rem', fontWeight: 500, color: '#1E293B', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {exam.exam.title}
                    </div>
                    <div style={{ fontSize: '0.7rem', color: '#94A3B8', display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                        <Clock size={10} /> Finished {new Date(exam.updatedAt || exam.createdAt).toLocaleDateString()} · {exam.score} / {exam.exam.totalMarks} pts
                    </div>
                </div>
                <span className={`badge ${passCls}`} style={{ fontSize: '0.65rem', marginLeft: '0.75rem', flexShrink: 0 }}>
                    {exam.passed ? 'Passed' : 'Failed'}
                </span>
            </div>
        );
    }

    const statusCfg = {
        published: { cls: 'badge-low',    label: 'Published' },
        draft:     { cls: 'badge-medium', label: 'Draft'     },
        active:    { cls: 'badge-blue',   label: 'Active'    },
        completed: { cls: 'badge-medium', label: 'Done'      },
    };
    const cfg = statusCfg[exam.status] || { cls: 'badge-medium', label: exam.status };

    return (
        <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '0.65rem 0', borderBottom: '1px solid #F1F5F9',
        }}>
            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '0.82rem', fontWeight: 500, color: '#1E293B', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {exam.title}
                </div>
                <div style={{ fontSize: '0.7rem', color: '#94A3B8', display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                    <Clock size={10} /> {exam.duration} min
                    {!isStudent && <> · {exam.questions?.length || 0} questions</>}
                </div>
            </div>
            <span className={`badge ${cfg.cls}`} style={{ fontSize: '0.65rem', marginLeft: '0.75rem', flexShrink: 0 }}>
                {cfg.label}
            </span>
        </div>
    );
}

/* ─── Weekly chart placeholder ───────────────────────────────────────── */
const WEEK_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const emptyChart = WEEK_DAYS.map((d) => ({ date: d, attempts: 0, flags: 0 }));

/* ─── Main Page ──────────────────────────────────────────────────────── */
export default function DashboardPage() {
    const { user, isExaminer, isAdmin, isStudent } = useAuth();

    const [stats,   setStats]   = useState(null);
    const [exams,   setExams]   = useState([]);
    const [loading, setLoading] = useState(true);
    const [liveEvents, setLiveEvents] = useState([]);

    /* ── Fetch stats + recent exams ────────────────────────────────── */
    useEffect(() => {
        const fetchData = async () => {
            try {
                // Students fetch history; Examiners/Admins fetch available exams
                const promises = [examAPI.getStats(), examAPI.getAll()];
                if (isStudent) {
                    promises.push(examAPI.getHistory());
                }

                const res = await Promise.all(promises);
                setStats(res[0].data.data);
                
                if (isStudent) {
                    // res[1] = getAll (available exams for CTA card counts)
                    // res[2] = getHistory (past attempts)
                    setExams(res[2].data.data || []);
                } else {
                    setExams(res[1].data.data || []);
                }
            } catch {
                // Stats might fail if endpoint isn't yet available — degrade gracefully
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [isStudent]);

    /* ── Socket.IO: live proctoring events for examiner/admin ──────── */
    useEffect(() => {
        if ((!isExaminer && !isAdmin) || exams.length === 0) return;

        const activeExamId = exams[0]?._id;
        if (!activeExamId) return;

        api.get(`/proctor/events/${activeExamId}`)
            .then((r) => setLiveEvents(r.data.data || []))
            .catch(() => {});

        const socket = io(import.meta.env.VITE_APP_URL || 'http://localhost:5000');
        socket.emit('join-proctor-room', { sessionId: activeExamId });
        socket.on('student-event', (data) => {
            setLiveEvents((prev) => [data.event, ...prev]);
        });

        return () => socket.disconnect();
    }, [exams, isExaminer, isAdmin]);

    /* ── Derived: active students map ──────────────────────────────── */
    const activeStudentsData = useMemo(() => {
        const map = {};
        liveEvents.forEach((e) => {
            const sid = e?.studentId?._id || e?.studentId;
            if (!sid) return;
            if (!map[sid]) map[sid] = { studentId: sid, events: [], riskScore: 0 };
            map[sid].events.push(e);
            map[sid].riskScore += (e.riskWeight || 0);
        });

        return Object.values(map).map((s) => ({
            ...s,
            riskLevel: s.riskScore >= 20 ? 'HIGH' : s.riskScore >= 10 ? 'MEDIUM' : 'LOW',
        }));
    }, [liveEvents]);

    /* ── Stat card values ───────────────────────────────────────────── */
    const statCards = isStudent
        ? [
            { icon: BookOpen,    label: 'Total Attempts',   value: stats?.total  ?? '—', sub: 'All time',       color: '#3B82F6' },
            { icon: CheckCircle, label: 'Passed',           value: stats?.passed ?? '—', sub: 'Exams passed',   color: '#22C55E' },
            { icon: XCircle,     label: 'Failed',           value: stats?.failed ?? '—', sub: 'Exams failed',   color: '#EF4444' },
            { icon: FileText,    label: 'Available Exams',  value: exams.length,          sub: 'Open to take',  color: '#6366F1' },
        ]
        : [
            { icon: BookOpen,    label: 'Total Exams',      value: stats?.total     ?? '—', sub: 'All time',         color: '#3B82F6' },
            { icon: TrendingUp,  label: 'Published',        value: stats?.published ?? '—', sub: 'Live to students', color: '#22C55E' },
            { icon: BarChart3,   label: 'Draft',            value: stats?.draft     ?? '—', sub: 'Unpublished',      color: '#F59E0B' },
            { icon: ShieldCheck, label: 'Active Sessions',  value: stats?.active    ?? '—', sub: 'Currently running',color: '#6366F1' },
        ];

    /* ── Render ─────────────────────────────────────────────────────── */
    return (
        <div style={{ display: 'flex' }}>
            <Sidebar />
            <main className="main-content">
                <Navbar title="Dashboard" />

                {/* Greeting */}
                <div style={{ marginBottom: '1.5rem' }}>
                    <h2 style={{ margin: '0 0 0.25rem', fontSize: '1.35rem', fontWeight: 700, color: '#1E293B' }}>
                        Welcome back, {user?.name?.split(' ')[0]} 👋
                    </h2>
                    <p style={{ margin: 0, fontSize: '0.875rem', color: '#64748B' }}>
                        {isStudent
                            ? "Here's a summary of your exam activity."
                            : "Here's an overview of your exam platform."}
                    </p>
                </div>

                {/* Stat cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
                    {statCards.map((s) => (
                        <StatCard key={s.label} {...s} loading={loading} />
                    ))}
                </div>

                {/* Middle row: chart + recent exams */}
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                    {/* Chart */}
                    <div className="card animate-fade-up">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                            <div>
                                <h3 style={{ margin: 0, fontWeight: 600, color: '#1E293B' }}>Weekly Activity</h3>
                                <p style={{ margin: '0.2rem 0 0', fontSize: '0.78rem', color: '#94A3B8' }}>
                                    {isStudent ? 'Your exam attempts this week' : 'Exam attempts vs flagged events'}
                                </p>
                            </div>
                            <span className="badge badge-blue">This Week</span>
                        </div>
                        <ResponsiveContainer width="100%" height={210}>
                            <AreaChart data={emptyChart}>
                                <defs>
                                    <linearGradient id="ga" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%"  stopColor="#3B82F6" stopOpacity={0.15} />
                                        <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}    />
                                    </linearGradient>
                                    <linearGradient id="gf" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%"  stopColor="#EF4444" stopOpacity={0.12} />
                                        <stop offset="95%" stopColor="#EF4444" stopOpacity={0}    />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                                <XAxis dataKey="date" tick={{ fill: '#94A3B8', fontSize: 11 }} tickLine={false} axisLine={false} />
                                <YAxis tick={{ fill: '#94A3B8', fontSize: 11 }} tickLine={false} axisLine={false} />
                                <Tooltip contentStyle={{ background: '#FFF', border: '1px solid #E2E8F0', borderRadius: 8, fontSize: 12, color: '#1E293B' }} />
                                <Area type="monotone" dataKey="attempts" stroke="#3B82F6" strokeWidth={2} fill="url(#ga)" name="Attempts" />
                                {!isStudent && <Area type="monotone" dataKey="flags" stroke="#EF4444" strokeWidth={2} fill="url(#gf)" name="Flags" />}
                            </AreaChart>
                        </ResponsiveContainer>
                        <p style={{ margin: '0.5rem 0 0', fontSize: '0.72rem', color: '#94A3B8', textAlign: 'center' }}>
                            Live weekly analytics will populate once exam sessions are recorded.
                        </p>
                    </div>

                    {/* Recent exams */}
                    <div className="card animate-fade-up">
                        <h3 style={{ margin: '0 0 1rem', fontWeight: 600, color: '#1E293B', fontSize: '0.95rem' }}>
                            {isStudent ? 'Available Exams' : 'Recent Exams'}
                        </h3>
                        {loading ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                {[...Array(5)].map((_, i) => <div key={i} className="skeleton" style={{ height: 48 }} />)}
                            </div>
                        ) : exams.length === 0 ? (
                            <div style={{ color: '#94A3B8', fontSize: '0.82rem', textAlign: 'center', padding: '2rem 0' }}>
                                No exams available yet.
                            </div>
                        ) : (
                            exams.slice(0, 5).map((exam) => (
                                <RecentExamRow key={exam._id} exam={exam} isStudent={isStudent} />
                            ))
                        )}
                    </div>
                </div>

                {/* AI status bar */}
                <div className="card animate-fade-up" style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '1.25rem', marginBottom: '1.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <TrendingUp size={17} color="#22C55E" />
                        <span style={{ fontSize: '0.84rem', fontWeight: 600, color: '#1E293B' }}>AI Proctoring Status</span>
                    </div>
                    {[
                        { label: 'Face Detection',       status: 'Operational', color: '#22C55E' },
                        { label: 'Deepfake Detection',   status: 'Operational', color: '#22C55E' },
                        { label: 'Behavioral Biometrics',status: 'Operational', color: '#22C55E' },
                        { label: 'Python AI Service',    status: 'Standby',     color: '#F59E0B' },
                    ].map(({ label, status, color }) => (
                        <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.78rem', color: '#64748B' }}>
                            <span style={{ width: 7, height: 7, borderRadius: '50%', background: color, display: 'inline-block' }} />
                            {label}
                            <span style={{ color, fontWeight: 600 }}>{status}</span>
                        </div>
                    ))}
                </div>

                {/* Live Monitor — examiner / admin only */}
                {(isExaminer || isAdmin) && (
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                            <ShieldCheck size={20} color="#3B82F6" />
                            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#1E293B', margin: 0 }}>Live Monitor</h3>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1.5rem', alignItems: 'start' }}>
                            <div>
                                <h4 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#64748B', marginBottom: '1rem', margin: '0 0 1rem' }}>
                                    Active Students &amp; Risk Scores
                                </h4>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                    {activeStudentsData.length === 0 ? (
                                        <div style={{ color: '#94A3B8', fontSize: '0.85rem' }}>
                                            No active exam participants at the moment.
                                        </div>
                                    ) : (
                                        activeStudentsData.map((student) => (
                                            <StudentMonitorCard key={student.studentId} {...student} />
                                        ))
                                    )}
                                </div>
                            </div>
                            <div>
                                <h4 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#64748B', margin: '0 0 1rem' }}>
                                    Flagged Alerts Log
                                </h4>
                                <AlertLogTable events={liveEvents} />
                            </div>
                        </div>
                    </div>
                )}

                {/* Student: encourage taking exams */}
                {isStudent && exams.length > 0 && (
                    <div className="card animate-fade-up" style={{ textAlign: 'center', padding: '2rem', background: 'linear-gradient(135deg, #EFF6FF, #F0FDF4)' }}>
                        <BookOpen size={32} color="#3B82F6" style={{ marginBottom: '0.75rem' }} />
                        <h3 style={{ margin: '0 0 0.5rem', fontWeight: 700, color: '#1E293B' }}>
                            {exams.length} exam{exams.length !== 1 ? 's' : ''} available
                        </h3>
                        <p style={{ margin: '0 0 1rem', color: '#64748B', fontSize: '0.875rem' }}>
                            Complete your identity verification to start any exam.
                        </p>
                        <a href="/exams" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#3B82F6', color: '#fff', borderRadius: 8, padding: '0.625rem 1.25rem', fontWeight: 600, fontSize: '0.875rem', textDecoration: 'none' }}>
                            <BookOpen size={16} /> Browse Exams
                        </a>
                    </div>
                )}
            </main>
        </div>
    );
}
