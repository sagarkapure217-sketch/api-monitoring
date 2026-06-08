'use strict';

const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');
const env = require('../config/env');

const SALT_ROUNDS = 10;
const JWT_EXPIRY = '7d';

/**
 * Register a new user.
 *
 * @param {string} email
 * @param {string} password - plain-text; hashed before storage
 * @returns {Promise<{ id: string, email: string, created_at: string }>}
 * @throws EMAIL_EXISTS if the email is already registered
 */
async function registerUser(email, password) {
  const existing = await pool.query(
    'SELECT id FROM users WHERE email = $1',
    [email]
  );

  if (existing.rows.length > 0) {
    const err = new Error('Email is already registered');
    err.code = 'EMAIL_EXISTS';
    throw err;
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  const result = await pool.query(
    `INSERT INTO users (email, password_hash)
     VALUES ($1, $2)
     RETURNING id, email, created_at`,
    [email, passwordHash]
  );

  return result.rows[0];
}

/**
 * Authenticate a user and return a signed JWT.
 *
 * @param {string} email
 * @param {string} password - plain-text
 * @returns {Promise<{ token: string }>}
 * @throws INVALID_CREDENTIALS if email not found or password does not match
 */
async function loginUser(email, password) {
  const result = await pool.query(
    'SELECT id, email, password_hash FROM users WHERE email = $1',
    [email]
  );

  if (result.rows.length === 0) {
    const err = new Error('Invalid credentials');
    err.code = 'INVALID_CREDENTIALS';
    throw err;
  }

  const user = result.rows[0];

  const isMatch = await bcrypt.compare(password, user.password_hash);

  if (!isMatch) {
    const err = new Error('Invalid credentials');
    err.code = 'INVALID_CREDENTIALS';
    throw err;
  }

  const token = jwt.sign(
    { userId: user.id, email: user.email },
    env.jwtSecret,
    { expiresIn: JWT_EXPIRY }
  );

  return { token };
}

module.exports = { registerUser, loginUser };
