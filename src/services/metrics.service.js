'use strict';

const pool = require('../config/db');

/**
 * Return aggregated health check metrics for a monitor.
 *
 * All five values are computed in a single SQL query using conditional
 * aggregation — no rows are fetched and processed in JavaScript.
 *
 * Ownership is enforced before the aggregation query. If the monitor does
 * not exist or belongs to a different user, MONITOR_NOT_FOUND is thrown.
 *
 * Edge cases:
 *   - Zero checks: all counts are 0, uptime_percentage is 0, avg is 0.
 *   - No successful (UP) checks: avg_response_time_ms is 0 (AVG returns NULL
 *     when the FILTER matches no rows — normalized to 0 before returning).
 *
 * @param {string} monitorId
 * @param {string} userId
 * @returns {Promise<{
 *   total_checks: number,
 *   up_checks: number,
 *   down_checks: number,
 *   uptime_percentage: number,
 *   avg_response_time_ms: number
 * }>}
 * @throws MONITOR_NOT_FOUND
 */
async function getMonitorMetrics(monitorId, userId) {
  // Ownership check — consistent with all other monitor-scoped endpoints
  const ownerResult = await pool.query(
    'SELECT id FROM monitors WHERE id = $1 AND user_id = $2',
    [monitorId, userId]
  );

  if (ownerResult.rows.length === 0) {
    const err = new Error('Monitor not found');
    err.code = 'MONITOR_NOT_FOUND';
    throw err;
  }

  // Single aggregation query:
  //   COUNT(*)                                  → total checks
  //   COUNT(*) FILTER (WHERE status = 'UP')     → up checks
  //   COUNT(*) FILTER (WHERE status = 'DOWN')   → down checks
  //   AVG(response_time_ms)
  //     FILTER (WHERE status = 'UP')            → avg only over successful checks
  const result = await pool.query(
    `SELECT
       COUNT(*)                                              AS total_checks,
       COUNT(*) FILTER (WHERE status = 'UP')                AS up_checks,
       COUNT(*) FILTER (WHERE status = 'DOWN')              AS down_checks,
       AVG(response_time_ms) FILTER (WHERE status = 'UP')   AS avg_response_time_ms
     FROM  checks
     WHERE monitor_id = $1`,
    [monitorId]
  );

  const row = result.rows[0];

  // PostgreSQL returns COUNT as string — parse to number
  const totalChecks = parseInt(row.total_checks, 10) || 0;
  const upChecks    = parseInt(row.up_checks, 10)    || 0;
  const downChecks  = parseInt(row.down_checks, 10)  || 0;

  // AVG returns NULL when no UP checks exist — normalise to 0
  const avgResponseTimeMs = row.avg_response_time_ms !== null
    ? Math.round(parseFloat(row.avg_response_time_ms) * 100) / 100
    : 0;

  // Guard against divide-by-zero when no checks have been recorded yet
  const uptimePercentage = totalChecks > 0
    ? Math.round((upChecks / totalChecks) * 100 * 100) / 100
    : 0;

  return {
    total_checks:         totalChecks,
    up_checks:            upChecks,
    down_checks:          downChecks,
    uptime_percentage:    uptimePercentage,
    avg_response_time_ms: avgResponseTimeMs,
  };
}

module.exports = { getMonitorMetrics };
