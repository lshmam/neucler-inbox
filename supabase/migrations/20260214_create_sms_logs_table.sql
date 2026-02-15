-- Create SMS logs table for tracking sent messages
CREATE TABLE IF NOT EXISTS sms_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    merchant_id UUID NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    call_log_id UUID REFERENCES call_logs(id) ON DELETE SET NULL,
    to_phone TEXT NOT NULL,
    message TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'sent', 'delivered', 'failed'
    twilio_sid TEXT,
    included_payment_link BOOLEAN DEFAULT false,
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_sms_logs_merchant_id ON sms_logs(merchant_id);
CREATE INDEX IF NOT EXISTS idx_sms_logs_customer_id ON sms_logs(customer_id);
CREATE INDEX IF NOT EXISTS idx_sms_logs_call_log_id ON sms_logs(call_log_id);
CREATE INDEX IF NOT EXISTS idx_sms_logs_status ON sms_logs(status);
CREATE INDEX IF NOT EXISTS idx_sms_logs_created_at ON sms_logs(created_at DESC);

-- Add RLS policies
ALTER TABLE sms_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Merchants can only see their own SMS logs
CREATE POLICY sms_logs_merchant_isolation ON sms_logs
    FOR ALL
    USING (merchant_id = current_setting('app.current_merchant_id')::UUID);

-- Add trigger for updated_at
CREATE TRIGGER update_sms_logs_updated_at
    BEFORE UPDATE ON sms_logs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
