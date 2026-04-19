import { create } from 'zustand';
import { io } from 'socket.io-client';
import { proctoringAPI } from '../services/api';

const useProctoringStore = create((set, get) => ({
    // Student Side
    sessionId: null,
    riskScore: 0,
    flags: [],
    isTracking: false,
    
    // Examiner Side
    activeSessions: [],
    loadingSessions: false,
    
    // Shared
    socket: null,

    // Actions
    setSessionId: (id) => set({ sessionId: id }),
    setRiskScore: (score) => set({ riskScore: score }),
    addFlag: (flag) => set((state) => ({ flags: [flag, ...state.flags] })),
    setIsTracking: (tracking) => set({ isTracking: tracking }),
    
    fetchActiveSessions: async () => {
        set({ loadingSessions: true });
        try {
            const { data } = await proctoringAPI.getActiveSessions();
            set({ activeSessions: data.data || [], loadingSessions: false });
        } catch (error) {
            set({ loadingSessions: false });
        }
    },

    connectSocket: (token, role, sessionId = null) => {
        let socket = get().socket;
        if (!socket) {
            socket = io(import.meta.env.VITE_API_URL || 'http://localhost:5000', {
                path: '/socket.io',
                auth: { token }
            });
            set({ socket });
        }

        socket.on('connect', () => {
            if (role === 'student' && sessionId) {
                socket.emit('join-session', sessionId);
            } else if (role === 'examiner') {
                get().activeSessions.forEach(s => {
                    socket.emit('join-proctor-room', { sessionId: s._id });
                });
            }
        });

        socket.on('flag-event', (payload) => {
            if (role === 'student') {
                set((state) => ({
                    flags: [payload.flag, ...state.flags],
                    riskScore: payload.riskScore !== undefined ? payload.riskScore : state.riskScore
                }));
            } else {
                set((state) => ({
                    activeSessions: state.activeSessions.map(session => {
                        if (session._id === payload.sessionId) {
                            return {
                                ...session,
                                riskScore: payload.riskScore !== undefined ? payload.riskScore : session.riskScore,
                                flagCount: (session.flagCount || 0) + 1,
                                flags: [payload.flag, ...(session.flags || [])],
                            };
                        }
                        return session;
                    }).sort((a, b) => b.riskScore - a.riskScore)
                }));
            }
        });
    },

    disconnectSocket: () => {
        const socket = get().socket;
        if (socket) {
            socket.disconnect();
            set({ socket: null });
        }
    },
    
    clearSession: () => set({ sessionId: null, riskScore: 0, flags: [], isTracking: false }),
}));

export default useProctoringStore;
