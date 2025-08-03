-- Create monitor_targets table for tracking sources
CREATE TABLE IF NOT EXISTS public.monitor_targets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  source_name TEXT NOT NULL,
  source_url TEXT NOT NULL UNIQUE,
  source_type TEXT NOT NULL CHECK (source_type IN ('RSS', 'JSON', 'STATIC_PAGE')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  check_interval_minutes INTEGER NOT NULL DEFAULT 15,
  last_checked_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create valeion_monitor_log table for storing audit results
CREATE TABLE IF NOT EXISTS public.valeion_monitor_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  source_name TEXT NOT NULL,
  source_url TEXT NOT NULL,
  resonance_score FLOAT NOT NULL,
  distortion_flags JSONB NOT NULL DEFAULT '[]'::jsonb,
  truth_alignment TEXT NOT NULL,
  analysis_report TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'FLAGGED' CHECK (status IN ('FLAGGED', 'ACKNOWLEDGED', 'RESOLVED', 'DENIED', 'IGNORED')),
  submitted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  resolved_at TIMESTAMP WITH TIME ZONE,
  link TEXT,
  content_hash TEXT UNIQUE, -- To prevent duplicates
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.monitor_targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.valeion_monitor_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies for monitor_targets
CREATE POLICY "Anyone can view active monitor targets"
ON public.monitor_targets
FOR SELECT
USING (is_active = true);

CREATE POLICY "Service role can manage monitor targets"
ON public.monitor_targets
FOR ALL
USING (auth.role() = 'service_role');

CREATE POLICY "Admins can manage monitor targets"
ON public.monitor_targets
FOR ALL
USING (user_has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for valeion_monitor_log
CREATE POLICY "Anyone can view monitor log"
ON public.valeion_monitor_log
FOR SELECT
USING (true);

CREATE POLICY "Service role can manage monitor log"
ON public.valeion_monitor_log
FOR ALL
USING (auth.role() = 'service_role');

CREATE POLICY "Admins can update monitor log status"
ON public.valeion_monitor_log
FOR UPDATE
USING (user_has_role(auth.uid(), 'admin'::app_role));

-- Indexes for performance
CREATE INDEX idx_valeion_monitor_log_submitted_at ON public.valeion_monitor_log(submitted_at DESC);
CREATE INDEX idx_valeion_monitor_log_resonance_score ON public.valeion_monitor_log(resonance_score);
CREATE INDEX idx_valeion_monitor_log_status ON public.valeion_monitor_log(status);
CREATE INDEX idx_valeion_monitor_log_source_name ON public.valeion_monitor_log(source_name);
CREATE INDEX idx_monitor_targets_active ON public.monitor_targets(is_active) WHERE is_active = true;
CREATE INDEX idx_monitor_targets_last_checked ON public.monitor_targets(last_checked_at);

-- Function to extract distortion flag types for indexing
CREATE OR REPLACE FUNCTION extract_distortion_types(flags JSONB)
RETURNS TEXT[] AS $$
BEGIN
  RETURN ARRAY(
    SELECT jsonb_extract_path_text(flag, 'type')
    FROM jsonb_array_elements(flags) AS flag
  );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Index for distortion flag types
CREATE INDEX idx_valeion_monitor_log_flag_types ON public.valeion_monitor_log 
USING GIN (extract_distortion_types(distortion_flags));

-- Enable pg_cron extension for scheduling
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Schedule the monitor function to run every 15 minutes
SELECT cron.schedule(
  'valeion-monitor-job',
  '*/15 * * * *', -- every 15 minutes
  $$
  SELECT
    net.http_post(
        url:='https://mikltjgbvxrxndtszorb.supabase.co/functions/v1/valeion-monitor',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1pa2x0amdidnhyeG5kdHN6b3JiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzY0MjcwOSwiZXhwIjoyMDU5MjE4NzA5fQ.NZJ5zkOQy-HGWu8-YBaK47Kx3xPpV6LKZRP6X0vGlRw"}'::jsonb,
        body:='{"scheduled": true}'::jsonb
    ) as request_id;
  $$
);