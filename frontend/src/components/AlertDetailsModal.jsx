/**
 * AlertDetailsModal Component
 *
 * Displays detailed information about a single alert in a modal overlay.
 * Shows full alert metadata and provides action buttons.
 */

import React from 'react';

const AlertDetailsModal = ({ alert, onClose, onAcknowledge, acknowledging }) => {
  if (!alert) return null;

  // Severity badge color
  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'Critical': return { bg: '#FEF2F2', text: '#DC2626' };
      case 'High': return { bg: '#FFFBEB', text: '#F59E0B' };
      case 'Medium': return { bg: '#FEFCE8', text: '#EAB308' };
      case 'Low': return { bg: '#f3f4fc', text: '#5e6ad2' };
      case 'Info': return { bg: '#F3F4F6', text: '#5c6066' };
      default: return { bg: '#F3F4F6', text: '#5c6066' };
    }
  };

  const severityColors = getSeverityColor(alert.severity);

  // Format datetime
  const formatDateTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  // Handle backdrop click
  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  // Handle escape key
  React.useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') onClose();
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  return (
    <div
      onClick={handleBackdropClick}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: 20
      }}
    >
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: 12,
          maxWidth: 600,
          width: '100%',
          maxHeight: '90vh',
          overflow: 'auto',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
        }}
      >
        {/* Header */}
        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid #ebecf0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: 12
        }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8, flexWrap: 'wrap' }}>
              <span style={{
                padding: '4px 10px',
                borderRadius: 6,
                fontSize: 11,
                fontWeight: 700,
                textTransform: 'uppercase',
                backgroundColor: severityColors.bg,
                color: severityColors.text
              }}>
                {alert.severity}
              </span>
              <span style={{
                fontSize: 12,
                fontWeight: 600,
                color: '#5c6066'
              }}>
                {alert.alert_type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
              </span>
            </div>
            <div style={{
              fontSize: 14,
              fontWeight: 700,
              color: '#0b0c0e'
            }}>
              Alert Details
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              padding: 4,
              backgroundColor: 'transparent',
              border: 'none',
              color: '#5c6066',
              cursor: 'pointer',
              fontSize: 20,
              lineHeight: 1
            }}
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: '20px' }}>
          {/* Message */}
          <div style={{ marginBottom: 20 }}>
            <div style={{
              fontSize: 11,
              fontWeight: 700,
              color: '#5c6066',
              marginBottom: 6,
              textTransform: 'uppercase',
              letterSpacing: '0.05em'
            }}>
              Message
            </div>
            <div style={{
              fontSize: 13,
              color: '#1c1f26',
              lineHeight: 1.5,
              backgroundColor: '#F9FAFB',
              padding: 12,
              borderRadius: 6,
              border: '1px solid #ebecf0'
            }}>
              {alert.message}
            </div>
          </div>

          {/* Metadata Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: 12,
            marginBottom: 16
          }}>
            <div>
              <div style={{
                fontSize: 10,
                fontWeight: 700,
                color: '#5c6066',
                marginBottom: 4,
                textTransform: 'uppercase',
                letterSpacing: '0.05em'
              }}>
                Alert ID
              </div>
              <div style={{
                fontSize: 12,
                color: '#5c6066',
                fontFamily: 'monospace'
              }}>
                {alert.id}
              </div>
            </div>

            <div>
              <div style={{
                fontSize: 10,
                fontWeight: 700,
                color: '#5c6066',
                marginBottom: 4,
                textTransform: 'uppercase',
                letterSpacing: '0.05em'
              }}>
                Created At
              </div>
              <div style={{
                fontSize: 12,
                color: '#5c6066'
              }}>
                {formatDateTime(alert.created_at)}
              </div>
            </div>

            {alert.acknowledged_at && (
              <>
                <div>
                  <div style={{
                    fontSize: 10,
                    fontWeight: 700,
                    color: '#5c6066',
                    marginBottom: 4,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em'
                  }}>
                    Acknowledged At
                  </div>
                  <div style={{
                    fontSize: 12,
                    color: '#5c6066'
                  }}>
                    {formatDateTime(alert.acknowledged_at)}
                  </div>
                </div>

                <div>
                  <div style={{
                    fontSize: 10,
                    fontWeight: 700,
                    color: '#5c6066',
                    marginBottom: 4,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em'
                  }}>
                    Acknowledged By
                  </div>
                  <div style={{
                    fontSize: 12,
                    color: '#5c6066'
                  }}>
                    {alert.acknowledged_by || 'Unknown'}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Vendor Information */}
          {alert.vendor_name && (
            <div style={{
              padding: 12,
              backgroundColor: '#F0F9FF',
              borderRadius: 6,
              border: '1px solid #BAE6FD',
              marginBottom: 16
            }}>
              <div style={{
                fontSize: 11,
                fontWeight: 700,
                color: '#0369A1',
                marginBottom: 6
              }}>
                Related Vendor
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: '#0C4A6E',
                    marginBottom: 2
                  }}>
                    {alert.vendor_name}
                  </div>
                  <div style={{
                    fontSize: 11,
                    color: '#075985'
                  }}>
                    ID: {alert.vendor_id}
                  </div>
                </div>
                <a
                  href={`/vendors/${alert.vendor_id}`}
                  style={{
                    padding: '6px 12px',
                    backgroundColor: '#0EA5E9',
                    border: 'none',
                    color: '#FFFFFF',
                    borderRadius: 6,
                    fontSize: 11,
                    fontWeight: 600,
                    textDecoration: 'none',
                    cursor: 'pointer'
                  }}
                >
                  View Vendor
                </a>
              </div>
            </div>
          )}

          {/* Additional Metadata */}
          {alert.metadata && Object.keys(alert.metadata).length > 0 && (
            <div>
              <div style={{
                fontSize: 11,
                fontWeight: 700,
                color: '#5c6066',
                marginBottom: 8,
                textTransform: 'uppercase',
                letterSpacing: '0.05em'
              }}>
                Additional Information
              </div>
              <div style={{
                backgroundColor: '#F9FAFB',
                borderRadius: 6,
                border: '1px solid #ebecf0',
                overflow: 'hidden'
              }}>
                {Object.entries(alert.metadata).map(([key, value]) => (
                  <div
                    key={key}
                    style={{
                      padding: '8px 12px',
                      borderBottom: '1px solid #ebecf0',
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: 11
                    }}
                  >
                    <span style={{ color: '#5c6066', fontWeight: 600 }}>
                      {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}:
                    </span>
                    <span style={{ color: '#5c6066', marginLeft: 12 }}>
                      {typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '16px 20px',
          borderTop: '1px solid #ebecf0',
          display: 'flex',
          justifyContent: 'flex-end',
          gap: 8
        }}>
          <button
            onClick={onClose}
            style={{
              padding: '8px 16px',
              backgroundColor: '#FFFFFF',
              border: '1px solid #d7d9de',
              color: '#5c6066',
              borderRadius: 6,
              cursor: 'pointer',
              fontSize: 12,
              fontWeight: 600
            }}
          >
            Close
          </button>
          {!alert.acknowledged_at && (
            <button
              onClick={onAcknowledge}
              disabled={acknowledging}
              style={{
                padding: '8px 16px',
                backgroundColor: acknowledging ? '#F5A623' : '#5e6ad2',
                border: 'none',
                color: '#FFFFFF',
                borderRadius: 6,
                cursor: acknowledging ? 'not-allowed' : 'pointer',
                fontSize: 12,
                fontWeight: 600,
                opacity: acknowledging ? 0.7 : 1
              }}
            >
              {acknowledging ? 'Acknowledging...' : 'Acknowledge Alert'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default AlertDetailsModal;
