import { Navigate, useNavigate } from 'react-router-dom';
import { ShieldCheck, Eye, Brain, Activity, ArrowRight, Lock, CheckCircle, Zap, Shield, Globe, Users } from 'lucide-react';
import useAuthStore from '../store/authStore';

const features = [
    {
        icon: Eye,
        title: 'Neural Vision Core',
        desc: 'Advanced face mesh tracking using 468 landmarks at 30fps. Detects absence, spoofing, and head-pose violations instantly.',
        color: 'var(--brand-400)',
    },
    {
        icon: Brain,
        title: 'Deepfake Defense',
        desc: 'Real-time synthesis detection engine fine-tuned on FaceForensics++. Flags synthetic video feeds before they can be exploited.',
        color: '#8B5CF6',
    },
    {
        icon: Activity,
        title: 'Behavioral DNA',
        desc: 'Continuously analyzes typing rhythm and mouse dynamics against enrolled baseline profiles to confirm candidate identity.',
        color: 'var(--success)',
    },
    {
        icon: Lock,
        title: 'Environment Guard',
        desc: 'Hardware-level control for tab switching, copy-paste blocking, and fullscreen enforcement with automated termination.',
        color: 'var(--warning)',
    },
];

const stats = [
    { label: 'Active Sessions', value: '1.2M+', icon: Zap },
    { label: 'Integrity Rating', value: '99.9%', icon: Shield },
    { label: 'Global Partners', value: '450+', icon: Globe },
    { label: 'Candidates', value: '8.4M', icon: Users },
];

