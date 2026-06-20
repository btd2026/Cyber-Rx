/**
 * AlertNotificationCenter Component
 *
 * Displays comprehensive alert notification center for viewing and managing alerts.
 * Features:
 * - Alert filtering by severity, type, acknowledgment status, and date range
 * - Inline acknowledgment functionality
 * - Alert history and analytics
 * - Batch operations
 * - Real-time updates
 */

import React, { useState, useEffect } from 'react';
import AlertsSummaryWidget from './alerts/AlertsSummaryWidget';
import AlertTrendWidget from './alerts/AlertTrendWidget';
import TopAlertTypesWidget from './alerts/TopAlertTypesWidget';
import AlertDetailsModal from './AlertDetailsModal';

const AlertNotificationCenter = ({ api_url, authToken, orgId }) => {
  const [filters, setFilters] = useState({
    severity: 'all',
    type: 'all',
    acknowledged: 'all',
    dateRange: '30d',
    search: ''
  });
  const [selectedAlerts, setSelectedAlerts] = useState([]);
  const [showDetails, setShowDetails] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [alerts, setAlerts] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [acknowledging, setAcknowledging] = useState(false);

  // Fetch alerts
  useEffect(() => {
    if (!orgId) return;

    const fetchAlerts = async () => {
      try {
        setLoading(true);
        setError(null);

        const queryParams = new URLSearchParams({
          orgId,
          ...Object.fromEntries(
            Object.entries(filters).filter(([_, v]) => v !== 'all' && v !== '')
          ),
          page: currentPage,
          limit: 50
        });

        const response = await fetch(
          `${api_url}/api/alerts?${queryParams}`,
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
        setAlerts(data.success ? data.data : null);
      } catch (err) {
        console.error('Failed to load alerts:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchAlerts();

    // Poll for updates every 30 seconds
    const interval = setInterval(fetchAlerts, 30000);
    return () => clearInterval(interval);
  }, [orgId, filters, currentPage, api_url, authToken]);

  // Acknowledge alerts
  const acknowledgeAlerts = async (alertIds) => {
    if (!alertIds || alertIds.length === 0) return;

    try {
      setAcknowledging(true);

      const response = await fetch(`${api_url}/api/alerts/acknowledge`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
          'X-Org-Id': orgId
        },
        body: JSON.stringify({ alertIds })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      // Refresh alerts
      const queryParams = new URLSearchParams({
        orgId,
        ...Object.fromEntries(
          Object.entries(filters).filter(([_, v]) => v !== 'all' && v !== '')
        ),
        page: currentPage,
        limit: 50
      });

      const refreshResponse = await fetch(
        `${api_url}/api/alerts?${queryParams}`,
        {
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'X-Org-Id': orgId
          }
        }
      );

      if (refreshResponse.ok) {
        const data = await refreshResponse.json();
        setAlerts(data.success ? data.data : null);
      }

      // Clear selection
      setSelectedAlerts([]);
      setShowDetails(null);
    } catch (err) {
      console.error('Failed to acknowledge alerts:', err);
      alert(`Error acknowledging alerts: ${err.message}`);
    } finally {
      setAcknowledging(false);
    }
  };

  // Severity badge color
  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'Critical': return '#DC2626';
      case 'High': return '#F59E0B';
      case 'Medium': return '#EAB308';
      case 'Low': return '#5e6ad2';
      case 'Info': return '#5c6066';
      default: return '#5c6066';
    }
  };

  const getSeverityBgColor = (severity) => {
    switch (severity) {
      case 'Critical': return '#FEF2F2';
      case 'High': return '#FFFBEB';
      case 'Medium': return '#FEFCE8';
      case 'Low': return '#f3f4fc';
      case 'Info': return '#F3F4F6';
      default: return '#F3F4F6';
    }
  };

  // Format relative time
  const formatRelativeTime = (dateString) => {
    const now = new Date();
    const date = new Date(dateString);
    const seconds = Math.floor((now - date) / 1000);

    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
    return date.toLocaleDateString();
  };

  // Format full datetime
  const formatDateTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  // Handle filter changes
  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setCurrentPage(1); // Reset to first page on filter change
  };

  // Toggle alert selection
  const toggleAlertSelection = (alertId) => {
    setSelectedAlerts(prev =>
      prev.includes(alertId)
        ? prev.filter(id => id !== alertId)
        : [...prev, alertId]
    );
  };

  // Toggle all alerts on current page
  const toggleAllAlerts = () => {
    const currentAlertIds = alerts?.items?.map(a => a.id) || [];
    if (currentAlertIds.every(id => selectedAlerts.includes(id))) {
      setSelectedAlerts([]);
    } else {
      setSelectedAlerts(currentAlertIds);
    }
  };

  // Loading state
  if (loading && !alerts) {
    return (
      <div style={{
        padding: '2rem',
        textAlign: 'center',
        color: '#5c6066'
      }}>
        Loading alerts...
      </div>
    );
  }

  // Error state
  if (error && !alerts) {
    return (
      <div style={{
        padding: '2rem',
        textAlign: 'center',
        color: '#DC2626'
      }}>
        <div style={{ marginBottom: 8, fontSize: 14, fontWeight: 600 }}>
          Error loading alerts
        </div>
        <div style={{ fontSize: 12, color: '#5c6066' }}>{error}</div>
      </div>
    );
  }

  const alertItems = alerts?.items || [];
  const totalPages = alerts?.pagination?.totalPages || 1;
  const totalCount = alerts?.pagination?.totalCount || 0;

  return (
    <div className="alert-notification-center" style={{ padding: '1rem' }}>
      {/* Header */}
      <div style={{
        marginBottom: 16,
        paddingBottom: 12,
        borderBottom: '1px solid #ebecf0'
      }}>
        <div style={{
          fontSize: 18,
          fontWeight: 700,
          color: '#0b0c0e',
          marginBottom: 4
        }}>
          Alert Notification Center
        </div>
        <div style={{
          fontSize: 12,
          color: '#5c6066'
        }}>
          {totalCount} total alerts • {alertItems.filter(a => !a.acknowledged_at).length} unacknowledged
        </div>
      </div>

      {/* Analytics Panel */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: 12,
        marginBottom: 16
      }}>
        <AlertsSummaryWidget orgId={orgId} api_url={api_url} authToken={authToken} />
        <AlertTrendWidget orgId={orgId} range="30d" api_url={api_url} authToken={authToken} />
        <TopAlertTypesWidget orgId={orgId} limit={5} api_url={api_url} authToken={authToken} />
      </div>

      {/* Filters */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: 8,
        marginBottom: 16,
        padding: 12,
        backgroundColor: '#F9FAFB',
        borderRadius: 8,
        border: '1px solid #ebecf0'
      }}>
        <select
          value={filters.severity}
          onChange={(e) => handleFilterChange('severity', e.target.value)}
          style={{
            padding: '6px 10px',
            border: '1px solid #d7d9de',
            borderRadius: 6,
            fontSize: 12,
            backgroundColor: '#FFFFFF',
            color: '#5c6066'
          }}
        >
          <option value="all">All Severities</option>
          <option value="Critical">Critical</option>
          <option value="High">High</option>
          <option value="Medium">Medium</option>
          <option value="Low">Low</option>
          <option value="Info">Info</option>
        </select>

        <select
          value={filters.type}
          onChange={(e) => handleFilterChange('type', e.target.value)}
          style={{
            padding: '6px 10px',
            border: '1px solid #d7d9de',
            borderRadius: 6,
            fontSize: 12,
            backgroundColor: '#FFFFFF',
            color: '#5c6066'
          }}
        >
          <option value="all">All Types</option>
          <option value="critical_signal">Critical Signal</option>
          <option value="score_increase">Score Increase</option>
          <option value="grade_degradation">Grade Degradation</option>
          <option value="sync_failure">Sync Failure</option>
          <option value="multi_provider_confirmed">Multi-Provider Confirmed</option>
        </select>

        <select
          value={filters.acknowledged}
          onChange={(e) => handleFilterChange('acknowledged', e.target.value)}
          style={{
            padding: '6px 10px',
            border: '1px solid #d7d9de',
            borderRadius: 6,
            fontSize: 12,
            backgroundColor: '#FFFFFF',
            color: '#5c6066'
          }}
        >
          <option value="all">All Status</option>
          <option value="unacknowledged">Unacknowledged</option>
          <option value="acknowledged">Acknowledged</option>
        </select>

        <select
          value={filters.dateRange}
          onChange={(e) => handleFilterChange('dateRange', e.target.value)}
          style={{
            padding: '6px 10px',
            border: '1px solid #d7d9de',
            borderRadius: 6,
            fontSize: 12,
            backgroundColor: '#FFFFFF',
            color: '#5c6066'
          }}
        >
          <option value="7d">Last 7 days</option>
          <option value="30d">Last 30 days</option>
          <option value="90d">Last 90 days</option>
          <option value="365d">Last year</option>
          <option value="all">All time</option>
        </select>

        <input
          type="text"
          placeholder="Search alerts..."
          value={filters.search}
          onChange={(e) => handleFilterChange('search', e.target.value)}
          style={{
            flex: 1,
            minWidth: 200,
            padding: '6px 10px',
            border: '1px solid #d7d9de',
            borderRadius: 6,
            fontSize: 12,
            backgroundColor: '#FFFFFF',
            color: '#5c6066'
          }}
        />

        {selectedAlerts.length > 0 && (
          <button
            onClick={() => acknowledgeAlerts(selectedAlerts)}
            disabled={acknowledging}
            style={{
              padding: '6px 12px',
              backgroundColor: acknowledging ? '#F5A623' : '#5e6ad2',
              border: 'none',
              color: '#FFFFFF',
              borderRadius: 6,
              cursor: acknowledging ? 'not-allowed' : 'pointer',
              fontSize: 11,
              fontWeight: 600,
              opacity: acknowledging ? 0.7 : 1
            }}
          >
            {acknowledging
              ? 'Acknowledging...'
              : `Acknowledge ${selectedAlerts.length} Alert${selectedAlerts.length > 1 ? 's' : ''}`
            }
          </button>
        )}
      </div>

      {/* Alerts List */}
      <div className="alerts-list">
        {alertItems.length === 0 ? (
          <div style={{
            padding: '3rem',
            textAlign: 'center',
            color: '#5c6066',
            backgroundColor: '#F9FAFB',
            borderRadius: 8,
            border: '1px dashed #d7d9de'
          }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>🔔</div>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>
              No alerts found
            </div>
            <div style={{ fontSize: 12 }}>
              {filters.search ? 'Try adjusting your search or filters' : 'No alerts match your criteria'}
            </div>
          </div>
        ) : (
          <>
            {/* Select All */}
            {alertItems.length > 0 && (
              <div style={{
                padding: '8px 12px',
                backgroundColor: '#F3F4F6',
                borderBottom: '1px solid #ebecf0',
                display: 'flex',
                alignItems: 'center',
                gap: 8
              }}>
                <input
                  type="checkbox"
                  checked={alertItems.every(a => selectedAlerts.includes(a.id))}
                  onChange={toggleAllAlerts}
                  style={{ cursor: 'pointer' }}
                />
                <span style={{ fontSize: 11, color: '#5c6066' }}>
                  {selectedAlerts.length} selected
                </span>
              </div>
            )}

            {/* Alert Items */}
            {alertItems.map(alert => (
              <div
                key={alert.id}
                className={`alert-item ${alert.acknowledged_at ? 'acknowledged' : ''}`}
                style={{
                  borderLeft: `4px solid ${getSeverityColor(alert.severity)}`,
                  borderBottom: '1px solid #ebecf0',
                  padding: 12,
                  backgroundColor: alert.acknowledged_at ? '#F9FAFB' : '#FFFFFF',
                  display: 'flex',
                  gap: 12,
                  alignItems: 'flex-start',
                  opacity: alert.acknowledged_at ? 0.7 : 1
                }}
              >
                <input
                  type="checkbox"
                  checked={selectedAlerts.includes(alert.id)}
                  onChange={() => toggleAlertSelection(alert.id)}
                  style={{ marginTop: 4, cursor: 'pointer' }}
                />

                <div
                  className="alert-content"
                  onClick={() => setShowDetails(alert)}
                  style={{ flex: 1, cursor: 'pointer' }}
                >
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6, flexWrap: 'wrap' }}>
                    <span
                      className="alert-severity"
                      style={{
                        padding: '2px 8px',
                        borderRadius: 4,
                        fontSize: 10,
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        backgroundColor: getSeverityBgColor(alert.severity),
                        color: getSeverityColor(alert.severity)
                      }}
                    >
                      {alert.severity}
                    </span>
                    <span className="alert-type" style={{ fontSize: 11, fontWeight: 600, color: '#5c6066' }}>
                      {alert.alert_type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </span>
                    <span className="alert-time" style={{ fontSize: 10, color: '#5c6066', marginLeft: 'auto' }}>
                      {formatRelativeTime(alert.created_at)}
                    </span>
                  </div>

                  <div className="alert-message" style={{
                    fontSize: 13,
                    color: '#1c1f26',
                    marginBottom: 6,
                    lineHeight: 1.4
                  }}>
                    {alert.message}
                  </div>

                  {alert.vendor_name && (
                    <div className="alert-vendor" style={{ fontSize: 11, color: '#5c6066' }}>
                      Vendor:{' '}
                      <a
                        href={`/vendors/${alert.vendor_id}`}
                        onClick={(e) => e.stopPropagation()}
                        style={{ color: '#5e6ad2', textDecoration: 'none' }}
                      >
                        {alert.vendor_name}
                      </a>
                    </div>
                  )}

                  {alert.acknowledged_at && (
                    <div className="alert-acknowledged" style={{
                      marginTop: 6,
                      fontSize: 10,
                      color: '#059669',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4
                    }}>
                      <span>✓</span>
                      <span>
                        Acknowledged by {alert.acknowledged_by || 'Unknown'} at {formatDateTime(alert.acknowledged_at)}
                      </span>
                    </div>
                  )}
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    acknowledgeAlerts([alert.id]);
                  }}
                  disabled={acknowledging || alert.acknowledged_at}
                  style={{
                    padding: '6px 12px',
                    backgroundColor: alert.acknowledged_at ? '#d7d9de' : '#5e6ad2',
                    border: 'none',
                    color: '#FFFFFF',
                    borderRadius: 6,
                    cursor: alert.acknowledged_at ? 'not-allowed' : 'pointer',
                    fontSize: 10,
                    fontWeight: 600,
                    opacity: alert.acknowledged_at ? 0.5 : 1
                  }}
                >
                  {alert.acknowledged_at ? 'Acknowledged' : 'Acknowledge'}
                </button>
              </div>
            ))}
          </>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '12px 16px',
          backgroundColor: '#F9FAFB',
          borderTop: '1px solid #ebecf0',
          borderRadius: '0 0 8px 8px'
        }}>
          <div style={{ fontSize: 11, color: '#5c6066' }}>
            Showing {(currentPage - 1) * 50 + 1}-{Math.min(currentPage * 50, totalCount)} of {totalCount}
          </div>

          <div style={{ display: 'flex', gap: 4 }}>
            <button
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
              style={{
                padding: '4px 8px',
                backgroundColor: currentPage === 1 ? '#F3F4F6' : '#FFFFFF',
                border: '1px solid #d7d9de',
                borderRadius: 4,
                cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                fontSize: 11
              }}
            >
              First
            </button>
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              style={{
                padding: '4px 8px',
                backgroundColor: currentPage === 1 ? '#F3F4F6' : '#FFFFFF',
                border: '1px solid #d7d9de',
                borderRadius: 4,
                cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                fontSize: 11
              }}
            >
              Previous
            </button>
            <span style={{
              padding: '4px 12px',
              fontSize: 11,
              fontWeight: 600,
              color: '#5c6066'
            }}>
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              style={{
                padding: '4px 8px',
                backgroundColor: currentPage === totalPages ? '#F3F4F6' : '#FFFFFF',
                border: '1px solid #d7d9de',
                borderRadius: 4,
                cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                fontSize: 11
              }}
            >
              Next
            </button>
            <button
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage === totalPages}
              style={{
                padding: '4px 8px',
                backgroundColor: currentPage === totalPages ? '#F3F4F6' : '#FFFFFF',
                border: '1px solid #d7d9de',
                borderRadius: 4,
                cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                fontSize: 11
              }}
            >
              Last
            </button>
          </div>
        </div>
      )}

      {/* Alert Details Modal */}
      {showDetails && (
        <AlertDetailsModal
          alert={showDetails}
          onClose={() => setShowDetails(null)}
          onAcknowledge={() => acknowledgeAlerts([showDetails.id])}
          acknowledging={acknowledging}
        />
      )}
    </div>
  );
};

export default AlertNotificationCenter;
