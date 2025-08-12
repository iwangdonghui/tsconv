/**
 * Cache Management Dashboard
 * Admin interface for monitoring and managing cache strategies
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Activity, 
  BarChart3, 
  Settings, 
  Zap, 
  Database, 
  Clock, 
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  XCircle
} from 'lucide-react';

interface CacheStats {
  endpoints: Record<string, {
    hits: number;
    misses: number;
    sets: number;
    errors: number;
    totalLatency: number;
    operationCount: number;
    lastReset: number;
  }>;
  performance: {
    totalEndpoints: number;
    globalStrategy: string;
    autoOptimization: boolean;
    averageHitRate?: number;
    averageLatency?: number;
    totalMemoryUsage?: number;
  };
  services: Record<string, unknown>;
}

interface CacheHealth {
  overall: string;
  services: Record<string, {
    status: string;
    error?: string;
  }>;
  strategy: string;
}

interface StrategyProfile {
  name: string;
  description: string;
  useCase: string;
  performance: {
    expectedHitRate: number;
    memoryUsage: string;
    latency: string;
  };
}

export default function CacheManagementDashboard() {
  const [stats, setStats] = useState<CacheStats | null>(null);
  const [health, setHealth] = useState<CacheHealth | null>(null);
  const [strategies, setStrategies] = useState<Record<string, StrategyProfile>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedEndpoint, setSelectedEndpoint] = useState<string>('');
  const [selectedStrategy, setSelectedStrategy] = useState<string>('');

  // Fetch cache data
  const fetchCacheData = async () => {
    try {
      setLoading(true);
      
      const [statsRes, healthRes, strategiesRes] = await Promise.all([
        fetch('/api/admin/cache-management?action=stats'),
        fetch('/api/admin/cache-management?action=health'),
        fetch('/api/admin/cache-management?action=strategies')
      ]);

      if (!statsRes.ok || !healthRes.ok || !strategiesRes.ok) {
        throw new Error('Failed to fetch cache data');
      }

      const [statsData, healthData, strategiesData] = await Promise.all([
        statsRes.json(),
        healthRes.json(),
        strategiesRes.json()
      ]);

      setStats(statsData.data);
      setHealth(healthData.data);
      setStrategies(strategiesData.data.profiles);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  // Update strategy for endpoint
  const updateEndpointStrategy = async (endpoint: string, strategy: string) => {
    try {
      const response = await fetch('/api/admin/cache-management', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'updateEndpointStrategy',
          endpoint,
          strategy
        })
      });

      if (!response.ok) {
        throw new Error('Failed to update strategy');
      }

      await fetchCacheData(); // Refresh data
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update strategy');
    }
  };

  // Clear cache
  const clearCache = async (pattern?: string) => {
    try {
      const response = await fetch('/api/admin/cache-management', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'clearCache',
          pattern
        })
      });

      if (!response.ok) {
        throw new Error('Failed to clear cache');
      }

      await fetchCacheData(); // Refresh data
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to clear cache');
    }
  };

  useEffect(() => {
    fetchCacheData();
    const interval = setInterval(fetchCacheData, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <Alert className="border-red-200 bg-red-50">
        <AlertTriangle className="h-4 w-4 text-red-600" />
        <AlertDescription className="text-red-800">
          Error loading cache data: {error}
        </AlertDescription>
      </Alert>
    );
  }

  const getHealthIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'degraded':
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      case 'unhealthy':
        return <XCircle className="h-4 w-4 text-red-600" />;
      default:
        return <Activity className="h-4 w-4 text-gray-600" />;
    }
  };

  const getHealthColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'degraded':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'unhealthy':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const calculateHitRate = (endpoint: any) => {
    const total = endpoint.hits + endpoint.misses;
    return total > 0 ? ((endpoint.hits / total) * 100).toFixed(1) : '0.0';
  };

  const calculateAvgLatency = (endpoint: any) => {
    return endpoint.operationCount > 0 
      ? (endpoint.totalLatency / endpoint.operationCount).toFixed(1)
      : '0.0';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Cache Management</h1>
        <div className="flex gap-2">
          <Button onClick={() => fetchCacheData()} variant="outline" size="sm">
            <Activity className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={() => clearCache()} variant="destructive" size="sm">
            <Database className="h-4 w-4 mr-2" />
            Clear All
          </Button>
        </div>
      </div>

      {/* Health Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overall Health</CardTitle>
            {health && getHealthIcon(health.overall)}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {health?.overall || 'Unknown'}
            </div>
            <Badge className={`mt-2 ${health ? getHealthColor(health.overall) : ''}`}>
              Strategy: {health?.strategy || 'Unknown'}
            </Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Hit Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.performance.averageHitRate 
                ? `${(stats.performance.averageHitRate * 100).toFixed(1)}%`
                : 'N/A'
              }
            </div>
            <p className="text-xs text-muted-foreground">
              Average across all endpoints
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Latency</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.performance.averageLatency 
                ? `${stats.performance.averageLatency.toFixed(1)}ms`
                : 'N/A'
              }
            </div>
            <p className="text-xs text-muted-foreground">
              Response time
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="endpoints" className="space-y-4">
        <TabsList>
          <TabsTrigger value="endpoints">Endpoints</TabsTrigger>
          <TabsTrigger value="strategies">Strategies</TabsTrigger>
          <TabsTrigger value="services">Services</TabsTrigger>
        </TabsList>

        <TabsContent value="endpoints" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Endpoint Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {stats?.endpoints && Object.entries(stats.endpoints).map(([endpoint, data]) => (
                  <div key={endpoint} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <h3 className="font-medium">{endpoint}</h3>
                      <div className="flex gap-4 mt-2 text-sm text-muted-foreground">
                        <span>Hit Rate: {calculateHitRate(data)}%</span>
                        <span>Avg Latency: {calculateAvgLatency(data)}ms</span>
                        <span>Operations: {data.operationCount}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Select
                        value={selectedStrategy}
                        onValueChange={(value) => {
                          setSelectedStrategy(value);
                          updateEndpointStrategy(endpoint, value);
                        }}
                      >
                        <SelectTrigger className="w-40">
                          <SelectValue placeholder="Change strategy" />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(strategies).map(([key, strategy]) => (
                            <SelectItem key={key} value={key}>
                              {strategy.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => clearCache(endpoint)}
                      >
                        Clear
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="strategies" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries(strategies).map(([key, strategy]) => (
              <Card key={key}>
                <CardHeader>
                  <CardTitle className="text-lg">{strategy.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">
                    {strategy.description}
                  </p>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Expected Hit Rate:</span>
                      <span>{(strategy.performance.expectedHitRate * 100).toFixed(0)}%</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Memory Usage:</span>
                      <Badge variant="outline">{strategy.performance.memoryUsage}</Badge>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Latency:</span>
                      <Badge variant="outline">{strategy.performance.latency}</Badge>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-4">
                    <strong>Use Case:</strong> {strategy.useCase}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="services" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Service Health</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {health?.services && Object.entries(health.services).map(([service, data]) => (
                  <div key={service} className="flex items-center justify-between p-3 border rounded">
                    <div className="flex items-center gap-3">
                      {getHealthIcon(data.status)}
                      <span className="font-medium">{service}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={getHealthColor(data.status)}>
                        {data.status}
                      </Badge>
                      {data.error && (
                        <span className="text-xs text-red-600">{data.error}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
