-- ============================================
-- TICKET LIFECYCLE ENHANCEMENTS
-- ============================================
-- Run this AFTER ticket_scores.sql in Supabase Dashboard → SQL Editor

-- 1. Add outcome column to tickets
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS outcome TEXT CHECK (outcome IN (
    'appointment_booked',
    'sale_completed',
    'issue_resolved',
    'escalated',
    'no_action_needed',
    'customer_dropped',
    'needs_review'
));

-- 2. Add resolution channel column
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS resolution_channel TEXT CHECK (resolution_channel IN (
    'phone', 'sms', 'email', 'chat', 'manual'
));

-- 3. Add call reference for tickets created from calls
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS call_id TEXT;

-- 4. Add AI confidence score for the outcome (0-100)
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS outcome_confidence INT CHECK (outcome_confidence >= 0 AND outcome_confidence <= 100);

-- 5. Create indexes for new columns
CREATE INDEX IF NOT EXISTS idx_tickets_outcome ON tickets(outcome);
CREATE INDEX IF NOT EXISTS idx_tickets_resolution_channel ON tickets(resolution_channel);
CREATE INDEX IF NOT EXISTS idx_tickets_call_id ON tickets(call_id);

-- ============================================
-- HELPER FUNCTION: Calculate resolution metrics
-- ============================================
CREATE OR REPLACE FUNCTION calculate_ticket_metrics(p_ticket_id UUID)
RETURNS TABLE (
    time_to_first_response NUMERIC,
    time_to_resolution NUMERIC
) AS $$
DECLARE
    v_created_at TIMESTAMPTZ;
    v_first_response_at TIMESTAMPTZ;
    v_resolved_at TIMESTAMPTZ;
BEGIN
    SELECT created_at, first_response_at, resolved_at
    INTO v_created_at, v_first_response_at, v_resolved_at
    FROM tickets
    WHERE id = p_ticket_id;

    IF v_first_response_at IS NOT NULL THEN
        time_to_first_response := EXTRACT(EPOCH FROM (v_first_response_at - v_created_at)) / 60;
    ELSE
        time_to_first_response := NULL;
    END IF;

    IF v_resolved_at IS NOT NULL THEN
        time_to_resolution := EXTRACT(EPOCH FROM (v_resolved_at - v_created_at)) / 60;
    ELSE
        time_to_resolution := NULL;
    END IF;

    RETURN NEXT;
END;
$$ LANGUAGE plpgsql;
