'use strict';

const dns = require('dns');
if (dns.setDefaultResultOrder) {
  dns.setDefaultResultOrder('ipv4first');
}

const http = require('http');
const env = require('./config/env');
const app = require('./app');
app.set('trust proxy', 1);
const pool = require('./config/db');
const redis = require('./config/redis');

const isWebOnly = env.processType === 'web';
const isWorkerOnly = env.processType === 'worker';

if (isWorkerOnly) {
  console.error('[server] PROCESS_TYPE is set to "worker". Please start the worker process using "node src/worker.js" instead.');
  process.exit(1);
}

let monitorWorker = null;
if (!isWebOnly) {
  monitorWorker = require('./workers/monitor.worker');
}

const server = http.createServer(app);

function shutdown(signal) {
  console.log(`\n[server] Received ${signal}. Starting graceful shutdown...`);

  server.close((err) => {
    if (err) {
      console.error('[server] Error closing HTTP server:', err.message);
      process.exit(1);
    }

    console.log('[server] HTTP server closed');

    pool.end()
      .then(() => {
        console.log('[server] PostgreSQL pool closed');
        return redis.quit();
      })
      .then(() => {
        console.log('[server] Redis connection closed');
        if (monitorWorker) {
          return monitorWorker.close();
        }
      })
      .then(() => {
        if (monitorWorker) {
          console.log('[server] Monitor worker closed');
        }
        console.log('[server] Graceful shutdown complete');
        process.exit(0);
      })
      .catch((err) => {
        console.error('[server] Error during shutdown:', err.message);
        process.exit(1);
      });
  });
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

process.on('uncaughtException', (err) => {
  console.error('[server] Uncaught exception:', err.message);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  console.error('[server] Unhandled rejection:', reason);
  process.exit(1);
});

server.listen(env.port, () => {
  console.log(`[server] Listening on port ${env.port}`);
});

server.on('error', (err) => {
  console.error('[server] Failed to start HTTP server:', err.message);
  process.exit(1);
});
