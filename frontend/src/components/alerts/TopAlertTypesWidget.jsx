/**
 * TopAlertTypesWidget Component
 *
 * Displays top alert types by frequency with a horizontal bar chart.
 * Shows the most common alert types and their counts.
 */

import React, { useState, useEffect } from 'react';

const TopAlertTypesWidget = ({ orgId, limit = 5, api_url, authToken }) => {
  const [typeData, setTypeData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!orgId) return;

    const fetchTypes = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(
          `${api_url}/api/alerts/types?orgId=${orgId}&limit=${limit}`,
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
        setTypeData(data.success ? data.data : null);
      } catch (err) {
        console.error('Failed to load alert types:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchTypes();
  }, [orgId, limit, api_url, authToken]);

  // Format type label
  const formatTypeLabel = (type) => {
    return type
      .replace(/_/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase());
  };

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
        <div style={{ fontSize: 12, color: '#6B7280' }}>Loading alert types...</div>
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
        <div style={{ fontSize: 12, color: '#DC2626' }}>Error loading alert types</div>
      </div>
    );
  }

  const types = typeData?.types || [];
  const maxCount = types.length > 0 ? Math.max(...types.map(t => t.count)) : 0;

  // Create bar chart
  const createBarChart = () => {
    if (types.length === 0) {
      return (
        <div style={{
          padding: '40px 20px',
          textAlign: 'center',
          color: '#6B7280'
        }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>📊</div>
          <div style={{ fontSize: 12 }}>No alert data available</div>
        </div>
      );
    }

    return types.map((type, index) => {
      const barWidth = maxCount > 0 ? (type.count / maxCount) * 100 : 0;
      const barColor = index === 0 ? '#DC2626' : index === 1 ? '#F59E0B' : index === 2 ? '#EAB308' : '#3B82F6';

      return (
        <div
          key={type.type}
          style={{
            marginBottom: 12,
            display: 'flex',
            alignItems: 'center',
            gap: 8
          }}
        >
          {/* Type label */}
          <div style={{
            width: 140,
            fontSize: 10,
            color: '#374151',
            fontWeight: 500,
            textAlign: 'right',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            paddingRight: 8
          }}>
            {formatTypeLabel(type.type)}
          </div>

          {/* Bar */}
          <div style={{ flex: 1 }}>
            <div
              style={{
                width: `${barWidth}%`,
                height: 20,
                backgroundColor: barColor,
                borderRadius: 4,
                transition: 'width 0.3s ease',
                position: 'relative'
              }}
            >
              {/* Count label on bar */}
              {barWidth > 15 && (
                <span
                  style={{
                    position: 'absolute',
                    left: '50%',
                    top: '50%',
                    transform: 'translate(-50%, -50%)',
                    fontSize: 9,
                    fontWeight: 600,
                    color: '#FFFFFF',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {type.count}
                </span>
              )}
            </div>
          </div>

          {/* Count label outside bar */}
          {barWidth <= 15 && (
            <div style={{
              fontSize: 10,
              fontWeight: 600,
              color: '#374151',
              minWidth: 30,
              textAlign: 'left'
            }}>
              {type.count}
            </div>
          )}
        </div>
      );
    });
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
        Top Alert Types
      </div>

      {/* Bar Chart */}
      <div style={{ marginBottom: 12 }}>
        {createBarChart()}
      </div>

      {/* Summary */}
      {typeData?.total && (
        <div style={{
          marginTop: 12,
          paddingTop: 12,
          borderTop: '1px solid #E5E7EB',
          fontSize: 11,
          color: '#6B7280'
        }}>
          Showing top {Math.min(limit, types.length)} of {typeData.total} total alert types
        </div>
      )}

      {/* Legend */}
      <div style={{
        marginTop: 8,
        display: 'flex',
        flexWrap: 'wrap',
        gap: 8,
        fontSize: 9,
        color: '#6B7280'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <div style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: '#DC2626' }} />
          <span>Most common</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <div style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: '#F59E0B' }} />
          <span>2nd most</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <div style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: '#EAB308' }} />
          <span>3rd most</span>
        </div>
      </div>
    </div>
  );
};

export default TopAlertTypesWidget;
