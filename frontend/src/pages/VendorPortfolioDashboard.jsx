/**
 * VendorPortfolioDashboard Component
 *
 * Executive-level vendor risk visibility dashboard.
 * Displays all vendors with risk scores, sortable table,
 * connector health summary, and real-time status indicators.
 *
 * @param {string} props.api_url - API base URL
 * @param {string} props.authToken - Authentication token
 * @param {string} props.orgId - Organization ID
 * @param {function} props.onNavigate - Navigation callback
 */

import React, { useState, useEffect, useMemo } from 'react';
import RiskDistributionWidget from '../components/dashboard/RiskDistributionWidget';
import ConnectorHealthWidget from '../components/dashboard/ConnectorHealthWidget';
import RecentAlertsWidget from '../components/dashboard/RecentAlertsWidget';
import VendorTrendChart from '../components/dashboard/VendorTrendChart';
import StatusIcon from '../components/atoms/StatusIcon';

const VendorPortfolioDashboard = ({ api_url, authToken, orgId, onNavigate }) => {
  // Filter state
  const [filters, setFilters] = useState({
    search: '',
    tier: 'all',
    riskLevel: 'all',
    status: 'all'
  });

  // Sort state
  const [sort, setSort] = useState({ column: 'riskScore', direction: 'desc' });

  // Pagination state
  const [page, setPage] = useState(0);
  const pageSize = 50;

  // Data state
  const [vendors, setVendors] = useState([]);
  const [statistics, setStatistics] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [syncingVendors, setSyncingVendors] = useState(new Set());

  // Fetch vendors and statistics
  useEffect(() => {
    if (!orgId) return;

    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        const baseUrl = api_url || import.meta.env?.VITE_API_URL || 'https://cyberrx-api.onrender.com';

        // Build query parameters
        const queryParams = new URLSearchParams({
          orgId,
          search: filters.search,
          tier: filters.tier,
          riskLevel: filters.riskLevel,
          status: filters.status,
          sort: sort.column,
          order: sort.direction,
          limit: pageSize,
          offset: page * pageSize
        });

        // Fetch vendors
        const vendorsResponse = await fetch(
          `${baseUrl}/api/vendors?${queryParams}`,
          {
            headers: {
              'Authorization': `Bearer ${authToken}`,
              'Content-Type': 'application/json'
            }
          }
        );

        if (!vendorsResponse.ok) {
          throw new Error(`Failed to fetch vendors: ${vendorsResponse.statusText}`);
        }

        const vendorsData = await vendorsResponse.json();
        setVendors(vendorsData.success ? vendorsData.data : []);

        // Fetch statistics
        const statsResponse = await fetch(
          `${baseUrl}/api/statistics/dashboard?orgId=${orgId}`,
          {
            headers: {
              'Authorization': `Bearer ${authToken}`,
              'Content-Type': 'application/json'
            }
          }
        );

        if (statsResponse.ok) {
          const statsData = await statsResponse.json();
          setStatistics(statsData.success ? statsData.data : null);
        }

        // Fetch recent alerts
        const alertsResponse = await fetch(
          `${baseUrl}/api/alerts?orgId=${orgId}&limit=5`,
          {
            headers: {
              'Authorization': `Bearer ${authToken}`,
              'Content-Type': 'application/json'
            }
          }
        );

        if (alertsResponse.ok) {
          const alertsData = await alertsResponse.json();
          setAlerts(alertsData.success ? alertsData.data : []);
        }

      } catch (err) {
        console.error('Failed to load dashboard data:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [orgId, filters, sort, page, api_url, authToken]);

  // Trigger manual sync for a vendor
  const triggerSync = async (vendorId, vendorName) => {
    if (!vendorId || !orgId) return;

    setSyncingVendors(prev => new Set(prev).add(vendorId));

    try {
      const baseUrl = api_url || import.meta.env?.VITE_API_URL || 'https://cyberrx-api.onrender.com';

      const response = await fetch(
        `${baseUrl}/api/vendors/${vendorId}/sync`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ orgId })
        }
      );

      if (!response.ok) {
        throw new Error(`Sync failed for ${vendorName}`);
      }

      const result = await response.json();

      if (result.success) {
        // Refresh vendors list
        setVendors(prev => prev.map(v =>
          v.id === vendorId
            ? { ...v, status: 'syncing', lastSync: new Date().toISOString() }
            : v
        ));
      }
    } catch (err) {
      console.error('Sync error:', err);
      alert(`Failed to sync ${vendorName}: ${err.message}`);
    } finally {
      setSyncingVendors(prev => {
        const next = new Set(prev);
        next.delete(vendorId);
        return next;
      });
    }
  };

  // Acknowledge alert
  const acknowledgeAlert = async (alertId) => {
    try {
      const baseUrl = api_url || import.meta.env?.VITE_API_URL || 'https://cyberrx-api.onrender.com';

      const response = await fetch(
        `${baseUrl}/api/alerts/${alertId}/acknowledge`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ orgId })
        }
      );

      if (response.ok) {
        setAlerts(prev => prev.map(a =>
          a.id === alertId ? { ...a, acknowledged: true } : a
        ));
      }
    } catch (err) {
      console.error('Failed to acknowledge alert:', err);
    }
  };

  // Export to CSV
  const exportToCSV = () => {
    if (!vendors.length) return;

    const headers = ['Vendor Name', 'Tier', 'Risk Score', 'Grade', 'Status', 'Last Sync'];
    const csvContent = [
      headers.join(','),
      ...vendors.map(v => [
        `"${v.name}"`,
        v.tier,
        v.riskScore,
        v.grade,
        v.status,
        v.lastSync ? new Date(v.lastSync).toLocaleDateString() : 'Never'
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `vendor-portfolio-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Handle sort change
  const handleSort = (column) => {
    setSort(prev => ({
      column,
      direction: prev.column === column && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  // Handle filter change
  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPage(0); // Reset to first page on filter change
  };

  // Clear all filters
  const clearFilters = () => {
    setFilters({
      search: '',
      tier: 'all',
      riskLevel: 'all',
      status: 'all'
    });
    setPage(0);
  };

  // Get risk color
  const getRiskColor = (score) => {
    if (score >= 80) return { color: '#10B981', label: 'Low' };
    if (score >= 60) return { color: '#F59E0B', label: 'Medium' };
    if (score >= 40) return { color: '#EF4444', label: 'High' };
    return { color: '#DC2626', label: 'Critical' };
  };

  // Get tier color
  const getTierColor = (tier) => {
    const colors = {
      critical: '#DC2626',
      high: '#EF4444',
      medium: '#F59E0B',
      low: '#10B981'
    };
    return colors[tier?.toLowerCase()] || '#5c6066';
  };

  // Format timestamp
  const formatTimestamp = (timestamp) => {
    if (!timestamp) return 'Never';
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  };

  // Loading state
  if (loading) {
    return (
      <div style={{
        padding: '2rem',
        textAlign: 'center',
        color: '#5c6066',
        backgroundColor: '#f6f7f9',
        minHeight: '100vh'
      }}>
        <div style={{ marginBottom: 16 }}>Loading vendor portfolio...</div>
        <div style={{
          display: 'inline-block',
          width: 40,
          height: 40,
          border: '3px solid #ebecf0',
          borderTopColor: '#5e6ad2',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }} />
        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div style={{
        padding: '2rem',
        textAlign: 'center',
        backgroundColor: '#FEF2F2',
        border: '1px solid #FECACA',
        borderRadius: 8,
        margin: 24
      }}>
        <div style={{
          fontSize: 18,
          fontWeight: 600,
          color: '#DC2626',
          marginBottom: 8
        }}>
          Error Loading Dashboard
        </div>
        <div style={{ fontSize: 14, color: '#991B1B', marginBottom: 16 }}>
          {error}
        </div>
        <button
          onClick={() => window.location.reload()}
          style={{
            padding: '8px 16px',
            backgroundColor: '#DC2626',
            color: '#FFFFFF',
            border: 'none',
            borderRadius: 6,
            cursor: 'pointer',
            fontSize: 14,
            fontWeight: 600
          }}
        >
          Retry
        </button>
      </div>
    );
  }

  // Calculate active filters count
  const activeFiltersCount = Object.values(filters).filter(
    v => v !== 'all' && v !== ''
  ).length;

  return (
    <div style={{
      padding: '24px',
      backgroundColor: '#f6f7f9',
      minHeight: '100vh'
    }}>
      {/* Header */}
      <div style={{
        marginBottom: 24,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 16
      }}>
        <div>
          <h1 style={{
            fontSize: 24,
            fontWeight: 700,
            color: '#0b0c0e',
            margin: 0,
            marginBottom: 4
          }}>
            Vendor Portfolio Dashboard
          </h1>
          <p style={{
            fontSize: 14,
            color: '#5c6066',
            margin: 0
          }}>
            Executive visibility into vendor risk posture and compliance status
          </p>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={exportToCSV}
            disabled={!vendors.length}
            style={{
              padding: '8px 16px',
              backgroundColor: vendors.length ? '#FFFFFF' : '#F3F4F6',
              color: vendors.length ? '#5c6066' : '#8b9098',
              border: '1px solid #d7d9de',
              borderRadius: 6,
              cursor: vendors.length ? 'pointer' : 'not-allowed',
              fontSize: 13,
              fontWeight: 500,
              display: 'flex',
              alignItems: 'center',
              gap: 6
            }}
          >
            <span>📥</span>
            Export CSV
          </button>
        </div>
      </div>

      {/* Dashboard Widgets */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: 16,
        marginBottom: 24
      }}>
        <RiskDistributionWidget vendors={vendors} />
        <ConnectorHealthWidget vendors={vendors} statistics={statistics} />
        <RecentAlertsWidget
          alerts={alerts}
          onAcknowledge={acknowledgeAlert}
          orgId={orgId}
        />
      </div>

      {/* Trend Chart Section */}
      <div style={{ marginBottom: 24 }}>
        <VendorTrendChart
          vendors={vendors}
          api_url={api_url}
          authToken={authToken}
          orgId={orgId}
          timeRange="12M"
          showAnnotations={true}
        />
      </div>

      {/* Filters */}
      <div style={{
        backgroundColor: '#FFFFFF',
        padding: 16,
        borderRadius: 8,
        border: '1px solid #ebecf0',
        marginBottom: 16
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 12
        }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#0b0c0e' }}>
            Filters
            {activeFiltersCount > 0 && (
              <span style={{
                marginLeft: 8,
                padding: '2px 8px',
                backgroundColor: '#5e6ad2',
                color: '#FFFFFF',
                borderRadius: 12,
                fontSize: 11
              }}>
                {activeFiltersCount}
              </span>
            )}
          </div>

          {activeFiltersCount > 0 && (
            <button
              onClick={clearFilters}
              style={{
                padding: '4px 12px',
                backgroundColor: 'transparent',
                color: '#5c6066',
                border: '1px solid #d7d9de',
                borderRadius: 4,
                cursor: 'pointer',
                fontSize: 12,
                fontWeight: 500
              }}
            >
              Clear All
            </button>
          )}
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 12
        }}>
          {/* Search */}
          <div>
            <label style={{
              display: 'block',
              fontSize: 12,
              fontWeight: 500,
              color: '#5c6066',
              marginBottom: 4
            }}>
              Search Vendors
            </label>
            <input
              type="text"
              placeholder="Search by name..."
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #d7d9de',
                borderRadius: 6,
                fontSize: 13,
                boxSizing: 'border-box'
              }}
            />
          </div>

          {/* Tier Filter */}
          <div>
            <label style={{
              display: 'block',
              fontSize: 12,
              fontWeight: 500,
              color: '#5c6066',
              marginBottom: 4
            }}>
              Vendor Tier
            </label>
            <select
              value={filters.tier}
              onChange={(e) => handleFilterChange('tier', e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #d7d9de',
                borderRadius: 6,
                fontSize: 13,
                backgroundColor: '#FFFFFF',
                boxSizing: 'border-box'
              }}
            >
              <option value="all">All Tiers</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>

          {/* Risk Level Filter */}
          <div>
            <label style={{
              display: 'block',
              fontSize: 12,
              fontWeight: 500,
              color: '#5c6066',
              marginBottom: 4
            }}>
              Risk Level
            </label>
            <select
              value={filters.riskLevel}
              onChange={(e) => handleFilterChange('riskLevel', e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #d7d9de',
                borderRadius: 6,
                fontSize: 13,
                backgroundColor: '#FFFFFF',
                boxSizing: 'border-box'
              }}
            >
              <option value="all">All Risk Levels</option>
              <option value="critical">Critical (0-40)</option>
              <option value="high">High (40-60)</option>
              <option value="medium">Medium (60-80)</option>
              <option value="low">Low (80-100)</option>
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <label style={{
              display: 'block',
              fontSize: 12,
              fontWeight: 500,
              color: '#5c6066',
              marginBottom: 4
            }}>
              Connection Status
            </label>
            <select
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #d7d9de',
                borderRadius: 6,
                fontSize: 13,
                backgroundColor: '#FFFFFF',
                boxSizing: 'border-box'
              }}
            >
              <option value="all">All Statuses</option>
              <option value="connected">Connected</option>
              <option value="syncing">Syncing</option>
              <option value="disconnected">Disconnected</option>
              <option value="error">Error</option>
            </select>
          </div>
        </div>
      </div>

      {/* Vendors Table */}
      <div style={{
        backgroundColor: '#FFFFFF',
        borderRadius: 8,
        border: '1px solid #ebecf0',
        overflow: 'hidden'
      }}>
        {/* Table header */}
        <div style={{
          padding: '16px',
          borderBottom: '1px solid #ebecf0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#0b0c0e' }}>
            Vendors ({vendors.length})
          </div>
        </div>

        {/* Table */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{
            width: '100%',
            borderCollapse: 'collapse',
            fontSize: 13
          }}>
            <thead>
              <tr style={{
                backgroundColor: '#F9FAFB',
                borderBottom: '1px solid #ebecf0'
              }}>
                <th
                  onClick={() => handleSort('name')}
                  style={{
                    padding: '12px 16px',
                    textAlign: 'left',
                    fontWeight: 600,
                    color: '#5c6066',
                    cursor: 'pointer',
                    userSelect: 'none',
                    whiteSpace: 'nowrap'
                  }}
                >
                  Vendor Name
                  {sort.column === 'name' && (
                    <span style={{ marginLeft: 4, color: '#5e6ad2' }}>
                      {sort.direction === 'asc' ? '↑' : '↓'}
                    </span>
                  )}
                </th>
                <th
                  onClick={() => handleSort('tier')}
                  style={{
                    padding: '12px 16px',
                    textAlign: 'left',
                    fontWeight: 600,
                    color: '#5c6066',
                    cursor: 'pointer',
                    userSelect: 'none',
                    whiteSpace: 'nowrap'
                  }}
                >
                  Tier
                  {sort.column === 'tier' && (
                    <span style={{ marginLeft: 4, color: '#5e6ad2' }}>
                      {sort.direction === 'asc' ? '↑' : '↓'}
                    </span>
                  )}
                </th>
                <th
                  onClick={() => handleSort('riskScore')}
                  style={{
                    padding: '12px 16px',
                    textAlign: 'left',
                    fontWeight: 600,
                    color: '#5c6066',
                    cursor: 'pointer',
                    userSelect: 'none',
                    whiteSpace: 'nowrap'
                  }}
                >
                  Risk Score
                  {sort.column === 'riskScore' && (
                    <span style={{ marginLeft: 4, color: '#5e6ad2' }}>
                      {sort.direction === 'asc' ? '↑' : '↓'}
                    </span>
                  )}
                </th>
                <th style={{
                  padding: '12px 16px',
                  textAlign: 'left',
                  fontWeight: 600,
                  color: '#5c6066',
                  whiteSpace: 'nowrap'
                }}>
                  Grade
                </th>
                <th
                  onClick={() => handleSort('status')}
                  style={{
                    padding: '12px 16px',
                    textAlign: 'left',
                    fontWeight: 600,
                    color: '#5c6066',
                    cursor: 'pointer',
                    userSelect: 'none',
                    whiteSpace: 'nowrap'
                  }}
                >
                  Status
                  {sort.column === 'status' && (
                    <span style={{ marginLeft: 4, color: '#5e6ad2' }}>
                      {sort.direction === 'asc' ? '↓' : '↑'}
                    </span>
                  )}
                </th>
                <th
                  onClick={() => handleSort('lastSync')}
                  style={{
                    padding: '12px 16px',
                    textAlign: 'left',
                    fontWeight: 600,
                    color: '#5c6066',
                    cursor: 'pointer',
                    userSelect: 'none',
                    whiteSpace: 'nowrap'
                  }}
                >
                  Last Sync
                  {sort.column === 'lastSync' && (
                    <span style={{ marginLeft: 4, color: '#5e6ad2' }}>
                      {sort.direction === 'asc' ? '↑' : '↓'}
                    </span>
                  )}
                </th>
                <th style={{
                  padding: '12px 16px',
                  textAlign: 'left',
                  fontWeight: 600,
                  color: '#5c6066',
                  whiteSpace: 'nowrap'
                }}>
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {vendors.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    style={{
                      padding: '32px',
                      textAlign: 'center',
                      color: '#5c6066'
                    }}
                  >
                    No vendors found matching the current filters
                  </td>
                </tr>
              ) : (
                vendors.map((vendor) => {
                  const riskInfo = getRiskColor(vendor.riskScore);
                  const isSyncing = syncingVendors.has(vendor.id) || vendor.status === 'syncing';

                  return (
                    <tr
                      key={vendor.id}
                      onClick={() => onNavigate?.(`/vendors/${vendor.id}`)}
                      style={{
                        borderBottom: '1px solid #ebecf0',
                        cursor: 'pointer',
                        transition: 'background-color 0.15s ease'
                      }}
                      onMouseOver={(e) => {
                        e.currentTarget.style.backgroundColor = '#F9FAFB';
                      }}
                      onMouseOut={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                    >
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{
                          fontWeight: 500,
                          color: '#0b0c0e',
                          marginBottom: 2
                        }}>
                          {vendor.name}
                        </div>
                        {vendor.description && (
                          <div style={{
                            fontSize: 11,
                            color: '#5c6066',
                            maxWidth: 200,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }}>
                            {vendor.description}
                          </div>
                        )}
                      </td>

                      <td style={{ padding: '12px 16px' }}>
                        <span style={{
                          display: 'inline-block',
                          padding: '4px 8px',
                          backgroundColor: `${getTierColor(vendor.tier)}20`,
                          color: getTierColor(vendor.tier),
                          borderRadius: 4,
                          fontSize: 11,
                          fontWeight: 600,
                          textTransform: 'capitalize'
                        }}>
                          {vendor.tier || 'Unknown'}
                        </span>
                      </td>

                      <td style={{ padding: '12px 16px' }}>
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8
                        }}>
                          <div style={{
                            width: 4,
                            height: 32,
                            backgroundColor: riskInfo.color,
                            borderRadius: 2
                          }} />
                          <div>
                            <div style={{
                              fontSize: 14,
                              fontWeight: 600,
                              color: '#0b0c0e'
                            }}>
                              {vendor.riskScore}/100
                            </div>
                            <div style={{
                              fontSize: 11,
                              color: riskInfo.color,
                              fontWeight: 500
                            }}>
                              {riskInfo.label}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td style={{ padding: '12px 16px' }}>
                        <span style={{
                          display: 'inline-block',
                          padding: '4px 8px',
                          backgroundColor: '#F3F4F6',
                          color: '#5c6066',
                          borderRadius: 4,
                          fontSize: 12,
                          fontWeight: 600
                        }}>
                          {vendor.grade || 'N/A'}
                        </span>
                      </td>

                      <td style={{ padding: '12px 16px' }}>
                        <StatusIcon status={vendor.status} size={14} />
                      </td>

                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ fontSize: 12, color: '#5c6066' }}>
                          {formatTimestamp(vendor.lastSync)}
                        </div>
                      </td>

                      <td style={{ padding: '12px 16px' }}>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            triggerSync(vendor.id, vendor.name);
                          }}
                          disabled={isSyncing}
                          style={{
                            padding: '6px 12px',
                            backgroundColor: isSyncing ? '#F3F4F6' : '#5e6ad2',
                            color: isSyncing ? '#8b9098' : '#FFFFFF',
                            border: 'none',
                            borderRadius: 6,
                            cursor: isSyncing ? 'not-allowed' : 'pointer',
                            fontSize: 11,
                            fontWeight: 500
                          }}
                        >
                          {isSyncing ? 'Syncing...' : 'Sync Now'}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {vendors.length > 0 && (
          <div style={{
            padding: '16px',
            borderTop: '1px solid #ebecf0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 12
          }}>
            <div style={{ fontSize: 12, color: '#5c6066' }}>
              Showing {page * pageSize + 1}-{Math.min((page + 1) * pageSize, vendors.length)} of {vendors.length} vendors
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => setPage(Math.max(0, page - 1))}
                disabled={page === 0}
                style={{
                  padding: '6px 12px',
                  backgroundColor: page === 0 ? '#F3F4F6' : '#FFFFFF',
                  color: page === 0 ? '#8b9098' : '#5c6066',
                  border: '1px solid #d7d9de',
                  borderRadius: 6,
                  cursor: page === 0 ? 'not-allowed' : 'pointer',
                  fontSize: 12,
                  fontWeight: 500
                }}
              >
                Previous
              </button>

              <div style={{
                padding: '6px 12px',
                backgroundColor: '#5e6ad2',
                color: '#FFFFFF',
                borderRadius: 6,
                fontSize: 12,
                fontWeight: 600
              }}>
                {page + 1}
              </div>

              <button
                onClick={() => setPage(page + 1)}
                disabled={!statistics?.hasMore}
                style={{
                  padding: '6px 12px',
                  backgroundColor: !statistics?.hasMore ? '#F3F4F6' : '#FFFFFF',
                  color: !statistics?.hasMore ? '#8b9098' : '#5c6066',
                  border: '1px solid #d7d9de',
                  borderRadius: 6,
                  cursor: !statistics?.hasMore ? 'not-allowed' : 'pointer',
                  fontSize: 12,
                  fontWeight: 500
                }}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default VendorPortfolioDashboard;
