import RiskScoreBadge from './RiskScoreBadge';
import { User, Activity } from 'lucide-react';

export default function StudentMonitorCard({ studentId, events, riskScore, riskLevel }) {
    const sorted = [...events].sort((a,b) => new Date(b.timestamp) - new Date(a.timestamp));
    const recentActivity = sorted.length > 0 ? sorted[0].eventType : 'Clean';
    
    return (
        <div className="card animate-fade-up" style={{ padding: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <User size={18} color="#3B82F6" />
                    </div>
                    <div>
                        <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#1E293B' }}>ID: {studentId.toString().slice(-6)}</div>
                        <div style={{ fontSize: '0.7rem', color: '#64748B', display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                            <Activity size={10} /> Last: {recentActivity}
                        </div>
                    </div>
                </div>
                <RiskScoreBadge score={riskScore} level={riskLevel} />
            </div>
        </div>
    );
}
