/**
 * ConnectorHealthWidget Component
 *
 * Displays connector health status with counts and visual indicators.
 * Shows connected, failed, syncing, and disconnected vendors.
 *
 * @param {Array} props.vendors - Array of vendor objects with status
 * @param {Object} props.statistics - Optional statistics object with additional metrics
 */

import React, { useMemo } from 'react';
import StatusIcon from '../atoms/StatusIcon';

const ConnectorHealthWidget = ({ vendors = [], statistics, mobile = false }) => {
  // Calculate connector status counts
  const statusCounts = useMemo(() => {
    const counts = {
      connected: 0,
      syncing: 0,
      disconnected: 0,
      error: 0
    };

    vendors.forEach(vendor => {
      const status = vendor.status?.toLowerCase() || 'disconnected';
      if (counts.hasOwnProperty(status)) {
        counts[status]++;
      } else {
        counts.disconnected++;
      }
    });

    return counts;
  }, [vendors]);

  // Calculate percentages
  const total = vendors.length;
  const percentages = useMemo(() => {
    if (total === 0) {
      return { connected: 0, syncing: 0, disconnected: 0, error: 0 };
    }

    return {
      connected: ((statusCounts.connected / total) * 100).toFixed(1),
      syncing: ((statusCounts.syncing / total) * 100).toFixed(1),
      disconnected: ((statusCounts.disconnected / total) * 100).toFixed(1),
      error: ((statusCounts.error / total) * 100).toFixed(1)
    };
  }, [statusCounts, total]);

  // Status configuration
  const statusConfig = [
    {
      key: 'connected',
      label: 'Connected',
      color: '#10B981',
      icon: 'connected',
      description: 'Actively syncing'
    },
    {
      key: 'syncing',
      label: 'Syncing',
      color: '#F59E0B',
      icon: 'syncing',
      description: 'In progress'
    },
    {
      key: 'error',
      label: 'Failed',
      color: '#EF4444',
      icon: 'error',
      description: 'Connection error'
    },
    {
      key: 'disconnected',
      label: 'Disconnected',
      color: '#6B7280',
      icon: 'disconnected',
      description: 'Not connected'
    }
  ];

  // Calculate health score
  const healthScore = useMemo(() => {
    if (total === 0) return 0;
    const healthyCount = statusCounts.connected + statusCounts.syncing;
    return Math.round((healthyCount / total) * 100);
  }, [statusCounts, total]);

  // Get health score color
  const getHealthColor = (score) => {
    if (score >= 80) return '#10B981';
    if (score >= 60) return '#F59E0B';
    if (score >= 40) return '#EF4444';
    return '#DC2626';
  };

  return (
    <div style={{
      backgroundColor: '#FFFFFF',
      borderRadius: 8,
      border: '1px solid #E5E7EB',
      padding: 16
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16
      }}>
        <div style={{
          fontSize: 14,
          fontWeight: 600,
          color: '#111827'
        }}>
          Connector Health
        </div>

        {/* Health Score Badge */}
        <div style={{
          padding: '4px 12px',
          backgroundColor: `${getHealthColor(healthScore)}20`,
          borderRadius: 12,
          display: 'flex',
          alignItems: 'center',
          gap: 6
        }}>
          <div style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            backgroundColor: getHealthColor(healthScore)
          }} />
          <span style={{
            fontSize: 12,
            fontWeight: 600,
            color: getHealthColor(healthScore)
          }}>
            {healthScore}% Healthy
          </span>
        </div>
      </div>

      {/* Status Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: mobile ? 'repeat(2, 1fr)' : 'repeat(2, 1fr)',
        gap: mobile ? 8 : 12,
        marginBottom: mobile ? 12 : 16
      }}>
        {statusConfig.map((status) => {
          const count = statusCounts[status.key];
          const percentage = percentages[status.key];

          return (
            <div
              key={status.key}
              style={{
                padding: 12,
                backgroundColor: '#F9FAFB',
                borderRadius: 6,
                border: `1px solid ${status.color}30`,
                transition: 'all 0.15s ease',
                cursor: 'default'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.backgroundColor = `${status.color}10`;
                e.currentTarget.style.borderColor = status.color;
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.backgroundColor = '#F9FAFB';
                e.currentTarget.style.borderColor = `${status.color}30`;
              }}
            >
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                marginBottom: 4
              }}>
                <StatusIcon status={status.icon} size={14} />
                <span style={{
                  fontSize: 12,
                  fontWeight: 500,
                  color: '#374151'
                }}>
                  {status.label}
                </span>
              </div>

              <div style={{
                fontSize: 20,
                fontWeight: 700,
                color: status.color,
                marginBottom: 2
              }}>
                {count}
              </div>

              <div style={{
                fontSize: 11,
                color: '#6B7280'
              }}>
                {percentage}% of total
              </div>
            </div>
          );
        })}
      </div>

      {/* Progress Bar */}
      <div style={{
        marginBottom: 12
      }}>
        <div style={{
          fontSize: 11,
          fontWeight: 500,
          color: '#6B7280',
          marginBottom: 6,
          textAlign: 'center'
        }}>
          Connection Status Distribution
        </div>

        <div style={{
          display: 'flex',
          height: 8,
          borderRadius: 4,
          overflow: 'hidden',
          backgroundColor: '#F3F4F6'
        }}>
          {statusConfig.map((status) => {
            const width = percentages[status.key];
            if (width === '0.0') return null;

            return (
              <div
                key={status.key}
                style={{
                  width: `${width}%`,
                  backgroundColor: status.color,
                  transition: 'width 0.3s ease'
                }}
                title={`${status.label}: ${statusCounts[status.key]} (${width}%)`}
              />
            );
          })}
        </div>
      </div>

      {/* Summary */}
      <div style={{
        paddingTop: 12,
        borderTop: '1px solid #E5E7EB',
        fontSize: 11,
        color: '#6B7280',
        textAlign: 'center'
      }}>
        {total > 0 ? (
          <>
            {statusCounts.connected} connected, {statusCounts.syncing} syncing,
            {statusCounts.error} failed, {statusCounts.disconnected} disconnected
          </>
        ) : (
          'No vendors to display'
        )}
      </div>
    </div>
  );
};

export default ConnectorHealthWidget;
