/**
 * SecurityPostureSummary Component
 *
 * Displays overall security posture assessment with A-F grading,
 * top risks, threat summary, and action plan overview.
 */

import React from 'react';
import { Shield, AlertTriangle, TrendingUp, CheckCircle, Clock } from 'lucide-react';

const SecurityPostureSummary = ({ briefing, threats, actionPlans }) => {
  if (!briefing) {
    return (
      <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
        <Shield size={48} style={{ marginBottom: '16px' }} />
        <p>No security briefing data available</p>
      </div>
    );
  }

  const grade = briefing.posture_grade || 'N/A';
  const gradeColor = getGradeColor(grade);
  const topRisks = briefing.top_risks || [];
  const postureTrend = briefing.posture_trend || 'stable';

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

  const getTrendIcon = (trend) => {
    switch (trend) {
      case 'improving': return <TrendingUp size={16} style={{ color: '#22c55e' }} />;
      case 'declining': return <TrendingUp size={16} style={{ color: '#ef4444', transform: 'rotate(180deg)' }} />;
      default: return <TrendingUp size={16} style={{ color: '#6b7280' }} />;
    }
  };

  const activeThreats = threats?.filter(t => t.status === 'active').length || 0;
  const criticalActions = actionPlans?.filter(a => a.priority === 'critical' && a.status === 'open').length || 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Posture Grade Card */}
      <div
        style={{
          background: 'linear-gradient(135deg, #f9fafb 0%, #ffffff 100%)',
          border: '1px solid #e5e7eb',
          borderRadius: '12px',
          padding: '32px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
            <Shield size={32} style={{ color: gradeColor }} />
            <h3 style={{ fontSize: '24px', fontWeight: '600', margin: 0 }}>Security Posture Grade</h3>
          </div>
          <p style={{ fontSize: '14px', color: '#6b7280', margin: 0 }}>
            Overall security health assessment based on risk analysis
          </p>
        </div>

        <div style={{ textAlign: 'center' }}>
          <div
            style={{
              fontSize: '72px',
              fontWeight: 'bold',
              color: gradeColor,
              lineHeight: 1,
              marginBottom: '8px'
            }}
          >
            {grade}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
            {getTrendIcon(postureTrend)}
            <span style={{ fontSize: '14px', color: '#6b7280', textTransform: 'capitalize' }}>
              {postureTrend}
            </span>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
        <div
          style={{
            backgroundColor: '#fef3c7',
            border: '1px solid #fbbf24',
            borderRadius: '8px',
            padding: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}
        >
          <AlertTriangle size={24} style={{ color: '#f59e0b' }} />
          <div>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#92400e' }}>
              {topRisks.length}
            </div>
            <div style={{ fontSize: '13px', color: '#b45309' }}>Top Risks</div>
          </div>
        </div>

        <div
          style={{
            backgroundColor: '#fee2e2',
            border: '1px solid #f87171',
            borderRadius: '8px',
            padding: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}
        >
          <Shield size={24} style={{ color: '#ef4444' }} />
          <div>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#991b1b' }}>
              {activeThreats}
            </div>
            <div style={{ fontSize: '13px', color: '#dc2626' }}>Active Threats</div>
          </div>
        </div>

        <div
          style={{
            backgroundColor: '#fef2f2',
            border: '1px solid #f87171',
            borderRadius: '8px',
            padding: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}
        >
          <Clock size={24} style={{ color: '#ef4444' }} />
          <div>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#991b1b' }}>
              {criticalActions}
            </div>
            <div style={{ fontSize: '13px', color: '#dc2626' }}>Critical Actions</div>
          </div>
        </div>

        <div
          style={{
            backgroundColor: '#d1fae5',
            border: '1px solid #34d399',
            borderRadius: '8px',
            padding: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}
        >
          <CheckCircle size={24} style={{ color: '#22c55e' }} />
          <div>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#065f46' }}>
              {actionPlans?.filter(a => a.status === 'completed').length || 0}
            </div>
            <div style={{ fontSize: '13px', color: '#059669' }}>Actions Completed</div>
          </div>
        </div>
      </div>

      {/* Top Risks Table */}
      <div
        style={{
          backgroundColor: 'white',
          border: '1px solid #e5e7eb',
          borderRadius: '8px',
          padding: '24px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}
      >
        <h4 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <AlertTriangle size={20} style={{ color: '#f59e0b' }} />
          Top Security Risks
        </h4>

        {topRisks.length === 0 ? (
          <p style={{ color: '#6b7280', fontSize: '14px' }}>No critical risks identified</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
                  <th style={{ padding: '12px', textAlign: 'left', fontSize: '13px', fontWeight: '600', color: '#374151' }}>Risk</th>
                  <th style={{ padding: '12px', textAlign: 'center', fontSize: '13px', fontWeight: '600', color: '#374151' }}>Severity</th>
                  <th style={{ padding: '12px', textAlign: 'center', fontSize: '13px', fontWeight: '600', color: '#374151' }}>Likelihood</th>
                  <th style={{ padding: '12px', textAlign: 'right', fontSize: '13px', fontWeight: '600', color: '#374151' }}>Impact</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontSize: '13px', fontWeight: '600', color: '#374151' }}>Category</th>
                </tr>
              </thead>
              <tbody>
                {topRisks.map((risk, index) => (
                  <tr key={index} style={{ borderBottom: '1px solid #f3f4f6' }}>
                    <td style={{ padding: '12px', fontSize: '14px', color: '#1f2937' }}>
                      {risk.name || risk.risk_name || 'Unnamed Risk'}
                    </td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>
                      <span
                        style={{
                          padding: '4px 12px',
                          borderRadius: '12px',
                          fontSize: '12px',
                          fontWeight: '600',
                          backgroundColor: getSeverityColor(risk.severity || 'medium').bg,
                          color: getSeverityColor(risk.severity || 'medium').text
                        }}
                      >
                        {(risk.severity || 'medium').toUpperCase()}
                      </span>
                    </td>
                    <td style={{ padding: '12px', textAlign: 'center', fontSize: '14px', color: '#6b7280' }}>
                      {risk.likelihood || 'N/A'}
                    </td>
                    <td style={{ padding: '12px', textAlign: 'right', fontSize: '14px', color: '#6b7280', fontWeight: '600' }}>
                      ${formatNumber(risk.financial_impact || 0)}
                    </td>
                    <td style={{ padding: '12px', fontSize: '14px', color: '#6b7280' }}>
                      {risk.category || 'General'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Posture Details */}
      {briefing.posture_details && (
        <div
          style={{
            backgroundColor: 'white',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            padding: '24px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
          }}
        >
          <h4 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>Assessment Details</h4>
          <div style={{ fontSize: '14px', lineHeight: '1.6', color: '#374151' }}>
            {briefing.posture_details}
          </div>
        </div>
      )}
    </div>
  );
};

const getSeverityColor = (severity) => {
  const colors = {
    'critical': { bg: '#fef2f2', text: '#991b1b' },
    'high': { bg: '#fee2e2', text: '#dc2626' },
    'medium': { bg: '#fef3c7', text: '#92400e' },
    'low': { bg: '#d1fae5', text: '#065f46' }
  };
  return colors[severity.toLowerCase()] || colors['medium'];
};

const formatNumber = (num) => {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toFixed(0);
};

export default SecurityPostureSummary;
