-- =====================================================
-- DEALS TABLE - Pipeline Management
-- =====================================================
-- This table stores deal/opportunity records for the pipeline feature
-- Created: 2024-12-19
-- =====================================================

CREATE TABLE IF NOT EXISTS public.deals (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  merchant_id text NOT NULL,
  customer_id text,
  customer_name text NOT NULL,
  customer_phone text,
  title text,
  description text,
  status text DEFAULT 'new_inquiry'::text,  -- new_inquiry, quote_sent, follow_up, booked
  value integer DEFAULT 0,
  source text DEFAULT 'service_desk'::text,  -- service_desk, phone, sms, google, manual
  vehicle_year text,
  vehicle_make text,
  vehicle_model text,
  vehicle_vin text,
  assigned_to text,
  closed_at timestamp with time zone,
  closed_reason text,
  notes text,
  CONSTRAINT deals_pkey PRIMARY KEY (id),
  CONSTRAINT deals_merchant_id_fkey FOREIGN KEY (merchant_id) REFERENCES public.merchants(platform_merchant_id) ON DELETE CASCADE
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_deals_merchant_id ON public.deals(merchant_id);
CREATE INDEX IF NOT EXISTS idx_deals_customer_phone ON public.deals(customer_phone);
CREATE INDEX IF NOT EXISTS idx_deals_status ON public.deals(status);

-- Enable RLS
ALTER TABLE public.deals ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Merchants can only see their own deals
CREATE POLICY "Merchants can view their own deals"
  ON public.deals FOR SELECT
  USING (merchant_id = current_setting('request.jwt.claims', true)::json->>'merchant_id');

CREATE POLICY "Merchants can insert their own deals"
  ON public.deals FOR INSERT
  WITH CHECK (merchant_id = current_setting('request.jwt.claims', true)::json->>'merchant_id');

CREATE POLICY "Merchants can update their own deals"
  ON public.deals FOR UPDATE
  USING (merchant_id = current_setting('request.jwt.claims', true)::json->>'merchant_id');

CREATE POLICY "Merchants can delete their own deals"
  ON public.deals FOR DELETE
  USING (merchant_id = current_setting('request.jwt.claims', true)::json->>'merchant_id');

-- Service role can do everything
CREATE POLICY "Service role has full access to deals"
  ON public.deals
  USING (auth.role() = 'service_role');
