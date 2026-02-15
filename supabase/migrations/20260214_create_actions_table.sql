-- Create actions table
-- Adjusted to use TEXT for IDs to match existing 'customers' and 'tickets' schema definitions
-- Removed strict Foreign Key constraints to avoid 'unique constraint' errors on composite keys

CREATE TABLE IF NOT EXISTS actions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    merchant_id TEXT NOT NULL, 
    customer_id TEXT, -- Changed from UUID to TEXT to match public.customers(id)
    title TEXT NOT NULL,
    description TEXT,
    type TEXT NOT NULL DEFAULT 'follow_up', 
    priority TEXT NOT NULL DEFAULT 'medium', 
    status TEXT NOT NULL DEFAULT 'open', 
    due_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    bg_process_id UUID, 
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Enable RLS
ALTER TABLE actions ENABLE ROW LEVEL SECURITY;

-- Policies (casting merchant_id to uuid for auth comparison if needed, or assuming auth.uid() is comparable)
-- Note: If merchant_id is the user_id (uuid), the cast is fine. If it's platform_merchant_id (text), logic differs.
-- For now, following the 'tickets' table pattern which uses: merchant_id IN (SELECT id::text FROM auth.users...)

CREATE POLICY "Users can only see their own actions" ON actions
    FOR ALL
    USING (merchant_id = auth.uid()::text);

CREATE POLICY "Users can insert their own actions" ON actions
    FOR INSERT
    WITH CHECK (merchant_id = auth.uid()::text);

CREATE POLICY "Users can update their own actions" ON actions
    FOR UPDATE
    USING (merchant_id = auth.uid()::text);

CREATE POLICY "Users can delete their own actions" ON actions
    FOR DELETE
    USING (merchant_id = auth.uid()::text);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_actions_merchant_id ON actions(merchant_id);
CREATE INDEX IF NOT EXISTS idx_actions_status ON actions(status);
CREATE INDEX IF NOT EXISTS idx_actions_customer_id ON actions(customer_id);
