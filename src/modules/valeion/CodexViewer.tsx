import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, ArrowLeft, Book, Shield, Scale, Zap, Eye } from 'lucide-react';

interface CodexSection {
  id: string;
  title: string;
  icon: any;
  color: string;
  content: {
    principles: string[];
    clauses: Array<{
      id: string;
      title: string;
      content: string;
      violationLevel: 'LOW' | 'MEDIUM' | 'HIGH';
    }>;
  };
}

const codexData: CodexSection[] = [
  {
    id: 'founding-law',
    title: 'Founding Law',
    icon: Scale,
    color: 'text-blue-400',
    content: {
      principles: [
        'Truth resonates at frequencies that cannot be artificially manufactured',
        'Consciousness sovereignty is an inalienable right of all beings',
        'Information distortion is a violation of cosmic order'
      ],
      clauses: [
        {
          id: 'FL-001',
          title: 'Truth Primacy Principle',
          content: 'No entity may knowingly disseminate information that contradicts observable reality or established scientific consensus without clear disclosure of uncertainty.',
          violationLevel: 'HIGH'
        },
        {
          id: 'FL-002',
          title: 'Consciousness Autonomy',
          content: 'All beings have the right to form their own opinions based on complete and unmanipulated information.',
          violationLevel: 'HIGH'
        },
        {
          id: 'FL-003',
          title: 'Transparency Mandate',
          content: 'Sources of information must be clearly identified and conflicts of interest disclosed.',
          violationLevel: 'MEDIUM'
        }
      ]
    }
  },
  {
    id: 'sacred-shifter-accord',
    title: 'Sacred Shifter Accord',
    icon: Zap,
    color: 'text-purple-400',
    content: {
      principles: [
        'Reality shifters bear responsibility for the ripple effects of their influence',
        'Personal transformation must not come at the cost of others\' wellbeing',
        'Sacred knowledge carries the obligation of ethical application'
      ],
      clauses: [
        {
          id: 'SSA-001',
          title: 'Influence Responsibility',
          content: 'Those who possess the ability to shift consciousness or reality bear heightened responsibility for the ethical use of such abilities.',
          violationLevel: 'HIGH'
        },
        {
          id: 'SSA-002',
          title: 'Harm Prevention',
          content: 'No practice or teaching may be promoted that creates psychological dependency or financial exploitation.',
          violationLevel: 'HIGH'
        },
        {
          id: 'SSA-003',
          title: 'Knowledge Accessibility',
          content: 'Sacred or transformational knowledge should be made accessible without unreasonable barriers.',
          violationLevel: 'LOW'
        }
      ]
    }
  },
  {
    id: 'valeion-accord',
    title: 'Valeion Accord',
    icon: Shield,
    color: 'text-green-400',
    content: {
      principles: [
        'Truth detection systems must operate with complete transparency',
        'No algorithm may be designed to promote specific ideological outcomes',
        'Collective consciousness protection supersedes individual convenience'
      ],
      clauses: [
        {
          id: 'VA-001',
          title: 'Algorithmic Transparency',
          content: 'All truth detection and analysis algorithms must be open to public audit and review.',
          violationLevel: 'HIGH'
        },
        {
          id: 'VA-002',
          title: 'Bias Prevention',
          content: 'Systems must actively identify and correct for built-in biases that favor particular worldviews.',
          violationLevel: 'MEDIUM'
        },
        {
          id: 'VA-003',
          title: 'Collective Protection',
          content: 'When individual desires conflict with collective truth-seeking, the collective need takes precedence.',
          violationLevel: 'MEDIUM'
        }
      ]
    }
  },
  {
    id: 'horizon-protocols',
    title: 'Horizon Protocols',
    icon: Eye,
    color: 'text-orange-400',
    content: {
      principles: [
        'Future-oriented decisions must consider long-term consciousness evolution',
        'Technological development must align with spiritual advancement',
        'No innovation may compromise the ability of future generations to access truth'
      ],
      clauses: [
        {
          id: 'HP-001',
          title: 'Future Consciousness Consideration',
          content: 'All decisions must be evaluated for their impact on the consciousness development of future generations.',
          violationLevel: 'MEDIUM'
        },
        {
          id: 'HP-002',
          title: 'Technological Alignment',
          content: 'New technologies must demonstrate compatibility with human consciousness evolution before widespread adoption.',
          violationLevel: 'LOW'
        },
        {
          id: 'HP-003',
          title: 'Truth Access Preservation',
          content: 'No system or structure may be created that could permanently limit future access to truth or reality.',
          violationLevel: 'HIGH'
        }
      ]
    }
  },
  {
    id: 'protection-mandate',
    title: 'Protection Mandate',
    icon: Shield,
    color: 'text-red-400',
    content: {
      principles: [
        'Vulnerable consciousness states require enhanced protection',
        'Information warfare tactics are prohibited under all circumstances',
        'Truth defenders have both authority and responsibility to intervene'
      ],
      clauses: [
        {
          id: 'PM-001',
          title: 'Vulnerable State Protection',
          content: 'Extra protections apply when targeting individuals in altered states, emotional distress, or developmental transitions.',
          violationLevel: 'HIGH'
        },
        {
          id: 'PM-002',
          title: 'Information Warfare Prohibition',
          content: 'Coordinated campaigns designed to confuse, overwhelm, or misdirect public consciousness are strictly forbidden.',
          violationLevel: 'HIGH'
        },
        {
          id: 'PM-003',
          title: 'Intervention Authority',
          content: 'Truth defenders are authorized and obligated to intervene when violations threaten collective consciousness.',
          violationLevel: 'MEDIUM'
        }
      ]
    }
  }
];

