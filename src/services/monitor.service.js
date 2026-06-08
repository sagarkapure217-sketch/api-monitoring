'use strict';

const pool = require('../config/db');
const monitorQueue = require('../queues/monitor.queue');

// ---------------------------------------------------------------------------
// BullMQ repeatable job helpers
// ---------------------------------------------------------------------------

/**
 * Schedule a repeatable BullMQ job for a monitor.
 *
 * The monitorId is embedded in the job NAME (not jobId) because BullMQ v5
 * builds repeatable template keys exclusively from the job name + repeat
 * options. The top-level `jobId` option is applied only to individual
 * job instances and is never written into the repeatable template — making
 * it useless for template lookup or removal.
 *
 * By using `monitor-check:<monitorId>` as the name, every monitor gets a
 * unique repeatable template in Redis, and removal is a simple name match.
 *
 * @param {string} monitorId
 * @param {number} intervalMinutes
 */
async function scheduleRepeatableJob(monitorId, intervalMinutes) {
  await monitorQueue.add(
    `monitor-check:${monitorId}`,
    { monitorId },
    {
      repeat: { every: intervalMinutes * 60 * 1000 },
    }
  );
  console.log(
    `[monitor.service] Repeatable job scheduled — monitorId=${monitorId} every=${intervalMinutes}m`
  );
}

/**
 * Remove the repeatable BullMQ job for a monitor.
 *
 * CONFIRMED ROOT CAUSE:
 * getRepeatableJobs() in BullMQ v5 returns the repeatable template metadata.
 * The template `id` field is derived from the template key itself — NOT from
 * the top-level `jobId` option passed to queue.add(). For a job added as:
 *
 *   queue.add('monitor-check', data, { repeat: { every: ms }, jobId: 'x' })
 *
 * getRepeatableJobs() returns: { name: 'monitor-check', id: '', key: '...60000:' }
 *
 * The custom jobId 'x' is absent from both `id` and `key`. Both the `===`
 * check and the `endsWith` fallback match nothing — the removal is a silent no-op.
 *
 * FIX:
 * The `name` field is ALWAYS populated from the string passed to queue.add().
 * By embedding monitorId in the job name at creation time, removal becomes
 * a deterministic exact match on `j.name` — no `id`, `key`, or interval needed.
 *
 * @param {string} monitorId
 */
async function removeRepeatableJob(monitorId) {
  const jobName = `monitor-check:${monitorId}`;
  const jobs = await monitorQueue.getRepeatableJobs();

  const job = jobs.find((j) => j.name === jobName);

  if (job) {
    await monitorQueue.removeRepeatableByKey(job.key);
    console.log(`[monitor.service] Repeatable job removed — monitorId=${monitorId}`);
  } else {
    console.warn(
      `[monitor.service] No repeatable job found for monitorId=${monitorId} — may already be removed`
    );
  }
}


// ---------------------------------------------------------------------------
// CRUD
// ---------------------------------------------------------------------------

/**
 * Insert a new monitor record for the authenticated user and schedule its
 * repeatable BullMQ job.
 *
 * @param {string} userId - from req.user.id (JWT payload)
 * @param {{ name: string, url: string, interval_minutes: number }} fields
 * @returns {Promise<object>} created monitor row
 */
async function createMonitor(userId, { name, url, interval_minutes }) {
  const result = await pool.query(
    `INSERT INTO monitors (user_id, name, url, interval_minutes)
     VALUES ($1, $2, $3, $4)
     RETURNING id, user_id, name, url, interval_minutes, is_active, created_at`,
    [userId, name, url, interval_minutes]
  );

  const monitor = result.rows[0];

  await scheduleRepeatableJob(monitor.id, monitor.interval_minutes);

  return monitor;
}

/**
 * Return all monitors belonging to the authenticated user.
 *
 * @param {string} userId
 * @returns {Promise<object[]>}
 */
