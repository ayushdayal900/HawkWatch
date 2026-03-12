import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import { useAuth } from '../context/AuthContext';
import { Plus, BookOpen, Clock, Calendar } from 'lucide-react';

export default function ExamList() {
    const { isExaminer, isAdmin } = useAuth();
    const navigate = useNavigate();
    const [exams, setExams] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.get('/exams/list')
            .then(res => setExams(res.data.data))
            .catch(err => console.error('Failed to load exams', err))
            .finally(() => setLoading(false));
    }, []);

    return (
        <div style={{ display: 'flex' }}>
            <Sidebar />
            <main className="main-content">
                <Navbar title="Exams" />
                
                <div style={{ maxWidth: 1000, margin: '0 auto' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                        <div>
                            <h2 style={{ fontSize: '1.5rem', fontWeight: 700, margin: '0 0 0.5rem', color: '#1E293B' }}>Available Exams</h2>
                            <p style={{ color: '#64748B', margin: 0 }}>View and manage your examinations.</p>
                        </div>
                        
                        {(isExaminer || isAdmin) && (
                            <button className="btn-primary" onClick={() => navigate('/create-exam')}>
                                <Plus size={18} /> Create Exam
                            </button>
                        )}
                    </div>

                    {loading ? (
                        <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
                            {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 160, borderRadius: 12 }} />)}
                        </div>
                    ) : exams.length === 0 ? (
                        <div className="card" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
                            <div style={{ display: 'inline-flex', padding: '1rem', background: '#F1F5F9', borderRadius: '50%', marginBottom: '1rem' }}>
                                <BookOpen size={32} color="#94A3B8" />
                            </div>
                            <h3 style={{ fontSize: '1.2rem', margin: '0 0 0.5rem', color: '#334155' }}>No Exams Found</h3>
                            <p style={{ color: '#94A3B8', margin: 0 }}>There are currently no active exams.</p>
                        </div>
                    ) : (
                        <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
                            {exams.map(exam => (
                                <div key={exam._id} className="card animate-fade-up" style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '1.5rem' }}>
                                    <h3 style={{ margin: '0 0 0.5rem', fontSize: '1.15rem', fontWeight: 700, color: '#1E293B' }}>{exam.title}</h3>
                                    <p style={{ margin: '0 0 1.5rem', color: '#64748B', fontSize: '0.875rem', flex: 1, lineHeight: 1.5 }}>
                                        {exam.description || 'No description provided.'}
                                    </p>
                                    
                                    <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', fontSize: '0.8rem', color: '#64748B' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                            <Clock size={14} color="#3B82F6" /> {exam.duration} mins
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                            <BookOpen size={14} color="#8B5CF6" /> {exam.questions?.length || 0} Qs
                                        </div>
                                    </div>

                                    {(!isExaminer && !isAdmin) ? (
                                        <button className="btn-primary" onClick={() => navigate(`/student-exam/${exam._id}`)} style={{ width: '100%', justifyContent: 'center' }}>
                                            Take Exam
                                        </button>
                                    ) : (
                                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                                            <button className="btn-secondary" onClick={() => navigate(`/exams/${exam._id}`)} style={{ flex: 1, justifyContent: 'center' }}>
                                                View Details
                                            </button>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
