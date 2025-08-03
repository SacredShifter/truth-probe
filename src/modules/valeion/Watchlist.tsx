import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, TrendingDown, Clock, Eye, ArrowLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface WatchlistSource {
  source_name: string;
  total_audits: number;
  avg_resonance_score: number;
  high_distortion_count: number;
  last_seen: string;
  score_trend: number; // Percentage change over 7 days
  recent_scores: number[];
}

const getResonanceColor = (score: number) => {
  if (score >= 0.8) return 'text-green-400';
  if (score >= 0.6) return 'text-yellow-400';
  if (score >= 0.4) return 'text-orange-400';
  return 'text-red-400';
};

const getTrendColor = (trend: number) => {
  if (trend <= -15) return 'text-red-400'; // Alert threshold
  if (trend < 0) return 'text-orange-400';
  return 'text-green-400';
};

export const Watchlist = () => {
  const [sources, setSources] = useState<WatchlistSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSource, setSelectedSource] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchWatchlistData();
  }, []);

  const fetchWatchlistData = async () => {
    try {
      setLoading(true);

      // Fetch aggregated data from valeion_monitor_log
      const { data: rawData, error } = await supabase
        .from('valeion_monitor_log')
        .select('source_name, resonance_score, distortion_flags, submitted_at')
        .order('submitted_at', { ascending: false });

      if (error) throw error;

      // Group and analyze data by source
      const sourceMap = new Map<string, any>();
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      rawData?.forEach(entry => {
        const sourceName = entry.source_name;
        const entryDate = new Date(entry.submitted_at);
        
        if (!sourceMap.has(sourceName)) {
          sourceMap.set(sourceName, {
            source_name: sourceName,
            total_audits: 0,
            scores: [],
            recent_scores: [],
            old_scores: [],
            high_distortion_count: 0,
            last_seen: entry.submitted_at
          });
        }

        const source = sourceMap.get(sourceName);
        source.total_audits++;
        source.scores.push(entry.resonance_score);

        // Separate scores by date for trend analysis
        if (entryDate >= sevenDaysAgo) {
          source.recent_scores.push(entry.resonance_score);
        } else {
          source.old_scores.push(entry.resonance_score);
        }

        // Count HIGH distortion flags
        const flags = Array.isArray(entry.distortion_flags) 
          ? entry.distortion_flags as any[]
          : [];
        const highFlags = flags.filter(
          (flag: any) => flag.severity === 'HIGH'
        ).length || 0;
        source.high_distortion_count += highFlags;

        // Update last seen
        if (new Date(entry.submitted_at) > new Date(source.last_seen)) {
          source.last_seen = entry.submitted_at;
        }
      });

      // Calculate averages and trends
      const watchlistSources: WatchlistSource[] = Array.from(sourceMap.values()).map(source => {
        const avgScore = source.scores.reduce((a: number, b: number) => a + b, 0) / source.scores.length;
        const recentAvg = source.recent_scores.length > 0 
          ? source.recent_scores.reduce((a: number, b: number) => a + b, 0) / source.recent_scores.length
          : avgScore;
        const oldAvg = source.old_scores.length > 0
          ? source.old_scores.reduce((a: number, b: number) => a + b, 0) / source.old_scores.length
          : avgScore;

        const scoreTrend = source.old_scores.length > 0 
          ? ((recentAvg - oldAvg) / oldAvg) * 100
          : 0;

        return {
          source_name: source.source_name,
          total_audits: source.total_audits,
          avg_resonance_score: avgScore,
          high_distortion_count: source.high_distortion_count,
          last_seen: source.last_seen,
          score_trend: scoreTrend,
          recent_scores: source.recent_scores.slice(-10) // Last 10 for mini chart
        };
      });

      // Sort by risk level (low scores, negative trends, high distortion count)
      watchlistSources.sort((a, b) => {
        const aRisk = (1 - a.avg_resonance_score) + (a.score_trend < -15 ? 0.5 : 0) + (a.high_distortion_count * 0.1);
        const bRisk = (1 - b.avg_resonance_score) + (b.score_trend < -15 ? 0.5 : 0) + (b.high_distortion_count * 0.1);
        return bRisk - aRisk;
      });

      setSources(watchlistSources);
    } catch (error) {
      console.error('Error fetching watchlist data:', error);
      toast({
        title: "Error loading watchlist",
        description: "Failed to fetch source monitoring data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const openAuditHistory = (sourceName: string) => {
    // For now, just show an alert. In a full implementation, this would open a detailed view
    toast({
      title: "Audit History",
      description: `Opening detailed audit history for ${sourceName}`,
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center py-12">
            <div className="text-muted-foreground font-mono">Loading watchlist data...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <Link to="/truth-feed">
              <Button variant="outline" size="sm" className="font-mono">
                <ArrowLeft className="w-4 h-4 mr-2" />
                BACK TO TRUTH FEED
              </Button>
            </Link>
          </div>
          
          <h1 className="text-4xl font-bold font-mono text-foreground mb-2">
            VALEION WATCHLIST
          </h1>
          <p className="text-muted-foreground font-mono">
            High-risk and repeat-distortion source monitoring dashboard
          </p>
        </div>

        {sources.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <div className="text-muted-foreground font-mono">No monitored sources found</div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6">
            {sources.map((source) => (
              <Card key={source.source_name} className="bg-background border-border">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="font-mono text-lg flex items-center gap-3">
                        <AlertTriangle className="w-5 h-5 text-red-400" />
                        {source.source_name}
                        {source.score_trend <= -15 && (
                          <Badge variant="destructive" className="font-mono">
                            <TrendingDown className="w-3 h-3 mr-1" />
                            ALERT
                          </Badge>
                        )}
                      </CardTitle>
                      
                      <div className="mt-2 flex items-center gap-6 text-sm text-muted-foreground font-mono">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          Last: {new Date(source.last_seen).toLocaleDateString()}
                        </span>
                        <span>{source.total_audits} total audits</span>
                        <span>{source.high_distortion_count} HIGH flags</span>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className={`text-2xl font-mono font-bold ${getResonanceColor(source.avg_resonance_score)}`}>
                        {(source.avg_resonance_score * 100).toFixed(0)}%
                      </div>
                      <div className="text-xs text-muted-foreground">Avg Resonance</div>
                    </div>
                  </div>
                </CardHeader>

                <CardContent>
                  <div className="space-y-4">
                    {/* Resonance Progress */}
                    <div>
                      <div className="flex justify-between text-sm font-mono mb-2">
                        <span>Truth Resonance Level</span>
                        <span className={getResonanceColor(source.avg_resonance_score)}>
                          {source.avg_resonance_score.toFixed(3)}
                        </span>
                      </div>
                      <Progress value={source.avg_resonance_score * 100} className="h-2" />
                    </div>

                    {/* Trend Analysis */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <TrendingDown className="w-4 h-4 text-muted-foreground" />
                        <span className="font-mono text-sm">7-Day Trend:</span>
                        <span className={`font-mono font-bold ${getTrendColor(source.score_trend)}`}>
                          {source.score_trend > 0 ? '+' : ''}{source.score_trend.toFixed(1)}%
                        </span>
                      </div>

                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => openAuditHistory(source.source_name)}
                        className="font-mono"
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        VIEW HISTORY
                      </Button>
                    </div>

                    {/* Mini Trend Graph Placeholder */}
                    <div className="border rounded-lg p-3 bg-muted/20">
                      <div className="text-xs font-mono text-muted-foreground mb-2">Recent Score Pattern</div>
                      <div className="flex items-end gap-1 h-8">
                        {source.recent_scores.map((score, index) => (
                          <div
                            key={index}
                            className={`w-2 rounded-t ${
                              score >= 0.8 ? 'bg-green-400' :
                              score >= 0.6 ? 'bg-yellow-400' :
                              score >= 0.4 ? 'bg-orange-400' : 'bg-red-400'
                            }`}
                            style={{ height: `${score * 100}%` }}
                          />
                        ))}
                      </div>
                    </div>
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