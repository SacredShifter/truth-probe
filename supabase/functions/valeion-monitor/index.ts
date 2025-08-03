import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { crypto } from 'https://deno.land/std@0.168.0/crypto/mod.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface MonitorTarget {
  id: string;
  source_name: string;
  source_url: string;
  source_type: 'RSS' | 'JSON' | 'STATIC_PAGE';
  last_checked_at?: string;
}

interface AuditResponse {
  resonance_score: number;
  distortion_flags: Array<{
    severity: 'LOW' | 'MEDIUM' | 'HIGH';
    type: string;
    description: string;
  }>;
  truth_alignment: string;
  analysis_report: string;
}

const supabase = createClient(
  'https://mikltjgbvxrxndtszorb.supabase.co',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

async function extractTextContent(url: string, sourceType: string): Promise<string> {
  console.log(`Extracting content from ${url} (type: ${sourceType})`);
  
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Valeion Truth Monitor/1.0',
      },
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const content = await response.text();
    
    // Basic text extraction based on source type
    switch (sourceType) {
      case 'RSS':
        // Extract from RSS/XML - get description/content tags
        const rssContent = content.match(/<description[^>]*>(.*?)<\/description>/gi) || 
                          content.match(/<content[^>]*>(.*?)<\/content>/gi) || [];
        return rssContent.map(match => 
          match.replace(/<[^>]*>/g, '').replace(/&[^;]+;/g, ' ')
        ).join(' ').slice(0, 2000);
        
      case 'JSON':
        try {
          const jsonData = JSON.parse(content);
          // Extract text from common JSON fields
          const textFields = ['title', 'description', 'content', 'text', 'body', 'message'];
          let extractedText = '';
          
          function extractFromObject(obj: any) {
            if (typeof obj === 'string') return obj + ' ';
            if (Array.isArray(obj)) {
              return obj.map(extractFromObject).join(' ');
            }
            if (typeof obj === 'object' && obj !== null) {
              return Object.entries(obj)
                .filter(([key]) => textFields.includes(key.toLowerCase()))
                .map(([_, value]) => extractFromObject(value))
                .join(' ');
            }
            return '';
          }
          
          extractedText = extractFromObject(jsonData);
          return extractedText.slice(0, 2000);
        } catch {
          return content.slice(0, 2000);
        }
        
      case 'STATIC_PAGE':
        // Extract text from HTML, remove scripts/styles
        const cleanHtml = content
          .replace(/<script[^>]*>.*?<\/script>/gis, '')
          .replace(/<style[^>]*>.*?<\/style>/gis, '')
          .replace(/<[^>]*>/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();
        return cleanHtml.slice(0, 2000);
        
      default:
        return content.slice(0, 2000);
    }
  } catch (error) {
    console.error(`Failed to extract content from ${url}:`, error);
    throw error;
  }
}

async function auditContent(text: string): Promise<AuditResponse> {
  console.log('Sending content to audit function...');
  
  const { data, error } = await supabase.functions.invoke('valeion-audit', {
    body: { text }
  });
  
  if (error) {
    console.error('Audit function error:', error);
    throw error;
  }
  
  return data;
}

async function createContentHash(content: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(content);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

async function shouldLogResult(result: AuditResponse): Promise<boolean> {
  // Log if resonance score is low (< 0.5) or any HIGH severity distortion flags
  if (result.resonance_score < 0.5) return true;
  
  return result.distortion_flags.some(flag => flag.severity === 'HIGH');
}

async function processMonitorTarget(target: MonitorTarget): Promise<void> {
  console.log(`Processing target: ${target.source_name} (${target.source_url})`);
  
  try {
    // Extract content
    const textContent = await extractTextContent(target.source_url, target.source_type);
    
    if (!textContent || textContent.trim().length < 50) {
      console.log(`Insufficient content from ${target.source_name}, skipping...`);
      return;
    }
    
    // Create content hash to prevent duplicates
    const contentHash = await createContentHash(textContent);
    
    // Check if we've already processed this content
    const { data: existing } = await supabase
      .from('valeion_monitor_log')
      .select('id')
      .eq('content_hash', contentHash)
      .maybeSingle();
    
    if (existing) {
      console.log(`Content already processed for ${target.source_name}, skipping...`);
      return;
    }
    
    // Audit the content
    const auditResult = await auditContent(textContent);
    
    // Check if we should log this result
    if (await shouldLogResult(auditResult)) {
      console.log(`Logging flagged content from ${target.source_name}`);
      
      // Log the result
      const { error: logError } = await supabase
        .from('valeion_monitor_log')
        .insert({
          source_name: target.source_name,
          source_url: target.source_url,
          resonance_score: auditResult.resonance_score,
          distortion_flags: auditResult.distortion_flags,
          truth_alignment: auditResult.truth_alignment,
          analysis_report: auditResult.analysis_report,
          content_hash: contentHash,
          link: target.source_url,
          status: 'FLAGGED'
        });
      
      if (logError) {
        console.error('Failed to log audit result:', logError);
      } else {
        console.log(`Successfully logged audit result for ${target.source_name}`);
      }
    } else {
      console.log(`Content from ${target.source_name} passed truth resonance check`);
    }
    
    // Update last checked timestamp
    await supabase
      .from('monitor_targets')
      .update({ last_checked_at: new Date().toISOString() })
      .eq('id', target.id);
      
  } catch (error) {
    console.error(`Error processing ${target.source_name}:`, error);
  }
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Valeion Monitor starting...');
    
    // Get all active monitor targets
    const { data: targets, error: targetsError } = await supabase
      .from('monitor_targets')
      .select('*')
      .eq('is_active', true);
    
    if (targetsError) {
      console.error('Failed to fetch monitor targets:', targetsError);
      throw targetsError;
    }
    
    if (!targets || targets.length === 0) {
      console.log('No active monitor targets found');
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No active monitor targets found',
          processed: 0 
        }), 
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    console.log(`Found ${targets.length} active monitor targets`);
    
    // Process each target
    const processingPromises = targets.map(target => processMonitorTarget(target));
    await Promise.allSettled(processingPromises);
    
    console.log('Valeion Monitor completed successfully');
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Monitor run completed',
        processed: targets.length,
        timestamp: new Date().toISOString()
      }), 
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Valeion Monitor error:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Internal server error',
        timestamp: new Date().toISOString()
      }), 
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});