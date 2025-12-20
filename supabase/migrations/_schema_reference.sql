-- =====================================================
-- NEUCLER AUTO SHOP OS - DATABASE SCHEMA REFERENCE
-- =====================================================
-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.
-- Last Updated: 2024-12-19
-- =====================================================

-- =====================================================
-- CORE TABLES
-- =====================================================

CREATE TABLE public.merchants (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  platform_merchant_id text NOT NULL UNIQUE,
  access_token text NOT NULL,
  refresh_token text,
  business_name text,
  email text,
  subscription_tier text DEFAULT 'free'::text,
  stripe_customer_id text,
  stripe_subscription_id text,
  subscription_status text DEFAULT 'trialing'::text,
  trial_ends_at timestamp with time zone DEFAULT (now() + '7 days'::interval),
  twilio_subaccount_sid text,
  twilio_auth_token text,
  twilio_phone_number text,
  user_id uuid,
  CONSTRAINT merchants_pkey PRIMARY KEY (id),
  CONSTRAINT merchants_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);

CREATE TABLE public.business_profiles (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  merchant_id text NOT NULL UNIQUE,
  timezone text DEFAULT 'UTC'::text,
  business_hours jsonb DEFAULT '{}'::jsonb,
  address text,
  website text,
  phone text,
  industry text,
  services_summary text,
  faq_list jsonb DEFAULT '[]'::jsonb,
  ai_tone text DEFAULT 'friendly'::text,
  ai_name text DEFAULT 'Alex'::text,
  is_onboarding_completed boolean DEFAULT false,
  logo_url text,
  brand_color text DEFAULT '#000000'::text,
  google_place_id text UNIQUE,
  google_rating real,
  google_ratings_total integer,
  master_booking_url text,
  slug text,
  CONSTRAINT business_profiles_pkey PRIMARY KEY (id),
  CONSTRAINT business_profiles_merchant_id_fkey FOREIGN KEY (merchant_id) REFERENCES public.merchants(platform_merchant_id)
);

CREATE TABLE public.customers (
  id text NOT NULL,
  merchant_id text NOT NULL,
  first_name text,
  last_name text,
  email text,
  phone_number text,
  last_visit_date timestamp with time zone,
  total_spend_cents bigint DEFAULT 0,
  visit_count integer DEFAULT 0,
  loyalty_balance integer DEFAULT 0,
  is_subscribed boolean DEFAULT true,
  status text DEFAULT 'active'::text,
  tags ARRAY DEFAULT '{}'::text[],
  notes text,
  last_contacted_at timestamp with time zone,
  last_contact_channel text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT customers_pkey PRIMARY KEY (id, merchant_id),
  CONSTRAINT customers_merchant_id_fkey FOREIGN KEY (merchant_id) REFERENCES public.merchants(platform_merchant_id)
);

-- =====================================================
-- AI AGENTS & AUTOMATION
-- =====================================================

CREATE TABLE public.ai_agents (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  merchant_id text NOT NULL,
  retell_agent_id text,
  name text,
  voice_id text,
  system_prompt text,
  type text DEFAULT 'inbound'::text,
  phone_number text,
  opening_greeting text DEFAULT 'Thanks for calling, how can I help you today?'::text,
  pickup_behavior text DEFAULT 'immediate'::text,
  transfer_number text,
  retell_llm_id text,
  status text DEFAULT 'active'::text,
  phone_mode text DEFAULT 'generated'::text,
  agent_persona text DEFAULT 'general_receptionist'::text,
  is_configured boolean DEFAULT false,
  provisioning_status text DEFAULT 'pending_provision'::text,
  desired_area_code text,
  language text DEFAULT 'en-US'::text,
  voice_gender text,
  voice_vibe text,
  handoff_number text,
  spam_filter_enabled boolean DEFAULT true,
  call_handling_mode text DEFAULT 'ai_handles_all'::text,
  forwarding_number text,
  log_spam_calls boolean DEFAULT true,
  CONSTRAINT ai_agents_pkey PRIMARY KEY (id)
);

CREATE TABLE public.ai_reply_usage (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  merchant_id text NOT NULL,
  month_year text NOT NULL,
  reply_count integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT ai_reply_usage_pkey PRIMARY KEY (id)
);

CREATE TABLE public.ai_routing_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  merchant_id uuid NOT NULL,
  customer_id uuid,
  ticket_id uuid,
  deal_id uuid,
  action text NOT NULL CHECK (action = ANY (ARRAY['PIPELINE'::text, 'ESCALATE'::text, 'AUTO_REPLY'::text, 'NO_ACTION'::text])),
  intent text,
  commercial_score integer CHECK (commercial_score >= 0 AND commercial_score <= 100),
  is_complex boolean DEFAULT false,
  summary text,
  message_id uuid,
  message_content text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT ai_routing_logs_pkey PRIMARY KEY (id)
);

