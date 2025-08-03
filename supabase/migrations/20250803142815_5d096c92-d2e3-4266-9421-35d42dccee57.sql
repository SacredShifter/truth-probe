-- Truth Beacons Module Tables

-- Create beacon_nodes table for registering beacon nodes
CREATE TABLE public.beacon_nodes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  node_name TEXT NOT NULL UNIQUE,
  region TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'error', 'offline')),
  webhook_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_health_check TIMESTAMP WITH TIME ZONE,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Create beacon_dispatch_log table for webhook logging
CREATE TABLE public.beacon_dispatch_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  beacon_node_id UUID NOT NULL REFERENCES public.beacon_nodes(id) ON DELETE CASCADE,
  monitor_log_id UUID NOT NULL REFERENCES public.valeion_monitor_log(id) ON DELETE CASCADE,
  webhook_url TEXT NOT NULL,
  payload JSONB NOT NULL,
  response_status INTEGER,
  response_time_ms INTEGER,
  delivery_status TEXT NOT NULL DEFAULT 'pending' CHECK (delivery_status IN ('pending', 'success', 'failed', 'timeout')),
  error_message TEXT,
  dispatched_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS on new tables
ALTER TABLE public.beacon_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.beacon_dispatch_log ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for beacon_nodes (admin only)
CREATE POLICY "Admins can manage beacon nodes" 
ON public.beacon_nodes 
FOR ALL 
USING (user_has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (user_has_role(auth.uid(), 'admin'::app_role));

-- Create RLS policies for beacon_dispatch_log (admin only)
CREATE POLICY "Admins can view beacon dispatch logs" 
ON public.beacon_dispatch_log 
FOR SELECT 
USING (user_has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Service role can manage beacon dispatch logs" 
ON public.beacon_dispatch_log 
FOR ALL 
USING (auth.role() = 'service_role');

-- Create indexes for performance
CREATE INDEX idx_beacon_nodes_status ON public.beacon_nodes(status);
CREATE INDEX idx_beacon_nodes_region ON public.beacon_nodes(region);
CREATE INDEX idx_beacon_dispatch_log_beacon_node ON public.beacon_dispatch_log(beacon_node_id);
CREATE INDEX idx_beacon_dispatch_log_monitor_log ON public.beacon_dispatch_log(monitor_log_id);
CREATE INDEX idx_beacon_dispatch_log_status ON public.beacon_dispatch_log(delivery_status);
CREATE INDEX idx_beacon_dispatch_log_dispatched_at ON public.beacon_dispatch_log(dispatched_at);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_beacon_nodes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_beacon_nodes_updated_at
  BEFORE UPDATE ON public.beacon_nodes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_beacon_nodes_updated_at();