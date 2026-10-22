-- Existing questions remain published. New uploads can explicitly stay in draft.
ALTER TABLE questions ADD COLUMN published INTEGER NOT NULL DEFAULT 1 CHECK(published IN (0,1));
DROP TRIGGER questions_insert;
DROP TRIGGER questions_update;
DROP TRIGGER questions_delete;
-- Keep the legacy slot index usable while the previous Worker is still serving traffic.
CREATE INDEX questions_published_recent ON questions(created_at DESC,id) WHERE active=1 AND published=1;
CREATE TRIGGER questions_insert AFTER INSERT ON questions WHEN NEW.active=1 AND NEW.published=1 BEGIN
  UPDATE questions SET slot=(SELECT total FROM question_counts WHERE number=NEW.number) WHERE id=NEW.id;
  UPDATE question_counts SET total=total+1 WHERE number=NEW.number;
END;
CREATE TRIGGER questions_update AFTER UPDATE OF number,active,published ON questions
WHEN OLD.active!=NEW.active OR OLD.published!=NEW.published OR OLD.number!=NEW.number BEGIN
  UPDATE questions SET slot=NULL WHERE id=NEW.id AND (NEW.active=0 OR NEW.published=0);
  UPDATE questions SET slot=OLD.slot
    WHERE OLD.active=1 AND OLD.published=1 AND active=1 AND published=1 AND number=OLD.number AND id!=OLD.id
    AND slot=(SELECT total-1 FROM question_counts WHERE number=OLD.number);
  UPDATE question_counts SET total=total-1 WHERE number=OLD.number AND OLD.active=1 AND OLD.published=1;
  UPDATE questions SET slot=(SELECT total FROM question_counts WHERE number=NEW.number)
    WHERE id=NEW.id AND NEW.active=1 AND NEW.published=1;
  UPDATE question_counts SET total=total+1 WHERE number=NEW.number AND NEW.active=1 AND NEW.published=1;
  UPDATE questions SET slot=NULL WHERE id=NEW.id AND (NEW.active=0 OR NEW.published=0);
END;
CREATE TRIGGER questions_delete AFTER DELETE ON questions WHEN OLD.active=1 AND OLD.published=1 BEGIN
  UPDATE questions SET slot=OLD.slot WHERE active=1 AND published=1 AND number=OLD.number
    AND slot=(SELECT total-1 FROM question_counts WHERE number=OLD.number);
  UPDATE question_counts SET total=total-1 WHERE number=OLD.number;
END;
CREATE TABLE topics (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  theory TEXT NOT NULL DEFAULT '',
  preamble TEXT NOT NULL DEFAULT '',
  icon TEXT NOT NULL DEFAULT 'topics',
  color TEXT NOT NULL DEFAULT 'blue' CHECK(color IN ('blue','red','yellow')),
  position INTEGER NOT NULL DEFAULT 0,
  published INTEGER NOT NULL DEFAULT 0 CHECK(published IN (0,1)),
  question_count INTEGER NOT NULL DEFAULT 0 CHECK(question_count>=0),
  version INTEGER NOT NULL DEFAULT 1
);
CREATE INDEX topics_order ON topics(position,id);
CREATE INDEX topics_public_order ON topics(position,id) WHERE published=1;
CREATE TABLE question_topics (
  question_id TEXT NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  topic_id TEXT NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
  PRIMARY KEY(question_id,topic_id)
);
CREATE INDEX question_topics_topic ON question_topics(topic_id,question_id);
CREATE TRIGGER topic_link_insert AFTER INSERT ON question_topics
WHEN EXISTS(SELECT 1 FROM questions WHERE id=NEW.question_id AND active=1 AND published=1) BEGIN
  UPDATE topics SET question_count=question_count+1 WHERE id=NEW.topic_id;
END;
CREATE TRIGGER topic_link_delete AFTER DELETE ON question_topics
WHEN EXISTS(SELECT 1 FROM questions WHERE id=OLD.question_id AND active=1 AND published=1) BEGIN
  UPDATE topics SET question_count=question_count-1 WHERE id=OLD.topic_id;
END;
CREATE TRIGGER topic_question_visibility AFTER UPDATE OF active,published ON questions
WHEN (OLD.active=1 AND OLD.published=1)!=(NEW.active=1 AND NEW.published=1) BEGIN
  UPDATE topics SET question_count=question_count+(NEW.active=1 AND NEW.published=1)-(OLD.active=1 AND OLD.published=1)
    WHERE id IN (SELECT topic_id FROM question_topics WHERE question_id=NEW.id);
END;
CREATE TRIGGER topic_question_delete BEFORE DELETE ON questions WHEN OLD.active=1 AND OLD.published=1 BEGIN
  UPDATE topics SET question_count=question_count-1
    WHERE id IN (SELECT topic_id FROM question_topics WHERE question_id=OLD.id);
END;
CREATE TABLE student_settings (
  id INTEGER PRIMARY KEY CHECK(id=1),
  content TEXT NOT NULL DEFAULT '{}',
  version INTEGER NOT NULL DEFAULT 1
);
INSERT INTO student_settings(id) VALUES(1);
