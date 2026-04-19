const logger = require('../utils/logger');
const ProctoringSession = require('../models/ProctoringSession');
const aiService = require('../services/aiProctoring.service');

function setupSockets(io) {
    io.on('connection', (socket) => {
        logger.info(`Socket connected: ${socket.id}`);

        // ── session_join: used by new socketService ──────────────────────────
        // role=student  → joins room: session:<sessionId>
        // role=examiner → joins room: proctor:<sessionId>  (sessionId here = examId passed by admin)
        socket.on('session_join', ({ sessionId, role }) => {
            socket.sessionId = sessionId;
            socket.role = role;
            const room = role === 'examiner' ? `proctor:${sessionId}` : `session:${sessionId}`;
            socket.join(room);
            logger.info(`Socket ${socket.id} (Role: ${role}) joined room: ${room}`);
            socket.emit('session_update', { message: `Successfully joined ${room}` });
        });

        // ── join-session (legacy backward compat) ───────────────────────────
        socket.on('join-session', ({ sessionId }) => {
            socket.sessionId = sessionId;
            socket.role = 'student';
            socket.join(`session:${sessionId}`);
            logger.info(`Socket ${socket.id} joined legacy session room: session:${sessionId}`);
        });

        // ── join-proctor-room (legacy backward compat) ──────────────────────
        socket.on('join-proctor-room', ({ sessionId }) => {
            socket.join(`proctor:${sessionId}`);
            logger.info(`Socket ${socket.id} joined proctor room: proctor:${sessionId}`);
        });

        // ── proctoring_event (camera on/off from student) ────────────────────
        socket.on('proctoring_event', async (data) => {
            const { type, severity, sessionId, timestamp } = data;
            try {
                const session = await ProctoringSession.findById(sessionId);
                if (session) {
                    const flag = {
                        type: type.toLowerCase(),
                        severity: severity.toLowerCase(),
                        timestamp: timestamp || new Date()
                    };
                    session.flags.push(flag);
                    session.flagCount = session.flags.length;
                    session.riskScore = await aiService.computeRiskScore(session);
                    await session.save();

                    // Notify examiners of this specific session
                    io.to(`proctor:${sessionId}`).emit('flag-event', {
                        sessionId: session._id,
                        flag,
                        riskScore: session.riskScore,
                        student: session.student,
                    });

                    // Also notify examiners of the exam (broadcast to exam room)
                    if (session.exam) {
                        io.to(`proctor:${session.exam}`).emit('flag-event', {
                            sessionId: session._id,
                            flag,
                            riskScore: session.riskScore,
                            student: session.student,
                        });
                    }

                    socket.emit('session_update', { riskScore: session.riskScore });
                }
            } catch (err) {
                logger.error(`Error handling proctoring_event: ${err.message}`);
            }
        });

        // ── video_frame (student → admin live stream) ─────────────────────────
        // Student emits: { sessionId, examId, frame }
        // Admin joins room proctor:<examId>
        // We broadcast to that room so all examiners of that exam see all students
        socket.on('video_frame', async (data) => {
            const { sessionId, examId, frame } = data;
            if (!frame) return;

            const payload = { sessionId, frame, timestamp: Date.now() };

            // Primary: broadcast to exam-wide proctor room (admin monitors exam)
            if (examId) {
                io.to(`proctor:${examId}`).emit('video_stream', payload);
            }

            // Secondary: broadcast to session-specific proctor room (per-student inspect view)
            if (sessionId) {
                io.to(`proctor:${sessionId}`).emit('video_stream', payload);
            }

            // Heartbeat update every 5th frame (~10s)
            if (!socket.frameCount) socket.frameCount = 0;
            socket.frameCount++;
            if (socket.frameCount % 5 === 0) {
                await ProctoringSession.findByIdAndUpdate(sessionId, { lastHeartbeat: new Date() }).catch(() => {});
            }
        });

        // ── cheating_detected (from proctor overlay or AI) ───────────────────
        socket.on('cheating_detected', ({ sessionId, flagData }) => {
            io.to(`proctor:${sessionId}`).emit('cheating_detected', {
                sessionId,
                flagData,
                timestamp: Date.now()
            });
            logger.info(`Cheating detected in session ${sessionId}`);
        });

        // ── proctor-event (legacy flag event from student) ───────────────────
        socket.on('proctor-event', ({ sessionId, eventType, data }) => {
            io.to(`proctor:${sessionId}`).emit('student-event', { eventType, data, timestamp: Date.now() });
        });

        // ── session_update relay ─────────────────────────────────────────────
        socket.on('session_update', ({ sessionId, updateData }) => {
            io.to(`proctor:${sessionId}`).emit('session_update', {
                sessionId,
                updateData,
                timestamp: Date.now()
            });
        });

        // ── disconnect ───────────────────────────────────────────────────────
        socket.on('disconnect', async () => {
            logger.info(`Socket disconnected: ${socket.id}`);

            if (socket.role === 'student' && socket.sessionId) {
                try {
                    const session = await ProctoringSession.findById(socket.sessionId);
                    if (session && session.status === 'active') {
                        const flag = {
                            type: 'camera_off',
                            severity: 'medium',
                            timestamp: new Date(),
                            details: { reason: 'Socket connection lost' }
                        };
                        session.flags.push(flag);
                        session.riskScore = await aiService.computeRiskScore(session);
                        await session.save();

                        const notifyPayload = {
                            sessionId: session._id,
                            flag,
                            riskScore: session.riskScore,
                            student: session.student,
                        };

                        io.to(`proctor:${socket.sessionId}`).emit('flag-event', notifyPayload);
                        if (session.exam) {
                            io.to(`proctor:${session.exam}`).emit('flag-event', notifyPayload);
                        }
                    }
                } catch (err) {
                    logger.error(`Error handling student disconnect: ${err.message}`);
                }
            }
        });
    });
}

module.exports = setupSockets;
