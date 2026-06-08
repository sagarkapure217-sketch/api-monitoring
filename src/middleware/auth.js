'use strict';

const jwt = require('jsonwebtoken');
const env = require('../config/env');

/**
 * Express middleware that enforces JWT authentication.
 *
 * Reads the Authorization header:
 *   Authorization: Bearer <token>
 *
 * On success:  attaches req.user = { id, email } and calls next()
 * On failure:  responds with 401 and a descriptive error
 */
function authenticate(req, res, next) {
  const authHeader = req.headers['authorization'];

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: 'Authorization header is missing or malformed. Expected: Bearer <token>',
    });
  }

  const token = authHeader.slice(7); // strip "Bearer "

  try {
    const payload = jwt.verify(token, env.jwtSecret);
    req.user = { id: payload.userId, email: payload.email };
    return next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token has expired' });
    }
    return res.status(401).json({ error: 'Invalid token' });
  }
}

module.exports = { authenticate };