CREATE TABLE public.automations (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  merchant_id text NOT NULL,
  type text NOT NULL,
  is_active boolean DEFAULT false,
  config jsonb DEFAULT '{}'::jsonb,
  CONSTRAINT automations_pkey PRIMARY KEY (id)
);

CREATE TABLE public.automation_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  merchant_id text NOT NULL,
  action_type text NOT NULL,
  description text NOT NULL,
  status text DEFAULT 'success'::text,
  CONSTRAINT automation_logs_pkey PRIMARY KEY (id)
);

-- =====================================================
-- MESSAGING & COMMUNICATION
-- =====================================================

CREATE TABLE public.messages (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  merchant_id text NOT NULL,
  customer_phone text NOT NULL,
  direction text NOT NULL,
  body text,
  status text DEFAULT 'sent'::text,
  channel text DEFAULT 'sms'::text,
  subject text,
  summary text,
  recording_url text,
  duration_seconds integer,
  contact_phone text,
  customer_id text,
  session_id text,
  ai_routed boolean DEFAULT false,
  ai_routing_action text,
  CONSTRAINT messages_pkey PRIMARY KEY (id)
);

CREATE TABLE public.call_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamp with time zone DEFAULT now(),
  merchant_id text NOT NULL,
  agent_id uuid NOT NULL,
  retell_call_id text NOT NULL UNIQUE,
  direction text,
  customer_phone text,
  status text,
  duration_seconds integer,
  summary text,
  transcript jsonb,
  in_voicemail boolean,
  user_sentiment text,
  call_successful boolean,
  cost_cents integer,
  latency_e2e_p50 integer,
  llm_token_usage integer,
  customer_id text,
  sms_sent boolean DEFAULT false,
  CONSTRAINT call_logs_pkey PRIMARY KEY (id)
);

CREATE TABLE public.inbound_emails (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamp with time zone DEFAULT now(),
  merchant_id text NOT NULL,
  customer_id text,
  customer_email text NOT NULL,
  subject text,
  body_plain text,
  body_html text,
  status text DEFAULT 'received'::text,
  CONSTRAINT inbound_emails_pkey PRIMARY KEY (id)
);

-- =====================================================
-- TICKETS & SERVICE DESK
-- =====================================================

CREATE TABLE public.tickets (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  merchant_id text NOT NULL,
  customer_id uuid,
  title text NOT NULL,
  description text,
  status text DEFAULT 'open'::text CHECK (status = ANY (ARRAY['open'::text, 'in_progress'::text, 'pending'::text, 'resolved'::text, 'closed'::text])),
  priority text DEFAULT 'medium'::text CHECK (priority = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text, 'urgent'::text])),
  category text,
  assigned_to text,
  source text DEFAULT 'manual'::text CHECK (source = ANY (ARRAY['manual'::text, 'email'::text, 'sms'::text, 'chat'::text, 'phone'::text])),
  source_message_id uuid,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  first_response_at timestamp with time zone,
  resolved_at timestamp with time zone,
  due_date timestamp with time zone,
  tags ARRAY DEFAULT '{}'::text[],
  custom_fields jsonb DEFAULT '{}'::jsonb,
  outcome text CHECK (outcome = ANY (ARRAY['appointment_booked'::text, 'sale_completed'::text, 'issue_resolved'::text, 'escalated'::text, 'no_action_needed'::text, 'customer_dropped'::text, 'needs_review'::text])),
  resolution_channel text CHECK (resolution_channel = ANY (ARRAY['phone'::text, 'sms'::text, 'email'::text, 'chat'::text, 'manual'::text])),
  call_id text,
  outcome_confidence integer CHECK (outcome_confidence >= 0 AND outcome_confidence <= 100),
  booking_details jsonb,
  transcript text,
  CONSTRAINT tickets_pkey PRIMARY KEY (id)
);

CREATE TABLE public.ticket_comments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL,
  author_id text,
  author_name text,
  content text NOT NULL,
  is_internal boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT ticket_comments_pkey PRIMARY KEY (id),
  CONSTRAINT ticket_comments_ticket_id_fkey FOREIGN KEY (ticket_id) REFERENCES public.tickets(id)
);

