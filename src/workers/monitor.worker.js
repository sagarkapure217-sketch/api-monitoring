'use strict';

const dns = require('dns');
if (dns.setDefaultResultOrder) {
  dns.setDefaultResultOrder('ipv4first');
}

const { Worker } = require('bullmq');
const axios = require('axios');
const env = require('../config/env');
const pool = require('../config/db');
const { saveCheck } = require('../services/check.service');
const { detectAndOpenIncident, resolveIncident } = require('../services/incident.service');
const {
  updateStatusCache,
  incrementFailureCount,
  resetFailureCount,
} = require('../services/redis.service');

const connection = env.redis.url || {
  host: env.redis.host,
  port: env.redis.port,
};

const TIMEOUT_MS = 10_000;

function classifyAxiosError(err) {
  const code = err.code;
  const message = (err.message || '').toLowerCase();

  if (code === 'ECONNABORTED' || code === 'ETIMEDOUT') {
    return 'Timeout';
  }
  if (code === 'ENOTFOUND') {
    return 'DNS Resolution Failed';
  }
  if (code === 'ECONNREFUSED') {
    return 'Connection refused';
  }
  if (message.includes('socket hang up')) {
    return 'Remote Server Closed Connection';
  }
  if (code === 'ECONNRESET') {
    return 'Connection Reset';
  }

  return err.message;
}


/**
 * Worker processor: perform an HTTP health check and persist the result.
 *
 * Result schema:
 *   HTTP response (2xx–5xx):
 *     status         = 'UP' | 'DOWN'
 *     statusCode     = <http status>
 *     responseTimeMs = <wall-clock ms>
 *     errorMessage   = null
 *
 *   Network error (timeout / DNS / refused):
 *     status         = 'DOWN'
 *     statusCode     = null
 *     responseTimeMs = null
 *     errorMessage   = <description>
 *
 * @param {import('bullmq').Job} job
 */
async function runHealthCheck(job) {
  const { monitorId } = job.data;

  // Fetch monitor URL and interval from PostgreSQL
  const result = await pool.query(
    'SELECT id, url, interval_minutes FROM monitors WHERE id = $1',
    [monitorId]
  );

  if (result.rows.length === 0) {
    console.warn(`[monitor.worker] Monitor not found — monitorId=${monitorId}, skipping`);
    return;
  }

  const { url, interval_minutes: intervalMinutes } = result.rows[0];

  let checkResult;

  try {
    const startTime = Date.now();

    const response = await axios.get(url, {
      timeout: TIMEOUT_MS,
      headers: {
        'User-Agent': 'API-Monitor/1.0',
      },
      // Never throw on HTTP error status codes — we classify them ourselves.
      validateStatus: () => true,
    });

    const responseTimeMs = Date.now() - startTime;
    const statusCode     = response.status;

    checkResult = {
      monitorId,
      status:        statusCode < 400 ? 'UP' : 'DOWN',
      statusCode,
      responseTimeMs,
      errorMessage:  null,
    };
  } catch (err) {
    // Network-level failure: no HTTP response received.
    // statusCode and responseTimeMs are null per schema convention.
    console.log('[DEBUG_LOG] Health check error:', {
      monitorId,
      url,
      errorMessage: err.message,
      errorCode: err.code,
      errorErrno: err.errno,
      statusCode: err.response ? err.response.status : null,
    });

    checkResult = {
      monitorId,
      status:        'DOWN',
      statusCode:    null,
      responseTimeMs: null,
      errorMessage:  classifyAxiosError(err),
    };
  }

  // Persist result to PostgreSQL (source of truth)
  await saveCheck(checkResult);

  // Update Redis status cache and failure counter.
  // Wrapped in try-catch — Redis is a non-critical cache layer.
  // A Redis outage must never fail or retry this job.
  try {
    await updateStatusCache(monitorId, checkResult, intervalMinutes);

    if (checkResult.status === 'DOWN') {
      const failCount = await incrementFailureCount(monitorId);
      console.log(`[monitor.worker] Failure count — monitorId=${monitorId} count=${failCount}`);
    } else {
      await resetFailureCount(monitorId);
    }
  } catch (redisErr) {
    console.error(`[monitor.worker] Redis update failed (non-fatal) — monitorId=${monitorId}: ${redisErr.message}`);
  }

  // Evaluate incident state based on check outcome:
  //   DOWN → attempt to open a new incident (no-op if already OPEN or <3 checks)
  //   UP   → attempt to resolve any OPEN incident (no-op if none exists)
  if (checkResult.status === 'DOWN') {
    await detectAndOpenIncident(monitorId);
  } else {
    await resolveIncident(monitorId);
  }

  // Log structured result
  const parts = [
    '[monitor.worker] Health check',
    `monitorId=${monitorId}`,
    `url=${url}`,
    `status=${checkResult.status}`,
  ];

  if (checkResult.statusCode    !== null) parts.push(`statusCode=${checkResult.statusCode}`);
  if (checkResult.responseTimeMs !== null) parts.push(`responseTime=${checkResult.responseTimeMs}ms`);
  if (checkResult.errorMessage)            parts.push(`error=${checkResult.errorMessage}`);

  console.log(parts.join(' | '));
}

// ---------------------------------------------------------------------------
// Worker
// ---------------------------------------------------------------------------

const monitorWorker = new Worker('monitors', runHealthCheck, { connection });

monitorWorker.on('completed', (job) => {
  console.log(
    `[monitor.worker] Job id=${job.id} completed — monitorId=${job.data.monitorId}`
  );
});

monitorWorker.on('failed', (job, err) => {
  console.error(
    `[monitor.worker] Job id=${job?.id} failed — monitorId=${job?.data?.monitorId}: ${err.message}`
  );
});

monitorWorker.on('error', (err) => {
  console.error('[monitor.worker] Worker error:', err.message);
});

module.exports = monitorWorker;
