'use strict';

require('dotenv').config();

const isProd = process.env.NODE_ENV === 'production';
const processType = process.env.PROCESS_TYPE;

if (isProd) {
  if (processType !== 'web' && processType !== 'worker') {
    throw new Error(
      '[env] In production (NODE_ENV=production), PROCESS_TYPE must be explicitly set to either "web" or "worker".'
    );
  }
}

const REQUIRED_VARIABLES = [
  'PORT',
  'JWT_SECRET',
  'RESEND_API_KEY',
  'ALERT_FROM_EMAIL',
  'ALERT_TO_EMAIL',
];

console.log('[DEBUG] DATABASE_URL exists:', !!process.env.DATABASE_URL);
console.log('[DEBUG] REDIS_URL exists:', !!process.env.REDIS_URL);

const hasDatabaseUrl = process.env.DATABASE_URL !== undefined && process.env.DATABASE_URL.trim() !== '';
const hasRedisUrl = process.env.REDIS_URL !== undefined && process.env.REDIS_URL.trim() !== '';

if (!hasDatabaseUrl) {
  REQUIRED_VARIABLES.push(
    'DB_HOST',
    'DB_PORT',
    'DB_USER',
    'DB_PASSWORD',
    'DB_NAME'
  );
}

if (!hasRedisUrl) {
  REQUIRED_VARIABLES.push('REDIS_HOST', 'REDIS_PORT');
}

const missing = REQUIRED_VARIABLES.filter(
  (key) => !process.env[key] || process.env[key].trim() === ''
);

if (missing.length > 0) {
  throw new Error(
    `[env] Missing required environment variables: ${missing.join(', ')}. ` +
      'Check your .env file against .env.example.'
  );
}

const env = {
  port: parseInt(process.env.PORT, 10),
  processType: processType || null,

  db: {
    connectionString: process.env.DATABASE_URL || null,
    host: process.env.DB_HOST || null,
    port: process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : null,
    user: process.env.DB_USER || null,
    password: process.env.DB_PASSWORD || null,
    name: process.env.DB_NAME || null,
    ssl: process.env.DB_SSL === 'true',
  },

  redis: {
    url: process.env.REDIS_URL || null,
    host: process.env.REDIS_HOST || null,
    port: process.env.REDIS_PORT ? parseInt(process.env.REDIS_PORT, 10) : null,
  },

  jwtSecret: process.env.JWT_SECRET,

  resendApiKey:   process.env.RESEND_API_KEY,
  alertFromEmail: process.env.ALERT_FROM_EMAIL,
  // TODO: Remove alertToEmail after email delivery testing is complete.
  alertToEmail:   process.env.ALERT_TO_EMAIL,
};

module.exports = env;
