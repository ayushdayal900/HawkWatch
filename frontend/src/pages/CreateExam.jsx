/**
 * pages/CreateExam.jsx
 * Full exam builder: details → question builder → preview → save/publish.
 */

import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import { examAPI, organizationAPI } from '../services/api';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import {
    Plus, Trash2, Save, Send, ChevronDown, ChevronUp,
    BookOpen, Clock, Target, Shield, CheckCircle,
} from 'lucide-react';

/* ─── Constants ──────────────────────────────────────────────────────── */
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

/* ─── Sub-components ─────────────────────────────────────────────────── */
function Toggle({ label, checked, onChange, description }) {
    return (
        <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', cursor: 'pointer', padding: '0.5rem 0' }}>
            <div
                onClick={onChange}
                style={{
                    width: 38, height: 22, borderRadius: 999, flexShrink: 0, marginTop: 2,
                    background: checked ? '#3B82F6' : '#CBD5E1',
                    position: 'relative', transition: 'background 0.2s', cursor: 'pointer',
                }}
            >
                <div style={{
                    position: 'absolute', top: 3, left: checked ? 18 : 3,
                    width: 16, height: 16, borderRadius: '50%', background: '#fff',
                    transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                }} />
            </div>
            <div>
                <div style={{ fontSize: '0.875rem', fontWeight: 500, color: '#1E293B' }}>{label}</div>
                {description && <div style={{ fontSize: '0.75rem', color: '#94A3B8', marginTop: 2 }}>{description}</div>}
            </div>
        </label>
    );
}

function SectionCard({ title, icon: Icon, children, accent = '#3B82F6' }) {
    return (
        <div className="card animate-fade-up" style={{ marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1.25rem', paddingBottom: '0.75rem', borderBottom: '1px solid #F1F5F9' }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: `${accent}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Icon size={16} color={accent} />
                </div>
                <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600, color: '#1E293B' }}>{title}</h3>
            </div>
            {children}
        </div>
    );
}

