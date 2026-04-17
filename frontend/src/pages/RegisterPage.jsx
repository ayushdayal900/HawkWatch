import { useState, useMemo, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { organizationAPI } from '../services/api';
import {
    Eye, EyeOff, ShieldCheck,
    AlertCircle, CheckCircle2, Loader2,
} from 'lucide-react';
import toast from 'react-hot-toast';

/* ── Password strength checker ──────────────────────────────────────── */
const pwdRules = [
    { label: 'At least 8 characters',    test: (p) => p.length >= 8 },
    { label: 'One uppercase letter',      test: (p) => /[A-Z]/.test(p) },
    { label: 'One number',               test: (p) => /[0-9]/.test(p) },
];

function PasswordStrength({ password }) {
    const passed = pwdRules.filter(r => r.test(password)).length;
    const colors = ['#EF4444', '#F59E0B', '#22C55E'];
    const labels = ['Weak', 'Fair', 'Strong'];
    const color  = colors[passed - 1] ?? '#E2E8F0';

    if (!password) return null;

    return (
        <div style={{ marginTop: 8 }}>
            {/* Bar */}
            <div style={{ display: 'flex', gap: 4, marginBottom: 6 }}>
                {pwdRules.map((_, i) => (
                    <div key={i} style={{
                        flex: 1, height: 3, borderRadius: 99,
                        background: i < passed ? color : '#E2E8F0',
                        transition: 'background 0.3s',
                    }} />
                ))}
            </div>
            {/* Rules */}
            {pwdRules.map(({ label, test }) => {
                const ok = test(password);
                return (
                    <div key={label} style={{
                        display: 'flex', alignItems: 'center', gap: '0.35rem',
                        fontSize: '0.74rem', color: ok ? '#22C55E' : '#94A3B8',
                        marginBottom: 2,
                    }}>
                        {ok
                            ? <CheckCircle2 size={12} color="#22C55E" />
                            : <div style={{ width: 12, height: 12, borderRadius: '50%', border: '1.5px solid #CBD5E1' }} />
                        }
                        {label}
                        {passed === pwdRules.length && label === pwdRules[2].label && (
                            <span style={{ marginLeft: 4, color: '#22C55E', fontWeight: 600 }}>
                                {labels[passed - 1]}
                            </span>
                        )}
                    </div>
                );
            })}
        </div>
    );
}

/* ── Role options ───────────────────────────────────────────────────── */
const ROLES = [
    {
        value: 'student',
        label: 'Student',
        desc:  'Take exams, view your results',
        icon:  '🎓',
    },
    {
        value: 'examiner',
        label: 'Examiner / Instructor',
        desc:  'Create & monitor exams',
        icon:  '📋',
    },
];

export default function RegisterPage() {
    const { register } = useAuth();
    const navigate     = useNavigate();

    const [form, setForm] = useState({
        name: '', email: '', organization: '',
        password: '', role: 'student',
    });
    const [organizations, setOrganizations] = useState([]);
    const [fetchingOrgs, setFetchingOrgs] = useState(true);
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

    /* ── Client-side validation ────────────────────────────────────── */
    const validate = () => {
        const e = {};
        if (!form.name.trim())                    e.name     = 'Full name is required.';
        if (!form.email.trim())                   e.email    = 'Email is required.';
        else if (!/\S+@\S+\.\S+/.test(form.email)) e.email  = 'Enter a valid email.';
        if (!form.password)                       e.password = 'Password is required.';
        else if (!pwdRules.every(r => r.test(form.password)))
                                                  e.password = 'Password does not meet requirements.';
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    /* ── Submit ────────────────────────────────────────────────────── */
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
                organization: form.organization === 'individual' || form.organization === '' ? null : form.organization,
            });
            toast.success('Account created! Welcome to HawkWatch. 🦅');
            navigate('/dashboard', { replace: true });
        } catch (err) {
            const msg    = err.response?.data?.message || 'Registration failed.';
            const code   = err.response?.data?.code;
            const fields = err.response?.data?.errors;

            if (code === 'EMAIL_TAKEN') {
                setErrors({ email: 'An account with this email already exists.' });
            } else if (fields?.length) {
                // Map server validation errors → field-level errors
                const fe = {};
                fields.forEach(({ field, message }) => { fe[field] = message; });
                setErrors(fe);
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

    const pwdStrong = useMemo(
        () => pwdRules.every(r => r.test(form.password)),
        [form.password]
    );

    return (
        <div style={{
            minHeight: '100vh', display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            background: 'linear-gradient(135deg, #F8FAFC 0%, #EFF6FF 100%)',
            padding: '2rem 1rem',
        }}>
            <div style={{ width: '100%', maxWidth: 480 }}>

                {/* ── Header ─────────────────────────────────────── */}
                <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
                    <div style={{
                        display: 'inline-flex', alignItems: 'center',
                        justifyContent: 'center',
                        width: 50, height: 50, borderRadius: 14,
                        background: 'linear-gradient(135deg, #1E293B 0%, #334155 100%)',
                        marginBottom: '0.9rem',
                        boxShadow: '0 8px 24px rgba(30,41,59,0.18)',
                    }}>
                        <ShieldCheck size={26} color="#3B82F6" />
                    </div>
                    <h1 style={{
                        fontWeight: 700, fontSize: '1.5rem',
                        color: '#0F172A', margin: '0 0 0.35rem',
                        letterSpacing: '-0.015em',
                    }}>Create your account</h1>
                    <p style={{ fontSize: '0.84rem', color: '#64748B', margin: 0 }}>
                        Already registered?{' '}
                        <Link to="/login" style={{ color: '#3B82F6', fontWeight: 600, textDecoration: 'none' }}>
                            Sign in
                        </Link>
                    </p>
                </div>

                {/* ── Form card ──────────────────────────────────── */}
                <div className="card animate-fade-up" style={{ padding: '2rem' }}>
                    <form id="register-form" onSubmit={handleSubmit} noValidate
                        style={{ display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>

                        {/* Name + Email (side by side on wider screens) */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                            <div>
                                <label style={labelStyle}>Full Name</label>
                                <input
                                    id="reg-name"
                                    className="input"
                                    type="text"
                                    placeholder="Jane Smith"
                                    autoComplete="name"
                                    style={errors.name ? inputErrorStyle : {}}
                                    {...field('name')}
                                    required
                                />
                                {errors.name && <FieldError msg={errors.name} />}
                            </div>

                            <div>
                                <label style={labelStyle}>Email</label>
                                <input
                                    id="reg-email"
                                    className="input"
                                    type="email"
                                    placeholder="jane@example.com"
                                    autoComplete="email"
                                    style={errors.email ? inputErrorStyle : {}}
                                    {...field('email')}
                                    required
                                />
                                {errors.email && <FieldError msg={errors.email} />}
                            </div>
                        </div>

                        {/* Organization Dropdown */}
                        <div>
                            <label style={labelStyle}>
                                Organization
                                <span style={{ fontWeight: 400, color: '#94A3B8', marginLeft: 4 }}>(optional)</span>
                            </label>
                            <select
                                id="reg-organization"
                                className="input"
                                disabled={fetchingOrgs}
                                style={{ appearance: 'auto', backgroundColor: '#fff' }}
                                {...field('organization')}
                            >
                                <option value="">Select Organization...</option>
                                <option value="individual">Individual (No Organization)</option>
                                {organizations.map((org) => (
                                    <option key={org._id} value={org._id}>
                                        {org.name} {org.code ? `(${org.code})` : ''}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Password */}
                        <div>
                            <label style={labelStyle}>Password</label>
                            <div style={{ position: 'relative' }}>
                                <input
                                    id="reg-password"
                                    className="input"
                                    type={showPwd ? 'text' : 'password'}
                                    placeholder="Min 8 characters"
                                    autoComplete="new-password"
                                    style={{ paddingRight: '2.75rem', ...(errors.password ? inputErrorStyle : {}) }}
                                    {...field('password')}
                                    required
                                />
                                <button
                                    type="button"
                                    id="toggle-reg-password"
                                    onClick={() => setShowPwd(!showPwd)}
                                    style={eyeBtnStyle}
                                    aria-label={showPwd ? 'Hide password' : 'Show password'}
                                >
                                    {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>
                            {errors.password
                                ? <FieldError msg={errors.password} />
                                : <PasswordStrength password={form.password} />
                            }
                        </div>

                        {/* Role selector — card-style */}
                        <div>
                            <label style={labelStyle}>I am a…</label>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem' }}>
                                {ROLES.map(({ value, label, desc, icon }) => {
                                    const selected = form.role === value;
                                    return (
                                        <button
                                            type="button"
                                            key={value}
                                            id={`role-${value}`}
                                            onClick={() => setForm({ ...form, role: value })}
                                            style={{
                                                padding: '0.75rem',
                                                border: `2px solid ${selected ? '#3B82F6' : '#E2E8F0'}`,
                                                borderRadius: 10,
                                                background: selected ? '#EFF6FF' : '#fff',
                                                cursor: 'pointer',
                                                textAlign: 'left',
                                                transition: 'all 0.15s',
                                            }}
                                        >
                                            <div style={{ fontSize: '1.1rem', marginBottom: 4 }}>{icon}</div>
                                            <div style={{ fontWeight: 600, fontSize: '0.82rem', color: selected ? '#1D4ED8' : '#1E293B' }}>
                                                {label}
                                            </div>
                                            <div style={{ fontSize: '0.72rem', color: '#64748B', marginTop: 2 }}>
                                                {desc}
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Submit */}
                        <button
                            id="register-submit"
                            className="btn-primary"
                            type="submit"
                            disabled={loading || (form.password && !pwdStrong)}
                            style={{
                                width: '100%', justifyContent: 'center',
                                padding: '0.8rem', marginTop: '0.25rem',
                                fontSize: '0.95rem',
                                opacity: (loading || (form.password && !pwdStrong)) ? 0.7 : 1,
                            }}
                        >
                            {loading
                                ? <><Loader2 size={16} style={{ animation: 'spin 0.8s linear infinite' }} /> Creating account…</>
                                : 'Create Account'}
                        </button>
                    </form>
                </div>

                <p style={{ textAlign: 'center', fontSize: '0.72rem', color: '#94A3B8', marginTop: '1.25rem' }}>
                    By creating an account you agree to our Terms of Service.<br />
                    Sessions are monitored · Data encrypted at rest.
                </p>
            </div>

            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
    );
}

/* ── Shared sub-components ──────────────────────────────────────────── */
function FieldError({ msg }) {
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginTop: 5 }}>
            <AlertCircle size={13} color="#EF4444" />
            <span style={{ fontSize: '0.77rem', color: '#EF4444' }}>{msg}</span>
        </div>
    );
}

const labelStyle = {
    display: 'block', fontSize: '0.8rem',
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
    display: 'flex', alignItems: 'center', padding: 0,
};
