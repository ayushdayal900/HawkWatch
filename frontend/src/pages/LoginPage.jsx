import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
    Eye, EyeOff, ShieldCheck,
    Brain, Fingerprint, Eye as EyeAI,
    AlertCircle, Loader2,
} from 'lucide-react';
import toast from 'react-hot-toast';

/* Role → redirect mapping */
const ROLE_REDIRECT = {
    admin:    '/dashboard',
    examiner: '/dashboard',
    student:  '/dashboard',
};

/* Feature highlights shown in the left panel */
const FEATURES = [
    {
        icon: EyeAI,
        title: 'MediaPipe Face Mesh',
        desc:  '468-landmark real-time tracking',
        color: '#3B82F6',
    },
    {
        icon: Brain,
        title: 'Deepfake Detection',
        desc:  'EfficientNet — FaceForensics++',
        color: '#6366F1',
    },
    {
        icon: Fingerprint,
        title: 'Behavioral Biometrics',
        desc:  'Typing rhythm & mouse dynamics',
        color: '#22C55E',
    },
];

export default function LoginPage() {
    const { login }    = useAuth();
    const navigate     = useNavigate();
    const location     = useLocation();

    const [form,    setForm]    = useState({ email: '', password: '' });
    const [showPwd, setShowPwd] = useState(false);
    const [loading, setLoading] = useState(false);
    const [errors,  setErrors]  = useState({});   // field-level validation

    /* ── After login, go back to the page they tried to visit first ── */
    const from = location.state?.from?.pathname || null;

    /* ── Client-side validation ────────────────────────────────────── */
    const validate = () => {
        const e = {};
        if (!form.email)    e.email    = 'Email is required.';
        else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = 'Enter a valid email.';
        if (!form.password) e.password = 'Password is required.';
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    /* ── Submit ────────────────────────────────────────────────────── */
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validate()) return;

        setLoading(true);
        try {
            const user = await login(form.email.trim(), form.password);
            toast.success(`Welcome back, ${user.name.split(' ')[0]}! 👋`);
            navigate(from ?? ROLE_REDIRECT[user.role] ?? '/dashboard', { replace: true });
        } catch (err) {
            const msg  = err.response?.data?.message || 'Login failed. Please try again.';
            const code = err.response?.data?.code;

            if (code === 'INVALID_CREDENTIALS') {
                setErrors({ password: 'Incorrect email or password.' });
            } else if (code === 'ACCOUNT_DEACTIVATED') {
                toast.error(msg, { duration: 5000 });
            } else {
                toast.error(msg);
            }
        } finally {
            setLoading(false);
        }
    };

    /* ── Helpers ───────────────────────────────────────────────────── */
    const field = (key) => ({
        value:    form[key],
        onChange: (e) => {
            setForm({ ...form, [key]: e.target.value });
            if (errors[key]) setErrors({ ...errors, [key]: '' });
        },
    });

    return (
        <div style={{ minHeight: '100vh', display: 'flex', background: '#F8FAFC' }}>

            {/* ── Left brand panel ─────────────────────────────────── */}
            <div style={{
                width: '44%', flexShrink: 0,
                background: 'linear-gradient(160deg, #0F172A 0%, #1E293B 60%, #1e3a5f 100%)',
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                padding: '3rem 2.5rem',
            }}>
                <div style={{ maxWidth: 340, width: '100%' }}>

                    {/* Logo */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '3rem' }}>
                        <div style={{
                            width: 44, height: 44, borderRadius: 12,
                            background: 'linear-gradient(135deg, #3B82F6 0%, #6366F1 100%)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            boxShadow: '0 4px 16px rgba(59,130,246,0.4)',
                        }}>
                            <ShieldCheck size={24} color="#fff" />
                        </div>
                        <span style={{ fontWeight: 800, fontSize: '1.3rem', color: '#F8FAFC', letterSpacing: '-0.01em' }}>
                            HawkWatch
                        </span>
                    </div>

                    {/* Headline */}
                    <h2 style={{
                        color: '#F1F5F9', fontSize: '1.85rem', fontWeight: 700,
                        margin: '0 0 0.85rem', lineHeight: 1.25, letterSpacing: '-0.02em',
                    }}>
                        AI-Powered<br/>Secure Examinations
                    </h2>
                    <p style={{ color: '#94A3B8', fontSize: '0.88rem', lineHeight: 1.7, margin: '0 0 2.5rem' }}>
                        Multimodal proctoring that detects cheating in real time — without compromising the candidate experience.
                    </p>

                    {/* Feature list */}
                    {/* eslint-disable-next-line no-unused-vars */}
                    {FEATURES.map(({ icon: Icon, title, desc, color }) => (
                        <div key={title} style={{
                            display: 'flex', alignItems: 'center', gap: '0.9rem',
                            marginBottom: '1.1rem',
                        }}>
                            <div style={{
                                width: 34, height: 34, borderRadius: 9, flexShrink: 0,
                                background: `${color}22`,
                                border: `1px solid ${color}44`,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}>
                                <Icon size={16} color={color} />
                            </div>
                            <div>
                                <div style={{ color: '#E2E8F0', fontSize: '0.82rem', fontWeight: 600 }}>{title}</div>
                                <div style={{ color: '#64748B', fontSize: '0.74rem', marginTop: 1 }}>{desc}</div>
                            </div>
                        </div>
                    ))}

                    {/* Trust badge */}
                    <div style={{
                        marginTop: '2.5rem', padding: '0.65rem 1rem',
                        background: 'rgba(59,130,246,0.08)',
                        border: '1px solid rgba(59,130,246,0.2)',
                        borderRadius: 10,
                        display: 'flex', alignItems: 'center', gap: '0.6rem',
                    }}>
                        <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#22C55E', flexShrink: 0 }} />
                        <span style={{ color: '#94A3B8', fontSize: '0.75rem' }}>
                            All sessions are monitored &amp; encrypted at rest.
                        </span>
                    </div>
                </div>
            </div>

            {/* ── Right form panel ──────────────────────────────────── */}
            <div style={{
                flex: 1, display: 'flex', alignItems: 'center',
                justifyContent: 'center', padding: '2.5rem 2rem',
            }}>
                <div style={{ width: '100%', maxWidth: 400 }}>

                    {/* Header */}
                    <div style={{ marginBottom: '2rem' }}>
                        <h1 style={{
                            fontWeight: 700, fontSize: '1.6rem',
                            color: '#0F172A', margin: '0 0 0.4rem',
                            letterSpacing: '-0.015em',
                        }}>
                            Sign in to your account
                        </h1>
                        <p style={{ color: '#64748B', fontSize: '0.85rem', margin: 0 }}>
                            Don&apos;t have an account?{' '}
                            <Link to="/register" style={{ color: '#3B82F6', fontWeight: 600, textDecoration: 'none' }}>
                                Get started
                            </Link>
                        </p>
                    </div>

                    {/* Form */}
                    <form id="login-form" onSubmit={handleSubmit} noValidate
                        style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

                        {/* Email */}
                        <div>
                            <label style={labelStyle}>Email address</label>
                            <input
                                id="login-email"
                                className="input"
                                type="email"
                                placeholder="you@example.com"
                                autoComplete="email"
                                style={errors.email ? inputErrorStyle : {}}
                                {...field('email')}
                                required
                            />
                            {errors.email && <FieldError msg={errors.email} />}
                        </div>

                        {/* Password */}
                        <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                                <label style={labelStyle}>Password</label>
                                {/* Forgot password placeholder */}
                                <span style={{ fontSize: '0.78rem', color: '#3B82F6', fontWeight: 500, cursor: 'pointer' }}>
                                    Forgot password?
                                </span>
                            </div>
                            <div style={{ position: 'relative' }}>
                                <input
                                    id="login-password"
                                    className="input"
                                    type={showPwd ? 'text' : 'password'}
                                    placeholder="••••••••"
                                    autoComplete="current-password"
                                    style={{ paddingRight: '2.75rem', ...(errors.password ? inputErrorStyle : {}) }}
                                    {...field('password')}
                                    required
                                />
                                <button
                                    type="button"
                                    id="toggle-password"
                                    onClick={() => setShowPwd(!showPwd)}
                                    style={eyeBtnStyle}
                                    aria-label={showPwd ? 'Hide password' : 'Show password'}
                                >
                                    {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>
                            {errors.password && <FieldError msg={errors.password} />}
                        </div>

                        {/* Submit */}
                        <button
                            id="login-submit"
                            className="btn-primary"
                            type="submit"
                            disabled={loading}
                            style={{ width: '100%', justifyContent: 'center', padding: '0.8rem', marginTop: '0.25rem', fontSize: '0.95rem' }}
                        >
                            {loading
                                ? <><Loader2 size={16} style={{ animation: 'spin 0.8s linear infinite' }} /> Signing in…</>
                                : 'Sign In'}
                        </button>
                    </form>

                    {/* Divider */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', margin: '1.75rem 0' }}>
                        <div style={{ flex: 1, height: 1, background: '#E2E8F0' }} />
                        <span style={{ fontSize: '0.75rem', color: '#94A3B8' }}>protected by</span>
                        <div style={{ flex: 1, height: 1, background: '#E2E8F0' }} />
                    </div>
                    <div style={{ textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}>
                        <ShieldCheck size={14} color="#3B82F6" />
                        <span style={{ fontSize: '0.75rem', color: '#94A3B8' }}>HawkWatch AI Proctoring</span>
                    </div>
                </div>
            </div>

            {/* Inline keyframe for spinner */}
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
    );
}

/* ── Sub-components ─────────────────────────────────────────────────── */
function FieldError({ msg }) {
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginTop: 5 }}>
            <AlertCircle size={13} color="#EF4444" />
            <span style={{ fontSize: '0.77rem', color: '#EF4444' }}>{msg}</span>
        </div>
    );
}

/* ── Shared inline styles ───────────────────────────────────────────── */
const labelStyle = {
    display: 'block', fontSize: '0.82rem',
    fontWeight: 600, color: '#374151', marginBottom: 6,
};

const inputErrorStyle = {
    borderColor: '#EF4444',
    boxShadow: '0 0 0 3px rgba(239,68,68,0.12)',
};

const eyeBtnStyle = {
    position: 'absolute', right: 10, top: '50%',
    transform: 'translateY(-50%)',
    background: 'none', border: 'none',
    cursor: 'pointer', color: '#94A3B8',
    display: 'flex', alignItems: 'center',
    padding: 0,
};
