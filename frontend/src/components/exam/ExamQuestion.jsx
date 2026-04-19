import { CheckCircle2 } from 'lucide-react';

const OPTION_LABELS = ['A', 'B', 'C', 'D', 'E'];

export default function ExamQuestion({ activeQ, answers, handleAnswer, questionIndex, totalQuestions }) {
    if (!activeQ) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '50%', color: '#94A3B8' }}>
                No question available.
            </div>
        );
    }

    const isMCQ       = activeQ.type === 'mcq'          || activeQ.options?.length > 0;
    const isShortAns  = activeQ.type === 'short-answer'  || activeQ.type === 'text';
    const selected    = answers[activeQ._id];
    const stemText    = activeQ.stem || activeQ.questionText || '';
    const points      = activeQ.points || activeQ.marks || 1;

    return (
        <div style={{ maxWidth: 760, margin: '0 auto' }} className="animate-fade-up">
            {/* Question meta */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
                <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                    Question {questionIndex + 1}
                </span>
                <span style={{
                    fontSize: '0.7rem', fontWeight: 700, padding: '0.2rem 0.65rem',
                    borderRadius: 99, background: '#EFF6FF', color: '#1D4ED8',
                }}>
                    {points} {points === 1 ? 'point' : 'points'}
                </span>
            </div>

            {/* Stem */}
            {stemText ? (
                <div 
                    style={{ fontSize: '1.05rem', fontWeight: 500, color: '#1E293B', lineHeight: 1.7, marginBottom: '1.75rem' }}
                    dangerouslySetInnerHTML={{ __html: stemText }}
                />
            ) : (
                <div style={{ fontSize: '1.05rem', fontWeight: 500, color: '#94A3B8', lineHeight: 1.7, marginBottom: '1.75rem' }}>
                    No question text provided.
                </div>
            )}

            {/* MCQ options */}
            {isMCQ && activeQ.options?.map((opt, i) => {
                const val      = opt.label ?? String(i);
                const text     = opt.text ?? opt.label ?? opt;
                const isChosen = selected === val;

                return (
                    <label
                        key={i}
                        htmlFor={`opt-${activeQ._id}-${i}`}
                        style={{
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: '0.875rem',
                            padding: '0.95rem 1.1rem',
                            borderRadius: 10,
                            cursor: 'pointer',
                            border: `2px solid ${isChosen ? '#3B82F6' : '#E2E8F0'}`,
                            background: isChosen ? '#EFF6FF' : '#FFFFFF',
                            marginBottom: '0.6rem',
                            transition: 'all 0.15s ease',
                            position: 'relative',
                        }}
                        onMouseEnter={e => { if (!isChosen) { e.currentTarget.style.borderColor = '#93C5FD'; e.currentTarget.style.background = '#F8FAFC'; } }}
                        onMouseLeave={e => { if (!isChosen) { e.currentTarget.style.borderColor = '#E2E8F0'; e.currentTarget.style.background = '#FFFFFF'; } }}
                    >
                        <input
                            id={`opt-${activeQ._id}-${i}`}
                            type="radio"
                            name={activeQ._id}
                            checked={isChosen}
                            onChange={() => handleAnswer(activeQ._id, val)}
                            style={{ display: 'none' }}
                        />
                        {/* Option label badge */}
                        <div style={{
                            width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            background: isChosen ? '#3B82F6' : '#F1F5F9',
                            color: isChosen ? '#fff' : '#64748B',
                            fontSize: '0.75rem', fontWeight: 700, marginTop: 1,
                            transition: 'all 0.15s',
                        }}>
                            {isChosen ? <CheckCircle2 size={15} strokeWidth={2.5} /> : OPTION_LABELS[i] || i + 1}
                        </div>

                        <span style={{
                            fontSize: '0.95rem', color: isChosen ? '#1D4ED8' : '#334155',
                            lineHeight: 1.5, fontWeight: isChosen ? 500 : 400,
                            transition: 'color 0.15s',
                            flex: 1,
                        }}>
                            {text}
                        </span>
                    </label>
                );
            })}

            {/* Short answer */}
            {isShortAns && (
                <div>
                    <textarea
                        className="input"
                        rows={5}
                        placeholder="Write your answer here…"
                        value={selected || ''}
                        onChange={e => handleAnswer(activeQ._id, e.target.value)}
                        style={{ resize: 'vertical', minHeight: 120, lineHeight: 1.6 }}
                    />
                    <div style={{ textAlign: 'right', fontSize: '0.72rem', color: '#94A3B8', marginTop: 4 }}>
                        {(selected || '').length} characters
                    </div>
                </div>
            )}

            {/* Unanswered nudge */}
            {!selected && (
                <div style={{ marginTop: '1rem', fontSize: '0.78rem', color: '#F59E0B', display: 'flex', alignItems: 'center', gap: 5 }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#F59E0B', display: 'inline-block' }} />
                    This question is unanswered
                </div>
            )}
        </div>
    );
}
