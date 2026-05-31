/**
 * RecentAlertsWidget Component
 *
 * Displays the 5 most recent alerts with severity indicators.
 * Supports acknowledging alerts inline.
 *
 * @param {Array} props.alerts - Array of alert objects
 * @param {function} props.onAcknowledge - Callback for acknowledging alerts
 * @param {string} props.orgId - Organization ID
 */

import React from 'react';

const RecentAlertsWidget = ({ alerts = [], onAcknowledge, orgId, mobile = false }) => {
  // Severity configuration
  const severityConfig = {
    critical: {
      color: '#DC2626',
      bgColor: '#FEE2E2',
      icon: '🚨',
      label: 'Critical'
    },
    high: {
      color: '#EF4444',
      bgColor: '#FECACA',
      icon: '⚠️',
      label: 'High'
    },
    medium: {
      color: '#F59E0B',
      bgColor: '#FEF3C7',
      icon: '⚡',
      label: 'Medium'
    },
    low: {
      color: '#10B981',
      bgColor: '#D1FAE5',
      icon: 'ℹ️',
      label: 'Low'
    }
  };

  // Get severity configuration
  const getSeverity = (severity) => {
    const key = severity?.toLowerCase() || 'low';
    return severityConfig[key] || severityConfig.low;
  };

  // Format timestamp
  const formatTimestamp = (timestamp) => {
    if (!timestamp) return 'Unknown';

    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  // Handle acknowledge click
  const handleAcknowledge = (e, alertId) => {
    e.stopPropagation();
    onAcknowledge?.(alertId);
  };

  if (alerts.length === 0) {
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
          Recent Alerts
        </div>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: 150,
          color: '#6B7280',
          fontSize: 13
        }}>
          No recent alerts
        </div>
      </div>
    );
  }

  return (
    <div style={{
      backgroundColor: '#FFFFFF',
      borderRadius: 8,
      border: '1px solid #E5E7EB',
      padding: mobile ? 12 : 16,
      maxHeight: mobile ? 300 : 400,
      display: 'flex',
      flexDirection: 'column'
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12
      }}>
        <div style={{
          fontSize: 14,
          fontWeight: 600,
          color: '#111827'
        }}>
          Recent Alerts
        </div>

        {alerts.some(a => !a.acknowledged) && (
          <div style={{
            padding: '2px 8px',
            backgroundColor: '#EF4444',
            color: '#FFFFFF',
            borderRadius: 12,
            fontSize: 11,
            fontWeight: 600
          }}>
            {alerts.filter(a => !a.acknowledged).length} new
          </div>
        )}
      </div>

      {/* Alerts List */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: 8
      }}>
        {alerts.slice(0, 5).map((alert) => {
          const severity = getSeverity(alert.severity);
          const isAcknowledged = alert.acknowledged;

          return (
            <div
              key={alert.id}
              style={{
                padding: 12,
                backgroundColor: isAcknowledged ? '#F9FAFB' : severity.bgColor,
                borderRadius: 6,
                border: `1px solid ${isAcknowledged ? '#E5E7EB' : severity.color}30`,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                opacity: isAcknowledged ? 0.7 : 1
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.transform = 'translateX(4px)';
                e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.transform = 'translateX(0)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              {/* Alert Header */}
              <div style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 8,
                marginBottom: 6
              }}>
                <span style={{ fontSize: 16, lineHeight: 1 }}>
                  {severity.icon}
                </span>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: '#111827',
                    marginBottom: 2,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}>
                    {alert.title || alert.type || 'Alert'}
                  </div>

                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    fontSize: 11,
                    color: '#6B7280'
                  }}>
                    <span style={{
                      padding: '2px 6px',
                      backgroundColor: severity.color,
                      color: '#FFFFFF',
                      borderRadius: 4,
                      fontWeight: 500
                    }}>
                      {severity.label}
                    </span>

                    <span style={{
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}>
                      {formatTimestamp(alert.createdAt)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Alert Message */}
              {alert.message && (
                <div style={{
                  fontSize: 11,
                  color: '#4B5563',
                  marginBottom: 8,
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                  lineHeight: 1.4
                }}>
                  {alert.message}
                </div>
              )}

              {/* Alert Footer */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                fontSize: 11
              }}>
                {/* Vendor Name */}
                {alert.vendorName && (
                  <div style={{
                    color: '#6B7280',
                    fontWeight: 500
                  }}>
                    {alert.vendorName}
                  </div>
                )}

                {/* Acknowledge Button */}
                {!isAcknowledged && (
                  <button
                    onClick={(e) => handleAcknowledge(e, alert.id)}
                    style={{
                      padding: '4px 10px',
                      backgroundColor: '#FFFFFF',
                      color: '#374151',
                      border: '1px solid #D1D5DB',
                      borderRadius: 4,
                      cursor: 'pointer',
                      fontSize: 10,
                      fontWeight: 500,
                      transition: 'all 0.15s ease'
                    }}
                    onMouseOver={(e) => {
                      e.target.style.backgroundColor = '#F3F4F6';
                      e.target.style.borderColor = '#9CA3AF';
                    }}
                    onMouseOut={(e) => {
                      e.target.style.backgroundColor = '#FFFFFF';
                      e.target.style.borderColor = '#D1D5DB';
                    }}
                  >
                    Acknowledge
                  </button>
                )}

                {isAcknowledged && (
                  <span style={{
                    padding: '4px 10px',
                    backgroundColor: '#10B98120',
                    color: '#10B981',
                    borderRadius: 4,
                    fontSize: 10,
                    fontWeight: 500
                  }}>
                    Acknowledged
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      {alerts.length > 0 && (
        <div style={{
          paddingTop: 12,
          marginTop: 8,
          borderTop: '1px solid #E5E7EB',
          fontSize: 11,
          color: '#6B7280',
          textAlign: 'center'
        }}>
          {alerts.some(a => !a.acknowledged)
            ? `${alerts.filter(a => !a.acknowledged).length} unacknowledged alerts`
            : 'All alerts acknowledged'}
        </div>
      )}
    </div>
  );
};

export default RecentAlertsWidget;
