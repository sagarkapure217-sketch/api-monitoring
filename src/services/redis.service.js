'use strict';

const redis = require('../config/redis');

// ---------------------------------------------------------------------------
// Key helpers
// ---------------------------------------------------------------------------

const statusKey  = (monitorId) => `monitor:${monitorId}:status`;
const failKey    = (monitorId) => `monitor:${monitorId}:fail_count`;

const FAIL_COUNT_TTL_SECONDS = 600;

// ---------------------------------------------------------------------------
// Feature 1: Status Cache (Redis Hash)
// ---------------------------------------------------------------------------

/**
 * Write the latest check result into a Redis Hash.
 *
 * Key:    monitor:{id}:status
 * Fields: status, response_time_ms, checked_at
 * TTL:    interval_minutes * 2 minutes
 *
 * Storing response_time_ms as an empty string when null preserves the Hash
 * field so hgetall always returns a consistent structure.
 *
 * @param {string} monitorId
 * @param {{ status: string, responseTimeMs: number|null }} checkResult
 * @param {number} intervalMinutes
 */
async function updateStatusCache(monitorId, checkResult, intervalMinutes) {
  const key        = statusKey(monitorId);
  const ttlSeconds = intervalMinutes * 2 * 60;

  await redis.hset(key, {
    status:          checkResult.status,
    response_time_ms: checkResult.responseTimeMs !== null
      ? String(checkResult.responseTimeMs)
      : '',
    checked_at:      new Date().toISOString(),
  });

  await redis.expire(key, ttlSeconds);
}

/**
 * Read the cached status for a monitor.
 *
 * Returns null on cache miss (key expired or never set).
 * Normalises response_time_ms back to number|null.
 *
 * @param {string} monitorId
 * @returns {Promise<{
 *   status: string,
 *   status_code: null,
 *   response_time_ms: number|null,
 *   error_message: null,
 *   checked_at: string
 * }|null>}
 */
async function getCachedStatus(monitorId) {
  const key  = statusKey(monitorId);
  const data = await redis.hgetall(key);

  // hgetall returns {} (empty object) on a missing key — treat as cache miss
  if (!data || !data.status) {
    return null;
  }

  return {
    status:          data.status,
    // status_code and error_message are not stored in the cache
    status_code:     null,
    response_time_ms: data.response_time_ms !== ''
      ? parseInt(data.response_time_ms, 10)
      : null,
    error_message:   null,
    checked_at:      data.checked_at,
  };
}

// ---------------------------------------------------------------------------
// Feature 2: Failure Counter
// ---------------------------------------------------------------------------

/**
 * Increment the consecutive failure counter for a monitor (DOWN check).
 *
 * Key: monitor:{id}:fail_count
 * TTL: 600 seconds — counter resets automatically if no checks run for 10 min.
 *
 * @param {string} monitorId
 * @returns {Promise<number>} new failure count after increment
 */
async function incrementFailureCount(monitorId) {
  const key   = failKey(monitorId);
  const count = await redis.incr(key);
  await redis.expire(key, FAIL_COUNT_TTL_SECONDS);
  return count;
}

/**
 * Reset the failure counter for a monitor (UP check).
 * Deletes the key entirely so the next DOWN starts fresh from 1.
 *
 * @param {string} monitorId
 */
async function resetFailureCount(monitorId) {
  await redis.del(failKey(monitorId));
}

module.exports = {
  updateStatusCache,
  getCachedStatus,
  incrementFailureCount,
  resetFailureCount,
};
