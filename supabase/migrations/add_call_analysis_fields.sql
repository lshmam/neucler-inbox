-- Add call analysis fields to deepgram_analyses table

DO $$ 
BEGIN
    -- Add call_rating column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'deepgram_analyses' AND column_name = 'call_rating'
    ) THEN
        ALTER TABLE public.deepgram_analyses ADD COLUMN call_rating integer;
    END IF;

    -- Add call_summary column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'deepgram_analyses' AND column_name = 'call_summary'
    ) THEN
        ALTER TABLE public.deepgram_analyses ADD COLUMN call_summary text;
    END IF;

    -- Add next_actions column (JSONB array)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'deepgram_analyses' AND column_name = 'next_actions'
    ) THEN
        ALTER TABLE public.deepgram_analyses ADD COLUMN next_actions jsonb DEFAULT '[]'::jsonb;
    END IF;
END $$;
