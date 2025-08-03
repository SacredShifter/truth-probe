import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface DistortionFlag {
  type: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
  description: string;
}

interface DistortionFlagCardProps {
  flag: DistortionFlag;
}

const getSeverityColor = (severity: DistortionFlag['severity']) => {
  switch (severity) {
    case 'LOW':
      return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30';
    case 'MEDIUM':
      return 'bg-orange-500/20 text-orange-300 border-orange-500/30';
    case 'HIGH':
      return 'bg-red-500/20 text-red-300 border-red-500/30';
    default:
      return 'bg-muted text-muted-foreground border-border';
  }
};

export const DistortionFlagCard = ({ flag }: DistortionFlagCardProps) => {
  return (
    <Card className="bg-muted/50 border-border">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-2">
          <Badge className={`${getSeverityColor(flag.severity)} font-mono text-xs`}>
            {flag.severity.toUpperCase()}
          </Badge>
          <span className="text-foreground font-mono text-sm font-semibold">
            {flag.type.replace(/_/g, ' ')}
          </span>
        </div>
        <p className="text-muted-foreground text-sm font-mono leading-relaxed">
          {flag.description}
        </p>
      </CardContent>
    </Card>
  );
};