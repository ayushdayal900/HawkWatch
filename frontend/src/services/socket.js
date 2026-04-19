import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';

class SocketService {
    constructor() {
        this.socket = null;
    }

    connect(token) {
        if (!this.socket) {
            this.socket = io(SOCKET_URL, {
                auth: { token },
                autoConnect: false,
                transports: ['websocket', 'polling']
            });
        }
        if (!this.socket.connected) {
            this.socket.connect();
        }
        return this.socket;
    }

    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
        }
    }

    joinSession(sessionId, role = 'student') {
        const emitJoin = () => {
            if (this.socket && this.socket.connected) {
                this.socket.emit('session_join', { sessionId, role });
            }
        };

        if (this.socket) {
            if (this.socket.connected) {
                emitJoin();
            } else {
                this.socket.once('connect', emitJoin);
            }
        }
    }

    reportCheating(sessionId, flagData) {
        if (this.socket && this.socket.connected) {
            this.socket.emit('cheating_detected', { sessionId, flagData });
        }
    }

    sendSessionUpdate(sessionId, updateData) {
        if (this.socket && this.socket.connected) {
            this.socket.emit('session_update', { sessionId, updateData });
        }
    }

    onCheatingDetected(callback) {
        if (this.socket) {
            this.socket.on('cheating_detected', callback);
        }
    }

    onSessionUpdate(callback) {
        if (this.socket) {
            this.socket.on('session_update', callback);
        }
    }
    
    offCheatingDetected(callback) {
        if (this.socket) {
            this.socket.off('cheating_detected', callback);
        }
    }
    
    offSessionUpdate(callback) {
        if (this.socket) {
            this.socket.off('session_update', callback);
        }
    }

    getSocket() {
        return this.socket;
    }

    joinProctorRoom(examId) {
        const emitJoin = () => {
            if (this.socket && this.socket.connected) {
                this.socket.emit('join-proctor-room', { sessionId: examId });
            }
        };
        if (this.socket) {
            if (this.socket.connected) {
                emitJoin();
            } else {
                this.socket.once('connect', emitJoin);
            }
        }
    }

    onVideoStream(callback) {
        if (this.socket) {
            this.socket.on('video_stream', callback);
        }
    }

    offVideoStream(callback) {
        if (this.socket) {
            this.socket.off('video_stream', callback);
        }
    }
}

export const socketService = new SocketService();
export default socketService;
