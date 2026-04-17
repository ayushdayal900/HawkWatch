/**
 * pages/ExamListPage.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Consolidated exam list for all roles:
 *   • Students   → card grid of published exams with "Take Exam" CTA
 *   • Examiners  → table with edit / publish / delete actions + status badge
 *   • Admins     → same as examiner, unrestricted
 *
 * Replaces both the old ExamListPage.jsx and ExamList.jsx.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar   from '../components/Sidebar';
import Navbar    from '../components/Navbar';
import { examAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import toast       from 'react-hot-toast';
import {
    Clock, BookOpen, Target, Search, Plus, Eye, Pencil,
    Trash2, Send, ChevronRight, Filter,
} from 'lucide-react';

/* ─── Helpers ─────────────────────────────────────────────────────────── */
const STATUS_BADGE = {
    published: { cls: 'badge-low',    label: 'Published' },
    draft:     { cls: 'badge-medium', label: 'Draft'     },
    active:    { cls: 'badge-blue',   label: 'Active'    },
    completed: { cls: 'badge-medium', label: 'Completed' },
    archived:  { cls: 'badge-medium', label: 'Archived'  },
};

function StatusBadge({ status }) {
    const { cls, label } = STATUS_BADGE[status] || { cls: 'badge-medium', label: status };
    return <span className={`badge ${cls}`}>{label}</span>;
}

