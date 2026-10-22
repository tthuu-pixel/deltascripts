CREATE TABLE teachers (
  id TEXT PRIMARY KEY, email TEXT NOT NULL UNIQUE, password_hash TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE TABLE access_codes (
  code TEXT PRIMARY KEY CHECK(length(code)=8 AND code NOT GLOB '*[^A-Z0-9]*'),
  active INTEGER NOT NULL DEFAULT 1 CHECK(active IN (0,1)),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE TABLE question_counts (
  number INTEGER PRIMARY KEY CHECK(number BETWEEN 1 AND 7),
  total INTEGER NOT NULL DEFAULT 0 CHECK(total>=0)
);
INSERT INTO question_counts(number) VALUES (1),(2),(3),(4),(5),(6),(7);
CREATE TABLE questions (
  id TEXT PRIMARY KEY, label TEXT NOT NULL,
  number INTEGER NOT NULL REFERENCES question_counts(number),
  source_type TEXT NOT NULL CHECK(source_type IN ('word','tex')),
  statement_raw TEXT NOT NULL, solution_raw TEXT NOT NULL DEFAULT '',
  raw TEXT NOT NULL DEFAULT '', latex_preamble TEXT NOT NULL DEFAULT '',
  active INTEGER NOT NULL DEFAULT 1 CHECK(active IN (0,1)), slot INTEGER,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
-- Dense positions allow an indexed random lookup without scanning the question bank.
CREATE UNIQUE INDEX questions_slot ON questions(number,slot) WHERE active=1;
CREATE INDEX questions_recent ON questions(created_at DESC,id) WHERE active=1;
CREATE INDEX questions_number_recent ON questions(number,created_at DESC,id) WHERE active=1;
CREATE TRIGGER questions_insert AFTER INSERT ON questions WHEN NEW.active=1 BEGIN
  UPDATE questions SET slot=(SELECT total FROM question_counts WHERE number=NEW.number) WHERE id=NEW.id;
  UPDATE question_counts SET total=total+1 WHERE number=NEW.number;
END;
CREATE TRIGGER questions_update AFTER UPDATE OF number,active ON questions
WHEN OLD.active!=NEW.active OR OLD.number!=NEW.number BEGIN
  UPDATE questions SET slot=OLD.slot
    WHERE OLD.active=1 AND active=1 AND number=OLD.number AND id!=OLD.id
    AND slot=(SELECT total-1 FROM question_counts WHERE number=OLD.number);
  UPDATE question_counts SET total=total-1 WHERE number=OLD.number AND OLD.active=1;
  UPDATE questions SET slot=(SELECT total FROM question_counts WHERE number=NEW.number)
    WHERE id=NEW.id AND NEW.active=1;
  UPDATE question_counts SET total=total+1 WHERE number=NEW.number AND NEW.active=1;
  UPDATE questions SET slot=NULL WHERE id=NEW.id AND NEW.active=0;
END;
CREATE TRIGGER questions_delete AFTER DELETE ON questions WHEN OLD.active=1 BEGIN
  UPDATE questions SET slot=OLD.slot WHERE active=1 AND number=OLD.number
    AND slot=(SELECT total-1 FROM question_counts WHERE number=OLD.number);
  UPDATE question_counts SET total=total-1 WHERE number=OLD.number;
END;
CREATE TABLE student_logins (
  id TEXT PRIMARY KEY, student_name TEXT NOT NULL, student_class TEXT NOT NULL,
  access_code TEXT NOT NULL REFERENCES access_codes(code), login_time INTEGER NOT NULL
);
CREATE INDEX student_logins_expiry ON student_logins(login_time);
CREATE TABLE sessions (
  token_hash TEXT PRIMARY KEY, role TEXT NOT NULL CHECK(role IN ('student','teacher')),
  teacher_id TEXT REFERENCES teachers(id), student_name TEXT, student_class TEXT,
  access_code TEXT REFERENCES access_codes(code), expires_at INTEGER NOT NULL
);
CREATE INDEX sessions_expiry ON sessions(expires_at);
CREATE INDEX sessions_teacher ON sessions(teacher_id);
CREATE INDEX sessions_access_code ON sessions(access_code);
CREATE TRIGGER teacher_password_reset AFTER UPDATE OF password_hash ON teachers BEGIN
  DELETE FROM sessions WHERE teacher_id=NEW.id;
END;
CREATE TABLE rate_limits (
  key TEXT PRIMARY KEY, count INTEGER NOT NULL, expires_at INTEGER NOT NULL
);
CREATE INDEX rate_limits_expiry ON rate_limits(expires_at);
