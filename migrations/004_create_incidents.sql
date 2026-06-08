CREATE TABLE incidents (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  monitor_id  UUID        NOT NULL REFERENCES monitors(id) ON DELETE CASCADE,
  status      TEXT        NOT NULL,
  started_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ NULL
);
