import { create } from 'zustand';

const useExamStore = create((set) => ({
    currentExam: null,
    examAttempt: null,
    questions: [],
    answers: {},
    timeRemaining: null,

    setCurrentExam: (exam) => set({ currentExam: exam, questions: exam.questions || [] }),
    setExamAttempt: (attempt) => set({ examAttempt: attempt }),
    setAnswer: (questionId, answer) => set((state) => ({
        answers: { ...state.answers, [questionId]: answer }
    })),
    setTimeRemaining: (time) => set({ timeRemaining: time }),
    clearExam: () => set({ currentExam: null, examAttempt: null, questions: [], answers: {}, timeRemaining: null }),
}));

export default useExamStore;
