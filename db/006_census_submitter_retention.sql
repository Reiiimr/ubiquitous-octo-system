-- Preserve census submission attribution without blocking account removal.
BEGIN;

ALTER TABLE ekapon.census_submissions
    ADD COLUMN submitter_name text;

UPDATE ekapon.census_submissions s
   SET submitter_name = a.full_name
  FROM ekapon.accounts a
 WHERE a.id = s.actor_id;

ALTER TABLE ekapon.census_submissions
    ALTER COLUMN submitter_name SET NOT NULL,
    ALTER COLUMN actor_id DROP NOT NULL,
    DROP CONSTRAINT census_submissions_actor_id_fkey,
    ADD CONSTRAINT census_submissions_actor_id_fkey
        FOREIGN KEY (actor_id) REFERENCES ekapon.accounts(id) ON DELETE SET NULL;

COMMIT;
