'use strict';

require('dotenv').config();

const REQUIRED_VARIABLES = [
  'PORT',
  'DB_HOST',
  'DB_PORT',
  'DB_USER',
  'DB_PASSWORD',
  'DB_NAME',
  'REDIS_HOST',
  'REDIS_PORT',
  'JWT_SECRET',
  'RESEND_API_KEY',
  'ALERT_FROM_EMAIL',
  'ALERT_TO_EMAIL',
];

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

  db: {
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT, 10),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    name: process.env.DB_NAME,
  },

  redis: {
    host: process.env.REDIS_HOST,
    port: parseInt(process.env.REDIS_PORT, 10),
  },

  jwtSecret: process.env.JWT_SECRET,

  resendApiKey:   process.env.RESEND_API_KEY,
  alertFromEmail: process.env.ALERT_FROM_EMAIL,
  // TODO: Remove alertToEmail after email delivery testing is complete.
  alertToEmail:   process.env.ALERT_TO_EMAIL,
};

module.exports = env;