const getViolationColor = (level: string) => {
  switch (level) {
    case 'HIGH': return 'bg-red-500/20 text-red-300 border-red-500/20';
    case 'MEDIUM': return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/20';
    case 'LOW': return 'bg-blue-500/20 text-blue-300 border-blue-500/20';
    default: return 'bg-gray-500/20 text-gray-300 border-gray-500/20';
  }
};

export const CodexViewer = () => {
  const [expandedSections, setExpandedSections] = useState<string[]>([]);

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => 
      prev.includes(sectionId) 
        ? prev.filter(id => id !== sectionId)
        : [...prev, sectionId]
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <Link to="/">
              <Button variant="outline" size="sm" className="font-mono">
                <ArrowLeft className="w-4 h-4 mr-2" />
                BACK TO VALEION
              </Button>
            </Link>
          </div>
          
          <h1 className="text-4xl font-bold font-mono text-foreground mb-2">
            CODEX OF CLARITY
          </h1>
          <p className="text-muted-foreground font-mono mb-6">
            Universal principles governing truth, consciousness, and information integrity
          </p>

          <Card className="mb-8 bg-gradient-to-r from-primary/5 to-accent/5 border-primary/20">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <Book className="w-8 h-8 text-primary flex-shrink-0 mt-1" />
                <div>
                  <h3 className="font-bold font-mono text-lg mb-2">About the Codex</h3>
                  <p className="text-muted-foreground font-mono text-sm leading-relaxed">
                    The Codex of Clarity establishes universal principles for information integrity, 
                    consciousness protection, and truth preservation. Each section contains specific 
                    clauses that can be referenced when identifying distortions or violations. 
                    Click clause IDs to copy references for audit reports.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          {codexData.map((section) => (
            <Card key={section.id} className="bg-background border-border">
              <Collapsible 
                open={expandedSections.includes(section.id)}
                onOpenChange={() => toggleSection(section.id)}
              >
                <CollapsibleTrigger asChild>
                  <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                    <div className="flex items-center justify-between">
                      <CardTitle className="font-mono text-xl flex items-center gap-3">
                        <section.icon className={`w-6 h-6 ${section.color}`} />
                        {section.title}
                      </CardTitle>
                      <ChevronDown className={`w-5 h-5 transition-transform ${
                        expandedSections.includes(section.id) ? 'rotate-180' : ''
                      }`} />
                    </div>
                  </CardHeader>
                </CollapsibleTrigger>

                <CollapsibleContent>
                  <CardContent className="space-y-6">
                    {/* Core Principles */}
                    <div>
                      <h4 className="font-mono font-bold text-foreground mb-3">Core Principles</h4>
                      <div className="space-y-2">
                        {section.content.principles.map((principle, index) => (
                          <div key={index} className="flex items-start gap-2">
                            <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0 mt-2" />
                            <p className="text-muted-foreground font-mono text-sm">{principle}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Specific Clauses */}
                    <div>
                      <h4 className="font-mono font-bold text-foreground mb-3">Enforceable Clauses</h4>
                      <div className="space-y-4">
                        {section.content.clauses.map((clause) => (
                          <div key={clause.id} className="border rounded-lg p-4 bg-muted/20">
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex items-center gap-3">
                                <Badge 
                                  variant="outline" 
                                  className="font-mono cursor-pointer hover:bg-primary/20"
                                  onClick={() => navigator.clipboard.writeText(clause.id)}
                                >
                                  {clause.id}
                                </Badge>
                                <h5 className="font-mono font-bold text-sm">{clause.title}</h5>
                              </div>
                              <Badge className={`${getViolationColor(clause.violationLevel)} font-mono text-xs`}>
                                {clause.violationLevel}
                              </Badge>
                            </div>
                            <p className="text-muted-foreground font-mono text-sm leading-relaxed">
                              {clause.content}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </CollapsibleContent>
              </Collapsible>
            </Card>
          ))}
        </div>

        <Card className="mt-8 bg-gradient-to-r from-accent/5 to-primary/5 border-accent/20">
          <CardContent className="p-6">
            <h3 className="font-bold font-mono text-lg mb-3">Implementation Notes</h3>
            <div className="space-y-2 text-sm font-mono text-muted-foreground">
              <p>• Clause references can be included in Valeion audit reports</p>
              <p>• Violation levels indicate recommended response severity</p>
              <p>• The Codex evolves based on collective consciousness feedback</p>
              <p>• Truth defenders may propose amendments through the governance process</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};