import { useEffect, useState, useRef } from 'react';
import { proctoringAPI } from '../services/api';
import { io } from 'socket.io-client';
import StudentMonitorCard from '../components/StudentMonitorCard';
import AlertLogTable from '../components/AlertLogTable';
import { Activity, X } from 'lucide-react';

export default function MonitoringPage() {
    const [sessions, setSessions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [expandedSession, setExpandedSession] = useState(null);

    const socketRef = useRef(null);

    // Initial Fetch
    useEffect(() => {
        const fetchActive = async () => {
            try {
                const { data } = await proctoringAPI.getActiveSessions();
                setSessions(data.data);
            } catch (err) {
                console.error('Failed fetching active sessions:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchActive();
    }, []);

    // Socket.IO Binding
    useEffect(() => {
        const socket = io(import.meta.env.VITE_API_URL || 'http://localhost:5000');
        socketRef.current = socket;

        // Auto join all rooms on sync
        sessions.forEach(s => {
            socket.emit('join-proctor-room', { sessionId: s._id });
        });

        // Listen for flags bridging dynamically over the socket bus
        socket.on('flag-event', (payload) => {
            const { sessionId, flag, riskScore } = payload;
            
            // Re-render UI block natively via state merge
            setSessions(prev => prev.map(session => {
                if (session._id === sessionId) {
                    return {
                        ...session,
                        riskScore: riskScore !== undefined ? riskScore : session.riskScore,
                        flagCount: (session.flagCount || 0) + 1,
                        flags: [flag, ...(session.flags || [])], // Put newest first
                    };
                }
                return session;
            }).sort((a, b) => b.riskScore - a.riskScore));

            // Keep expanded session details updated dynamically
            setExpandedSession(prev => {
                if (prev && prev._id === sessionId) {
                    return {
                        ...prev,
                        flagCount: (prev.flagCount || 0) + 1,
                        riskScore: riskScore !== undefined ? riskScore : prev.riskScore,
                        flags: [flag, ...(prev.flags || [])]
                    };
                }
                return prev;
            });
        });

        return () => socket.disconnect();
    }, [sessions.length]); // Re-bind on volume shift to connect new instances.

    if (loading) return <div style={{ padding: '3rem', textAlign: 'center', color: '#64748B' }}>Establishing Secure Proctoring Streams...</div>;

    return (
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '2rem', fontFamily: 'Inter, sans-serif' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
                <div style={{ background: '#EFF6FF', padding: '0.75rem', borderRadius: 12, color: '#3B82F6' }}>
                    <Activity size={28} />
                </div>
                <div>
                    <h1 style={{ margin: 0, color: '#1E293B', fontSize: '1.5rem', fontWeight: 700 }}>Live Monitoring Console</h1>
                    <p style={{ margin: 0, color: '#64748B', fontSize: '0.85rem' }}>Overviewing {sessions.length} active instances intelligently.</p>
                </div>
            </div>

            {sessions.length === 0 ? (
                <div style={{ background: '#fff', border: '1px dashed #CBD5E1', padding: '4rem 2rem', textAlign: 'center', borderRadius: 12 }}>
                    <Activity size={40} color="#94A3B8" style={{ marginBottom: '1rem' }} />
                    <h3 style={{ color: '#475569', margin: '0 0 0.5rem' }}>No Active Exams</h3>
                    <p style={{ color: '#94A3B8', margin: 0, fontSize: '0.9rem' }}>When students begin an assessment, live metrics will establish here.</p>
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' }}>
                    {sessions.map((session) => (
                        <StudentMonitorCard 
                            key={session._id}
                            session={session}
                            student={session.student}
                            riskScore={session.riskScore}
                            flagCount={session.flagCount}
                            lastFlag={session.flags?.[0]} 
                            onExpand={setExpandedSession}
                        />
                    ))}
                </div>
            )}

            {/* Expansion Modal Modal */}
            {expandedSession && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999 }}>
                    <div style={{ background: '#fff', width: '90%', maxWidth: 900, maxHeight: '90vh', borderRadius: 16, display: 'flex', flexDirection: 'column', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}>
                        <div style={{ padding: '1.5rem', borderBottom: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <h2 style={{ margin: 0, fontSize: '1.25rem', color: '#1E293B', fontWeight: 700 }}>Inspection: {expandedSession.student?.name}</h2>
                                <div style={{ color: '#64748B', fontSize: '0.85rem', marginTop: 4 }}>
                                    Risk Score: {Math.round(expandedSession.riskScore)} | Total Flops: {expandedSession.flagCount}
                                </div>
                            </div>
                            <button onClick={() => setExpandedSession(null)} style={{ background: '#F1F5F9', border: 'none', padding: '0.5rem', borderRadius: 8, cursor: 'pointer', color: '#64748B' }}>
                                <X size={20} />
                            </button>
                        </div>
                        <div style={{ padding: '1.5rem', overflowY: 'auto', flex: 1 }}>
                            <AlertLogTable flags={expandedSession.flags || []} />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
