import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { 
  ArrowLeft, 
  Plus, 
  Radio, 
  CheckCircle, 
  AlertCircle, 
  XCircle, 
  Send, 
  Clock,
  Activity,
  Globe,
  Zap
} from 'lucide-react';

interface BeaconNode {
  id: string;
  node_name: string;
  region: string;
  status: 'active' | 'error' | 'offline';
  webhook_url: string;
  created_at: string;
  updated_at: string;
  last_health_check: string | null;
  metadata: any;
}

interface DispatchLog {
  id: string;
  beacon_node_id: string;
  monitor_log_id: string | null;
  webhook_url: string;
  payload: any;
  response_status: number | null;
  response_time_ms: number | null;
  delivery_status: 'pending' | 'success' | 'failed' | 'timeout';
  error_message: string | null;
  dispatched_at: string;
  completed_at: string | null;
  beacon_nodes: {
    node_name: string;
    region: string;
  };
}

const statusColors = {
  active: 'bg-green-500/20 text-green-300 border-green-500/20',
  error: 'bg-red-500/20 text-red-300 border-red-500/20',
  offline: 'bg-gray-500/20 text-gray-300 border-gray-500/20'
};

const statusIcons = {
  active: CheckCircle,
  error: AlertCircle,
  offline: XCircle
};

const deliveryStatusColors = {
  success: 'bg-green-500/20 text-green-300 border-green-500/20',
  failed: 'bg-red-500/20 text-red-300 border-red-500/20',
  timeout: 'bg-orange-500/20 text-orange-300 border-orange-500/20',
  pending: 'bg-blue-500/20 text-blue-300 border-blue-500/20'
};

