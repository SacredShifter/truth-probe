// Unified types for Valeion Audit System
// These types MUST match the AuditResponse Pydantic model exactly

export interface DistortionFlag {
  type: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
  description: string;
}

export interface AuditResult {
  resonance_score: number; // Float from 0 to 1
  distortion_flags: DistortionFlag[];
  truth_alignment: string;
  analysis_report: string;
}

export interface AuditFormProps {
  onSubmit: (text: string) => void;
  isLoading: boolean;
}

export interface ResultPanelProps {
  result: AuditResult;
  originalText: string;
}

export interface DistortionFlagCardProps {
  flag: DistortionFlag;
}