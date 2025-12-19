-- ============================================
-- TICKET SCORES TABLE FOR POST-CALL ANALYSIS
-- ============================================
-- Run this ENTIRE file in Supabase Dashboard → SQL Editor

-- 1. Create the ticket_scores table
CREATE TABLE IF NOT EXISTS ticket_scores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    agent_id TEXT,
    
    quickness_score INT DEFAULT 0 CHECK (quickness_score >= 0 AND quickness_score <= 20),
    knowledge_score INT DEFAULT 0 CHECK (knowledge_score >= 0 AND knowledge_score <= 20),
    hospitality_score INT DEFAULT 0 CHECK (hospitality_score >= 0 AND hospitality_score <= 20),
    intro_score INT DEFAULT 0 CHECK (intro_score >= 0 AND intro_score <= 20),
    cta_score INT DEFAULT 0 CHECK (cta_score >= 0 AND cta_score <= 20),
    
    total_score INT DEFAULT 0 CHECK (total_score >= 0 AND total_score <= 100),
    
    feedback_summary TEXT,
    avg_response_time_minutes NUMERIC(10, 2),
    
    outcome TEXT,
    resolution_channel TEXT,
    time_to_first_response_minutes NUMERIC(10, 2),
    time_to_resolution_minutes NUMERIC(10, 2),
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create indexes
CREATE INDEX IF NOT EXISTS idx_ticket_scores_ticket ON ticket_scores(ticket_id);
CREATE INDEX IF NOT EXISTS idx_ticket_scores_agent ON ticket_scores(agent_id);
CREATE INDEX IF NOT EXISTS idx_ticket_scores_created ON ticket_scores(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ticket_scores_total ON ticket_scores(total_score DESC);

-- 3. Enable Row Level Security
ALTER TABLE ticket_scores ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies
DROP POLICY IF EXISTS "Merchants can view own ticket scores" ON ticket_scores;
CREATE POLICY "Merchants can view own ticket scores" ON ticket_scores
    FOR SELECT
    TO authenticated
    USING (ticket_id IN (
        SELECT id FROM tickets WHERE merchant_id IN (
            SELECT id::text FROM auth.users WHERE id = auth.uid()
        )
    ));

DROP POLICY IF EXISTS "Service role can insert ticket scores" ON ticket_scores;
CREATE POLICY "Service role can insert ticket scores" ON ticket_scores
    FOR INSERT
    TO service_role
    WITH CHECK (true);

DROP POLICY IF EXISTS "Merchants can delete own ticket scores" ON ticket_scores;
CREATE POLICY "Merchants can delete own ticket scores" ON ticket_scores
    FOR DELETE
    TO authenticated
    USING (ticket_id IN (
        SELECT id FROM tickets WHERE merchant_id IN (
            SELECT id::text FROM auth.users WHERE id = auth.uid()
        )
    ));

-- 5. Unique constraint
CREATE UNIQUE INDEX IF NOT EXISTS idx_ticket_scores_unique_ticket ON ticket_scores(ticket_id);
