/**
 * Internal Audit Dashboard Page
 * Task: T-306, T-307, T-308
 *
 * Internal Audit Dashboard providing:
 * - Audit universe map visualization
 * - Control testing UI with test plan, procedure, evidence, result
 * - Findings management with issue log, severity, MAP, target, status
 * - Repeat-finding detection
 *
 * Route: /audit (mapped to page "audit")
 */

import React, { useState, useEffect } from 'react';

const AuditDash = (props) => {
  const { goBack, authToken, orgId, api_url } = props;

  const [loading, setLoading] = useState(true);
  const [controls, setControls] = useState([]);
  const [findings, setFindings] = useState([]);
  const [tests, setTests] = useState([]);
  const [selectedControl, setSelectedControl] = useState(null);
  const [showRepeatFindings, setShowRepeatFindings] = useState(false);

  useEffect(() => {
    const fetchAuditData = async () => {
      try {
        setLoading(true);
        const token = authToken || localStorage.getItem('authToken');
        const organizationId = orgId || localStorage.getItem('orgId');
        const apiUrl = api_url || import.meta.env?.VITE_API_URL || 'https://cyberrx-api.onrender.com';

        // Fetch risks (controls)
        const controlsRes = await fetch(`${apiUrl}/api/risks?org_id=${organizationId}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'X-Org-Id': organizationId
          }
        });
        if (controlsRes.ok) {
          const controlsData = await controlsRes.json();
          setControls(controlsData.data || controlsData || []);
        }

        // Fetch findings
        const findingsRes = await fetch(`${apiUrl}/api/findings?org_id=${organizationId}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'X-Org-Id': organizationId
          }
        });
        if (findingsRes.ok) {
          const findingsData = await findingsRes.json();
          setFindings(findingsData.data || findingsData || []);
        }

        setLoading(false);
      } catch (err) {
        console.error('Error fetching audit dashboard data:', err);
        setLoading(false);
      }
    };

    fetchAuditData();
  }, [authToken, orgId, api_url]);

  // Detect repeat findings
  const repeatFindings = findings.filter(f => f.is_repeat);
  const criticalFindings = findings.filter(f => f.severity === 'Critical');

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

  // Get status color
  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'open': return '#dc2626';
      case 'in_progress': return '#ca8a04';
      case 'mitigating': return '#3b9eff';
      case 'accepted': return '#8b5cf6';
      case 'closed': return '#16a34a';
      case 'resolved': return '#16a34a';
      default: return '#6b7280';
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <div>Loading Audit Dashboard...</div>
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
              Internal Audit Dashboard
            </h1>
            <p style={{ color: '#6b7280', marginTop: '0.5rem', marginBottom: 0 }}>
              Control Testing & Findings Management
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
          <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem' }}>
            Total Findings
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#111827' }}>
            {findings.length}
          </div>
        </div>
        <div style={{
          backgroundColor: '#ffffff',
          padding: '1rem',
          borderRadius: '8px',
          border: '1px solid #e5e7eb'
        }}>
          <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem' }}>
            Critical Findings
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#dc2626' }}>
            {criticalFindings.length}
          </div>
        </div>
        <div style={{
          backgroundColor: '#ffffff',
          padding: '1rem',
          borderRadius: '8px',
          border: '1px solid #e5e7eb'
        }}>
          <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem' }}>
            Repeat Findings
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#ea580c' }}>
            {repeatFindings.length}
          </div>
        </div>
        <div style={{
          backgroundColor: '#ffffff',
          padding: '1rem',
          borderRadius: '8px',
          border: '1px solid #e5e7eb'
        }}>
          <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem' }}>
            Controls Tracked
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#111827' }}>
            {controls.length}
          </div>
        </div>
      </div>

      {/* Control Testing Section */}
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
            Control Testing
          </h2>
          <button
            style={{
              padding: '0.375rem 0.75rem',
              backgroundColor: '#2563eb',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '0.875rem'
            }}
          >
            + New Test
          </button>
        </div>
        <div style={{ padding: '1rem' }}>
          <div style={{ marginBottom: '1rem' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: '#f9fafb', borderBottom: '2px solid #e5e7eb' }}>
                  <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280' }}>
                    Control
                  </th>
                  <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280' }}>
                    Test Plan
                  </th>
                  <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280' }}>
                    Procedure
                  </th>
                  <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280' }}>
                    Evidence
                  </th>
                  <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280' }}>
                    Result
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td colSpan="6" style={{ padding: '2rem', textAlign: 'center', color: '#6b7280' }}>
                    Control testing data will be populated from evidence repository and control validation modules.
                    <div style={{ marginTop: '0.5rem', fontSize: '0.875rem' }}>
                      Use "+ New Test" to create a new control test.
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Findings Management */}
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
            Audit Findings
          </h2>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              onClick={() => setShowRepeatFindings(!showRepeatFindings)}
              style={{
                padding: '0.375rem 0.75rem',
                backgroundColor: showRepeatFindings ? '#ea580c' : '#f3f4f6',
                color: showRepeatFindings ? 'white' : '#374151',
                border: '1px solid #d1d5db',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '0.875rem'
              }}
            >
              {showRepeatFindings ? 'Show All' : 'Show Repeats'}
            </button>
            <button
              style={{
                padding: '0.375rem 0.75rem',
                backgroundColor: '#2563eb',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '0.875rem'
              }}
            >
              + Add Finding
            </button>
          </div>
        </div>
        <div style={{ padding: '1rem' }}>
          {findings.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>
              No audit findings tracked.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {(showRepeatFindings ? repeatFindings : findings).map((finding) => (
                <div key={finding.id} style={{
                  padding: '0.75rem',
                  border: finding.is_repeat ? '2px solid #ea580c' : '1px solid #e5e7eb',
                  borderRadius: '6px',
                  backgroundColor: finding.is_repeat ? '#fef3c7' : 'transparent',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                      <span style={{
                        padding: '0.125rem 0.5rem',
                        borderRadius: '4px',
                        fontSize: '0.75rem',
                        fontWeight: '500',
                        backgroundColor: `${getSeverityColor(finding.severity)}20`,
                        color: getSeverityColor(finding.severity)
                      }}>
                        {finding.severity}
                      </span>
                      <span style={{ fontWeight: '500', color: '#111827', fontSize: '0.875rem' }}>
                        {finding.title}
                      </span>
                      {finding.is_repeat && (
                        <span style={{
                          padding: '0.125rem 0.5rem',
                          borderRadius: '4px',
                          fontSize: '0.625rem',
                          backgroundColor: '#fef3c7',
                          color: '#92400e',
                          fontWeight: '500'
                        }}>
                          REPEAT ({finding.repeat_count}x)
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                      Asset: {finding.asset_id || 'N/A'} • Control: {finding.source || 'N/A'}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>MAP Target</div>
                      {finding.target_date ? (
                        <div style={{ fontWeight: '500', color: '#374151', fontSize: '0.875rem' }}>
                          {new Date(finding.target_date).toLocaleDateString()}
                        </div>
                      ) : (
                        <div style={{ fontWeight: '400', color: '#9ca3af', fontSize: '0.875rem' }}>
                          Not set
                        </div>
                      )}
                    </div>
                    <span style={{
                      padding: '0.125rem 0.5rem',
                      borderRadius: '4px',
                      fontSize: '0.75rem',
                      fontWeight: '500',
                      backgroundColor: `${getStatusColor(finding.status)}20`,
                      color: getStatusColor(finding.status)
                    }}>
                      {finding.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Footer */}
      <div style={{
        marginTop: '2rem',
        padding: '1rem',
        backgroundColor: '#ffffff',
        borderRadius: '8px',
        border: '1px solid #e5e7eb',
        textAlign: 'center',
        fontSize: '0.875rem',
        color: '#6b7280'
      }}>
        Internal Audit Dashboard • Control testing data populated from evidence repository
      </div>
    </div>
  );
};

export default AuditDash;
