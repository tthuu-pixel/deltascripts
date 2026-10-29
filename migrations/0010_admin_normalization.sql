CREATE TABLE automatic_import_control(id INTEGER PRIMARY KEY CHECK(id=1),generation INTEGER NOT NULL DEFAULT 0);
INSERT INTO automatic_import_control(id) VALUES(1);
CREATE TABLE latex_normalization_jobs (
 id TEXT PRIMARY KEY, topic_id TEXT, label TEXT NOT NULL, expected INTEGER NOT NULL, selection_hash TEXT NOT NULL,
 created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL,
 received INTEGER NOT NULL DEFAULT 0,completed INTEGER NOT NULL DEFAULT 0,
 review_count INTEGER NOT NULL DEFAULT 0,skipped_count INTEGER NOT NULL DEFAULT 0,
 working_count INTEGER NOT NULL DEFAULT 0,reason TEXT NOT NULL DEFAULT '',review_reason TEXT NOT NULL DEFAULT ''
);
CREATE TABLE latex_normalization_items (
 job_id TEXT NOT NULL REFERENCES latex_normalization_jobs(id) ON DELETE CASCADE,
 question_id TEXT NOT NULL,
 state TEXT NOT NULL DEFAULT 'pending' CHECK(state IN ('pending','working','done','review','skipped')),
 attempts INTEGER NOT NULL DEFAULT 0,next_attempt INTEGER NOT NULL DEFAULT 0,
 lease_token TEXT,lease_until INTEGER NOT NULL DEFAULT 0,reason TEXT NOT NULL DEFAULT '',
 updated_at INTEGER NOT NULL,
 PRIMARY KEY(job_id,question_id)
);
CREATE INDEX latex_normalization_due ON latex_normalization_items(state,next_attempt,lease_until);

CREATE INDEX latex_normalization_job_state ON latex_normalization_items(job_id,state,next_attempt);
CREATE TRIGGER latex_normalization_insert AFTER INSERT ON latex_normalization_items BEGIN
 UPDATE latex_normalization_jobs SET received=received+1,
 completed=completed+(NEW.state='done'),review_count=review_count+(NEW.state='review'),
 skipped_count=skipped_count+(NEW.state='skipped'),working_count=working_count+(NEW.state='working') WHERE id=NEW.job_id;
END;
CREATE TRIGGER latex_normalization_update AFTER UPDATE OF state ON latex_normalization_items BEGIN
 UPDATE latex_normalization_jobs SET
 completed=completed+(NEW.state='done')-(OLD.state='done'),
 review_count=review_count+(NEW.state='review')-(OLD.state='review'),
 skipped_count=skipped_count+(NEW.state='skipped')-(OLD.state='skipped'),
 working_count=working_count+(NEW.state='working')-(OLD.state='working'),updated_at=NEW.updated_at,
 reason=CASE WHEN NEW.state='pending' AND NEW.reason!='' THEN NEW.reason ELSE reason END,
 review_reason=CASE WHEN NEW.state IN ('review','skipped') AND NEW.reason!='' THEN NEW.reason ELSE review_reason END
 WHERE id=NEW.job_id;
END;
