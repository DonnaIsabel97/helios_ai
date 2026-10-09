-- Income belongs to the application snapshot; do not invent values for existing applicants.
ALTER TABLE loan_applications ADD COLUMN IF NOT EXISTS annual_income numeric(12,2) CHECK (annual_income >= 0 AND annual_income <= 1000000000);
ALTER TABLE credit_case_activity DROP CONSTRAINT IF EXISTS credit_case_activity_action_check;
ALTER TABLE credit_case_activity ADD CONSTRAINT credit_case_activity_action_check CHECK(action IN ('approve','reject','escalate','save_notes','save_simulation','save_income'));
