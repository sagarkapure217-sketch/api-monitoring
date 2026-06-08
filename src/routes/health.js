'use strict';

const { Router } = require('express');
const pool = require('../config/db');
const redis = require('../config/redis');

const router = Router();

router.get('/health', async (req, res) => {
  let dbStatus = 'disconnected';
  let redisStatus = 'disconnected';

  try {
    const client = await pool.connect();
    await client.query('SELECT 1');
    client.release();
    dbStatus = 'connected';
  } catch (err) {
    console.error('[health] PostgreSQL check failed:', err.message);
  }

  try {
    const pong = await redis.ping();
    if (pong === 'PONG') {
      redisStatus = 'connected';
    }
  } catch (err) {
    console.error('[health] Redis check failed:', err.message);
  }

  const isHealthy = dbStatus === 'connected' && redisStatus === 'connected';

  return res.status(isHealthy ? 200 : 503).json({
    status: isHealthy ? 'healthy' : 'unhealthy',
    database: dbStatus,
    redis: redisStatus,
  });
});

module.exports = router;