function QuestionCard({ question, index, onChange, onRemove, collapsed, onToggleCollapse }) {
    const diffColor = { easy: '#22C55E', medium: '#F59E0B', hard: '#EF4444' };

    return (
        <div style={{
            border: '1px solid #E2E8F0', borderRadius: 10, marginBottom: '0.75rem',
            background: '#FAFAFA', overflow: 'hidden',
        }}>
            {/* Header */}
            <div
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.875rem 1rem', cursor: 'pointer', background: '#F8FAFC' }}
                onClick={onToggleCollapse}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <span style={{
                        width: 26, height: 26, borderRadius: '50%', background: '#3B82F6',
                        color: '#fff', fontSize: '0.75rem', fontWeight: 700,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    }}>{index + 1}</span>
                    <span style={{ fontSize: '0.875rem', fontWeight: 500, color: '#334155', maxWidth: 380, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {question.questionText || <em style={{ color: '#94A3B8' }}>Untitled question</em>}
                    </span>
                    <span style={{ fontSize: '0.7rem', fontWeight: 600, color: diffColor[question.difficulty], background: `${diffColor[question.difficulty]}15`, borderRadius: 999, padding: '2px 8px' }}>
                        {question.difficulty}
                    </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontSize: '0.78rem', color: '#64748B', fontWeight: 600 }}>{question.points} pt{question.points !== 1 ? 's' : ''}</span>
                    <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); onRemove(); }}
                        style={{ background: 'none', border: 'none', color: '#EF4444', cursor: 'pointer', padding: '4px', borderRadius: 6, display: 'flex' }}
                    >
                        <Trash2 size={14} />
                    </button>
                    {collapsed ? <ChevronDown size={14} color="#94A3B8" /> : <ChevronUp size={14} color="#94A3B8" />}
                </div>
            </div>

            {/* Body */}
            {!collapsed && (
                <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
                    {/* Question text */}
                    <div>
                        <label style={{ display: 'block', marginBottom: 4, fontSize: '0.78rem', fontWeight: 600, color: '#475569' }}>Question Text *</label>
                        <textarea
                            className="input"
                            rows={2}
                            required
                            value={question.questionText}
                            onChange={(e) => onChange('questionText', e.target.value)}
                            placeholder="Enter the question…"
                            style={{ resize: 'vertical' }}
                        />
                    </div>

                    {/* Options */}
                    <div>
                        <label style={{ display: 'block', marginBottom: 6, fontSize: '0.78rem', fontWeight: 600, color: '#475569' }}>Options (A–D) *</label>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            {question.options.map((opt, oi) => (
                                <div key={opt.label} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <input
                                        type="radio"
                                        name={`correct-${index}`}
                                        checked={question.correctAnswer === opt.label}
                                        onChange={() => onChange('correctAnswer', opt.label)}
                                        style={{ accentColor: '#3B82F6', flexShrink: 0 }}
                                        title="Mark as correct answer"
                                    />
                                    <span style={{ fontWeight: 700, color: '#64748B', width: 20, flexShrink: 0 }}>{opt.label}</span>
                                    <input
                                        className="input"
                                        required
                                        value={opt.text}
                                        onChange={(e) => {
                                            const newOpts = question.options.map((o, i) =>
                                                i === oi ? { ...o, text: e.target.value } : o
                                            );
                                            onChange('options', newOpts);
                                        }}
                                        placeholder={`Option ${opt.label}`}
                                        style={{ flex: 1 }}
                                    />
                                    {question.correctAnswer === opt.label && (
                                        <CheckCircle size={16} color="#22C55E" style={{ flexShrink: 0 }} />
                                    )}
                                </div>
                            ))}
                        </div>
                        <p style={{ fontSize: '0.72rem', color: '#94A3B8', margin: '0.4rem 0 0' }}>
                            Select the radio button next to the correct answer.
                        </p>
                    </div>

                    {/* Points + Difficulty */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                        <div>
                            <label style={{ display: 'block', marginBottom: 4, fontSize: '0.78rem', fontWeight: 600, color: '#475569' }}>Points</label>
                            <input
                                className="input"
                                type="number"
                                min={1}
                                max={100}
                                value={question.points}
                                onChange={(e) => onChange('points', parseInt(e.target.value) || 1)}
                            />
                        </div>
                        <div>
                            <label style={{ display: 'block', marginBottom: 4, fontSize: '0.78rem', fontWeight: 600, color: '#475569' }}>Difficulty</label>
                            <select
                                className="input"
                                value={question.difficulty}
                                onChange={(e) => onChange('difficulty', e.target.value)}
                            >
                                <option value="easy">Easy</option>
                                <option value="medium">Medium</option>
                                <option value="hard">Hard</option>
                            </select>
                        </div>
                    </div>

                    {/* Explanation (optional) */}
                    <div>
                        <label style={{ display: 'block', marginBottom: 4, fontSize: '0.78rem', fontWeight: 600, color: '#475569' }}>
                            Explanation <span style={{ fontWeight: 400, color: '#94A3B8' }}>(shown after exam)</span>
                        </label>
                        <input
                            className="input"
                            value={question.explanation}
                            onChange={(e) => onChange('explanation', e.target.value)}
                            placeholder="Why is this the correct answer?"
                        />
                    </div>
                </div>
            )}
        </div>
    );
}

