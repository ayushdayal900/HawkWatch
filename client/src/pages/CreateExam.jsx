import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import api from '../services/api';
import toast from 'react-hot-toast';
import { Plus, Trash, Save } from 'lucide-react';

export default function CreateExam() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [form, setForm] = useState({
        title: '',
        description: '',
        duration: 60,
        questions: []
    });

    const addQuestion = () => {
        setForm(prev => ({
            ...prev,
            questions: [
                ...prev.questions,
                { questionText: '', options: [{ label: 'A', text: '' }, { label: 'B', text: '' }], correctAnswer: 'A' }
            ]
        }));
    };

    const removeQuestion = (index) => {
        setForm(prev => ({
            ...prev,
            questions: prev.questions.filter((_, i) => i !== index)
        }));
    };

    const updateQuestion = (index, field, value) => {
        setForm(prev => {
            const qs = [...prev.questions];
            qs[index][field] = value;
            return { ...prev, questions: qs };
        });
    };

    const updateOption = (qIndex, oIndex, text) => {
        setForm(prev => {
            const qs = [...prev.questions];
            qs[qIndex].options[oIndex].text = text;
            return { ...prev, questions: qs };
        });
    };

    const addOption = (qIndex) => {
        setForm(prev => {
            const qs = [...prev.questions];
            const labels = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
            const newLabel = labels[qs[qIndex].options.length];
            if (newLabel) {
                qs[qIndex].options.push({ label: newLabel, text: '' });
            }
            return { ...prev, questions: qs };
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            // Need to map our specific format to the server's expected format if different
            // But we already updated Exam model to accept questionText
            const payload = {
                ...form,
                status: 'published' // auto publish for simplicity
            };
            
            await api.post('/exams/create', payload);
            toast.success('Exam created successfully!');
            navigate('/exams'); // redirect to existing list or new one
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to create exam');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ display: 'flex' }}>
            <Sidebar />
            <main className="main-content">
                <Navbar title="Create New Exam" />
                
                <form onSubmit={handleSubmit} style={{ maxWidth: 800, margin: '0 auto', paddingBottom: '4rem' }}>
                    <div className="card animate-fade-up" style={{ marginBottom: '1.5rem' }}>
                        <h3 style={{ margin: '0 0 1rem', fontSize: '1.2rem', color: '#1E293B', fontWeight: 600 }}>Exam Details</h3>
                        
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: 5, fontSize: '0.85rem', fontWeight: 600 }}>Title</label>
                                <input className="input" required value={form.title} onChange={e => setForm({...form, title: e.target.value})} placeholder="e.g. Midterm Physics" />
                            </div>
                            
                            <div>
                                <label style={{ display: 'block', marginBottom: 5, fontSize: '0.85rem', fontWeight: 600 }}>Description</label>
                                <textarea className="input" rows={3} value={form.description} onChange={e => setForm({...form, description: e.target.value})} placeholder="Exam instructions and details" />
                            </div>
                            
                            <div>
                                <label style={{ display: 'block', marginBottom: 5, fontSize: '0.85rem', fontWeight: 600 }}>Duration (minutes)</label>
                                <input className="input" type="number" required min={5} value={form.duration} onChange={e => setForm({...form, duration: parseInt(e.target.value)})} />
                            </div>
                        </div>
                    </div>

                    <div className="card animate-fade-up" style={{ marginBottom: '1.5rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                            <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#1E293B', fontWeight: 600 }}>Questions</h3>
                            <button type="button" className="btn-secondary" onClick={addQuestion}>
                                <Plus size={16} /> Add Question
                            </button>
                        </div>

                        {form.questions.length === 0 && (
                            <div style={{ textAlign: 'center', padding: '2rem', color: '#64748B', fontSize: '0.9rem' }}>
                                No questions added yet.
                            </div>
                        )}

                        {form.questions.map((q, qIndex) => (
                            <div key={qIndex} style={{ padding: '1.25rem', border: '1px solid #E2E8F0', borderRadius: 8, marginBottom: '1rem', background: '#F8FAFC' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                                    <h4 style={{ margin: 0, fontSize: '0.95rem', color: '#334155' }}>Question {qIndex + 1}</h4>
                                    <button type="button" onClick={() => removeQuestion(qIndex)} style={{ background: 'none', border: 'none', color: '#EF4444', cursor: 'pointer' }}>
                                        <Trash size={16} />
                                    </button>
                                </div>
                                
                                <div style={{ marginBottom: '1rem' }}>
                                    <label style={{ display: 'block', marginBottom: 5, fontSize: '0.8rem', fontWeight: 600 }}>Question Text</label>
                                    <input className="input" required value={q.questionText} onChange={e => updateQuestion(qIndex, 'questionText', e.target.value)} />
                                </div>

                                <div style={{ marginBottom: '1rem' }}>
                                    <label style={{ display: 'block', marginBottom: 5, fontSize: '0.8rem', fontWeight: 600 }}>Options</label>
                                    {q.options.map((opt, oIndex) => (
                                        <div key={oIndex} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                                            <span style={{ fontWeight: 600, color: '#64748B', width: 20 }}>{opt.label}.</span>
                                            <input className="input" required value={opt.text} onChange={e => updateOption(qIndex, oIndex, e.target.value)} />
                                        </div>
                                    ))}
                                    {q.options.length < 5 && (
                                        <button type="button" onClick={() => addOption(qIndex)} style={{ marginTop: '0.5rem', background: 'none', border: 'none', color: '#3B82F6', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}>
                                            + Add Option
                                        </button>
                                    )}
                                </div>

                                <div>
                                    <label style={{ display: 'block', marginBottom: 5, fontSize: '0.8rem', fontWeight: 600 }}>Correct Answer (Label)</label>
                                    <select className="input" value={q.correctAnswer} onChange={e => updateQuestion(qIndex, 'correctAnswer', e.target.value)}>
                                        {q.options.map(opt => (
                                            <option key={opt.label} value={opt.label}>{opt.label}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        ))}
                    </div>

                    <button type="submit" className="btn-primary" disabled={loading} style={{ width: '100%', justifyContent: 'center' }}>
                        <Save size={18} /> {loading ? 'Saving...' : 'Create Exam'}
                    </button>
                </form>
            </main>
        </div>
    );
}
