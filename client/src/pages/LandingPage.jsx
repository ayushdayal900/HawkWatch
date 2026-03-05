import { Navigate, useNavigate } from 'react-router-dom';
import { ShieldCheck, Eye, Brain, Activity, ArrowRight, Lock, CheckCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const features = [
    {
        icon: Eye,
        title: 'Real-Time Face Detection',
        desc: 'MediaPipe Face Mesh tracks 468 landmarks at 30fps — detecting absence, multiple faces, and head-pose violations instantly.',
        color: '#3B82F6',
    },
    {
        icon: Brain,
        title: 'Deepfake Detection',
        desc: 'EfficientNet classifier fine-tuned on FaceForensics++ flags synthetic video feeds in real-time before they can be exploited.',
        color: '#6366F1',
    },
    {
        icon: Activity,
        title: 'Behavioral Biometrics',
        desc: 'One-class SVM continuously compares live typing rhythm and mouse dynamics against your enrolled baseline profile.',
        color: '#22C55E',
    },
    {
        icon: Lock,
        title: 'Environment Control',
        desc: 'Tab-switch detection, copy-paste blocking, fullscreen enforcement, and auto-terminate on flag threshold breach.',
        color: '#F59E0B',
    },
];

const trustItems = [
    'MediaPipe & OpenCV',
    'Socket.IO Real-time',
    'MongoDB Atlas',
    'AWS S3 Storage',
    'ArcFace Identity',
    'EfficientNet AI',
];

export default function LandingPage() {
    const { user } = useAuth();
    const navigate = useNavigate();
    if (user) return <Navigate to="/dashboard" replace />;

    return (
        <div style={{ minHeight: '100vh', background: '#F8FAFC' }}>
            {/* Header */}
            <header style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '1.1rem 3rem',
                background: '#FFFFFF',
                borderBottom: '1px solid #E2E8F0',
                position: 'sticky', top: 0, zIndex: 50,
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                    <div style={{
                        width: 32, height: 32, borderRadius: 8, background: '#1E293B',
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                        <Eye size={16} color="#3B82F6" />
                    </div>
                    <span style={{ fontWeight: 800, fontSize: '1.05rem', color: '#1E293B', letterSpacing: '-0.01em' }}>HawkWatch</span>
                </div>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <button className="btn-secondary" onClick={() => navigate('/login')}>Sign In</button>
                    <button className="btn-primary" onClick={() => navigate('/register')}>Get Started</button>
                </div>
            </header>

            {/* Hero */}
            <section style={{ textAlign: 'center', padding: '5rem 2rem 3.5rem', maxWidth: 820, margin: '0 auto' }}>
                <span className="badge badge-blue" style={{ marginBottom: '1.5rem', fontSize: '0.78rem' }}>
                    <ShieldCheck size={13} /> AI-Powered Secure Examination
                </span>
                <h1 style={{
                    fontSize: 'clamp(2rem, 5vw, 3.25rem)', fontWeight: 800, color: '#1E293B',
                    lineHeight: 1.15, margin: '0 0 1.25rem', letterSpacing: '-0.025em',
                }}>
                    Exam Integrity,{' '}
                    <span style={{
                        backgroundImage: 'linear-gradient(135deg, #3B82F6, #6366F1)',
                        WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
                    }}>
                        Powered by AI
                    </span>
                </h1>
                <p style={{ fontSize: '1.05rem', color: '#64748B', maxWidth: 580, margin: '0 auto 2.5rem', lineHeight: 1.75 }}>
                    HawkWatch combines Computer Vision, Behavioral Biometrics, and Deepfake Detection
                    to ensure exam integrity — without compromising the candidate experience.
                </p>
                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                    <button className="btn-primary" onClick={() => navigate('/register')} style={{ fontSize: '0.95rem', padding: '0.8rem 1.75rem' }}>
                        Start for Free <ArrowRight size={17} />
                    </button>
                    <button className="btn-secondary" onClick={() => navigate('/login')} style={{ fontSize: '0.95rem', padding: '0.8rem 1.75rem' }}>
                        Sign In
                    </button>
                </div>
            </section>

            {/* Feature cards */}
            <section style={{ maxWidth: 1100, margin: '0 auto', padding: '0 2rem 4rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '1.25rem' }}>
                    {features.map(({ icon: Icon, title, desc, color }) => (
                        <div key={title} className="card animate-fade-up">
                            <div style={{
                                width: 44, height: 44, borderRadius: 10,
                                background: `${color}15`,
                                display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem'
                            }}>
                                <Icon size={21} color={color} />
                            </div>
                            <h3 style={{ margin: '0 0 0.5rem', fontWeight: 600, fontSize: '0.95rem', color: '#1E293B' }}>{title}</h3>
                            <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748B', lineHeight: 1.65 }}>{desc}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* Social proof / trust bar */}
            <div style={{
                background: '#FFFFFF', borderTop: '1px solid #E2E8F0', borderBottom: '1px solid #E2E8F0',
                padding: '1.25rem 3rem', display: 'flex', alignItems: 'center', justifyContent: 'center',
                gap: '2.5rem', flexWrap: 'wrap'
            }}>
                {trustItems.map((t) => (
                    <span key={t} style={{
                        display: 'flex', alignItems: 'center', gap: 6,
                        fontSize: '0.78rem', fontWeight: 600, color: '#94A3B8', letterSpacing: '0.04em'
                    }}>
                        <CheckCircle size={13} color="#22C55E" /> {t}
                    </span>
                ))}
            </div>
        </div>
    );
}
