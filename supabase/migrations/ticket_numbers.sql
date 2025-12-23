-- Add sequential ticket number to tickets table
-- Each merchant has their own sequence starting from 1

-- Add ticket_number column if not exists
ALTER TABLE public.tickets
ADD COLUMN IF NOT EXISTS ticket_number INTEGER;

-- Create a function to auto-generate ticket numbers per merchant
CREATE OR REPLACE FUNCTION generate_ticket_number()
RETURNS TRIGGER AS $$
BEGIN
    -- Get the next ticket number for this merchant
    SELECT COALESCE(MAX(ticket_number), 0) + 1
    INTO NEW.ticket_number
    FROM public.tickets
    WHERE merchant_id = NEW.merchant_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS set_ticket_number ON public.tickets;

CREATE TRIGGER set_ticket_number
BEFORE INSERT ON public.tickets
FOR EACH ROW
WHEN (NEW.ticket_number IS NULL)
EXECUTE FUNCTION generate_ticket_number();

-- Backfill existing tickets with sequential numbers per merchant
WITH numbered_tickets AS (
    SELECT id, merchant_id,
           ROW_NUMBER() OVER (PARTITION BY merchant_id ORDER BY created_at) as rn
    FROM public.tickets
    WHERE ticket_number IS NULL
)
UPDATE public.tickets t
SET ticket_number = nt.rn
FROM numbered_tickets nt
WHERE t.id = nt.id;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_tickets_merchant_number ON public.tickets(merchant_id, ticket_number);
