/**
 * Correlated Finding Page  (T-113)
 *
 * Executive narrative for a correlated finding. Re-skinned onto the shared
 * component kit (frontend/src/ui) + --rx-* tokens; data flow is unchanged.
 *
 * Props: findingId, goBack, authToken, orgId, api_url
 * Source: POST /api/correlation/narrative/:findingId
 */

import { useState, useEffect } from 'react';
import { Panel, Cols, KV, Srow, Pill, Button } from '../ui';

// finding severity / status / data-sensitivity → shared kit status kind.
const sevKind = (s) => {
  switch (String(s || '').toLowerCase()) {
    case 'critical': return 'crit';
    case 'high': case 'medium': return 'warn';
    case 'low': return 'ok';
    default: return 'info';
  }
};
const statusKind = (s) => {
  switch (String(s || '').toLowerCase()) {
    case 'open': return 'crit';
    case 'in progress': return 'warn';
    case 'closed': case 'resolved': return 'ok';
    default: return 'info';
  }
};
const sensKind = (s) => (s === 'High' ? 'crit' : s === 'Medium' ? 'warn' : 'ok');
const usd = (n) => `$${Number(n || 0).toLocaleString()}`;
const titleCase = (k) => k.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase());

const CorrelatedFinding = (props) => {
  const { findingId, goBack, authToken, orgId, api_url } = props;

  const [narrative, setNarrative] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch the executive narrative for this finding (unchanged).
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

  if (loading) {
    return (
      <div className="rx-cf rx-cf--center">
        <CfStyles />
        <div className="rx-cf__spinner" />
        <p className="rx-cf__muted">Loading executive narrative…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rx-cf">
        <CfStyles />
        <Panel title="Error loading narrative">
          <p style={{ color: 'var(--rx-critical)', margin: '0 0 14px', lineHeight: 1.6 }}>{error}</p>
          {goBack && <Button primary onClick={goBack}>Go back</Button>}
        </Panel>
      </div>
    );
  }

  if (!narrative) return null;

  const { finding, executiveNarrative: ex } = narrative;
  const bp = ex.businessProcess;
  const fin = ex.financialExposure;
  const reg = ex.regulatory;
  const own = ex.ownership;

  return (
    <div className="rx-cf">
      <CfStyles />

      {/* Header */}
      <div className="rx-cf__head">
        <div className="rx-cf__headmain">
          <div className="rx-cf__badges">
            <Pill kind="info">Executive Narrative</Pill>
            {finding.severity && <Pill kind={sevKind(finding.severity)}>{finding.severity}</Pill>}
            {finding.status && <Pill kind={statusKind(finding.status)}>{finding.status}</Pill>}
          </div>
          <h1 className="rx-cf__title">{finding.title}</h1>
          <p className="rx-cf__meta">
            Finding ID: {finding.id}
            {finding.discoveredDate && <> • Discovered: {new Date(finding.discoveredDate).toLocaleDateString()}</>}
          </p>
        </div>
        {goBack && <Button onClick={goBack}>← Back</Button>}
      </div>

      {/* Executive Summary */}
      <Panel title="Executive summary">
        <p style={{ color: 'var(--rx-text)', lineHeight: 1.6, margin: 0, fontSize: 15 }}>{ex.summary}</p>
      </Panel>

      <div style={{ marginTop: 18 }}>
        <Cols>
          {/* Left column */}
          <div>
            {bp && (
              <Panel title="Affected business process">
                <KV k="Process name" v={bp.name} />
                {bp.tier && <KV k="Tier" v={<Pill kind={bp.tier === 'Tier 1' ? 'warn' : 'info'}>{bp.tier}</Pill>} />}
                {bp.criticality && <KV k="Criticality" v={<Pill kind="crit">{bp.criticality}</Pill>} />}
              </Panel>
            )}

            {Array.isArray(ex.dataInvolvement) && ex.dataInvolvement.length > 0 && (
              <Panel title="Data involvement">
                {ex.dataInvolvement.map((d, i) => (
                  <Srow key={i} name={d.classification || d.type} stat={d.sensitivity} statusKind={sensKind(d.sensitivity)} />
                ))}
              </Panel>
            )}

            {ex.threat && (
              <Panel title="Threat scenario">
                <KV k="Threat type" v={ex.threat.name} />
                {ex.threat.probability != null && <KV k="Probability" v={`${ex.threat.probability}%`} />}
                {ex.threat.impact && <KV k="Impact level" v={<Pill kind="crit">{ex.threat.impact}</Pill>} />}
                {ex.threat.mitreTechnique && <KV k="MITRE ATT&CK" v={<span className="rx-cf__code">{ex.threat.mitreTechnique}</span>} />}
              </Panel>
            )}
          </div>

          {/* Right column */}
          <div>
            {fin && (
              <Panel title="Financial exposure">
                {fin.totalGrossExposure != null && <KV k="Total gross exposure" v={usd(fin.totalGrossExposure)} kind="crit" />}
                {fin.netExposure != null && <KV k="Net exposure (after insurance)" v={usd(fin.netExposure)} kind="crit" />}
                {fin.breakdown && Object.entries(fin.breakdown).map(([k, v]) => (
                  v > 0 ? <KV key={k} k={titleCase(k)} v={usd(v)} /> : null
                ))}
              </Panel>
            )}

            {reg && (
              <Panel title="Regulatory obligations">
                {Array.isArray(reg.frameworks) && reg.frameworks.length > 0 && (
                  <div className="rx-cf__chips">
                    {reg.frameworks.map((fw, i) => <Pill key={i} kind="info">{fw}</Pill>)}
                  </div>
                )}
                {Array.isArray(reg.obligations) && reg.obligations.map((o, i) => (
                  <Srow key={i} name={o.name} sub={o.source} stat={o.notificationTimeline} statusKind="crit" />
                ))}
              </Panel>
            )}

            {own && (
              <Panel title="Ownership & accountability">
                {own.executive && <KV k="Executive owner" v={own.executive.name || own.executive.roleId} />}
                {own.remediationOwner && <KV k="Remediation owner" v={own.remediationOwner} />}
                {own.businessProcessOwner && <KV k="Business process owner" v={own.businessProcessOwner} />}
              </Panel>
            )}
          </div>
        </Cols>
      </div>

      {/* Footer */}
      <div className="rx-cf__foot">
        <div className="rx-cf__meta">Last updated: {new Date().toLocaleString()}</div>
        <div style={{ display: 'flex', gap: 12 }}>
          <Button onClick={() => window.print()}>Print / Export PDF</Button>
          {goBack && <Button primary onClick={goBack}>Done</Button>}
        </div>
      </div>
    </div>
  );
};

