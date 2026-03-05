import { useEffect, useState } from 'react';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import { examAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { BarChart3, Users, BookOpen, ShieldCheck, TrendingUp, AlertCircle, Clock } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const chartData = [
    { date: 'Mon', attempts: 12, flags: 3 },
    { date: 'Tue', attempts: 19, flags: 5 },
    { date: 'Wed', attempts: 15, flags: 2 },
    { date: 'Thu', attempts: 27, flags: 8 },
    { date: 'Fri', attempts: 22, flags: 4 },
    { date: 'Sat', attempts: 9, flags: 1 },
    { date: 'Sun', attempts: 17, flags: 6 },
];

function StatCard({ icon: Icon, label, value, sub, color = '#3B82F6', trend }) {
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
                <div style={{ fontSize: '1.65rem', fontWeight: 700, color: '#1E293B', lineHeight: 1 }}>{value}</div>
                {sub && <div style={{ fontSize: '0.72rem', color: '#94A3B8', marginTop: 4 }}>{sub}</div>}
            </div>
        </div>
    );
}

export default function DashboardPage() {
    const { user } = useAuth();
    const [exams, setExams] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        examAPI.getAll()
            .then((r) => setExams(r.data.data || []))
            .catch(() => { })
            .finally(() => setLoading(false));
    }, []);

    const published = exams.filter((e) => e.status === 'published').length;

    return (
        <div style={{ display: 'flex' }}>
            <Sidebar />
            <main className="main-content">
                <Navbar title="Dashboard" />

                {/* Stats */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
                    <StatCard icon={BookOpen} label="Total Exams" value={exams.length} sub={`${published} published`} color="#3B82F6" />
                    <StatCard icon={Users} label="Active Students" value="—" sub="Connect backend" color="#6366F1" />
                    <StatCard icon={ShieldCheck} label="Sessions Today" value="—" sub="Live monitoring" color="#22C55E" />
                    <StatCard icon={AlertCircle} label="Pending Reviews" value="—" sub="Flagged sessions" color="#EF4444" />
                </div>

                {/* Chart + Recent exams */}
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                    {/* Chart */}
                    <div className="card animate-fade-up">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                            <div>
                                <h3 style={{ margin: 0, fontWeight: 600, color: '#1E293B' }}>Weekly Activity</h3>
                                <p style={{ margin: '0.2rem 0 0', fontSize: '0.78rem', color: '#94A3B8' }}>Exam attempts vs flagged events</p>
                            </div>
                            <span className="badge badge-blue">This Week</span>
                        </div>
                        <ResponsiveContainer width="100%" height={210}>
                            <AreaChart data={chartData}>
                                <defs>
                                    <linearGradient id="ga" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.15} />
                                        <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                                    </linearGradient>
                                    <linearGradient id="gf" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#EF4444" stopOpacity={0.12} />
                                        <stop offset="95%" stopColor="#EF4444" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                                <XAxis dataKey="date" tick={{ fill: '#94A3B8', fontSize: 11 }} tickLine={false} axisLine={false} />
                                <YAxis tick={{ fill: '#94A3B8', fontSize: 11 }} tickLine={false} axisLine={false} />
                                <Tooltip
                                    contentStyle={{ background: '#FFF', border: '1px solid #E2E8F0', borderRadius: 8, fontSize: 12, color: '#1E293B' }}
                                />
                                <Area type="monotone" dataKey="attempts" stroke="#3B82F6" strokeWidth={2} fill="url(#ga)" name="Attempts" />
                                <Area type="monotone" dataKey="flags" stroke="#EF4444" strokeWidth={2} fill="url(#gf)" name="Flags" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>

                    {/* Recent exams */}
                    <div className="card animate-fade-up">
                        <h3 style={{ margin: '0 0 1rem', fontWeight: 600, color: '#1E293B', fontSize: '0.95rem' }}>Recent Exams</h3>
                        {loading ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                {[...Array(4)].map((_, i) => <div key={i} className="skeleton" style={{ height: 48 }} />)}
                            </div>
                        ) : exams.length === 0 ? (
                            <div style={{ color: '#94A3B8', fontSize: '0.82rem', textAlign: 'center', padding: '2rem 0' }}>
                                No exams yet
                            </div>
                        ) : exams.slice(0, 5).map((exam) => (
                            <div key={exam._id} style={{
                                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                padding: '0.65rem 0', borderBottom: '1px solid #F1F5F9',
                            }}>
                                <div>
                                    <div style={{ fontSize: '0.82rem', fontWeight: 500, color: '#1E293B' }}>{exam.title}</div>
                                    <div style={{ fontSize: '0.7rem', color: '#94A3B8', display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                                        <Clock size={10} /> {exam.duration} min
                                    </div>
                                </div>
                                <span className={`badge ${exam.status === 'published' ? 'badge-low' : 'badge-medium'}`} style={{ fontSize: '0.65rem' }}>
                                    {exam.status}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* AI status bar */}
                <div className="card animate-fade-up" style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '1.25rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <TrendingUp size={17} color="#22C55E" />
                        <span style={{ fontSize: '0.84rem', fontWeight: 600, color: '#1E293B' }}>AI Proctoring Status</span>
                    </div>
                    {[
                        { label: 'Face Detection', status: 'Operational', color: '#22C55E' },
                        { label: 'Deepfake Detection', status: 'Operational', color: '#22C55E' },
                        { label: 'Behavioral Biometrics', status: 'Operational', color: '#22C55E' },
                        { label: 'Python AI Service', status: 'Standby', color: '#F59E0B' },
                    ].map(({ label, status, color }) => (
                        <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.78rem', color: '#64748B' }}>
                            <span style={{ width: 7, height: 7, borderRadius: '50%', background: color, display: 'inline-block' }} />
                            {label}
                            <span style={{ color, fontWeight: 600 }}>{status}</span>
                        </div>
                    ))}
                </div>
            </main>
        </div>
    );
}
