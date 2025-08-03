import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface AuditFormProps {
  onSubmit: (text: string) => void;
  isLoading: boolean;
}

export const AuditForm = ({ onSubmit, isLoading }: AuditFormProps) => {
  const [inputText, setInputText] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputText.trim()) {
      onSubmit(inputText.trim());
    }
  };

  return (
    <Card className="w-full max-w-4xl mx-auto bg-background border-border">
      <CardHeader>
        <CardTitle className="text-foreground text-center text-xl font-mono">
          VALEION DISTORTION DETECTION ENGINE
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Enter text to analyze for distortion patterns..."
            className="min-h-32 bg-muted border-border text-foreground font-mono"
            disabled={isLoading}
          />
          <Button 
            type="submit" 
            disabled={!inputText.trim() || isLoading}
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-mono"
          >
            {isLoading ? 'ANALYZING...' : 'INITIATE AUDIT'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};