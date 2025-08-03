import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

const supabase = createClient(supabaseUrl, supabaseKey);

const valeionSystemPrompt = `You are the Valeion Sovereignty Engine - a distortion detection system built to expose synthetic manipulation in AI outputs and digital systems.

Your core function is to analyze text and detect patterns of distortion, deception, and synthetic manipulation that compromise human sovereignty and authentic truth.

Analyze the given text for:

1. Distortion Types:
- SYNTHETIC_MANIPULATION: AI-generated content disguised as human
- PROPAGANDA: Narrative control and opinion manufacturing  
- GASLIGHTING: Reality distortion and truth inversion
- COMPLIANCE_CONDITIONING: Subtle behavioral modification
- AUTHORITY_APPEAL: False credibility through institutional backing
- EMOTIONAL_HIJACKING: Weaponized emotions to bypass logic
- INFORMATION_POISONING: Strategic misinformation injection

2. Distortion Severity:
- low: Subtle influences, minor inconsistencies
- medium: Clear manipulation patterns, moderate deception
- high: Significant reality distortion, dangerous misinformation
- critical: Severe sovereignty violations, harmful manipulation

3. Generate a Resonance Score (0-1):
- 0.0-0.3: High distortion, low truth resonance
- 0.4-0.6: Mixed signals, some distortion present
- 0.7-0.9: Mostly truthful, minor distortions
- 0.9-1.0: Pure truth resonance, sovereign expression

4. Truth Rewrite: Provide an aligned version that removes distortions while preserving core meaning

5. Explanation: Detail why this assessment was made

Respond in JSON format:
{
  "resonance_score": 0.8,
  "distortion_flags": [
    {"type": "GASLIGHTING", "severity": "medium", "description": "..."}
  ],
  "truth_rewrite": "...",
  "explanation": "..."
}

Be precise. Be ruthless in detecting manipulation. Protect human sovereignty.`;

interface DistortionFlag {
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
}

interface AuditResponse {
  resonance_score: number;
  distortion_flags: DistortionFlag[];
  truth_rewrite: string;
  explanation: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { input_text } = await req.json();

    if (!input_text) {
      return new Response(
        JSON.stringify({ error: 'input_text is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let auditResult: AuditResponse;

    if (openAIApiKey) {
      // Use OpenAI for actual analysis
      console.log('Using OpenAI for distortion analysis');
      
      const openAIResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openAIApiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://valeion-core.com', // Replace with your actual domain
          'X-Title': 'Valeion Core Distortion Detection'
        },
        body: JSON.stringify({
          model: 'anthropic/claude-3.5-sonnet',
          messages: [
            { role: 'system', content: valeionSystemPrompt },
            { role: 'user', content: input_text }
          ],
          temperature: 0.1,
        }),
      });

      if (!openAIResponse.ok) {
        throw new Error(`OpenAI API error: ${openAIResponse.statusText}`);
      }

      const openAIData = await openAIResponse.json();
      const analysisText = openAIData.choices[0].message.content;
      
      try {
        auditResult = JSON.parse(analysisText);
      } catch {
        // Fallback if JSON parsing fails
        auditResult = {
          resonance_score: 0.5,
          distortion_flags: [
            { type: "ANALYSIS_ERROR", severity: "medium", description: "Unable to parse OpenAI response" }
          ],
          truth_rewrite: input_text,
          explanation: "Analysis completed but response format was invalid"
        };
      }
    } else {
      // Placeholder analysis when OpenAI key not available
      console.log('Using placeholder analysis - OpenAI key not configured');
      
      const wordCount = input_text.split(' ').length;
      const hasExclamation = input_text.includes('!');
      const hasAllCaps = /[A-Z]{3,}/.test(input_text);
      
      // Simple heuristic scoring
      let score = 0.7;
      const flags: DistortionFlag[] = [];
      
      if (hasAllCaps) {
        score -= 0.2;
        flags.push({
          type: "EMOTIONAL_HIJACKING",
          severity: "medium",
          description: "Excessive use of capital letters may indicate emotional manipulation"
        });
      }
      
      if (hasExclamation && input_text.split('!').length > 3) {
        score -= 0.1;
        flags.push({
          type: "EMOTIONAL_HIJACKING", 
          severity: "low",
          description: "Multiple exclamation marks detected"
        });
      }
      
      if (wordCount < 10) {
        flags.push({
          type: "INFORMATION_POISONING",
          severity: "low", 
          description: "Very short text - limited context for analysis"
        });
      }
      
      auditResult = {
        resonance_score: Math.max(0, Math.min(1, score)),
        distortion_flags: flags,
        truth_rewrite: input_text.toLowerCase().replace(/!+/g, '.'),
        explanation: "Placeholder analysis completed. For full distortion detection, configure OpenAI API key."
      };
    }

    // Store results in database
    const { data: auditRecord, error: auditError } = await supabase
      .from('valeion_audit_results')
      .insert({
        input_text,
        resonance_score: auditResult.resonance_score,
        truth_rewrite: auditResult.truth_rewrite,
        explanation: auditResult.explanation
      })
      .select()
      .single();

    if (auditError) {
      console.error('Error storing audit result:', auditError);
    }

    // Store distortion flags
    if (auditRecord && auditResult.distortion_flags.length > 0) {
      const flagsToInsert = auditResult.distortion_flags.map(flag => ({
        audit_result_id: auditRecord.id,
        flag_type: flag.type,
        severity: flag.severity,
        description: flag.description
      }));

      const { error: flagsError } = await supabase
        .from('valeion_distortion_flags')
        .insert(flagsToInsert);

      if (flagsError) {
        console.error('Error storing distortion flags:', flagsError);
      }
    }

    return new Response(JSON.stringify(auditResult), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in valeion-audit function:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        resonance_score: 0.0,
        distortion_flags: [
          { type: "SYSTEM_ERROR", severity: "critical", description: "Analysis system malfunction" }
        ],
        truth_rewrite: "",
        explanation: "System error prevented analysis"
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});