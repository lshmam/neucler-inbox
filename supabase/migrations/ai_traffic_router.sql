-- AI Traffic Router Schema
-- Run this migration to add required tables for the AI routing system

-- ============= DEALS TABLE =============
-- Stores sales opportunities routed from AI
CREATE TABLE IF NOT EXISTS deals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    merchant_id UUID NOT NULL,
    customer_id UUID,
    customer_name TEXT,
    title TEXT NOT NULL,
    description TEXT,
    
    -- Pipeline status
    status TEXT NOT NULL DEFAULT 'new_inquiry' CHECK (
        status IN ('new_inquiry', 'quote_sent', 'follow_up', 'booked', 'completed', 'lost')
    ),
    
    -- Vehicle info (optional)
    vehicle_year TEXT,
    vehicle_make TEXT,
    vehicle_model TEXT,
    vehicle_vin TEXT,
    
    -- Financial
    value NUMERIC(10,2) DEFAULT 0,
    
    -- Tracking
    source TEXT DEFAULT 'manual', -- 'manual', 'ai_router', 'phone', 'sms', 'widget'
    assigned_to UUID,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    closed_at TIMESTAMPTZ
);

-- Indexes for deals
CREATE INDEX IF NOT EXISTS idx_deals_merchant ON deals(merchant_id);
CREATE INDEX IF NOT EXISTS idx_deals_customer ON deals(customer_id);
CREATE INDEX IF NOT EXISTS idx_deals_status ON deals(merchant_id, status);
CREATE INDEX IF NOT EXISTS idx_deals_created ON deals(merchant_id, created_at DESC);

-- ============= AI ROUTING LOGS TABLE =============
-- Tracks all AI routing decisions for analytics
CREATE TABLE IF NOT EXISTS ai_routing_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    merchant_id UUID NOT NULL,
    customer_id UUID,
    ticket_id UUID,
    deal_id UUID,
    
    -- Routing decision
    action TEXT NOT NULL CHECK (
        action IN ('PIPELINE', 'ESCALATE', 'AUTO_REPLY', 'NO_ACTION')
    ),
    
    -- AI analysis results
    intent TEXT, -- BOOKING_REQUEST, PRICING_QUERY, etc.
    commercial_score INTEGER CHECK (commercial_score >= 0 AND commercial_score <= 100),
    is_complex BOOLEAN DEFAULT FALSE,
    summary TEXT,
    
    -- Original message reference
    message_id UUID,
    message_content TEXT,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for routing logs
CREATE INDEX IF NOT EXISTS idx_routing_logs_merchant ON ai_routing_logs(merchant_id);
CREATE INDEX IF NOT EXISTS idx_routing_logs_action ON ai_routing_logs(merchant_id, action);
CREATE INDEX IF NOT EXISTS idx_routing_logs_created ON ai_routing_logs(merchant_id, created_at DESC);

-- ============= ADD ROUTING COLUMNS TO MESSAGES =============
-- Track which messages have been processed by the AI router
ALTER TABLE messages ADD COLUMN IF NOT EXISTS ai_routed BOOLEAN DEFAULT FALSE;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS ai_routing_action TEXT;

-- Index for unrouted messages
CREATE INDEX IF NOT EXISTS idx_messages_unrouted ON messages(merchant_id, ai_routed) WHERE ai_routed IS NULL OR ai_routed = FALSE;

-- ============= RLS POLICIES =============

-- Deals RLS
ALTER TABLE deals ENABLE ROW LEVEL SECURITY;

CREATE POLICY deals_merchant_access ON deals
    FOR ALL
    USING (merchant_id = auth.uid())
    WITH CHECK (merchant_id = auth.uid());

-- AI Routing Logs RLS
ALTER TABLE ai_routing_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY routing_logs_merchant_access ON ai_routing_logs
    FOR ALL
    USING (merchant_id = auth.uid())
    WITH CHECK (merchant_id = auth.uid());

-- ============= TRIGGERS =============

-- Auto-update updated_at on deals
CREATE OR REPLACE FUNCTION update_deals_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER deals_updated_at
    BEFORE UPDATE ON deals
    FOR EACH ROW
    EXECUTE FUNCTION update_deals_updated_at();

-- ============= COMMENTS =============

COMMENT ON TABLE deals IS 'Sales opportunities and pipeline management';
COMMENT ON TABLE ai_routing_logs IS 'AI traffic router decision logs for analytics';
COMMENT ON COLUMN deals.source IS 'Origin of the deal: manual, ai_router, phone, sms, widget';
COMMENT ON COLUMN ai_routing_logs.commercial_score IS 'AI-assessed likelihood of revenue (0-100)';
