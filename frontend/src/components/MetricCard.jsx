/**
 * MetricCard Component
 *
 * Displays a single dashboard metric with visual indicator and color coding.
 * Supports score, status, trend, days, and count formats.
 */

import React from 'react';

const MetricCard = ({ metric }) => {
  // Determine value color and status icon based on format
  const getValueColor = () => {
    if (metric.format === 'score') {
      return metric.color || '#888888';
    }
    if (metric.format === 'status') {
      switch (metric.status) {
        case 'critical': return '#EF4545';
        case 'warning': return '#F5A623';
        case 'clear': return '#0FBB80';
        default: return '#888888';
      }
    }
    if (metric.format === 'trend') {
      switch (metric.trend) {
        case 'increasing': return '#EF4545';
        case 'stable': return '#0FBB80';
        case 'decreasing': return '#0FBB80';
        default: return '#888888';
      }
    }
    if (metric.format === 'days' && metric.threshold) {
      const days = parseInt(metric.value);
      if (days > metric.threshold) return '#EF4545'; // Expired/stale
      if (days > metric.threshold * 0.7) return '#F5A623'; // Warning
      return '#0FBB80'; // Fresh
    }
    if (metric.format === 'count') {
      switch (metric.severity) {
        case 'critical': return '#EF4545';
        case 'high': return '#F5A623';
        default: return '#888888';
      }
    }
    return '#888888';
  };

  const getStatusIcon = () => {
    const valueColor = getValueColor();

    if (metric.format === 'score') {
      if (metric.value >= 70) return '⚠️';
      if (metric.value >= 40) return '⚠️';
      return '✓';
    }

    if (metric.format === 'status') {
      switch (metric.status) {
        case 'critical': return '⚠️';
        case 'warning': return '⚠️';
        case 'clear': return '✓';
        default: return '•';
      }
    }

    if (metric.format === 'trend') {
      switch (metric.trend) {
        case 'increasing': return '📈';
        case 'decreasing': return '📉';
        case 'stable': return '➡️';
        default: return '•';
      }
    }

    return '•';
  };

  const valueColor = getValueColor();
  const statusIcon = getStatusIcon();

  return (
    <div style={{
      border: '1px solid #E5E7EB',
      borderRadius: 8,
      padding: 12,
      backgroundColor: '#FFFFFF',
      minHeight: 80
    }}>
      {/* Header with label and value */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 8
      }}>
        <div style={{
          color: '#111827',
          fontSize: 11,
          fontWeight: 700,
          flex: 1,
          paddingRight: 8
        }}>
          {metric.label}
        </div>
        <div style={{
          fontSize: 16,
          color: valueColor,
          fontWeight: 600,
          textAlign: 'right',
          whiteSpace: 'nowrap'
        }}>
          {statusIcon} {metric.value}
        </div>
      </div>

      {/* Description if present */}
      {metric.description && (
        <div style={{
          fontSize: 9,
          color: '#6B7280',
          marginTop: 'auto',
          lineHeight: 1.3
        }}>
          {metric.description}
        </div>
      )}

      {/* Subtitle for certain formats */}
      {metric.format === 'days' && (
        <div style={{
          fontSize: 8,
          color: '#6B7280',
          marginTop: 4
        }}>
          {metric.value === 'No evidence' ? 'No evidence uploaded' : `days since last evidence`}
        </div>
      )}

      {metric.format === 'count' && metric.subtitle && (
        <div style={{
          fontSize: 8,
          color: '#6B7280',
          marginTop: 4
        }}>
          {metric.subtitle}
        </div>
      )}
    </div>
  );
};

export default MetricCard;
