import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { examAPI, organizationAPI } from '../services/api';
import useAuthStore from '../store/authStore';
import useUIStore from '../store/uiStore';
import Layout from '../components/Layout';
import toast from 'react-hot-toast';
import {
    Plus, Trash2, Save, Send, ChevronDown, ChevronUp,
    BookOpen, Clock, Target, Shield, CheckCircle,
    Info, Settings, Layout as LayoutIcon, Award, AlertCircle, Eye
} from 'lucide-react';

const LABELS = ['A', 'B', 'C', 'D'];

const defaultQuestion = () => ({
    questionText: '',
    type: 'mcq',
    options: LABELS.map((label) => ({ label, text: '' })),
    correctAnswer: 'A',
    points: 1,
    difficulty: 'medium',
    explanation: '',
});

const defaultProctoring = {
    enabled:             true,
    webcamRequired:      true,
    fullscreenRequired:  true,
    faceDetection:       true,
    deepfakeDetection:   true,
    behavioralBiometrics:true,
    tabSwitchLimit:      3,
};

function CustomToggle({ label, checked, onChange, description }) {
    return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem', borderRadius: 10, background: 'var(--n-50)', border: '1px solid var(--border)' }}>
            <div style={{ flex: 1 }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--n-800)' }}>{label}</div>
                {description && <div style={{ fontSize: '0.7rem', color: 'var(--n-400)', marginTop: 2 }}>{description}</div>}
            </div>
            <div
                onClick={onChange}
                style={{
                    width: 44, height: 24, borderRadius: 99, flexShrink: 0,
                    background: checked ? 'var(--brand-500)' : 'var(--n-200)',
                    position: 'relative', transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)', cursor: 'pointer',
                    boxShadow: checked ? '0 0 10px var(--brand-200)' : 'none'
                }}
            >
                <div style={{
                    position: 'absolute', top: 3, left: checked ? 22 : 3,
                    width: 18, height: 18, borderRadius: '50%', background: '#fff',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    boxShadow: 'var(--shadow-sm)'
                }} />
            </div>
        </div>
    );
}

function Section({ title, icon: Icon, children, badge }) {
    return (
        <div className="card animate-fade-up" style={{ marginBottom: '1.5rem', overflow: 'visible' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--brand-50)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Icon size={18} color="var(--brand-600)" />
                    </div>
                    <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: 'var(--n-900)', letterSpacing: '-0.02em' }}>{title}</h3>
                </div>
                {badge && <div className="badge badge-info">{badge}</div>}
            </div>
            {children}
        </div>
    );
}

