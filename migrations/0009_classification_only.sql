-- Retire repair work leases and retry queued sources using classification only.
-- Published questions and their content are left untouched.
UPDATE automatic_import_sources
SET state='pending',next_attempt=0,attempts=0,lease_token=NULL,lease_until=0,reason=''
WHERE state IN ('pending','working');
