const express = require('express');
const http = require('http');
const { Server: SocketIO } = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');

const config = require('./config');
const connectDB = require('./config/db');
const logger = require('./utils/logger');
const errorHandler = require('./middleware/errorHandler');

// Route imports
const authRoutes         = require('./routes/auth.routes');
const examRoutes         = require('./routes/exam.routes');
const proctoringRoutes   = require('./routes/proctoring.routes');
const proctorRoutes      = require('./routes/proctor.routes');   // legacy event log
const verificationRoutes = require('./routes/verification.routes');
const organizationRoutes = require('./routes/organization.routes');

// ─── App Setup ───────────────────────────────────────────────────────────────
const app = express();
const server = http.createServer(app);

const { createAdapter } = require('@socket.io/redis-adapter');
const { Redis } = require('ioredis');

const setupSockets = require('./sockets/index');

// ─── Socket.IO (real-time proctoring events) ─────────────────────────────────
const io = new SocketIO(server, {
    cors: {
        origin: config.clientUrl || 'http://localhost:5173',
        methods: ['GET', 'POST'],
    },
});

if (config.redis && config.redis.url) {
    const pubClient = new Redis(config.redis.url);
    const subClient = pubClient.duplicate();
    io.adapter(createAdapter(pubClient, subClient));
    logger.info('Connected Socket.IO to Redis Adapter.');
}

// Attach io to req for controllers
app.set('io', io);

// Initialize Socket Events
setupSockets(io);

// ─── Security Middleware ──────────────────────────────────────────────────────
app.use(helmet());
app.use(cors({
    origin: config.clientUrl || 'http://localhost:5173',
    credentials: true,
}));
app.use(mongoSanitize());
app.use(compression());

// Rate limiting
const limiter = rateLimit({
    windowMs: parseInt(config.security.rateLimitWindowMs || '900000'), // 15 minutes
    max: parseInt(config.security.rateLimitMax || '10000'), // High limit for proctoring events
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

app.use('/api/auth',          authRoutes);
app.use('/api/exams',         examRoutes);
app.use('/api/proctoring',    proctoringRoutes);
app.use('/api/proctor',       proctorRoutes);     // legacy event log endpoints
app.use('/api/verification',  verificationRoutes);
app.use('/api/organizations', organizationRoutes);

// 404 handler
app.use((req, res) => {
    res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found.` });
});

// Global error handler
app.use(errorHandler);

// ─── Start Server ─────────────────────────────────────────────────────────────
const PORT = config.port || 5000;

const startServer = async () => {
    try {
        await connectDB();
        server.listen(PORT, () => {
            logger.info(`🚀 HawkWatch API running on port ${PORT} [${config.env || 'development'}]`);
            logger.info(`🔗 Health: http://localhost:${PORT}/api/health`);
        });
    } catch (error) {
        logger.error(`Error starting server: ${error.message}`);
        process.exit(1);
    }
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
process.on('SIGINT', async () => {
    logger.info('SIGINT received. Shutting down gracefully...');
    server.close(() => {
        logger.info('HTTP server closed.');
        process.exit(0);
    });
});

// Trigger nodemon restart

// Export for serverless environments (like Vercel)
module.exports = app;
