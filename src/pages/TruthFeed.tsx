import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { DistortionFlagCard } from '@/components/DistortionFlagCard';
import { useToast } from '@/hooks/use-toast';
import { AlertTriangle, Shield, ChevronDown, Filter, ExternalLink } from 'lucide-react';
import type { DistortionFlag } from '@/types/audit';

interface MonitorLogEntry {
  id: string;
  source_name: string;
  source_url: string;
  resonance_score: number;
  distortion_flags: DistortionFlag[];
  truth_alignment: string;
  analysis_report: string;
  status: 'FLAGGED' | 'ACKNOWLEDGED' | 'RESOLVED' | 'DENIED' | 'IGNORED';
  submitted_at: string;
  resolved_at?: string;
  link?: string;
}

const statusColors = {
  FLAGGED: 'bg-red-500/20 text-red-300 border-red-500/20',
  ACKNOWLEDGED: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/20',
  RESOLVED: 'bg-green-500/20 text-green-300 border-green-500/20',
  DENIED: 'bg-gray-500/20 text-gray-300 border-gray-500/20',
  IGNORED: 'bg-blue-500/20 text-blue-300 border-blue-500/20'
};

const getResonanceColor = (score: number) => {
  if (score >= 0.8) return 'text-green-400';
  if (score >= 0.6) return 'text-yellow-400';
  if (score >= 0.4) return 'text-orange-400';
  return 'text-red-400';
};

