export default function AlertLogTable({ events }) {
    return (
        <div style={{ maxHeight: 300, overflowY: 'auto', background: '#fff', borderRadius: 12, border: '1px solid #E2E8F0' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', textAlign: 'left' }}>
                <thead style={{ position: 'sticky', top: 0, background: '#F8FAFC', zIndex: 10 }}>
                    <tr style={{ color: '#64748B', borderBottom: '1px solid #E2E8F0' }}>
                        <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Time</th>
                        <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Student ID</th>
                        <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Event Type</th>
                        <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Score Mod</th>
                    </tr>
                </thead>
                <tbody>
                    {events.map((e, i) => (
                        <tr key={i} style={{ borderBottom: '1px solid #F1F5F9' }}>
                            <td style={{ padding: '0.75rem 1rem', color: '#64748B' }}>{new Date(e.timestamp).toLocaleTimeString()}</td>
                            <td style={{ padding: '0.75rem 1rem', color: '#1E293B', fontWeight: 500 }}>{(e.studentId._id || e.studentId).toString().slice(-6)}</td>
                            <td style={{ padding: '0.75rem 1rem' }}><span style={{ background: '#F1F5F9', color: '#334155', padding: '2px 6px', borderRadius: 4, fontSize: '0.7rem', fontWeight: 500 }}>{e.eventType}</span></td>
                            <td style={{ padding: '0.75rem 1rem', color: '#EF4444', fontWeight: 600 }}>+{e.riskWeight}</td>
                        </tr>
                    ))}
                    {events.length === 0 && (
                        <tr><td colSpan="4" style={{ textAlign: 'center', padding: '2rem 1rem', color: '#94A3B8' }}>No alerts recorded for this session.</td></tr>
                    )}
                </tbody>
            </table>
        </div>
    );
}
