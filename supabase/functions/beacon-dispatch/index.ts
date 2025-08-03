import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface BeaconNode {
  id: string;
  node_name: string;
  webhook_url: string;
  status: 'active' | 'error' | 'offline';
}

interface MonitorLogEntry {
  id: string;
  source_name: string;
  resonance_score: number;
  distortion_flags: any[];
  status: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      'https://mikltjgbvxrxndtszorb.supabase.co',
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1pa2x0amdidnhyeG5kdHN6b3JiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzY0MjcwOSwiZXhwIjoyMDU5MjE4NzA5fQ.FZsF4HS96m1E8gLj-YdLJzGZzLhpUBBNn96jSMEyoIs'
    );

    if (req.method === 'POST') {
      const { monitor_log_id, beacon_node_id, test_mode = false } = await req.json();

      if (test_mode && beacon_node_id) {
        // Test dispatch to specific beacon
        const { data: beacon, error: beaconError } = await supabaseClient
          .from('beacon_nodes')
          .select('*')
          .eq('id', beacon_node_id)
          .single();

        if (beaconError || !beacon) {
          return new Response(JSON.stringify({ error: 'Beacon not found' }), {
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        const testPayload = {
          type: 'test',
          beacon_name: beacon.node_name,
          timestamp: new Date().toISOString(),
          message: 'Test dispatch from Truth Beacons system'
        };

        const success = await dispatchToBeacon(supabaseClient, beacon, null, testPayload);

        return new Response(JSON.stringify({ 
          success, 
          message: success ? 'Test dispatch successful' : 'Test dispatch failed' 
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      if (!monitor_log_id) {
        return new Response(JSON.stringify({ error: 'monitor_log_id required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Get monitor log entry
      const { data: logEntry, error: logError } = await supabaseClient
        .from('valeion_monitor_log')
        .select('*')
        .eq('id', monitor_log_id)
        .single();

      if (logError || !logEntry) {
        return new Response(JSON.stringify({ error: 'Monitor log entry not found' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Get active beacon nodes
      const { data: beacons, error: beaconsError } = await supabaseClient
        .from('beacon_nodes')
        .select('*')
        .eq('status', 'active');

      if (beaconsError || !beacons?.length) {
        return new Response(JSON.stringify({ error: 'No active beacons found' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Dispatch to all active beacons
      const results = await Promise.all(
        beacons.map(beacon => dispatchToBeacon(supabaseClient, beacon, logEntry))
      );

      const successCount = results.filter(Boolean).length;

      return new Response(JSON.stringify({
        dispatched: beacons.length,
        successful: successCount,
        failed: beacons.length - successCount
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error in beacon-dispatch function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

async function dispatchToBeacon(
  supabaseClient: any,
  beacon: BeaconNode,
  logEntry: MonitorLogEntry | null,
  testPayload: any = null
): Promise<boolean> {
  const startTime = Date.now();

  try {
    const payload = testPayload || {
      type: 'distortion_alert',
      source_name: logEntry?.source_name,
      resonance_score: logEntry?.resonance_score,
      distortion_flags: logEntry?.distortion_flags,
      status: logEntry?.status,
      timestamp: new Date().toISOString(),
      beacon_region: beacon.node_name
    };

    const response = await fetch(beacon.webhook_url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Valeion-Truth-Beacon/1.0'
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(30000) // 30 second timeout
    });

    const responseTime = Date.now() - startTime;
    const success = response.ok;

    // Log the dispatch
    await supabaseClient
      .from('beacon_dispatch_log')
      .insert({
        beacon_node_id: beacon.id,
        monitor_log_id: logEntry?.id || null,
        webhook_url: beacon.webhook_url,
        payload: payload,
        response_status: response.status,
        response_time_ms: responseTime,
        delivery_status: success ? 'success' : 'failed',
        error_message: success ? null : `HTTP ${response.status}: ${response.statusText}`,
        completed_at: new Date().toISOString()
      });

    // Update beacon health status
    if (!success) {
      await supabaseClient
        .from('beacon_nodes')
        .update({ 
          status: 'error',
          last_health_check: new Date().toISOString()
        })
        .eq('id', beacon.id);
    }

    return success;

  } catch (error) {
    const responseTime = Date.now() - startTime;

    // Log the failed dispatch
    await supabaseClient
      .from('beacon_dispatch_log')
      .insert({
        beacon_node_id: beacon.id,
        monitor_log_id: logEntry?.id || null,
        webhook_url: beacon.webhook_url,
        payload: testPayload || {
          type: 'distortion_alert',
          source_name: logEntry?.source_name,
          resonance_score: logEntry?.resonance_score,
          distortion_flags: logEntry?.distortion_flags,
          status: logEntry?.status,
          timestamp: new Date().toISOString()
        },
        response_status: null,
        response_time_ms: responseTime,
        delivery_status: 'failed',
        error_message: error.message,
        completed_at: new Date().toISOString()
      });

    // Mark beacon as error
    await supabaseClient
      .from('beacon_nodes')
      .update({ 
        status: 'error',
        last_health_check: new Date().toISOString()
      })
      .eq('id', beacon.id);

    return false;
  }
}