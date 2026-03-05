import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Navbar from '../components/Navbar';
import { examAPI } from '../services/api';
import { Clock, BookOpen, Users, ChevronRight, Plus, Search, Eye } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const statusStyle = {
    published: 'badge-low',
    draft: 'badge-medium',
    active: 'badge-blue',
    completed: 'badge-medium',
    archived: 'badge-medium',
};

function ExamCard({ exam, onAction }) {
    const { user } = useAuth();
    const canPublish = (user.role === 'examiner' || user.role === 'admin') && exam.status === 'draft';

    return (
        <div className="card animate-fade-up" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                    <h3 style={{ margin: '0 0 0.3rem', fontWeight: 600, fontSize: '0.97rem', color: '#1E293B' }}>{exam.title}</h3>
                    {exam.description && (
                        <p style={{ margin: 0, fontSize: '0.78rem', color: '#64748B', lineHeight: 1.45 }}>
                            {exam.description.slice(0, 80)}{exam.description.length > 80 ? '…' : ''}
                        </p>
                    )}
                </div>
                <span className={`badge ${statusStyle[exam.status] || 'badge-medium'}`} style={{ marginLeft: '0.5rem', flexShrink: 0 }}>
                    {exam.status}
                </span>
            </div>

            {/* Meta row */}
            <div style={{ display: 'flex', gap: '1.15rem', fontSize: '0.75rem', color: '#94A3B8' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Clock size={12} /> {exam.duration} min</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><BookOpen size={12} /> {exam.questions?.length || 0} Questions</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Users size={12} /> {exam.totalMarks} pts</span>
            </div>

            {/* Proctoring badges */}
            {exam.proctoring?.enabled && (
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {exam.proctoring.faceDetection && <span style={{ fontSize: '0.68rem', fontWeight: 600, color: '#3B82F6', background: '#EFF6FF', borderRadius: 6, padding: '2px 8px' }}>👁 Face</span>}
                    {exam.proctoring.deepfakeDetection && <span style={{ fontSize: '0.68rem', fontWeight: 600, color: '#6366F1', background: '#EEF2FF', borderRadius: 6, padding: '2px 8px' }}>🔍 Deepfake</span>}
                    {exam.proctoring.behavioralBiometrics && <span style={{ fontSize: '0.68rem', fontWeight: 600, color: '#22C55E', background: '#F0FDF4', borderRadius: 6, padding: '2px 8px' }}>⌨️ Behavioral</span>}
                </div>
            )}

            {/* Actions */}
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem' }}>
                {user.role === 'student' && exam.status === 'published' && (
                    <button className="btn-primary" style={{ flex: 1, justifyContent: 'center' }} onClick={() => onAction('take', exam)}>
                        Start Exam <ChevronRight size={14} />
                    </button>
                )}
                {(user.role === 'examiner' || user.role === 'admin') && (
                    <>
                        {canPublish && (
                            <button className="btn-primary" style={{ flex: 1, justifyContent: 'center' }} onClick={() => onAction('publish', exam)}>
                                Publish
                            </button>
                        )}
                        <button className="btn-secondary" style={{ flex: 1, justifyContent: 'center' }} onClick={() => onAction('edit', exam)}>
                            Edit
                        </button>
                        <button className="btn-secondary" style={{ padding: '0.5rem 0.75rem' }} onClick={() => onAction('view', exam)}>
                            <Eye size={15} />
                        </button>
                    </>
                )}
            </div>
        </div>
    );
}

export default function ExamListPage() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [exams, setExams] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    const load = () => {
        setLoading(true);
        examAPI.getAll()
            .then((r) => setExams(r.data.data || []))
            .catch(() => toast.error('Failed to load exams.'))
            .finally(() => setLoading(false));
    };

    useEffect(() => { load(); }, []);

    const handleAction = async (action, exam) => {
        if (action === 'take') navigate(`/exams/${exam._id}`);
        else if (action === 'publish') {
            try { await examAPI.publish(exam._id); toast.success('Exam published!'); load(); }
            catch { toast.error('Publish failed.'); }
        } else if (action === 'edit') navigate(`/exams/${exam._id}/edit`);
    };

    const filtered = exams.filter((e) => e.title.toLowerCase().includes(search.toLowerCase()));

    return (
        <div style={{ display: 'flex' }}>
            <Sidebar />
            <main className="main-content">
                <Navbar title="Exams" />

                {/* Toolbar */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <div style={{ position: 'relative' }}>
                        <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
                        <input className="input" placeholder="Search exams…" value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            style={{ paddingLeft: '2rem', width: 240, fontSize: '0.82rem' }} />
                    </div>
                    {(user.role === 'examiner' || user.role === 'admin') && (
                        <button className="btn-primary" onClick={() => navigate('/exams/new')}>
                            <Plus size={16} /> New Exam
                        </button>
                    )}
                </div>

                {/* Grid */}
                {loading ? (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '1rem' }}>
                        {[...Array(6)].map((_, i) => <div key={i} className="skeleton" style={{ height: 180 }} />)}
                    </div>
                ) : filtered.length === 0 ? (
                    <div style={{ textAlign: 'center', color: '#94A3B8', padding: '4rem 0', fontSize: '0.9rem' }}>
                        {search ? 'No exams match your search.' : 'No exams available yet.'}
                    </div>
                ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px,1fr))', gap: '1rem' }}>
                        {filtered.map((exam) => (
                            <ExamCard key={exam._id} exam={exam} onAction={handleAction} />
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
}
