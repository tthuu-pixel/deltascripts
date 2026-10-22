CREATE TABLE admin_ai_settings (
  id INTEGER PRIMARY KEY CHECK (id=1),
  provider TEXT NOT NULL,
  base_url TEXT NOT NULL,
  model TEXT NOT NULL,
  encrypted_key TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1
);
