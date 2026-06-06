import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LineChart, Line, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Shield, AlertTriangle, Activity, Users, Settings, Database, Clock, AlertCircle } from 'lucide-react';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

/**
 * SecurityMonitoringDashboard Component
 *
 * Real-time security monitoring dashboard for SOC 2 compliance
 * Displays security metrics, alerts, and trends
 *
 * Features:
 * - Real-time metrics with 10-second refresh
 * - Time series charts for security events
 * - Failed login tracking by IP
 * - Top users by data access
 * - Recent configuration changes
 * - Security alerts with thresholds
 */
export default function SecurityMonitoringDashboard({ organizationId }) {
  const [metrics, setMetrics] = useState(null);
  const [timeSeriesData, setTimeSeriesData] = useState([]);
  const [topUsers, setTopUsers] = useState([]);
  const [recentChanges, setRecentChanges] = useState([]);
  const [failedLogins, setFailedLogins] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [timeRange, setTimeRange] = useState('24h');
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  // Fetch security metrics
  const fetchMetrics = async () => {
    try {
      const response = await fetch(`/api/security-dashboard/metrics?organization_id=${organizationId}&time_range=${timeRange}`);
      const data = await response.json();
      setMetrics(data.primary || data['24h']);
    } catch (error) {
      console.error('Error fetching metrics:', error);
    }
  };

  // Fetch time series data
  const fetchTimeSeries = async (eventType = 'auth_login_failure') => {
    try {
      const response = await fetch(`/api/security-dashboard/time-series?organization_id=${organizationId}&event_type=${eventType}&interval=1h&period=${timeRange}`);
      const data = await response.json();
      setTimeSeriesData(data.data);
    } catch (error) {
      console.error('Error fetching time series:', error);
    }
  };

  // Fetch top users
  const fetchTopUsers = async () => {
    try {
      const response = await fetch(`/api/security-dashboard/top-users?organization_id=${organizationId}&limit=10&period=${timeRange}`);
      const data = await response.json();
      setTopUsers(data.users);
    } catch (error) {
      console.error('Error fetching top users:', error);
    }
  };

  // Fetch recent changes
  const fetchRecentChanges = async () => {
    try {
      const response = await fetch(`/api/security-dashboard/recent-changes?organization_id=${organizationId}&limit=20`);
      const data = await response.json();
      setRecentChanges(data.changes);
    } catch (error) {
      console.error('Error fetching recent changes:', error);
    }
  };

  // Fetch failed logins
  const fetchFailedLogins = async () => {
    try {
      const response = await fetch(`/api/security-dashboard/failed-logins?organization_id=${organizationId}&period=${timeRange}&limit=10`);
      const data = await response.json();
      setFailedLogins(data.ips);
    } catch (error) {
      console.error('Error fetching failed logins:', error);
    }
  };

  // Fetch alerts
  const fetchAlerts = async () => {
    try {
      const response = await fetch(`/api/security-dashboard/alerts?organization_id=${organizationId}`);
      const data = await response.json();
      setAlerts(data.alerts);
    } catch (error) {
      console.error('Error fetching alerts:', error);
    }
  };

  // Fetch all data
  const fetchAllData = () => {
    setLoading(true);
    Promise.all([
      fetchMetrics(),
      fetchTimeSeries(),
      fetchTopUsers(),
      fetchRecentChanges(),
      fetchFailedLogins(),
      fetchAlerts()
    ]).finally(() => {
      setLoading(false);
      setLastRefresh(new Date());
    });
  };

  // Initial load and auto-refresh
  useEffect(() => {
    fetchAllData();
    const interval = setInterval(fetchAllData, 10000); // 10-second refresh
    return () => clearInterval(interval);
  }, [organizationId, timeRange]);

  // Format number with K/M suffix
  const formatNumber = (num) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toLocaleString();
  };

  // Get severity color
  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'critical': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-blue-500';
      default: return 'bg-gray-500';
    }
  };

  if (loading && !metrics) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Shield className="h-8 w-8 text-blue-500" />
          <h1 className="text-3xl font-bold">Security Monitoring Dashboard</h1>
        </div>
        <div className="flex items-center gap-4">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="24h">Last 24 Hours</SelectItem>
              <SelectItem value="7d">Last 7 Days</SelectItem>
              <SelectItem value="30d">Last 30 Days</SelectItem>
            </SelectContent>
          </Select>
          <Badge variant="outline" className="flex items-center gap-2">
            <Clock className="h-3 w-3" />
            Last refresh: {lastRefresh.toLocaleTimeString()}
          </Badge>
        </div>
      </div>

      {/* Security Alerts */}
      {alerts.length > 0 && (
        <div className="space-y-2">
          {alerts.map((alert, index) => (
            <Alert key={index} variant={alert.severity === 'critical' ? 'destructive' : 'default'}>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle className="flex items-center gap-2">
                {alert.type}
                <Badge className={getSeverityColor(alert.severity)}>{alert.severity}</Badge>
              </AlertTitle>
              <AlertDescription>{alert.message}</AlertDescription>
            </Alert>
          ))}
        </div>
      )}

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <MetricCard
          title="Failed Auth Attempts"
          value={metrics?.failedAuthAttempts || 0}
          icon={<AlertTriangle className="h-5 w-5 text-red-500" />}
          trend="neutral"
          description="Failed login attempts"
        />
        <MetricCard
          title="Failed Authorization"
          value={metrics?.failedAuthorizationAttempts || 0}
          icon={<Shield className="h-5 w-5 text-orange-500" />}
          trend="neutral"
          description="Access denied events"
        />
        <MetricCard
          title="Data Access Volume"
          value={formatNumber(metrics?.dataAccessVolume || 0)}
          icon={<Database className="h-5 w-5 text-blue-500" />}
          trend="neutral"
          description="Records accessed"
        />
        <MetricCard
          title="Agent Invocations"
          value={formatNumber(metrics?.agentInvocations || 0)}
          icon={<Activity className="h-5 w-5 text-green-500" />}
          trend="neutral"
          description="LLM agent calls"
        />
        <MetricCard
          title="Config Changes"
          value={metrics?.configChanges || 0}
          icon={<Settings className="h-5 w-5 text-purple-500" />}
          trend="neutral"
          description="System modifications"
        />
        <MetricCard
          title="Audit Log Growth"
          value={formatNumber(metrics?.auditLogGrowth || 0)}
          icon={<Database className="h-5 w-5 text-cyan-500" />}
          trend="neutral"
          description="New audit events"
        />
      </div>

      {/* Tabs for detailed views */}
      <Tabs defaultValue="trends" className="space-y-4">
        <TabsList>
          <TabsTrigger value="trends">Security Trends</TabsTrigger>
          <TabsTrigger value="users">Top Users</TabsTrigger>
          <TabsTrigger value="changes">Config Changes</TabsTrigger>
          <TabsTrigger value="logins">Failed Logins</TabsTrigger>
        </TabsList>

        <TabsContent value="trends" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Failed Authentication Attempts Over Time</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={timeSeriesData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="timestamp" tickFormatter={(v) => new Date(v).toLocaleTimeString()} />
                  <YAxis />
                  <Tooltip />
                  <Area type="monotone" dataKey="count" stroke="#8884d8" fill="#8884d8" fillOpacity={0.6} />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Top Users by Data Access
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {topUsers.map((user, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Badge>{index + 1}</Badge>
                      <span className="font-medium">{user.userId}</span>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold">{formatNumber(user.accessCount)}</div>
                      <div className="text-xs text-gray-500">
                        Last: {new Date(user.lastAccess).toLocaleString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="changes" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Recent Configuration Changes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recentChanges.map((change, index) => (
                  <div key={index} className="p-3 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">{change.configKey}</span>
                      <span className="text-xs text-gray-500">
                        {new Date(change.timestamp).toLocaleString()}
                      </span>
                    </div>
                    <div className="text-sm">
                      <span className="text-red-500 line-through">{change.oldValue || '(none)'}</span>
                      <span className="mx-2">→</span>
                      <span className="text-green-500">{change.newValue}</span>
                    </div>
                    <div className="text-xs text-gray-500 mt-1">User: {change.userId}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="logins" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Failed Login Attempts by IP
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {failedLogins.map((ip, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Badge variant={ip.attemptCount > 10 ? 'destructive' : 'default'}>
                        {index + 1}
                      </Badge>
                      <span className="font-mono text-sm">{ip.ipAddress}</span>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold">{ip.attemptCount}</div>
                      <div className="text-xs text-gray-500">
                        Last: {new Date(ip.lastAttempt).toLocaleString()}
                      </div>
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

/**
 * Metric Card Component
 */
function MetricCard({ title, value, icon, trend, description }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium text-gray-600">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <div className="text-3xl font-bold">{value}</div>
          {icon}
        </div>
        <p className="text-xs text-gray-500 mt-2">{description}</p>
      </CardContent>
    </Card>
  );
}