export const TruthBeacons = () => {
  const [beacons, setBeacons] = useState<BeaconNode[]>([]);
  const [dispatchLogs, setDispatchLogs] = useState<DispatchLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddingBeacon, setIsAddingBeacon] = useState(false);
  const [newBeacon, setNewBeacon] = useState({
    node_name: '',
    region: '',
    webhook_url: '',
    status: 'active' as const
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchBeacons();
    fetchDispatchLogs();
  }, []);

  const fetchBeacons = async () => {
    try {
      const { data, error } = await supabase
        .from('beacon_nodes')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setBeacons((data || []).map(beacon => ({
        ...beacon,
        status: beacon.status as BeaconNode['status']
      })));
    } catch (error) {
      console.error('Error fetching beacons:', error);
      toast({
        title: "Error loading beacons",
        description: "Failed to fetch beacon nodes",
        variant: "destructive"
      });
    }
  };

  const fetchDispatchLogs = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('beacon_dispatch_log')
        .select(`
          *,
          beacon_nodes!inner(node_name, region)
        `)
        .order('dispatched_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setDispatchLogs((data || []).map(log => ({
        ...log,
        delivery_status: log.delivery_status as DispatchLog['delivery_status']
      })));
    } catch (error) {
      console.error('Error fetching dispatch logs:', error);
      toast({
        title: "Error loading dispatch logs",
        description: "Failed to fetch webhook logs",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const addBeacon = async () => {
    try {
      if (!newBeacon.node_name || !newBeacon.region || !newBeacon.webhook_url) {
        toast({
          title: "Validation Error",
          description: "All fields are required",
          variant: "destructive"
        });
        return;
      }

      const { error } = await supabase
        .from('beacon_nodes')
        .insert([newBeacon]);

      if (error) throw error;

      toast({
        title: "Beacon Added",
        description: `${newBeacon.node_name} has been registered successfully`,
      });

      setNewBeacon({ node_name: '', region: '', webhook_url: '', status: 'active' });
      setIsAddingBeacon(false);
      fetchBeacons();
    } catch (error) {
      console.error('Error adding beacon:', error);
      toast({
        title: "Error adding beacon",
        description: "Failed to register new beacon node",
        variant: "destructive"
      });
    }
  };

  const updateBeaconStatus = async (beaconId: string, status: BeaconNode['status']) => {
    try {
      const { error } = await supabase
        .from('beacon_nodes')
        .update({ 
          status,
          last_health_check: new Date().toISOString()
        })
        .eq('id', beaconId);

      if (error) throw error;

      toast({
        title: "Status Updated",
        description: `Beacon status changed to ${status}`,
      });

      fetchBeacons();
    } catch (error) {
      console.error('Error updating beacon status:', error);
      toast({
        title: "Error updating status",
        description: "Failed to update beacon status",
        variant: "destructive"
      });
    }
  };

  const testDispatch = async (beaconId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('beacon-dispatch', {
        body: { beacon_node_id: beaconId, test_mode: true }
      });

      if (error) throw error;

      toast({
        title: data.success ? "Test Successful" : "Test Failed",
        description: data.message,
        variant: data.success ? "default" : "destructive"
      });

      fetchDispatchLogs();
    } catch (error) {
      console.error('Error testing dispatch:', error);
      toast({
        title: "Test Dispatch Failed",
        description: "Unable to send test message",
        variant: "destructive"
      });
    }
  };

  const healthCheck = async (beaconId: string) => {
    await updateBeaconStatus(beaconId, 'active');
  };

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
            TRUTH BEACONS
          </h1>
          <p className="text-muted-foreground font-mono">
            Distributed resonance broadcast network management
          </p>
        </div>

        {/* Beacon Nodes Management */}
        <Card className="mb-8">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="font-mono flex items-center gap-2">
                <Radio className="w-5 h-5" />
                BEACON NODES
              </CardTitle>
              <Dialog open={isAddingBeacon} onOpenChange={setIsAddingBeacon}>
                <DialogTrigger asChild>
                  <Button className="font-mono">
                    <Plus className="w-4 h-4 mr-2" />
                    ADD BEACON
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle className="font-mono">Register New Beacon Node</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="node_name" className="font-mono">Node Name</Label>
                      <Input
                        id="node_name"
                        value={newBeacon.node_name}
                        onChange={(e) => setNewBeacon(prev => ({ ...prev, node_name: e.target.value }))}
                        placeholder="e.g., beacon-alpha-1"
                        className="font-mono"
                      />
                    </div>
                    <div>
                      <Label htmlFor="region" className="font-mono">Region</Label>
                      <Input
                        id="region"
                        value={newBeacon.region}
                        onChange={(e) => setNewBeacon(prev => ({ ...prev, region: e.target.value }))}
                        placeholder="e.g., US-West, EU-Central"
                        className="font-mono"
                      />
                    </div>
                    <div>
                      <Label htmlFor="webhook_url" className="font-mono">Webhook URL</Label>
                      <Input
                        id="webhook_url"
                        value={newBeacon.webhook_url}
                        onChange={(e) => setNewBeacon(prev => ({ ...prev, webhook_url: e.target.value }))}
                        placeholder="https://your-beacon.com/webhook"
                        className="font-mono"
                      />
                    </div>
                    <div>
                      <Label htmlFor="status" className="font-mono">Initial Status</Label>
                      <Select value={newBeacon.status} onValueChange={(value: any) => setNewBeacon(prev => ({ ...prev, status: value }))}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="offline">Offline</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Button onClick={addBeacon} className="w-full font-mono">
                      Register Beacon
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            {beacons.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground font-mono">
                No beacon nodes registered
              </div>
            ) : (
              <div className="grid gap-4">
                {beacons.map((beacon) => {
                  const StatusIcon = statusIcons[beacon.status];
                  return (
                    <div key={beacon.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-4">
                        <StatusIcon className={`w-5 h-5 ${
                          beacon.status === 'active' ? 'text-green-400' :
                          beacon.status === 'error' ? 'text-red-400' : 'text-gray-400'
                        }`} />
                        <div>
                          <h3 className="font-mono font-bold">{beacon.node_name}</h3>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground font-mono">
                            <span className="flex items-center gap-1">
                              <Globe className="w-3 h-3" />
                              {beacon.region}
                            </span>
                            <Badge className={statusColors[beacon.status]}>
                              {beacon.status.toUpperCase()}
                            </Badge>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => testDispatch(beacon.id)}>
                          <Send className="w-4 h-4 mr-2" />
                          TEST
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => healthCheck(beacon.id)}>
                          <Activity className="w-4 h-4 mr-2" />
                          HEALTH CHECK
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Dispatch Logs */}
        <Card>
          <CardHeader>
            <CardTitle className="font-mono flex items-center gap-2">
              <Zap className="w-5 h-5" />
              DISPATCH LOGS
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-96">
              {loading ? (
                <div className="text-center py-8 text-muted-foreground font-mono">
                  Loading dispatch logs...
                </div>
              ) : dispatchLogs.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground font-mono">
                  No dispatch logs found
                </div>
              ) : (
                <div className="space-y-3">
                  {dispatchLogs.map((log) => (
                    <div key={log.id} className="flex items-center justify-between p-3 border rounded-lg bg-muted/20">
                      <div className="flex items-center gap-4">
                        <Badge className={deliveryStatusColors[log.delivery_status]}>
                          {log.delivery_status.toUpperCase()}
                        </Badge>
                        <div>
                          <div className="font-mono font-bold text-sm">
                            {log.beacon_nodes.node_name} ({log.beacon_nodes.region})
                          </div>
                          <div className="flex items-center gap-4 text-xs text-muted-foreground font-mono">
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {new Date(log.dispatched_at).toLocaleString()}
                            </span>
                            {log.response_time_ms && (
                              <span>{log.response_time_ms}ms</span>
                            )}
                            {log.response_status && (
                              <span>HTTP {log.response_status}</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="text-right text-xs font-mono">
                        {log.payload?.type === 'test' ? (
                          <Badge variant="outline">TEST</Badge>
                        ) : (
                          <span className="text-muted-foreground">
                            {log.payload?.source_name || 'Unknown Source'}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};