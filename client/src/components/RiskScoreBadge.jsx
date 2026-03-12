export default function RiskScoreBadge({ score, level }) {
    const color = level === 'HIGH' ? '#DC2626' : level === 'MEDIUM' ? '#D97706' : '#16A34A';
    const bg = level === 'HIGH' ? '#FEF2F2' : level === 'MEDIUM' ? '#FFFBEB' : '#F0FDF4';
    return (
        <span style={{ 
            background: bg, color: color, padding: '3px 10px', borderRadius: 999, 
            fontSize: '0.75rem', fontWeight: 700, border: `1px solid ${color}33`,
            whiteSpace: 'nowrap'
        }}>
            Risk: {score} ({level})
        </span>
    );
}
