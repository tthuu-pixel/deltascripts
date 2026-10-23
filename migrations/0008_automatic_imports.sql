-- Durable upload receipts and leased work survive page reloads and Worker restarts.
CREATE TABLE automatic_import_jobs (
  id TEXT PRIMARY KEY,
  files TEXT NOT NULL,
  expected INTEGER NOT NULL CHECK(expected>=0),
  submitted INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE TABLE automatic_import_sources (
  hash TEXT PRIMARY KEY,
  question_id TEXT NOT NULL,
  payload TEXT NOT NULL,
  state TEXT NOT NULL CHECK(state IN ('pending','working','published','skipped')),
  attempts INTEGER NOT NULL DEFAULT 0,
  next_attempt INTEGER NOT NULL DEFAULT 0,
  lease_token TEXT,
  lease_until INTEGER NOT NULL DEFAULT 0,
  reason TEXT NOT NULL DEFAULT '',
  updated_at INTEGER NOT NULL
);
CREATE INDEX automatic_import_due ON automatic_import_sources(state,next_attempt,lease_until);
CREATE TABLE automatic_import_members (
  job_id TEXT NOT NULL REFERENCES automatic_import_jobs(id) ON DELETE CASCADE,
  input_id TEXT NOT NULL,
  source_hash TEXT NOT NULL REFERENCES automatic_import_sources(hash),
  PRIMARY KEY(job_id,input_id)
);
CREATE INDEX automatic_import_member_source ON automatic_import_members(source_hash);
CREATE INDEX questions_import_match ON questions(label,source_type) WHERE active=1;
