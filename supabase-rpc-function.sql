-- This SQL function needs to be created in your Supabase database
-- Go to: Supabase Dashboard → SQL Editor → New Query
-- Paste this code and run it

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