function CfStyles() {
  return (
    <style>{`
      .rx-cf { max-width: 1120px; margin: 0 auto; padding: 4px 0 8px; color: var(--rx-text); font-family: var(--rx-font-body); }
      .rx-cf--center { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 14px; min-height: 60vh; }
      .rx-cf__muted { color: var(--rx-muted); font-size: 14px; }
      .rx-cf__spinner { width: 40px; height: 40px; border: 3px solid var(--rx-border); border-top-color: var(--rx-brand); border-radius: 50%; animation: rxspin 1s linear infinite; }
      @keyframes rxspin { to { transform: rotate(360deg); } }
      .rx-cf__head { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; margin-bottom: 20px; padding-bottom: 18px; border-bottom: 1px solid var(--rx-border); }
      .rx-cf__headmain { flex: 1; min-width: 0; }
      .rx-cf__badges { display: flex; align-items: center; gap: 9px; flex-wrap: wrap; margin-bottom: 11px; }
      .rx-cf__title { font-family: var(--rx-font-display); font-weight: 700; font-size: 24px; letter-spacing: -.018em; line-height: 1.2; margin: 0; color: var(--rx-text); }
      .rx-cf__meta { color: var(--rx-muted); font-size: 13px; margin: 7px 0 0; }
      .rx-cf__code { font-family: var(--rx-font-mono); font-size: 12px; color: var(--rx-critical); background: var(--rx-surface-2); border: 1px solid var(--rx-border); border-radius: 5px; padding: 2px 7px; }
      .rx-cf__chips { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 12px; }
      .rx-cf__foot { margin-top: 22px; padding-top: 18px; border-top: 1px solid var(--rx-border); display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
      @media print { .rx-cf button { display: none !important; } }
    `}</style>
  );
}

export default CorrelatedFinding;
