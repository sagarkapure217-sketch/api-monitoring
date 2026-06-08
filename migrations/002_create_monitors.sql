CREATE TABLE monitors (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID        REFERENCES users(id) ON DELETE CASCADE,
  name             TEXT        NOT NULL,
  url              TEXT        NOT NULL,
  interval_minutes INTEGER     NOT NULL DEFAULT 5,
  is_active        BOOLEAN     DEFAULT TRUE,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);