CREATE TABLE public.ticket_scores (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL,
  agent_id text,
  quickness_score integer DEFAULT 0 CHECK (quickness_score >= 0 AND quickness_score <= 20),
  knowledge_score integer DEFAULT 0 CHECK (knowledge_score >= 0 AND knowledge_score <= 20),
  hospitality_score integer DEFAULT 0 CHECK (hospitality_score >= 0 AND hospitality_score <= 20),
  intro_score integer DEFAULT 0 CHECK (intro_score >= 0 AND intro_score <= 20),
  cta_score integer DEFAULT 0 CHECK (cta_score >= 0 AND cta_score <= 20),
  total_score integer DEFAULT 0 CHECK (total_score >= 0 AND total_score <= 100),
  feedback_summary text,
  avg_response_time_minutes numeric,
  created_at timestamp with time zone DEFAULT now(),
  outcome text,
  resolution_channel text,
  time_to_first_response_minutes numeric,
  time_to_resolution_minutes numeric,
  CONSTRAINT ticket_scores_pkey PRIMARY KEY (id),
  CONSTRAINT ticket_scores_ticket_id_fkey FOREIGN KEY (ticket_id) REFERENCES public.tickets(id)
);

CREATE TABLE public.ticket_likes (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL,
  user_id uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT ticket_likes_pkey PRIMARY KEY (id),
  CONSTRAINT ticket_likes_ticket_id_fkey FOREIGN KEY (ticket_id) REFERENCES public.tickets(id)
);

CREATE TABLE public.ticket_activities (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  merchant_id text NOT NULL,
  ticket_id uuid NOT NULL,
  sender_type text NOT NULL,
  sender_id text,
  message_body text,
  is_internal_note boolean DEFAULT false,
  CONSTRAINT ticket_activities_pkey PRIMARY KEY (id),
  CONSTRAINT fk_activities_ticket FOREIGN KEY (ticket_id) REFERENCES public.support_tickets(id)
);

CREATE TABLE public.support_tickets (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  merchant_id text NOT NULL,
  customer_id text,
  status text DEFAULT 'open'::text,
  priority text DEFAULT 'medium'::text,
  channel text NOT NULL,
  subject text,
  description text,
  assigned_to uuid,
  resolution_summary text,
  source_email_id uuid,
  source_call_id uuid,
  source_message_id uuid,
  CONSTRAINT support_tickets_pkey PRIMARY KEY (id),
  CONSTRAINT fk_tickets_merchant FOREIGN KEY (merchant_id) REFERENCES public.merchants(platform_merchant_id)
);

-- =====================================================
-- DEALS & PIPELINE
-- =====================================================

CREATE TABLE public.deals (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  merchant_id uuid NOT NULL,
  customer_id uuid,
  customer_name text,
  title text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'new_inquiry'::text CHECK (status = ANY (ARRAY['new_inquiry'::text, 'quote_sent'::text, 'follow_up'::text, 'booked'::text, 'completed'::text, 'lost'::text])),
  vehicle_year text,
  vehicle_make text,
  vehicle_model text,
  vehicle_vin text,
  value numeric DEFAULT 0,
  source text DEFAULT 'manual'::text,
  assigned_to uuid,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  closed_at timestamp with time zone,
  CONSTRAINT deals_pkey PRIMARY KEY (id)
);

-- =====================================================
-- CAMPAIGNS & MARKETING
-- =====================================================

CREATE TABLE public.email_campaigns (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  merchant_id text NOT NULL,
  name text NOT NULL,
  subject text NOT NULL,
  body text NOT NULL,
  audience text NOT NULL,
  status text DEFAULT 'draft'::text,
  sent_count integer DEFAULT 0,
  delivered_count integer DEFAULT 0,
  open_count integer DEFAULT 0,
  click_count integer DEFAULT 0,
  bounce_count integer DEFAULT 0,
  complaint_count integer DEFAULT 0,
  failure_count integer DEFAULT 0,
  CONSTRAINT email_campaigns_pkey PRIMARY KEY (id)
);

CREATE TABLE public.campaign_recipients (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamp with time zone DEFAULT now(),
  merchant_id text NOT NULL,
  campaign_id uuid,
  customer_id text,
  customer_email text,
  CONSTRAINT campaign_recipients_pkey PRIMARY KEY (id),
  CONSTRAINT campaign_recipients_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.email_campaigns(id)
);

CREATE TABLE public.email_deliveries_log (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL,
  recipient_email text NOT NULL,
  delivered_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT email_deliveries_log_pkey PRIMARY KEY (id)
);

CREATE TABLE public.email_events_log (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  campaign_id uuid,
  recipient_email text NOT NULL,
  event_type text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT email_events_log_pkey PRIMARY KEY (id),
  CONSTRAINT email_events_log_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.email_campaigns(id)
);

CREATE TABLE public.sms_campaigns (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  merchant_id text NOT NULL,
  name text NOT NULL,
  message_body text NOT NULL,
  audience text NOT NULL,
  status text DEFAULT 'sent'::text,
  recipient_count integer DEFAULT 0,
  CONSTRAINT sms_campaigns_pkey PRIMARY KEY (id)
);

