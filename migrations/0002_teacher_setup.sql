-- Issued by the deployment operator; no public registration or password reset.
CREATE TABLE teacher_setup_links (
  id INTEGER PRIMARY KEY CHECK(id=1),
  token_hash TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  used_at INTEGER
);
