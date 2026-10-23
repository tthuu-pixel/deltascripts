-- Retain the first imported source and each pre-repair source privately for administrators.
CREATE TABLE question_revisions (
  id TEXT PRIMARY KEY,
  question_id TEXT NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  snapshot TEXT NOT NULL,
  reason TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX question_revisions_question ON question_revisions(question_id,created_at DESC,id);
