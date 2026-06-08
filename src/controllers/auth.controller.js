'use strict';

const authService = require('../services/auth.service');

/**
 * POST /auth/register
 */
async function register(req, res) {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'email and password are required' });
  }

  try {
    const user = await authService.registerUser(email, password);
    return res.status(201).json({ user });
  } catch (err) {
    if (err.code === 'EMAIL_EXISTS') {
      return res.status(409).json({ error: 'Email is already registered' });
    }
    console.error('[auth.controller] register error:', err.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * POST /auth/login
 */
async function login(req, res) {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'email and password are required' });
  }

  try {
    const result = await authService.loginUser(email, password);
    return res.status(200).json(result);
  } catch (err) {
    if (err.code === 'INVALID_CREDENTIALS') {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    console.error('[auth.controller] login error:', err.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = { register, login };
