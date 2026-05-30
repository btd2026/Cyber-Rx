/**
 * VendorMonitoring Page
 *
 * Main page accessible from navigation showing all vendors with monitoring configured.
 * Displays vendor-level summary and allows drill-down to individual dashboards.
 */

import React, { useState, useEffect } from 'react';
import VendorRiskDashboard from '../components/VendorRiskDashboard';

const VendorMonitoring = ({ authToken, orgId, api_url }) => {
  const [vendors, setVendors] = useState([]);
  const [selectedVendor, setSelectedVendor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchVendors();
  }, [authToken, orgId, api_url]);

  const fetchVendors = async () => {
    try {
      setLoading(true);
      setError(null);

      const apiUrl = api_url || import.meta.env?.VITE_API_URL || 'https://cyberrx-api.onrender.com';
      const token = authToken || localStorage.getItem('authToken');
      const organizationId = orgId || localStorage.getItem('orgId');

      // Fetch organization data to get selected vendors
      const orgRes = await fetch(`${apiUrl}/api/orgs/${organizationId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-Org-Id': organizationId
        }
      });

      if (!orgRes.ok) {
        throw new Error(`HTTP ${orgRes.status}: ${orgRes.statusText}`);
      }

      const orgData = await orgRes.json();
      const org = orgData.success ? orgData.data : orgData;

      // Extract vendor selections from setup_json
      const vendorSel = org.setup_json?.vendorSel || {};
      const selectedVendorIds = Object.keys(vendorSel).filter(id => vendorSel[id]);

      // Map vendor IDs to vendor objects
      const vendorList = selectedVendorIds.map(vid => ({
        id: vid,
        name: vid, // Would be resolved to actual vendor name in production
        lastAssessment: null,
        riskScore: null,
        signalCount: null
      }));

      setVendors(vendorList);
    } catch (err) {
      console.error('Failed to fetch vendors:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVendorSelect = (vendor) => {
    setSelectedVendor(vendor);
  };

  const handleBack = () => {
    setSelectedVendor(null);
  };

  // Loading state
  if (loading) {
    return (
      <div style={{
        padding: '2rem',
        textAlign: 'center',
        color: '#6B7280'
      }}>
        Loading vendor monitoring...
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div style={{
        padding: '2rem',
        textAlign: 'center',
        color: '#EF4545'
      }}>
        <div style={{ marginBottom: 8 }}>Error loading vendor monitoring:</div>
        <div style={{ fontSize: 12, color: '#6B7280' }}>{error}</div>
      </div>
    );
  }

  // No vendors configured
  if (vendors.length === 0) {
    return (
      <div style={{
        padding: '2rem',
        textAlign: 'center',
        backgroundColor: '#F9FAFB',
        borderRadius: 8,
        border: '1px solid #E5E7EB'
      }}>
        <div style={{
          fontSize: 48,
          marginBottom: 16
        }}>
          📊
        </div>
        <h3 style={{
          fontSize: 14,
          fontWeight: 700,
          color: '#111827',
          marginBottom: 8
        }}>
          No Vendors Configured for Monitoring
        </h3>
        <p style={{
          fontSize: 11,
          color: '#6B7280',
          marginBottom: 16
        }}>
          Complete the Setup flow to select vendors and configure monitoring connectors
        </p>
      </div>
    );
  }

  // Show selected vendor dashboard
  if (selectedVendor) {
    return (
      <div>
        {/* Back button */}
        <button
          onClick={handleBack}
          style={{
            marginBottom: 16,
            padding: '6px 12px',
            backgroundColor: '#F3F4F6',
            border: '1px solid #D1D5DB',
            borderRadius: 6,
            color: '#374151',
            cursor: 'pointer',
            fontSize: 10,
            fontWeight: 600
          }}
        >
          ← Back to All Vendors
        </button>

        {/* Vendor dashboard */}
        <VendorRiskDashboard
          vendorId={selectedVendor.id}
          vendorName={selectedVendor.name}
          organizationId={orgId}
          authToken={authToken}
        />
      </div>
    );
  }

  // Show all vendors table
  return (
    <div style={{ padding: '1rem' }}>
      {/* Header */}
      <div style={{
        marginBottom: 24,
        paddingBottom: 16,
        borderBottom: '1px solid #E5E7EB'
      }}>
        <h1 style={{
          fontSize: 24,
          fontWeight: 700,
          color: '#111827',
          marginBottom: 8
        }}>
          Vendor Monitoring
        </h1>
        <p style={{
          fontSize: 12,
          color: '#6B7280',
          marginBottom: 0
        }}>
          Continuous risk monitoring for {vendors.length} vendor(s)
        </p>
      </div>

      {/* Vendors grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
        gap: 16
      }}>
        {vendors.map((vendor) => (
          <div
            key={vendor.id}
            onClick={() => handleVendorSelect(vendor)}
            style={{
              border: '1px solid #E5E7EB',
              borderRadius: 8,
              padding: 16,
              backgroundColor: '#FFFFFF',
              cursor: 'pointer',
              transition: 'border-color 0.2s ease, box-shadow 0.2s ease'
            }}
            onMouseOver={(e) => {
              e.target.style.borderColor = '#2563EB';
              e.target.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1)';
            }}
            onMouseOut={(e) => {
              e.target.style.borderColor = '#E5E7EB';
              e.target.style.boxShadow = 'none';
            }}
          >
            {/* Vendor name */}
            <div style={{
              fontSize: 14,
              fontWeight: 700,
              color: '#111827',
              marginBottom: 8
            }}>
              {vendor.name}
            </div>

            {/* Placeholder for risk score */}
            <div style={{
              fontSize: 12,
              color: '#6B7280',
              marginBottom: 12
            }}>
              {vendor.riskScore !== null ? (
                <div>
                  <div>Risk Score:</div>
                  <div style={{
                    fontSize: 18,
                    fontWeight: 700,
                    color: vendor.riskScore >= 70 ? '#EF4545' :
                           vendor.riskScore >= 40 ? '#F5A623' : '#0FBB80'
                  }}>
                    {vendor.riskScore}
                  </div>
                </div>
              ) : (
                <em>No data available</em>
              )}
            </div>

            {/* Action button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleVendorSelect(vendor);
              }}
              style={{
                width: '100%',
                padding: '6px 12px',
                backgroundColor: '#2563EB',
                border: 'none',
                color: '#FFFFFF',
                borderRadius: 6,
                cursor: 'pointer',
                fontSize: 10,
                fontWeight: 600
              }}
            >
              View Dashboard
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default VendorMonitoring;
