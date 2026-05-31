/**
 * AlertTrendWidget Component
 *
 * Displays alert trend over time with a line chart visualization.
 * Shows how alert frequency changes over the specified date range.
 */

import React, { useState, useEffect } from 'react';

const AlertTrendWidget = ({ orgId, range = '30d', api_url, authToken }) => {
  const [trendData, setTrendData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!orgId) return;

    const fetchTrend = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(
          `${api_url}/api/alerts/trend?orgId=${orgId}&range=${range}`,
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
        setTrendData(data.success ? data.data : null);
      } catch (err) {
        console.error('Failed to load alert trend:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchTrend();
  }, [orgId, range, api_url, authToken]);

  // Generate trend data points
  const generateTrendPoints = (data) => {
    if (!data || !data.points || data.points.length === 0) return [];

    const points = data.points;
    const maxValue = Math.max(...points.map(p => p.count));
    const minValue = Math.min(...points.map(p => p.count));
    const range_value = maxValue - minValue || 1;

    const chartWidth = 280;
    const chartHeight = 100;
    const padding = { top: 10, bottom: 20, left: 40, right: 10 };

    const effectiveWidth = chartWidth - padding.left - padding.right;
    const effectiveHeight = chartHeight - padding.top - padding.bottom;

    return points.map((point, index) => {
      const x = padding.left + (index / (points.length - 1 || 1)) * effectiveWidth;
      const y = padding.top + effectiveHeight - ((point.count - minValue) / range_value) * effectiveHeight;

      return {
        x,
        y,
        count: point.count,
        date: point.date,
        label: point.label
      };
    });
  };

  const trendPoints = generateTrendPoints(trendData);

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
        <div style={{ fontSize: 12, color: '#6B7280' }}>Loading trend data...</div>
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
        <div style={{ fontSize: 12, color: '#DC2626' }}>Error loading trend data</div>
      </div>
    );
  }

  // Create line chart SVG
  const createLineChart = () => {
    const chartWidth = 280;
    const chartHeight = 100;

    if (trendPoints.length === 0) {
      return (
        <svg width={chartWidth} height={chartHeight}>
          <text
            x={chartWidth / 2}
            y={chartHeight / 2}
            textAnchor="middle"
            style={{ fontSize: 11, fill: '#6B7280' }}
          >
            No trend data available
          </text>
        </svg>
      );
    }

    // Create path for line
    const linePath = trendPoints.map((point, index) => {
      return `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`;
    }).join(' ');

    // Create area under line
    const areaPath = `${linePath} L ${trendPoints[trendPoints.length - 1].x} ${chartHeight - 20} L ${trendPoints[0].x} ${chartHeight - 20} Z`;

    // Y-axis labels
    const maxValue = Math.max(...trendPoints.map(p => p.count));
    const minValue = Math.min(...trendPoints.map(p => p.count));

    return (
      <svg width={chartWidth} height={chartHeight} style={{ display: 'block', margin: '0 auto' }}>
        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map(fraction => (
          <line
            key={fraction}
            x1={40}
            y1={10 + fraction * (chartHeight - 30)}
            x2={chartWidth - 10}
            y2={10 + fraction * (chartHeight - 30)}
            stroke="#E5E7EB"
            strokeWidth={1}
          />
        ))}

        {/* Area under line */}
        <path
          d={areaPath}
          fill="url(#gradient)"
          opacity={0.2}
        />

        {/* Line */}
        <path
          d={linePath}
          fill="none"
          stroke="#2563EB"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Data points */}
        {trendPoints.map((point, index) => (
          <circle
            key={index}
            cx={point.x}
            cy={point.y}
            r={3}
            fill="#FFFFFF"
            stroke="#2563EB"
            strokeWidth={2}
          />
        ))}

        {/* Y-axis labels */}
        <text
          x={35}
          y={14}
          textAnchor="end"
          style={{ fontSize: 9, fill: '#6B7280' }}
        >
          {maxValue}
        </text>
        <text
          x={35}
          y={chartHeight - 17}
          textAnchor="end"
          style={{ fontSize: 9, fill: '#6B7280' }}
        >
          {minValue}
        </text>

        {/* Gradient definition */}
        <defs>
          <linearGradient id="gradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#2563EB" />
            <stop offset="100%" stopColor="#2563EB" stopOpacity={0} />
          </linearGradient>
        </defs>
      </svg>
    );
  };

  // Calculate trend direction
  const calculateTrend = () => {
    if (trendPoints.length < 2) return null;

    const recent = trendPoints.slice(-7); // Last 7 data points
    const earlier = trendPoints.slice(-14, -7); // 7 points before that

    const recentAvg = recent.reduce((sum, p) => sum + p.count, 0) / recent.length;
    const earlierAvg = earlier.length > 0
      ? earlier.reduce((sum, p) => sum + p.count, 0) / earlier.length
      : recentAvg;

    const percentChange = earlierAvg > 0
      ? ((recentAvg - earlierAvg) / earlierAvg) * 100
      : 0;

    return {
      direction: percentChange > 5 ? 'up' : percentChange < -5 ? 'down' : 'stable',
      percentChange: Math.abs(percentChange).toFixed(1)
    };
  };

  const trend = calculateTrend();

  return (
    <div style={{
      border: '1px solid #E5E7EB',
      borderRadius: 8,
      padding: 16,
      backgroundColor: '#FFFFFF'
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12
      }}>
        <div style={{
          fontSize: 13,
          fontWeight: 700,
          color: '#111827'
        }}>
          Alert Trend
        </div>
        {trend && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            fontSize: 10,
            fontWeight: 600,
            padding: '4px 8px',
            borderRadius: 4,
            backgroundColor: trend.direction === 'up' ? '#FEF2F2' : trend.direction === 'down' ? '#F0FDF4' : '#F3F4F6',
            color: trend.direction === 'up' ? '#DC2626' : trend.direction === 'down' ? '#059669' : '#6B7280'
          }}>
            {trend.direction === 'up' && '↑'}
            {trend.direction === 'down' && '↓'}
            {trend.direction === 'stable' && '→'}
            {trend.percentChange}%
          </div>
        )}
      </div>

      {/* Line Chart */}
      <div style={{ marginBottom: 12 }}>
        {createLineChart()}
      </div>

      {/* X-axis labels */}
      {trendPoints.length > 0 && (
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: 9,
          color: '#6B7280',
          paddingLeft: 40,
          paddingRight: 10
        }}>
          <span>{trendPoints[0].label}</span>
          {trendPoints.length > 1 && (
            <span>{trendPoints[trendPoints.length - 1].label}</span>
          )}
        </div>
      )}

      {/* Summary */}
      {trendData?.summary && (
        <div style={{
          marginTop: 12,
          paddingTop: 12,
          borderTop: '1px solid #E5E7EB',
          fontSize: 11,
          color: '#6B7280'
        }}>
          {trendData.summary}
        </div>
      )}
    </div>
  );
};

export default AlertTrendWidget;
