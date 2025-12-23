-- =====================================================
-- DEEPGRAM ANALYSIS TABLE
-- =====================================================
-- Stores enhanced transcription analysis from Deepgram
-- including speaker diarization, sentiment, and topics
-- =====================================================

-- Create deepgram_analyses table
CREATE TABLE IF NOT EXISTS public.deepgram_analyses (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    call_log_id uuid NOT NULL,
    merchant_id text NOT NULL,
    
    -- Transcription data
    transcript_text text,
    confidence numeric,
    duration_seconds numeric,
    
    -- Diarization - who said what
    diarization jsonb DEFAULT '[]'::jsonb,
    -- Format: [{ "speaker": 0, "start": 0.5, "end": 2.3, "text": "Hello..." }]
    
    -- Sentiment analysis per utterance
    sentiment_analysis jsonb DEFAULT '[]'::jsonb,
    -- Format: [{ "speaker": 0, "text": "...", "sentiment": "positive", "confidence": 0.92 }]
    
    -- Overall sentiment summary
    overall_sentiment text,
    positive_ratio numeric,
    negative_ratio numeric,
    neutral_ratio numeric,
    
    -- Topics and intents detected
    topics text[] DEFAULT '{}'::text[],
    
    -- Speaker statistics
    speaker_count integer DEFAULT 2,
    agent_talk_ratio numeric,
    customer_talk_ratio numeric,
    
    -- Processing status
    processing_status text DEFAULT 'pending'::text CHECK (
        processing_status = ANY (ARRAY['pending'::text, 'processing'::text, 'completed'::text, 'failed'::text])
    ),
    error_message text,
    
    -- Timestamps
    created_at timestamp with time zone DEFAULT now(),
    processed_at timestamp with time zone,
    
    CONSTRAINT deepgram_analyses_pkey PRIMARY KEY (id),
    CONSTRAINT deepgram_analyses_call_log_id_fkey FOREIGN KEY (call_log_id) 
        REFERENCES public.call_logs(id) ON DELETE CASCADE
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_deepgram_analyses_call_log_id ON public.deepgram_analyses(call_log_id);
CREATE INDEX IF NOT EXISTS idx_deepgram_analyses_merchant_id ON public.deepgram_analyses(merchant_id);
CREATE INDEX IF NOT EXISTS idx_deepgram_analyses_status ON public.deepgram_analyses(processing_status);

-- Add recording_url column to call_logs if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'call_logs' AND column_name = 'recording_url'
    ) THEN
        ALTER TABLE public.call_logs ADD COLUMN recording_url text;
    END IF;
END $$;

-- Add deepgram_analysis_id column to call_logs if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'call_logs' AND column_name = 'deepgram_analysis_id'
    ) THEN
        ALTER TABLE public.call_logs ADD COLUMN deepgram_analysis_id uuid;
    END IF;
END $$;

-- Add analysis_source to call_logs to track which service did the analysis
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'call_logs' AND column_name = 'analysis_source'
    ) THEN
        ALTER TABLE public.call_logs ADD COLUMN analysis_source text DEFAULT 'retell'::text;
    END IF;
END $$;
