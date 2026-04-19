import { Clock, AlertTriangle } from 'lucide-react';

export default function ExamHeader({ currentQ, totalQ, timeLeft, formatTime }) {
    const urgent  = timeLeft < 300;
    const warning = timeLeft < 600;

    const timerClass = urgent ? 'timer-danger' : warning ? 'timer-warning' : 'timer-normal';

    return (
        <div className="exam-topbar">
            {/* Question progress */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div>
                    <div style={{ fontSize: '0.72rem', fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                        Question
                    </div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#1E293B', lineHeight: 1.1 }}>
                        {currentQ + 1} <span style={{ fontSize: '0.82rem', color: '#94A3B8', fontWeight: 400 }}>of {totalQ}</span>
                    </div>
                </div>

                {/* Progress bar */}
                <div style={{ width: 140, height: 4, background: '#E2E8F0', borderRadius: 99, overflow: 'hidden' }}>
                    <div style={{
                        height: '100%',
                        width: `${((currentQ) / Math.max(totalQ - 1, 1)) * 100}%`,
                        background: 'linear-gradient(90deg, #3B82F6, #6366F1)',
                        borderRadius: 99,
                        transition: 'width 0.3s ease',
                    }} />
                </div>
            </div>

            {/* Timer */}
            <div style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '0.5rem 1rem',
                borderRadius: 99,
                fontWeight: 800,
                fontSize: '1.15rem',
                letterSpacing: '-0.02em',
                transition: 'all 0.3s',
                ...(urgent
                    ? { background: '#FEF2F2', color: '#DC2626', border: '1.5px solid #FECACA' }
                    : warning
                        ? { background: '#FFFBEB', color: '#D97706', border: '1.5px solid #FDE68A' }
                        : { background: '#F1F5F9', color: '#334155', border: '1.5px solid #E2E8F0' }
                )
            }}>
                {urgent && <AlertTriangle size={16} />}
                <Clock size={16} />
                {formatTime(timeLeft)}
            </div>
        </div>
    );
}