-- =====================================================
-- LOYALTY & REWARDS
-- =====================================================

CREATE TABLE public.loyalty_programs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  merchant_id text NOT NULL,
  terminology text DEFAULT 'Points'::text,
  accrual_type text DEFAULT 'amount_spent'::text,
  accrual_rule jsonb DEFAULT '{"earn": 1, "spend": 100}'::jsonb,
  status text DEFAULT 'active'::text,
  CONSTRAINT loyalty_programs_pkey PRIMARY KEY (id),
  CONSTRAINT loyalty_programs_merchant_id_fkey FOREIGN KEY (merchant_id) REFERENCES public.merchants(platform_merchant_id)
);

CREATE TABLE public.loyalty_rewards (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  program_id uuid NOT NULL,
  name text NOT NULL,
  discount_type text DEFAULT 'amount'::text,
  discount_value numeric NOT NULL,
  points_required integer NOT NULL,
  CONSTRAINT loyalty_rewards_pkey PRIMARY KEY (id),
  CONSTRAINT loyalty_rewards_program_id_fkey FOREIGN KEY (program_id) REFERENCES public.loyalty_programs(id)
);

CREATE TABLE public.loyalty_balances (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  merchant_id text NOT NULL,
  customer_id text NOT NULL,
  program_id uuid,
  balance integer DEFAULT 0,
  CONSTRAINT loyalty_balances_pkey PRIMARY KEY (id),
  CONSTRAINT loyalty_balances_program_id_fkey FOREIGN KEY (program_id) REFERENCES public.loyalty_programs(id)
);

CREATE TABLE public.loyalty_ledger (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  merchant_id text NOT NULL,
  customer_id text NOT NULL,
  program_id uuid,
  points_change integer NOT NULL,
  reason text,
  metadata jsonb DEFAULT '{}'::jsonb,
  CONSTRAINT loyalty_ledger_pkey PRIMARY KEY (id),
  CONSTRAINT loyalty_ledger_program_id_fkey FOREIGN KEY (program_id) REFERENCES public.loyalty_programs(id)
);

-- =====================================================
-- TEAM & ACCESS
-- =====================================================

CREATE TABLE public.team_members (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  merchant_id text NOT NULL,
  user_id uuid NOT NULL,
  role text NOT NULL DEFAULT 'member'::text CHECK (role = ANY (ARRAY['owner'::text, 'admin'::text, 'member'::text])),
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT team_members_pkey PRIMARY KEY (id),
  CONSTRAINT team_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);

CREATE TABLE public.team_invites (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  merchant_id text NOT NULL,
  email text NOT NULL,
  role text NOT NULL DEFAULT 'member'::text CHECK (role = ANY (ARRAY['admin'::text, 'member'::text])),
  invited_by uuid,
  token text NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'::text) UNIQUE,
  expires_at timestamp with time zone DEFAULT (now() + '7 days'::interval),
  accepted_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT team_invites_pkey PRIMARY KEY (id),
  CONSTRAINT team_invites_invited_by_fkey FOREIGN KEY (invited_by) REFERENCES auth.users(id)
);

-- =====================================================
-- KNOWLEDGE BASE
-- =====================================================

CREATE TABLE public.knowledge_base_articles (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  merchant_id text NOT NULL,
  title text NOT NULL,
  content text NOT NULL,
  embedding USER-DEFINED,
  category text,
  tags ARRAY DEFAULT '{}'::text[],
  is_published boolean DEFAULT true,
  source_ticket_id uuid,
  CONSTRAINT knowledge_base_articles_pkey PRIMARY KEY (id),
  CONSTRAINT fk_kb_merchant FOREIGN KEY (merchant_id) REFERENCES public.merchants(platform_merchant_id)
);

-- =====================================================
-- REVIEWS & FEEDBACK
-- =====================================================

CREATE TABLE public.review_requests (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  merchant_id text NOT NULL,
  order_id text NOT NULL UNIQUE,
  customer_phone text,
  status text DEFAULT 'sent'::text,
  rating integer,
  feedback_text text,
  CONSTRAINT review_requests_pkey PRIMARY KEY (id)
);

-- =====================================================
-- WEB WIDGETS & TRACKING
-- =====================================================

CREATE TABLE public.web_widgets (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  merchant_id text NOT NULL,
  widget_type text NOT NULL,
  config jsonb DEFAULT '{}'::jsonb,
  is_active boolean DEFAULT true,
  CONSTRAINT web_widgets_pkey PRIMARY KEY (id)
);

CREATE TABLE public.smart_links (
  id text NOT NULL DEFAULT generate_short_id(6),
  merchant_id text NOT NULL,
  contact_id uuid,
  target_url text NOT NULL,
  clicked_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT smart_links_pkey PRIMARY KEY (id)
);
