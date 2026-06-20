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
import ExecutiveAgentBrief from '../components/ExecutiveAgentBrief';
import DashNav from '../components/DashNav';
import AuditLineagePanel from '../components/AuditLineagePanel';
import { COLORS, FONTS } from '../theme';

const INK = COLORS.ink, INK2 = COLORS.ink2, INK3 = COLORS.ink3, HAIR = COLORS.hair, PANEL = COLORS.paper;

const CLODash = (props) => {
  const { goBack, authToken, orgId, api_url } = props;

  const [loading, setLoading] = useState(true);
  const [legalObligations, setLegalObligations] = useState([]);
  const [contractRisks, setContractRisks] = useState([]);
  const [policyExceptions, setPolicyExceptions] = useState([]);
  const [selectedState, setSelectedState] = useState('');
  const [selectedDataType, setSelectedDataType] = useState('');
  const [breachTimeline, setBreachTimeline] = useState(null);
  // Agent-driven view: page opens with just the agent; a question reveals the
  // section(s) that answer it.
  const [cloView, setCloView] = useState(null);
  const [cloQ, setCloQ] = useState('');

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
        const organizationId = orgId || localStorage.getItem('cyberrx_org_id') || localStorage.getItem('orgId');
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
      case 'HIPAA': return COLORS.bad;
      case 'CMS': return '#2563eb';
      case 'State': return COLORS.warn;
      case 'NAIC': return '#8b5cf6';
      case 'Contract': return INK2;
      default: return INK2;
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

  // Route a matched agent answer to the section(s) that answer it.
  const applyAgentAnswer = (ans) => {
    if (!ans || !ans.matched || ans.source === 'out_of_scope') return;
    const q = String(ans.matchedQuestion || ans.question || '').toLowerCase();
    setCloQ(ans.matchedQuestion || ans.question || '');
    const v = /notify|notification|by when|breach tomorrow/.test(q) ? 'notify'
      : /vendor|contract/.test(q) ? 'vendors'
      : /penalt/.test(q) ? 'penalty'
      : /obligation|trigger|hipaa|cms|regulat/.test(q) ? 'obligations'
      : 'overall';
    setCloView(v);
  };
  const clearCloView = () => { setCloView(null); setCloQ(''); };
  const show = (...vs) => vs.includes(cloView);
  const hipaaCmsCount = legalObligations.filter((o) => /hipaa|cms/i.test(String(o.source || '') + String(o.name || ''))).length;
  const penaltySum = legalObligations.reduce((s, o) => s + (Number(o.max_penalty_amount) || 0), 0);
  const fmtUSD = (v) => { const x = Number(v) || 0; if (x >= 1e9) return `$${(x / 1e9).toFixed(1)}B`; if (x >= 1e6) return `$${(x / 1e6).toFixed(1)}M`; if (x >= 1e3) return `$${(x / 1e3).toFixed(0)}K`; return `$${x}`; };
  const cloViewMeta = () => {
    if (cloView === 'notify') return { title: 'Breach Notification Clock', num: '60', unit: ' days', color: COLORS.bad, label: 'HIPAA breach-notification deadline', sub: 'CMS Part D fastest at 1 business day · most states 30 days from discovery' };
    if (cloView === 'vendors') return { title: 'Contract & Vendor Risk', num: String(contractRisks.length), unit: '', color: COLORS.warn, label: 'Contracts in the risk register', sub: contractRisks.length === 0 ? 'No contracts tracked yet — add entries to assess legal risk' : 'Vendor agreements carrying contractual/legal risk' };
    if (cloView === 'penalty') return { title: 'Regulatory Penalty Exposure', num: penaltySum > 0 ? fmtUSD(penaltySum) : String(legalObligations.length), unit: '', color: COLORS.bad, label: penaltySum > 0 ? 'Maximum modeled penalty exposure' : 'Obligations with penalty exposure', sub: `${hipaaCmsCount} HIPAA/CMS obligations across ${legalObligations.length} tracked` };
    if (cloView === 'obligations') return { title: 'Regulatory Obligations', num: String(legalObligations.length), unit: '', color: '#2563eb', label: 'Obligations tracked across sources', sub: `${hipaaCmsCount} carry HIPAA or CMS requirements` };
    return { title: 'Overall Legal Risk', num: String(legalObligations.length), unit: '', color: COLORS.warn, label: 'Legal & regulatory obligations in scope', sub: `${hipaaCmsCount} HIPAA/CMS · ${Object.keys(obligationsBySource).filter((s) => s === 'State').length} state regimes` };
  };

  return (
    <div style={{ padding: '2rem', backgroundColor: PANEL, minHeight: '100vh' }}>
      {!props.embedded && <DashNav current="clo" go={props.go} />}
      {/* Header */}
      <div style={{
        marginBottom: '2rem',
        borderBottom: `1px solid ${HAIR}`,
        paddingBottom: '1.5rem'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: '700', margin: 0, color: INK, fontFamily: FONTS.display }}>
              Legal & Regulatory Exposure Dashboard
            </h1>
            <p style={{ color: INK2, marginTop: '0.5rem', marginBottom: 0 }}>
              YOUR part of cyber responsibility — Legal Exposure & Regulatory Compliance
            </p>
          </div>
          {goBack && (
            <button
              onClick={goBack}
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: PANEL,
                color: INK2,
                border: `1px solid ${HAIR}`,
                borderRadius: '6px',
                cursor: 'pointer'
              }}
            >
              ← Back
            </button>
          )}
        </div>
      </div>

      {/* AI agent brief — page opens here; a question reveals the relevant section(s) */}
      <ExecutiveAgentBrief role="CLO" entry onAnswer={applyAgentAnswer} onGeneral={() => { setCloQ('General dashboard'); setCloView('overall'); }} authToken={authToken} orgId={orgId} api_url={api_url} />

      {/* Answer hero — mirrors the asked question */}
      {cloView && (() => {
        const h = cloViewMeta();
        return (
          <div style={{ backgroundColor: '#fff', borderRadius: 8, border: `1px solid ${HAIR}`, padding: '1.25rem 1.5rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '1.25rem', borderLeft: `5px solid ${h.color}` }}>
            <div style={{ fontSize: '2.5rem', fontWeight: 800, color: h.color, lineHeight: 1, flexShrink: 0, fontFamily: FONTS.mono }}>
              {h.num}<span style={{ fontSize: '1rem', color: INK3, fontWeight: 600 }}>{h.unit}</span>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '0.7rem', color: '#2563eb', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>Chief Legal Officer — {h.title}</div>
              <div style={{ fontSize: '1rem', fontWeight: 700, color: INK, fontFamily: FONTS.display }}>{h.label}</div>
              <div style={{ fontSize: '0.78rem', color: INK2, marginTop: 2 }}>{cloQ ? `Answering: “${cloQ}” · ` : ''}{h.sub}</div>
            </div>
            <button onClick={clearCloView} style={{ padding: '0.5rem 0.85rem', backgroundColor: PANEL, color: INK2, border: `1px solid ${HAIR}`, borderRadius: 6, cursor: 'pointer', fontSize: '0.8rem', whiteSpace: 'nowrap', flexShrink: 0 }}>← Ask another</button>
          </div>
        );
      })()}

      {/* KPI Strip */}
      {show('overall', 'penalty') && (
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
          border: `1px solid ${HAIR}`
        }}>
          <div style={{ fontSize: '0.75rem', color: INK2, marginBottom: '0.25rem' }}>
            Legal Obligations
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: '700', color: INK, fontFamily: FONTS.mono }}>
            {legalObligations.length}
          </div>
        </div>
        <div style={{
          backgroundColor: '#ffffff',
          padding: '1rem',
          borderRadius: '8px',
          border: `1px solid ${HAIR}`
        }}>
          <div style={{ fontSize: '0.75rem', color: INK2, marginBottom: '0.25rem' }}>
            State Regulations
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#0891b2', fontFamily: FONTS.mono }}>
            {Object.keys(obligationsBySource).filter(s => s === 'State').length}
          </div>
        </div>
        <div style={{
          backgroundColor: '#ffffff',
          padding: '1rem',
          borderRadius: '8px',
          border: `1px solid ${HAIR}`
        }}>
          <div style={{ fontSize: '0.75rem', color: INK2, marginBottom: '0.25rem' }}>
            Contract Risks
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: '700', color: COLORS.warn, fontFamily: FONTS.mono }}>
            {contractRisks.length}
          </div>
        </div>
        <div style={{
          backgroundColor: '#ffffff',
          padding: '1rem',
          borderRadius: '8px',
          border: `1px solid ${HAIR}`
        }}>
          <div style={{ fontSize: '0.75rem', color: INK2, marginBottom: '0.25rem' }}>
            Legal Impact Exceptions
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: '700', color: COLORS.bad, fontFamily: FONTS.mono }}>
            {policyExceptions.filter(e => hasLegalImpact(e)).length}
          </div>
        </div>
      </div>
      )}

      {/* Breach Notification Workflow */}
      {show('notify') && (
      <section style={{
        backgroundColor: '#ffffff',
        borderRadius: '8px',
        marginBottom: '2rem',
        border: `1px solid ${HAIR}`
      }}>
        <div style={{
          padding: '1rem',
          borderBottom: `1px solid ${HAIR}`,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <h2 style={{ fontSize: '1rem', fontWeight: '600', margin: 0, fontFamily: FONTS.display }}>
            Breach Notification Timeline Calculator
          </h2>
        </div>
        <div style={{ padding: '1rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '500', color: INK2, marginBottom: '0.25rem' }}>
                State / Jurisdiction
              </label>
              <select
                value={selectedState}
                onChange={(e) => setSelectedState(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  borderRadius: '4px',
                  border: `1px solid ${HAIR}`,
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
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '500', color: INK2, marginBottom: '0.25rem' }}>
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
                  border: `1px solid ${HAIR}`,
                  fontSize: '0.875rem',
                  backgroundColor: selectedState !== 'Federal' ? PANEL : '#ffffff'
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
      )}

      {/* Legal Obligations by Source */}
      {show('obligations', 'penalty', 'overall') && (
      <section style={{
        backgroundColor: '#ffffff',
        borderRadius: '8px',
        marginBottom: '2rem',
        border: `1px solid ${HAIR}`
      }}>
        <div style={{
          padding: '1rem',
          borderBottom: `1px solid ${HAIR}`
        }}>
          <h2 style={{ fontSize: '1rem', fontWeight: '600', margin: 0, fontFamily: FONTS.display }}>
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
                <span style={{ fontSize: '0.75rem', color: INK2 }}>
                  ({obligations.length} obligations)
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {obligations.map((obl, index) => (
                  <div key={index} style={{
                    padding: '0.75rem',
                    backgroundColor: PANEL,
                    borderRadius: '6px',
                    border: `1px solid ${HAIR}`,
                    fontSize: '0.875rem'
                  }}>
                    <div style={{ fontWeight: '500', color: INK, marginBottom: '0.25rem' }}>
                      {obl.name}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.75rem', color: INK2 }}>
                        {obl.citation}
                      </span>
                      <span style={{
                        padding: '0.125rem 0.5rem',
                        borderRadius: '4px',
                        fontSize: '0.75rem',
                        backgroundColor: '#fecaca',
                        color: COLORS.bad,
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
      )}

      {/* Contract Risk Register */}
      {show('vendors') && (
      <section style={{
        backgroundColor: '#ffffff',
        borderRadius: '8px',
        marginBottom: '2rem',
        border: `1px solid ${HAIR}`
      }}>
        <div style={{
          padding: '1rem',
          borderBottom: `1px solid ${HAIR}`,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <h2 style={{ fontSize: '1rem', fontWeight: '600', margin: 0, fontFamily: FONTS.display }}>
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
            <div style={{ textAlign: 'center', padding: '2rem', color: INK2 }}>
              No contract risks tracked. Use "Add Contract" to create entries.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {contractRisks.map((contract) => (
                <div key={contract.id} style={{
                  padding: '0.75rem',
                  border: `1px solid ${HAIR}`,
                  borderRadius: '6px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <div>
                    <div style={{ fontWeight: '500', color: INK, fontSize: '0.875rem' }}>
                      {contract.vendor_name}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: INK2 }}>
                      {contract.contract_type || 'Service Agreement'}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.75rem', color: INK2 }}>Risk Level</div>
                    <span style={{
                      padding: '0.125rem 0.5rem',
                      borderRadius: '4px',
                      fontSize: '0.75rem',
                      fontWeight: '500',
                      backgroundColor: '#fecaca',
                      color: COLORS.bad
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
      )}

      {/* Policy Exceptions */}
      {show('overall') && (
      <section style={{
        backgroundColor: '#ffffff',
        borderRadius: '8px',
        border: `1px solid ${HAIR}`
      }}>
        <div style={{
          padding: '1rem',
          borderBottom: `1px solid ${HAIR}`
        }}>
          <h2 style={{ fontSize: '1rem', fontWeight: '600', margin: 0, fontFamily: FONTS.display }}>
            Policy Exceptions
          </h2>
        </div>
        <div style={{ padding: '1rem' }}>
          {policyExceptions.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: INK2 }}>
              No policy exceptions tracked.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {policyExceptions.map((exception) => (
                <div key={exception.id} style={{
                  padding: '0.75rem',
                  border: hasLegalImpact(exception) ? `2px solid ${COLORS.bad}` : `1px solid ${HAIR}`,
                  borderRadius: '6px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  backgroundColor: hasLegalImpact(exception) ? '#fef2f2' : 'transparent'
                }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: '500', color: INK, fontSize: '0.875rem' }}>
                      {exception.policy_name}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: INK2 }}>
                      {(exception.justification || '').substring(0, 100)}...
                    </div>
                  </div>
                  {hasLegalImpact(exception) && (
                    <span style={{
                      padding: '0.125rem 0.5rem',
                      borderRadius: '4px',
                      fontSize: '0.75rem',
                      backgroundColor: COLORS.bad,
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
      )}
    </div>
  );
};

export default CLODash;
