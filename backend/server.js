require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server: SocketIO } = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');

const connectDB = require('./config/db');
const logger = require('./utils/logger');
const errorHandler = require('./middleware/errorHandler');

// Route imports
const authRoutes = require('./routes/auth.routes');
const examRoutes = require('./routes/exam.routes');
const proctoringRoutes = require('./routes/proctoring.routes');
const verificationRoutes = require('./routes/verification.routes');

// ─── App Setup ───────────────────────────────────────────────────────────────
const app = express();
const server = http.createServer(app);

const { createAdapter } = require('@socket.io/redis-adapter');
const { Redis } = require('ioredis');

// ─── Socket.IO (real-time proctoring events) ─────────────────────────────────
const io = new SocketIO(server, {
    cors: {
        origin: process.env.CLIENT_URL || 'http://localhost:5173',
        methods: ['GET', 'POST'],
    },
});

if (process.env.REDIS_URL) {
    const pubClient = new Redis(process.env.REDIS_URL);
    const subClient = pubClient.duplicate();
    io.adapter(createAdapter(pubClient, subClient));
    logger.info('Connected Socket.IO to Redis Adapter.');
}

// Attach io to req for controllers
app.set('io', io);

io.on('connection', (socket) => {
    logger.info(`Socket connected: ${socket.id}`);

    socket.on('join-session', ({ sessionId }) => {
        socket.join(`session:${sessionId}`);
        logger.info(`Socket ${socket.id} joined session room: ${sessionId}`);
    });

    socket.on('proctor-event', ({ sessionId, eventType, data }) => {
        // Broadcast to examiners watching this session
        io.to(`proctor:${sessionId}`).emit('student-event', { eventType, data, timestamp: Date.now() });
    });

    socket.on('join-proctor-room', ({ sessionId }) => {
        socket.join(`proctor:${sessionId}`);
    });

    socket.on('disconnect', () => {
        logger.info(`Socket disconnected: ${socket.id}`);
    });
});

// ─── Security Middleware ──────────────────────────────────────────────────────
app.use(helmet());
app.use(cors({
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    credentials: true,
}));
app.use(mongoSanitize());
app.use(compression());

// Rate limiting
const limiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'),
    max: parseInt(process.env.RATE_LIMIT_MAX || '100'),
    message: { success: false, message: 'Too many requests. Please try again later.' },
});
app.use('/api/', limiter);

// Request logging
app.use(morgan('combined', {
    stream: { write: (message) => logger.http(message.trim()) },
}));

// Body parsing
app.use(express.json({ limit: '10mb' })); // 10mb for base64 frames
app.use(express.urlencoded({ extended: true }));

// ─── Routes ──────────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
    res.status(200).json({
        success: true,
        status: 'ok',
        service: 'HawkWatch API',
        version: '1.0.0',
        timestamp: new Date().toISOString(),
    });
});

app.use('/api/auth', authRoutes);
app.use('/api/exams', examRoutes);
app.use('/api/proctoring', proctoringRoutes);
app.use('/api/verification', verificationRoutes);

// 404 handler
app.use((req, res) => {
    res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found.` });
});

// Global error handler
app.use(errorHandler);

// ─── Start Server ─────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;

const startServer = async () => {
    await connectDB();
    server.listen(PORT, () => {
        logger.info(`🚀 HawkWatch API running on port ${PORT} [${process.env.NODE_ENV || 'development'}]`);
        logger.info(`🔗 Health: http://localhost:${PORT}/api/health`);
    });
};

startServer();

// Graceful shutdown
process.on('SIGTERM', async () => {
    logger.info('SIGTERM received. Shutting down gracefully...');
    server.close(() => {
        logger.info('HTTP server closed.');
        process.exit(0);
    });
});
// 
// restart 2 
