import { Eye } from 'lucide-react';

export default function ExamNavigation({ examTitle, questions, currentQ, answers, setCurrentQ }) {
    const answered = questions.filter(q => answers[q._id] !== undefined).length;
    const pct = questions.length > 0 ? Math.round((answered / questions.length) * 100) : 0;

    return (
        <div className="exam-nav">
            {/* Branding */}
            <div className="exam-nav-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.75rem' }}>
                    <div style={{ width: 30, height: 30, borderRadius: 8, background: 'linear-gradient(135deg,#3B82F6,#6366F1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Eye size={15} color="#fff" />
                    </div>
                    <span style={{ fontWeight: 800, fontSize: '0.9rem', color: '#F8FAFC', letterSpacing: '-0.01em' }}>HawkWatch</span>
                </div>
                <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'rgba(255,255,255,0.6)', lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {examTitle}
                </div>
            </div>

            {/* Completion progress */}
            <div style={{ padding: '0.875rem 1rem', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                    <span style={{ fontSize: '0.65rem', fontWeight: 700, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Completion</span>
                    <span style={{ fontSize: '0.65rem', fontWeight: 700, color: '#60A5FA' }}>{answered}/{questions.length}</span>
                </div>
                <div style={{ height: 3, background: 'rgba(255,255,255,0.08)', borderRadius: 99, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: '#3B82F6', borderRadius: 99, transition: 'width 0.4s ease' }} />
                </div>
            </div>

            {/* Question grid */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '1rem' }}>
                <div style={{ fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.09em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.25)', marginBottom: '0.75rem' }}>
                    Questions
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 6 }}>
                    {questions.map((q, idx) => {
                        const isAns = answers[q._id] !== undefined;
                        const isCur = currentQ === idx;
                        return (
                            <button
                                key={q._id}
                                onClick={() => setCurrentQ(idx)}
                                className={`q-nav-btn ${isAns ? 'answered' : isCur ? 'current' : 'unanswered'}`}
                                title={`Question ${idx + 1}${isAns ? ' (answered)' : ''}`}
                            >
                                {idx + 1}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Legend */}
            <div style={{ padding: '0.75rem 1rem', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                <div style={{ display: 'flex', gap: '0.75rem', fontSize: '0.62rem', color: 'rgba(255,255,255,0.35)', flexWrap: 'wrap' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span style={{ width: 10, height: 10, borderRadius: 3, background: '#10B981', display: 'inline-block' }} /> Answered
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span style={{ width: 10, height: 10, borderRadius: 3, background: 'rgba(59,130,246,0.25)', border: '1.5px solid #3B82F6', display: 'inline-block' }} /> Current
                    </span>
                </div>
            </div>
        </div>
    );
}
