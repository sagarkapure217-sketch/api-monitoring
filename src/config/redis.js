'use strict';

const Redis = require('ioredis');
const env = require('./env');

const redis = new Redis({
  host: env.redis.host,
  port: env.redis.port,
  lazyConnect: false,
  maxRetriesPerRequest: 3,
  retryStrategy(times) {
    const delay = Math.min(times * 100, 3000);
    console.warn(`[redis] Retrying connection... attempt ${times}, next retry in ${delay}ms`);
    return delay;
  },
});

redis.on('connect', () => {
  console.log('[redis] Connected successfully');
});

redis.on('ready', () => {
  console.log('[redis] Client is ready to accept commands');
});

redis.on('error', (err) => {
  console.error('[redis] Connection error:', err.message);
});

redis.on('close', () => {
  console.warn('[redis] Connection closed');
});

redis.on('reconnecting', () => {
  console.warn('[redis] Reconnecting...');
});

module.exports = redis;
