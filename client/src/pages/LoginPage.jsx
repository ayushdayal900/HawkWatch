import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Eye, EyeOff, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';

export default function LoginPage() {
    const { login } = useAuth();
    const navigate = useNavigate();
    const [form, setForm] = useState({ email: '', password: '' });
    const [show, setShow] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const user = await login(form.email, form.password);
            toast.success(`Welcome back, ${user.name}!`);
            navigate('/dashboard');
        } catch (err) {
            toast.error(err.response?.data?.message || 'Login failed.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            background: '#F8FAFC',
        }}>
            {/* Left brand panel */}
            <div style={{
                width: '45%', background: '#1E293B',
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                padding: '3rem', flexShrink: 0,
            }}>
                <div style={{ maxWidth: 340, width: '100%' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '3rem' }}>
                        <div style={{
                            width: 40, height: 40, borderRadius: 10, background: '#3B82F6',
                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}>
                            <ShieldCheck size={22} color="#fff" />
                        </div>
                        <span style={{ fontWeight: 800, fontSize: '1.25rem', color: '#F8FAFC' }}>HawkWatch</span>
                    </div>

                    <h2 style={{ color: '#F1F5F9', fontSize: '1.75rem', fontWeight: 700, margin: '0 0 1rem', lineHeight: 1.3 }}>
                        AI-Powered Secure Examinations
                    </h2>
                    <p style={{ color: '#94A3B8', fontSize: '0.9rem', lineHeight: 1.7, margin: '0 0 2.5rem' }}>
                        Multimodal proctoring with real-time face detection, deepfake analysis,
                        and behavioral biometrics.
                    </p>

                    {[
                        { icon: '👁', label: 'MediaPipe Face Mesh (468 landmarks)' },
                        { icon: '🔍', label: 'EfficientNet Deepfake Detection' },
                        { icon: '⌨️', label: 'Behavioral Biometrics (SVM)' },
                    ].map(({ icon, label }) => (
                        <div key={label} style={{
                            display: 'flex', alignItems: 'center', gap: '0.75rem',
                            marginBottom: '0.75rem', color: '#CBD5E1', fontSize: '0.82rem'
                        }}>
                            <span>{icon}</span>
                            <span>{label}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Right form panel */}
            <div style={{
                flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem',
            }}>
                <div style={{ width: '100%', maxWidth: 400 }}>
                    <h1 style={{ fontWeight: 700, fontSize: '1.5rem', color: '#1E293B', margin: '0 0 0.4rem' }}>
                        Sign in to your account
                    </h1>
                    <p style={{ color: '#64748B', fontSize: '0.85rem', margin: '0 0 2rem' }}>
                        Don't have an account?{' '}
                        <Link to="/register" style={{ color: '#3B82F6', fontWeight: 600, textDecoration: 'none' }}>Create one</Link>
                    </p>

                    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#374151', marginBottom: 6 }}>
                                Email address
                            </label>
                            <input className="input" type="email" placeholder="you@example.com"
                                value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
                        </div>

                        <div>
                            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#374151', marginBottom: 6 }}>
                                Password
                            </label>
                            <div style={{ position: 'relative' }}>
                                <input className="input" type={show ? 'text' : 'password'} placeholder="••••••••"
                                    value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })}
                                    required style={{ paddingRight: '2.5rem' }} />
                                <button type="button" onClick={() => setShow(!show)} style={{
                                    position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                                    background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8',
                                }}>
                                    {show ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>
                        </div>

                        <button className="btn-primary" type="submit" disabled={loading}
                            style={{ width: '100%', justifyContent: 'center', padding: '0.75rem' }}>
                            {loading ? 'Signing in…' : 'Sign In'}
                        </button>
                    </form>

                    <p style={{ textAlign: 'center', fontSize: '0.72rem', color: '#94A3B8', marginTop: '2rem' }}>
                        All sessions are monitored and recorded for academic integrity.
                    </p>
                </div>
            </div>
        </div>
    );
}