function QuestionCard({ question, index, onChange, onRemove, collapsed, onToggleCollapse }) {
    const diffColor = { easy: 'var(--success)', medium: 'var(--warning)', hard: 'var(--danger)' };

    return (
        <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--r-md)', marginBottom: '1rem', background: '#fff', overflow: 'hidden', transition: 'box-shadow 0.2s' }}>
            <div
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem', cursor: 'pointer', background: 'var(--n-50)' }}
                onClick={onToggleCollapse}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1 }}>
                    <div style={{ width: 24, height: 24, borderRadius: 6, background: 'var(--brand-500)', color: '#fff', fontSize: '0.75rem', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        {index + 1}
                    </div>
                    <div style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--n-800)', maxWidth: '70%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {question.questionText || <span style={{ color: 'var(--n-400)', fontWeight: 500 }}>Empty Question...</span>}
                    </div>
                    <div className="badge" style={{ background: `${diffColor[question.difficulty]}15`, color: diffColor[question.difficulty], fontSize: '0.65rem' }}>
                        {question.difficulty.toUpperCase()}
                    </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--n-500)' }}>{question.points} PT</div>
                    <button type="button" onClick={(e) => { e.stopPropagation(); onRemove(); }} style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', padding: 4 }}><Trash2 size={16} /></button>
                    {collapsed ? <ChevronDown size={18} color="var(--n-400)" /> : <ChevronUp size={18} color="var(--n-400)" />}
                </div>
            </div>

            {!collapsed && (
                <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    <div>
                        <label style={{ display: 'block', marginBottom: 8, fontSize: '0.75rem', fontWeight: 700, color: 'var(--n-500)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Question Content</label>
                        <textarea className="input" rows={3} value={question.questionText} onChange={(e) => onChange('questionText', e.target.value)} placeholder="Type your question here..." />
                    </div>

                    <div>
                        <label style={{ display: 'block', marginBottom: 10, fontSize: '0.75rem', fontWeight: 700, color: 'var(--n-500)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Multiple Choice Options</label>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            {question.options.map((opt, oi) => (
                                <div key={opt.label} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                    <div 
                                        onClick={() => onChange('correctAnswer', opt.label)}
                                        style={{ 
                                            width: 24, height: 24, borderRadius: '50%', border: `2px solid ${question.correctAnswer === opt.label ? 'var(--success)' : 'var(--border)'}`,
                                            background: question.correctAnswer === opt.label ? 'var(--success)' : 'transparent',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.2s', flexShrink: 0
                                        }}
                                    >
                                        {question.correctAnswer === opt.label && <CheckCircle size={14} color="#fff" />}
                                    </div>
                                    <div style={{ fontWeight: 800, color: 'var(--n-400)', width: 14 }}>{opt.label}</div>
                                    <input
                                        className="input"
                                        value={opt.text}
                                        onChange={(e) => {
                                            const newOpts = question.options.map((o, i) => i === oi ? { ...o, text: e.target.value } : o);
                                            onChange('options', newOpts);
                                        }}
                                        placeholder={`Option ${opt.label} text...`}
                                        style={{ flex: 1, height: '2.5rem' }}
                                    />
                                </div>
                            ))}
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.25rem' }}>
                        <div>
                            <label style={{ display: 'block', marginBottom: 8, fontSize: '0.75rem', fontWeight: 700, color: 'var(--n-500)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Points Allocation</label>
                            <input className="input" type="number" min={1} value={question.points} onChange={(e) => onChange('points', parseInt(e.target.value) || 1)} />
                        </div>
                        <div>
                            <label style={{ display: 'block', marginBottom: 8, fontSize: '0.75rem', fontWeight: 700, color: 'var(--n-500)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Difficulty Level</label>
                            <select className="input" value={question.difficulty} onChange={(e) => onChange('difficulty', e.target.value)}>
                                <option value="easy">Beginner (Easy)</option>
                                <option value="medium">Intermediate (Medium)</option>
                                <option value="hard">Advanced (Hard)</option>
                            </select>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default function CreateExam() {
    const navigate = useNavigate();
    const [saving, setSaving]     = useState(false);
    const [publishing, setPublishing] = useState(false);
    const [collapsed, setCollapsed] = useState({});

    const [form, setForm] = useState({
        title:        '',
        description:  '',
        instructions: '',
        duration:     60,
        passingMarks: 0,
        accessType:   'public',
        organization: '',
        questions:    [],
        proctoring:   { ...defaultProctoring },
    });
    const [organizations, setOrganizations] = useState([]);
    const user = useAuthStore(state => state.user);
    const { setPageTitle } = useUIStore();

    useEffect(() => {
        setPageTitle('Exam Architect');
        const fetchOrgs = async () => {
            try {
                const { data } = await organizationAPI.getAll();
                setOrganizations(data.data || []);
            } catch (err) {}
        };
        fetchOrgs();
    }, []);

    const totalMarks = useMemo(() => form.questions.reduce((s, q) => s + (q.points || 1), 0), [form.questions]);
    const difficultyStats = useMemo(() => ({
        easy:   form.questions.filter(q => q.difficulty === 'easy').length,
        medium: form.questions.filter(q => q.difficulty === 'medium').length,
        hard:   form.questions.filter(q => q.difficulty === 'hard').length,
    }), [form.questions]);

    const setField = (field, value) => setForm(p => ({ ...p, [field]: value }));
    const setProctoring = (field, value) => setForm(p => ({ ...p, proctoring: { ...p.proctoring, [field]: value } }));

    const addQuestion = () => {
        const q = defaultQuestion();
        setForm(p => ({ ...p, questions: [...p.questions, q] }));
        setCollapsed(p => ({ ...p, [form.questions.length]: false }));
    };

    const removeQuestion = (i) => setForm(p => ({ ...p, questions: p.questions.filter((_, idx) => idx !== i) }));
    const updateQuestion = (i, field, value) => {
        setForm(p => {
            const qs = [...p.questions];
            qs[i] = { ...qs[i], [field]: value };
            return { ...p, questions: qs };
        });
    };

    const validate = () => {
        if (!form.title.trim()) { toast.error('Exam title is required.'); return false; }
        if (form.title.trim().length < 3) { toast.error('Exam title must be at least 3 characters.'); return false; }
        if (form.questions.length === 0) { toast.error('Add at least one question.'); return false; }
        
        // Deep validate questions
        for (let i = 0; i < form.questions.length; i++) {
            if (!form.questions[i].questionText.trim()) {
                toast.error(`Question ${i + 1} has no text content.`);
                setCollapsed(p => ({ ...p, [i]: false })); // Expand the problematic question
                return false;
            }
        }
        return true;
    };

    const handleSave = async () => {
        if (!form.title.trim()) return toast.error('Enter a title first.');
        setSaving(true);
        try {
            const payload = {
                ...form,
                instructions: form.instructions ? [form.instructions] : [],
                organization: form.organization || null,
                status: 'draft'
            };
            await examAPI.create(payload);
            toast.success('Draft saved successfully!');
            navigate('/exams');
        } catch (err) { 
            toast.error(err.error || 'Save failed.'); 
        }
        finally { setSaving(false); }
    };

    const handlePublish = async () => {
        if (!validate()) return;
        setPublishing(true);
        try {
            const payload = {
                ...form,
                instructions: form.instructions ? [form.instructions] : [],
                organization: form.organization || null,
                status: 'draft'
            };
            const { data } = await examAPI.create(payload);
            const examId = data.data?._id || data._id;
            
            if (!examId) throw new Error('Failed to retrieve exam ID.');
            
            await examAPI.publish(examId);
            toast.success('Exam is now LIVE!');
            navigate('/exams');
        } catch (err) { 
            toast.error(err.error || 'Publish failed.'); 
        }
        finally { setPublishing(false); }
    };

    return (
        <Layout>
            <div className="animate-fade-in">

                <div className="create-exam-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '2rem', alignItems: 'start' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <Section title="General Information" icon={LayoutIcon}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                <div>
                                    <label style={{ display: 'block', marginBottom: 8, fontSize: '0.75rem', fontWeight: 700, color: 'var(--n-500)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Title</label>
                                    <input className="input" value={form.title} onChange={e => setField('title', e.target.value)} placeholder="e.g., Q1 Advanced Mathematics" style={{ height: '3rem', fontSize: '1rem', fontWeight: 600 }} />
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
                                    <div>
                                        <label style={{ display: 'block', marginBottom: 8, fontSize: '0.75rem', fontWeight: 700, color: 'var(--n-500)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Duration (Minutes)</label>
                                        <div style={{ position: 'relative' }}>
                                            <input className="input" type="number" min={5} value={form.duration} onChange={e => setField('duration', parseInt(e.target.value) || 5)} style={{ paddingLeft: '2.5rem' }} />
                                            <Clock size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--n-400)' }} />
                                        </div>
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', marginBottom: 8, fontSize: '0.75rem', fontWeight: 700, color: 'var(--n-500)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Passing Score</label>
                                        <div style={{ position: 'relative' }}>
                                            <input className="input" type="number" min={0} value={form.passingMarks} onChange={e => setField('passingMarks', parseInt(e.target.value) || 0)} style={{ paddingLeft: '2.5rem' }} />
                                            <Award size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--n-400)' }} />
                                        </div>
                                    </div>
                                </div>
                                <div>
                                    <label style={{ display: 'block', marginBottom: 8, fontSize: '0.75rem', fontWeight: 700, color: 'var(--n-500)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Instructions</label>
                                    <textarea className="input" rows={3} value={form.instructions} onChange={e => setField('instructions', e.target.value)} placeholder="Rules and guidelines for candidates..." />
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.25rem' }}>
                                    <div>
                                        <label style={{ display: 'block', marginBottom: 8, fontSize: '0.75rem', fontWeight: 700, color: 'var(--n-500)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Access Type</label>
                                        <select className="input" value={form.accessType} onChange={e => setField('accessType', e.target.value)}>
                                            <option value="public">Public (All Students)</option>
                                            <option value="organization">My Organization Only</option>
                                        </select>
                                        <p style={{ fontSize: '0.75rem', color: 'var(--n-500)', marginTop: 4 }}>
                                            {form.accessType === 'organization' 
                                                ? 'This exam will only be visible to students within your organization.'
                                                : 'This exam will be visible to everyone on the platform.'}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </Section>

                        <Section title="Proctoring Framework" icon={Shield} badge="Security Core v4.2">
                            <div style={{ marginBottom: '1.25rem' }}>
                                <CustomToggle label="Enable Master Proctoring" description="Activate the AI-based monitoring suite" checked={form.proctoring.enabled} onChange={() => setProctoring('enabled', !form.proctoring.enabled)} />
                            </div>
                            {form.proctoring.enabled && (
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '0.75rem' }}>
                                    <CustomToggle label="Liveness Check" checked={form.proctoring.faceDetection} onChange={() => setProctoring('faceDetection', !form.proctoring.faceDetection)} />
                                    <CustomToggle label="Full Screen Mode" checked={form.proctoring.fullscreenRequired} onChange={() => setProctoring('fullscreenRequired', !form.proctoring.fullscreenRequired)} />
                                    <CustomToggle label="Deepfake Shield" checked={form.proctoring.deepfakeDetection} onChange={() => setProctoring('deepfakeDetection', !form.proctoring.deepfakeDetection)} />
                                    <CustomToggle label="Behavioral AI" checked={form.proctoring.behavioralBiometrics} onChange={() => setProctoring('behavioralBiometrics', !form.proctoring.behavioralBiometrics)} />
                                </div>
                            )}
                        </Section>

                        <Section title={`Question Library (${form.questions.length})`} icon={Target}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                {form.questions.map((q, i) => (
                                    <QuestionCard key={i} question={q} index={i} collapsed={collapsed[i] !== false} onToggleCollapse={() => setCollapsed(p => ({ ...p, [i]: !p[i] }))} onChange={(f, v) => updateQuestion(i, f, v)} onRemove={() => removeQuestion(i)} />
                                ))}
                                <button type="button" className="btn btn-secondary btn-lg" onClick={addQuestion} style={{ width: '100%', borderStyle: 'dashed', background: 'transparent' }}>
                                    <Plus size={20} /> Add New Question
                                </button>
                            </div>
                        </Section>
                    </div>

                    <div className="create-exam-sidebar" style={{ position: 'sticky', top: '2rem', height: 'fit-content', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <div className="card">
                            <h4 style={{ margin: '0 0 1.25rem', fontSize: '0.9rem', fontWeight: 800, color: 'var(--n-900)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Summary Preview</h4>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.85rem', color: 'var(--n-500)' }}><Target size={14}/> Total Marks</div>
                                    <div style={{ fontWeight: 800, color: 'var(--n-900)' }}>{totalMarks}</div>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.85rem', color: 'var(--n-500)' }}><Clock size={14}/> Duration</div>
                                    <div style={{ fontWeight: 800, color: 'var(--n-900)' }}>{form.duration}m</div>
                                </div>
                                <div style={{ margin: '0.5rem 0', borderTop: '1px solid var(--border)' }} />
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
                                        <span style={{ color: 'var(--success)', fontWeight: 700 }}>Beginner</span>
                                        <span style={{ color: 'var(--n-900)', fontWeight: 800 }}>{difficultyStats.easy}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
                                        <span style={{ color: 'var(--warning)', fontWeight: 700 }}>Intermediate</span>
                                        <span style={{ color: 'var(--n-900)', fontWeight: 800 }}>{difficultyStats.medium}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
                                        <span style={{ color: 'var(--danger)', fontWeight: 700 }}>Advanced</span>
                                        <span style={{ color: 'var(--n-900)', fontWeight: 800 }}>{difficultyStats.hard}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <button className="btn btn-secondary btn-lg" onClick={handleSave} disabled={saving} style={{ width: '100%', justifyContent: 'center' }}>
                            <Save size={20} /> {saving ? 'Saving...' : 'Save Draft'}
                        </button>
                        <button className="btn btn-primary btn-lg" onClick={handlePublish} disabled={publishing || !form.questions.length} style={{ width: '100%', justifyContent: 'center' }}>
                            <Send size={20} /> {publishing ? 'Publishing...' : 'Go Live Now'}
                        </button>
                        {!form.questions.length && (
                            <div style={{ display: 'flex', gap: 6, alignItems: 'center', padding: '0.75rem', borderRadius: 8, background: 'var(--n-50)', color: 'var(--n-500)', fontSize: '0.7rem', marginTop: '1rem' }}>
                                <AlertCircle size={14} /> Add questions to enable publishing.
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </Layout>
    );
}
