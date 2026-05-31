/**
 * Mobile-Responsive Vendor Portfolio Dashboard
 *
 * Enhanced version with full mobile support including:
 * - Responsive layouts
 * - Touch gestures
 * - Mobile card view
 * - Bottom navigation
 * - Pull-to-refresh
 *
 * @param {string} props.api_url - API base URL
 * @param {string} props.authToken - Authentication token
 * @param {string} props.orgId - Organization ID
 * @param {function} props.onNavigate - Navigation callback
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import RiskDistributionWidget from '../components/dashboard/RiskDistributionWidget';
import ConnectorHealthWidget from '../components/dashboard/ConnectorHealthWidget';
import RecentAlertsWidget from '../components/dashboard/RecentAlertsWidget';
import StatusIcon from '../components/atoms/StatusIcon';
import VendorCard from '../components/VendorCard';
import MobileHeader from '../components/MobileHeader';
import MobileSidebar from '../components/MobileSidebar';
import BottomNavigation from '../components/BottomNavigation';
import useResponsive from '../hooks/useResponsive';
import useTouchGestures from '../hooks/useTouchGestures';

const VendorPortfolioDashboardResponsive = ({ api_url, authToken, orgId, onNavigate }) => {
  // Responsive state
  const { isMobile, isTablet, isDesktop } = useResponsive();

  // Mobile UI state
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

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
  const pageSize = isMobile ? 20 : 50;

  // Data state
  const [vendors, setVendors] = useState([]);
  const [statistics, setStatistics] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [syncingVendors, setSyncingVendors] = useState(new Set());

  // Touch gestures for pull-to-refresh
  const { touchGesturesRef, isPulling, pullDistance } = useTouchGestures({
    onPullToRefresh: handlePullToRefresh
  });

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
        setRefreshing(false);
      }
    };

    fetchData();
  }, [orgId, filters, sort, page, api_url, authToken]);

  // Handle pull-to-refresh
  async function handlePullToRefresh() {
    setRefreshing(true);
    setPage(0);
    // Refetch is handled by the useEffect dependency change
  }

  // Trigger manual sync for a vendor
  const triggerSync = async (vendor) => {
    if (!vendor?.id || !orgId) return;

    setSyncingVendors(prev => new Set(prev).add(vendor.id));

    try {
      const baseUrl = api_url || import.meta.env?.VITE_API_URL || 'https://cyberrx-api.onrender.com';

      const response = await fetch(
        `${baseUrl}/api/vendors/${vendor.id}/sync`,
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
        throw new Error(`Sync failed for ${vendor.name}`);
      }

      const result = await response.json();

      if (result.success) {
        // Refresh vendors list
        setVendors(prev => prev.map(v =>
          v.id === vendor.id
            ? { ...v, status: 'syncing', lastSync: new Date().toISOString() }
            : v
        ));
      }
    } catch (err) {
      console.error('Sync error:', err);
      alert(`Failed to sync ${vendor.name}: ${err.message}`);
    } finally {
      setSyncingVendors(prev => {
        const next = new Set(prev);
        next.delete(vendor.id);
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
    setPage(0);
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
    return colors[tier?.toLowerCase()] || '#6B7280';
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

  // Calculate active filters count
  const activeFiltersCount = Object.values(filters).filter(
    v => v !== 'all' && v !== ''
  ).length;

  // Loading state
  if (loading) {
    return (
      <div style={{
        padding: isMobile ? '16px' : '2rem',
        textAlign: 'center',
        color: '#6B7280',
        backgroundColor: '#F8FAFC',
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16
      }}>
        <div style={{
          display: 'inline-block',
          width: isMobile ? 32 : 40,
          height: isMobile ? 32 : 40,
          border: '3px solid #E5E7EB',
          borderTopColor: '#3B82F6',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }} />
        <div style={{ fontSize: isMobile ? 14 : 16 }}>
          Loading vendor portfolio...
        </div>
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
        padding: isMobile ? '16px' : '2rem',
        margin: isMobile ? 16 : 24,
        textAlign: 'center',
        backgroundColor: '#FEF2F2',
        border: '1px solid #FECACA',
        borderRadius: 8
      }}>
        <div style={{
          fontSize: isMobile ? 16 : 18,
          fontWeight: 600,
          color: '#DC2626',
          marginBottom: 8
        }}>
          Error Loading Dashboard
        </div>
        <div style={{ fontSize: isMobile ? 12 : 14, color: '#991B1B', marginBottom: 16 }}>
          {error}
        </div>
        <button
          onClick={() => window.location.reload()}
          style={{
            padding: isMobile ? '10px 16px' : '8px 16px',
            backgroundColor: '#DC2626',
            color: '#FFFFFF',
            border: 'none',
            borderRadius: 6,
            cursor: 'pointer',
            fontSize: isMobile ? 14 : 14,
            fontWeight: 600,
            minHeight: 44
          }}
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div
      ref={touchGesturesRef}
      style={{
        backgroundColor: '#F8FAFC',
        minHeight: '100vh',
        paddingBottom: isMobile ? 70 : 24
      }}
    >
      {/* Mobile Header */}
      {isMobile && (
        <>
          <MobileHeader
            title="Vendor Portfolio"
            onMenuClick={() => setSidebarOpen(true)}
            onRefresh={handlePullToRefresh}
            refreshing={refreshing}
            badge={vendors.length > 0 ? `${vendors.length} vendors` : undefined}
          />
          <MobileSidebar
            isOpen={sidebarOpen}
            onClose={() => setSidebarOpen(false)}
            onNavigate={onNavigate}
            currentRoute="/dashboard"
          />
        </>
      )}

      {/* Pull-to-Refresh Indicator */}
      {isPulling && (
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          padding: '20px 16px 10px',
          backgroundColor: '#F8FAFC'
        }}>
          <div style={{
            width: 32,
            height: 32,
            border: '3px solid #E5E7EB',
            borderTopColor: '#3B82F6',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            transform: `rotate(${pullDistance * 3.6}deg)`
          }} />
        </div>
      )}

      {/* Main Content */}
      <div style={{
        padding: isMobile ? '16px' : '24px',
        paddingTop: isMobile ? '16px' : '24px'
      }}>
        {/* Header - Desktop Only */}
        {!isMobile && (
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
                color: '#111827',
                margin: 0,
                marginBottom: 4
              }}>
                Vendor Portfolio Dashboard
              </h1>
              <p style={{
                fontSize: 14,
                color: '#6B7280',
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
                  color: vendors.length ? '#374151' : '#9CA3AF',
                  border: '1px solid #D1D5DB',
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
        )}

        {/* Dashboard Widgets */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile
            ? '1fr'
            : isTablet
            ? 'repeat(2, 1fr)'
            : 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: isMobile ? 12 : 16,
          marginBottom: isMobile ? 16 : 24
        }}>
          <RiskDistributionWidget vendors={vendors} mobile={isMobile} />
          <ConnectorHealthWidget
            vendors={vendors}
            statistics={statistics}
            mobile={isMobile}
          />
          <RecentAlertsWidget
            alerts={alerts}
            onAcknowledge={acknowledgeAlert}
            orgId={orgId}
            mobile={isMobile}
          />
        </div>

        {/* Filters */}
        <div style={{
          backgroundColor: '#FFFFFF',
          padding: isMobile ? 12 : 16,
          borderRadius: 8,
          border: '1px solid #E5E7EB',
          marginBottom: isMobile ? 12 : 16
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: isMobile ? 8 : 12
          }}>
            <div style={{ fontSize: isMobile ? 13 : 14, fontWeight: 600, color: '#111827' }}>
              Filters
              {activeFiltersCount > 0 && (
                <span style={{
                  marginLeft: 8,
                  padding: '2px 8px',
                  backgroundColor: '#3B82F6',
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
                  color: '#6B7280',
                  border: '1px solid #D1D5DB',
                  borderRadius: 4,
                  cursor: 'pointer',
                  fontSize: 12,
                  fontWeight: 500,
                  minHeight: 32
                }}
              >
                Clear All
              </button>
            )}
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: isMobile
              ? '1fr'
              : isTablet
              ? 'repeat(2, 1fr)'
              : 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: isMobile ? 8 : 12
          }}>
            {/* Search */}
            <div>
              <label style={{
                display: 'block',
                fontSize: 12,
                fontWeight: 500,
                color: '#374151',
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
                  padding: isMobile ? '10px 12px' : '8px 12px',
                  border: '1px solid #D1D5DB',
                  borderRadius: 6,
                  fontSize: 13,
                  boxSizing: 'border-box',
                  minHeight: 44
                }}
              />
            </div>

            {/* Tier Filter */}
            <div>
              <label style={{
                display: 'block',
                fontSize: 12,
                fontWeight: 500,
                color: '#374151',
                marginBottom: 4
              }}>
                Vendor Tier
              </label>
              <select
                value={filters.tier}
                onChange={(e) => handleFilterChange('tier', e.target.value)}
                style={{
                  width: '100%',
                  padding: isMobile ? '10px 12px' : '8px 12px',
                  border: '1px solid #D1D5DB',
                  borderRadius: 6,
                  fontSize: 13,
                  backgroundColor: '#FFFFFF',
                  boxSizing: 'border-box',
                  minHeight: 44
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
                color: '#374151',
                marginBottom: 4
              }}>
                Risk Level
              </label>
              <select
                value={filters.riskLevel}
                onChange={(e) => handleFilterChange('riskLevel', e.target.value)}
                style={{
                  width: '100%',
                  padding: isMobile ? '10px 12px' : '8px 12px',
                  border: '1px solid #D1D5DB',
                  borderRadius: 6,
                  fontSize: 13,
                  backgroundColor: '#FFFFFF',
                  boxSizing: 'border-box',
                  minHeight: 44
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
                color: '#374151',
                marginBottom: 4
              }}>
                Connection Status
              </label>
              <select
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                style={{
                  width: '100%',
                  padding: isMobile ? '10px 12px' : '8px 12px',
                  border: '1px solid #D1D5DB',
                  borderRadius: 6,
                  fontSize: 13,
                  backgroundColor: '#FFFFFF',
                  boxSizing: 'border-box',
                  minHeight: 44
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

        {/* Vendors - Card View (Mobile) or Table (Desktop) */}
        <div style={{
          backgroundColor: '#FFFFFF',
          borderRadius: 8,
          border: '1px solid #E5E7EB',
          overflow: 'hidden'
        }}>
          {/* Header */}
          <div style={{
            padding: isMobile ? 12 : 16,
            borderBottom: '1px solid #E5E7EB',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div style={{ fontSize: isMobile ? 14 : 14, fontWeight: 600, color: '#111827' }}>
              Vendors ({vendors.length})
            </div>
          </div>

          {/* Mobile Card View */}
          {isMobile ? (
            <div style={{ padding: isMobile ? 12 : 16 }}>
              {vendors.length === 0 ? (
                <div style={{
                  padding: '32px 16px',
                  textAlign: 'center',
                  color: '#6B7280',
                  fontSize: 13
                }}>
                  No vendors found matching the current filters
                </div>
              ) : (
                vendors.map((vendor) => (
                  <VendorCard
                    key={vendor.id}
                    vendor={vendor}
                    onSync={triggerSync}
                    onClick={(vendor) => onNavigate?.(`/vendors/${vendor.id}`)}
                    syncing={syncingVendors.has(vendor.id)}
                  />
                ))
              )}
            </div>
          ) : (
            /* Desktop Table View */
            <>
              <div style={{ overflowX: 'auto' }}>
                <table style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  fontSize: 13
                }}>
                  <thead>
                    <tr style={{
                      backgroundColor: '#F9FAFB',
                      borderBottom: '1px solid #E5E7EB'
                    }}>
                      <th
                        onClick={() => handleSort('name')}
                        style={{
                          padding: '12px 16px',
                          textAlign: 'left',
                          fontWeight: 600,
                          color: '#374151',
                          cursor: 'pointer',
                          userSelect: 'none',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        Vendor Name
                        {sort.column === 'name' && (
                          <span style={{ marginLeft: 4, color: '#3B82F6' }}>
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
                          color: '#374151',
                          cursor: 'pointer',
                          userSelect: 'none',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        Tier
                        {sort.column === 'tier' && (
                          <span style={{ marginLeft: 4, color: '#3B82F6' }}>
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
                          color: '#374151',
                          cursor: 'pointer',
                          userSelect: 'none',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        Risk Score
                        {sort.column === 'riskScore' && (
                          <span style={{ marginLeft: 4, color: '#3B82F6' }}>
                            {sort.direction === 'asc' ? '↑' : '↓'}
                          </span>
                        )}
                      </th>
                      <th style={{
                        padding: '12px 16px',
                        textAlign: 'left',
                        fontWeight: 600,
                        color: '#374151',
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
                          color: '#374151',
                          cursor: 'pointer',
                          userSelect: 'none',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        Status
                        {sort.column === 'status' && (
                          <span style={{ marginLeft: 4, color: '#3B82F6' }}>
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
                          color: '#374151',
                          cursor: 'pointer',
                          userSelect: 'none',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        Last Sync
                        {sort.column === 'lastSync' && (
                          <span style={{ marginLeft: 4, color: '#3B82F6' }}>
                            {sort.direction === 'asc' ? '↑' : '↓'}
                          </span>
                        )}
                      </th>
                      <th style={{
                        padding: '12px 16px',
                        textAlign: 'left',
                        fontWeight: 600,
                        color: '#374151',
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
                            color: '#6B7280'
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
                              borderBottom: '1px solid #E5E7EB',
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
                                color: '#111827',
                                marginBottom: 2
                              }}>
                                {vendor.name}
                              </div>
                              {vendor.description && (
                                <div style={{
                                  fontSize: 11,
                                  color: '#6B7280',
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
                                    color: '#111827'
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
                                color: '#374151',
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
                              <div style={{ fontSize: 12, color: '#6B7280' }}>
                                {formatTimestamp(vendor.lastSync)}
                              </div>
                            </td>

                            <td style={{ padding: '12px 16px' }}>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  triggerSync(vendor);
                                }}
                                disabled={isSyncing}
                                style={{
                                  padding: '6px 12px',
                                  backgroundColor: isSyncing ? '#F3F4F6' : '#3B82F6',
                                  color: isSyncing ? '#9CA3AF' : '#FFFFFF',
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
            </>
          )}

          {/* Pagination */}
          {vendors.length > 0 && (
            <div style={{
              padding: isMobile ? 12 : 16,
              borderTop: '1px solid #E5E7EB',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 12
            }}>
              <div style={{ fontSize: 12, color: '#6B7280' }}>
                Showing {page * pageSize + 1}-{Math.min((page + 1) * pageSize, vendors.length)} of {vendors.length} vendors
              </div>

              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={() => setPage(Math.max(0, page - 1))}
                  disabled={page === 0}
                  style={{
                    padding: '6px 12px',
                    backgroundColor: page === 0 ? '#F3F4F6' : '#FFFFFF',
                    color: page === 0 ? '#9CA3AF' : '#374151',
                    border: '1px solid #D1D5DB',
                    borderRadius: 6,
                    cursor: page === 0 ? 'not-allowed' : 'pointer',
                    fontSize: 12,
                    fontWeight: 500,
                    minHeight: 36
                  }}
                >
                  Previous
                </button>

                <div style={{
                  padding: '6px 12px',
                  backgroundColor: '#3B82F6',
                  color: '#FFFFFF',
                  borderRadius: 6,
                  fontSize: 12,
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center'
                }}>
                  {page + 1}
                </div>

                <button
                  onClick={() => setPage(page + 1)}
                  disabled={!statistics?.hasMore}
                  style={{
                    padding: '6px 12px',
                    backgroundColor: !statistics?.hasMore ? '#F3F4F6' : '#FFFFFF',
                    color: !statistics?.hasMore ? '#9CA3AF' : '#374151',
                    border: '1px solid #D1D5DB',
                    borderRadius: 6,
                    cursor: !statistics?.hasMore ? 'not-allowed' : 'pointer',
                    fontSize: 12,
                    fontWeight: 500,
                    minHeight: 36
                  }}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Navigation - Mobile Only */}
      {isMobile && (
        <BottomNavigation
          currentRoute="/dashboard"
          onNavigate={onNavigate}
        />
      )}
    </div>
  );
};

export default VendorPortfolioDashboardResponsive;
