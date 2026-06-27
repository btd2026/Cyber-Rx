import { useState, useEffect } from 'react'
import type { CrownJewelSummary, GraphModel } from './types'
import { sampleSummary, sampleGraph } from './sampleData'
import { fetchSummary, fetchGraph } from './api'
import CrownJewelGraph from './CrownJewelGraph'
import CoverageMatrix from './CoverageMatrix'
import RiskHeatmap from './RiskHeatmap'

type ViewTab = 'summary' | 'graph' | 'controls' | 'risks'

const fmt = (n: number) => n >= 1_000_000 ? `$${(n / 1_000_000).toFixed(1)}M` : n >= 1_000 ? `$${(n / 1_000).toFixed(0)}K` : `$${n}`

export default function CrownJewelsView() {
  const [tab, setTab] = useState<ViewTab>('summary')
  const [summary, setSummary] = useState<CrownJewelSummary>(sampleSummary)
  const [graph, setGraph] = useState<GraphModel>(sampleGraph)
  const [live, setLive] = useState(false)

  useEffect(() => {
    let cancelled = false
    Promise.all([fetchSummary(), fetchGraph()]).then(([s, g]) => {
      if (cancelled) return
      if (s && !s.empty) { setSummary(s); setLive(true) }
      if (g && g.nodes && g.nodes.length > 0) { setGraph(g); setLive(true) }
    })
    return () => { cancelled = true }
  }, [])

  const tabs: { id: ViewTab; label: string }[] = [
    { id: 'summary', label: 'Crown Jewels' },
    { id: 'graph', label: 'Dependency Graph' },
    { id: 'controls', label: 'Control Coverage' },
    { id: 'risks', label: 'Risk Heatmap' },
  ]

  return (
    <section className="view active" id="crownjewels">
      <div className="vhead">
        <div className="q">
          Crown Jewel Analysis <span className="ans warn">{summary.counts.crown_jewels} Crown Jewels identified</span>
          {!live && <span style={{ fontSize: '11px', color: '#ca8a04', marginLeft: '8px' }}>Seed data</span>}
        </div>
        <div className="qsub">
          Which assets are mission-critical, what threatens them, and where are the control gaps?
        </div>
        <div className="lead">
          Deterministic criticality scoring across {summary.counts.assets} assets and {summary.counts.processes} business processes.
          Material exposure: <b>{fmt(summary.material_exposure_usd)}</b> ({summary.material_exposure_basis}).
        </div>
      </div>

      {/* Sub-navigation */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '16px', borderBottom: '1px solid #334155', paddingBottom: '8px' }}>
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              padding: '6px 16px',
              fontSize: '13px',
              fontWeight: tab === t.id ? 700 : 400,
              background: tab === t.id ? '#1e40af20' : 'transparent',
              border: tab === t.id ? '1px solid #2563eb' : '1px solid transparent',
              borderRadius: '6px',
              color: tab === t.id ? '#60a5fa' : '#94a3b8',
              cursor: 'pointer',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Summary tab */}
      {tab === 'summary' && (
        <>
          {/* KPI row */}
          <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}>
            <KpiCard label="Crown Jewels" value={String(summary.counts.crown_jewels)} accent="#dc2626" />
            <KpiCard label="Material Exposure" value={fmt(summary.material_exposure_usd)} accent="#ea580c" />
            <KpiCard label="Assets" value={String(summary.counts.assets)} accent="#2563eb" />
            <KpiCard label="Processes" value={String(summary.counts.processes)} accent="#059669" />
            <KpiCard label="Risks" value={String(summary.counts.risks)} accent="#ca8a04" />
            {summary.counts.control_gaps != null && <KpiCard label="Control Gaps" value={String(summary.counts.control_gaps)} accent="#7c3aed" />}
          </div>

          {/* Crown jewel list */}
          <div className="sec-h">
            <h3>Crown Jewel Assets</h3>
            <span className="meta">ranked by criticality score — click for breakdown</span>
          </div>
          <table className="tbl">
            <thead>
              <tr>
                <th>Asset</th>
                <th>Tier</th>
                <th>Score</th>
                <th>Rationale</th>
              </tr>
            </thead>
            <tbody>
              {summary.crown_jewels.map((cj) => (
                <tr key={cj.id}>
                  <td>
                    <div className="pn">{cj.name}</div>
                    <div style={{ fontSize: '10px', color: '#64748b' }}>{cj.type}</div>
                  </td>
                  <td>
                    <span className={`rk ${cj.tier === 'tier1' ? 'crit' : cj.tier === 'tier2' ? 'high' : 'med'}`}>
                      {cj.tier.toUpperCase()}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ width: '60px', height: '6px', background: '#1e293b', borderRadius: '3px', overflow: 'hidden' }}>
                        <div style={{ width: `${cj.score}%`, height: '100%', background: cj.score >= 85 ? '#dc2626' : cj.score >= 70 ? '#ea580c' : '#ca8a04', borderRadius: '3px' }} />
                      </div>
                      <span style={{ fontSize: '12px', fontWeight: 700 }}>{cj.score}</span>
                    </div>
                  </td>
                  <td style={{ fontSize: '11px', maxWidth: '300px' }}>{cj.rationale}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Factor breakdown */}
          {summary.crown_jewels.length > 0 && (
            <>
              <div className="sec-h" style={{ marginTop: '16px' }}>
                <h3>Scoring Factor Breakdown</h3>
                <span className="meta">contribution of each factor to the criticality score</span>
              </div>
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                {summary.crown_jewels.map((cj) => (
                  <div key={cj.id} className="panel" style={{ flex: '1 1 200px', maxWidth: '280px', padding: '12px' }}>
                    <div style={{ fontWeight: 700, fontSize: '13px', marginBottom: '8px' }}>{cj.name}</div>
                    {Object.entries(cj.breakdown).map(([factor, value]) => (
                      <div key={factor} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '3px 0' }}>
                        <span style={{ fontSize: '11px', color: '#94a3b8', width: '120px' }}>{factor.replace(/_/g, ' ')}</span>
                        <div style={{ flex: 1, height: '4px', background: '#1e293b', borderRadius: '2px', overflow: 'hidden' }}>
                          <div style={{ width: `${Math.min(100, value * 100 / 0.35)}%`, height: '100%', background: '#2563eb', borderRadius: '2px' }} />
                        </div>
                        <span style={{ fontSize: '10px', fontWeight: 600, width: '30px', textAlign: 'right' }}>{(value * 100).toFixed(0)}%</span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Material exposure */}
          {summary.material_exposure_items.length > 0 && (
            <>
              <div className="sec-h" style={{ marginTop: '16px' }}>
                <h3>Material Exposure Breakdown</h3>
                <span className="meta">{summary.material_exposure_basis}</span>
              </div>
              <table className="tbl">
                <thead>
                  <tr>
                    <th>Risk</th>
                    <th>Severity</th>
                    <th style={{ textAlign: 'right' }}>Exposure</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.material_exposure_items.map((item, i) => (
                    <tr key={i}>
                      <td>{item.risk}</td>
                      <td><span className={`rk ${item.severity === 'Critical' ? 'crit' : item.severity === 'High' ? 'high' : 'med'}`}>{item.severity}</span></td>
                      <td style={{ textAlign: 'right', fontWeight: 600 }}>{fmt(item.exposure_usd)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </>
      )}

      {/* Graph tab */}
      {tab === 'graph' && (
        <div style={{ height: '560px', position: 'relative' }}>
          <CrownJewelGraph graph={graph} />
        </div>
      )}

      {/* Controls tab */}
      {tab === 'controls' && <CoverageMatrix graph={graph} />}

      {/* Risks tab */}
      {tab === 'risks' && <RiskHeatmap graph={graph} />}
    </section>
  )
}

function KpiCard({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div className="panel" style={{ flex: '1 1 130px', padding: '12px 16px', borderTop: `3px solid ${accent}`, minWidth: '130px' }}>
      <div style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
      <div style={{ fontSize: '20px', fontWeight: 700, marginTop: '4px' }}>{value}</div>
    </div>
  )
}
