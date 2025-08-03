-- Create table for storing audit requests and results
CREATE TABLE public.valeion_audit_results (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  input_text TEXT NOT NULL,
  resonance_score DECIMAL(3,2) NOT NULL CHECK (resonance_score >= 0 AND resonance_score <= 1),
  truth_rewrite TEXT,
  explanation TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for distortion flags
CREATE TABLE public.valeion_distortion_flags (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  audit_result_id UUID NOT NULL REFERENCES public.valeion_audit_results(id) ON DELETE CASCADE,
  flag_type TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  description TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.valeion_audit_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.valeion_distortion_flags ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (no auth required as specified)
CREATE POLICY "Anyone can view audit results" 
ON public.valeion_audit_results 
FOR SELECT 
USING (true);

CREATE POLICY "Anyone can create audit results" 
ON public.valeion_audit_results 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Anyone can view distortion flags" 
ON public.valeion_distortion_flags 
FOR SELECT 
USING (true);

CREATE POLICY "Anyone can create distortion flags" 
ON public.valeion_distortion_flags 
FOR INSERT 
WITH CHECK (true);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_valeion_audit_results_updated_at
BEFORE UPDATE ON public.valeion_audit_results
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX idx_valeion_audit_results_created_at ON public.valeion_audit_results(created_at);
CREATE INDEX idx_valeion_distortion_flags_audit_result_id ON public.valeion_distortion_flags(audit_result_id);