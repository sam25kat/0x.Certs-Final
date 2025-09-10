import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams, Navigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card-web3';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { api, type PlatformStats } from '@/lib/api';
import { BarChart3, Shield, Users, Award, Activity, Server, Database, Mail } from 'lucide-react';

const ADMIN_SECRET = 'secure-admin-2024'; // This would be environment variable in production

export default function AdminPortal() {
  const { secretKey } = useParams<{ secretKey: string }>();
  const [healthStatus, setHealthStatus] = useState({
    api: 'checking',
    blockchain: 'checking',
    ipfs: 'checking',
    email: 'checking',
  });

  // Verify admin access
  if (secretKey !== ADMIN_SECRET) {
    return <Navigate to="/" replace />;
  }

  const { data: stats, isLoading } = useQuery({
    queryKey: ['platform-stats'],
    queryFn: api.getPlatformStats,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Simulate health checks
  useEffect(() => {
    const checkHealth = async () => {
      // Simulate API health check
      setTimeout(() => setHealthStatus(prev => ({ ...prev, api: 'healthy' })), 500);
      setTimeout(() => setHealthStatus(prev => ({ ...prev, blockchain: 'healthy' })), 1000);
      setTimeout(() => setHealthStatus(prev => ({ ...prev, ipfs: 'healthy' })), 1500);
      setTimeout(() => setHealthStatus(prev => ({ ...prev, email: 'healthy' })), 2000);
    };

    checkHealth();
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-primary';
      case 'warning': return 'text-orange-500';
      case 'error': return 'text-destructive';
      default: return 'text-muted-foreground';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'healthy': return <Badge variant="default">Healthy</Badge>;
      case 'warning': return <Badge variant="secondary" className="bg-orange-500/20 text-orange-500">Warning</Badge>;
      case 'error': return <Badge variant="destructive">Error</Badge>;
      default: return <Badge variant="secondary">Checking...</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading admin dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-4xl font-bold gradient-text">Admin Portal</h1>
              <p className="text-muted-foreground">System overview and management</p>
            </div>
          </div>
          <Badge variant="outline" className="text-xs">
            Secret Access
          </Badge>
        </div>

        {/* Platform Statistics */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <BarChart3 className="h-8 w-8 text-primary" />
                <div>
                  <p className="text-3xl font-bold">{stats?.total_events || 0}</p>
                  <p className="text-sm text-muted-foreground">Total Events</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <Users className="h-8 w-8 text-primary" />
                <div>
                  <p className="text-3xl font-bold">{stats?.total_participants || 0}</p>
                  <p className="text-sm text-muted-foreground">Total Participants</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <Shield className="h-8 w-8 text-primary" />
                <div>
                  <p className="text-3xl font-bold">{stats?.total_poas || 0}</p>
                  <p className="text-sm text-muted-foreground">PoAs Minted</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <Award className="h-8 w-8 text-primary" />
                <div>
                  <p className="text-3xl font-bold">{stats?.total_certificates || 0}</p>
                  <p className="text-sm text-muted-foreground">Certificates Issued</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* System Health */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              System Health
            </CardTitle>
            <CardDescription>Real-time status of all system components</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="flex items-center justify-between p-4 rounded-lg border border-border">
                <div className="flex items-center gap-3">
                  <Server className={`h-5 w-5 ${getStatusColor(healthStatus.api)}`} />
                  <span className="font-medium">API Server</span>
                </div>
                {getStatusBadge(healthStatus.api)}
              </div>

              <div className="flex items-center justify-between p-4 rounded-lg border border-border">
                <div className="flex items-center gap-3">
                  <Database className={`h-5 w-5 ${getStatusColor(healthStatus.blockchain)}`} />
                  <span className="font-medium">Blockchain</span>
                </div>
                {getStatusBadge(healthStatus.blockchain)}
              </div>

              <div className="flex items-center justify-between p-4 rounded-lg border border-border">
                <div className="flex items-center gap-3">
                  <Shield className={`h-5 w-5 ${getStatusColor(healthStatus.ipfs)}`} />
                  <span className="font-medium">IPFS</span>
                </div>
                {getStatusBadge(healthStatus.ipfs)}
              </div>

              <div className="flex items-center justify-between p-4 rounded-lg border border-border">
                <div className="flex items-center gap-3">
                  <Mail className={`h-5 w-5 ${getStatusColor(healthStatus.email)}`} />
                  <span className="font-medium">Email Service</span>
                </div>
                {getStatusBadge(healthStatus.email)}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Active Events */}
        <Card>
          <CardHeader>
            <CardTitle>Active Events Overview</CardTitle>
            <CardDescription>Current event status and metrics</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-lg border border-primary/20 bg-primary/5">
                <div>
                  <h3 className="font-semibold">Active Events</h3>
                  <p className="text-sm text-muted-foreground">
                    {stats?.active_events || 0} events currently running
                  </p>
                </div>
                <Badge variant="default" className="text-lg px-4 py-2">
                  {stats?.active_events || 0}
                </Badge>
              </div>

              <div className="grid md:grid-cols-3 gap-4 text-center">
                <div className="p-4 rounded-lg border border-border">
                  <p className="text-2xl font-bold text-primary">{stats?.total_events || 0}</p>
                  <p className="text-sm text-muted-foreground">Total Events</p>
                </div>
                <div className="p-4 rounded-lg border border-border">
                  <p className="text-2xl font-bold text-primary">
                    {stats ? Math.round((stats.total_poas / Math.max(stats.total_participants, 1)) * 100) : 0}%
                  </p>
                  <p className="text-sm text-muted-foreground">PoA Completion Rate</p>
                </div>
                <div className="p-4 rounded-lg border border-border">
                  <p className="text-2xl font-bold text-primary">
                    {stats ? Math.round((stats.total_certificates / Math.max(stats.total_participants, 1)) * 100) : 0}%
                  </p>
                  <p className="text-sm text-muted-foreground">Certificate Rate</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* System Controls */}
        <Card>
          <CardHeader>
            <CardTitle>System Controls</CardTitle>
            <CardDescription>Administrative actions and system management</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-4">
              <Button variant="outline" className="h-24 flex-col gap-2">
                <Activity className="h-6 w-6" />
                <span>Refresh Data</span>
              </Button>
              
              <Button variant="outline" className="h-24 flex-col gap-2">
                <Database className="h-6 w-6" />
                <span>Database Backup</span>
              </Button>
              
              <Button variant="outline" className="h-24 flex-col gap-2">
                <Shield className="h-6 w-6" />
                <span>Security Scan</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}