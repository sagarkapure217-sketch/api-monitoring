'use strict';

const { Queue } = require('bullmq');
const env = require('../config/env');

// BullMQ manages its own internal Redis connections.
// Pass connection options directly — do not reuse the shared ioredis singleton,
// because BullMQ requires a dedicated blocking connection for workers.
const connection = {
  host: env.redis.host,
  port: env.redis.port,
};

const monitorQueue = new Queue('monitors', { connection });

module.exports = monitorQueue;
