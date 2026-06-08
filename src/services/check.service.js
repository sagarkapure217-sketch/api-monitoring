'use strict';

const pool = require('../config/db');

/**
 * Persist a single health check result into the checks table.
 *
 * Column behaviour:
 *   status_code      — present for HTTP responses (2xx–5xx); NULL for network errors
 *   response_time_ms — present for HTTP responses; NULL for network errors
 *   error_message    — present for network errors (timeout, DNS, refused); NULL otherwise
 *
 * @param {object}      params
 * @param {string}      params.monitorId
 * @param {string}      params.status          - 'UP' | 'DOWN'
 * @param {number|null} params.statusCode       - HTTP status code or null
 * @param {number|null} params.responseTimeMs   - wall-clock ms or null
 * @param {string|null} params.errorMessage     - network error description or null
 * @returns {Promise<object>} inserted check row
 */
async function saveCheck({ monitorId, status, statusCode, responseTimeMs, errorMessage }) {
  const result = await pool.query(
    `INSERT INTO checks (monitor_id, status, status_code, response_time_ms, error_message)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, monitor_id, status, status_code, response_time_ms, error_message, checked_at`,
    [monitorId, status, statusCode ?? null, responseTimeMs ?? null, errorMessage ?? null]
  );

  return result.rows[0];
}

module.exports = { saveCheck };
