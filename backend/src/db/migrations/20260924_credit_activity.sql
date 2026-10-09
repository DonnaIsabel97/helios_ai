-- Preserve analyst review and immutable activity separately from model predictions.
ALTER TABLE credit_cases ADD COLUMN IF NOT EXISTS reviewed_at timestamptz;
ALTER TABLE credit_cases ADD COLUMN IF NOT EXISTS reviewed_by uuid REFERENCES users(id) ON DELETE SET NULL;
CREATE TABLE IF NOT EXISTS credit_case_activity (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 credit_case_id uuid NOT NULL REFERENCES credit_cases(id) ON DELETE CASCADE,
 actor_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
 actor_name text NOT NULL,
 action text NOT NULL CHECK(action IN ('approve','reject','escalate','save_notes','save_simulation')),
 note text, simulation jsonb,
 previous_status text, new_status text, previous_decision text, new_decision text,
 created_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE INDEX IF NOT EXISTS credit_activity_case_time ON credit_case_activity(credit_case_id,created_at DESC);
ALTER TABLE credit_case_activity ENABLE ROW LEVEL SECURITY;