export default function LandingPage() {
    const user = useAuthStore(state => state.user);
    const navigate = useNavigate();
    if (user) return <Navigate to="/dashboard" replace />;

    return (
        <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--n-900)' }}>
            
            {/* ── Navigation ── */}
            <header style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '1.25rem 4rem',
                background: 'rgba(255, 255, 255, 0.8)',
                backdropFilter: 'blur(12px)',
                borderBottom: '1px solid var(--border)',
                position: 'sticky', top: 0, zIndex: 100,
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
                    <div style={{
                        width: 36, height: 36, borderRadius: 10, 
                        background: 'linear-gradient(135deg, var(--brand-500) 0%, var(--brand-700) 100%)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        boxShadow: '0 4px 12px rgba(59,130,246,0.3)'
                    }}>
                        <ShieldCheck size={20} color="#fff" />
                    </div>
                    <span style={{ fontWeight: 900, fontSize: '1.25rem', color: 'var(--n-900)', letterSpacing: '-0.03em' }}>
                        HawkWatch<span style={{ color: 'var(--brand-500)' }}>.</span>
                    </span>
                </div>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
                    <nav style={{ display: 'flex', gap: '2rem' }}>
                        {['Features', 'Security', 'Integrations', 'Pricing'].map(item => (
                            <a key={item} href={`#${item.toLowerCase()}`} style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--n-500)', textDecoration: 'none', transition: 'color 0.2s' }}>{item}</a>
                        ))}
                    </nav>
                    <div style={{ height: 20, width: 1, background: 'var(--border)' }} />
                    <div style={{ display: 'flex', gap: '0.75rem' }}>
                        <button className="btn btn-ghost btn-sm" onClick={() => navigate('/login')}>Sign In</button>
                        <button className="btn btn-primary btn-sm" onClick={() => navigate('/register')} style={{ padding: '0.5rem 1.25rem' }}>Get Started</button>
                    </div>
                </div>
            </header>

            {/* ── Hero Section ── */}
            <section style={{ 
                position: 'relative', overflow: 'hidden', 
                padding: '8rem 2rem 6rem', textAlign: 'center',
                background: 'linear-gradient(180deg, #fff 0%, var(--brand-50) 100%)'
            }}>
                {/* Background Blobs */}
                <div style={{ position: 'absolute', top: '-10%', left: '10%', width: '40%', height: '40%', background: 'radial-gradient(circle, var(--brand-200) 0%, transparent 70%)', opacity: 0.4, filter: 'blur(100px)', zIndex: 0 }} />
                <div style={{ position: 'absolute', bottom: '10%', right: '10%', width: '30%', height: '30%', background: 'radial-gradient(circle, #8B5CF6 0%, transparent 70%)', opacity: 0.2, filter: 'blur(80px)', zIndex: 0 }} />

                <div style={{ position: 'relative', zIndex: 1, maxWidth: 900, margin: '0 auto' }}>
                    <div className="badge badge-info animate-fade-up" style={{ marginBottom: '2rem', padding: '0.5rem 1rem', fontSize: '0.8rem', fontWeight: 800 }}>
                        <Zap size={14} style={{ marginRight: 6 }} /> VERSION 4.2 NOW LIVE
                    </div>
                    
                    <h1 style={{
                        fontSize: 'clamp(2.5rem, 6vw, 4.5rem)', fontWeight: 900, 
                        lineHeight: 1, letterSpacing: '-0.05em', margin: '0 0 1.5rem',
                        color: 'var(--n-900)'
                    }}>
                        The Gold Standard for<br/>
                        <span style={{
                            background: 'linear-gradient(135deg, var(--brand-600) 0%, #8B5CF6 100%)',
                            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                        }}>AI Proctoring.</span>
                    </h1>
                    
                    <p style={{ 
                        fontSize: '1.25rem', color: 'var(--n-500)', lineHeight: 1.6, 
                        maxWidth: 640, margin: '0 auto 3rem', fontWeight: 500 
                    }}>
                        Secure examinations with multimodal AI intelligence. Detect deepfakes, 
                        identity fraud, and environment breaches in real-time.
                    </p>
                    
                    <div style={{ display: 'flex', gap: '1.25rem', justifyContent: 'center' }}>
                        <button className="btn btn-primary btn-lg" onClick={() => navigate('/register')} style={{ padding: '1rem 2.5rem', fontSize: '1.1rem', boxShadow: '0 10px 25px rgba(59,130,246,0.3)' }}>
                            Start Free Trial <ArrowRight size={20} style={{ marginLeft: 8 }} />
                        </button>
                        <button className="btn btn-secondary btn-lg" onClick={() => navigate('/login')} style={{ padding: '1rem 2.5rem', fontSize: '1.1rem', background: '#fff' }}>
                            View Enterprise Demo
                        </button>
                    </div>
                </div>

                {/* Dashboard Preview Mockup */}
                <div style={{ marginTop: '5rem', position: 'relative', zIndex: 2, maxWidth: 1000, margin: '5rem auto 0', padding: '0 2rem' }}>
                    <div className="card animate-fade-up" style={{ padding: '0.5rem', borderRadius: 24, background: 'rgba(255,255,255,0.4)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.6)', boxShadow: '0 30px 60px rgba(0,0,0,0.1)' }}>
                        <div style={{ borderRadius: 18, overflow: 'hidden', border: '1px solid var(--border)', background: 'var(--n-900)', aspectRatio: '16/9', position: 'relative' }}>
                             <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <div style={{ textAlign: 'center' }}>
                                    <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem', border: '1px solid rgba(255,255,255,0.1)' }}>
                                        <ShieldCheck size={32} color="var(--brand-400)" />
                                    </div>
                                    <div style={{ color: '#fff', fontSize: '1.25rem', fontWeight: 700 }}>Telemetry Stream Active</div>
                                    <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem', marginTop: 4 }}>Live feed from Secure Node #842</div>
                                </div>
                             </div>
                             {/* Abstract UI elements */}
                             <div style={{ position: 'absolute', top: 20, left: 20, width: 200, height: 100, background: 'rgba(255,255,255,0.02)', borderRadius: 12, border: '1px solid rgba(255,255,255,0.05)' }} />
                             <div style={{ position: 'absolute', bottom: 20, right: 20, width: 240, height: 160, background: 'rgba(255,255,255,0.02)', borderRadius: 12, border: '1px solid rgba(255,255,255,0.05)' }} />
                        </div>
                    </div>
                </div>
            </section>

            {/* ── Stats Section ── */}
            <section style={{ padding: '4rem 2rem', background: '#fff', borderBottom: '1px solid var(--border)' }}>
                <div style={{ maxWidth: 1100, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '2rem' }}>
                    {stats.map(s => (
                        <div key={s.label} style={{ textAlign: 'center' }}>
                            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.75rem' }}>
                                <s.icon size={20} color="var(--brand-500)" />
                            </div>
                            <div style={{ fontSize: '2rem', fontWeight: 900, color: 'var(--n-900)', letterSpacing: '-0.03em' }}>{s.value}</div>
                            <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--n-400)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{s.label}</div>
                        </div>
                    ))}
                </div>
            </section>

            {/* ── Features Grid ── */}
            <section id="features" style={{ padding: '8rem 2rem', maxWidth: 1100, margin: '0 auto' }}>
                <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
                    <h2 style={{ fontSize: '2.5rem', fontWeight: 900, letterSpacing: '-0.03em', color: 'var(--n-900)' }}>Military-Grade Protection</h2>
                    <p style={{ color: 'var(--n-500)', fontSize: '1.1rem', marginTop: '0.5rem' }}>The most comprehensive AI monitoring suite ever built for education.</p>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '1.5rem' }}>
                    {features.map(({ icon: Icon, title, desc, color }) => (
                        <div key={title} className="card animate-fade-up" style={{ padding: '2rem', transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)' }}>
                            <div style={{
                                width: 48, height: 48, borderRadius: 14,
                                background: `${color}10`,
                                display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.5rem',
                                border: `1px solid ${color}20`
                            }}>
                                <Icon size={24} color={color} />
                            </div>
                            <h3 style={{ margin: '0 0 0.75rem', fontWeight: 800, fontSize: '1.1rem', color: 'var(--n-900)', letterSpacing: '-0.01em' }}>{title}</h3>
                            <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--n-500)', lineHeight: 1.6 }}>{desc}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* ── Trust / Footer ── */}
            <section style={{ background: 'var(--n-900)', color: '#fff', padding: '4rem 2rem' }}>
                <div style={{ maxWidth: 1100, margin: '0 auto' }}>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '3rem', flexWrap: 'wrap', marginBottom: '4rem', opacity: 0.6 }}>
                        {['MediaPipe AI', 'EfficientNet', 'WebSocket', 'AWS Cloud', 'MongoDB Atlas'].map(t => (
                            <div key={t} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.85rem', fontWeight: 700 }}>
                                <CheckCircle size={16} color="var(--brand-400)" /> {t}
                            </div>
                        ))}
                    </div>

                    <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '3rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <ShieldCheck size={24} color="var(--brand-400)" />
                            <span style={{ fontWeight: 800, fontSize: '1.1rem' }}>HawkWatch.</span>
                        </div>
                        <div style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.4)' }}>
                            &copy; 2026 HawkWatch AI Proctoring. All rights reserved.
                        </div>
                        <div style={{ display: 'flex', gap: '1.5rem' }}>
                            {['Privacy', 'Terms', 'Security', 'SLA'].map(item => (
                                <a key={item} href="#" style={{ color: 'rgba(255,255,255,0.4)', textDecoration: 'none', fontSize: '0.85rem', fontWeight: 600 }}>{item}</a>
                            ))}
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
}
