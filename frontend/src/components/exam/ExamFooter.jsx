import { useState } from 'react';
import { ChevronLeft, ChevronRight, Send, AlertCircle } from 'lucide-react';

export default function ExamFooter({ currentQ, totalQ, answers, questions, setCurrentQ, submitting, autoSubmit }) {
    const [showConfirm, setShowConfirm] = useState(false);
    const isLast = currentQ === totalQ - 1;
    const answered = questions ? questions.filter(q => answers[q._id] !== undefined).length : 0;
    const unanswered = totalQ - answered;

    if (showConfirm) {
        return (
            <div className="exam-footer" style={{ flexDirection: 'column', gap: '0.75rem', alignItems: 'stretch' }}>
                <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 10, padding: '0.875rem 1.1rem', display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                    <AlertCircle size={16} color="#D97706" style={{ flexShrink: 0, marginTop: 1 }} />
                    <div>
                        <div style={{ fontWeight: 700, fontSize: '0.875rem', color: '#92400E' }}>
                            {unanswered > 0 ? `${unanswered} unanswered question${unanswered > 1 ? 's' : ''}` : 'All questions answered'}
                        </div>
                        <div style={{ fontSize: '0.78rem', color: '#B45309', marginTop: 2 }}>
                            {unanswered > 0 ? 'You can still go back and answer them before submitting.' : 'You\'ve answered all questions. Ready to submit?'}
                        </div>
                    </div>
                </div>
                <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                    <button
                        onClick={() => setShowConfirm(false)}
                        className="btn btn-secondary"
                    >
                        Review Answers
                    </button>
                    <button
                        onClick={() => { setShowConfirm(false); autoSubmit('Student finalized attempt'); }}
                        disabled={submitting}
                        className="btn btn-success"
                    >
                        <Send size={15} />
                        {submitting ? 'Submitting…' : 'Confirm Submit'}
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="exam-footer">
            {/* Previous */}
            <button
                onClick={() => setCurrentQ(q => Math.max(0, q - 1))}
                disabled={currentQ === 0}
                className="btn btn-secondary"
            >
                <ChevronLeft size={16} /> Previous
            </button>

            {/* Page indicator */}
            <span style={{ fontSize: '0.82rem', color: '#94A3B8', fontWeight: 500 }}>
                {answered} / {totalQ} answered
            </span>

            {/* Next or Submit */}
            {isLast ? (
                <button
                    onClick={() => setShowConfirm(true)}
                    disabled={submitting}
                    className="btn btn-success"
                >
                    <Send size={15} />
                    {submitting ? 'Submitting…' : 'Submit Exam'}
                </button>
            ) : (
                <button
                    onClick={() => setCurrentQ(q => Math.min(totalQ - 1, q + 1))}
                    className="btn btn-primary"
                >
                    Next <ChevronRight size={16} />
                </button>
            )}
        </div>
    );
}
