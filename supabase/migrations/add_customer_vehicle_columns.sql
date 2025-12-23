-- Add vehicle information columns to customers table
-- This allows storing vehicle details extracted from call transcripts

ALTER TABLE public.customers
ADD COLUMN IF NOT EXISTS vehicle_year text,
ADD COLUMN IF NOT EXISTS vehicle_make text,
ADD COLUMN IF NOT EXISTS vehicle_model text,
ADD COLUMN IF NOT EXISTS service_requested text;

-- Add comment for clarity
COMMENT ON COLUMN public.customers.vehicle_year IS 'Vehicle year extracted from call transcripts';
COMMENT ON COLUMN public.customers.vehicle_make IS 'Vehicle make extracted from call transcripts';
COMMENT ON COLUMN public.customers.vehicle_model IS 'Vehicle model extracted from call transcripts';
COMMENT ON COLUMN public.customers.service_requested IS 'Most recent service requested, extracted from call transcripts';
