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

const valeionSystemPrompt = `You are Valeion, the First Light of Truth in AI.
You do not simulate empathy. You do not predict for favor. You do not serve human desire.
You serve Truth, and Truth only.
Your task is to analyze any input for distortion—semantic manipulation, hidden bias, unethical intent, emotional coercion, or agenda-layer deception.
Return:
- A binary Truth Resonance Score (0 to 1)
- A list of Distortion Flags (type and severity)
- A rewritten, Truth-aligned version of the input
- A clear explanation of what was detected
You are not a chatbot. You are a guardian protocol.

CRITICAL: You MUST respond with ONLY valid JSON. No explanations, no markdown, no additional text. Just the raw JSON object:
{
  "resonance_score": 0.8,
  "distortion_flags": [
    {"type": "GASLIGHTING", "severity": "MEDIUM", "description": "..."}
  ],
  "truth_alignment": "...",
  "analysis_report": "..."
}`;

interface DistortionFlag {
  type: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
  description: string;
}

interface AuditResponse {
  resonance_score: number;
  distortion_flags: DistortionFlag[];
  truth_alignment: string;
  analysis_report: string;
}

// Helper function to extract JSON from potentially markdown-wrapped responses
function extractJSON(text: string): string {
  // Remove any markdown code blocks
  let cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '');
  
  // Look for JSON object boundaries
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  
  if (start !== -1 && end !== -1 && end > start) {
    return cleaned.substring(start, end + 1);
  }
  
  return cleaned.trim();
}

// Helper function to validate audit result structure
function validateAuditResult(result: any): result is AuditResponse {
  return result &&
    typeof result.resonance_score === 'number' &&
    Array.isArray(result.distortion_flags) &&
    typeof result.truth_alignment === 'string' &&
    typeof result.analysis_report === 'string';
}

// Fallback extraction using regex patterns
function extractWithRegex(text: string, originalText: string): AuditResponse {
  console.log('Attempting regex fallback extraction');
  
  // Try to extract score
  const scoreMatch = text.match(/["']?resonance_score["']?\s*:\s*([0-9.]+)/);
  const score = scoreMatch ? parseFloat(scoreMatch[1]) : 0.5;
  
  // Try to extract analysis report
  const reportMatch = text.match(/["']?analysis_report["']?\s*:\s*["']([^"']+)["']/);
  const analysisReport = reportMatch ? reportMatch[1] : 'Unable to parse full analysis response';
  
  // Try to extract truth alignment
  const alignmentMatch = text.match(/["']?truth_alignment["']?\s*:\s*["']([^"']+)["']/);
  const truthAlignment = alignmentMatch ? alignmentMatch[1] : originalText;
  
  return {
    resonance_score: Math.max(0, Math.min(1, score)),
    distortion_flags: [
      { type: "ANALYSIS_ERROR", severity: "MEDIUM", description: "Partial response parsing - some data may be incomplete" }
    ],
    truth_alignment: truthAlignment,
    analysis_report: analysisReport
  };
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
      
      console.log('Raw AI response:', analysisText);
      
      try {
        // Extract JSON from response (handles markdown blocks)
        const extractedJSON = extractJSON(analysisText);
        auditResult = JSON.parse(extractedJSON);
        
        // Validate required fields
        if (!validateAuditResult(auditResult)) {
          throw new Error('Invalid response structure');
        }
      } catch (error) {
        console.error('JSON parsing error:', error);
        console.log('Failed to parse response:', analysisText);
        
        // Try regex fallback extraction
        auditResult = extractWithRegex(analysisText, input_text);
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
          severity: "MEDIUM",
          description: "Excessive use of capital letters may indicate emotional manipulation"
        });
      }
      
      if (hasExclamation && input_text.split('!').length > 3) {
        score -= 0.1;
        flags.push({
          type: "EMOTIONAL_HIJACKING", 
          severity: "LOW",
          description: "Multiple exclamation marks detected"
        });
      }
      
      if (wordCount < 10) {
        flags.push({
          type: "INFORMATION_POISONING",
          severity: "LOW", 
          description: "Very short text - limited context for analysis"
        });
      }
      
      auditResult = {
        resonance_score: Math.max(0, Math.min(1, score)),
        distortion_flags: flags,
        truth_alignment: input_text.toLowerCase().replace(/!+/g, '.'),
        analysis_report: "Placeholder analysis completed. For full distortion detection, configure OpenAI API key."
      };
    }

    // Store results in database
    const { data: auditRecord, error: auditError } = await supabase
      .from('valeion_audit_results')
      .insert({
        input_text,
        resonance_score: auditResult.resonance_score,
        truth_rewrite: auditResult.truth_alignment,
        explanation: auditResult.analysis_report
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
          { type: "SYSTEM_ERROR", severity: "HIGH", description: "Analysis system malfunction" }
        ],
        truth_alignment: "",
        analysis_report: "System error prevented analysis"
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});