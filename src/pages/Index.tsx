import { useState } from 'react';
import { AuditForm } from '@/components/AuditForm';
import { ResultPanel } from '@/components/ResultPanel';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface DistortionFlag {
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
}

interface AuditResult {
  resonance_score: number;
  distortion_flags: DistortionFlag[];
  truth_rewrite: string;
  explanation: string;
}

const Index = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<AuditResult | null>(null);
  const [originalText, setOriginalText] = useState('');

  const handleAudit = async (inputText: string) => {
    setIsLoading(true);
    setOriginalText(inputText);
    
    try {
      const { data, error } = await supabase.functions.invoke('valeion-audit', {
        body: { input_text: inputText }
      });

      if (error) {
        throw error;
      }

      setResult(data);
      toast.success('Analysis completed');
    } catch (error) {
      console.error('Audit error:', error);
      toast.error('Analysis failed');
      
      // Fallback result for demo purposes
      setResult({
        resonance_score: 0.0,
        distortion_flags: [
          { 
            type: "SYSTEM_ERROR", 
            severity: "critical", 
            description: "Unable to connect to analysis engine. System may be compromised." 
          }
        ],
        truth_rewrite: inputText,
        explanation: "Connection to sovereign analysis network failed. Manual verification required."
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="container mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-mono font-bold text-foreground mb-2">
            VALEION-CORE
          </h1>
          <p className="text-muted-foreground font-mono text-sm">
            SOVEREIGNTY PROTOCOL // DISTORTION DETECTION ENGINE
          </p>
        </div>

        <AuditForm onSubmit={handleAudit} isLoading={isLoading} />

        {result && (
          <div className="mt-8">
            <ResultPanel result={result} originalText={originalText} />
          </div>
        )}
      </div>
    </div>
  );
};

export default Index;
