/**
 * CISO Dashboard Component
 * Task: T-MVP-012
 *
 * Chief Information Security Officer Dashboard providing:
 * - Security posture summary (A-F grading)
 * - Attack pathway visualizations
 * - Blast radius analysis
 * - Risk object explorer
 * - Threat intelligence feed
 * - Unified action plans
 * - Cross-agent coordination view
 *
 * Features:
 * - Real-time threat feed updates
 * - Interactive graph visualizations
 * - Searchable risk objects
 * - Cross-functional coordination matrix
 * - Security trend analysis
 */

import React, { useState, useEffect } from 'react';
import DashboardPage from '../components/templates/DashboardPage';
import MetricCard from '../components/MetricCard';
import SecurityPostureSummary from './organisms/SecurityPostureSummary';
import AttackPathwayVisualization from './organisms/AttackPathwayVisualization';
import BlastRadiusDiagram from './organisms/BlastRadiusDiagram';
import RiskObjectExplorer from './organisms/RiskObjectExplorer';
import ThreatIntelligenceFeed from './organisms/ThreatIntelligenceFeed';
import CoordinationView from './organisms/CoordinationView';
import { Shield, AlertTriangle, Target, Network, TrendingUp, Users } from 'lucide-react';

const CISODashboard = (props) => {
  const { goBack, authToken, orgId, api_url } = props;

  const [loading, setLoading] = useState(true);
  const [securityBriefing, setSecurityBriefing] = useState(null);
  const [threats, setThreats] = useState([]);
  const [blastRadius, setBlastRadius] = useState(null);
  const [actionPlans, setActionPlans] = useState([]);
  const [selectedTab, setSelectedTab] = useState('overview');
  const [error, setError] = useState(null);

  const token = authToken || localStorage.getItem('authToken');
  const organizationId = orgId || localStorage.getItem('orgId');
  const apiUrl = api_url || import.meta.env?.VITE_API_URL || 'https://cyberrx-api.onrender.com';
  const cisoApiUrl = import.meta.env?.VITE_CISO_API_URL || 'http://localhost:8002/api/ciso';

  // Fetch security briefing on mount
  useEffect(() => {
    fetchSecurityBriefing();
    fetchThreats();
    fetchBlastRadius();
    fetchActionPlans();
  }, []);

  // Auto-refresh threats every 5 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      fetchThreats();
    }, 5 * 60 * 1000); // 5 minutes
    return () => clearInterval(interval);
  }, []);

  const fetchSecurityBriefing = async () => {
    try {
      setError(null);
      const response = await fetch(`${cisoApiUrl}/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'X-Org-Id': organizationId
        },
        body: JSON.stringify({
          org_id: organizationId,
          include_threats: true,
          include_financials: true
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      setSecurityBriefing(data);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching security briefing:', err);
      setError(err.message);
      setLoading(false);
    }
  };

  const fetchThreats = async () => {
    try {
      const response = await fetch(`${cisoApiUrl}/threats?org_id=${organizationId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-Org-Id': organizationId
        }
      });

      if (response.ok) {
        const data = await response.json();
        setThreats(data.threats || data || []);
      }
    } catch (err) {
      console.error('Error fetching threats:', err);
    }
  };

  const fetchBlastRadius = async () => {
    try {
      const response = await fetch(`${cisoApiUrl}/blast-radius?org_id=${organizationId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-Org-Id': organizationId
        }
      });

      if (response.ok) {
        const data = await response.json();
        setBlastRadius(data);
      }
    } catch (err) {
      console.error('Error fetching blast radius:', err);
    }
  };

  const fetchActionPlans = async () => {
    try {
      const response = await fetch(`${cisoApiUrl}/action-plans?org_id=${organizationId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-Org-Id': organizationId
        }
      });

      if (response.ok) {
        const data = await response.json();
        setActionPlans(data.action_plans || data || []);
      }
    } catch (err) {
      console.error('Error fetching action plans:', err);
    }
  };

  const handleRefresh = () => {
    setLoading(true);
    fetchSecurityBriefing();
    fetchThreats();
    fetchBlastRadius();
    fetchActionPlans();
  };

  // Calculate metrics from security briefing
  const getMetrics = () => {
    if (!securityBriefing) return [];

    const postureGrade = securityBriefing.posture_grade || 'N/A';
    const criticalRisks = securityBriefing.critical_risk_count || 0;
    const activeThreats = threats.filter(t => t.status === 'active').length || 0;
    const openActions = actionPlans.filter(a => a.status === 'open').length || 0;

    return [
      {
        title: 'Security Posture',
        value: postureGrade,
        icon: <Shield size={20} />,
        trend: securityBriefing.posture_trend || 'stable',
        trendValue: securityBriefing.posture_change || 0,
        color: getGradeColor(postureGrade)
      },
      {
        title: 'Critical Risks',
        value: criticalRisks.toString(),
        icon: <AlertTriangle size={20} />,
        trend: 'down',
        trendValue: securityBriefing.critical_risk_change || 0,
        color: criticalRisks > 0 ? '#ef4444' : '#22c55e'
      },
      {
        title: 'Active Threats',
        value: activeThreats.toString(),
        icon: <Target size={20} />,
        trend: 'stable',
        trendValue: 0,
        color: activeThreats > 0 ? '#f59e0b' : '#22c55e'
      },
      {
        title: 'Open Actions',
        value: openActions.toString(),
        icon: <Users size={20} />,
        trend: 'down',
        trendValue: securityBriefing.actions_closed_this_week || 0,
        color: openActions > 10 ? '#f59e0b' : '#22c55e'
      }
    ];
  };

  const getGradeColor = (grade) => {
    const colors = {
      'A': '#22c55e',
      'B': '#84cc16',
      'C': '#f59e0b',
      'D': '#f97316',
      'F': '#ef4444',
      'N/A': '#6b7280'
    };
    return colors[grade] || '#6b7280';
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: <Shield size={16} /> },
    { id: 'attack-paths', label: 'Attack Pathways', icon: <Network size={16} /> },
    { id: 'blast-radius', label: 'Blast Radius', icon: <TrendingUp size={16} /> },
    { id: 'risks', label: 'Risk Objects', icon: <Target size={16} /> },
    { id: 'threats', label: 'Threat Intel', icon: <AlertTriangle size={16} /> },
    { id: 'coordination', label: 'Coordination', icon: <Users size={16} /> }
  ];

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <div style={{ fontSize: '18px', color: '#6b7280' }}>Loading CISO Dashboard...</div>
      </div>
    );
  }

  if (error && !securityBriefing) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <div style={{ fontSize: '18px', color: '#ef4444', marginBottom: '16px' }}>
          Error loading CISO Dashboard
        </div>
        <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '24px' }}>
          {error}
        </div>
        <button
          onClick={handleRefresh}
          style={{
            padding: '10px 20px',
            backgroundColor: '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer'
          }}
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <DashboardPage
      title="CISO Dashboard"
      subtitle="Security Posture & Threat Management"
      icon="🛡️"
      metrics={getMetrics()}
      actions={
        <button
          onClick={handleRefresh}
          style={{
            padding: '8px 16px',
            backgroundColor: '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '14px'
          }}
        >
          Refresh
        </button>
      }
    >
      {/* Tab Navigation */}
      <div style={{ marginBottom: '24px' }}>
        <div
          style={{
            display: 'flex',
            gap: '8px',
            borderBottom: '1px solid #e5e7eb',
            paddingBottom: '0'
          }}
        >
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setSelectedTab(tab.id)}
              style={{
                padding: '12px 20px',
                backgroundColor: selectedTab === tab.id ? '#3b82f6' : 'transparent',
                color: selectedTab === tab.id ? 'white' : '#6b7280',
                border: 'none',
                borderRadius: '6px 6px 0 0',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: selectedTab === tab.id ? '600' : '400',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 0.2s'
              }}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div style={{ minHeight: '500px' }}>
        {selectedTab === 'overview' && (
          <SecurityPostureSummary
            briefing={securityBriefing}
            threats={threats}
            actionPlans={actionPlans}
          />
        )}

        {selectedTab === 'attack-paths' && (
          <AttackPathwayVisualization
            briefing={securityBriefing}
            apiEndpoint={cisoApiUrl}
            token={token}
            orgId={organizationId}
          />
        )}

        {selectedTab === 'blast-radius' && (
          <BlastRadiusDiagram
            blastRadius={blastRadius}
            briefing={securityBriefing}
            apiEndpoint={cisoApiUrl}
            token={token}
            orgId={organizationId}
          />
        )}

        {selectedTab === 'risks' && (
          <RiskObjectExplorer
            briefing={securityBriefing}
            apiEndpoint={cisoApiUrl}
            token={token}
            orgId={organizationId}
          />
        )}

        {selectedTab === 'threats' && (
          <ThreatIntelligenceFeed
            threats={threats}
            onRefresh={fetchThreats}
          />
        )}

        {selectedTab === 'coordination' && (
          <CoordinationView
            actionPlans={actionPlans}
            briefing={securityBriefing}
            onRefresh={fetchActionPlans}
          />
        )}
      </div>
    </DashboardPage>
  );
};

export default CISODashboard;
