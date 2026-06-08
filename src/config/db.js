'use strict';

const { Pool } = require('pg');
const env = require('./env');

const poolConfig = {
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
};

if (env.db.connectionString) {
  poolConfig.connectionString = env.db.connectionString;
} else {
  poolConfig.host = env.db.host;
  poolConfig.port = env.db.port;
  poolConfig.user = env.db.user;
  poolConfig.password = env.db.password;
  poolConfig.database = env.db.name;
}

if (env.db.ssl) {
  poolConfig.ssl = {
    rejectUnauthorized: false,
  };
}

const pool = new Pool(poolConfig);

pool.on('error', (err) => {
  console.error('[db] Unexpected error on idle PostgreSQL client:', err.message);
});

module.exports = pool;
