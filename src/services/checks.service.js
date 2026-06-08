'use strict';

const pool = require('../config/db');
const { getCachedStatus } = require('./redis.service');

/**
 * Assert that a monitor exists and belongs to the authenticated user.
 * Used by both read endpoints before touching the checks table.
 *
 * Throws MONITOR_NOT_FOUND if the monitor does not exist OR belongs
 * to a different user — same pattern as monitor CRUD to avoid info leakage.
 *
 * @param {string} monitorId
 * @param {string} userId
 */
async function assertOwnership(monitorId, userId) {
  const result = await pool.query(
    'SELECT id FROM monitors WHERE id = $1 AND user_id = $2',
    [monitorId, userId]
  );

  if (result.rows.length === 0) {
    const err = new Error('Monitor not found');
    err.code = 'MONITOR_NOT_FOUND';
    throw err;
  }
}

/**
 * Return the latest 100 checks for a monitor, most recent first.
 *
 * @param {string} monitorId
 * @param {string} userId
 * @returns {Promise<object[]>} up to 100 check rows (empty array if none yet)
 * @throws MONITOR_NOT_FOUND
 */
async function getChecks(monitorId, userId) {
  await assertOwnership(monitorId, userId);

  const result = await pool.query(
    `SELECT status, status_code, response_time_ms, error_message, checked_at
     FROM   checks
     WHERE  monitor_id = $1
     ORDER  BY checked_at DESC
     LIMIT  100`,
    [monitorId]
  );

  return result.rows;
}

/**
 * Return only the single most recent check for a monitor.
 *
 * @param {string} monitorId
 * @param {string} userId
 * @returns {Promise<object|null>} the latest check row, or null if no checks exist yet
 * @throws MONITOR_NOT_FOUND
 */
async function getLatestCheck(monitorId, userId) {
  await assertOwnership(monitorId, userId);

  // 1. Try Redis cache first — fastest path, avoids a DB round-trip
  //    Wrapped in try-catch: Redis failure falls through to PostgreSQL transparently.
  try {
    const cached = await getCachedStatus(monitorId);
    if (cached) {
      return cached; // shape matches PostgreSQL row (status_code/error_message are null in cache)
    }
  } catch (redisErr) {
    console.error(`[checks.service] Redis cache lookup failed (falling back to DB): ${redisErr.message}`);
  }

  // 2. Cache miss or Redis error — fall back to PostgreSQL (source of truth)
  const result = await pool.query(
    `SELECT status, status_code, response_time_ms, error_message, checked_at
     FROM   checks
     WHERE  monitor_id = $1
     ORDER  BY checked_at DESC
     LIMIT  1`,
    [monitorId]
  );

  return result.rows.length > 0 ? result.rows[0] : null;
}

module.exports = { getChecks, getLatestCheck };
