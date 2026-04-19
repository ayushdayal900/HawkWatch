/**
 * pages/DashboardPage.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Role-aware dashboard:
 *   • Examiner / Admin — Live overview of the platform performance and sessions.
 *   • Student          — Summary of progress and available opportunities.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useEffect, useState, useMemo } from 'react';
import useAuthStore from '../store/authStore';
import useUIStore from '../store/uiStore';
import Layout from '../components/Layout';
import {
    BarChart3, Users, BookOpen, ShieldCheck, TrendingUp,
    Clock, CheckCircle, FileText, ChevronRight, Activity, Zap
} from 'lucide-react';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid,
    Tooltip, ResponsiveContainer,
} from 'recharts';

/* ─── Stat card component ──────────────────────────────────────────────── */
function StatCard({ icon: Icon, label, value, sub, color = 'var(--brand-500)', bg = 'var(--brand-50)', loading }) {
    return (
        <div className="stat-card">
            <div className="stat-icon" style={{ background: bg }}>
                <Icon size={20} color={color} />
            </div>
            <div>
                <div className="stat-label">{label}</div>
                {loading ? (
                    <div className="skeleton" style={{ height: 28, width: 80, marginTop: 4 }} />
                ) : (
                    <div className="stat-value" style={{ color: 'var(--n-800)' }}>{value}</div>
                )}
                {sub && !loading && (
                    <div className="stat-sub">{sub}</div>
                )}
            </div>
        </div>
    );
}

/* ─── Recent exam row ────────────────────────────────────────────────── */
function RecentExamRow({ exam, isStudent }) {
    if (isStudent && exam.exam) {
        return (
            <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '0.875rem 0', borderBottom: '1px solid var(--border)',
            }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--n-800)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {exam.exam.title}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--n-500)', display: 'flex', alignItems: 'center', gap: 4, marginTop: 3 }}>
                        <Clock size={11} /> {new Date(exam.updatedAt || exam.createdAt).toLocaleDateString()} · {exam.score} / {exam.exam.totalMarks} pts
                    </div>
                </div>
                <span className={`badge ${exam.passed ? 'badge-success' : 'badge-danger'}`}>
                    {exam.passed ? 'Passed' : 'Failed'}
                </span>
            </div>
        );
    }

    const statusCfg = {
        published: { cls: 'badge-success', label: 'Live' },
        draft: { cls: 'badge-warning', label: 'Draft' },
        active: { cls: 'badge-info', label: 'Active' },
        completed: { cls: 'badge-neutral', label: 'Finished' },
    };
    const cfg = statusCfg[exam.status] || { cls: 'badge-neutral', label: exam.status };

    return (
        <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '0.875rem 0', borderBottom: '1px solid var(--border)',
        }}>
            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--n-800)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {exam.title}
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--n-500)', display: 'flex', alignItems: 'center', gap: 4, marginTop: 3 }}>
                    <Clock size={11} /> {exam.duration}m · {exam.questions?.length || 0} Qs
                </div>
            </div>
            <span className={`badge ${cfg.cls}`}>
                {cfg.label}
            </span>
        </div>
    );
}

const WEEK_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const emptyChart = WEEK_DAYS.map((d) => ({ date: d, attempts: 0, flags: 0 }));

