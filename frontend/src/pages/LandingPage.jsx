import { Navigate, useNavigate } from 'react-router-dom';
import useAuthStore from '../store/authStore';
import { ShieldCheck, Zap, Eye, Globe, ArrowRight, Shield } from 'lucide-react';

export default function LandingPage() {
    const user = useAuthStore(state => state.user);
    const navigate = useNavigate();

    if (user) return <Navigate to="/dashboard" replace />;

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            backgroundColor: '#020617',
            color: '#fff',
            fontFamily: 'Inter, system-ui, sans-serif',
            overflowX: 'hidden'
        }}>
            {/* Nav */}
            <nav style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '1.5rem 2rem',
                position: 'fixed',
                top: 0, left: 0, right: 0,
                background: 'rgba(2, 6, 23, 0.8)',
                backdropFilter: 'blur(12px)',
                zIndex: 1000,
                borderBottom: '1px solid rgba(255,255,255,0.05)'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg, #3B82F6, #6366F1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Shield size={20} color="#fff" />
                    </div>
                    <span style={{ fontWeight: 800, fontSize: '1.25rem', letterSpacing: '-0.03em' }}>HawkWatch</span>
                </div>
                <div style={{ display: 'flex', gap: '1rem' }}>
                    <button onClick={() => navigate('/login')} style={{ background: 'transparent', border: 'none', color: '#94A3B8', fontWeight: 600, cursor: 'pointer', fontSize: '0.9rem' }}>Login</button>
                    <button onClick={() => navigate('/register')} style={{ padding: '0.6rem 1.25rem', background: '#3B82F6', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer', fontSize: '0.9rem', boxShadow: '0 4px 12px rgba(59,130,246,0.3)' }}>Get Started</button>
                </div>
            </nav>

            {/* Hero */}
            <main style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '8rem 2rem 4rem', position: 'relative' }}>
                <div style={{ position: 'absolute', top: '10%', left: '50%', transform: 'translateX(-50%)', width: '80%', height: '60%', background: 'radial-gradient(circle, rgba(59,130,246,0.1) 0%, transparent 70%)', filter: 'blur(100px)', zIndex: 0 }} />
                
                <div className="animate-fade-up" style={{ textAlign: 'center', position: 'relative', zIndex: 1, maxWidth: 900 }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '0.5rem 1rem', borderRadius: 99, background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)', color: '#60A5FA', fontSize: '0.75rem', fontWeight: 700, marginBottom: '2rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        <Zap size={14} /> Next-Gen AI Proctoring
                    </div>
                    
                    <h1 style={{ fontSize: 'clamp(2.5rem, 8vw, 4.5rem)', fontWeight: 900, lineHeight: 1, letterSpacing: '-0.04em', margin: '0 0 1.5rem', background: 'linear-gradient(to bottom right, #fff 50%, rgba(255,255,255,0.5) 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                        Integrity Verified.<br />Powered by Neural Intelligence.
                    </h1>
                    
                    <p style={{ fontSize: 'clamp(1rem, 4vw, 1.25rem)', color: '#94A3B8', maxWidth: 640, margin: '0 auto 3rem', lineHeight: 1.6 }}>
                        Monitor exams in real-time with multimodal biometric analysis, deepfake detection, and behavioral AI tracking.
                    </p>

                    <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                        <button onClick={() => navigate('/register')} style={{ padding: '1rem 2.5rem', background: '#3B82F6', color: '#fff', border: 'none', borderRadius: 12, fontWeight: 700, cursor: 'pointer', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: 10, boxShadow: '0 8px 24px rgba(59,130,246,0.4)' }}>
                            Start Free Trial <ArrowRight size={20} />
                        </button>
                        <button onClick={() => navigate('/login')} style={{ padding: '1rem 2.5rem', background: 'rgba(255,255,255,0.05)', color: '#fff', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, fontWeight: 700, cursor: 'pointer', fontSize: '1.1rem' }}>
                            View Demo
                        </button>
                    </div>
                </div>

                {/* Features Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '2rem', maxWidth: 1200, width: '100%', marginTop: '6rem' }}>
                    {[
                        { icon: Eye, title: 'Neural Vision', desc: 'Real-time eye-tracking and 468-point face triangulation.' },
                        { icon: ShieldCheck, title: 'Deepfake Defense', desc: 'Advanced neural networks detecting synthetic video artifacts.' },
                        { icon: Globe, title: 'Edge Telemetry', desc: 'Global low-latency websocket stream for real-time monitoring.' },
                    ].map((f, i) => (
                        <div key={i} className="card" style={{ padding: '2rem', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 20 }}>
                            <div style={{ width: 48, height: 48, borderRadius: 12, background: 'rgba(59,130,246,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.5rem' }}>
                                <f.icon size={24} color="#3B82F6" />
                            </div>
                            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.75rem' }}>{f.title}</h3>
                            <p style={{ color: '#64748B', fontSize: '0.95rem', lineHeight: 1.5 }}>{f.desc}</p>
                        </div>
                    ))}
                </div>
            </main>

            <footer style={{ padding: '3rem 2rem', borderTop: '1px solid rgba(255,255,255,0.05)', textAlign: 'center', color: '#475569', fontSize: '0.875rem' }}>
                &copy; {new Date().getFullYear()} HawkWatch Neural Systems. All rights reserved.
            </footer>
        </div>
    );
}
