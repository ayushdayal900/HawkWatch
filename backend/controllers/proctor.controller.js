const ProctorEvent = require('../models/ProctorEvent');
const { RISK_WEIGHTS, calculateRiskScore } = require('../services/riskEngine');

exports.logEvent = async (req, res, next) => {
    try {
        const { studentId, examId, eventType, timestamp, riskWeight } = req.body;
        
        const weight = riskWeight !== undefined ? riskWeight : (RISK_WEIGHTS[eventType] || 0);
        
        const event = await ProctorEvent.create({
            studentId: studentId || req.user._id,
            examId,
            eventType,
            timestamp: timestamp || Date.now(),
            riskWeight: weight
        });
        
        const io = req.app.get('io');
        if (io) {
            io.to(`proctor:${examId}`).emit('student-event', { event });
        }
        
        res.status(201).json({ success: true, data: event });
    } catch (error) {
        next(error);
    }
};

exports.getEvents = async (req, res, next) => {
    try {
        const { examId } = req.params;
        const query = { examId };
        
        // If the user wants events only for themselves, we could filter it here, 
        // but examiners might want to see all events for an exam.
        // Assumed we just want events by examId, we can add studentId filtering if provided:
        if (req.query.studentId) {
             query.studentId = req.query.studentId;
        }

        const events = await ProctorEvent.find(query).sort({ timestamp: -1 });
        
        const { riskScore, riskLevel } = calculateRiskScore(events);

        res.status(200).json({ success: true, data: events, riskScore, riskLevel });
    } catch (error) {
        next(error);
    }
};
