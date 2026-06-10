/**
 * AdminDatabase — hidden admin page at /admin-database
 *
 * View and edit every table in the application database. Not linked from any
 * navigation; reachable only by typing the URL. All requests require the
 * admin key (sent as X-Admin-Key and verified against ADMIN_API_KEY on the
 * backend), so the page is useless without it.
 */

import React, { useState, useEffect, useCallback } from 'react';

const API =
  (typeof window !== 'undefined' && window.__CYBERRX_API) ||
  (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_URL) ||
  'http://localhost:3001';

const S = {
  page: { minHeight: '100vh', background: '#0e1118', color: '#e6ecf5', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', padding: '24px 28px' },
  h1: { fontSize: 18, fontWeight: 800, margin: '0 0 2px' },
  sub: { color: '#8b95a8', fontSize: 11, marginBottom: 18 },
  input: { background: '#161b27', border: '1px solid #2a3346', borderRadius: 6, padding: '7px 10px', color: '#e6ecf5', fontSize: 12, outline: 'none' },
  btn: { background: '#1a2436', color: '#9bc0ff', border: '1px solid #2f4a7a', borderRadius: 6, padding: '7px 12px', fontSize: 12, cursor: 'pointer', fontWeight: 600 },
  btnDanger: { background: '#3a1212', color: '#ff7a6b', border: '1px solid #c0392b', borderRadius: 6, padding: '4px 8px', fontSize: 11, cursor: 'pointer' },
  tableBtn: (active) => ({ display: 'block', width: '100%', textAlign: 'left', padding: '5px 10px', fontSize: 11, cursor: 'pointer', borderRadius: 5, border: 'none', background: active ? '#1a2436' : 'transparent', color: active ? '#9bc0ff' : '#aebbd4' }),
  th: { padding: '6px 8px', textAlign: 'left', fontSize: 10, color: '#8b95a8', textTransform: 'uppercase', borderBottom: '1px solid #2a3346', whiteSpace: 'nowrap', position: 'sticky', top: 0, background: '#0e1118' },
  td: { padding: '4px 8px', fontSize: 11, borderBottom: '1px solid #1c2230', whiteSpace: 'nowrap', maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis' },
  cellInput: { background: '#241d0e', border: '1px solid #b8860b', borderRadius: 4, padding: '2px 6px', color: '#ffce5c', fontSize: 11, width: '95%' },
};

function fmtCell(v) {
  if (v === null || v === undefined) return 'NULL';
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
}

export default function AdminDatabase() {
  const [adminKey, setAdminKey] = useState(() => localStorage.getItem('cyberrx_admin_key') || '');
  const [connected, setConnected] = useState(false);
  const [tables, setTables] = useState([]);
  const [active, setActive] = useState(null);
  const [data, setData] = useState(null); // { columns, primaryKey, rows, total, offset }
  const [offset, setOffset] = useState(0);
  const [orgFilter, setOrgFilter] = useState('');
  const [editing, setEditing] = useState(null); // { rowIdx, col, value }
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');

  const headers = useCallback(() => ({ 'X-Admin-Key': adminKey, 'Content-Type': 'application/json' }), [adminKey]);

  const connect = useCallback(() => {
    setError(''); setStatus('Connecting…');
    fetch(`${API}/api/admin/db/tables`, { headers: headers() })
      .then((r) => { if (r.status === 403) throw new Error('Invalid admin key'); if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then((d) => {
        localStorage.setItem('cyberrx_admin_key', adminKey);
        setTables(d.tables || []); setConnected(true); setStatus(`${(d.tables || []).length} tables`);
      })
      .catch((e) => { setError(e.message); setStatus(''); setConnected(false); });
  }, [adminKey, headers]);

  const loadTable = useCallback((table, off = 0, org = orgFilter) => {
    setError(''); setStatus('Loading…'); setEditing(null);
    const qs = new URLSearchParams({ limit: '100', offset: String(off) });
    if (org) qs.set('org_id', org);
    fetch(`${API}/api/admin/db/${table}?${qs}`, { headers: headers() })
      .then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then((d) => { setActive(table); setData(d); setOffset(off); setStatus(`${d.total} rows`); })
      .catch((e) => { setError(e.message); setStatus(''); });
  }, [headers, orgFilter]);

  useEffect(() => { if (adminKey) connect(); /* auto-connect with stored key */ }, []); // eslint-disable-line

  function pkOf(row) {
    const pk = {};
    (data.primaryKey || []).forEach((c) => { pk[c] = row[c]; });
    return pk;
  }

  function saveCell(rowIdx, col, raw) {
    const row = data.rows[rowIdx];
    let value = raw;
    // Try to keep types sane: numbers stay numbers, 'null' -> NULL, JSON stays JSON.
    if (raw === 'NULL' || raw === 'null') value = null;
    else if (raw !== '' && !isNaN(Number(raw)) && typeof row[col] === 'number') value = Number(raw);
    else if (raw !== '' && /^[\[{]/.test(raw.trim())) { try { value = JSON.parse(raw); } catch (_) {} }
    setStatus('Saving…');
    fetch(`${API}/api/admin/db/${active}/row`, {
      method: 'PUT', headers: headers(),
      body: JSON.stringify({ pk: pkOf(row), updates: { [col]: value } }),
    })
      .then((r) => r.json().then((d) => ({ ok: r.ok, d })))
      .then(({ ok, d }) => {
        if (!ok) throw new Error(d.message || d.error || 'Update failed');
        const rows = data.rows.slice();
        rows[rowIdx] = d.updated;
        setData({ ...data, rows });
        setStatus('Saved ✓'); setEditing(null);
      })
      .catch((e) => { setError(e.message); setStatus(''); });
  }

  function deleteRow(rowIdx) {
    const row = data.rows[rowIdx];
    if (!window.confirm(`Delete this row from ${active}?\n${JSON.stringify(pkOf(row))}`)) return;
    fetch(`${API}/api/admin/db/${active}/row`, {
      method: 'DELETE', headers: headers(), body: JSON.stringify({ pk: pkOf(row) }),
    })
      .then((r) => r.json().then((d) => ({ ok: r.ok, d })))
      .then(({ ok, d }) => {
        if (!ok) throw new Error(d.message || d.error || 'Delete failed');
        loadTable(active, offset);
      })
      .catch((e) => setError(e.message));
  }

  if (!connected) {
    return (
      <div style={S.page}>
        <h1 style={S.h1}>⚙ CyberRX Database Admin</h1>
        <div style={S.sub}>Hidden page — admin key required. Nothing here works without it.</div>
        <div style={{ display: 'flex', gap: 8, maxWidth: 440 }}>
          <input type="password" placeholder="Admin key (ADMIN_API_KEY)" value={adminKey}
            onChange={(e) => setAdminKey(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && connect()}
            style={{ ...S.input, flex: 1 }} />
          <button style={S.btn} onClick={connect}>Connect</button>
        </div>
        {error && <div style={{ color: '#ff7a6b', fontSize: 12, marginTop: 10 }}>{error}</div>}
        {status && <div style={{ color: '#8b95a8', fontSize: 12, marginTop: 10 }}>{status}</div>}
      </div>
    );
  }

  return (
    <div style={S.page}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <div>
          <h1 style={S.h1}>⚙ CyberRX Database Admin</h1>
          <div style={S.sub}>Click a cell to edit · Enter saves · Esc cancels {status && <span style={{ color: '#5fe39b' }}> — {status}</span>}{error && <span style={{ color: '#ff7a6b' }}> — {error}</span>}</div>
        </div>
        <button style={S.btn} onClick={() => { localStorage.removeItem('cyberrx_admin_key'); setConnected(false); setAdminKey(''); }}>Disconnect</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '230px 1fr', gap: 18 }}>
        {/* Table list */}
        <div style={{ borderRight: '1px solid #2a3346', paddingRight: 10, maxHeight: 'calc(100vh - 120px)', overflowY: 'auto' }}>
          {tables.map((t) => (
            <button key={t.table} style={S.tableBtn(active === t.table)} onClick={() => loadTable(t.table, 0)}>
              {t.table} <span style={{ color: '#6f7a8d' }}>({t.rows})</span>
            </button>
          ))}
        </div>

        {/* Rows */}
        <div style={{ overflowX: 'auto', maxHeight: 'calc(100vh - 120px)', overflowY: 'auto' }}>
          {!data && <div style={{ color: '#8b95a8', fontSize: 12 }}>Select a table.</div>}
          {data && (
            <>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#9bc0ff' }}>{active}</span>
                <span style={{ fontSize: 11, color: '#6f7a8d' }}>PK: {(data.primaryKey || []).join(', ') || '(none — editing disabled)'}</span>
                <input placeholder="filter org_id…" value={orgFilter} onChange={(e) => setOrgFilter(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && loadTable(active, 0, orgFilter)} style={{ ...S.input, width: 260, padding: '4px 8px' }} />
                <button style={S.btn} onClick={() => loadTable(active, 0, orgFilter)}>Apply</button>
                <span style={{ flex: 1 }} />
                <button style={S.btn} disabled={offset === 0} onClick={() => loadTable(active, Math.max(0, offset - 100))}>← Prev</button>
                <span style={{ fontSize: 11, color: '#8b95a8' }}>{offset + 1}–{Math.min(offset + 100, data.total)} of {data.total}</span>
                <button style={S.btn} disabled={offset + 100 >= data.total} onClick={() => loadTable(active, offset + 100)}>Next →</button>
              </div>
              <table style={{ borderCollapse: 'collapse', width: '100%' }}>
                <thead>
                  <tr>
                    <th style={S.th}></th>
                    {data.columns.map((c) => (
                      <th key={c.column_name} style={S.th}>
                        {c.column_name}{(data.primaryKey || []).includes(c.column_name) ? ' 🔑' : ''}
                        <div style={{ fontWeight: 400, color: '#5a6477' }}>{c.data_type}</div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.rows.map((row, ri) => (
                    <tr key={ri}>
                      <td style={S.td}>
                        {(data.primaryKey || []).length > 0 && (
                          <button style={S.btnDanger} title="Delete row" onClick={() => deleteRow(ri)}>✕</button>
                        )}
                      </td>
                      {data.columns.map((c) => {
                        const col = c.column_name;
                        const isPk = (data.primaryKey || []).includes(col);
                        const isEditing = editing && editing.rowIdx === ri && editing.col === col;
                        return (
                          <td key={col} style={{ ...S.td, cursor: isPk || !(data.primaryKey || []).length ? 'default' : 'pointer', color: isPk ? '#7aa2ff' : '#cdd6e6' }}
                            title={fmtCell(row[col])}
                            onClick={() => { if (!isPk && (data.primaryKey || []).length) setEditing({ rowIdx: ri, col, value: fmtCell(row[col]) }); }}>
                            {isEditing ? (
                              <input autoFocus style={S.cellInput} value={editing.value}
                                onChange={(e) => setEditing({ ...editing, value: e.target.value })}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') saveCell(ri, col, editing.value);
                                  if (e.key === 'Escape') setEditing(null);
                                }}
                                onBlur={() => setEditing(null)} />
                            ) : fmtCell(row[col])}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
