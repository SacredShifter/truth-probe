-- Add missing indexes for performance optimization
CREATE INDEX IF NOT EXISTS idx_valeion_audit_results_resonance_score 
ON valeion_audit_results (resonance_score);

CREATE INDEX IF NOT EXISTS idx_valeion_distortion_flags_severity 
ON valeion_distortion_flags (severity);

CREATE INDEX IF NOT EXISTS idx_valeion_distortion_flags_flag_type 
ON valeion_distortion_flags (flag_type);

-- Create composite index for high distortion queries
CREATE INDEX IF NOT EXISTS idx_valeion_audit_results_high_distortion 
ON valeion_audit_results (created_at DESC) 
WHERE resonance_score < 0.5;