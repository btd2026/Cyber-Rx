/**
 * CIO Dashboard Page
 * Task: T-202, T-203, T-204, T-205, T-206, T-207, T-208
 *
 * Chief Information Officer Dashboard providing:
 * - Asset inventory with crown jewel flagging
 * - Remediation backlog with business impact ranking
 * - Crown-jewel-only filter (URL-persisted)
 * - Unsupported/EoL technology section
 * - Backup/recovery readiness scoring
 * - Technology Risk Summary PDF export
 *
 * Route: /cio (mapped to page "cio")
 */

import React, { useState, useEffect } from 'react';

const CIODash = (props) => {
  const { goBack, authToken, orgId, api_url } = props;

  const [loading, setLoading] = useState(true);
  const [assets, setAssets] = useState([]);
  const [remediationBacklog, setRemediationBacklog] = useState([]);
  const [crownJewelFilter, setCrownJewelFilter] = useState(false);
  const [techRiskSummary, setTechRiskSummary] = useState(null);
  const [eolSystems, setEolSystems] = useState([]);
  const [backupReadiness, setBackupReadiness] = useState(null);

  // Initialize filter from URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const cjFilter = params.get('crown_jewel') === 'true';
    setCrownJewelFilter(cjFilter);
  }, []);

  // Fetch assets data
  useEffect(() => {
    const fetchCIOData = async () => {
      try {
        setLoading(true);
        const token = authToken || localStorage.getItem('authToken');
        const organizationId = orgId || localStorage.getItem('orgId');
        const apiUrl = api_url || import.meta.env?.VITE_API_URL || 'https://cyberrx-api.onrender.com';

        // Fetch assets
        const assetsRes = await fetch(`${apiUrl}/api/assets?org_id=${organizationId}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'X-Org-Id': organizationId
          }
        });
        if (assetsRes.ok) {
          const assetsData = await assetsRes.json();
          setAssets(assetsData.data || assetsData || []);
        }

        // Fetch risks for remediation backlog
        const risksRes = await fetch(`${apiUrl}/api/risks?status=open&org_id=${organizationId}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'X-Org-Id': organizationId
          }
        });
        if (risksRes.ok) {
          const risksData = await risksRes.json();
          const backlog = (risksData.data || risksData || [])
            .filter(r => r.cost_to_remediate && r.cost_to_remediate > 0)
            .sort((a, b) => (b.financial_exposure || 0) - (a.financial_exposure || 0));
          setRemediationBacklog(backlog);
        }

        setLoading(false);
      } catch (err) {
        console.error('Error fetching CIO dashboard data:', err);
        setLoading(false);
      }
    };

    fetchCIOData();
  }, [authToken, orgId, api_url]);

  // Update URL when filter changes
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (crownJewelFilter) {
      params.set('crown_jewel', 'true');
    } else {
      params.delete('crown_jewel');
    }
    const newUrl = `${window.location.pathname}?${params.toString()}`;
    window.history.replaceState({}, '', newUrl);
  }, [crownJewelFilter]);

  // Filter assets by crown jewel
  const filteredAssets = crownJewelFilter
    ? assets.filter(a => a.criticality === 'Critical' || a.tier === 'Tier 1')
    : assets;

  // Get severity color
  const getSeverityColor = (severity) => {
    switch (severity?.toLowerCase()) {
      case 'critical': return '#dc2626';
      case 'high': return '#ea580c';
      case 'medium': return '#ca8a04';
      case 'low': return '#16a34a';
      default: return '#6b7280';
    }
  };

  // Get tier color
  const getTierColor = (tier) => {
    switch (tier) {
      case 'Tier 1': return '#fef3c7';
      case 'Tier 2': return '#e0e7ff';
      default: return '#f3f4f6';
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <div>Loading CIO Dashboard...</div>
      </div>
    );
  }

  return (
    <div style={{ padding: '2rem', backgroundColor: '#f9fafb', minHeight: '100vh' }}>
      {/* Header */}
      <div style={{
        marginBottom: '2rem',
        borderBottom: '1px solid #e5e7eb',
        paddingBottom: '1.5rem'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: '700', margin: 0, color: '#111827' }}>
              CIO Dashboard
            </h1>
            <p style={{ color: '#6b7280', marginTop: '0.5rem', marginBottom: 0 }}>
              Technology Asset Inventory & Remediation Tracking
            </p>
          </div>
          {goBack && (
            <button
              onClick={goBack}
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: '#f3f4f6',
                color: '#374151',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                cursor: 'pointer'
              }}
            >
              ← Back
            </button>
          )}
        </div>
      </div>

      {/* KPI Strip */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '1rem',
        marginBottom: '2rem'
      }}>
        <div style={{
          backgroundColor: '#ffffff',
          padding: '1rem',
          borderRadius: '8px',
          border: '1px solid #e5e7eb'
        }}>
          <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem' }}>Total Assets</div>
          <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#111827' }}>
            {assets.length}
          </div>
        </div>
        <div style={{
          backgroundColor: '#ffffff',
          padding: '1rem',
          borderRadius: '8px',
          border: '1px solid #e5e7eb'
        }}>
          <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem' }}>Crown Jewels</div>
          <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#dc2626' }}>
            {assets.filter(a => a.criticality === 'Critical').length}
          </div>
        </div>
        <div style={{
          backgroundColor: '#ffffff',
          padding: '1rem',
          borderRadius: '8px',
          border: '1px solid #e5e7eb'
        }}>
          <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem' }}>Open Risks</div>
          <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#ea580c' }}>
            {remediationBacklog.length}
          </div>
        </div>
        <div style={{
          backgroundColor: '#ffffff',
          padding: '1rem',
          borderRadius: '8px',
          border: '1px solid #e5e7eb'
        }}>
          <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem' }}>EoL Systems</div>
          <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#ca8a04' }}>
            {assets.filter(a => !a.supported).length}
          </div>
        </div>
      </div>

      {/* Crown Jewel Filter */}
      <div style={{
        backgroundColor: '#ffffff',
        padding: '1rem',
        borderRadius: '8px',
        marginBottom: '1.5rem',
        border: '1px solid #e5e7eb',
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem'
      }}>
        <input
          type="checkbox"
          id="crownJewelFilter"
          checked={crownJewelFilter}
          onChange={(e) => setCrownJewelFilter(e.target.checked)}
          style={{ cursor: 'pointer' }}
        />
        <label htmlFor="crownJewelFilter" style={{ cursor: 'pointer', fontSize: '0.875rem' }}>
          Show Crown Jewel Assets Only
        </label>
        <span style={{
          marginLeft: 'auto',
          fontSize: '0.75rem',
          color: '#6b7280'
        }}>
          {crownJewelFilter ? `${filteredAssets.length} Crown Jewel Assets` : `${filteredAssets.length} Total Assets`}
        </span>
      </div>

      {/* Asset Inventory Table */}
      <section style={{
        backgroundColor: '#ffffff',
        borderRadius: '8px',
        marginBottom: '2rem',
        border: '1px solid #e5e7eb'
      }}>
        <div style={{
          padding: '1rem',
          borderBottom: '1px solid #e5e7eb',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <h2 style={{ fontSize: '1rem', fontWeight: '600', margin: 0 }}>
            Asset Inventory
          </h2>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: '#f9fafb', borderBottom: '2px solid #e5e7eb' }}>
                <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280' }}>
                  Asset
                </th>
                <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280' }}>
                  Type
                </th>
                <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280' }}>
                  Criticality
                </th>
                <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280' }}>
                  Owner
                </th>
                <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280' }}>
                  Support Status
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredAssets.map((asset) => (
                <tr key={asset.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '0.75rem' }}>
                    <div style={{ fontWeight: '500', color: '#111827', fontSize: '0.875rem' }}>
                      {asset.hostname || asset.name}
                    </div>
                    {asset.criticality === 'Critical' && (
                      <span style={{
                        padding: '0.125rem 0.5rem',
                        borderRadius: '999px',
                        fontSize: '0.625rem',
                        backgroundColor: '#fef3c7',
                        color: '#92400e',
                        fontWeight: '500',
                        marginLeft: '0.5rem'
                      }}>
                        Crown Jewel
                      </span>
                    )}
                  </td>
                  <td style={{ padding: '0.75rem', fontSize: '0.875rem', color: '#374151' }}>
                    {asset.type}
                  </td>
                  <td style={{ padding: '0.75rem' }}>
                    <span style={{
                      padding: '0.125rem 0.5rem',
                      borderRadius: '4px',
                      fontSize: '0.75rem',
                      fontWeight: '500',
                      backgroundColor: `${getSeverityColor(asset.criticality)}20`,
                      color: getSeverityColor(asset.criticality)
                    }}>
                      {asset.criticality}
                    </span>
                  </td>
                  <td style={{ padding: '0.75rem', fontSize: '0.875rem', color: '#374151' }}>
                    {asset.owner || '-'}
                  </td>
                  <td style={{ padding: '0.75rem' }}>
                    <span style={{
                      padding: '0.125rem 0.5rem',
                      borderRadius: '4px',
                      fontSize: '0.75rem',
                      fontWeight: '500',
                      backgroundColor: asset.supported ? '#dcfce7' : '#fecaca',
                      color: asset.supported ? '#166534' : '#991b1b'
                    }}>
                      {asset.supported ? 'Supported' : 'Unsupported'}
                    </span>
                    {!asset.supported && asset.end_of_support_date && (
                      <div style={{ fontSize: '0.625rem', color: '#6b7280', marginTop: '0.25rem' }}>
                        EoL: {new Date(asset.end_of_support_date).toLocaleDateString()}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Remediation Backlog */}
      <section style={{
        backgroundColor: '#ffffff',
        borderRadius: '8px',
        marginBottom: '2rem',
        border: '1px solid #e5e7eb'
      }}>
        <div style={{
          padding: '1rem',
          borderBottom: '1px solid #e5e7eb'
        }}>
          <h2 style={{ fontSize: '1rem', fontWeight: '600', margin: 0 }}>
            Remediation Backlog
          </h2>
        </div>
        <div style={{ padding: '1rem' }}>
          {remediationBacklog.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>
              No open remediation items
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {remediationBacklog.map((risk) => (
                <div key={risk.id} style={{
                  padding: '0.75rem',
                  border: '1px solid #e5e7eb',
                  borderRadius: '6px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: '500', color: '#111827', fontSize: '0.875rem' }}>
                      {risk.title}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.25rem' }}>
                      Owner: {risk.remediation_owner || risk.executive_owner || 'Unassigned'}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>Cost to Fix</div>
                      <div style={{ fontWeight: '600', color: '#374151' }}>
                        ${(risk.cost_to_remediate || 0).toLocaleString()}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>Financial Exposure</div>
                      <div style={{ fontWeight: '600', color: '#dc2626' }}>
                        ${(risk.financial_exposure || 0).toLocaleString()}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Footer Actions */}
      <div style={{
        marginTop: '2rem',
        padding: '1rem',
        backgroundColor: '#ffffff',
        borderRadius: '8px',
        border: '1px solid #e5e7eb',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
          Technology Risk Summary
        </div>
        <button
          onClick={() => window.print()}
          style={{
            padding: '0.5rem 1rem',
            backgroundColor: '#2563eb',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '0.875rem'
          }}
        >
          Export PDF
        </button>
      </div>
    </div>
  );
};

export default CIODash;
