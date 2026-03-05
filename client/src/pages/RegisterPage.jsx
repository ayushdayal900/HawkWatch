import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ShieldCheck, Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';

export default function RegisterPage() {
    const { register } = useAuth();
    const navigate = useNavigate();
    const [form, setForm] = useState({ name: '', email: '', password: '', role: 'student', institution: '' });
    const [show, setShow] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await register(form);
            toast.success('Account created! Welcome to HawkWatch.');
            navigate('/dashboard');
        } catch (err) {
            toast.error(err.response?.data?.message || 'Registration failed.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{
            minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: '#F8FAFC', padding: '2rem 1rem'
        }}>
            <div style={{ width: '100%', maxWidth: 460 }}>

                {/* Header */}
                <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.65rem', marginBottom: '0.75rem' }}>
                        <div style={{
                            width: 38, height: 38, borderRadius: 9, background: '#1E293B',
                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}>
                            <ShieldCheck size={20} color="#3B82F6" />
                        </div>
                        <span style={{ fontWeight: 800, fontSize: '1.2rem', color: '#1E293B' }}>HawkWatch</span>
                    </div>
                    <h1 style={{ fontWeight: 700, fontSize: '1.4rem', color: '#1E293B', margin: '0 0 0.35rem' }}>Create an account</h1>
                    <p style={{ fontSize: '0.84rem', color: '#64748B', margin: 0 }}>
                        Already registered?{' '}
                        <Link to="/login" style={{ color: '#3B82F6', fontWeight: 600, textDecoration: 'none' }}>Sign in</Link>
                    </p>
                </div>

                {/* Form card */}
                <div className="card animate-fade-up" style={{ padding: '2rem' }}>
                    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {[
                            { key: 'name', label: 'Full Name', type: 'text', placeholder: 'Jane Smith', required: true },
                            { key: 'email', label: 'Email', type: 'email', placeholder: 'jane@example.com', required: true },
                            { key: 'institution', label: 'Institution', type: 'text', placeholder: 'University / Organisation', required: false },
                        ].map(({ key, label, type, placeholder, required }) => (
                            <div key={key}>
                                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#374151', marginBottom: 5 }}>{label}</label>
                                <input className="input" type={type} placeholder={placeholder}
                                    value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                                    required={required} />
                            </div>
                        ))}

                        {/* Password */}
                        <div>
                            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#374151', marginBottom: 5 }}>Password</label>
                            <div style={{ position: 'relative' }}>
                                <input className="input" type={show ? 'text' : 'password'} placeholder="Min 8 characters"
                                    value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })}
                                    required minLength={8} style={{ paddingRight: '2.5rem' }} />
                                <button type="button" onClick={() => setShow(!show)} style={{
                                    position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                                    background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8'
                                }}>
                                    {show ? <EyeOff size={15} /> : <Eye size={15} />}
                                </button>
                            </div>
                        </div>

                        {/* Role */}
                        <div>
                            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#374151', marginBottom: 5 }}>Role</label>
                            <select className="input" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                                <option value="student">Student</option>
                                <option value="examiner">Examiner</option>
                            </select>
                        </div>

                        <button className="btn-primary" type="submit" disabled={loading}
                            style={{ width: '100%', justifyContent: 'center', padding: '0.75rem', marginTop: '0.4rem' }}>
                            {loading ? 'Creating account…' : 'Create Account'}
                        </button>
                    </form>
                </div>

                <p style={{ textAlign: 'center', fontSize: '0.72rem', color: '#94A3B8', marginTop: '1.5rem' }}>
                    Sessions are monitored · All data encrypted at rest
                </p>
            </div>
        </div>
    );
}
