'use strict';

const Redis = require('ioredis');
const env = require('./env');

const redisConfig = {
  lazyConnect: false,
  maxRetriesPerRequest: 3,
  retryStrategy(times) {
    const delay = Math.min(times * 100, 3000);
    console.warn(`[redis] Retrying connection... attempt ${times}, next retry in ${delay}ms`);
    return delay;
  },
};

const redisConnection = process.env.REDIS_URL
  ? { url: process.env.REDIS_URL }
  : {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT) || 6379,
    };

const redis = redisConnection.url
  ? new Redis(redisConnection.url, redisConfig)
  : new Redis({
      ...redisConnection,
      ...redisConfig
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
