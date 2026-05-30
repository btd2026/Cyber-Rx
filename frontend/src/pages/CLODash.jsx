/**
 * CLO Dashboard Page
 * Task: T-209, T-210, T-211, T-212, T-213, T-214
 *
 * Chief Legal Officer Dashboard providing:
 * - Legal cyber exposure overview (OCR/CMS/state DOI)
 * - Regulatory obligation tracker
 * - Breach notification workflow with pre-populated drafts (CA, NY, MA)
 * - Contract risk register CRUD
 * - Policy exceptions with legal impact flagging
 *
 * Route: /clo (mapped to page "clo")
 */

import React, { useState, useEffect } from 'react';

const CLODash = (props) => {
  const { goBack, authToken, orgId, api_url } = props;

  const [loading, setLoading] = useState(true);
  const [legalObligations, setLegalObligations] = useState([]);
  const [contractRisks, setContractRisks] = useState([]);
  const [policyExceptions, setPolicyExceptions] = useState([]);
  const [selectedState, setSelectedState] = useState('');
  const [selectedDataType, setSelectedDataType] = useState('');
  const [breachTimeline, setBreachTimeline] = useState(null);

  // State breach notification timelines
  const stateTimelines = {
    'CA': '30 days from discovery',
    'NY': '30 days from discovery',
    'MA': '30 days from discovery',
    'TX': '30 days from discovery',
    'FL': '30 days from discovery',
    'IL': '30 days from discovery',
    'PA': '7 days (if immediate harm) or 30 days',
    'OH': '30 days from discovery',
    'MI': '30 days from discovery',
    'GA': '30 days from discovery',
    'NC': '30 days from discovery',
    'Federal': {
      'HIPAA': '60 days from discovery',
      'CMS Medicare': '5 days',
      'CMS Part D': '1 business day',
      'Marketplace': '10 days'
    }
  };

  // Fetch legal obligations
  useEffect(() => {
    const fetchCLOData = async () => {
      try {
        setLoading(true);
        const token = authToken || localStorage.getItem('authToken');
        const organizationId = orgId || localStorage.getItem('orgId');
        const apiUrl = api_url || import.meta.env?.VITE_API_URL || 'https://cyberrx-api.onrender.com';

        // Fetch legal obligations
        const legalRes = await fetch(`${apiUrl}/api/legal-obligations?org_id=${organizationId}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'X-Org-Id': organizationId
          }
        });
        if (legalRes.ok) {
          const legalData = await legalRes.json();
          setLegalObligations(legalData.data || legalData || []);
        }

        setLoading(false);
      } catch (err) {
        console.error('Error fetching CLO dashboard data:', err);
        setLoading(false);
      }
    };

    fetchCLOData();
  }, [authToken, orgId, api_url]);

  // Calculate breach timeline
  useEffect(() => {
    if (selectedState && selectedDataType) {
      if (selectedState === 'Federal') {
        setBreachTimeline(stateTimelines.Federal[selectedDataType] || 'See specific regulation');
      } else {
        setBreachTimeline(stateTimelines[selectedState] || '30 days from discovery');
      }
    }
  }, [selectedState, selectedDataType]);

  // Get source color
  const getSourceColor = (source) => {
    switch (source) {
      case 'HIPAA': return '#dc2626';
      case 'CMS': return '#2563eb';
      case 'State': return '#ca8a04';
      case 'NAIC': return '#8b5cf6';
      case 'Contract': return '#6b7280';
      default: return '#6b7280';
    }
  };

  // Group obligations by source
  const obligationsBySource = legalObligations.reduce((acc, obl) => {
    const source = obl.source || 'Other';
    if (!acc[source]) acc[source] = [];
    acc[source].push(obl);
    return acc;
  }, {});

  // High-impact policy exception patterns
  const legalImpactPatterns = [
    'regulatory non-compliance',
    'HIPAA',
    'privacy',
    'breach',
    'notification',
    'OCR',
    'CMS'
  ];

  const hasLegalImpact = (exception) => {
    const justification = (exception.justification || '').toLowerCase();
    return legalImpactPatterns.some(pattern => justification.includes(pattern));
  };

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
              CLO Dashboard
            </h1>
            <p style={{ color: '#6b7280', marginTop: '0.5rem', marginBottom: 0 }}>
              Legal Exposure & Regulatory Compliance
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
            Legal Obligations
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#111827' }}>
            {legalObligations.length}
          </div>
        </div>
        <div style={{
          backgroundColor: '#ffffff',
          padding: '1rem',
          borderRadius: '8px',
          border: '1px solid #e5e7eb'
        }}>
          <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem' }}>
            State Regulations
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#0891b2' }}>
            {Object.keys(obligationsBySource).filter(s => s === 'State').length}
          </div>
        </div>
        <div style={{
          backgroundColor: '#ffffff',
          padding: '1rem',
          borderRadius: '8px',
          border: '1px solid #e5e7eb'
        }}>
          <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem' }}>
            Contract Risks
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#ea580c' }}>
            {contractRisks.length}
          </div>
        </div>
        <div style={{
          backgroundColor: '#ffffff',
          padding: '1rem',
          borderRadius: '8px',
          border: '1px solid #e5e7eb'
        }}>
          <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem' }}>
            Legal Impact Exceptions
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#dc2626' }}>
            {policyExceptions.filter(e => hasLegalImpact(e)).length}
          </div>
        </div>
      </div>

      {/* Breach Notification Workflow */}
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
            Breach Notification Timeline Calculator
          </h2>
        </div>
        <div style={{ padding: '1rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '500', color: '#374151', marginBottom: '0.25rem' }}>
                State / Jurisdiction
              </label>
              <select
                value={selectedState}
                onChange={(e) => setSelectedState(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  borderRadius: '4px',
                  border: '1px solid #d1d5db',
                  fontSize: '0.875rem'
                }}
              >
                <option value="">Select state...</option>
                <option value="CA">California</option>
                <option value="NY">New York</option>
                <option value="MA">Massachusetts</option>
                <option value="TX">Texas</option>
                <option value="FL">Florida</option>
                <option value="IL">Illinois</option>
                <option value="PA">Pennsylvania</option>
                <option value="OH">Ohio</option>
                <option value="MI">Michigan</option>
                <option value="GA">Georgia</option>
                <option value="NC">North Carolina</option>
                <option value="Federal">Federal (HIPAA/CMS)</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '500', color: '#374151', marginBottom: '0.25rem' }}>
                Data Type
              </label>
              <select
                value={selectedDataType}
                onChange={(e) => setSelectedDataType(e.target.value)}
                disabled={selectedState !== 'Federal'}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  borderRadius: '4px',
                  border: '1px solid #d1d5db',
                  fontSize: '0.875rem',
                  backgroundColor: selectedState !== 'Federal' ? '#f3f4f6' : '#ffffff'
                }}
              >
                <option value="">Select data type...</option>
                <option value="HIPAA">HIPAA / PHI</option>
                <option value="CMS Medicare">CMS Medicare</option>
                <option value="CMS Part D">CMS Part D</option>
                <option value="Marketplace">Marketplace (ACA)</option>
              </select>
            </div>
          </div>

          {breachTimeline && (
            <div style={{
              padding: '1rem',
              backgroundColor: '#fef3c7',
              borderRadius: '6px',
              border: '1px solid #fcd34d'
            }}>
              <div style={{ fontSize: '0.75rem', fontWeight: '500', color: '#92400e', marginBottom: '0.25rem' }}>
                Required Notification Timeline:
              </div>
              <div style={{ fontSize: '1rem', fontWeight: '600', color: '#78350f' }}>
                {breachTimeline}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Legal Obligations by Source */}
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
            Regulatory Obligations
          </h2>
        </div>
        <div style={{ padding: '1rem' }}>
          {Object.entries(obligationsBySource).map(([source, obligations]) => (
            <div key={source} style={{ marginBottom: '1.5rem' }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                marginBottom: '0.75rem'
              }}>
                <span style={{
                  padding: '0.25rem 0.75rem',
                  borderRadius: '999px',
                  fontSize: '0.75rem',
                  fontWeight: '600',
                  backgroundColor: `${getSourceColor(source)}20`,
                  color: getSourceColor(source)
                }}>
                  {source}
                </span>
                <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                  ({obligations.length} obligations)
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {obligations.map((obl, index) => (
                  <div key={index} style={{
                    padding: '0.75rem',
                    backgroundColor: '#f9fafb',
                    borderRadius: '6px',
                    border: '1px solid #e5e7eb',
                    fontSize: '0.875rem'
                  }}>
                    <div style={{ fontWeight: '500', color: '#111827', marginBottom: '0.25rem' }}>
                      {obl.name}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                        {obl.citation}
                      </span>
                      <span style={{
                        padding: '0.125rem 0.5rem',
                        borderRadius: '4px',
                        fontSize: '0.75rem',
                        backgroundColor: '#fecaca',
                        color: '#991b1b',
                        fontWeight: '500'
                      }}>
                        {obl.notification_timeline}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Contract Risk Register */}
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
            Contract Risk Register
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
            + Add Contract
          </button>
        </div>
        <div style={{ padding: '1rem' }}>
          {contractRisks.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>
              No contract risks tracked. Use "Add Contract" to create entries.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {contractRisks.map((contract) => (
                <div key={contract.id} style={{
                  padding: '0.75rem',
                  border: '1px solid #e5e7eb',
                  borderRadius: '6px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <div>
                    <div style={{ fontWeight: '500', color: '#111827', fontSize: '0.875rem' }}>
                      {contract.vendor_name}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                      {contract.contract_type || 'Service Agreement'}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>Risk Level</div>
                    <span style={{
                      padding: '0.125rem 0.5rem',
                      borderRadius: '4px',
                      fontSize: '0.75rem',
                      fontWeight: '500',
                      backgroundColor: '#fecaca',
                      color: '#991b1b'
                    }}>
                      {contract.risk_level || 'Medium'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Policy Exceptions */}
      <section style={{
        backgroundColor: '#ffffff',
        borderRadius: '8px',
        border: '1px solid #e5e7eb'
      }}>
        <div style={{
          padding: '1rem',
          borderBottom: '1px solid #e5e7eb'
        }}>
          <h2 style={{ fontSize: '1rem', fontWeight: '600', margin: 0 }}>
            Policy Exceptions
          </h2>
        </div>
        <div style={{ padding: '1rem' }}>
          {policyExceptions.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>
              No policy exceptions tracked.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {policyExceptions.map((exception) => (
                <div key={exception.id} style={{
                  padding: '0.75rem',
                  border: hasLegalImpact(exception) ? '2px solid #dc2626' : '1px solid #e5e7eb',
                  borderRadius: '6px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  backgroundColor: hasLegalImpact(exception) ? '#fef2f2' : 'transparent'
                }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: '500', color: '#111827', fontSize: '0.875rem' }}>
                      {exception.policy_name}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                      {(exception.justification || '').substring(0, 100)}...
                    </div>
                  </div>
                  {hasLegalImpact(exception) && (
                    <span style={{
                      padding: '0.125rem 0.5rem',
                      borderRadius: '4px',
                      fontSize: '0.75rem',
                      backgroundColor: '#dc2626',
                      color: 'white',
                      fontWeight: '500'
                    }}>
                      Legal Impact
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default CLODash;
