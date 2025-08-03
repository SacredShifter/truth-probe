import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, Shield, AlertTriangle, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import type { AuditResult } from '@/types/audit';

interface AuditFeedEntry extends AuditResult {
  id: string;
  input_text: string;
  created_at: string;
}

export const AuditFeed = () => {
  const [audits, setAudits] = useState<AuditFeedEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAudit, setSelectedAudit] = useState<string | null>(null);

  useEffect(() => {
    fetchLatestAudits();
  }, []);

  const fetchLatestAudits = async () => {
    try {
      const { data: auditResults, error } = await supabase
        .from('valeion_audit_results')
        .select(`
          id,
          input_text,
          resonance_score,
          truth_rewrite,
          explanation,
          created_at,
          valeion_distortion_flags (
            flag_type,
            severity,
            description
          )
        `)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;

      // Transform data to match frontend structure
      const transformedAudits: AuditFeedEntry[] = auditResults?.map(audit => ({
        id: audit.id,
        input_text: audit.input_text,
        resonance_score: audit.resonance_score,
        distortion_flags: audit.valeion_distortion_flags?.map((flag: any) => ({
          type: flag.flag_type,
          severity: flag.severity as 'LOW' | 'MEDIUM' | 'HIGH',
          description: flag.description
        })) || [],
        truth_alignment: audit.truth_rewrite || '',
        analysis_report: audit.explanation,
        created_at: audit.created_at
      })) || [];

      setAudits(transformedAudits);
    } catch (error) {
      console.error('Error fetching audit feed:', error);
    } finally {
      setLoading(false);
    }
  };

  const getResonanceColor = (score: number) => {
    if (score >= 0.8) return 'text-green-400';
    if (score >= 0.6) return 'text-yellow-400';
    if (score >= 0.4) return 'text-orange-400';
    return 'text-red-400';
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'LOW':
        return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30';
      case 'MEDIUM':
        return 'bg-orange-500/20 text-orange-300 border-orange-500/30';
      case 'HIGH':
        return 'bg-red-500/20 text-red-300 border-red-500/30 animate-pulse';
      default:
        return 'bg-muted text-muted-foreground border-border';
    }
  };

  const truncateText = (text: string, maxLength: number = 100) => {
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  if (loading) {
    return (
      <Card className="bg-background border-border">
        <CardHeader>
          <CardTitle className="text-foreground font-mono flex items-center gap-2">
            <Shield className="w-5 h-5" />
            VALEION TRUTH MONITOR FEED
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground font-mono">
            Loading latest audits...
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-background border-border">
      <CardHeader>
        <CardTitle className="text-foreground font-mono flex items-center gap-2">
          <Shield className="w-5 h-5" />
          VALEION TRUTH MONITOR FEED
          <Badge variant="outline" className="ml-auto font-mono">
            {audits.length} RECENT AUDITS
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {audits.length === 0 ? (
          <div className="text-center text-muted-foreground font-mono py-8">
            No audits available. Submit text for analysis to see results here.
          </div>
        ) : (
          audits.map((audit) => (
            <Collapsible 
              key={audit.id}
              open={selectedAudit === audit.id}
              onOpenChange={(open) => setSelectedAudit(open ? audit.id : null)}
            >
              <Card className="bg-muted/30 border-border hover:bg-muted/50 transition-colors">
                <CollapsibleTrigger asChild>
                  <CardHeader className="cursor-pointer">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`text-2xl font-mono font-bold ${getResonanceColor(audit.resonance_score)}`}>
                          {(audit.resonance_score * 100).toFixed(0)}%
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            {audit.distortion_flags.length > 0 && (
                              <AlertTriangle className="w-4 h-4 text-red-400" />
                            )}
                            <span className="text-sm font-mono text-foreground">
                              {audit.distortion_flags.length} distortion{audit.distortion_flags.length !== 1 ? 's' : ''}
                            </span>
                          </div>
                          <div className="text-xs text-muted-foreground font-mono">
                            {truncateText(audit.input_text)}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground font-mono">
                          {formatDate(audit.created_at)}
                        </span>
                        <ChevronDown className={`w-4 h-4 transition-transform ${selectedAudit === audit.id ? 'rotate-180' : ''}`} />
                      </div>
                    </div>
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent className="pt-0 space-y-4">
                    {/* Original Text */}
                    <div>
                      <h4 className="text-sm font-mono font-semibold text-foreground mb-2">ORIGINAL TEXT:</h4>
                      <p className="text-sm text-muted-foreground font-mono bg-muted/50 p-3 rounded">
                        {audit.input_text}
                      </p>
                    </div>

                    {/* Distortion Flags */}
                    {audit.distortion_flags.length > 0 && (
                      <div>
                        <h4 className="text-sm font-mono font-semibold text-foreground mb-2">DISTORTIONS:</h4>
                        <div className="space-y-2">
                          {audit.distortion_flags.map((flag, index) => (
                            <div key={index} className="flex items-center gap-2">
                              <Badge className={`${getSeverityColor(flag.severity)} font-mono text-xs`}>
                                {flag.severity}
                              </Badge>
                              <span className="text-sm font-mono text-foreground">{flag.type}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Truth Alignment */}
                    <div>
                      <h4 className="text-sm font-mono font-semibold text-foreground mb-2">TRUTH ALIGNMENT:</h4>
                      <p className="text-sm text-green-100 font-mono bg-green-500/10 border border-green-500/20 p-3 rounded">
                        {audit.truth_alignment}
                      </p>
                    </div>

                    {/* Analysis Report */}
                    <div>
                      <h4 className="text-sm font-mono font-semibold text-foreground mb-2">ANALYSIS:</h4>
                      <p className="text-sm text-muted-foreground font-mono bg-muted/50 p-3 rounded">
                        {audit.analysis_report}
                      </p>
                    </div>
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>
          ))
        )}
      </CardContent>
    </Card>
  );
};