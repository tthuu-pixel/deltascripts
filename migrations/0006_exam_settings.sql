-- Exam positions are separate from the legacy source numbering. No source or membership changes.
CREATE TABLE exam_settings (
  id INTEGER PRIMARY KEY CHECK(id=1),
  content TEXT NOT NULL DEFAULT '[]',
  version INTEGER NOT NULL DEFAULT 1
);
INSERT INTO exam_settings(id) VALUES(1);
