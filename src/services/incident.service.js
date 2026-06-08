'use strict';

const pool = require('../config/db');
const { sendDownAlert, sendRecoveryAlert } = require('./alert.service');

/**
 * Evaluate whether a new incident should be opened for a monitor.
 *
 * Detection algorithm:
 *   1. Fetch the 3 most recent checks for the monitor (DESC order)
 *   2. If fewer than 3 checks exist → not enough data, return
 *   3. If all 3 are DOWN:
 *        a. Query for an existing OPEN incident on this monitor
 *        b. If one exists → already tracking, do nothing
 *        c. If none exists → INSERT a new OPEN incident
 *
 * This function is intentionally side-effect free when conditions are not met —
 * it will silently return without writing anything to the database.
 *
 * @param {string} monitorId
 * @returns {Promise<object|undefined>} the newly created incident row, or undefined
 */
async function detectAndOpenIncident(monitorId) {
  // Step 1: Fetch last 3 checks ordered most-recent first
  const checksResult = await pool.query(
    `SELECT status
     FROM   checks
     WHERE  monitor_id = $1
     ORDER  BY checked_at DESC
     LIMIT  3`,
    [monitorId]
  );

  const recentChecks = checksResult.rows;

  // Step 2: Not enough history yet to trigger detection
  if (recentChecks.length < 3) {
    return;
  }

  // Step 3: All 3 must be DOWN
  const allDown = recentChecks.every((check) => check.status === 'DOWN');

  if (!allDown) {
    return;
  }

  // Step 4: Guard — do not open a duplicate incident
  const existingResult = await pool.query(
    `SELECT id
     FROM   incidents
     WHERE  monitor_id = $1
     AND    status = 'OPEN'
     LIMIT  1`,
    [monitorId]
  );

  if (existingResult.rows.length > 0) {
    // An OPEN incident already exists — nothing to do
    return;
  }

  // Step 5: Open a new incident
  const incidentResult = await pool.query(
    `INSERT INTO incidents (monitor_id, status)
     VALUES ($1, 'OPEN')
     RETURNING id, monitor_id, status, started_at`,
    [monitorId]
  );

  const incident = incidentResult.rows[0];

  console.log(
    `[incident.service] Incident opened — monitorId=${monitorId} incidentId=${incident.id} startedAt=${incident.started_at}`
  );

  // Resolve monitor owner's email via JOIN and send alert.
  // Fire-and-forget: email failure must not cause the job to fail or retry.
  pool.query(
    `SELECT u.email, m.name, m.url
     FROM   monitors m
     JOIN   users u ON u.id = m.user_id
     WHERE  m.id = $1`,
    [monitorId]
  )
    .then(({ rows }) => {
      if (rows.length === 0) return;
      const { email: recipientEmail, name: monitorName, url } = rows[0];
      return sendDownAlert({ recipientEmail, monitorName, url, startedAt: incident.started_at });
    })
    .catch((err) => {
      console.error(`[incident.service] Failed to send down alert: ${err.message}`);
    });

  return incident;
}

/**
 * Resolve the OPEN incident for a monitor after a successful check.
 *
 * Resolution rule:
 *   UPDATE incidents SET status = 'RESOLVED', resolved_at = NOW()
 *   WHERE  monitor_id = $1 AND status = 'OPEN'
 *
 * The WHERE status = 'OPEN' clause acts as the idempotency guard:
 *   - If no OPEN incident exists → UPDATE affects 0 rows → silent no-op
 *   - If an OPEN incident exists → resolved exactly once
 *   - Already-RESOLVED incidents are never touched
 *
 * @param {string} monitorId
 * @returns {Promise<object|undefined>} the resolved incident row, or undefined
 */
async function resolveIncident(monitorId) {
  const result = await pool.query(
    `UPDATE incidents
     SET    status = 'RESOLVED',
            resolved_at = NOW()
     WHERE  monitor_id = $1
     AND    status = 'OPEN'
     RETURNING id, monitor_id, status, started_at, resolved_at`,
    [monitorId]
  );

  if (result.rows.length === 0) {
    // No OPEN incident existed — nothing to resolve
    return;
  }

  const incident = result.rows[0];

  console.log(
    `[incident.service] Incident resolved — monitorId=${monitorId} incidentId=${incident.id} resolvedAt=${incident.resolved_at}`
  );

  // Resolve monitor owner's email via JOIN and send recovery alert.
  // Fire-and-forget: email failure must not cause the job to fail or retry.
  pool.query(
    `SELECT u.email, m.name, m.url
     FROM   monitors m
     JOIN   users u ON u.id = m.user_id
     WHERE  m.id = $1`,
    [monitorId]
  )
    .then(({ rows }) => {
      if (rows.length === 0) return;
      const { email: recipientEmail, name: monitorName, url } = rows[0];
      return sendRecoveryAlert({
        recipientEmail,
        monitorName,
        url,
        startedAt:  incident.started_at,
        resolvedAt: incident.resolved_at,
      });
    })
    .catch((err) => {
      console.error(`[incident.service] Failed to send recovery alert: ${err.message}`);
    });

  return incident;
}

module.exports = { detectAndOpenIncident, resolveIncident };