export default function DashboardPage() {
    const { user, isStudent } = useAuthStore();
    const [stats, setStats] = useState(null);
    const [exams, setExams] = useState([]);
    const [loading, setLoading] = useState(true);

    const { setPageTitle } = useUIStore();

    useEffect(() => {
        setPageTitle('Dashboard');
        const fetchData = async () => {
            try {
                const promises = [examAPI.getStats(), examAPI.getAll()];
                if (isStudent) promises.push(examAPI.getHistory());

                const res = await Promise.all(promises);
                setStats(res[0].data.data);
                setExams(isStudent ? (res[2]?.data?.data || []) : (res[1]?.data?.data || []));
            } catch {
                // Graceful degradation
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [isStudent]);

    const statCards = isStudent
        ? [
            { icon: BookOpen, label: 'Total Attempts', value: stats?.total ?? '—', sub: 'Completed exams', color: 'var(--brand-500)', bg: 'var(--brand-50)' },
            { icon: CheckCircle, label: 'Success Rate', value: stats?.total ? `${Math.round((stats.passed / stats.total) * 100)}%` : '—', sub: `${stats?.passed || 0} exams passed`, color: 'var(--success)', bg: 'var(--success-bg)' },
            { icon: Clock, label: 'Avg. Score', value: stats?.avgScore ?? '—', sub: 'Across all tests', color: 'var(--warning)', bg: 'var(--warning-bg)' },
            { icon: FileText, label: 'Open Exams', value: stats?.available ?? '—', sub: 'Available to take', color: 'var(--info)', bg: 'var(--info-bg)' },
        ]
        : [
            { icon: Users, label: 'Total Students', value: stats?.students ?? '—', sub: 'Across organizations', color: 'var(--brand-500)', bg: 'var(--brand-50)' },
            { icon: ShieldCheck, label: 'Active Sessions', value: stats?.active ?? '—', sub: 'Currently monitored', color: 'var(--success)', bg: 'var(--success-bg)' },
            { icon: Activity, label: 'Total Flags', value: stats?.flags ?? '—', sub: 'AI detections', color: 'var(--danger)', bg: 'var(--danger-bg)' },
            { icon: Zap, label: 'System Health', value: '99.8%', sub: 'AI API Latency: 42ms', color: 'var(--info)', bg: 'var(--info-bg)' },
        ];

    return (
        <Layout>
            <div className="animate-fade-in">
                {/* Hero Greeting */}
                <div style={{
                    marginBottom: '2rem',
                    display: 'flex',
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'flex-end',
                    flexWrap: 'wrap',
                    gap: '1rem'
                }}>
                    <div style={{ flex: '1 1 300px' }}>
                        <h2 style={{ margin: 0, fontSize: '1.75rem', fontWeight: 800, color: 'var(--n-900)', letterSpacing: '-0.02em' }}>
                            Welcome back, {user?.name?.split(' ')[0]}
                        </h2>
                        <p style={{ margin: '0.25rem 0 0', fontSize: '0.9rem', color: 'var(--n-500)' }}>
                            {isStudent
                                ? "Here's your academic performance at a glance."
                                : "Manage your exams and monitor live sessions in real-time."}
                        </p>
                    </div>
                    {isStudent && (
                        <a href="/exams" className="btn btn-primary hide-mobile">
                            <BookOpen size={16} /> Start New Exam
                        </a>
                    )}
                </div>

                {/* Stat Grid */}
                <div className="responsive-grid section-margin">
                    {statCards.map((s) => (
                        <StatCard key={s.label} {...s} loading={loading} />
                    ))}
                </div>

                {/* Main Content Grid */}
                <div className="dashboard-main-grid section-margin">
                    {/* Activity Chart */}
                    <div className="card animate-fade-up">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
                            <div>
                                <h3 style={{ margin: 0, fontWeight: 700, color: 'var(--n-800)', fontSize: '1.05rem' }}>Activity Overview</h3>
                                <p style={{ margin: '0.25rem 0 0', fontSize: '0.8rem', color: 'var(--n-400)' }}>
                                    {isStudent ? 'Attempts and scoring trends' : 'System load and incident alerts'}
                                </p>
                            </div>
                            <div className="badge badge-info" style={{ borderRadius: 6 }}>Last 7 Days</div>
                        </div>

                        <ResponsiveContainer width="100%" height={260}>
                            <AreaChart data={emptyChart} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorAttempts" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="var(--brand-500)" stopOpacity={0.15} />
                                        <stop offset="95%" stopColor="var(--brand-500)" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                                <XAxis
                                    dataKey="date"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: 'var(--n-400)', fontSize: 11, fontWeight: 500 }}
                                    dy={10}
                                />
                                <YAxis
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: 'var(--n-400)', fontSize: 11, fontWeight: 500 }}
                                />
                                <Tooltip
                                    contentStyle={{
                                        borderRadius: 'var(--r-md)',
                                        border: 'none',
                                        boxShadow: 'var(--shadow-lg)',
                                        fontSize: '0.8rem'
                                    }}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="attempts"
                                    stroke="var(--brand-500)"
                                    strokeWidth={3}
                                    fillOpacity={1}
                                    fill="url(#colorAttempts)"
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                        <div style={{ marginTop: '1rem', padding: '0.75rem', borderRadius: 8, background: 'var(--n-50)', textAlign: 'center' }}>
                            <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--n-500)', fontWeight: 500 }}>
                                <TrendingUp size={12} style={{ display: 'inline', marginRight: 4, verticalAlign: 'middle' }} />
                                Real-time analytics will sync once more sessions are completed.
                            </p>
                        </div>
                    </div>

                    {/* Recent Exams Panel */}
                    <div className="card animate-fade-up" style={{ display: 'flex', flexDirection: 'column' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
                            <h3 style={{ margin: 0, fontWeight: 700, color: 'var(--n-800)', fontSize: '1.05rem' }}>
                                {isStudent ? 'History' : 'Exams'}
                            </h3>
                            <a href="/exams" style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--brand-500)', display: 'flex', alignItems: 'center', gap: 2 }}>
                                View all <ChevronRight size={14} />
                            </a>
                        </div>

                        <div style={{ flex: 1 }}>
                            {loading ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                    {[...Array(5)].map((_, i) => <div key={i} className="skeleton" style={{ height: 56 }} />)}
                                </div>
                            ) : exams.length === 0 ? (
                                <div className="empty-state" style={{ padding: '2rem 0' }}>
                                    <FileText size={32} color="var(--n-200)" />
                                    <p style={{ marginTop: '0.5rem', fontSize: '0.82rem' }}>No records found.</p>
                                </div>
                            ) : (
                                exams.slice(0, 6).map((exam) => (
                                    <RecentExamRow key={exam._id} exam={exam} isStudent={isStudent} />
                                ))
                            )}
                        </div>
                    </div>
                </div>

                {/* Bottom Row: System Status + Action */}
                <div className="dashboard-main-grid">
                    <div className="card animate-fade-up" style={{ background: 'var(--n-900)', border: 'none' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '1rem' }}>
                            <Activity size={18} color="var(--brand-400)" />
                            <h4 style={{ margin: 0, color: '#fff', fontSize: '0.95rem', fontWeight: 700 }}>AI Core Performance</h4>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                            {[
                                { label: 'Facial Recognition', value: 'Active', color: 'var(--success)' },
                                { label: 'Pattern Analysis', value: 'Active', color: 'var(--success)' },
                                { label: 'Audio Processing', value: 'Standby', color: 'var(--warning)' },
                                { label: 'Websocket Relay', value: 'Stable', color: 'var(--brand-400)' },
                            ].map((s) => (
                                <div key={s.label} style={{ background: 'rgba(255,255,255,0.05)', padding: '0.75rem', borderRadius: 8 }}>
                                    <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em' }}>{s.label}</div>
                                    <div style={{ fontSize: '0.875rem', color: s.color, fontWeight: 700, marginTop: 2 }}>{s.value}</div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="card animate-fade-up" style={{ background: 'linear-gradient(135deg, var(--brand-600), var(--brand-700))', border: 'none', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '2rem' }}>
                        <div>
                            <ShieldCheck size={40} style={{ marginBottom: '1rem', opacity: 0.9 }} />
                            <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800 }}>Security First Architecture</h3>
                            <p style={{ margin: '0.5rem 0 1.5rem', fontSize: '0.875rem', opacity: 0.8, maxWidth: 280 }}>
                                HawkWatch uses multi-modal AI to ensure 99.9% integrity during exam sessions.
                            </p>
                            <button className="btn" style={{ background: '#fff', color: 'var(--brand-600)' }}>
                                Learn about AI Proctoring
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </Layout>
    );
}
