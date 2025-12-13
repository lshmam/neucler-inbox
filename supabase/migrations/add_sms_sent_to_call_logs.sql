-- Add sms_sent column to call_logs to track if post-call SMS was sent
-- This prevents duplicate SMS when webhooks are retried

ALTER TABLE call_logs 
ADD COLUMN IF NOT EXISTS sms_sent BOOLEAN DEFAULT FALSE;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_call_logs_sms_sent ON call_logs(sms_sent);
