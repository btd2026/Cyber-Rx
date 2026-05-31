/**
 * AlertsSummaryWidget Component
 *
 * Displays alert count by severity with a donut chart visualization.
 * Shows breakdown of critical, high, medium, low, and info alerts.
 */

import React, { useState, useEffect } from 'react';

const AlertsSummaryWidget = ({ orgId, api_url, authToken }) => {
  const [statistics, setStatistics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!orgId) return;

    const fetchStatistics = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(
          `${api_url}/api/alerts/statistics?orgId=${orgId}`,
          {
            headers: {
              'Authorization': `Bearer ${authToken}`,
              'X-Org-Id': orgId
            }
          }
        );

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        setStatistics(data.success ? data.data : null);
      } catch (err) {
        console.error('Failed to load alert statistics:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchStatistics();
  }, [orgId, api_url, authToken]);

  // Severity colors
  const severityColors = {
    critical: '#DC2626',
    high: '#F59E0B',
    medium: '#EAB308',
    low: '#3B82F6',
    info: '#6B7280'
  };

  const severityLabels = {
    critical: 'Critical',
    high: 'High',
    medium: 'Medium',
    low: 'Low',
    info: 'Info'
  };

  // Calculate percentages for donut chart
  const calculateChartSegments = (stats) => {
    const total = stats?.total || 0;
    if (total === 0) return [];

    const severities = ['critical', 'high', 'medium', 'low', 'info'];
    let currentAngle = 0;

    return severities.map(severity => {
      const count = stats?.bySeverity?.[severity] || 0;
      const percentage = (count / total) * 100;
      const segmentAngle = (count / total) * 360;

      const segment = {
        severity,
        count,
        percentage,
        startAngle: currentAngle,
        endAngle: currentAngle + segmentAngle
      };

      currentAngle += segmentAngle;
      return segment;
    }).filter(segment => segment.count > 0);
  };

  const segments = calculateChartSegments(statistics);
  const totalAlerts = statistics?.total || 0;
  const unacknowledged = statistics?.unacknowledged || 0;

  // Loading state
  if (loading) {
    return (
      <div style={{
        border: '1px solid #E5E7EB',
        borderRadius: 8,
        padding: 16,
        backgroundColor: '#FFFFFF',
        minHeight: 200,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{ fontSize: 12, color: '#6B7280' }}>Loading alert summary...</div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div style={{
        border: '1px solid #E5E7EB',
        borderRadius: 8,
        padding: 16,
        backgroundColor: '#FFFFFF',
        minHeight: 200
      }}>
        <div style={{ fontSize: 12, color: '#DC2626' }}>Error loading statistics</div>
      </div>
    );
  }

  // Create donut chart SVG
  const createDonutChart = () => {
    const size = 120;
    const centerX = size / 2;
    const centerY = size / 2;
    const radius = 40;
    const strokeWidth = 20;

    const paths = segments.map(segment => {
      const startRad = (segment.startAngle - 90) * (Math.PI / 180);
      const endRad = (segment.endAngle - 90) * (Math.PI / 180);

      const x1 = centerX + radius * Math.cos(startRad);
      const y1 = centerY + radius * Math.sin(startRad);
      const x2 = centerX + radius * Math.cos(endRad);
      const y2 = centerY + radius * Math.sin(endRad);

      const largeArcFlag = segment.percentage > 50 ? 1 : 0;

      // Handle full circle case
      if (segment.percentage === 100) {
        return (
          <circle
            key={segment.severity}
            cx={centerX}
            cy={centerY}
            r={radius}
            fill="none"
            stroke={severityColors[segment.severity]}
            strokeWidth={strokeWidth}
          />
        );
      }

      return (
        <path
          key={segment.severity}
          d={`M ${x1} ${y1} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}`}
          fill="none"
          stroke={severityColors[segment.severity]}
          strokeWidth={strokeWidth}
          style={{ transition: 'all 0.3s ease' }}
        />
      );
    });

    return (
      <svg width={size} height={size} style={{ display: 'block', margin: '0 auto' }}>
        {paths.length === 0 ? (
          <circle
            cx={centerX}
            cy={centerY}
            r={radius}
            fill="none"
            stroke="#E5E7EB"
            strokeWidth={strokeWidth}
          />
        ) : (
          paths
        )}
        {/* Center text */}
        <text
          x={centerX}
          y={centerY}
          textAnchor="middle"
          dominantBaseline="middle"
          style={{
            fontSize: 20,
            fontWeight: 700,
            fill: '#111827'
          }}
        >
          {totalAlerts}
        </text>
        <text
          x={centerX}
          y={centerY + 15}
          textAnchor="middle"
          dominantBaseline="middle"
          style={{
            fontSize: 9,
            fill: '#6B7280'
          }}
        >
          Total
        </text>
      </svg>
    );
  };

  return (
    <div style={{
      border: '1px solid #E5E7EB',
      borderRadius: 8,
      padding: 16,
      backgroundColor: '#FFFFFF'
    }}>
      {/* Header */}
      <div style={{
        fontSize: 13,
        fontWeight: 700,
        color: '#111827',
        marginBottom: 12
      }}>
        Alert Summary
      </div>

      {/* Donut Chart */}
      <div style={{ marginBottom: 16 }}>
        {createDonutChart()}
      </div>

      {/* Legend */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))',
        gap: 8
      }}>
        {['critical', 'high', 'medium', 'low', 'info'].map(severity => {
          const count = statistics?.bySeverity?.[severity] || 0;
          return (
            <div
              key={severity}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                fontSize: 10
              }}
            >
              <div
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 2,
                  backgroundColor: severityColors[severity]
                }}
              />
              <span style={{ color: '#6B7280' }}>
                {severityLabels[severity]}:
              </span>
              <span style={{ fontWeight: 600, color: '#374151' }}>
                {count}
              </span>
            </div>
          );
        })}
      </div>

      {/* Unacknowledged count */}
      {unacknowledged > 0 && (
        <div style={{
          marginTop: 12,
          paddingTop: 12,
          borderTop: '1px solid #E5E7EB',
          fontSize: 11,
          color: '#6B7280'
        }}>
          <span style={{ fontWeight: 600, color: '#DC2626' }}>
            {unacknowledged}
          </span>{' '}
          unacknowledged alert{unacknowledged !== 1 ? 's' : ''}
        </div>
      )}
    </div>
  );
};

export default AlertsSummaryWidget;
