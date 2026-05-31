/**
 * RiskDistributionWidget Component
 *
 * Displays a pie chart showing vendor distribution by risk level.
 * Supports filtering by clicking on chart segments.
 *
 * @param {Array} props.vendors - Array of vendor objects with risk scores
 */

import React, { useMemo } from 'react';

const RiskDistributionWidget = ({ vendors = [] }) => {
  // Calculate risk distribution
  const distribution = useMemo(() => {
    const counts = {
      critical: { count: 0, label: 'Critical (0-40)', color: '#DC2626', range: [0, 40] },
      high: { count: 0, label: 'High (40-60)', color: '#EF4444', range: [40, 60] },
      medium: { count: 0, label: 'Medium (60-80)', color: '#F59E0B', range: [60, 80] },
      low: { count: 0, label: 'Low (80-100)', color: '#10B981', range: [80, 100] }
    };

    vendors.forEach(vendor => {
      const score = vendor.riskScore ?? 0;
      if (score < 40) counts.critical.count++;
      else if (score < 60) counts.high.count++;
      else if (score < 80) counts.medium.count++;
      else counts.low.count++;
    });

    return counts;
  }, [vendors]);

  // Calculate total for percentages
  const total = vendors.length;

  // Calculate pie chart segments
  const segments = useMemo(() => {
    let currentAngle = 0;
    const segments = [];

    Object.entries(distribution).forEach(([key, data]) => {
      if (data.count > 0) {
        const percentage = (data.count / total) * 100;
        const angle = (percentage / 100) * 360;

        segments.push({
          key,
          ...data,
          percentage,
          startAngle: currentAngle,
          endAngle: currentAngle + angle,
          count: data.count
        });

        currentAngle += angle;
      }
    });

    return segments;
  }, [distribution, total]);

  // Convert polar to cartesian coordinates for SVG path
  const polarToCartesian = (centerX, centerY, radius, angleInDegrees) => {
    const angleInRadians = (angleInDegrees - 90) * Math.PI / 180;
    return {
      x: centerX + radius * Math.cos(angleInRadians),
      y: centerY + radius * Math.sin(angleInRadians)
    };
  };

  // Create SVG arc path
  const describeArc = (x, y, radius, startAngle, endAngle) => {
    const start = polarToCartesian(x, y, radius, endAngle);
    const end = polarToCartesian(x, y, radius, startAngle);
    const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1';

    return [
      'M',
      x, y,
      'L',
      start.x, start.y,
      'A',
      radius, radius,
      0,
      largeArcFlag,
      0,
      end.x, end.y,
      'Z'
    ].join(' ');
  };

  if (total === 0) {
    return (
      <div style={{
        backgroundColor: '#FFFFFF',
        borderRadius: 8,
        border: '1px solid #E5E7EB',
        padding: 16,
        minHeight: 200
      }}>
        <div style={{
          fontSize: 14,
          fontWeight: 600,
          color: '#111827',
          marginBottom: 12
        }}>
          Risk Score Distribution
        </div>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: 150,
          color: '#6B7280',
          fontSize: 13
        }}>
          No vendors to display
        </div>
      </div>
    );
  }

  return (
    <div style={{
      backgroundColor: '#FFFFFF',
      borderRadius: 8,
      border: '1px solid #E5E7EB',
      padding: 16
    }}>
      {/* Header */}
      <div style={{
        fontSize: 14,
        fontWeight: 600,
        color: '#111827',
        marginBottom: 16
      }}>
        Risk Score Distribution
      </div>

      {/* Chart */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16
      }}>
        <svg width={200} height={200} viewBox="0 0 200 200">
          {segments.map((segment, index) => (
            <path
              key={segment.key}
              d={describeArc(100, 100, 80, segment.startAngle, segment.endAngle)}
              fill={segment.color}
              stroke="#FFFFFF"
              strokeWidth={2}
              style={{
                transition: 'opacity 0.15s ease',
                cursor: 'pointer'
              }}
              onMouseOver={(e) => {
                e.target.style.opacity = '0.8';
              }}
              onMouseOut={(e) => {
                e.target.style.opacity = '1';
              }}
            >
              <title>
                {segment.label}: {segment.count} vendors ({segment.percentage.toFixed(1)}%)
              </title>
            </path>
          ))}
        </svg>
      </div>

      {/* Legend */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: 8
      }}>
        {segments.map((segment) => (
          <div
            key={segment.key}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              fontSize: 12,
              color: '#374151'
            }}
          >
            <div
              style={{
                width: 12,
                height: 12,
                borderRadius: 2,
                backgroundColor: segment.color,
                flexShrink: 0
              }}
            />
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 500 }}>
                {segment.label}
              </div>
              <div style={{ fontSize: 11, color: '#6B7280' }}>
                {segment.count} ({segment.percentage.toFixed(1)}%)
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Summary */}
      <div style={{
        marginTop: 12,
        paddingTop: 12,
        borderTop: '1px solid #E5E7EB',
        fontSize: 11,
        color: '#6B7280',
        textAlign: 'center'
      }}>
        Total: {total} vendors
      </div>
    </div>
  );
};

export default RiskDistributionWidget;
