/**
 * Correlated Finding Page
 * Task: T-113
 *
 * Renders the executive narrative for a correlated finding
 * Matches the NASCO F-001 screenshot field-for-field
 *
 * This component is designed to be used within the App.jsx routing system
 * Props:
 *   - findingId: The ID of the finding to display
 *   - goBack: Function to navigate back
 *   - authToken: Authentication token
 *   - orgId: Organization ID
 */

import React, { useState, useEffect } from 'react';

const CorrelatedFinding = (props) => {
  const { findingId, goBack, authToken, orgId, api_url } = props;

  const [narrative, setNarrative] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch the executive narrative for this finding
  useEffect(() => {
    const fetchNarrative = async () => {
      if (!findingId) {
        setError('No finding ID provided');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const token = authToken || localStorage.getItem('authToken');
        const organizationId = orgId || localStorage.getItem('orgId');
        const apiUrl = api_url || import.meta.env?.VITE_API_URL || 'https://cyberrx-api.onrender.com';

        const response = await fetch(`${apiUrl}/api/correlation/narrative/${findingId}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
            'X-Org-Id': organizationId
          },
          body: JSON.stringify({ findingId })
        });

        if (!response.ok) {
          if (response.status === 404) {
            setError('Finding not found. It may have been deleted or you do not have access.');
          } else if (response.status === 403) {
            setError('Access denied. You do not have permission to view this finding.');
          } else {
            throw new Error('Failed to fetch executive narrative');
          }
          return;
        }

        const data = await response.json();
        setNarrative(data);
        setError(null);
      } catch (err) {
        console.error('Error fetching correlated finding:', err);
        setError('Failed to load executive narrative. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchNarrative();
  }, [findingId, authToken, orgId, api_url]);

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

  // Get status badge color
  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'open': return '#dc2626';
      case 'in progress': return '#ca8a04';
      case 'closed': return '#16a34a';
      case 'resolved': return '#16a34a';
      default: return '#6b7280';
    }
  };

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        flexDirection: 'column',
        gap: '1rem'
      }}>
        <div style={{
          width: '40px',
          height: '40px',
          border: '3px solid #e5e7eb',
          borderTopColor: '#2563eb',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }} />
        <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>Loading executive narrative...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        padding: '2rem',
        maxWidth: '800px',
        margin: '0 auto'
      }}>
        <div style={{
          backgroundColor: '#fef2f2',
          border: '1px solid #fecaca',
          borderRadius: '8px',
          padding: '1.5rem',
          marginBottom: '1.5rem'
        }}>
          <h3 style={{
            color: '#dc2626',
            marginTop: 0,
            marginBottom: '0.5rem',
            fontSize: '1.125rem'
          }}>Error Loading Narrative</h3>
          <p style={{ color: '#991b1b', marginBottom: '1rem' }}>{error}</p>
          {goBack && (
            <button
              onClick={goBack}
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: '#dc2626',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '0.875rem'
              }}
            >
              Go Back
            </button>
          )}
        </div>
      </div>
    );
  }

  if (!narrative) {
    return null;
  }

  const { finding, executiveNarrative, correlation } = narrative;

  return (
    <div style={{
      maxWidth: '1200px',
      margin: '0 auto',
      padding: '2rem',
      backgroundColor: '#ffffff',
      minHeight: '100vh'
    }}>
      {/* Header */}
      <div style={{
        marginBottom: '2rem',
        borderBottom: '1px solid #e5e7eb',
        paddingBottom: '1.5rem'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
              <span style={{
                padding: '0.25rem 0.75rem',
                borderRadius: '999px',
                fontSize: '0.75rem',
                fontWeight: '600',
                textTransform: 'uppercase',
                backgroundColor: '#fef3c7',
                color: '#92400e'
              }}>
                Executive Narrative
              </span>
              <span style={{
                padding: '0.25rem 0.75rem',
                borderRadius: '999px',
                fontSize: '0.75rem',
                fontWeight: '600',
                textTransform: 'uppercase',
                backgroundColor: `${getSeverityColor(finding.severity)}20`,
                color: getSeverityColor(finding.severity)
              }}>
                {finding.severity}
              </span>
              <span style={{
                padding: '0.25rem 0.75rem',
                borderRadius: '999px',
                fontSize: '0.75rem',
                fontWeight: '600',
                textTransform: 'uppercase',
                backgroundColor: `${getStatusColor(finding.status)}20`,
                color: getStatusColor(finding.status)
              }}>
                {finding.status}
              </span>
            </div>
            <h1 style={{
              fontSize: '1.5rem',
              fontWeight: '700',
              margin: 0,
              color: '#111827',
              lineHeight: '1.3'
            }}>
              {finding.title}
            </h1>
            <p style={{
              color: '#6b7280',
              marginTop: '0.5rem',
              fontSize: '0.875rem',
              marginBottom: 0
            }}>
              Finding ID: {finding.id} • Discovered: {new Date(finding.discoveredDate).toLocaleDateString()}
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
                cursor: 'pointer',
                fontSize: '0.875rem',
                whiteSpace: 'nowrap'
              }}
            >
              ← Back
            </button>
          )}
        </div>
      </div>

      {/* Executive Summary */}
      <section style={{
        backgroundColor: '#f9fafb',
        borderRadius: '8px',
        padding: '1.5rem',
        marginBottom: '1.5rem',
        border: '1px solid #e5e7eb'
      }}>
        <h2 style={{
          fontSize: '1rem',
          fontWeight: '600',
          marginTop: 0,
          marginBottom: '1rem',
          color: '#374151',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}>
          <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Executive Summary
        </h2>
        <p style={{
          color: '#1f2937',
          lineHeight: '1.6',
          margin: 0,
          fontSize: '0.9375rem'
        }}>
          {executiveNarrative.summary}
        </p>
      </section>

      {/* Two Column Layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
        {/* Left Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

          {/* Business Process */}
          {executiveNarrative.businessProcess && (
            <section style={{
              backgroundColor: '#ffffff',
              borderRadius: '8px',
              border: '1px solid #e5e7eb',
              overflow: 'hidden'
            }}>
              <div style={{
                backgroundColor: '#f3f4f6',
                padding: '0.75rem 1rem',
                borderBottom: '1px solid #e5e7eb'
              }}>
                <h3 style={{
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  margin: 0,
                  color: '#374151',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}>
                  <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                  Affected Business Process
                </h3>
              </div>
              <div style={{ padding: '1rem' }}>
                <div style={{ marginBottom: '0.75rem' }}>
                  <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem' }}>Process Name</div>
                  <div style={{ fontSize: '0.9375rem', fontWeight: '500', color: '#111827' }}>
                    {executiveNarrative.businessProcess.name}
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem' }}>Tier</div>
                    <span style={{
                      padding: '0.125rem 0.5rem',
                      borderRadius: '4px',
                      fontSize: '0.75rem',
                      fontWeight: '500',
                      backgroundColor: executiveNarrative.businessProcess.tier === 'Tier 1' ? '#fef3c7' : '#f3f4f6',
                      color: executiveNarrative.businessProcess.tier === 'Tier 1' ? '#92400e' : '#374151'
                    }}>
                      {executiveNarrative.businessProcess.tier}
                    </span>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem' }}>Criticality</div>
                    <span style={{
                      padding: '0.125rem 0.5rem',
                      borderRadius: '4px',
                      fontSize: '0.75rem',
                      fontWeight: '500',
                      backgroundColor: '#fecaca',
                      color: '#991b1b'
                    }}>
                      {executiveNarrative.businessProcess.criticality}
                    </span>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* Data Involvement */}
          {executiveNarrative.dataInvolvement && executiveNarrative.dataInvolvement.length > 0 && (
            <section style={{
              backgroundColor: '#ffffff',
              borderRadius: '8px',
              border: '1px solid #e5e7eb',
              overflow: 'hidden'
            }}>
              <div style={{
                backgroundColor: '#f3f4f6',
                padding: '0.75rem 1rem',
                borderBottom: '1px solid #e5e7eb'
              }}>
                <h3 style={{
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  margin: 0,
                  color: '#374151',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}>
                  <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
                  </svg>
                  Data Involvement
                </h3>
              </div>
              <div style={{ padding: '1rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {executiveNarrative.dataInvolvement.map((data, index) => (
                    <div key={index} style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      padding: '0.5rem',
                      backgroundColor: data.sensitivity === 'High' ? '#fef2f2' : '#f9fafb',
                      borderRadius: '6px',
                      border: `1px solid ${data.sensitivity === 'High' ? '#fecaca' : '#e5e7eb'}`
                    }}>
                      <div style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        backgroundColor: data.sensitivity === 'High' ? '#dc2626' : data.sensitivity === 'Medium' ? '#ca8a04' : '#6b7280'
                      }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '0.875rem', fontWeight: '500', color: '#111827' }}>
                          {data.classification || data.type}
                        </div>
                      </div>
                      <span style={{
                        padding: '0.125rem 0.5rem',
                        borderRadius: '4px',
                        fontSize: '0.75rem',
                        backgroundColor: data.sensitivity === 'High' ? '#fecaca' : '#e5e7eb',
                        color: data.sensitivity === 'High' ? '#991b1b' : '#374151'
                      }}>
                        {data.sensitivity}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )}

          {/* Threat Scenario */}
          {executiveNarrative.threat && (
            <section style={{
              backgroundColor: '#ffffff',
              borderRadius: '8px',
              border: '1px solid #e5e7eb',
              overflow: 'hidden'
            }}>
              <div style={{
                backgroundColor: '#f3f4f6',
                padding: '0.75rem 1rem',
                borderBottom: '1px solid #e5e7eb'
              }}>
                <h3 style={{
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  margin: 0,
                  color: '#374151',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}>
                  <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  Threat Scenario
                </h3>
              </div>
              <div style={{ padding: '1rem' }}>
                <div style={{ marginBottom: '0.75rem' }}>
                  <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem' }}>Threat Type</div>
                  <div style={{ fontSize: '0.9375rem', fontWeight: '500', color: '#111827' }}>
                    {executiveNarrative.threat.name}
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem' }}>Probability</div>
                    <div style={{ fontSize: '0.875rem', color: '#374151' }}>
                      {executiveNarrative.threat.probability}%
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem' }}>Impact Level</div>
                    <span style={{
                      padding: '0.125rem 0.5rem',
                      borderRadius: '4px',
                      fontSize: '0.75rem',
                      fontWeight: '500',
                      backgroundColor: '#fecaca',
                      color: '#991b1b'
                    }}>
                      {executiveNarrative.threat.impact}
                    </span>
                  </div>
                </div>
                {executiveNarrative.threat.mitreTechnique && (
                  <div>
                    <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem' }}>MITRE ATT&CK</div>
                    <code style={{
                      padding: '0.125rem 0.5rem',
                      borderRadius: '4px',
                      fontSize: '0.75rem',
                      backgroundColor: '#f3f4f6',
                      color: '#dc2626',
                      border: '1px solid #e5e7eb'
                    }}>
                      {executiveNarrative.threat.mitreTechnique}
                    </code>
                  </div>
                )}
              </div>
            </section>
          )}

        </div>

        {/* Right Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

          {/* Financial Exposure */}
          {executiveNarrative.financialExposure && (
            <section style={{
              backgroundColor: '#ffffff',
              borderRadius: '8px',
              border: '1px solid #e5e7eb',
              overflow: 'hidden'
            }}>
              <div style={{
                backgroundColor: '#f3f4f6',
                padding: '0.75rem 1rem',
                borderBottom: '1px solid #e5e7eb'
              }}>
                <h3 style={{
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  margin: 0,
                  color: '#374151',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}>
                  <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Financial Exposure
                </h3>
              </div>
              <div style={{ padding: '1rem' }}>
                {executiveNarrative.financialExposure.totalGrossExposure && (
                  <div style={{ marginBottom: '1rem' }}>
                    <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem' }}>Total Gross Exposure</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: '700', color: '#991b1b' }}>
                      ${executiveNarrative.financialExposure.totalGrossExposure.toLocaleString()}
                    </div>
                  </div>
                )}
                {executiveNarrative.financialExposure.netExposure && (
                  <div style={{ marginBottom: '1rem' }}>
                    <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem' }}>Net Exposure (after insurance)</div>
                    <div style={{ fontSize: '1.125rem', fontWeight: '600', color: '#dc2626' }}>
                      ${executiveNarrative.financialExposure.netExposure.toLocaleString()}
                    </div>
                  </div>
                )}
                {executiveNarrative.financialExposure.breakdown && (
                  <div>
                    <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.5rem' }}>Exposure Breakdown</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {Object.entries(executiveNarrative.financialExposure.breakdown).map(([key, value]) => (
                        value > 0 && (
                          <div key={key} style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            fontSize: '0.875rem'
                          }}>
                            <span style={{ color: '#6b7280' }}>
                              {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                            </span>
                            <span style={{ fontWeight: '500', color: '#374151' }}>
                              ${value.toLocaleString()}
                            </span>
                          </div>
                        )
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* Regulatory & Legal */}
          {executiveNarrative.regulatory && (
            <section style={{
              backgroundColor: '#ffffff',
              borderRadius: '8px',
              border: '1px solid #e5e7eb',
              overflow: 'hidden'
            }}>
              <div style={{
                backgroundColor: '#f3f4f6',
                padding: '0.75rem 1rem',
                borderBottom: '1px solid #e5e7eb'
              }}>
                <h3 style={{
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  margin: 0,
                  color: '#374151',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}>
                  <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
                  </svg>
                  Regulatory Obligations
                </h3>
              </div>
              <div style={{ padding: '1rem' }}>
                {executiveNarrative.regulatory.frameworks && executiveNarrative.regulatory.frameworks.length > 0 && (
                  <div style={{ marginBottom: '1rem' }}>
                    <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.5rem' }}>Applicable Frameworks</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                      {executiveNarrative.regulatory.frameworks.map((fw, index) => (
                        <span key={index} style={{
                          padding: '0.125rem 0.5rem',
                          borderRadius: '4px',
                          fontSize: '0.75rem',
                          backgroundColor: '#e0e7ff',
                          color: '#4338ca',
                          border: '1px solid #c7d2fe'
                        }}>
                          {fw}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {executiveNarrative.regulatory.obligations && executiveNarrative.regulatory.obligations.length > 0 && (
                  <div>
                    <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.5rem' }}>Notification Requirements</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {executiveNarrative.regulatory.obligations.map((obl, index) => (
                        <div key={index} style={{
                          padding: '0.5rem',
                          backgroundColor: '#f9fafb',
                          borderRadius: '6px',
                          border: '1px solid #e5e7eb'
                        }}>
                          <div style={{ fontSize: '0.875rem', fontWeight: '500', color: '#111827', marginBottom: '0.25rem' }}>
                            {obl.name}
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>{obl.source}</span>
                            <span style={{
                              padding: '0.125rem 0.5rem',
                              borderRadius: '4px',
                              fontSize: '0.75rem',
                              backgroundColor: '#fecaca',
                              color: '#991b1b',
                              fontWeight: '500'
                            }}>
                              {obl.notificationTimeline}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* Ownership */}
          {executiveNarrative.ownership && (
            <section style={{
              backgroundColor: '#ffffff',
              borderRadius: '8px',
              border: '1px solid #e5e7eb',
              overflow: 'hidden'
            }}>
              <div style={{
                backgroundColor: '#f3f4f6',
                padding: '0.75rem 1rem',
                borderBottom: '1px solid #e5e7eb'
              }}>
                <h3 style={{
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  margin: 0,
                  color: '#374151',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}>
                  <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  Ownership & Accountability
                </h3>
              </div>
              <div style={{ padding: '1rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {executiveNarrative.ownership.executive && (
                    <div>
                      <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem' }}>Executive Owner</div>
                      <div style={{ fontSize: '0.9375rem', fontWeight: '500', color: '#111827' }}>
                        {executiveNarrative.ownership.executive.name || executiveNarrative.ownership.executive.roleId}
                      </div>
                    </div>
                  )}
                  {executiveNarrative.ownership.remediationOwner && (
                    <div>
                      <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem' }}>Remediation Owner</div>
                      <div style={{ fontSize: '0.875rem', color: '#374151' }}>
                        {executiveNarrative.ownership.remediationOwner}
                      </div>
                    </div>
                  )}
                  {executiveNarrative.ownership.businessProcessOwner && (
                    <div>
                      <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem' }}>Business Process Owner</div>
                      <div style={{ fontSize: '0.875rem', color: '#374151' }}>
                        {executiveNarrative.ownership.businessProcessOwner}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </section>
          )}

        </div>
      </div>

      {/* Footer with actions */}
      <div style={{
        marginTop: '2rem',
        paddingTop: '1.5rem',
        borderTop: '1px solid #e5e7eb',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
          Last updated: {new Date().toLocaleString()}
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            onClick={() => window.print()}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: '#ffffff',
              color: '#374151',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '0.875rem'
            }}
          >
            Print / Export PDF
          </button>
          {goBack && (
            <button
              onClick={goBack}
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
              Done
            </button>
          )}
        </div>
      </div>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @media print {
          button {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
};

export default CorrelatedFinding;
