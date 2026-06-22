/**
 * BusinessProcessDashboard Component
 *
 * Executive summary dashboard showing:
 * - Process health metrics (CMMI scores)
 * - Control coverage across processes
 * - Risk distribution by criticality
 * - Process count by tier
 * - Trend charts
 * - Top risk processes
 *
 * @param {Object} props
 * @param {Array} props.processes - Business processes to display
 * @param {Object} props.summary - Process summary statistics
 * @param {Function} props.onProcessClick - Click handler for process
 * @param {boolean} props.loading - Loading state
 */

import React, { useMemo } from 'react';
import { CMMIBadge, CMMIBar } from '../atoms/CMMIBadge';
import StatusIcon from '../atoms/StatusIcon';
import Badge from '../atoms/Badge';

const BusinessProcessDashboard = ({
  processes = [],
  summary = null,
  onProcessClick,
  loading = false
}) => {
  // Calculate summary if not provided
  const calculatedSummary = useMemo(() => {
    if (summary) return summary;

    const total = processes.length;
    const byTier = {
      Primary: processes.filter(p => p.tier === 'Primary').length,
      Strategic: processes.filter(p => p.tier === 'Strategic').length
    };
    const byCriticality = {
      Critical: processes.filter(p => p.criticality === 'Critical').length,
      High: processes.filter(p => p.criticality === 'High').length,
      Medium: processes.filter(p => p.criticality === 'Medium').length,
      Low: processes.filter(p => p.criticality === 'Low').length
    };

    const avgHealthScore = total > 0
      ? processes.reduce((sum, p) => sum + (p.healthScore || 0), 0) / total
      : 0;

    const avgControlCoverage = total > 0
      ? processes.reduce((sum, p) => sum + (p.controlCoverage || 0), 0) / total
      : 0;

    const processesNeedingAttention = processes.filter(p =>
      (p.healthScore || 0) < 60 || (p.controlGap || 0) > 2
    ).length;

    return {
      total,
      byTier,
      byCriticality,
      averageHealthScore: Math.round(avgHealthScore),
      averageControlCoverage: Math.round(avgControlCoverage),
      processesNeedingAttention
    };
  }, [processes, summary]);

  // Get top risk processes
  const topRiskProcesses = useMemo(() => {
    return [...processes]
      .sort((a, b) => (b.riskCount || 0) - (a.riskCount || 0))
      .slice(0, 5);
  }, [processes]);

  // Get lowest coverage processes
  const lowestCoverageProcesses = useMemo(() => {
    return [...processes]
      .filter(p => p.controlGap > 0)
      .sort((a, b) => b.controlGap - a.controlGap)
      .slice(0, 5);
  }, [processes]);

  // Get health score distribution
  const healthDistribution = useMemo(() => {
    const excellent = processes.filter(p => (p.healthScore || 0) >= 90).length;
    const good = processes.filter(p => (p.healthScore || 0) >= 75 && (p.healthScore || 0) < 90).length;
    const fair = processes.filter(p => (p.healthScore || 0) >= 60 && (p.healthScore || 0) < 75).length;
    const poor = processes.filter(p => (p.healthScore || 0) < 60).length;
    return { excellent, good, fair, poor };
  }, [processes]);

  const getCriticalityColor = (criticality) => {
    switch (criticality) {
      case 'Critical': return '#EF4545';
      case 'High': return '#F5A623';
      case 'Medium': return '#FFC107';
      case 'Low': return '#0FBB80';
      default: return '#6B7280';
    }
  };

  const getTierColor = (tier) => {
    return tier === 'Primary' ? '#1E40AF' : '#243044';
  };

  const StatCard = ({ title, value, subtitle, color = '#3B82F6', trend = null }) => (
    <div style={{
      padding: 16,
      backgroundColor: '#FFFFFF',
      borderRadius: 8,
      border: '1px solid #E5E7EB',
      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)'
    }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: '#6B7280', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
        {title}
      </div>
      <div style={{ fontSize: 32, fontWeight: 700, color: color, marginBottom: 4 }}>
        {value}
      </div>
      {subtitle && (
        <div style={{ fontSize: 12, color: '#6B7280' }}>
          {subtitle}
        </div>
      )}
      {trend && (
        <div style={{
          fontSize: 11,
          color: trend >= 0 ? '#059669' : '#DC2626',
          marginTop: 4,
          fontWeight: 600
        }}>
          {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}% from last month
        </div>
      )}
    </div>
  );

  if (loading) {
    return (
      <div style={{ padding: '32px', textAlign: 'center', color: '#6B7280' }}>
        Loading dashboard...
      </div>
    );
  }

  if (processes.length === 0) {
    return (
      <div style={{ padding: '48px 32px', textAlign: 'center', backgroundColor: '#FFFFFF', borderRadius: 8, border: '1px solid #E5E7EB' }}>
        <div style={{ fontSize: '64px', marginBottom: '16px' }}>📊</div>
        <div style={{ fontSize: 20, fontWeight: 700, color: '#111827', marginBottom: 8 }}>
          No Business Processes Yet
        </div>
        <div style={{ fontSize: 14, color: '#6B7280' }}>
          Create your first business process to see dashboard metrics
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Header */}
      <div>
        <div style={{ fontSize: 24, fontWeight: 700, color: '#111827', marginBottom: 8 }}>
          Business Process Dashboard
        </div>
        <div style={{ fontSize: 14, color: '#6B7280' }}>
          Executive overview of business process health and control coverage
        </div>
      </div>

      {/* Key Metrics */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        gap: 16
      }}>
        <StatCard
          title="Total Processes"
          value={calculatedSummary.total}
          subtitle="Across all tiers"
          color="#3B82F6"
        />
        <StatCard
          title="Avg Health Score"
          value={`${calculatedSummary.averageHealthScore}%`}
          subtitle="CMMI maturity level"
          color={calculatedSummary.averageHealthScore >= 80 ? '#10B981' : calculatedSummary.averageHealthScore >= 60 ? '#F59E0B' : '#EF4444'}
        />
        <StatCard
          title="Avg Control Coverage"
          value={`${calculatedSummary.averageControlCoverage}%`}
          subtitle="Across all processes"
          color="#243044"
        />
        <StatCard
          title="Needs Attention"
          value={calculatedSummary.processesNeedingAttention}
          subtitle="Low health or control gaps"
          color={calculatedSummary.processesNeedingAttention > 0 ? '#EF4445' : '#10B981'}
        />
      </div>

      {/* Tier and Criticality Distribution */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: 16 }}>
        {/* By Tier */}
        <div style={{
          padding: 16,
          backgroundColor: '#FFFFFF',
          borderRadius: 8,
          border: '1px solid #E5E7EB'
        }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#111827', marginBottom: 16 }}>
            Processes by Tier
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {Object.entries(calculatedSummary.byTier).map(([tier, count]) => {
              const color = getTierColor(tier);
              const percentage = calculatedSummary.total > 0 ? (count / calculatedSummary.total) * 100 : 0;
              return (
                <div key={tier}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>
                      {tier}
                    </div>
                    <div style={{ fontSize: 13, color: '#6B7280' }}>
                      {count} ({percentage.toFixed(0)}%)
                    </div>
                  </div>
                  <div style={{
                    height: 8,
                    backgroundColor: '#F3F4F6',
                    borderRadius: 4,
                    overflow: 'hidden'
                  }}>
                    <div
                      style={{
                        height: '100%',
                        backgroundColor: color,
                        borderRadius: 4,
                        width: `${percentage}%`,
                        transition: 'width 0.3s ease'
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* By Criticality */}
        <div style={{
          padding: 16,
          backgroundColor: '#FFFFFF',
          borderRadius: 8,
          border: '1px solid #E5E7EB'
        }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#111827', marginBottom: 16 }}>
            Processes by Criticality
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {Object.entries(calculatedSummary.byCriticality).map(([criticality, count]) => {
              const color = getCriticalityColor(criticality);
              const percentage = calculatedSummary.total > 0 ? (count / calculatedSummary.total) * 100 : 0;
              return (
                <div key={criticality}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>
                      {criticality}
                    </div>
                    <div style={{ fontSize: 13, color: '#6B7280' }}>
                      {count} ({percentage.toFixed(0)}%)
                    </div>
                  </div>
                  <div style={{
                    height: 8,
                    backgroundColor: '#F3F4F6',
                    borderRadius: 4,
                    overflow: 'hidden'
                  }}>
                    <div
                      style={{
                        height: '100%',
                        backgroundColor: color,
                        borderRadius: 4,
                        width: `${percentage}%`,
                        transition: 'width 0.3s ease'
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Health Score Distribution */}
      <div style={{
        padding: 16,
        backgroundColor: '#FFFFFF',
        borderRadius: 8,
        border: '1px solid #E5E7EB'
      }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: '#111827', marginBottom: 16 }}>
          Health Score Distribution
        </div>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 12
        }}>
          {[
            { label: 'Excellent (90-100)', count: healthDistribution.excellent, color: '#10B981' },
            { label: 'Good (75-89)', count: healthDistribution.good, color: '#3B82F6' },
            { label: 'Fair (60-74)', count: healthDistribution.fair, color: '#F59E0B' },
            { label: 'Poor (<60)', count: healthDistribution.poor, color: '#EF4444' }
          ].map(({ label, count, color }) => (
            <div
              key={label}
              style={{
                padding: 12,
                backgroundColor: `${color}08`,
                border: `1px solid ${color}30`,
                borderRadius: 6,
                textAlign: 'center'
              }}
            >
              <div style={{ fontSize: 24, fontWeight: 700, color: color, marginBottom: 4 }}>
                {count}
              </div>
              <div style={{ fontSize: 11, color: '#6B7280' }}>
                {label}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Top Risk Processes */}
      {topRiskProcesses.length > 0 && topRiskProcesses[0].riskCount > 0 && (
        <div style={{
          padding: 16,
          backgroundColor: '#FFFFFF',
          borderRadius: 8,
          border: '1px solid #E5E7EB'
        }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#111827', marginBottom: 16 }}>
            Top Risk Processes
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {topRiskProcesses.map((process, index) => (
              <div
                key={process.id}
                onClick={() => onProcessClick && onProcessClick(process)}
                style={{
                  padding: 12,
                  backgroundColor: '#FEF2F2',
                  border: '1px solid #FECACA',
                  borderRadius: 6,
                  cursor: onProcessClick ? 'pointer' : 'default',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  transition: 'background-color 0.15s ease'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.backgroundColor = '#FEE2E2';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.backgroundColor = '#FEF2F2';
                }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#111827', marginBottom: 4 }}>
                    {index + 1}. {process.name}
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <Badge
                      variant={process.criticality === 'Critical' ? 'danger' : 'warning'}
                      label={process.criticality}
                      style={{
                        backgroundColor: `${getCriticalityColor(process.criticality)}15`,
                        color: getCriticalityColor(process.criticality),
                        fontSize: 10,
                        padding: '2px 8px'
                      }}
                    />
                    <Badge
                      variant="info"
                      label={process.tier}
                      style={{
                        backgroundColor: `${getTierColor(process.tier)}15`,
                        color: getTierColor(process.tier),
                        fontSize: 10,
                        padding: '2px 8px'
                      }}
                    />
                    <Badge
                      variant="info"
                      label={process.owner}
                      style={{
                        backgroundColor: '#F3F4F6',
                        color: '#374151',
                        fontSize: 10,
                        padding: '2px 8px'
                      }}
                    />
                  </div>
                </div>
                <div style={{
                  fontSize: 20,
                  fontWeight: 700,
                  color: '#EF4445',
                  minWidth: 60,
                  textAlign: 'right'
                }}>
                  {process.riskCount || 0}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Lowest Control Coverage */}
      {lowestCoverageProcesses.length > 0 && (
        <div style={{
          padding: 16,
          backgroundColor: '#FFFFFF',
          borderRadius: 8,
          border: '1px solid #E5E7EB'
        }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#111827', marginBottom: 16 }}>
            Processes with Control Gaps
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {lowestCoverageProcesses.map((process, index) => (
              <div
                key={process.id}
                onClick={() => onProcessClick && onProcessClick(process)}
                style={{
                  padding: 12,
                  backgroundColor: '#FFFBEB',
                  border: '1px solid #FDE68A',
                  borderRadius: 6,
                  cursor: onProcessClick ? 'pointer' : 'default',
                  transition: 'background-color 0.15s ease'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.backgroundColor = '#FEF3C7';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.backgroundColor = '#FFFBEB';
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#111827', marginBottom: 4 }}>
                      {process.name}
                    </div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <Badge
                        variant={process.criticality === 'Critical' ? 'danger' : 'warning'}
                        label={process.criticality}
                        style={{
                          backgroundColor: `${getCriticalityColor(process.criticality)}15`,
                          color: getCriticalityColor(process.criticality),
                          fontSize: 10,
                          padding: '2px 8px'
                        }}
                      />
                      <span style={{ fontSize: 11, color: '#6B7280' }}>
                        {process.governedByControls?.length || 0} controls mapped
                      </span>
                    </div>
                  </div>
                  <div style={{
                    fontSize: 18,
                    fontWeight: 700,
                    color: '#F59E0B',
                    minWidth: 50,
                    textAlign: 'right'
                  }}>
                    -{process.controlGap}
                  </div>
                </div>
                <CMMIBar score={process.controlCoverage || 0} width="100%" />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default BusinessProcessDashboard;
