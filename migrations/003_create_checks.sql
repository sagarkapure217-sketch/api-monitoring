CREATE TABLE checks (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  monitor_id       UUID        NOT NULL REFERENCES monitors(id) ON DELETE CASCADE,
  status           TEXT        NOT NULL,
  status_code      INTEGER,
  response_time_ms INTEGER,
  error_message    TEXT,
  checked_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
