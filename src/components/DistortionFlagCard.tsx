import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { DistortionFlagCardProps, DistortionFlag } from '@/types/audit';

const getSeverityColor = (severity: DistortionFlag['severity']) => {
  switch (severity) {
    case 'LOW':
      return 'bg-yellow-500/30 text-yellow-200 border-yellow-500/50 shadow-lg shadow-yellow-500/20';
    case 'MEDIUM':
      return 'bg-orange-500/30 text-orange-200 border-orange-500/50 shadow-lg shadow-orange-500/20';
    case 'HIGH':
      return 'bg-red-500/30 text-red-200 border-red-500/50 shadow-lg shadow-red-500/20 animate-pulse';
    default:
      return 'bg-muted text-muted-foreground border-border';
  }
};

const getSeverityIcon = (severity: DistortionFlag['severity']) => {
  switch (severity) {
    case 'LOW':
      return '⚠️';
    case 'MEDIUM':
      return '🔶';
    case 'HIGH':
      return '🚨';
    default:
      return '⚪';
  }
};

export const DistortionFlagCard = ({ flag }: DistortionFlagCardProps) => {
  return (
    <Card className="bg-muted/50 border-border hover:bg-muted/70 transition-colors">
      <CardContent className="p-4">
        <div className="flex items-center gap-3 mb-3">
          <span className="text-lg">{getSeverityIcon(flag.severity)}</span>
          <Badge className={`${getSeverityColor(flag.severity)} font-mono text-xs font-bold px-2 py-1`}>
            {flag.severity}
          </Badge>
          <span className="text-foreground font-mono text-sm font-semibold flex-1">
            {flag.type.replace(/_/g, ' ')}
          </span>
        </div>
        <p className="text-muted-foreground text-sm font-mono leading-relaxed pl-8">
          {flag.description}
        </p>
      </CardContent>
    </Card>
  );
};