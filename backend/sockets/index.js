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

        // ── dashboard_join: for real-time stats ──────────────────────────────
        socket.on('dashboard_join', () => {
            socket.join('dashboard');
            logger.info(`Socket ${socket.id} joined dashboard room`);
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
                    
                    // Import service dynamically to avoid circular deps if any
                    const aiService = require('../services/aiProctoring.service');
                    session.riskScore = await aiService.computeRiskScore(session);
                    await session.save();

                    const payload = {
                        sessionId: session._id,
                        flag,
                        riskScore: session.riskScore,
                        student: session.student,
                    };

                    // Notify examiners of this specific session
                    io.to(`proctor:${sessionId}`).emit('flag-event', payload);

                    // Also notify examiners of the exam
                    if (session.exam) {
                        io.to(`proctor:${session.exam}`).emit('flag-event', payload);
                    }

                    // Broadcast flag update to dashboard
                    io.to('dashboard').emit('stats_update', { type: 'flag', sessionId: session._id });

                    socket.emit('session_update', { riskScore: session.riskScore });
                }
            } catch (err) {
                logger.error(`Error handling proctoring_event: ${err.message}`);
            }
        });

        // ── video_frame (student → admin live stream) ─────────────────────────
        socket.on('video_frame', async (data) => {
            const { sessionId, examId, frame } = data;
            if (!frame) return;

            const payload = { sessionId, frame, timestamp: Date.now() };

            if (examId) io.to(`proctor:${examId}`).emit('video_stream', payload);
            if (sessionId) io.to(`proctor:${sessionId}`).emit('video_stream', payload);

            // Heartbeat update every 10th frame
            if (!socket.frameCount) socket.frameCount = 0;
            socket.frameCount++;
            if (socket.frameCount % 10 === 0) {
                await ProctoringSession.findByIdAndUpdate(sessionId, { lastHeartbeat: new Date() }).catch(() => {});
            }
        });

        // ── session_start (emitted by client when exam begins) ───────────────
        socket.on('session_start', ({ sessionId }) => {
            io.to('dashboard').emit('stats_update', { type: 'session_start', sessionId });
        });

        // ── disconnect ───────────────────────────────────────────────────────
        socket.on('disconnect', async () => {
            logger.info(`Socket disconnected: ${socket.id}`);

            if (socket.role === 'student' && socket.sessionId) {
                try {
                    const session = await ProctoringSession.findById(socket.sessionId);
                    if (session && session.status === 'active') {
                        // Notify dashboard of session end (potential)
                        io.to('dashboard').emit('stats_update', { type: 'session_end', sessionId: socket.sessionId });
                        
                        const flag = {
                            type: 'camera_off',
                            severity: 'medium',
                            timestamp: new Date(),
                            details: { reason: 'Socket connection lost' }
                        };
                        session.flags.push(flag);
                        const aiService = require('../services/aiProctoring.service');
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
