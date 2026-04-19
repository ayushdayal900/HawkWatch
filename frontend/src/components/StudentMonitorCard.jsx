import { useEffect, useState } from 'react';
import { Activity, ShieldAlert, Clock, ChevronRight } from 'lucide-react';

function getRiskConfig(score) {
    if (score >= 75) return { color: '#EF4444', bg: '#FEF2F2', label: 'Critical', cls: 'risk-critical' };
    if (score >= 50) return { color: '#F97316', bg: '#FFF7ED', label: 'High',     cls: 'risk-high' };
    if (score >= 25) return { color: '#F59E0B', bg: '#FFFBEB', label: 'Medium',   cls: 'risk-medium' };
    return            { color: '#10B981', bg: '#ECFDF5', label: 'Low',      cls: 'risk-low' };
}

export default function StudentMonitorCard({ session, student, riskScore = 0, flagCount = 0, lastFlag, onExpand }) {
    const [pulse, setPulse] = useState(false);
    const risk = getRiskConfig(riskScore);

    useEffect(() => {
        if (lastFlag) {
            setPulse(true);
            const t = setTimeout(() => setPulse(false), 2500);
            return () => clearTimeout(t);
        }
    }, [lastFlag]);

    const name = student?.name || 'Unknown Student';
    const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
    const examTitle = session?.exam?.title || 'Exam Session';
    const elapsed = session?.startTimestamp
        ? Math.floor((Date.now() - new Date(session.startTimestamp)) / 60000) + 'm'
        : null;

    return (
        <div
            className={`monitor-card ${pulse ? 'flagging' : ''}`}
            onClick={() => onExpand(session)}
        >
            {/* Risk bar at top */}
            <div
                className="risk-bar"
                style={{ background: risk.color, opacity: riskScore > 0 ? 0.9 : 0.2, width: `${Math.min(riskScore, 100)}%` }}
            />

            {/* Header row */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    {/* Avatar */}
                    <div style={{
                        width: 42, height: 42, borderRadius: '50%',
                        background: `linear-gradient(135deg, ${risk.color}22, ${risk.color}44)`,
                        border: `2px solid ${risk.color}44`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '0.82rem', fontWeight: 700, color: risk.color,
                        flexShrink: 0,
                    }}>
                        {student?.avatar
                            ? <img src={student.avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                            : initials
                        }
                    </div>

                    <div style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: '0.9rem', color: '#1E293B', lineHeight: 1.2 }}>{name}</div>
                        <div style={{ fontSize: '0.72rem', color: '#64748B', marginTop: 2, display: 'flex', alignItems: 'center', gap: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {examTitle}
                        </div>
                    </div>
                </div>

                {/* Risk score */}
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontSize: '0.6rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#94A3B8' }}>Risk</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 800, lineHeight: 1, color: risk.color, letterSpacing: '-0.03em' }}>
                        {Math.round(riskScore)}
                        <span style={{ fontSize: '0.7rem', fontWeight: 600, opacity: 0.7 }}>/100</span>
                    </div>
                </div>
            </div>

            {/* Risk progress bar */}
            <div className="risk-meter" style={{ marginBottom: '0.875rem' }}>
                <div
                    className="risk-meter-fill"
                    style={{ width: `${Math.min(riskScore, 100)}%`, background: risk.color }}
                />
            </div>

            {/* Stats row */}
            <div style={{ display: 'flex', gap: '0.5rem' }}>
                <div style={{
                    flex: 1, padding: '0.625rem 0.75rem',
                    background: '#F8FAFC', borderRadius: 8,
                    display: 'flex', alignItems: 'center', gap: 6,
                }}>
                    <ShieldAlert size={13} color={flagCount > 0 ? '#F97316' : '#94A3B8'} />
                    <div>
                        <div style={{ fontSize: '0.6rem', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Flags</div>
                        <div style={{ fontSize: '1rem', fontWeight: 800, color: flagCount > 0 ? '#F97316' : '#1E293B', lineHeight: 1 }}>{flagCount}</div>
                    </div>
                </div>

                {lastFlag ? (
                    <div style={{
                        flex: 2, padding: '0.625rem 0.75rem',
                        background: pulse ? '#FEF2F2' : '#F8FAFC',
                        borderRadius: 8, transition: 'background 0.3s',
                        border: pulse ? '1px solid #FECACA' : '1px solid transparent',
                        overflow: 'hidden',
                    }}>
                        <div style={{ fontSize: '0.6rem', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: 3 }}>
                            <Activity size={10} /> Latest
                        </div>
                        <div style={{ fontSize: '0.78rem', fontWeight: 700, color: lastFlag.severity === 'critical' ? '#DC2626' : '#D97706', marginTop: 2, textTransform: 'capitalize' }}>
                            {String(lastFlag.type || '').replace(/_/g, ' ')}
                        </div>
                    </div>
                ) : (
                    <div style={{
                        flex: 2, padding: '0.625rem 0.75rem',
                        background: '#F0FDF4', borderRadius: 8,
                        display: 'flex', alignItems: 'center', gap: 6,
                    }}>
                        <Activity size={13} color="#10B981" />
                        <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#065F46' }}>All Clear</div>
                    </div>
                )}
            </div>

            {/* Footer */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.75rem' }}>
                {elapsed && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.7rem', color: '#94A3B8' }}>
                        <Clock size={11} />
                        {elapsed} elapsed
                    </div>
                )}
                <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 3, fontSize: '0.72rem', color: '#3B82F6', fontWeight: 600 }}>
                    Inspect <ChevronRight size={12} />
                </div>
            </div>
        </div>
    );
}
