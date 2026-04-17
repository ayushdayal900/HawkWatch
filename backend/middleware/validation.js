const Joi = require('joi');

const examCreateSchema = Joi.object({
    title: Joi.string().required().min(3).max(100),
    description: Joi.string().allow('', null),
    instructions: Joi.string().allow('', null),
    duration: Joi.number().integer().min(1).required(),
    passingMarks: Joi.number().min(0).required(),
    questions: Joi.array().items(
        Joi.object({
            questionText: Joi.string().required(),
            type: Joi.string().valid('mcq').default('mcq'),
            options: Joi.array().items(Joi.string()).min(2).required(),
            correctAnswer: Joi.number().integer().min(0).required(),
            points: Joi.number().min(1).default(1)
        })
    ).min(1).required(),
    proctoring: Joi.object({
        requireIdVerification: Joi.boolean().default(true),
        requireRoomScan: Joi.boolean().default(true),
        strictBrowser: Joi.boolean().default(true),
        recordVideo: Joi.boolean().default(true)
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
