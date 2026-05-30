/**
 * VendorRiskDashboard Component
 *
 * Displays comprehensive vendor risk monitoring dashboard with 7 key metrics:
 * 1. Overall Vendor Cyber Risk Score
 * 2. Breach/Incident Watch Status
 * 3. Compliance-to-Policy Status
 * 4. External Attack Surface Trend
 * 5. Evidence Freshness
 * 6. Open Findings
 * 7. Required Actions
 *
 * Also shows signal breakdown by category and recent signals list.
 */

import React, { useState, useEffect } from 'react';
import MetricCard from './MetricCard';
import SignalBreakdown from './SignalBreakdown';
import SignalsList from './SignalsList';

const VendorRiskDashboard = ({ vendorId, vendorName, organizationId, authToken }) => {
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    if (!vendorId || !organizationId) return;

    const fetchDashboard = async () => {
      try {
        setLoading(true);
        setError(null);

        const apiUrl = import.meta.env?.VITE_API_URL || 'https://cyberrx-api.onrender.com';
        const response = await fetch(
          `${apiUrl}/api/vendor-monitoring/vendors/${vendorId}/dashboard`,
          {
            headers: {
              'Authorization': `Bearer ${authToken}`,
              'X-Org-Id': organizationId
            }
          }
        );

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        setDashboard(data.success ? data.data : null);
      } catch (err) {
        console.error('Failed to load vendor dashboard:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
  }, [vendorId, vendorName, organizationId, authToken]);

  // Action handlers
  const runAssessment = async () => {
    if (!vendorId || !organizationId) return;
    setSyncing(true);
    try {
      const apiUrl = import.meta.env?.VITE_API_URL || 'https://cyberrx-api.onrender.com';
      await fetch(
        `${apiUrl}/api/vendor-monitoring/vendors/${vendorId}/assessment`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'X-Org-Id': organizationId,
            'Content-Type': 'application/json'
          }
        }
      );
      // Refresh dashboard after assessment
      // Refetch would happen here
    } catch (err) {
      console.error('Assessment failed:', err);
    } finally {
      setSyncing(false);
    }
  };

  const requestEvidence = async () => {
    if (!vendorId || !organizationId) return;
    try {
      const apiUrl = import.meta.env?.VITE_API_URL || 'https://cyberrx-api.onrender.com';
      await fetch(
        `${apiUrl}/api/vendor-monitoring/vendors/${vendorId}/evidence-request`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'X-Org-Id': organizationId,
            'Content-Type': 'application/json'
          }
        }
      );
      alert('Evidence refresh request sent to vendor');
    } catch (err) {
      console.error('Evidence request failed:', err);
    }
  };

  const createReassessmentTask = async () => {
    if (!vendorId || !organizationId) return;
    const reason = prompt('Reason for reassessment:');
    if (!reason) return;

    try {
      const apiUrl = import.meta.env?.VITE_API_URL || 'https://cyberrx-api.onrender.com';
      await fetch(
        `${apiUrl}/api/vendor-monitoring/vendors/${vendorId}/reassessment`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'X-Org-Id': organizationId,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ reason })
        }
      );
      alert('Reassessment task created');
    } catch (err) {
      console.error('Task creation failed:', err);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div style={{
        padding: '2rem',
        textAlign: 'center',
        color: '#6B7280'
      }}>
        Loading vendor risk dashboard...
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div style={{
        padding: '2rem',
        textAlign: 'center',
        color: '#EF4545'
      }}>
        <div style={{ marginBottom: 8 }}>Error loading dashboard:</div>
        <div style={{ fontSize: 12, color: '#6B7280' }}>{error}</div>
      </div>
    );
  }

  // No data state
  if (!dashboard) {
    return (
      <div style={{
        padding: '2rem',
        textAlign: 'center',
        color: '#6B7280'
      }}>
        No monitoring data available for this vendor
      </div>
    );
  }

  // Prepare metrics for display
  const metrics = [
    {
      label: 'Overall Vendor Cyber Risk Score',
      value: dashboard.overallRiskScore,
      format: 'score',
      color: dashboard.overallRiskScore >= 70 ? '#EF4545' :
             dashboard.overallRiskScore >= 40 ? '#F5A623' : '#0FBB80',
      description: `Composite score from ${dashboard.connectedSources} monitoring sources`
    },
    {
      label: 'Breach/Incident Watch Status',
      value: dashboard.breachStatus === 'critical' ? '⚠️ Critical' :
             dashboard.breachStatus === 'warning' ? '⚠️ Warning' : '✓ Clear',
      format: 'status',
      status: dashboard.breachStatus,
      description: dashboard.activeBreaches > 0 ?
        `${dashboard.activeBreaches} active breaches, ${dashboard.recentIncidents} recent incidents` :
        dashboard.recentIncidents > 0 ?
        `${dashboard.recentIncidents} recent incidents` :
        'No breach activity detected'
    },
    {
      label: 'Compliance-to-Policy Status',
      value: `${dashboard.complianceScore}%`,
      format: 'percentage',
      color: dashboard.complianceScore >= 80 ? '#0FBB80' : '#F5A623',
      description: 'Compliance evidence alignment with internal policies'
    },
    {
      label: 'External Attack Surface Trend',
      value: dashboard.attackSurfaceTrend,
      format: 'trend',
      trend: dashboard.attackSurfaceDirection
    },
    {
      label: 'Evidence Freshness',
      value: dashboard.evidenceFreshness,
      format: 'days',
      threshold: 90
    },
    {
      label: 'Open Findings',
      value: dashboard.openFindings,
      format: 'count',
      severity: dashboard.criticalFindings > 0 ? 'critical' : 'normal',
      subtitle: dashboard.criticalFindings > 0 ?
        `${dashboard.criticalFindings} critical` :
        undefined
    },
    {
      label: 'Required Actions',
      value: dashboard.requiredActions,
      format: 'count',
      description: 'Active critical/high signals requiring attention'
    }
  ];

  return (
    <div style={{ padding: '1rem' }}>
      {/* Header with vendor name and action buttons */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
        flexWrap: 'wrap',
        gap: 12
      }}>
        <div>
          <div style={{
            fontSize: 16,
            fontWeight: 700,
            color: '#111827',
            marginBottom: 4
          }}>
            {vendorName || dashboard.vendorName} - Vendor Risk Dashboard
          </div>
          <div style={{
            fontSize: 11,
            color: '#6B7280'
          }}>
            Continuous monitoring from {dashboard.connectedSources} sources •
            {dashboard.activeSignals} active signals
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button
            onClick={runAssessment}
            disabled={syncing}
            style={{
              padding: '6px 12px',
              backgroundColor: syncing ? '#F5A623' : '#2563EB',
              border: 'none',
              color: '#FFFFFF',
              borderRadius: 6,
              cursor: syncing ? 'not-allowed' : 'pointer',
              fontSize: 10,
              fontWeight: 600,
              opacity: syncing ? 0.7 : 1
            }}
          >
            {syncing ? 'Running Assessment...' : 'Run Continuous Assessment'}
          </button>
          <button
            onClick={requestEvidence}
            style={{
              padding: '6px 12px',
              backgroundColor: '#3B9EFF',
              border: 'none',
              color: '#FFFFFF',
              borderRadius: 6,
              cursor: 'pointer',
              fontSize: 10,
              fontWeight: 600
            }}
          >
            Request Updated Evidence
          </button>
          <button
            onClick={createReassessmentTask}
            style={{
              padding: '6px 12px',
              backgroundColor: 'transparent',
              border: '1px solid #D1D5DB',
              color: '#6B7280',
              borderRadius: 6,
              cursor: 'pointer',
              fontSize: 10
            }}
          >
            Create Reassessment Task
          </button>
        </div>
      </div>

      {/* Metrics grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: 12,
        marginBottom: 16
      }}>
        {metrics.map((metric, idx) => (
          <MetricCard key={idx} metric={metric} />
        ))}
      </div>

      {/* Risk score breakdown */}
      {dashboard.riskScoreBreakdown && (
        <div style={{
          marginBottom: 16,
          padding: 12,
          backgroundColor: '#F9FAFB',
          borderRadius: 8,
          border: '1px solid #E5E7EB'
        }}>
          <div style={{
            fontSize: 12,
            fontWeight: 700,
            color: '#111827',
            marginBottom: 8
          }}>
            Risk Score Breakdown
          </div>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
            gap: 8,
            fontSize: 10
          }}>
            <div>
              <span style={{ color: '#6B7280' }}>External Posture (20%):</span>{' '}
              <span style={{ fontWeight: 600, color: '#374151' }}>
                {dashboard.riskScoreBreakdown.externalPosture}
              </span>
            </div>
            <div>
              <span style={{ color: '#6B7280' }}>Breach Intel (25%):</span>{' '}
              <span style={{ fontWeight: 600, color: '#374151' }}>
                {dashboard.riskScoreBreakdown.breachIntel}
              </span>
            </div>
            <div>
              <span style={{ color: '#6B7280' }}>Compliance (20%):</span>{' '}
              <span style={{ fontWeight: 600, color: '#374151' }}>
                {dashboard.riskScoreBreakdown.compliance}
              </span>
            </div>
            <div>
              <span style={{ color: '#6B7280' }}>Questionnaire (10%):</span>{' '}
              <span style={{ fontWeight: 600, color: '#374151' }}>
                {dashboard.riskScoreBreakdown.questionnaire}
              </span>
            </div>
            <div>
              <span style={{ color: '#6B7280' }}>Business Criticality (15%):</span>{' '}
              <span style={{ fontWeight: 600, color: '#374151' }}>
                {dashboard.riskScoreBreakdown.businessCriticality}
              </span>
            </div>
            <div>
              <span style={{ color: '#6B7280' }}>Data Sensitivity (10%):</span>{' '}
              <span style={{ fontWeight: 600, color: '#374151' }}>
                {dashboard.riskScoreBreakdown.dataSensitivity}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Signals breakdown by category */}
      <div style={{ marginBottom: 16 }}>
        <h3 style={{
          fontSize: 12,
          fontWeight: 700,
          color: '#111827',
          marginBottom: 8
        }}>
          Signal Breakdown by Category
        </h3>
        <SignalBreakdown signalsByCategory={dashboard.signalsByCategory} />
      </div>

      {/* Recent signals */}
      <div>
        <h3 style={{
          fontSize: 12,
          fontWeight: 700,
          color: '#111827',
          marginBottom: 8
        }}>
          Recent Risk Signals
        </h3>
        <SignalsList signals={dashboard.recentSignals} />
      </div>
    </div>
  );
};

export default VendorRiskDashboard;
