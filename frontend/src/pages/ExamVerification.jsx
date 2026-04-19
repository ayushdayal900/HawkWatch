import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api     from '../services/api';
import toast   from 'react-hot-toast';
import useAuthStore from '../store/authStore';
import useUIStore from '../store/uiStore';
import Layout from '../components/Layout';
import IDVerification   from '../components/IDVerification';
import FaceVerification from '../components/FaceVerification';
import LivenessDetector from '../components/LivenessDetector';
import StepEnvironment  from '../components/exam/StepEnvironment';
import {
    CreditCard, Camera, Eye, ScanLine,
    CheckCircle, ShieldAlert, ChevronRight,
    AlertCircle, ShieldCheck, RefreshCw
} from 'lucide-react';

const STEPS = [
    { id: 'id',          label: 'ID Card',       icon: CreditCard,  color: 'var(--brand-500)' },
    { id: 'face',        label: 'Face Match',     icon: Camera,      color: '#8B5CF6' },
    { id: 'liveness',    label: 'Liveness',       icon: Eye,         color: 'var(--success)' },
    { id: 'environment', label: 'Security Scan',  icon: ScanLine,    color: 'var(--warning)' },
];

function StepBar({ currentIdx, results }) {
    return (
        <div className="card" style={{ display: 'flex', padding: '1.5rem', marginBottom: '2rem', gap: 0, overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
            {STEPS.map((s, i) => {
                const done   = results[s.id] === 'passed';
                const active = i === currentIdx;
                const Icon   = s.icon;
                
                return (
                    <div key={s.id} style={{ display: 'flex', alignItems: 'center', flex: i < STEPS.length - 1 ? 1 : 0 }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, position: 'relative' }}>
                            <div style={{
                                width: 44, height: 44, borderRadius: 14,
                                background: done ? 'var(--success-bg)' : active ? s.color : 'var(--n-50)',
                                border: `2px solid ${done ? 'var(--success)' : active ? s.color : 'var(--border)'}`,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                                zIndex: 2,
                                boxShadow: active ? `0 0 0 5px ${s.color}20` : 'none',
                            }}>
                                {done 
                                    ? <CheckCircle size={22} color="var(--success)" /> 
                                    : <Icon size={20} color={active ? '#fff' : 'var(--n-400)'} />
                                }
                            </div>
                            <div style={{ textAlign: 'center' }}>
                                <div style={{ fontSize: '0.625rem', fontWeight: 800, color: 'var(--n-400)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 2 }}>Step {i + 1}</div>
                                <div style={{ fontSize: '0.81rem', fontWeight: 700, color: active ? 'var(--n-900)' : 'var(--n-500)', whiteSpace: 'nowrap' }}>{s.label}</div>
                            </div>
                        </div>
                        {i < STEPS.length - 1 && (
                            <div style={{ flex: 1, height: 2, background: 'var(--border)', margin: '0 1rem', marginBottom: '1.75rem', position: 'relative', overflow: 'hidden' }}>
                                <div style={{ 
                                    position: 'absolute', top: 0, left: 0, height: '100%', 
                                    width: done ? '100%' : '0%', 
                                    background: done ? 'var(--success)' : s.color,
                                    transition: 'width 0.6s ease'
                                }} />
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
}

export default function ExamVerification() {
    const { id }       = useParams();
    const navigate     = useNavigate();
    const user         = useAuthStore(state => state.user);
    const [step,       setStep]       = useState(0);
    const [sessionId,  setSessionId]  = useState(null);
    const [loading,    setLoading]    = useState(true);

    const next = useCallback(() => setStep(s => s + 1), []);
    const { setPageTitle } = useUIStore();

    useEffect(() => {
        setPageTitle('Identity Verification');
    }, [setPageTitle]);

    useEffect(() => {
        const initSession = async () => {
            try {
                const { data } = await api.post('/verification/start', { examId: id });
                setSessionId(data.sessionId);
            } catch (err) {
                toast.error('Failed to start verification session.');
            } finally {
                setLoading(false);
            }
        };
        initSession();
    }, [id]);

    const enterExam = useCallback(async () => {
        try {
            await api.post('/exams/start', { examId: id });
            toast.success('Identity verified. Starting exam...');
            navigate(`/student-exam/${id}?verified=1`);
        } catch {
            toast.error('Could not start exam session.');
        }
    }, [id, navigate]);

    const results = {
        id:          step > 0 ? 'passed' : undefined,
        face:        step > 1 ? 'passed' : undefined,
        liveness:    step > 2 ? 'passed' : undefined,
        environment: step > 3 ? 'passed' : undefined,
    };

    const renderStep = () => {
        if (loading || !sessionId) return (
            <div className="card empty-state" style={{ padding: '4rem' }}>
                <RefreshCw size={40} className="animate-spin" color="var(--brand-500)" />
                <h3 style={{ marginTop: '1.5rem' }}>Securing Connection</h3>
                <p>Initializing your unique verification pipeline...</p>
            </div>
        );

        switch (step) {
            case 0: return <IDVerification sessionId={sessionId} onVerified={next} onError={() => {}} />;
            case 1: return <FaceVerification sessionId={sessionId} onVerified={next} onError={() => {}} />;
            case 2: return <LivenessDetector sessionId={sessionId} onVerified={next} />;
            case 3: return <StepEnvironment  sessionId={sessionId} onPass={enterExam} />;
            default: return null;
        }
    };

    return (
        <Layout>
            <div className="animate-fade-in">

                <div style={{ maxWidth: 840, margin: '0 auto' }}>
                    {/* Security Alert */}
                    <div className="alert alert-warning animate-fade-up" style={{ marginBottom: '1.5rem', border: 'none', boxShadow: 'var(--shadow-sm)' }}>
                        <ShieldAlert size={20} color="var(--warning)" style={{ flexShrink: 0 }} />
                        <div>
                            <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>Secure Session Active</div>
                            <p style={{ margin: '0.1rem 0 0', fontSize: '0.82rem', opacity: 0.8 }}>
                                Please stay in view of the camera. Any unauthorized activity during verification will be flagged.
                            </p>
                        </div>
                    </div>

                    <StepBar currentIdx={step} results={results} />

                    <div style={{ position: 'relative' }}>
                        {renderStep()}
                    </div>

                    {/* Security Footer */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '2rem', marginTop: '3rem', opacity: 0.5 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.75rem', fontWeight: 600 }}>
                            <ShieldCheck size={16} /> 256-bit Encrypted
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.75rem', fontWeight: 600 }}>
                            <AlertCircle size={16} /> GDPR Compliant
                        </div>
                    </div>
                </div>
            </div>
        </Layout>
    );
}
