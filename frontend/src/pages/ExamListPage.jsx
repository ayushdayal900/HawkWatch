import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { examAPI } from '../services/api';
import useAuthStore from '../store/authStore';
import useUIStore from '../store/uiStore';
import Layout from '../components/Layout';
import toast       from 'react-hot-toast';
import {
    Clock, BookOpen, Target, Search, Plus, Eye, Pencil,
    Trash2, Send, ChevronRight, Filter, Shield, Award,
    MoreVertical, Info
} from 'lucide-react';

/* ─── Status Badge mapping ───────────────────────────────────────────── */
const STATUS_CFG = {
    published: { cls: 'badge-success', label: 'Live' },
    draft:     { cls: 'badge-warning', label: 'Draft' },
    active:    { cls: 'badge-info',    label: 'Active' },
    completed: { cls: 'badge-neutral', label: 'Done' },
};

/* ─── Student card component ─────────────────────────────────────────── */
function ExamCard({ exam, onTake }) {
    return (
        <div className="card animate-fade-up" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', transition: 'transform 0.2s, box-shadow 0.2s' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: 'var(--brand-50)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <BookOpen size={20} color="var(--brand-600)" />
                </div>
                <div className={`badge ${STATUS_CFG[exam.status]?.cls || 'badge-neutral'}`}>
                    {STATUS_CFG[exam.status]?.label || exam.status}
                </div>
            </div>

            <div>
                <h3 style={{ margin: 0, fontWeight: 800, fontSize: '1.1rem', color: 'var(--n-900)', letterSpacing: '-0.01em' }}>{exam.title}</h3>
                <p style={{ margin: '0.4rem 0 0', fontSize: '0.82rem', color: 'var(--n-500)', lineHeight: 1.5, height: '2.4rem', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                    {exam.description || 'No description provided for this examination.'}
                </p>
            </div>

            <div style={{ display: 'flex', gap: '1rem', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)', padding: '0.75rem 0', margin: '0.25rem 0' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <span style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--n-400)', textTransform: 'uppercase' }}>Duration</span>
                    <span style={{ fontSize: '0.81rem', fontWeight: 700, color: 'var(--n-700)', display: 'flex', alignItems: 'center', gap: 4 }}><Clock size={12} /> {exam.duration}m</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <span style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--n-400)', textTransform: 'uppercase' }}>Questions</span>
                    <span style={{ fontSize: '0.81rem', fontWeight: 700, color: 'var(--n-700)', display: 'flex', alignItems: 'center', gap: 4 }}><Target size={12} /> {exam.questions?.length || 0}</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <span style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--n-400)', textTransform: 'uppercase' }}>Marks</span>
                    <span style={{ fontSize: '0.81rem', fontWeight: 700, color: 'var(--n-700)', display: 'flex', alignItems: 'center', gap: 4 }}><Award size={12} /> {exam.totalMarks}</span>
                </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto' }}>
                <div style={{ display: 'flex', gap: 4 }}>
                    {exam.proctoring?.enabled && (
                        <div title="AI Proctoring Enabled" style={{ background: 'var(--success-bg)', color: 'var(--success-txt)', padding: 4, borderRadius: 6 }}>
                            <Shield size={14} />
                        </div>
                    )}
                </div>
                <button className="btn btn-primary btn-sm" onClick={() => onTake(exam)}>
                    Start Exam <ChevronRight size={14} />
                </button>
            </div>
        </div>
    );
}

