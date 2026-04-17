import { useEffect, useState } from 'react';
import { Activity, ShieldAlert, FileText } from 'lucide-react';

export default function StudentMonitorCard({ session, student, riskScore, flagCount, lastFlag, onExpand }) {
    const [pulse, setPulse] = useState(false);

    useEffect(() => {
        if (lastFlag) {
            setPulse(true);
            const timer = setTimeout(() => setPulse(false), 2000);
            return () => clearTimeout(timer);
        }
    }, [lastFlag]);

    const rc = riskScore >= 75 ? '#DC2626' : riskScore >= 50 ? '#D97706' : riskScore >= 25 ? '#F59E0B' : '#10B981';

    return (
        <div 
            onClick={() => onExpand(session)}
            style={{
                background: '#fff',
                border: `1px solid ${pulse ? '#EF4444' : '#E2E8F0'}`,
                borderRadius: 12,
                padding: '1.25rem',
                cursor: 'pointer',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                boxShadow: pulse ? '0 0 0 4px rgba(239, 68, 68, 0.2)' : '0 1px 3px rgba(0,0,0,0.1)',
                display: 'flex',
                flexDirection: 'column',
                gap: '1rem',
                transform: pulse ? 'scale(1.02)' : 'scale(1)'
            }}
        >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#F1F5F9', border: '1px solid #E2E8F0', overflow: 'hidden' }}>
                        {student?.avatar ? (
                            <img src={student.avatar} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94A3B8', fontWeight: 700 }}>
                                {student?.name?.charAt(0).toUpperCase()}
                            </div>
                        )}
                    </div>
                    <div>
                        <h4 style={{ margin: 0, color: '#1E293B', fontSize: '0.95rem', fontWeight: 600 }}>{student?.name || 'Unknown'}</h4>
                        <div style={{ color: '#64748B', fontSize: '0.75rem', marginTop: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
                           <FileText size={10} /> {session.exam?.title || 'Exam Session'}
                        </div>
                    </div>
                </div>
                
                <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.65rem', color: '#64748B', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em' }}>Risk</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 800, color: rc, lineHeight: 1 }}>{Math.round(riskScore)}<span style={{ fontSize: '0.8rem' }}>/100</span></div>
                </div>
            </div>

            <div style={{ background: '#F8FAFC', padding: '0.75rem', borderRadius: 8, display: 'flex', gap: '1rem' }}>
                <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '0.65rem', color: '#64748B', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }}><ShieldAlert size={12} /> Total Flags</div>
                    <div style={{ fontSize: '1rem', fontWeight: 700, color: '#334155' }}>{flagCount}</div>
                </div>
                {lastFlag && (
                    <div style={{ flex: 2, borderLeft: '1px solid #E2E8F0', paddingLeft: '1rem' }}>
                        <div style={{ fontSize: '0.65rem', color: '#64748B', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }}><Activity size={12} /> Latest Event</div>
                        <div style={{ fontSize: '0.8rem', fontWeight: 600, color: lastFlag.severity === 'critical' ? '#DC2626' : '#D97706', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {lastFlag.type.replace(/_/g, ' ')}
                        </div>
                        <div style={{ fontSize: '0.65rem', color: '#94A3B8', marginTop: 2 }}>{new Date(lastFlag.timestamp).toLocaleTimeString()}</div>
                    </div>
                )}
            </div>
        </div>
    );
}
