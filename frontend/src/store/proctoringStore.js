import { create } from 'zustand';
import { io } from 'socket.io-client';
import { proctoringAPI } from '../services/api';
import { socketService } from '../services/socket';

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
    
    fetchActiveSessions: async (examId = null) => {
        set({ loadingSessions: true });
        try {
            const { data } = await proctoringAPI.getActiveSessions(examId);
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

        const joinRooms = () => {
            if (role === 'student' && sessionId) {
                socket.emit('join-session', { sessionId });
            } else if (role === 'examiner') {
                // Join the exam-wide room so we receive all student video frames for this exam
                if (sessionId) {
                    socket.emit('join-proctor-room', { sessionId }); // sessionId = examId here
                }
                // Also join per-session rooms for any already-loaded sessions
                get().activeSessions.forEach(s => {
                    socket.emit('join-proctor-room', { sessionId: s.exam?._id || s.exam || s._id });
                });
            }
        };

        if (socket.connected) {
            joinRooms();
        }

        socket.on('connect', joinRooms);

        socket.on('flag-event', (payload) => {
            if (role === 'student') {
                set((state) => ({
                    flags: [payload.flag || payload.flags?.[0], ...state.flags].filter(Boolean),
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
                                flags: [payload.flag || payload.flags?.[0], ...(session.flags || [])].filter(Boolean),
                            };
                        }
                        return session;
                    }).sort((a, b) => b.riskScore - a.riskScore)
                }));
            }
        });

        // New real-time socket layer integration
        socketService.onCheatingDetected((payload) => {
            const flag = payload.flagData;
            
            // Local weight mapping for immediate UI update (matches backend riskEngine)
            const WEIGHTS = { multiple_faces: 10, tab_switch: 3, face_not_detected: 5, window_blur: 2, default: 2 };
            const weight = WEIGHTS[flag?.type] || WEIGHTS.default;

            if (role === 'student') {
                set((state) => ({
                    flags: [flag, ...state.flags].filter(Boolean),
                    riskScore: Math.min(100, state.riskScore + weight)
                }));
            } else {
                set((state) => ({
                    activeSessions: state.activeSessions.map(session => {
                        if (session._id === payload.sessionId) {
                            return {
                                ...session,
                                riskScore: Math.min(100, (session.riskScore || 0) + weight),
                                flagCount: (session.flagCount || 0) + 1,
                                flags: [flag, ...(session.flags || [])].filter(Boolean),
                                lastFlag: flag
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