/* ─── Examiner / Admin table component ────────────────────────────────── */
function ExamTable({ exams, onPublish, onDelete, onEdit, onView }) {
    return (
        <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                    <tr style={{ background: 'var(--n-50)', borderBottom: '1px solid var(--border)' }}>
                        {['Exam Title', 'Complexity', 'Schedule', 'Status', ''].map((h, i) => (
                            <th key={h} style={{ padding: '1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 700, color: 'var(--n-500)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                {h}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {exams.map((exam) => (
                        <tr key={exam._id} style={{ borderBottom: '1px solid var(--border)', transition: 'background 0.2s' }} onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--n-50)')} onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}>
                            <td style={{ padding: '1rem' }}>
                                <div style={{ fontWeight: 700, color: 'var(--n-900)', fontSize: '0.9rem' }}>{exam.title}</div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--n-400)', marginTop: 2 }}>ID: {exam._id.slice(-6).toUpperCase()}</div>
                            </td>
                            <td style={{ padding: '1rem' }}>
                                <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--n-700)' }}>{exam.questions?.length || 0} Questions</div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--n-400)', marginTop: 2 }}>{exam.totalMarks} Total Points</div>
                            </td>
                            <td style={{ padding: '1rem' }}>
                                <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--n-700)' }}>{exam.duration} Minutes</div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--n-400)', marginTop: 2 }}>Created {new Date(exam.createdAt).toLocaleDateString()}</div>
                            </td>
                            <td style={{ padding: '1rem' }}>
                                <div className={`badge ${STATUS_CFG[exam.status]?.cls || 'badge-neutral'}`}>
                                    {STATUS_CFG[exam.status]?.label || exam.status}
                                </div>
                            </td>
                            <td style={{ padding: '1rem' }}>
                                <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                                    <button className="btn btn-ghost btn-sm" onClick={() => onView(exam)} title="View Detail"><Eye size={16} /></button>
                                    <button className="btn btn-ghost btn-sm" onClick={() => onEdit(exam)} title="Edit Exam"><Pencil size={16} /></button>
                                    {exam.status === 'draft' && (
                                        <button className="btn btn-success btn-sm" onClick={() => onPublish(exam)} title="Publish Live"><Send size={16} /></button>
                                    )}
                                    <button className="btn btn-danger btn-sm" onClick={() => onDelete(exam)} title="Delete"><Trash2 size={16} /></button>
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

export default function ExamListPage() {
    const user = useAuthStore(state => state.user);
    const navigate  = useNavigate();
    const isStudent = user?.role === 'student';
    const canManage = user?.role === 'examiner' || user?.role === 'admin';

    const [exams,   setExams]   = useState([]);
    const [loading, setLoading] = useState(true);
    const [search,  setSearch]  = useState('');
    const [statusF, setStatusF] = useState('all');

    const load = useCallback(() => {
        setLoading(true);
        examAPI.getAll()
            .then((r) => setExams(r.data.data || []))
            .catch(() => toast.error('Failed to load exams.'))
            .finally(() => setLoading(false));
    }, []);

    const { setPageTitle } = useUIStore();

    useEffect(() => {
        setPageTitle(isStudent ? 'Exam Library' : 'Exam Management');
        load();
    }, [load, isStudent, setPageTitle]);

    const filtered = exams.filter((e) => {
        const matchSearch = e.title.toLowerCase().includes(search.toLowerCase());
        const matchStatus = statusF === 'all' || e.status === statusF;
        return matchSearch && matchStatus;
    });

    const handleTake = (exam) => navigate(`/exam-verification/${exam._id}`);
    const handleView = (exam) => navigate(`/exams/${exam._id}`);
    const handleEdit = () => toast('Editor integration pending.', { icon: '🏗️' });

    const handlePublish = async (exam) => {
        if (!exam.questions?.length) return toast.error('Add questions before publishing.');
        try {
            await examAPI.publish(exam._id);
            toast.success('Exam is now live!');
            load();
        } catch (err) { toast.error('Publish failed.'); }
    };

    const handleDelete = async (exam) => {
        if (!window.confirm('Are you sure you want to delete this exam?')) return;
        try {
            await examAPI.remove(exam._id);
            toast.success('Exam removed.');
            load();
        } catch (err) { toast.error('Delete failed.'); }
    };

    return (
        <Layout>
            <div className="animate-fade-in">
                {/* Toolbar */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', gap: '1rem', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', gap: '1rem', flex: 1, maxWidth: 600 }}>
                        <div style={{ position: 'relative', flex: 1 }}>
                            <Search size={18} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--n-400)' }} />
                            <input
                                className="input"
                                placeholder="Search by title or code..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                style={{ paddingLeft: '2.75rem', height: '2.75rem' }}
                            />
                        </div>
                        {canManage && (
                            <div style={{ position: 'relative' }}>
                                <Filter size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--n-400)', pointerEvents: 'none' }} />
                                <select
                                    className="input"
                                    value={statusF}
                                    onChange={(e) => setStatusF(e.target.value)}
                                    style={{ paddingLeft: '2.5rem', height: '2.75rem', width: 160, appearance: 'none' }}
                                >
                                    <option value="all">All Status</option>
                                    <option value="draft">Drafts</option>
                                    <option value="published">Live</option>
                                    <option value="active">Active</option>
                                </select>
                            </div>
                        )}
                    </div>

                    {canManage && (
                        <button className="btn btn-primary btn-lg" onClick={() => navigate('/create-exam')}>
                            <Plus size={20} /> Create Exam
                        </button>
                    )}
                </div>

                {/* Content */}
                {loading ? (
                    <div className={isStudent ? "responsive-grid" : ""}>
                        {[...Array(6)].map((_, i) => (
                            <div key={i} className="skeleton" style={{ height: isStudent ? 240 : 64, borderRadius: 'var(--r-lg)' }} />
                        ))}
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="empty-state" style={{ padding: '5rem 0' }}>
                        <div style={{ background: 'var(--n-50)', padding: '2rem', borderRadius: '50%', marginBottom: '1.5rem' }}>
                            <BookOpen size={48} color="var(--n-200)" />
                        </div>
                        <h3 style={{ color: 'var(--n-800)', fontWeight: 700 }}>No examinations found</h3>
                        <p style={{ color: 'var(--n-500)', maxWidth: 300, margin: '0.5rem auto 1.5rem' }}>
                            {search ? "We couldn't find any exams matching your search criteria." : "There are currently no active examinations available for you."}
                        </p>
                        {canManage && (
                            <button className="btn btn-primary" onClick={() => navigate('/create-exam')}>
                                <Plus size={18} /> Create New Exam
                            </button>
                        )}
                    </div>
                ) : isStudent ? (
                    <div className="responsive-grid">
                        {filtered.map((exam) => (
                            <ExamCard key={exam._id} exam={exam} onTake={handleTake} />
                        ))}
                    </div>
                ) : (
                    <div className="card animate-fade-up" style={{ padding: 0, overflow: 'hidden' }}>
                        <ExamTable
                            exams={filtered}
                            onPublish={handlePublish}
                            onDelete={handleDelete}
                            onEdit={handleEdit}
                            onView={handleView}
                        />
                    </div>
                )}
            </div>
        </Layout>
    );
}
