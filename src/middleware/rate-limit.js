'use strict';

const rateLimit = require('express-rate-limit');

/**
 * Standard JSON handler for all rate limit responses.
 * Keeps the error format consistent with the rest of the API.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
function rateLimitHandler(req, res) {
  res.status(429).json({ error: 'Too many requests' });
}

/**
 * Global limiter — applied to every incoming request.
 *
 * Limit : 100 requests per 15 minutes per IP
 * Scope : all routes
 */
const globalLimiter = rateLimit({
  windowMs:        15 * 60 * 1000, // 15 minutes
  max:             100,
  standardHeaders: true,            // Return rate limit info in RateLimit-* headers
  legacyHeaders:   false,           // Disable X-RateLimit-* headers
  handler:         rateLimitHandler,
});

/**
 * Auth limiter — applied only to login and register routes.
 *
 * Limit : 5 requests per 1 minute per IP
 * Scope : POST /auth/login, POST /auth/register
 */
const authLimiter = rateLimit({
  windowMs:        1 * 60 * 1000, // 1 minute
  max:             5,
  standardHeaders: true,
  legacyHeaders:   false,
  handler:         rateLimitHandler,
});

module.exports = { globalLimiter, authLimiter };
