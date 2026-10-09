-- Preserve each note and case action as a separate attributed event.
CREATE TABLE IF NOT EXISTS fraud_case_activity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fraud_case_id uuid NOT NULL REFERENCES fraud_cases(id) ON DELETE CASCADE,
  actor_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  actor_name text NOT NULL,
  action text NOT NULL CHECK (action IN ('save_notes','mark_fraud','mark_legit','escalate','mark_reviewed','mark_unreviewed')),
  note text,
  previous_status text,
  new_status text,
  previous_decision text,
  new_decision text,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  CHECK ((action='save_notes' AND note IS NOT NULL AND length(trim(note)) BETWEEN 1 AND 10000) OR (action<>'save_notes' AND note IS NULL))
);
CREATE INDEX IF NOT EXISTS fraud_case_activity_case_date_idx ON fraud_case_activity (fraud_case_id, created_at DESC);
-- Access comes through the authenticated Express backend, not public client access.
ALTER TABLE fraud_case_activity ENABLE ROW LEVEL SECURITY;
