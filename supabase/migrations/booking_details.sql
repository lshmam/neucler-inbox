-- ============================================
-- BOOKING DETAILS EXTRACTION
-- ============================================
-- Run this in Supabase Dashboard → SQL Editor

-- Add booking_details column to tickets table
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS booking_details JSONB;

-- Add transcript column to store the raw conversation
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS transcript TEXT;

-- Index for querying tickets with booking details
CREATE INDEX IF NOT EXISTS idx_tickets_booking_details ON tickets USING GIN (booking_details) WHERE booking_details IS NOT NULL;

-- Reload schema cache
NOTIFY pgrst, 'reload schema';
