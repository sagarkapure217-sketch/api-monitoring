'use strict';

require('dotenv').config();

const fs   = require('fs');
const path = require('path');
const { Pool } = require('pg');

// ---------------------------------------------------------------------------
// Validate required environment variables before doing anything else
// ---------------------------------------------------------------------------
const REQUIRED = ['DB_HOST', 'DB_PORT', 'DB_USER', 'DB_PASSWORD', 'DB_NAME'];
const missing  = REQUIRED.filter((k) => !process.env[k] || process.env[k].trim() === '');

if (missing.length > 0) {
  console.error(`[migrate] Missing required environment variables: ${missing.join(', ')}`);
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Database connection — standalone pool used only by this script
// ---------------------------------------------------------------------------
const pool = new Pool({
  host:     process.env.DB_HOST,
  port:     parseInt(process.env.DB_PORT, 10),
  user:     process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  connectionTimeoutMillis: 5000,
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const MIGRATIONS_DIR = path.join(__dirname, '..', 'migrations');

/**
 * Create the schema_migrations tracking table if it does not already exist.
 * Uses a single client so both the CREATE and the subsequent reads share
 * the same connection.
 *
 * @param {import('pg').PoolClient} client
 */
async function ensureTrackingTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      filename   TEXT        PRIMARY KEY,
      applied_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
}

/**
 * Return the set of migration filenames that have already been applied.
 *
 * @param {import('pg').PoolClient} client
 * @returns {Promise<Set<string>>}
 */
async function getAppliedMigrations(client) {
  const result = await client.query(
    'SELECT filename FROM schema_migrations ORDER BY filename ASC'
  );
  return new Set(result.rows.map((row) => row.filename));
}

/**
 * Read all .sql files from the migrations directory, sorted lexicographically
 * so that the numeric prefix (001_, 002_, …) controls execution order.
 *
 * @returns {string[]} sorted list of filenames
 */
function getMigrationFiles() {
  const files = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  return files;
}

// ---------------------------------------------------------------------------
// Main runner
// ---------------------------------------------------------------------------
async function runMigrations() {
  console.log('[migrate] Starting migration runner');

  let client;

  try {
    client = await pool.connect();
    console.log('[migrate] Connected to PostgreSQL');

    // Ensure tracking table exists outside of any per-migration transaction
    // so it is always available even if a migration later fails.
    await ensureTrackingTable(client);
    console.log('[migrate] schema_migrations table ready');

    const applied  = await getAppliedMigrations(client);
    const allFiles = getMigrationFiles();
    const pending  = allFiles.filter((f) => !applied.has(f));

    if (pending.length === 0) {
      console.log('[migrate] No pending migrations — database is up to date');
      return;
    }

    console.log(`[migrate] ${pending.length} pending migration(s): ${pending.join(', ')}`);

    for (const filename of pending) {
      const filePath = path.join(MIGRATIONS_DIR, filename);
      const sql      = fs.readFileSync(filePath, 'utf8');

      console.log(`[migrate] Applying migration: ${filename}`);

      // Each migration runs inside its own transaction so that a failure
      // in one migration does not corrupt the tracking table or partial
      // schema changes from a previous successful migration.
      await client.query('BEGIN');

      try {
        await client.query(sql);

        await client.query(
          'INSERT INTO schema_migrations (filename) VALUES ($1)',
          [filename]
        );

        await client.query('COMMIT');
        console.log(`[migrate] ✓ Applied: ${filename}`);
      } catch (err) {
        await client.query('ROLLBACK');
        console.error(`[migrate] ✗ Failed to apply ${filename}: ${err.message}`);
        throw err;
      }
    }

    console.log('[migrate] All migrations applied successfully');
  } finally {
    if (client) {
      client.release();
    }
    await pool.end();
  }
}

runMigrations().catch((err) => {
  console.error('[migrate] Migration runner encountered a fatal error:', err.message);
  process.exit(1);
});
