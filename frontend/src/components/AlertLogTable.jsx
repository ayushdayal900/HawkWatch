import { useState, useMemo } from 'react';
import { AlertCircle, Clock, Filter } from 'lucide-react';

export default function AlertLogTable({ flags = [] }) {
    const [filterSev, setFilterSev] = useState('all');

    const filtered = useMemo(() => {
        let sorted = [...flags].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        if (filterSev !== 'all') {
            sorted = sorted.filter(f => f.severity === filterSev);
        }
        return sorted;
    }, [flags, filterSev]);

    const getSevColor = (s) => {
        if (s === 'critical') return { bg: '#FEF2F2', fg: '#DC2626' };
        if (s === 'high') return { bg: '#FFF1F2', fg: '#E11D48' };
        if (s === 'medium') return { bg: '#FFFBEB', fg: '#D97706' };
        return { bg: '#F0FDF4', fg: '#16A34A' };
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', fontFamily: 'Inter, sans-serif' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <h3 style={{ fontSize: '1rem', color: '#1E293B', margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <AlertCircle size={18} /> Alert Log
                </h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8rem' }}>
                    <Filter size={14} color="#64748B" />
                    <select 
                        value={filterSev} 
                        onChange={(e) => setFilterSev(e.target.value)}
                        style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid #E2E8F0', outline: 'none' }}
                    >
                        <option value="all">All Severities</option>
                        <option value="critical">Critical</option>
                        <option value="high">High</option>
                        <option value="medium">Medium</option>
                        <option value="low">Low</option>
                    </select>
                </div>
            </div>

            <div style={{ overflowX: 'auto', border: '1px solid #E2E8F0', borderRadius: 8 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                    <thead>
                        <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0', color: '#64748B', display: 'grid', gridTemplateColumns: 'minmax(120px, 1fr) 1.5fr minmax(100px, 1fr) 1fr 2fr' }}>
                            <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Time</th>
                            <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Event Type</th>
                            <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Severity</th>
                            <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Confidence</th>
                            <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Details</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filtered.length === 0 ? (
                            <tr>
                                <td colSpan={5} style={{ padding: '2rem', textAlign: 'center', color: '#94A3B8' }}>No logs match the criteria.</td>
                            </tr>
                        ) : (
                            filtered.map(f => {
                                const colors = getSevColor(f.severity);
                                return (
                                    <tr key={f._id || Math.random()} style={{ borderBottom: '1px solid #F1F5F9', ':lastChild': { borderBottom: 'none' }, display: 'grid', gridTemplateColumns: 'minmax(120px, 1fr) 1.5fr minmax(100px, 1fr) 1fr 2fr', alignItems: 'center' }}>
                                        <td style={{ padding: '0.75rem 1rem', color: '#64748B', display: 'flex', alignItems: 'center', gap: 6 }}>
                                            <Clock size={12} /> {new Date(f.timestamp).toLocaleTimeString()}
                                        </td>
                                        <td style={{ padding: '0.75rem 1rem', fontWeight: 500, color: '#334155' }}>
                                            {f.type.replace(/_/g, ' ')}
                                        </td>
                                        <td style={{ padding: '0.75rem 1rem' }}>
                                            <span style={{ background: colors.bg, color: colors.fg, padding: '2px 8px', borderRadius: 12, fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase' }}>
                                                {f.severity}
                                            </span>
                                        </td>
                                        <td style={{ padding: '0.75rem 1rem', color: '#64748B' }}>
                                            {f.confidence !== undefined ? `${(f.confidence * 100).toFixed(0)}%` : 'N/A'}
                                        </td>
                                        <td style={{ padding: '0.75rem 1rem', color: '#475569', fontSize: '0.8rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                            {f.details || '-'}
                                        </td>
                                    </tr>
                                )
                            })
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
