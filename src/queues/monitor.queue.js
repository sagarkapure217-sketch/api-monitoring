'use strict';

const { Queue } = require('bullmq');
const env = require('../config/env');

// BullMQ manages its own internal Redis connections.
// Pass connection options directly — do not reuse the shared ioredis singleton,
// because BullMQ requires a dedicated blocking connection for workers.
const connection = process.env.REDIS_URL
  ? { url: process.env.REDIS_URL }
  : {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT) || 6379,
    };

const monitorQueue = new Queue('monitors', { connection });

module.exports = monitorQueue;