async function getMonitorsByUser(userId) {
  const result = await pool.query(
    `SELECT id, user_id, name, url, interval_minutes, is_active, created_at
     FROM monitors
     WHERE user_id = $1
     ORDER BY created_at DESC`,
    [userId]
  );

  return result.rows;
}

/**
 * Update allowed fields on a monitor that belongs to the authenticated user.
 *
 * If interval_minutes is being changed:
 *   1. Remove the existing repeatable job (lookup by monitorId — no interval needed)
 *   2. Persist the update in PostgreSQL
 *   3. Schedule a new repeatable job with the updated interval
 *
 * Ownership is enforced: if the monitor does not exist OR belongs to a
 * different user, MONITOR_NOT_FOUND is thrown (avoids leaking existence
 * of other users' monitors).
 *
 * @param {string} monitorId
 * @param {string} userId
 * @param {{ name?: string, interval_minutes?: number, is_active?: boolean }} fields
 * @returns {Promise<object>} updated monitor row
 * @throws MONITOR_NOT_FOUND | NO_UPDATE_FIELDS
 */
async function updateMonitor(monitorId, userId, fields) {
  // Verify ownership before attempting update
  const existing = await pool.query(
    'SELECT id FROM monitors WHERE id = $1 AND user_id = $2',
    [monitorId, userId]
  );

  if (existing.rows.length === 0) {
    const err = new Error('Monitor not found or does not belong to you');
    err.code = 'MONITOR_NOT_FOUND';
    throw err;
  }

  // Build parameterized SET clause from only the provided allowed fields
  const { name, interval_minutes, is_active } = fields;
  const setClauses = [];
  const values = [];
  let idx = 1;

  if (name !== undefined) {
    setClauses.push(`name = $${idx++}`);
    values.push(name);
  }
  if (interval_minutes !== undefined) {
    setClauses.push(`interval_minutes = $${idx++}`);
    values.push(interval_minutes);
  }
  if (is_active !== undefined) {
    setClauses.push(`is_active = $${idx++}`);
    values.push(is_active);
  }

  if (setClauses.length === 0) {
    const err = new Error('No valid fields provided for update');
    err.code = 'NO_UPDATE_FIELDS';
    throw err;
  }

  values.push(monitorId); // $idx
  values.push(userId);    // $idx + 1

  const result = await pool.query(
    `UPDATE monitors
     SET ${setClauses.join(', ')}
     WHERE id = $${idx} AND user_id = $${idx + 1}
     RETURNING id, user_id, name, url, interval_minutes, is_active, created_at`,
    values
  );

  const updated = result.rows[0];

  // Reschedule only when the polling interval changes
  if (interval_minutes !== undefined) {
    await removeRepeatableJob(monitorId);
    await scheduleRepeatableJob(monitorId, updated.interval_minutes);
  }

  return updated;
}

/**
 * Remove the monitor's repeatable job and delete it from PostgreSQL.
 *
 * The repeatable job is removed first. If that fails, the DB row is NOT
 * deleted — this prevents orphaned DB records with no corresponding job.
 *
 * Ownership is enforced via WHERE id = $1 AND user_id = $2.
 *
 * @param {string} monitorId
 * @param {string} userId
 * @throws MONITOR_NOT_FOUND if no row was deleted
 */
async function deleteMonitor(monitorId, userId) {
  // Remove repeatable job before deleting the DB row.
  // If the job does not exist in Redis it is a no-op — safe to call regardless.
  await removeRepeatableJob(monitorId);

  const result = await pool.query(
    'DELETE FROM monitors WHERE id = $1 AND user_id = $2 RETURNING id',
    [monitorId, userId]
  );

  if (result.rows.length === 0) {
    const err = new Error('Monitor not found or does not belong to you');
    err.code = 'MONITOR_NOT_FOUND';
    throw err;
  }
}

module.exports = { createMonitor, getMonitorsByUser, updateMonitor, deleteMonitor };
