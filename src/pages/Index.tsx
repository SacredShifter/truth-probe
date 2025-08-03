import { useState } from 'react';
import { Link } from 'react-router-dom';
import { AuditForm } from '@/components/AuditForm';
import { ResultPanel } from '@/components/ResultPanel';
import { AuditFeed } from '@/components/AuditFeed';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { FileText, Activity, Shield } from 'lucide-react';
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
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/5">
      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-12">
          <h1 className="text-6xl font-bold font-mono bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent mb-4">
            VALEION
          </h1>
          <p className="text-xl text-muted-foreground font-mono max-w-2xl mx-auto mb-6">
            Sovereignty Engine • Truth Resonance Auditor • Distortion Detection Matrix
          </p>
          
          <div className="flex justify-center gap-4">
            <Link to="/truth-feed">
              <Button variant="outline" className="font-mono">
                <Shield className="w-4 h-4 mr-2" />
                VIEW TRUTH FEED
              </Button>
            </Link>
            <Link to="/watchlist">
              <Button variant="outline" className="font-mono">
                <Activity className="w-4 h-4 mr-2" />
                WATCHLIST
              </Button>
            </Link>
            <Link to="/codex">
              <Button variant="outline" className="font-mono">
                <FileText className="w-4 h-4 mr-2" />
                CODEX OF CLARITY
              </Button>
            </Link>
          </div>
        </div>

        <Tabs defaultValue="audit" className="w-full max-w-4xl mx-auto">
          <TabsList className="grid w-full grid-cols-2 mb-8">
            <TabsTrigger value="audit" className="font-mono">
              <FileText className="w-4 h-4 mr-2" />
              MANUAL AUDIT
            </TabsTrigger>
            <TabsTrigger value="feed" className="font-mono">
              <Activity className="w-4 h-4 mr-2" />
              RECENT AUDITS
            </TabsTrigger>
          </TabsList>

          <TabsContent value="audit" className="space-y-8">
            <AuditForm onSubmit={handleAudit} isLoading={isLoading} />
            
            {result && (
              <ResultPanel result={result} originalText={originalText} />
            )}
          </TabsContent>

          <TabsContent value="feed">
            <AuditFeed />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Index;
