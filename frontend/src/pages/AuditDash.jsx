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
import DashNav from '../components/DashNav';
import { COLORS, FONTS } from '../theme';

const INK = COLORS.ink, INK2 = COLORS.ink2, INK3 = COLORS.ink3, HAIR = COLORS.hair, PANEL = COLORS.paper;

const AuditDash = (props) => {
  const { goBack, authToken, orgId, api_url } = props;

  const [loading, setLoading] = useState(true);
  const [controls, setControls] = useState([]);
  const [findings, setFindings] = useState([]);
  const [evidence, setEvidence] = useState([]);
  const [controlStats, setControlStats] = useState(null);
  const [evidenceStats, setEvidenceStats] = useState(null);
  const [selectedControl, setSelectedControl] = useState(null);
  const [showRepeatFindings, setShowRepeatFindings] = useState(false);

  useEffect(() => {
    const fetchAuditData = async () => {
      try {
        setLoading(true);
        const token = authToken || localStorage.getItem('authToken');
        const organizationId = orgId || localStorage.getItem('cyberrx_org_id') || localStorage.getItem('orgId');
        const apiUrl = api_url || import.meta.env?.VITE_API_URL || 'https://cyberrx-api.onrender.com';

        // Fetch controls (NEW - uses Control entity)
        const controlsRes = await fetch(`${apiUrl}/api/controls?org_id=${organizationId}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'X-Org-Id': organizationId
          }
        });
        if (controlsRes.ok) {
          const controlsData = await controlsRes.json();
          setControls(controlsData.data || controlsData || []);
        }

        // Fetch control statistics
        const statsRes = await fetch(`${apiUrl}/api/controls/statistics?org_id=${organizationId}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'X-Org-Id': organizationId
          }
        });
        if (statsRes.ok) {
          const statsData = await statsRes.json();
          setControlStats(statsData.data || statsData || {});
        }

        // Fetch evidence statistics (NEW)
        const evidenceStatsRes = await fetch(`${apiUrl}/api/evidence/statistics?org_id=${organizationId}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'X-Org-Id': organizationId
          }
        });
        if (evidenceStatsRes.ok) {
          const evidenceStatsData = await evidenceStatsRes.json();
          setEvidenceStats(evidenceStatsData.data || evidenceStatsData || {});
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
      case 'critical': return COLORS.bad;
      case 'high': return '#ea580c';
      case 'medium': return COLORS.warn;
      case 'low': return COLORS.good;
      default: return INK2;
    }
  };

  // Get status color
  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'open': return COLORS.bad;
      case 'in_progress': return COLORS.warn;
      case 'mitigating': return '#3b9eff';
      case 'accepted': return '#8b5cf6';
      case 'closed': return COLORS.good;
      case 'resolved': return COLORS.good;
      default: return INK2;
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
    <div style={{ padding: '2rem', backgroundColor: PANEL, minHeight: '100vh' }}>
      <DashNav current="cro" go={props.go} />
      {/* Header */}
      <div style={{
        marginBottom: '2rem',
        borderBottom: `1px solid ${HAIR}`,
        paddingBottom: '1.5rem'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: '700', margin: 0, color: INK, fontFamily: FONTS.display }}>
              Internal Audit Dashboard
            </h1>
            <p style={{ color: INK2, marginTop: '0.5rem', marginBottom: 0 }}>
              Control Testing & Findings Management
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
          border: `1px solid ${HAIR}`
        }}>
          <div style={{ fontSize: '0.75rem', color: INK2, marginBottom: '0.25rem' }}>
            Total Findings
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: '700', color: INK, fontFamily: FONTS.mono }}>
            {findings.length}
          </div>
        </div>
        <div style={{
          backgroundColor: '#ffffff',
          padding: '1rem',
          borderRadius: '8px',
          border: `1px solid ${HAIR}`
        }}>
          <div style={{ fontSize: '0.75rem', color: INK2, marginBottom: '0.25rem' }}>
            Critical Findings
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: '700', color: COLORS.bad, fontFamily: FONTS.mono }}>
            {criticalFindings.length}
          </div>
        </div>
        <div style={{
          backgroundColor: '#ffffff',
          padding: '1rem',
          borderRadius: '8px',
          border: `1px solid ${HAIR}`
        }}>
          <div style={{ fontSize: '0.75rem', color: INK2, marginBottom: '0.25rem' }}>
            Repeat Findings
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#ea580c', fontFamily: FONTS.mono }}>
            {repeatFindings.length}
          </div>
        </div>
        <div style={{
          backgroundColor: '#ffffff',
          padding: '1rem',
          borderRadius: '8px',
          border: `1px solid ${HAIR}`
        }}>
          <div style={{ fontSize: '0.75rem', color: INK2, marginBottom: '0.25rem' }}>
            Controls Tracked
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: '700', color: INK, fontFamily: FONTS.mono }}>
            {controlStats?.total || controls.length || 0}
          </div>
        </div>
      </div>

      {/* Control Effectiveness Summary */}
      {controlStats && (
        <div style={{
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
              Control Effectiveness Summary
            </h2>
          </div>
          <div style={{ padding: '1rem' }}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: '1rem'
            }}>
              <div>
                <div style={{ fontSize: '0.75rem', color: INK2 }}>Implemented</div>
                <div style={{ fontSize: '1.25rem', fontWeight: '700', color: COLORS.good, fontFamily: FONTS.mono }}>
                  {controlStats.implemented || 0}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: INK2 }}>Partial</div>
                <div style={{ fontSize: '1.25rem', fontWeight: '700', color: COLORS.warn, fontFamily: FONTS.mono }}>
                  {controlStats.partial || 0}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: INK2 }}>Critical Tier</div>
                <div style={{ fontSize: '1.25rem', fontWeight: '700', color: COLORS.bad, fontFamily: FONTS.mono }}>
                  {controlStats.criticalCount || 0}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: INK2 }}>Avg Effectiveness</div>
                <div style={{ fontSize: '1.25rem', fontWeight: '700', color: '#2563eb', fontFamily: FONTS.mono }}>
                  {controlStats.avgEffectiveness ? Math.round(controlStats.avgEffectiveness) : 0}%
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Evidence Summary */}
      {evidenceStats && (
        <div style={{
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
              Evidence Repository
            </h2>
          </div>
          <div style={{ padding: '1rem' }}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: '1rem'
            }}>
              <div>
                <div style={{ fontSize: '0.75rem', color: INK2 }}>Total Evidence</div>
                <div style={{ fontSize: '1.25rem', fontWeight: '700', color: INK, fontFamily: FONTS.mono }}>
                  {evidenceStats.total || 0}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: INK2 }}>Valid</div>
                <div style={{ fontSize: '1.25rem', fontWeight: '700', color: COLORS.good, fontFamily: FONTS.mono }}>
                  {evidenceStats.valid || 0}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: INK2 }}>Expired</div>
                <div style={{ fontSize: '1.25rem', fontWeight: '700', color: COLORS.bad, fontFamily: FONTS.mono }}>
                  {evidenceStats.expired || 0}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: INK2 }}>With Files</div>
                <div style={{ fontSize: '1.25rem', fontWeight: '700', color: '#2563eb', fontFamily: FONTS.mono }}>
                  {evidenceStats.withFiles || 0}
                </div>
              </div>
            </div>
            {evidenceStats.expired > 0 && (
              <div style={{
                marginTop: '1rem',
                padding: '0.75rem',
                backgroundColor: '#dc262610',
                border: '1px solid #dc262620',
                borderRadius: '6px',
                fontSize: '0.875rem',
                color: COLORS.bad
              }}>
                ⚠️ {evidenceStats.expired} evidence items have expired and need refresh
              </div>
            )}
          </div>
        </div>
      )}

      {/* Low Effectiveness Controls */}
      {controls.filter(c => c.effectiveness_score !== null && c.effectiveness_score < 60).length > 0 && (
        <div style={{
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
              Controls Requiring Attention (Effectiveness &lt; 60%)
            </h2>
          </div>
          <div style={{ padding: '1rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {controls
                .filter(c => c.effectiveness_score !== null && c.effectiveness_score < 60)
                .sort((a, b) => a.effectiveness_score - b.effectiveness_score)
                .map(control => (
                  <div key={control.id} style={{
                    padding: '0.75rem',
                    border: `1px solid ${HAIR}`,
                    borderRadius: '6px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    borderLeft: `4px solid ${control.effectiveness_score < 40 ? COLORS.bad : COLORS.warn}`
                  }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: '500', color: INK, fontSize: '0.875rem' }}>
                        {control.title}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: INK2, marginTop: '0.25rem' }}>
                        {control.control_id} • {control.framework} • {control.tier}
                      </div>
                    </div>
                    <div style={{
                      padding: '0.25rem 0.5rem',
                      borderRadius: '4px',
                      fontSize: '0.875rem',
                      fontWeight: '600',
                      backgroundColor: '#dc262615',
                      color: COLORS.bad
                    }}>
                      {control.effectiveness_score}%
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

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
          border: `1px solid ${HAIR}`
        }}>
          <div style={{ fontSize: '0.75rem', color: INK2, marginBottom: '0.25rem' }}>
            Total Findings
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: '700', color: INK, fontFamily: FONTS.mono }}>
            {findings.length}
          </div>
        </div>
        <div style={{
          backgroundColor: '#ffffff',
          padding: '1rem',
          borderRadius: '8px',
          border: `1px solid ${HAIR}`
        }}>
          <div style={{ fontSize: '0.75rem', color: INK2, marginBottom: '0.25rem' }}>
            Critical Findings
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: '700', color: COLORS.bad, fontFamily: FONTS.mono }}>
            {criticalFindings.length}
          </div>
        </div>
        <div style={{
          backgroundColor: '#ffffff',
          padding: '1rem',
          borderRadius: '8px',
          border: `1px solid ${HAIR}`
        }}>
          <div style={{ fontSize: '0.75rem', color: INK2, marginBottom: '0.25rem' }}>
            Repeat Findings
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#ea580c', fontFamily: FONTS.mono }}>
            {repeatFindings.length}
          </div>
        </div>
        <div style={{
          backgroundColor: '#ffffff',
          padding: '1rem',
          borderRadius: '8px',
          border: `1px solid ${HAIR}`
        }}>
          <div style={{ fontSize: '0.75rem', color: INK2, marginBottom: '0.25rem' }}>
            Controls Tracked
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: '700', color: INK, fontFamily: FONTS.mono }}>
            {controls.length}
          </div>
        </div>
      </div>

      {/* Control Testing Section */}
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
                <tr style={{ backgroundColor: PANEL, borderBottom: `2px solid ${HAIR}` }}>
                  <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '600', color: INK2 }}>
                    Control
                  </th>
                  <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '600', color: INK2 }}>
                    Test Plan
                  </th>
                  <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '600', color: INK2 }}>
                    Procedure
                  </th>
                  <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '600', color: INK2 }}>
                    Evidence
                  </th>
                  <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '600', color: INK2 }}>
                    Result
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderBottom: `1px solid ${PANEL}` }}>
                  <td colSpan="6" style={{ padding: '2rem', textAlign: 'center', color: INK2 }}>
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
            Audit Findings
          </h2>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              onClick={() => setShowRepeatFindings(!showRepeatFindings)}
              style={{
                padding: '0.375rem 0.75rem',
                backgroundColor: showRepeatFindings ? '#ea580c' : PANEL,
                color: showRepeatFindings ? 'white' : INK2,
                border: `1px solid ${HAIR}`,
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
            <div style={{ textAlign: 'center', padding: '2rem', color: INK2 }}>
              No audit findings tracked.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {(showRepeatFindings ? repeatFindings : findings).map((finding) => (
                <div key={finding.id} style={{
                  padding: '0.75rem',
                  border: finding.is_repeat ? '2px solid #ea580c' : `1px solid ${HAIR}`,
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
                      <span style={{ fontWeight: '500', color: INK, fontSize: '0.875rem' }}>
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
                    <div style={{ fontSize: '0.75rem', color: INK2 }}>
                      Asset: {finding.asset_id || 'N/A'} • Control: {finding.source || 'N/A'}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '0.75rem', color: INK2 }}>MAP Target</div>
                      {finding.target_date ? (
                        <div style={{ fontWeight: '500', color: INK2, fontSize: '0.875rem' }}>
                          {new Date(finding.target_date).toLocaleDateString()}
                        </div>
                      ) : (
                        <div style={{ fontWeight: '400', color: INK3, fontSize: '0.875rem' }}>
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
        border: `1px solid ${HAIR}`,
        textAlign: 'center',
        fontSize: '0.875rem',
        color: INK2
      }}>
        Internal Audit Dashboard • Control testing data populated from evidence repository
      </div>
    </div>
  );
};

export default AuditDash;
