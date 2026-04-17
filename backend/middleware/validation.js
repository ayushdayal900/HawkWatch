const Joi = require('joi');

const examCreateSchema = Joi.object({
    title: Joi.string().required().min(3).max(100),
    description: Joi.string().allow('', null),
    instructions: Joi.alternatives().try(Joi.array().items(Joi.string()), Joi.string().allow('', null)),
    duration: Joi.number().integer().min(1).required(),
    passingMarks: Joi.number().min(0).required(),
    questions: Joi.array().items(
        Joi.object({
            questionText: Joi.string().required(),
            type: Joi.string().valid('mcq', 'multi-select', 'short-answer', 'code').default('mcq'),
            options: Joi.array().items(
                Joi.object({
                    label: Joi.string(),
                    text: Joi.string().allow('', null)
                })
            ).min(2).required(),
            correctAnswer: Joi.alternatives().try(Joi.string(), Joi.number(), Joi.array()).required(),
            points: Joi.number().min(1).default(1),
            difficulty: Joi.string().valid('easy', 'medium', 'hard').default('medium'),
            explanation: Joi.string().allow('', null)
        })
    ).min(1).required(),
    proctoring: Joi.object({
        enabled: Joi.boolean().default(true),
        webcamRequired: Joi.boolean().default(true),
        fullscreenRequired: Joi.boolean().default(true),
        faceDetection: Joi.boolean().default(true),
        deepfakeDetection: Joi.boolean().default(true),
        behavioralBiometrics: Joi.boolean().default(true),
        tabSwitchLimit: Joi.number().default(3),
        flagThreshold: Joi.number().default(5)
    }).default(),
    allowedStudents: Joi.array().items(Joi.string().hex().length(24)).default([]),
    status: Joi.string().valid('draft', 'published').default('draft')
});

const validateBody = (schema) => {
    return (req, res, next) => {
        const { error } = schema.validate(req.body, { abortEarly: false });
        if (error) {
            const errors = error.details.map(err => err.message);
            return res.status(400).json({ success: false, message: 'Validation Exception', errors });
        }
        next();
    };
};

module.exports = { validateBody, examCreateSchema };
