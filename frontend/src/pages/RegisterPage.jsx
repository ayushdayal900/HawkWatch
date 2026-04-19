import { useState, useMemo, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import useAuthStore from '../store/authStore';
import { organizationAPI } from '../services/api';
import useNotificationStore from '../store/notificationStore';
import {
    Eye, EyeOff, ShieldCheck,
    AlertCircle, CheckCircle2, Loader2,
    User, Mail, Building, Lock, ArrowRight,
    Zap, Shield, Brain, Fingerprint, Eye as EyeAI
} from 'lucide-react';
import toast from 'react-hot-toast';

const pwdRules = [
    { label: '8+ characters',    test: (p) => p.length >= 8 },
    { label: 'Upper & Lower',     test: (p) => /[A-Z]/.test(p) && /[a-z]/.test(p) },
    { label: 'Numbers',           test: (p) => /[0-9]/.test(p) },
];

const FEATURES = [
    {
        icon: EyeAI,
        title: 'Neural Vision Core',
        desc:  '468-landmark biometric triangulation',
        color: 'var(--brand-400)',
    },
    {
        icon: Brain,
        title: 'Deepfake Defense',
        desc:  'Real-time synthesis detection engine',
        color: '#8B5CF6',
    },
    {
        icon: Fingerprint,
        title: 'Behavioral DNA',
        desc:  'Advanced rhythm & pattern analysis',
        color: 'var(--success)',
    },
];

function PasswordStrength({ password }) {
    const passed = pwdRules.filter(r => r.test(password)).length;
    const colors = ['var(--danger)', 'var(--warning)', 'var(--success)'];
    const color  = colors[passed - 1] ?? 'var(--n-200)';

    if (!password) return null;

    return (
        <div style={{ marginTop: 10 }}>
            <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
                {pwdRules.map((_, i) => (
                    <div key={i} style={{
                        flex: 1, height: 4, borderRadius: 99,
                        background: i < passed ? color : 'var(--n-100)',
                        transition: 'background 0.3s',
                        boxShadow: i < passed ? `0 0 8px ${color}40` : 'none'
                    }} />
                ))}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                {pwdRules.map(({ label, test }) => {
                    const ok = test(password);
                    return (
                        <div key={label} style={{
                            display: 'flex', alignItems: 'center', gap: 4,
                            fontSize: '0.65rem', color: ok ? 'var(--n-800)' : 'var(--n-400)',
                            fontWeight: ok ? 700 : 500,
                        }}>
                            {ok ? <CheckCircle2 size={10} color="var(--success)" /> : <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--n-200)' }} />}
                            {label}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

const ROLES = [
    { value: 'student', label: 'Student', desc: 'Taking exams', icon: User },
    { value: 'examiner', label: 'Examiner', desc: 'Monitoring', icon: ShieldCheck },
];

export default function RegisterPage() {
    const register = useAuthStore(state => state.register);
    const navigate     = useNavigate();

    const [form, setForm] = useState({
        name: '', email: '', organization: '',
        password: '', role: 'student',
    });
    const [organizations, setOrganizations] = useState([]);
    const [fetchingOrgs, setFetchingOrgs] = useState(true);
    const [newOrgName, setNewOrgName] = useState('');
    const [showPwd, setShowPwd] = useState(false);
    const [loading, setLoading] = useState(false);
    const [errors,  setErrors]  = useState({});

    useEffect(() => {
        const fetchOrgs = async () => {
            try {
                const { data } = await organizationAPI.getAll();
                setOrganizations(data.data || []);
            } catch (err) {
                console.error('Failed to fetch organizations:', err);
            } finally {
                setFetchingOrgs(false);
            }
        };
        fetchOrgs();
    }, []);

    const validate = () => {
        const e = {};
        if (!form.name.trim()) e.name = 'Required';
        if (!form.email.trim()) e.email = 'Required';
        else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = 'Invalid format';
        if (!form.password) e.password = 'Required';
        if (form.role === 'examiner' && form.organization === 'create_new' && !newOrgName.trim()) {
            e.newOrgName = 'Required';
        }
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validate()) return;

        setLoading(true);
        try {
            await register({
                name:        form.name.trim(),
                email:       form.email.trim(),
                password:    form.password,
                role:        form.role,
                organization: (form.organization === 'individual' || form.organization === '' || form.organization === 'create_new') ? null : form.organization,
                newOrganizationName: (form.role === 'examiner' && form.organization === 'create_new') ? newOrgName.trim() : undefined,
            });
            
            // Add a welcome notification
            useNotificationStore.getState().addNotification('Welcome to HawkWatch! Your account has been created successfully.');
            
            toast.success('Account created! Welcome to HawkWatch. 🦅');
            navigate('/dashboard', { replace: true });
        } catch (err) {
            const msg = err.response?.data?.message || 'Registration failed.';
            toast.error(msg);
        } finally {
            setLoading(false);
        }
    };

    const field = (key) => ({
        value:    form[key],
        onChange: (e) => {
            setForm({ ...form, [key]: e.target.value });
            if (errors[key]) setErrors({ ...errors, [key]: '' });
        },
    });

    const pwdStrong = useMemo(() => pwdRules.every(r => r.test(form.password)), [form.password]);

    return (
        <div style={{ minHeight: '100vh', display: 'flex', background: 'var(--bg)' }}>

            {/* Left Panel: Desktop Only */}
            <div className="hide-mobile" style={{
                flex: 1,
                background: 'linear-gradient(165deg, #020617 0%, #0f172a 50%, #1e1b4b 100%)',
                display: 'flex', flexDirection: 'column',
                padding: '4rem 3.5rem',
                position: 'relative',
                overflow: 'hidden',
                color: '#fff'
            }}>
                <div style={{ position: 'absolute', top: '-10%', right: '-10%', width: '60%', height: '60%', background: 'radial-gradient(circle, var(--brand-500) 0%, transparent 70%)', opacity: 0.1, filter: 'blur(80px)' }} />
                
                <div style={{ position: 'relative', zIndex: 1, height: '100%', display: 'flex', flexDirection: 'column' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '4rem' }}>
                        <div style={{
                            width: 44, height: 44, borderRadius: 12,
                            background: 'linear-gradient(135deg, var(--brand-500) 0%, var(--brand-700) 100%)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            boxShadow: '0 8px 24px rgba(59,130,246,0.3)',
                        }}>
                            <ShieldCheck size={26} color="#fff" />
                        </div>
                        <span style={{ fontWeight: 900, fontSize: '1.4rem', letterSpacing: '-0.03em' }}>HawkWatch<span style={{ color: 'var(--brand-400)' }}>.</span></span>
                    </div>

                    <div style={{ flex: 1 }}>
                        <h1 style={{
                            fontSize: '3rem', fontWeight: 900,
                            lineHeight: 1.1, letterSpacing: '-0.04em',
                            margin: '0 0 1.5rem',
                            background: 'linear-gradient(to bottom right, #fff 40%, rgba(255,255,255,0.6) 100%)',
                            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent'
                        }}>
                            Start Your<br/>Security Journey.
                        </h1>
                        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '1rem', lineHeight: 1.6, maxWidth: '360px', margin: '0 0 3rem' }}>
                            Join thousands of educators and students using the most advanced AI proctoring platform.
                        </p>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
                            {FEATURES.map((f) => (
                                <div key={f.title} style={{ display: 'flex', gap: '1.1rem', alignItems: 'flex-start' }}>
                                    <div style={{ 
                                        width: 38, height: 38, borderRadius: 10, flexShrink: 0,
                                        background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                                    }}>
                                        <f.icon size={18} color={f.color} />
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '0.875rem', fontWeight: 700, marginBottom: 2 }}>{f.title}</div>
                                        <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)' }}>{f.desc}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>


                </div>
            </div>

            {/* ── Right Panel ─────────────────────────────────────────── */}
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem', overflowY: 'auto', minHeight: '100vh' }}>
                <div style={{ width: '100%', maxWidth: 520 }}>
                    <div style={{ marginBottom: '2.5rem' }}>
                        <h2 style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--n-900)', letterSpacing: '-0.02em', margin: '0 0 0.5rem' }}>
                            Create Profile
                        </h2>
                        <p style={{ color: 'var(--n-500)', fontSize: '0.95rem' }}>
                            Enter your details to register with HawkWatch.
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem' }}>
                            <div>
                                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--n-700)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 8, display: 'block' }}>Full Name</label>
                                <div style={{ position: 'relative' }}>
                                    <input className="input" type="text" placeholder="Jane Smith" style={{ height: '2.75rem', paddingLeft: '2.5rem', ...(errors.name ? { borderColor: 'var(--danger)', background: 'var(--danger-bg)' } : {}) }} {...field('name')} />
                                    <User size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--n-400)' }} />
                                </div>
                            </div>
                            <div>
                                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--n-700)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 8, display: 'block' }}>Email</label>
                                <div style={{ position: 'relative' }}>
                                    <input className="input" type="email" placeholder="name@email.com" style={{ height: '2.75rem', paddingLeft: '2.5rem', ...(errors.email ? { borderColor: 'var(--danger)', background: 'var(--danger-bg)' } : {}) }} {...field('email')} />
                                    <Mail size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--n-400)' }} />
                                </div>
                            </div>
                        </div>

                        <div>
                            <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--n-700)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 8, display: 'block' }}>Organization</label>
                            <div style={{ position: 'relative' }}>
                                <select className="input" disabled={fetchingOrgs} style={{ height: '2.75rem', paddingLeft: '2.5rem', appearance: 'none' }} {...field('organization')}>
                                    <option value="">Select Organization (Optional)</option>
                                    <option value="individual">No Organization / Independent</option>
                                    {form.role === 'examiner' && <option value="create_new">+ Create New Organization</option>}
                                    {organizations.map((org) => <option key={org._id} value={org._id}>{org.name}</option>)}
                                </select>
                                <Building size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--n-400)' }} />
                            </div>
                        </div>

                        {form.organization === 'create_new' && form.role === 'examiner' && (
                            <div>
                                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--n-700)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 8, display: 'block' }}>New Organization Name</label>
                                <div style={{ position: 'relative' }}>
                                    <input className="input" type="text" placeholder="Acme University" value={newOrgName} onChange={(e) => { setNewOrgName(e.target.value); if (errors.newOrgName) setErrors({ ...errors, newOrgName: '' }); }} style={{ height: '2.75rem', paddingLeft: '2.5rem', ...(errors.newOrgName ? { borderColor: 'var(--danger)', background: 'var(--danger-bg)' } : {}) }} />
                                    <Building size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--n-400)' }} />
                                </div>
                                {errors.newOrgName && <span style={{ color: 'var(--danger)', fontSize: '0.75rem', fontWeight: 600, display: 'block', marginTop: '4px' }}>{errors.newOrgName}</span>}
                            </div>
                        )}

                        <div>
                            <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--n-700)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 8, display: 'block' }}>Security Key</label>
                            <div style={{ position: 'relative' }}>
                                <input className="input" type={showPwd ? 'text' : 'password'} placeholder="••••••••••••" style={{ height: '2.75rem', paddingLeft: '2.5rem', paddingRight: '3rem', ...(errors.password ? { borderColor: 'var(--danger)', background: 'var(--danger-bg)' } : {}) }} {...field('password')} />
                                <Lock size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--n-400)' }} />
                                <button type="button" onClick={() => setShowPwd(!showPwd)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--n-400)', cursor: 'pointer' }}>
                                    {showPwd ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                            <PasswordStrength password={form.password} />
                        </div>

                        <div>
                            <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--n-700)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 10, display: 'block' }}>Primary Role</label>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                                {ROLES.map((r) => {
                                    const active = form.role === r.value;
                                    return (
                                        <button key={r.value} type="button" onClick={() => setForm({ ...form, role: r.value })} style={{
                                            padding: '1rem', borderRadius: 12, border: `2px solid ${active ? 'var(--brand-500)' : 'var(--border)'}`,
                                            background: active ? 'var(--brand-50)' : 'transparent', textAlign: 'left', transition: 'all 0.2s', cursor: 'pointer'
                                        }}>
                                            <r.icon size={20} color={active ? 'var(--brand-600)' : 'var(--n-400)'} style={{ marginBottom: 8 }} />
                                            <div style={{ fontSize: '0.875rem', fontWeight: 700, color: active ? 'var(--brand-900)' : 'var(--n-700)' }}>{r.label}</div>
                                            <div style={{ fontSize: '0.75rem', color: active ? 'var(--brand-600)' : 'var(--n-400)', marginTop: 2 }}>{r.desc}</div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        <button className="btn btn-primary btn-lg" type="submit" disabled={loading || (form.password && !pwdStrong)} style={{ height: '3.25rem', justifyContent: 'center', marginTop: '1rem' }}>
                            {loading ? <Loader2 size={20} className="animate-spin" /> : <><ShieldCheck size={18} /> Complete Registration</>}
                        </button>
                    </form>

                    <p style={{ textAlign: 'center', color: 'var(--n-500)', fontSize: '0.9rem', marginTop: '2rem' }}>
                        Already have an account?{' '}
                        <Link to="/login" style={{ color: 'var(--brand-600)', fontWeight: 700, textDecoration: 'none' }}>Sign In</Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