/* ─── Main Page ──────────────────────────────────────────────────────── */
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
    const { user } = useAuth();

    useEffect(() => {
        const fetchOrgs = async () => {
            try {
                const { data } = await organizationAPI.getAll();
                setOrganizations(data.data || []);
            } catch (err) {}
        };
        fetchOrgs();
    }, []);

    /* ── Derived stats ─────────────────────────────────────────────── */
    const totalMarks = useMemo(
        () => form.questions.reduce((s, q) => s + (q.points || 1), 0),
        [form.questions]
    );

    const easyCount   = form.questions.filter((q) => q.difficulty === 'easy').length;
    const mediumCount = form.questions.filter((q) => q.difficulty === 'medium').length;
    const hardCount   = form.questions.filter((q) => q.difficulty === 'hard').length;

    /* ── Form helpers ──────────────────────────────────────────────── */
    const setField = (field, value) => setForm((p) => ({ ...p, [field]: value }));

    const setProctoring = (field, value) =>
        setForm((p) => ({ ...p, proctoring: { ...p.proctoring, [field]: value } }));

    const addQuestion = () => {
        const q = defaultQuestion();
        setForm((p) => ({ ...p, questions: [...p.questions, q] }));
        // Auto-expand new question
        setCollapsed((p) => ({ ...p, [form.questions.length]: false }));
    };

    const removeQuestion = (i) => {
        setForm((p) => ({ ...p, questions: p.questions.filter((_, idx) => idx !== i) }));
    };

    const updateQuestion = (i, field, value) => {
        setForm((p) => {
            const qs = [...p.questions];
            qs[i] = { ...qs[i], [field]: value };
            return { ...p, questions: qs };
        });
    };

    const toggleCollapse = (i) => setCollapsed((p) => ({ ...p, [i]: !p[i] }));

    /* ── Validation ────────────────────────────────────────────────── */
    const validate = () => {
        if (!form.title.trim()) { toast.error('Exam title is required.'); return false; }
        if (form.duration < 5) { toast.error('Duration must be at least 5 minutes.'); return false; }
        if (form.questions.length === 0) { toast.error('Add at least one question.'); return false; }
        for (let i = 0; i < form.questions.length; i++) {
            const q = form.questions[i];
            if (!q.questionText.trim()) { toast.error(`Question ${i + 1}: text is required.`); return false; }
            if (q.options.some((o) => !o.text.trim())) { toast.error(`Question ${i + 1}: all options must have text.`); return false; }
        }
        return true;
    };

    /* ── Submit (save as draft) ────────────────────────────────────── */
    const handleSave = async (e) => {
        e?.preventDefault();
        if (!form.title.trim()) { toast.error('Exam title is required.'); return; }
        if (form.duration < 5)  { toast.error('Duration must be at least 5 minutes.'); return; }
        setSaving(true);
        try {
            const { data } = await examAPI.create({
                ...form,
                instructions: form.instructions
                    ? form.instructions.split('\n').map((s) => s.trim()).filter(Boolean)
                    : [],
                status: 'draft',
            });
            toast.success('Exam saved as draft!');
            navigate('/exams');
            return data.data._id;
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to save exam.');
        } finally {
            setSaving(false);
        }
    };

    /* ── Publish ────────────────────────────────────────────────────── */
    const handlePublish = async () => {
        if (!validate()) return;
        setPublishing(true);
        try {
            const { data: createData } = await examAPI.create({
                ...form,
                instructions: form.instructions
                    ? form.instructions.split('\n').map((s) => s.trim()).filter(Boolean)
                    : [],
                status: 'draft',
            });
            const examId = createData.data._id;
            await examAPI.publish(examId);
            toast.success('Exam published successfully!');
            navigate('/exams');
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to publish exam.');
        } finally {
            setPublishing(false);
        }
    };

    /* ── Render ─────────────────────────────────────────────────────── */
    return (
        <div style={{ display: 'flex' }}>
            <Sidebar />
            <main className="main-content">
                <Navbar title="Create New Exam" />

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '1.5rem', maxWidth: 1100, margin: '0 auto' }}>

                    {/* ── LEFT: Builder ─────────────────────────────── */}
                    <div>
                        {/* Exam Details */}
                        <SectionCard title="Exam Details" icon={BookOpen}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <div style={{ gridColumn: '1 / -1' }}>
                                    <label style={{ display: 'block', marginBottom: 4, fontSize: '0.8rem', fontWeight: 600, color: '#475569' }}>Title *</label>
                                    <input
                                        className="input"
                                        required
                                        value={form.title}
                                        onChange={(e) => setField('title', e.target.value)}
                                        placeholder="e.g. Midterm Physics Exam"
                                    />
                                </div>
                                <div style={{ gridColumn: '1 / -1' }}>
                                    <label style={{ display: 'block', marginBottom: 4, fontSize: '0.8rem', fontWeight: 600, color: '#475569' }}>Description</label>
                                    <textarea
                                        className="input"
                                        rows={2}
                                        value={form.description}
                                        onChange={(e) => setField('description', e.target.value)}
                                        placeholder="Brief overview of the exam…"
                                        style={{ resize: 'vertical' }}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', marginBottom: 4, fontSize: '0.8rem', fontWeight: 600, color: '#475569' }}>Duration (minutes) *</label>
                                    <input
                                        className="input"
                                        type="number"
                                        min={5}
                                        value={form.duration}
                                        onChange={(e) => setField('duration', parseInt(e.target.value) || 5)}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', marginBottom: 4, fontSize: '0.8rem', fontWeight: 600, color: '#475569' }}>Passing Marks</label>
                                    <input
                                        className="input"
                                        type="number"
                                        min={0}
                                        value={form.passingMarks}
                                        onChange={(e) => setField('passingMarks', parseInt(e.target.value) || 0)}
                                        placeholder={`out of ${totalMarks}`}
                                    />
                                </div>
                                <div style={{ gridColumn: '1 / -1' }}>
                                    <label style={{ display: 'block', marginBottom: 4, fontSize: '0.8rem', fontWeight: 600, color: '#475569' }}>
                                        Instructions <span style={{ fontWeight: 400, color: '#94A3B8' }}>(one per line)</span>
                                    </label>
                                    <textarea
                                        className="input"
                                        rows={3}
                                        value={form.instructions}
                                        onChange={(e) => setField('instructions', e.target.value)}
                                        placeholder="No phones allowed.&#10;Submit before the timer ends.&#10;Ensure good lighting."
                                        style={{ resize: 'vertical' }}
                                    />
                                </div>
                            </div>
                        </SectionCard>

                        {/* Access Settings */}
                        <SectionCard title="Access Settings" icon={Shield} accent="#8B5CF6">
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem' }}>
                                <div>
                                    <label style={{ display: 'block', marginBottom: 4, fontSize: '0.8rem', fontWeight: 600, color: '#475569' }}>Access Level</label>
                                    <select
                                        className="input"
                                        value={form.accessType}
                                        onChange={(e) => {
                                            setField('accessType', e.target.value);
                                            // Reset organization when switching to public
                                            if (e.target.value === 'public') setField('organization', '');
                                            // Auto-select user's org if they switch to organization
                                            if (e.target.value === 'organization' && user?.organization) {
                                                setField('organization', user.organization);
                                            }
                                        }}
                                    >
                                        <option value="public">Public (All Access)</option>
                                        <option value="organization">Organization Only</option>
                                    </select>
                                </div>
                                {form.accessType === 'organization' && (
                                    <div>
                                        <label style={{ display: 'block', marginBottom: 4, fontSize: '0.8rem', fontWeight: 600, color: '#475569' }}>Select Organization</label>
                                        <select
                                            className="input"
                                            value={form.organization}
                                            onChange={(e) => setField('organization', e.target.value)}
                                        >
                                            <option value="">-- Choose an Organization --</option>
                                            {organizations.map(org => (
                                                <option key={org._id} value={org._id}>{org.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                )}
                            </div>
                        </SectionCard>

                        {/* Proctoring Config */}
                        <SectionCard title="Proctoring Settings" icon={Shield} accent="#6366F1">
                            <Toggle
                                label="Enable Proctoring"
                                description="Activate all AI monitoring for this exam"
                                checked={form.proctoring.enabled}
                                onChange={() => setProctoring('enabled', !form.proctoring.enabled)}
                            />
                            {form.proctoring.enabled && (
                                <div style={{ marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px solid #F1F5F9', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.25rem 1.5rem' }}>
                                    <Toggle label="Webcam Required"      checked={form.proctoring.webcamRequired}      onChange={() => setProctoring('webcamRequired',      !form.proctoring.webcamRequired)} />
                                    <Toggle label="Fullscreen Required"  checked={form.proctoring.fullscreenRequired}  onChange={() => setProctoring('fullscreenRequired',  !form.proctoring.fullscreenRequired)} />
                                    <Toggle label="Face Detection"       checked={form.proctoring.faceDetection}       onChange={() => setProctoring('faceDetection',       !form.proctoring.faceDetection)} />
                                    <Toggle label="Deepfake Detection"   checked={form.proctoring.deepfakeDetection}   onChange={() => setProctoring('deepfakeDetection',   !form.proctoring.deepfakeDetection)} />
                                    <Toggle label="Behavioral Biometrics" checked={form.proctoring.behavioralBiometrics} onChange={() => setProctoring('behavioralBiometrics', !form.proctoring.behavioralBiometrics)} />
                                    <div>
                                        <label style={{ display: 'block', marginBottom: 4, marginTop: '0.5rem', fontSize: '0.78rem', fontWeight: 600, color: '#475569' }}>Tab Switch Limit</label>
                                        <input
                                            className="input"
                                            type="number"
                                            min={1}
                                            max={10}
                                            value={form.proctoring.tabSwitchLimit}
                                            onChange={(e) => setProctoring('tabSwitchLimit', parseInt(e.target.value) || 3)}
                                            style={{ width: 80 }}
                                        />
                                    </div>
                                </div>
                            )}
                        </SectionCard>

                        {/* Question Builder */}
                        <SectionCard title={`Questions (${form.questions.length})`} icon={Target} accent="#22C55E">
                            {form.questions.length === 0 && (
                                <div style={{ textAlign: 'center', padding: '2rem 0', color: '#94A3B8', fontSize: '0.875rem' }}>
                                    No questions yet. Click "Add Question" to begin.
                                </div>
                            )}
                            {form.questions.map((q, i) => (
                                <QuestionCard
                                    key={i}
                                    question={q}
                                    index={i}
                                    collapsed={collapsed[i] !== false}
                                    onToggleCollapse={() => toggleCollapse(i)}
                                    onChange={(field, value) => updateQuestion(i, field, value)}
                                    onRemove={() => removeQuestion(i)}
                                />
                            ))}
                            <button type="button" className="btn-secondary" onClick={addQuestion} style={{ width: '100%', justifyContent: 'center' }}>
                                <Plus size={16} /> Add Question
                            </button>
                        </SectionCard>
                    </div>

                    {/* ── RIGHT: Preview Panel ───────────────────────── */}
                    <div>
                        <div style={{ position: 'sticky', top: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {/* Stats card */}
                            <div className="card animate-fade-up">
                                <h4 style={{ margin: '0 0 1rem', fontSize: '0.9rem', fontWeight: 600, color: '#1E293B' }}>Exam Preview</h4>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                                    {[
                                        { label: 'Questions',     value: form.questions.length },
                                        { label: 'Total Marks',   value: totalMarks },
                                        { label: 'Passing Marks', value: form.passingMarks || '—' },
                                        { label: 'Duration',      value: `${form.duration} min` },
                                        { label: 'Pass Rate',     value: totalMarks > 0 && form.passingMarks > 0 ? `${Math.round((form.passingMarks / totalMarks) * 100)}%` : '—' },
                                    ].map(({ label, value }) => (
                                        <div key={label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem' }}>
                                            <span style={{ color: '#64748B' }}>{label}</span>
                                            <span style={{ fontWeight: 600, color: '#1E293B' }}>{value}</span>
                                        </div>
                                    ))}
                                </div>

                                {form.questions.length > 0 && (
                                    <>
                                        <div className="divider" />
                                        <div style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 600, marginBottom: '0.5rem' }}>Difficulty Breakdown</div>
                                        {[
                                            { label: 'Easy',   count: easyCount,   color: '#22C55E' },
                                            { label: 'Medium', count: mediumCount, color: '#F59E0B' },
                                            { label: 'Hard',   count: hardCount,   color: '#EF4444' },
                                        ].map(({ label, count, color }) => (
                                            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
                                                <span style={{ width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0 }} />
                                                <span style={{ flex: 1, fontSize: '0.78rem', color: '#64748B' }}>{label}</span>
                                                <span style={{ fontSize: '0.78rem', fontWeight: 600, color }}>{count}</span>
                                            </div>
                                        ))}
                                    </>
                                )}
                            </div>

                            {/* Action buttons */}
                            <button
                                type="button"
                                className="btn-secondary"
                                onClick={handleSave}
                                disabled={saving || publishing}
                                style={{ width: '100%', justifyContent: 'center' }}
                            >
                                <Save size={16} /> {saving ? 'Saving…' : 'Save as Draft'}
                            </button>
                            <button
                                type="button"
                                className="btn-primary"
                                onClick={handlePublish}
                                disabled={saving || publishing || form.questions.length === 0}
                                style={{ width: '100%', justifyContent: 'center' }}
                            >
                                <Send size={16} /> {publishing ? 'Publishing…' : 'Save & Publish'}
                            </button>
                            {form.questions.length === 0 && (
                                <p style={{ fontSize: '0.72rem', color: '#94A3B8', textAlign: 'center', margin: 0 }}>
                                    Add at least 1 question to publish.
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