export const TruthFeed = () => {
  const [entries, setEntries] = useState<MonitorLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedEntry, setExpandedEntry] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    status: 'all',
    resonanceThreshold: '',
    flagType: '',
    source: ''
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchEntries();
  }, [filters]);

  const fetchEntries = async () => {
    try {
      setLoading(true);
      
      let query = supabase
        .from('valeion_monitor_log')
        .select('*')
        .order('submitted_at', { ascending: false })
        .limit(50);

      // Apply filters
      if (filters.status !== 'all') {
        query = query.eq('status', filters.status);
      }
      
      if (filters.resonanceThreshold) {
        query = query.lt('resonance_score', parseFloat(filters.resonanceThreshold));
      }
      
      if (filters.source) {
        query = query.ilike('source_name', `%${filters.source}%`);
      }

      const { data, error } = await query;

      if (error) throw error;

      let filteredData = data || [];

      // Cast the data to the correct type since Supabase returns Json for JSONB fields
      const typedEntries = filteredData.map(entry => ({
        ...entry,
        distortion_flags: Array.isArray(entry.distortion_flags) ? entry.distortion_flags as unknown as DistortionFlag[] : []
      })) as MonitorLogEntry[];

      // Client-side flag type filtering (after type casting)
      let finalEntries = typedEntries;
      if (filters.flagType) {
        finalEntries = typedEntries.filter(entry => {
          return entry.distortion_flags.some((flag: DistortionFlag) =>
            flag.type.toLowerCase().includes(filters.flagType.toLowerCase())
          );
        });
      }

      setEntries(finalEntries);
    } catch (error) {
      console.error('Error fetching entries:', error);
      toast({
        title: "Error loading truth feed",
        description: "Failed to fetch monitor entries",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (entryId: string, newStatus: MonitorLogEntry['status']) => {
    try {
      const { error } = await supabase
        .from('valeion_monitor_log')
        .update({ 
          status: newStatus,
          resolved_at: newStatus === 'RESOLVED' ? new Date().toISOString() : null
        })
        .eq('id', entryId);

      if (error) throw error;

      setEntries(prev => prev.map(entry =>
        entry.id === entryId 
          ? { ...entry, status: newStatus, resolved_at: newStatus === 'RESOLVED' ? new Date().toISOString() : entry.resolved_at }
          : entry
      ));

      toast({
        title: "Status updated",
        description: `Entry marked as ${newStatus.toLowerCase()}`,
      });
    } catch (error) {
      console.error('Error updating status:', error);
      toast({
        title: "Error updating status",
        description: "Failed to update entry status",
        variant: "destructive"
      });
    }
  };

  const clearFilters = () => {
    setFilters({
      status: 'all',
      resonanceThreshold: '',
      flagType: '',
      source: ''
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold font-mono text-foreground mb-2">
            TRUTH FEED
          </h1>
          <p className="text-muted-foreground font-mono">
            Live monitoring of truth distortions across tracked sources
          </p>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-mono">
              <Filter className="w-5 h-5" />
              FILTERS
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
              <div>
                <label className="text-sm font-mono text-muted-foreground mb-2 block">Status</label>
                <Select value={filters.status} onValueChange={(value) => setFilters(prev => ({ ...prev, status: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="FLAGGED">Flagged</SelectItem>
                    <SelectItem value="ACKNOWLEDGED">Acknowledged</SelectItem>
                    <SelectItem value="RESOLVED">Resolved</SelectItem>
                    <SelectItem value="DENIED">Denied</SelectItem>
                    <SelectItem value="IGNORED">Ignored</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-mono text-muted-foreground mb-2 block">Max Resonance Score</label>
                <Input
                  type="number"
                  step="0.1"
                  min="0"
                  max="1"
                  placeholder="e.g., 0.5"
                  value={filters.resonanceThreshold}
                  onChange={(e) => setFilters(prev => ({ ...prev, resonanceThreshold: e.target.value }))}
                />
              </div>

              <div>
                <label className="text-sm font-mono text-muted-foreground mb-2 block">Flag Type</label>
                <Input
                  placeholder="e.g., Emotional Manipulation"
                  value={filters.flagType}
                  onChange={(e) => setFilters(prev => ({ ...prev, flagType: e.target.value }))}
                />
              </div>

              <div>
                <label className="text-sm font-mono text-muted-foreground mb-2 block">Source</label>
                <Input
                  placeholder="Source name"
                  value={filters.source}
                  onChange={(e) => setFilters(prev => ({ ...prev, source: e.target.value }))}
                />
              </div>
            </div>

            <Button onClick={clearFilters} variant="outline" size="sm">
              Clear Filters
            </Button>
          </CardContent>
        </Card>

        {/* Results */}
        {loading ? (
          <div className="text-center py-12">
            <div className="text-muted-foreground font-mono">Loading truth feed...</div>
          </div>
        ) : entries.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <div className="text-muted-foreground font-mono">No entries found matching your filters</div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {entries.map((entry) => (
              <Card key={entry.id} className="bg-background border-border">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="font-mono text-lg flex items-center gap-3">
                        <AlertTriangle className="w-5 h-5 text-red-400" />
                        {entry.source_name}
                        <Badge className={statusColors[entry.status]}>
                          {entry.status}
                        </Badge>
                      </CardTitle>
                      
                      <div className="mt-2 flex items-center gap-4 text-sm text-muted-foreground font-mono">
                        <span>
                          Submitted: {new Date(entry.submitted_at).toLocaleDateString()}
                        </span>
                        {entry.link && (
                          <a 
                            href={entry.link} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 hover:text-primary transition-colors"
                          >
                            <ExternalLink className="w-3 h-3" />
                            View Source
                          </a>
                        )}
                      </div>
                    </div>

                    <div className="text-right">
                      <div className={`text-2xl font-mono font-bold ${getResonanceColor(entry.resonance_score)}`}>
                        {(entry.resonance_score * 100).toFixed(0)}%
                      </div>
                      <div className="text-xs text-muted-foreground">Resonance</div>
                    </div>
                  </div>
                </CardHeader>

                <CardContent>
                  <div className="space-y-4">
                    {/* Resonance Progress */}
                    <div>
                      <div className="flex justify-between text-sm font-mono mb-2">
                        <span>Truth Resonance Level</span>
                        <span className={getResonanceColor(entry.resonance_score)}>
                          {entry.resonance_score.toFixed(3)}
                        </span>
                      </div>
                      <Progress value={entry.resonance_score * 100} className="h-2" />
                    </div>

                    {/* Distortion Flags Count */}
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-red-400" />
                      <span className="font-mono text-sm">
                        {entry.distortion_flags.length} DISTORTION FLAG{entry.distortion_flags.length !== 1 ? 'S' : ''} DETECTED
                      </span>
                    </div>

                    {/* Status Controls */}
                    <div className="flex flex-wrap gap-2">
                      {['ACKNOWLEDGED', 'RESOLVED', 'DENIED', 'IGNORED'].map((status) => (
                        <Button
                          key={status}
                          size="sm"
                          variant={entry.status === status ? "default" : "outline"}
                          onClick={() => updateStatus(entry.id, status as MonitorLogEntry['status'])}
                        >
                          {status}
                        </Button>
                      ))}
                    </div>

                    {/* Expandable Details */}
                    <Collapsible 
                      open={expandedEntry === entry.id} 
                      onOpenChange={(open) => setExpandedEntry(open ? entry.id : null)}
                    >
                      <CollapsibleTrigger asChild>
                        <Button variant="outline" className="w-full">
                          <span>View Full Analysis</span>
                          <ChevronDown className={`w-4 h-4 ml-2 transition-transform ${
                            expandedEntry === entry.id ? 'rotate-180' : ''
                          }`} />
                        </Button>
                      </CollapsibleTrigger>
                      
                      <CollapsibleContent className="mt-4 space-y-4">
                        {/* Distortion Flags */}
                        {entry.distortion_flags.length > 0 && (
                          <div>
                            <h4 className="font-mono font-bold text-foreground mb-3 flex items-center gap-2">
                              <AlertTriangle className="w-4 h-4 text-red-400" />
                              DISTORTION SIGNATURES
                            </h4>
                            <div className="space-y-2">
                              {entry.distortion_flags.map((flag, index) => (
                                <DistortionFlagCard key={index} flag={flag} />
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Truth Alignment */}
                        <div>
                          <h4 className="font-mono font-bold text-foreground mb-3 flex items-center gap-2">
                            <Shield className="w-4 h-4 text-green-400" />
                            TRUTH ALIGNMENT
                          </h4>
                          <div className="bg-green-500/10 border border-green-500/20 p-4 rounded-lg">
                            <p className="text-green-100 font-mono leading-relaxed whitespace-pre-wrap">
                              {entry.truth_alignment}
                            </p>
                          </div>
                        </div>

                        {/* Analysis Report */}
                        <div>
                          <h4 className="font-mono font-bold text-foreground mb-3">
                            ANALYSIS REPORT
                          </h4>
                          <div className="bg-muted/50 p-4 rounded-lg">
                            <p className="text-muted-foreground font-mono leading-relaxed whitespace-pre-wrap">
                              {entry.analysis_report}
                            </p>
                          </div>
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};