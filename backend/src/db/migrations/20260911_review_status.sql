-- Review tracking is independent from a model prediction or a final case decision.
ALTER TABLE fraud_cases ADD COLUMN IF NOT EXISTS reviewed_at timestamp with time zone;
ALTER TABLE fraud_cases ADD COLUMN IF NOT EXISTS reviewed_by uuid REFERENCES users(id) ON DELETE SET NULL;
