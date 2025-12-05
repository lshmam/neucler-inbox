-- ============================================
-- SUPABASE EMAIL CAMPAIGN TRACKING SETUP
-- ============================================
-- Run this in Supabase Dashboard → SQL Editor
-- This creates the necessary function for email stats tracking

-- 1. Create the RPC function to increment campaign stats
CREATE OR REPLACE FUNCTION increment_campaign_stat(
    row_id uuid,
    column_name text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Dynamically increment the specified column
    EXECUTE format(
        'UPDATE email_campaigns SET %I = COALESCE(%I, 0) + 1 WHERE id = $1',
        column_name,
        column_name
    ) USING row_id;
END;
$$;

-- 2. Ensure the email_events_log table exists (for tracking unique opens/clicks)
CREATE TABLE IF NOT EXISTS email_events_log (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    campaign_id uuid NOT NULL REFERENCES email_campaigns(id) ON DELETE CASCADE,
    recipient_email text NOT NULL,
    event_type text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    -- Unique constraint: one event type per email per campaign
    UNIQUE(campaign_id, recipient_email, event_type)
);

-- 3. Create an index for faster lookups
CREATE INDEX IF NOT EXISTS idx_email_events_campaign 
ON email_events_log(campaign_id, recipient_email);

-- ============================================
-- VERIFICATION QUERIES (run these after)
-- ============================================
-- Check if function exists:
-- SELECT routine_name FROM information_schema.routines 
-- WHERE routine_name = 'increment_campaign_stat';

-- Check if table exists:
-- SELECT table_name FROM information_schema.tables 
-- WHERE table_name = 'email_events_log';
