'use strict';

const dns = require('dns');
if (dns.setDefaultResultOrder) {
  dns.setDefaultResultOrder('ipv4first');
}

const env = require('./config/env');

if (env.processType === 'web') {
  console.error('[worker] PROCESS_TYPE is set to "web", but you started the worker entrypoint. Exiting.');
  process.exit(1);
}

const pool = require('./config/db');
const redis = require('./config/redis');
const monitorWorker = require('./workers/monitor.worker');

console.log('[worker] Standalone BullMQ worker process started');

function shutdown(signal) {
  console.log(`\n[worker] Received ${signal}. Starting graceful shutdown...`);

  monitorWorker.close()
    .then(() => {
      console.log('[worker] Monitor worker closed');
      return pool.end();
    })
    .then(() => {
      console.log('[worker] PostgreSQL pool closed');
      return redis.quit();
    })
    .then(() => {
      console.log('[worker] Redis connection closed');
      console.log('[worker] Graceful shutdown complete');
      process.exit(0);
    })
    .catch((err) => {
      console.error('[worker] Error during shutdown:', err.message);
      process.exit(1);
    });
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

process.on('uncaughtException', (err) => {
  console.error('[worker] Uncaught exception:', err.message);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  console.error('[worker] Unhandled rejection:', reason);
  process.exit(1);
});
