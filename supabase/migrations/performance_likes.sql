-- Performance Page Schema Migration
-- Run this in Supabase SQL Editor

-- ticket_likes table for "High Five" feature
CREATE TABLE IF NOT EXISTS ticket_likes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(ticket_id, user_id)
);

-- Index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_ticket_likes_ticket ON ticket_likes(ticket_id);
CREATE INDEX IF NOT EXISTS idx_ticket_likes_user ON ticket_likes(user_id);

-- Enable RLS
ALTER TABLE ticket_likes ENABLE ROW LEVEL SECURITY;

-- Policy: Users can manage their own likes
CREATE POLICY "Users can manage their likes" ON ticket_likes
    FOR ALL USING (auth.uid() = user_id);

-- Policy: Users can view all likes  
CREATE POLICY "Users can view all likes" ON ticket_likes
    FOR SELECT USING (true);
