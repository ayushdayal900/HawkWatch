import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import useAuthStore from '../store/authStore';
import {
    Eye, EyeOff, ShieldCheck,
    Brain, Fingerprint, Eye as EyeAI,
    AlertCircle, Loader2, Zap, Shield
} from 'lucide-react';
import toast from 'react-hot-toast';

const ROLE_REDIRECT = {
    admin:    '/dashboard',
    examiner: '/dashboard',
    student:  '/dashboard',
};

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

export default function LoginPage() {
    const login = useAuthStore(state => state.login);
    const navigate     = useNavigate();
    const location     = useLocation();

    const [form,    setForm]    = useState({ email: '', password: '' });
    const [showPwd, setShowPwd] = useState(false);
    const [loading, setLoading] = useState(false);
    const [errors,  setErrors]  = useState({});

    const from = location.state?.from?.pathname || null;

    const validate = () => {
        const e = {};
        if (!form.email) e.email = 'Required';
        else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = 'Invalid format';
        if (!form.password) e.password = 'Required';
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validate()) return;

        setLoading(true);
        try {
            const user = await login(form.email.trim(), form.password);
            toast.success(`Welcome back, ${user.name.split(' ')[0]}! 👋`);
            navigate(from ?? ROLE_REDIRECT[user.role] ?? '/dashboard', { replace: true });
        } catch (err) {
            const msg  = err.response?.data?.message || 'Login failed.';
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

    return (
        <div style={{ minHeight: '100vh', display: 'flex', background: 'var(--bg)' }}>

            {/* ── Left Panel: Brand Experience (Desktop Only) ───────────────────────── */}
            <div className="hide-mobile" style={{
                flex: 1,
                background: 'linear-gradient(165deg, #020617 0%, #0f172a 50%, #1e1b4b 100%)',
                display: 'flex', flexDirection: 'column',
                padding: '4rem 3.5rem',
                position: 'relative',
                overflow: 'hidden',
                color: '#fff'
            }}>
                {/* Abstract Background Shapes */}
                <div style={{ position: 'absolute', top: '-10%', right: '-10%', width: '60%', height: '60%', background: 'radial-gradient(circle, var(--brand-500) 0%, transparent 70%)', opacity: 0.1, filter: 'blur(80px)' }} />
                <div style={{ position: 'absolute', bottom: '-20%', left: '-10%', width: '80%', height: '80%', background: 'radial-gradient(circle, #4f46e5 0%, transparent 70%)', opacity: 0.1, filter: 'blur(80px)' }} />

                <div style={{ position: 'relative', zIndex: 1, height: '100%', display: 'flex', flexDirection: 'column' }}>
                    {/* Logo */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '5rem' }}>
                        <div style={{
                            width: 48, height: 48, borderRadius: 14,
                            background: 'linear-gradient(135deg, var(--brand-500) 0%, var(--brand-700) 100%)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            boxShadow: '0 8px 24px rgba(59,130,246,0.3)',
                        }}>
                            <ShieldCheck size={28} color="#fff" />
                        </div>
                        <span style={{ fontWeight: 900, fontSize: '1.5rem', letterSpacing: '-0.03em' }}>
                            HawkWatch<span style={{ color: 'var(--brand-400)' }}>.</span>
                        </span>
                    </div>

                    {/* Headline */}
                    <div style={{ flex: 1 }}>
                        <h1 style={{
                            fontSize: '3.5rem', fontWeight: 900,
                            lineHeight: 1, letterSpacing: '-0.04em',
                            margin: '0 0 1.5rem',
                            background: 'linear-gradient(to bottom right, #fff 40%, rgba(255,255,255,0.6) 100%)',
                            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent'
                        }}>
                            Precision<br/>Monitoring<br/>at Scale.
                        </h1>
                        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '1.1rem', lineHeight: 1.6, maxWidth: '420px', margin: '0 0 4rem' }}>
                            Experience the future of academic integrity with our multimodal AI proctoring suite.
                        </p>

                        {/* Features */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                            {FEATURES.map((f) => (
                                <div key={f.title} style={{ display: 'flex', gap: '1.25rem', alignItems: 'flex-start' }}>
                                    <div style={{ 
                                        width: 42, height: 42, borderRadius: 12, flexShrink: 0,
                                        background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                                    }}>
                                        <f.icon size={20} color={f.color} />
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: 4 }}>{f.title}</div>
                                        <div style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.4)' }}>{f.desc}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Footer */}
                    <div style={{ paddingTop: '3rem', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
                        <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.3)' }}>
                            &copy; 2026 HawkWatch AI
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Right Panel: Login Form ───────────────────────────── */}
            <div style={{
                flex: 1, display: 'flex', alignItems: 'center',
                justifyContent: 'center', padding: '1.5rem',
                minHeight: '100vh'
            }}>
                <div style={{ width: '100%', maxWidth: 420 }}>
                    <div style={{ marginBottom: '2.5rem' }}>
                        <h2 style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--n-900)', letterSpacing: '-0.02em', margin: '0 0 0.5rem' }}>
                            Access Dashboard
                        </h2>
                        <p style={{ color: 'var(--n-500)', fontSize: '0.95rem' }}>
                            Securely sign in to your HawkWatch profile.
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                        <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                                <label style={{ fontSize: '0.81rem', fontWeight: 700, color: 'var(--n-700)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                    Email Address
                                </label>
                                {errors.email && <span style={{ color: 'var(--danger)', fontSize: '0.75rem', fontWeight: 600 }}>{errors.email}</span>}
                            </div>
                            <input
                                className="input"
                                type="email"
                                placeholder="name@organization.com"
                                style={{ height: '3rem', ...(errors.email ? { borderColor: 'var(--danger)', background: 'var(--danger-bg)' } : {}) }}
                                {...field('email')}
                            />
                        </div>

                        <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                                <label style={{ fontSize: '0.81rem', fontWeight: 700, color: 'var(--n-700)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                    Security Key
                                </label>
                                {errors.password && <span style={{ color: 'var(--danger)', fontSize: '0.75rem', fontWeight: 600 }}>{errors.password}</span>}
                            </div>
                            <div style={{ position: 'relative' }}>
                                <input
                                    className="input"
                                    type={showPwd ? 'text' : 'password'}
                                    placeholder="••••••••••••"
                                    style={{ height: '3rem', paddingRight: '3rem', ...(errors.password ? { borderColor: 'var(--danger)', background: 'var(--danger-bg)' } : {}) }}
                                    {...field('password')}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPwd(!showPwd)}
                                    style={{ 
                                        position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                                        background: 'none', border: 'none', color: 'var(--n-400)', cursor: 'pointer', padding: 4
                                    }}
                                >
                                    {showPwd ? <EyeOff size={20} /> : <Eye size={20} />}
                                </button>
                            </div>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                            <Link to="/forgot-password" style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--brand-600)', textDecoration: 'none' }}>
                                Troubleshoot access?
                            </Link>
                        </div>

                        <button
                            className="btn btn-primary btn-lg"
                            type="submit"
                            disabled={loading}
                            style={{ height: '3.25rem', justifyContent: 'center', fontSize: '1rem', fontWeight: 700 }}
                        >
                            {loading ? <Loader2 size={20} className="animate-spin" /> : 'Enter Dashboard'}
                        </button>
                    </form>

                    <div style={{ marginTop: '2.5rem', textAlign: 'center' }}>
                        <p style={{ color: 'var(--n-500)', fontSize: '0.9rem' }}>
                            New to the platform?{' '}
                            <Link to="/register" style={{ color: 'var(--brand-600)', fontWeight: 700, textDecoration: 'none' }}>
                                Create an account
                            </Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
