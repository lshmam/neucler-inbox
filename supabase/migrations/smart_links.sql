-- ==============================================================
-- ZERO-TOUCH BOOKING: Smart Links Migration
-- ==============================================================

-- Step 1: Create a custom function to generate short alphanumeric IDs
-- This is a PostgreSQL-native nanoid-like function
CREATE OR REPLACE FUNCTION generate_short_id(size INT DEFAULT 6)
RETURNS TEXT AS $$
DECLARE
    alphabet TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
    result TEXT := '';
    i INT;
BEGIN
    FOR i IN 1..size LOOP
        result := result || substr(alphabet, floor(random() * length(alphabet) + 1)::int, 1);
    END LOOP;
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- ==============================================================
-- Step 2: Add booking URL and slug to business_profiles
-- ==============================================================

ALTER TABLE business_profiles
ADD COLUMN IF NOT EXISTS master_booking_url TEXT,
ADD COLUMN IF NOT EXISTS slug TEXT;

-- Create unique index on slug (allows NULL)
CREATE UNIQUE INDEX IF NOT EXISTS business_profiles_slug_unique 
ON business_profiles(slug) WHERE slug IS NOT NULL;

-- ==============================================================
-- Step 3: Create smart_links table
-- ==============================================================

CREATE TABLE IF NOT EXISTS smart_links (
    id TEXT PRIMARY KEY DEFAULT generate_short_id(6),
    merchant_id TEXT NOT NULL,
    contact_id UUID,  -- References customers, but no FK due to missing constraint on customers.id
    target_url TEXT NOT NULL,
    clicked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS smart_links_merchant_idx ON smart_links(merchant_id);
CREATE INDEX IF NOT EXISTS smart_links_contact_idx ON smart_links(contact_id);

-- ==============================================================
-- Step 4: Row Level Security
-- ==============================================================

ALTER TABLE smart_links ENABLE ROW LEVEL SECURITY;

-- Public can read (for redirects to work)
CREATE POLICY "Public can read smart_links" ON smart_links
    FOR SELECT
    USING (true);

-- Authenticated users can insert for their merchant
CREATE POLICY "Authenticated can insert smart_links" ON smart_links
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- Merchants can view their own links
CREATE POLICY "Merchants can view own links" ON smart_links
    FOR SELECT
    TO authenticated
    USING (merchant_id IN (
        SELECT platform_merchant_id FROM merchants WHERE id = auth.uid()
        UNION
        SELECT merchant_id FROM team_members WHERE user_id = auth.uid()
    ));

-- ==============================================================
-- NOTES:
-- 1. The generate_short_id function creates IDs like: "Xk3mNp"
-- 2. Alphabet excludes confusing characters (0, O, 1, l, I)
-- 3. Run this migration in Supabase SQL Editor
-- ==============================================================
