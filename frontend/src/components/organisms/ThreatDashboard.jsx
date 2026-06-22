/**
 * ThreatDashboard Component
 *
 * Executive-level dashboard showing threat landscape across the organization.
 * Displays threat distribution, probability, impact, and control effectiveness.
 *
 * @param {Object} props
 * @param {string} props.organizationId - Organization ID
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import DashboardShell from './DashboardShell';
import Badge from '../atoms/Badge';
import StatusIcon from '../atoms/StatusIcon';

const ThreatDashboard = ({ organizationId }) => {
  const { api } = useAuth();
  const [loading, setLoading] = useState(true);
  const [dashboard, setDashboard] = useState(null);
  const [topThreats, setTopThreats] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadThreatDashboard();
  }, [organizationId]);

  const loadThreatDashboard = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load threat dashboard
      const dashboardRes = await api.get('/api/threat-scenarios/dashboard');
      setDashboard(dashboardRes.data.data);

      // Load top threats
      const topThreatsRes = await api.get('/api/threat-scenarios/top?limit=5');
      setTopThreats(topThreatsRes.data.data);
    } catch (err) {
      console.error('Failed to load threat dashboard:', err);
      setError('Failed to load threat dashboard');
    } finally {
      setLoading(false);
    }
  };

  const getThreatTypeColor = (type) => {
    const colors = {
      'ransomware': '#EF4545',
      'phishing': '#F5A623',
      'insider': '#64748B',
      'supply_chain': '#EC4899',
      'misconfig': '#0EA5E9',
      'ddos': '#243044',
      'api_abuse': '#F59E0B',
      'zero_day': '#DC2626'
    };
    return colors[type] || '#6B7280';
  };

  const getImpactColor = (impact) => {
    const colors = {
      'Critical': '#EF4545',
      'High': '#F5A623',
      'Medium': '#FFC107',
      'Low': '#0FBB80'
    };
    return colors[impact] || '#6B7280';
  };

  const getRiskLevelColor = (riskLevel) => {
    if (riskLevel >= 80) return '#EF4545';
    if (riskLevel >= 60) return '#F5A623';
    if (riskLevel >= 40) return '#FFC107';
    return '#0FBB80';
  };

  if (loading) {
    return (
      <DashboardShell title="Threat Landscape Dashboard">
        <div style={{ padding: '32px', textAlign: 'center' }}>
          <StatusIcon status="loading" />
          <p style={{ marginTop: '16px', color: '#6B7280' }}>Loading threat dashboard...</p>
        </div>
      </DashboardShell>
    );
  }

  if (error) {
    return (
      <DashboardShell title="Threat Landscape Dashboard">
        <div style={{ padding: '32px', textAlign: 'center', color: '#EF4545' }}>
          {error}
        </div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell title="Threat Landscape Dashboard">
      <div style={{ padding: '24px' }}>
        {/* Summary Metrics */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '32px' }}>
          {/* Total Threat Scenarios */}
          <div style={{ background: 'white', padding: '20px', borderRadius: '8px', border: '1px solid #E5E7EB' }}>
            <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '8px', textTransform: 'uppercase', fontWeight: '600' }}>
              Total Threat Scenarios
            </div>
            <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#1F2937' }}>
              {dashboard?.total || 0}
            </div>
          </div>

          {/* High Probability Threats */}
          <div style={{ background: 'white', padding: '20px', borderRadius: '8px', border: '1px solid #E5E7EB' }}>
            <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '8px', textTransform: 'uppercase', fontWeight: '600' }}>
              High Probability (≥70%)
            </div>
            <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#EF4545' }}>
              {dashboard?.highProbabilityCount || 0}
            </div>
          </div>

          {/* Critical Impact Threats */}
          <div style={{ background: 'white', padding: '20px', borderRadius: '8px', border: '1px solid #E5E7EB' }}>
            <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '8px', textTransform: 'uppercase', fontWeight: '600' }}>
              Critical Impact
            </div>
            <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#EF4545' }}>
              {dashboard?.criticalImpactCount || 0}
            </div>
          </div>

          {/* Control Effectiveness */}
          <div style={{ background: 'white', padding: '20px', borderRadius: '8px', border: '1px solid #E5E7EB' }}>
            <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '8px', textTransform: 'uppercase', fontWeight: '600' }}>
              Control Effectiveness
            </div>
            <div style={{ fontSize: '32px', fontWeight: 'bold', color: dashboard?.controlEffectiveness >= 70 ? '#0FBB80' : '#F5A623' }}>
              {dashboard?.controlEffectiveness || 0}%
            </div>
          </div>
        </div>

        {/* Threat Type Distribution */}
        <div style={{ marginBottom: '32px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>Threat Type Distribution</h3>
          <div style={{ background: 'white', borderRadius: '8px', border: '1px solid #E5E7EB', overflow: 'hidden' }}>
            {Object.entries(dashboard?.byType || {}).map(([type, count]) => (
              <div key={type} style={{ display: 'flex', alignItems: 'center', padding: '16px', borderBottom: '1px solid #E5E7EB' }}>
                <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: getThreatTypeColor(type), marginRight: '12px' }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: '500', color: '#1F2937', textTransform: 'capitalize' }}>{type.replace('_', ' ')}</div>
                </div>
                <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#1F2937' }}>{count}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Risk Distribution */}
        <div style={{ marginBottom: '32px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>Risk Distribution</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
            {[
              { level: 'critical', label: 'Critical', color: '#EF4545' },
              { level: 'high', label: 'High', color: '#F5A623' },
              { level: 'medium', label: 'Medium', color: '#FFC107' },
              { level: 'low', label: 'Low', color: '#0FBB80' }
            ].map(({ level, label, color }) => (
              <div key={level} style={{ background: 'white', padding: '20px', borderRadius: '8px', border: '1px solid #E5E7EB', textAlign: 'center' }}>
                <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '8px', textTransform: 'uppercase', fontWeight: '600' }}>
                  {label} Risk
                </div>
                <div style={{ fontSize: '32px', fontWeight: 'bold', color }}>
                  {dashboard?.riskDistribution?.[level] || 0}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top 5 Threats */}
        <div>
          <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>Top 5 Threats by Risk Score</h3>
          {topThreats.length === 0 ? (
            <div style={{ background: 'white', borderRadius: '8px', border: '1px solid #E5E7EB', padding: '32px', textAlign: 'center', color: '#6B7280' }}>
              No threat scenarios found
            </div>
          ) : (
            <div style={{ background: 'white', borderRadius: '8px', border: '1px solid #E5E7EB', overflow: 'hidden' }}>
              {topThreats.map((threat, index) => (
                <div key={threat.id} style={{ padding: '16px', borderBottom: '1px solid #E5E7EB' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', marginBottom: '8px' }}>
                    <div style={{ width: '24px', height: '24px', borderRadius: '50%', backgroundColor: '#1F2937', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 'bold', marginRight: '12px', flexShrink: 0 }}>
                      {index + 1}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: '600', color: '#1F2937', marginBottom: '4px' }}>{threat.name}</div>
                      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '4px' }}>
                        <Badge
                          text={threat.type.replace('_', ' ')}
                          backgroundColor={getThreatTypeColor(threat.type)}
                          style={{ marginRight: '8px' }}
                        />
                        <Badge
                          text={threat.impactLevel}
                          backgroundColor={getImpactColor(threat.impactLevel)}
                          style={{ marginRight: '8px' }}
                        />
                      </div>
                      <div style={{ fontSize: '14px', color: '#6B7280', marginBottom: '8px' }}>
                        {threat.description}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <div style={{ fontSize: '14px', color: '#6B7280' }}>
                          <strong>Probability:</strong> {threat.probability}%
                        </div>
                        <div style={{ fontSize: '14px', color: '#6B7280' }}>
                          <strong>Risk Score:</strong>{' '}
                          <span style={{ color: getRiskLevelColor(threat.calculatedRiskScore), fontWeight: 'bold' }}>
                            {Math.round(threat.calculatedRiskScore || 0)}
                          </span>
                        </div>
                        {threat.residualRisk !== undefined && (
                          <div style={{ fontSize: '14px', color: '#6B7280' }}>
                            <strong>Residual Risk:</strong> {Math.round(threat.residualRisk)}%
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardShell>
  );
};

export default ThreatDashboard;
