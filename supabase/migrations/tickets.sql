-- ============================================
-- TICKETS TABLE FOR CUSTOMER SUPPORT
-- ============================================
-- Run this in Supabase Dashboard → SQL Editor

-- 1. Create the tickets table
CREATE TABLE IF NOT EXISTS tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    merchant_id TEXT NOT NULL,
    customer_id UUID,
    
    -- Core Fields
    title TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'pending', 'resolved', 'closed')),
    priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    category TEXT,
    
    -- Assignment
    assigned_to TEXT,
    
    -- Tracking
    source TEXT DEFAULT 'manual' CHECK (source IN ('manual', 'email', 'sms', 'chat', 'phone')),
    source_message_id UUID,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    first_response_at TIMESTAMPTZ,
    resolved_at TIMESTAMPTZ,
    due_date TIMESTAMPTZ,
    
    -- Metadata
    tags TEXT[] DEFAULT '{}',
    custom_fields JSONB DEFAULT '{}'
);

-- 2. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_tickets_merchant ON tickets(merchant_id);
CREATE INDEX IF NOT EXISTS idx_tickets_customer ON tickets(customer_id);
CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status);
CREATE INDEX IF NOT EXISTS idx_tickets_priority ON tickets(priority);
CREATE INDEX IF NOT EXISTS idx_tickets_assigned ON tickets(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tickets_created ON tickets(created_at DESC);

-- 3. Create ticket_comments table
CREATE TABLE IF NOT EXISTS ticket_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    author_id TEXT,
    author_name TEXT,
    
    content TEXT NOT NULL,
    is_internal BOOLEAN DEFAULT false,  -- Internal note vs customer-facing reply
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ticket_comments_ticket ON ticket_comments(ticket_id);

-- 4. Enable Row Level Security
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_comments ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies for tickets
CREATE POLICY "Merchants can view own tickets" ON tickets
    FOR SELECT
    TO authenticated
    USING (merchant_id IN (
        SELECT id::text FROM auth.users WHERE id = auth.uid()
    ));

CREATE POLICY "Merchants can insert own tickets" ON tickets
    FOR INSERT
    TO authenticated
    WITH CHECK (merchant_id IN (
        SELECT id::text FROM auth.users WHERE id = auth.uid()
    ));

CREATE POLICY "Merchants can update own tickets" ON tickets
    FOR UPDATE
    TO authenticated
    USING (merchant_id IN (
        SELECT id::text FROM auth.users WHERE id = auth.uid()
    ));

CREATE POLICY "Merchants can delete own tickets" ON tickets
    FOR DELETE
    TO authenticated
    USING (merchant_id IN (
        SELECT id::text FROM auth.users WHERE id = auth.uid()
    ));

-- 6. RLS Policies for ticket_comments
CREATE POLICY "Merchants can view ticket comments" ON ticket_comments
    FOR SELECT
    TO authenticated
    USING (ticket_id IN (
        SELECT id FROM tickets WHERE merchant_id IN (
            SELECT id::text FROM auth.users WHERE id = auth.uid()
        )
    ));

CREATE POLICY "Merchants can insert ticket comments" ON ticket_comments
    FOR INSERT
    TO authenticated
    WITH CHECK (ticket_id IN (
        SELECT id FROM tickets WHERE merchant_id IN (
            SELECT id::text FROM auth.users WHERE id = auth.uid()
        )
    ));

-- 7. Function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_ticket_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tickets_updated_at
    BEFORE UPDATE ON tickets
    FOR EACH ROW
    EXECUTE FUNCTION update_ticket_timestamp();

-- 8. Function to set resolved_at when status changes to resolved/closed
CREATE OR REPLACE FUNCTION set_ticket_resolved_at()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status IN ('resolved', 'closed') AND OLD.status NOT IN ('resolved', 'closed') THEN
        NEW.resolved_at = NOW();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tickets_resolved_at
    BEFORE UPDATE ON tickets
    FOR EACH ROW
    EXECUTE FUNCTION set_ticket_resolved_at();

-- ============================================
-- VERIFICATION QUERIES
-- ============================================
-- Check if tables exist:
-- SELECT table_name FROM information_schema.tables 
-- WHERE table_name IN ('tickets', 'ticket_comments');