/* ─── Student card view ───────────────────────────────────────────────── */
function ExamCard({ exam, onTake }) {
    return (
        <div className="card animate-fade-up" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                    <h3 style={{ margin: '0 0 0.3rem', fontWeight: 700, fontSize: '1rem', color: '#1E293B' }}>{exam.title}</h3>
                    {exam.description && (
                        <p style={{ margin: 0, fontSize: '0.78rem', color: '#64748B', lineHeight: 1.5 }}>
                            {exam.description.length > 90 ? `${exam.description.slice(0, 90)}…` : exam.description}
                        </p>
                    )}
                </div>
                <StatusBadge status={exam.status} />
            </div>

            {/* Meta */}
            <div style={{ display: 'flex', gap: '1.25rem', fontSize: '0.76rem', color: '#94A3B8' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Clock size={12} />{exam.duration} min</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><BookOpen size={12} />{exam.questions?.length || 0} questions</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Target size={12} />{exam.totalMarks} pts</span>
            </div>

            {/* Proctoring tags */}
            {exam.proctoring?.enabled && (
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {exam.proctoring.faceDetection       && <span style={tagStyle('#3B82F6')}>👁 Face</span>}
                    {exam.proctoring.deepfakeDetection   && <span style={tagStyle('#6366F1')}>🔍 Deepfake</span>}
                    {exam.proctoring.behavioralBiometrics && <span style={tagStyle('#22C55E')}>⌨️ Behavioral</span>}
                </div>
            )}

            {/* CTA */}
            <button
                className="btn-primary"
                onClick={() => onTake(exam)}
                style={{ marginTop: 'auto', justifyContent: 'center' }}
            >
                Take Exam <ChevronRight size={14} />
            </button>
        </div>
    );
}

const tagStyle = (color) => ({
    fontSize: '0.68rem', fontWeight: 600, color,
    background: `${color}15`, borderRadius: 6, padding: '2px 8px',
});

/* ─── Examiner / Admin table view ────────────────────────────────────── */
function ExamTable({ exams, onPublish, onDelete, onEdit, onView }) {
    if (exams.length === 0) return null;
    return (
        <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                <thead>
                    <tr style={{ borderBottom: '2px solid #E2E8F0' }}>
                        {['Title', 'Questions', 'Marks', 'Duration', 'Status', 'Created', 'Actions'].map((h) => (
                            <th key={h} style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 600, fontSize: '0.78rem', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>
                                {h}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {exams.map((exam) => (
                        <tr key={exam._id} style={{ borderBottom: '1px solid #F1F5F9', transition: 'background 0.15s' }}
                            onMouseEnter={(e) => (e.currentTarget.style.background = '#F8FAFC')}
                            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                        >
                            <td style={{ padding: '0.875rem 1rem', maxWidth: 260 }}>
                                <div style={{ fontWeight: 600, color: '#1E293B', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{exam.title}</div>
                                {exam.description && (
                                    <div style={{ fontSize: '0.72rem', color: '#94A3B8', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {exam.description}
                                    </div>
                                )}
                            </td>
                            <td style={{ padding: '0.875rem 1rem', color: '#475569', whiteSpace: 'nowrap' }}>{exam.questions?.length || 0}</td>
                            <td style={{ padding: '0.875rem 1rem', color: '#475569', whiteSpace: 'nowrap' }}>{exam.totalMarks}</td>
                            <td style={{ padding: '0.875rem 1rem', color: '#475569', whiteSpace: 'nowrap' }}>{exam.duration} min</td>
                            <td style={{ padding: '0.875rem 1rem' }}><StatusBadge status={exam.status} /></td>
                            <td style={{ padding: '0.875rem 1rem', color: '#94A3B8', fontSize: '0.75rem', whiteSpace: 'nowrap' }}>
                                {new Date(exam.createdAt).toLocaleDateString()}
                            </td>
                            <td style={{ padding: '0.875rem 1rem' }}>
                                <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                                    <ActionBtn icon={Eye}    title="View"    onClick={() => onView(exam)} />
                                    <ActionBtn icon={Pencil} title="Edit"    onClick={() => onEdit(exam)} color="#3B82F6" />
                                    {exam.status === 'draft' && (
                                        <ActionBtn icon={Send}   title="Publish" onClick={() => onPublish(exam)} color="#22C55E" />
                                    )}
                                    <ActionBtn icon={Trash2} title="Delete"  onClick={() => onDelete(exam)} color="#EF4444" />
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

function ActionBtn({ icon: Icon, title, onClick, color = '#64748B' }) {
    return (
        <button
            title={title}
            onClick={onClick}
            style={{
                width: 30, height: 30, borderRadius: 6, border: 'none',
                background: `${color}15`, color, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.15s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = `${color}25`; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = `${color}15`; }}
        >
            <Icon size={13} />
        </button>
    );
}

/* ─── Main Component ─────────────────────────────────────────────────── */
export default function ExamListPage() {
    const { user } = useAuth();
    const navigate  = useNavigate();
    const isStudent = user?.role === 'student';
    const canManage = user?.role === 'examiner' || user?.role === 'admin';

    const [exams,   setExams]   = useState([]);
    const [loading, setLoading] = useState(true);
    const [search,  setSearch]  = useState('');
    const [statusF, setStatusF] = useState('all');

    /* ── Load ──────────────────────────────────────────────────────── */
    const load = useCallback(() => {
        setLoading(true);
        examAPI.getAll()
            .then((r) => setExams(r.data.data || []))
            .catch(() => toast.error('Failed to load exams.'))
            .finally(() => setLoading(false));
    }, []);

    useEffect(() => { load(); }, [load]);

    /* ── Filtering ─────────────────────────────────────────────────── */
    const filtered = exams.filter((e) => {
        const matchSearch = e.title.toLowerCase().includes(search.toLowerCase());
        const matchStatus = statusF === 'all' || e.status === statusF;
        return matchSearch && matchStatus;
    });

    /* ── Actions ───────────────────────────────────────────────────── */
    const handleTake = (exam) => navigate(`/exam-verification/${exam._id}`);
    const handleView = (exam) => navigate(`/exams/${exam._id}`);
    const handleEdit = () => toast('Edit feature coming soon.', { icon: '🔧' });

    const handlePublish = async (exam) => {
        if (exam.questions?.length === 0) {
            toast.error('Add at least one question before publishing.');
            return;
        }
        try {
            await examAPI.publish(exam._id);
            toast.success(`"${exam.title}" published!`);
            load();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Publish failed.');
        }
    };

    const handleDelete = async (exam) => {
        if (!window.confirm(`Delete "${exam.title}"? This cannot be undone.`)) return;
        try {
            await examAPI.remove(exam._id);
            toast.success('Exam deleted.');
            load();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Delete failed.');
        }
    };

    /* ── Render ─────────────────────────────────────────────────────── */
    return (
        <div style={{ display: 'flex' }}>
            <Sidebar />
            <main className="main-content">
                <Navbar title={isStudent ? 'Available Exams' : 'Manage Exams'} />

                {/* ── Toolbar ─────────────────────────────────────── */}
                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
                    {/* Search */}
                    <div style={{ position: 'relative', flex: 1, minWidth: 200, maxWidth: 340 }}>
                        <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
                        <input
                            className="input"
                            placeholder="Search by title…"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            style={{ paddingLeft: '2rem', fontSize: '0.85rem' }}
                        />
                    </div>

                    {/* Status filter — only for examiners/admins */}
                    {canManage && (
                        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 8 }}>
                            <Filter size={14} color="#94A3B8" />
                            <select
                                className="input"
                                value={statusF}
                                onChange={(e) => setStatusF(e.target.value)}
                                style={{ paddingLeft: '0.75rem', fontSize: '0.85rem', width: 140 }}
                            >
                                <option value="all">All statuses</option>
                                <option value="draft">Draft</option>
                                <option value="published">Published</option>
                                <option value="active">Active</option>
                                <option value="completed">Completed</option>
                            </select>
                        </div>
                    )}

                    {/* Spacer + create button */}
                    <div style={{ marginLeft: 'auto' }}>
                        {canManage && (
                            <button className="btn-primary" onClick={() => navigate('/create-exam')}>
                                <Plus size={16} /> New Exam
                            </button>
                        )}
                    </div>
                </div>

                {/* ── Content ─────────────────────────────────────── */}
                {loading ? (
                    <div style={{ display: 'grid', gridTemplateColumns: isStudent ? 'repeat(auto-fill, minmax(300px,1fr))' : '1fr', gap: '1rem' }}>
                        {[...Array(6)].map((_, i) => (
                            <div key={i} className="skeleton" style={{ height: isStudent ? 200 : 56 }} />
                        ))}
                    </div>
                ) : filtered.length === 0 ? (
                    <div style={{ textAlign: 'center', color: '#94A3B8', padding: '5rem 0', fontSize: '0.9rem' }}>
                        <BookOpen size={36} style={{ marginBottom: '0.75rem', opacity: 0.4 }} />
                        <p style={{ margin: 0 }}>
                            {search || statusF !== 'all' ? 'No exams match your filters.' : isStudent ? 'No published exams available yet.' : 'No exams created yet.'}
                        </p>
                        {canManage && !search && statusF === 'all' && (
                            <button className="btn-primary" onClick={() => navigate('/create-exam')} style={{ marginTop: '1rem' }}>
                                <Plus size={16} /> Create your first exam
                            </button>
                        )}
                    </div>
                ) : isStudent ? (
                    /* ── Card grid for students ─────────────────── */
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px,1fr))', gap: '1rem' }}>
                        {filtered.map((exam) => (
                            <ExamCard key={exam._id} exam={exam} onTake={handleTake} />
                        ))}
                    </div>
                ) : (
                    /* ── Table for examiners / admins ───────────── */
                    <div className="card animate-fade-up" style={{ padding: 0 }}>
                        <ExamTable
                            exams={filtered}
                            onPublish={handlePublish}
                            onDelete={handleDelete}
                            onEdit={handleEdit}
                            onView={handleView}
                        />
                    </div>
                )}
            </main>
        </div>
    );
}
