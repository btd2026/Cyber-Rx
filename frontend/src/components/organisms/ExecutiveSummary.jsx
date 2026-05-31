/**
 * ExecutiveSummary Component
 *
 * High-level executive dashboard summary with key metrics and trends.
 * Designed for C-suite executives and board members.
 *
 * @param {Object} props.data - Summary data object
 * @param {string} props.period - Time period displayed
 * @param {function} props.onMetricClick - Metric click callback
 */

import React from 'react';
import { formatMillions, formatNumber } from '../shared/formatters';
import { getHealthColor } from '../shared/formatters';

const ExecutiveSummary = ({ data, period = 'Last 30 Days', onMetricClick }) => {
  const metrics = [
    {
      id: 'overallScore',
      label: 'Security Posture',
      value: data.overallScore || 72,
      format: 'score',
      trend: data.trends?.overallScore,
      icon: '🛡️'
    },
    {
      id: 'totalExposure',
      label: 'Total Exposure',
      value: data.totalExposure || 450,
      format: 'currency',
      trend: data.trends?.totalExposure,
      icon: '💰'
    },
    {
      id: 'activeFindings',
      label: 'Active Findings',
      value: data.activeFindings || 23,
      format: 'count',
      breakdown: {
        critical: data.criticalFindings || 2,
        high: data.highFindings || 8,
        medium: data.mediumFindings || 13
      },
      icon: '⚠️'
    },
    {
      id: 'complianceRate',
      label: 'Compliance Rate',
      value: data.complianceRate || 87,
      format: 'percent',
      trend: data.trends?.complianceRate,
      icon: '✓'
    },
    {
      id: 'mttd',
      label: 'Mean Time to Detect',
      value: data.mttd || 24,
      format: 'hours',
      trend: data.trends?.mttd,
      threshold: 24,
      icon: '🔍'
    },
    {
      id: 'mttr',
      label: 'Mean Time to Respond',
      value: data.mttr || 6,
      format: 'hours',
      trend: data.trends?.mttr,
      threshold: 4,
      icon: '⚡'
    }
  ];

  const renderMetricValue = (metric) => {
    const color = getHealthColor(metric.value);

    if (metric.format === 'score' || metric.format === 'percent') {
      return (
        <div style={{ fontSize: 32, fontWeight: 700, color }}>
          {metric.value}
          <span style={{ fontSize: 16, color: '#9CA3AF' }}>
            {metric.format === 'percent' ? '%' : ''}
          </span>
        </div>
      );
    }

    if (metric.format === 'currency') {
      return (
        <div style={{ fontSize: 24, fontWeight: 700, color }}>
          {formatMillions(metric.value)}
        </div>
      );
    }

    if (metric.format === 'count') {
      return (
        <div>
          <div style={{ fontSize: 28, fontWeight: 700, color }}>
            {formatNumber(metric.value)}
          </div>
          {metric.breakdown && (
            <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
              <span style={{ fontSize: 9, color: '#EF4545', fontWeight: 600 }}>
                {metric.breakdown.critical} Critical
              </span>
              <span style={{ fontSize: 9, color: '#F5A623', fontWeight: 600 }}>
                {metric.breakdown.high} High
              </span>
            </div>
          )}
        </div>
      );
    }

    if (metric.format === 'hours') {
      const isOverThreshold = metric.value > (metric.threshold || 24);
      return (
        <div>
          <div style={{ fontSize: 28, fontWeight: 700, color: isOverThreshold ? '#EF4545' : '#0FBB80' }}>
            {metric.value}h
          </div>
          <div style={{ fontSize: 9, color: '#9CA3AF' }}>
            Target: {metric.threshold || 24}h
          </div>
        </div>
      );
    }

    return <div style={{ fontSize: 28, fontWeight: 700 }}>{metric.value}</div>;
  };

  const renderTrend = (trend) => {
    if (!trend) return null;

    const isPositive = trend.direction === 'up' && trend.improved;
    const isNegative = trend.direction === 'down' && !trend.improved;
    const isGood = isPositive || (trend.direction === 'down' && trend.improved);

    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          fontSize: 10,
          fontWeight: 600,
          color: isGood ? '#0FBB80' : '#EF4545'
        }}
      >
        <span>{trend.direction === 'up' ? '↑' : '↓'}</span>
        <span>{trend.value}</span>
        <span style={{ color: '#9CA3AF', fontWeight: 400 }}>vs last period</span>
      </div>
    );
  };

  return (
    <div
      style={{
        padding: 20,
        backgroundColor: '#FFFFFF',
        border: '1px solid #E5E7EB',
        borderRadius: 8
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 20
        }}
      >
        <div>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: '#111827', margin: 0 }}>
            Executive Summary
          </h2>
          <p style={{ fontSize: 11, color: '#6B7280', margin: '4px 0 0 0' }}>{period}</p>
        </div>
        <div
          style={{
            padding: '6px 12px',
            backgroundColor: '#F0F9FF',
            border: '1px solid #BAE6FD',
            borderRadius: 6,
            fontSize: 10,
            fontWeight: 600,
            color: '#0891B2'
          }}
        >
          Updated {new Date().toLocaleDateString()}
        </div>
      </div>

      {/* Metrics grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 16
        }}
      >
        {metrics.map((metric) => (
          <div
            key={metric.id}
            onClick={() => onMetricClick?.(metric.id)}
            style={{
              padding: 16,
              border: '1px solid #E5E7EB',
              borderRadius: 8,
              backgroundColor: '#FAFAFA',
              cursor: onMetricClick ? 'pointer' : 'default',
              transition: 'all 0.15s ease',
              ':hover': onMetricClick
                ? {
                    borderColor: '#D1D5DB',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)'
                  }
                : {}
            }}
            onMouseOver={(e) => {
              if (onMetricClick) {
                e.target.style.borderColor = '#D1D5DB';
                e.target.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.08)';
              }
            }}
            onMouseOut={(e) => {
              e.target.style.borderColor = '#E5E7EB';
              e.target.style.boxShadow = 'none';
            }}
          >
            {/* Label and icon */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <span style={{ fontSize: 20 }}>{metric.icon}</span>
              <span style={{ fontSize: 11, fontWeight: 600, color: '#374151' }}>
                {metric.label}
              </span>
            </div>

            {/* Value */}
            <div style={{ marginBottom: 8 }}>{renderMetricValue(metric)}</div>

            {/* Trend */}
            {renderTrend(metric.trend)}
          </div>
        ))}
      </div>
    </div>
  );
};

export default ExecutiveSummary;
