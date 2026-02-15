-- =====================================================
-- CREATE CUSTOMER SEGMENTS TABLE
-- =====================================================
-- This table stores custom customer segments created by merchants
-- for targeted marketing campaigns and audience grouping.
-- Created: 2026-02-15
-- =====================================================

CREATE TABLE IF NOT EXISTS public.customer_segments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  merchant_id text NOT NULL,
  name text NOT NULL,
  customer_ids text[] NOT NULL DEFAULT '{}',
  CONSTRAINT customer_segments_pkey PRIMARY KEY (id),
  CONSTRAINT customer_segments_merchant_id_fkey FOREIGN KEY (merchant_id) REFERENCES public.merchants(platform_merchant_id) ON DELETE CASCADE
);

-- Create index for faster merchant lookups
CREATE INDEX IF NOT EXISTS idx_customer_segments_merchant_id ON public.customer_segments(merchant_id);

-- Create index for faster name searches
CREATE INDEX IF NOT EXISTS idx_customer_segments_name ON public.customer_segments(merchant_id, name);

-- Add comment for documentation
COMMENT ON TABLE public.customer_segments IS 'Stores custom customer segments created by merchants for targeted campaigns';
COMMENT ON COLUMN public.customer_segments.customer_ids IS 'Array of customer IDs belonging to this segment';
