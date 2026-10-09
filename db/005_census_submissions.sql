-- Paravet census forms are staged for review and never write directly to the
-- approved dashboard registry.
BEGIN;

CREATE TABLE ekapon.census_submissions (
    submission_id uuid PRIMARY KEY,
    actor_id      bigint NOT NULL REFERENCES ekapon.accounts(id) ON DELETE RESTRICT,
    barangay_id   integer NOT NULL REFERENCES ekapon.barangays(id) ON DELETE RESTRICT,
    label         text NOT NULL CHECK (length(btrim(label)) BETWEEN 1 AND 160),
    records       jsonb NOT NULL CHECK (
        jsonb_typeof(records) = 'array'
        AND jsonb_array_length(records) BETWEEN 1 AND 1000
    ),
    status        text NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending', 'approved', 'rejected')),
    reviewed_by   bigint REFERENCES ekapon.accounts(id) ON DELETE RESTRICT,
    reviewed_at   timestamptz,
    review_note   text CHECK (review_note IS NULL OR length(review_note) <= 500),
    created_at    timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT census_submissions_review_state_check CHECK (
        (status = 'pending' AND reviewed_by IS NULL AND reviewed_at IS NULL)
        OR
        (status IN ('approved', 'rejected') AND reviewed_by IS NOT NULL AND reviewed_at IS NOT NULL)
    )
);

CREATE INDEX census_submissions_status_time_idx
    ON ekapon.census_submissions (status, created_at DESC);
CREATE INDEX census_submissions_actor_time_idx
    ON ekapon.census_submissions (actor_id, created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON ekapon.census_submissions TO ekapon_admin;

COMMIT;
