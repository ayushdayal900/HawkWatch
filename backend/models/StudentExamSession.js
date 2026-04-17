const mongoose = require('mongoose');

const studentExamSessionSchema = new mongoose.Schema(
    {
        studentId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        examId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Exam',
            required: true,
        },
        answers: [
            {
                questionId: String,
                answer: mongoose.Schema.Types.Mixed,
            },
        ],
        startTimestamp: {
            type: Date,
            default: Date.now,
        },
        endTimestamp: {
            type: Date,
        },
    },
    { timestamps: true }
);

module.exports = mongoose.model('StudentExamSession', studentExamSessionSchema);
