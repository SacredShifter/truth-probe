import { useState } from 'react';
import { AuditForm } from '@/components/AuditForm';
import { ResultPanel } from '@/components/ResultPanel';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { AuditResult } from '@/types/audit';

const Index = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<AuditResult | null>(null);
  const [originalText, setOriginalText] = useState('');
  const { toast } = useToast();

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
      toast({
        title: "Analysis completed",
        description: "Valeion audit has been processed successfully",
      });
    } catch (error) {
      console.error('Audit error:', error);
      toast({
        title: "Analysis failed",
        description: "Unable to connect to Valeion sovereignty engine",
        variant: "destructive",
      });
      
      // Fallback result for demo purposes
      setResult({
        resonance_score: 0.0,
        distortion_flags: [
          { 
            type: "SYSTEM_ERROR", 
            severity: "HIGH", 
            description: "Unable to connect to analysis engine. System may be compromised." 
          }
        ],
        truth_alignment: inputText,
        analysis_report: "Connection to sovereign analysis network failed. Manual verification required."
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
