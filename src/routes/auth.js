'use strict';

const { Router } = require('express');
const authController = require('../controllers/auth.controller');
const { authLimiter } = require('../middleware/rate-limit');

const router = Router();

// Auth limiter: 5 requests per 1 minute per IP
// Applied per-route (not router-level) to avoid limiting future auth GET endpoints
router.post('/auth/register', authLimiter, authController.register);
router.post('/auth/login',    authLimiter, authController.login);

module.exports = router;
