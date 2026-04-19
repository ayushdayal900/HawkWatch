require('dotenv').config();
const Joi = require('joi');

const envVarsSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
  PORT: Joi.number().default(5000),
  CLIENT_URL: Joi.string().required(),
  
  MONGO_URI: Joi.string().required().description('Mongo DB URI'),
  
  JWT_SECRET: Joi.string().required().description('JWT Secret required to sign'),
  JWT_ACCESS_SECRET: Joi.string().required().description('JWT Access Secret'),
  JWT_EXPIRE: Joi.string().default('7d'),
  JWT_REFRESH_SECRET: Joi.string().required().description('JWT Refresh Secret'),
  JWT_REFRESH_EXPIRE: Joi.string().default('30d'),
  
  AWS_ACCESS_KEY_ID: Joi.string().allow('').optional(),
  AWS_SECRET_ACCESS_KEY: Joi.string().allow('').optional(),
  AWS_REGION: Joi.string().default('us-east-1'),
  AWS_S3_BUCKET: Joi.string().allow('').optional(),
  REKOGNITION_SIMILARITY_THRESHOLD: Joi.number().default(70),
  USE_REKOGNITION: Joi.boolean().default(false),
  
  VERIFY_MIN_BRIGHTNESS: Joi.number().default(25),
  VERIFY_MIN_SHARPNESS: Joi.number().default(20),
  VERIFY_MIN_FACE_CONF: Joi.number().default(80),
  
  SMTP_HOST: Joi.string().allow('').optional(),
  SMTP_PORT: Joi.number().default(587),
  SMTP_USER: Joi.string().allow('').optional(),
  SMTP_PASS: Joi.string().allow('').optional(),
  EMAIL_FROM: Joi.string().allow('').optional(),
  
  AI_SERVICE_URL: Joi.string().allow('').optional(),
  AI_SERVICE_API_KEY: Joi.string().allow('').optional(),
  
  RATE_LIMIT_WINDOW_MS: Joi.number().default(900000),
  RATE_LIMIT_MAX: Joi.number().default(100),
  
  FACE_CONFIDENCE_THRESHOLD: Joi.number().default(0.7),
  DEEPFAKE_SCORE_THRESHOLD: Joi.number().default(0.6),
  BEHAVIORAL_ANOMALY_THRESHOLD: Joi.number().default(0.75),
  
  REDIS_URL: Joi.string().allow('').optional()
}).unknown();

const { value: envVars, error } = envVarsSchema.prefs({ errors: { label: 'key' } }).validate(process.env);

if (error) {
  throw new Error(`Config validation error: ${error.message}`);
}

module.exports = {
  env: envVars.NODE_ENV,
  port: envVars.PORT,
  clientUrl: envVars.CLIENT_URL,
  database: {
    url: envVars.MONGO_URI,
  },
  auth: {
    jwtSecret: envVars.JWT_SECRET,
    jwtAccessSecret: envVars.JWT_ACCESS_SECRET,
    jwtExpire: envVars.JWT_EXPIRE,
    jwtRefreshSecret: envVars.JWT_REFRESH_SECRET,
    jwtRefreshExpire: envVars.JWT_REFRESH_EXPIRE,
  },
  aws: {
    accessKeyId: envVars.AWS_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY,
    secretAccessKey: envVars.AWS_SECRET_ACCESS_KEY || process.env.AWS_SECRET_KEY,
    region: envVars.AWS_REGION,
    bucket: envVars.AWS_S3_BUCKET,
    similarityThreshold: envVars.REKOGNITION_SIMILARITY_THRESHOLD,
    useRekognition: envVars.USE_REKOGNITION,
  },
  verify: {
    minBrightness: envVars.VERIFY_MIN_BRIGHTNESS,
    minSharpness: envVars.VERIFY_MIN_SHARPNESS,
    minFaceConf: envVars.VERIFY_MIN_FACE_CONF,
  },
  email: {
    smtp: {
      host: envVars.SMTP_HOST,
      port: envVars.SMTP_PORT,
      auth: {
        user: envVars.SMTP_USER,
        pass: envVars.SMTP_PASS,
      },
    },
    from: envVars.EMAIL_FROM,
  },
  aiService: {
    url: envVars.AI_SERVICE_URL,
    apiKey: envVars.AI_SERVICE_API_KEY,
  },
  security: {
    rateLimitWindowMs: envVars.RATE_LIMIT_WINDOW_MS,
    rateLimitMax: envVars.RATE_LIMIT_MAX,
  },
  thresholds: {
    faceConfidence: envVars.FACE_CONFIDENCE_THRESHOLD,
    deepfakeScore: envVars.DEEPFAKE_SCORE_THRESHOLD,
    behavioralAnomaly: envVars.BEHAVIORAL_ANOMALY_THRESHOLD,
  },
  redis: {
    url: envVars.REDIS_URL,
  }
};
