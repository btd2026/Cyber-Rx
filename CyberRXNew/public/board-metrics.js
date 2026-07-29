/* ============================================================================
   Tab 05 — Cybersecurity metrics (board view).
   ----------------------------------------------------------------------------
   The handful of numbers a Fortune-100 board actually governs cyber on, each
   pulled from LIVE telemetry (never re-typed), RAG-banded, shown against a
   target/appetite, and — the differentiator — labelled by how it is KNOWN
   (sensor-proven vs attested). It answers the board's real questions:
     • Are we within our cyber-risk appetite, and is it trending the right way?
     • What is our loss exposure in dollars, and how much is uncovered?
     • Do the controls protecting our crown jewels actually work — and how much
       of that is proven vs asserted?
     • Can we recover (ransomware), and how fast do we detect & respond?
     • How do we compare, and is anything disclosable?
   Every tile degrades honestly to "not connected — <how to connect>" rather than
   inventing a number. Scope-aware (Enterprise → Region → Entity).
   ========================================================================== */
(function () {
  'use strict';
  function esc(s) { return (typeof c5esc === 'function') ? c5esc(s) : String(s == null ? '' : s); }
  function d(fn, fb) { try { var v = fn(); return v == null ? fb : v; } catch (_) { return fb; } }
  function sigv(k) { return d(function () { return (typeof sig === 'function') ? sig(k) : null; }, null); }
  function money(n) { return d(function () { return (typeof usd === 'function') ? usd(n) : ('$' + Math.round(n)); }, '—'); }
  function pctCol(p) { return (typeof capColor === 'function') ? capColor(p) : (p == null ? 'muted' : p >= 90 ? 'good' : p >= 75 ? 'blue' : p >= 50 ? 'warn' : 'crit'); }

  // Total modeled loss exposure behind the crown jewels (value chain's own $).
  function totalExposure() {
    var vc = (typeof LIVE !== 'undefined' && LIVE && LIVE.value_chain) || null;
    if (!vc || !vc.functions) return null;
    var t = 0, any = false;
    vc.functions.forEach(function (f) { (f.processes || []).forEach(function (p) { (p.assets || []).forEach(function (a) { (a.risks || []).forEach(function (r) { var e = Number(r.exposure_usd || r.process_stop_usd || 0); if (e) { t += e; any = true; } }); }); }); });
    return any ? t : null;
  }

  // Connected controls: mean deployment (defensive coverage) + assurance split.
  function controlPosture() {
    if (typeof CAPS === 'undefined' || typeof capDeploy !== 'function') return null;
    var conn = [], sum = 0, proven = 0, semi = 0, attested = 0;
    CAPS.forEach(function (c) { var p = capDeploy(c); if (p != null) { conn.push(p); sum += p; if (c.auto === 'auto') proven++; else if (c.auto === 'semi') semi++; else attested++; } });
    if (!conn.length) return { connected: 0 };
    return { connected: conn.length, coverage: Math.round(sum / conn.length), proven: proven, semi: semi, attested: attested, provenPct: Math.round(proven / conn.length * 100) };
  }

  // A tile: label, value, RAG colour, a target/appetite sub-line, the board read,
  // and whether the number is sensor-proven (for the provenance footer).
  function tile(t) {
    var col = t.color || 'ink';
    return '<div style="border:1px solid var(--line);border-radius:12px;padding:14px 16px;background:var(--surface);display:flex;flex-direction:column;gap:6px;min-height:118px">'
      + '<div style="font-size:10.5px;font-weight:800;letter-spacing:.05em;text-transform:uppercase;color:var(--muted);display:flex;justify-content:space-between;align-items:center">' + esc(t.label)
      + (t.proven === true ? '<span title="Sensor-proven from live telemetry" style="font-size:8px;font-weight:800;color:var(--good);border:1px solid color-mix(in srgb,var(--good) 40%,transparent);border-radius:4px;padding:0 4px">● PROVEN</span>'
        : t.proven === false ? '<span title="Attested / not sensor-proven" style="font-size:8px;font-weight:800;color:var(--muted);border:1px solid var(--line);border-radius:4px;padding:0 4px">ATTESTED</span>' : '') + '</div>'
      + '<div style="font-size:26px;font-weight:800;color:var(--' + col + ');line-height:1;font-variant-numeric:tabular-nums">' + t.value + '</div>'
      + (t.sub ? '<div style="font-size:11px;color:var(--ink-2)">' + t.sub + '</div>' : '')
      + (t.read ? '<div style="font-size:11px;color:var(--muted);margin-top:auto;line-height:1.45">' + t.read + '</div>' : '')
      + '</div>';
  }
  function group(title, tiles) {
    return '<div style="margin:16px 0 2px;font-size:11px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:var(--muted)">' + esc(title) + '</div>'
      + '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:12px">' + tiles.join('') + '</div>';
  }

  function c5BoardMetrics() {
    var host = document.getElementById('c5-boardmetrics'); if (!host) return;
    var scope = (typeof c5Scope === 'function') ? c5Scope() : 'enterprise';
    var scopeLbl = (scope === 'enterprise') ? 'Enterprise' : ((typeof scopeLabel === 'function') ? scopeLabel(scope) : scope);
    var m = d(function () { return (typeof c5EntityRiskModel === 'function') ? c5EntityRiskModel(scope) : null; }, null);
    var v = m && m.verdict;
    var econ = (typeof LIVE !== 'undefined' && LIVE && LIVE.economics) || {};
    var post = controlPosture();

    // ── Hero: the one verdict + appetite + trend ──────────────────────────────
    var riskCol = v ? (v.band === 'low' ? 'good' : v.band === 'elevated' ? 'warn' : 'crit') : 'muted';
    var ragWord = v ? (v.band === 'low' ? 'GREEN · low' : v.band === 'elevated' ? 'AMBER · elevated' : 'RED · high') : '—';
    var exposure = d(function () { return Number(econ.ale) > 0 ? Number(econ.ale) : totalExposure(); }, null);
    var appetite = d(function () { return Number(econ.appetite) > 0 ? Number(econ.appetite) : null; }, null);
    var withinApp = (exposure != null && appetite != null) ? (exposure <= appetite) : null;
    // Trend from the quarterly ledger (lower ALE = improving).
    var trend = d(function () { var t = LIVE && LIVE.trend; if (!Array.isArray(t) || t.length < 2) return null; var a = Number(t[t.length - 2].ale), b = Number(t[t.length - 1].ale); if (!isFinite(a) || !isFinite(b) || a === 0) return null; return Math.round((b - a) / a * 100); }, null);
    var trendTxt = trend == null ? '' : (trend < 0 ? '<span style="color:var(--good);font-weight:700">▼ ' + Math.abs(trend) + '% exposure vs last quarter</span>' : trend > 0 ? '<span style="color:var(--crit);font-weight:700">▲ ' + trend + '% exposure vs last quarter</span>' : 'flat vs last quarter');

    var hero = '<div class="c5pa" style="margin:0 0 8px;padding:18px 20px;border-left:4px solid var(--' + riskCol + ')">'
      + '<div style="font-size:11px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:var(--muted)">Enterprise cyber-risk · ' + esc(scopeLbl) + '</div>'
      + '<div style="display:flex;gap:22px;align-items:baseline;flex-wrap:wrap;margin-top:6px">'
      + '<div style="font-size:30px;font-weight:800;color:var(--' + riskCol + ')">' + ragWord + (v ? ' <span style="font-size:16px;color:var(--muted)">· ' + v.riskOf5 + '/5 risk</span>' : '') + '</div>'
      + (withinApp != null ? '<div style="font-size:13px;font-weight:700;color:var(--' + (withinApp ? 'good' : 'crit') + ')">' + (withinApp ? '✓ within board appetite' : '✗ over board appetite') + '</div>' : '')
      + (trendTxt ? '<div style="font-size:12px">' + trendTxt + '</div>' : '')
      + '</div>'
      + (v ? '<div style="font-size:12.5px;color:var(--ink-2);margin-top:8px;line-height:1.5">' + v.nHigh + ' system' + (v.nHigh === 1 ? '' : 's') + ' at high exposure, ' + v.nElev + ' elevated — together ' + v.pctExposed + '% of critical processes' + (v.driver ? '. Top driver: <b>' + esc(v.driver.name) + '</b>' + (v.driver.ctrl ? ' (weakest control: ' + esc(v.driver.ctrl) + ')' : '') : '') + '.</div>' : '')
      + '</div>';

    // ── Metric tiles ──────────────────────────────────────────────────────────
    var risk = [
      tile({ label: 'Modeled loss exposure', value: exposure != null ? money(exposure) : '—', color: (withinApp === false ? 'crit' : exposure != null ? 'ink' : 'muted'),
        sub: appetite != null ? ('Board appetite: ' + money(appetite)) : 'Set a board appetite at onboarding',
        read: exposure == null ? 'Connect your value chain (crown jewels → revenue → risk) to quantify this.' : (withinApp === false ? 'Above appetite — the tail is what the funded decisions are sized to close.' : 'The material cyber loss the board is accountable for.') }),
      tile({ label: 'Critical processes exposed', value: v ? v.pctExposed + '%' : '—', color: v ? (v.pctExposed >= 50 ? 'crit' : v.pctExposed >= 25 ? 'warn' : 'good') : 'muted',
        read: v ? 'Share of crown-jewel processes not at low risk.' : 'Awaiting the value chain.' }),
      (function () {
        var ni = Number(econ.net_income), rev = Number(econ.revenue);
        var thr = ni > 0 ? 0.05 * ni : (rev > 0 ? 0.005 * rev : null);
        var above = (thr != null && exposure != null) ? (exposure >= thr) : null;
        return tile({ label: 'Regulatory / disclosure', value: thr == null ? '—' : (above ? 'At threshold' : 'Below'), color: above == null ? 'muted' : above ? 'warn' : 'good',
          sub: thr != null ? ('SEC materiality ≈ ' + money(thr)) : 'Connect financials',
          read: thr == null ? 'Add net income / revenue to size the SEC materiality line.' : (above ? 'Modeled exposure is at/above materiality — a modeled event would start the 4-day clock.' : 'Modeled exposure sits below the materiality line.') });
      })(),
    ];

    var ctrl = [
      tile({ label: 'Defensive coverage', value: post && post.coverage != null ? post.coverage + '%' : '—', color: post && post.coverage != null ? pctCol(post.coverage) : 'muted',
        sub: post && post.connected ? (post.connected + ' controls connected') : 'No controls connected',
        read: post && post.coverage != null ? 'Mean live deployment across your defensive stack.' : 'Connect your security tools to measure coverage.' }),
      tile({ label: 'Evidence quality', value: post && post.provenPct != null ? post.provenPct + '%' : '—', color: post && post.provenPct != null ? (post.provenPct >= 60 ? 'good' : post.provenPct >= 30 ? 'warn' : 'crit') : 'muted',
        sub: post && post.connected ? (post.proven + ' sensor-proven · ' + post.semi + ' semi · ' + post.attested + ' attested') : '',
        read: 'How much of the posture is proven by a sensor, not asserted on a policy.' }),
      tile({ label: 'Crown-jewel controls below par', value: m ? String(m.systems.filter(function (s) { return s.weakMit != null && s.weakMit < 75; }).length) : '—', color: 'ink',
        read: m ? 'Systems whose weakest mitigating control is under the 75% healthy line.' : 'Awaiting the entity model.' }),
    ];

    var mfa = sigv('mfa_pct'), pam = sigv('pam_pct'), bkp = sigv('backup_immutable_pct'), mttd = sigv('mttd_hrs');
    var resil = [
      tile({ label: 'Ransomware recovery readiness', value: bkp != null ? bkp + '%' : '—', color: bkp != null ? pctCol(bkp) : 'muted', proven: bkp != null ? true : undefined,
        sub: 'Immutable, restore-tested backups', read: bkp != null ? 'Share of crown jewels on an immutable, recoverable backup.' : 'Connect your backup platform (Rubrik / Veeam).' }),
      tile({ label: 'Identity exposure', value: mfa != null ? mfa + '%' : '—', color: mfa != null ? pctCol(mfa) : 'muted', proven: mfa != null ? true : undefined,
        sub: pam != null ? ('MFA ' + mfa + '% · PAM ' + pam + '%') : 'MFA coverage', read: mfa != null ? 'The most-attacked path — identity is where breaches start.' : 'Connect your identity provider (Entra / Okta).' }),
      tile({ label: 'Detection & response speed', value: mttd != null ? mttd + ' hrs' : '—', color: mttd != null ? (mttd <= 24 ? 'good' : mttd <= 72 ? 'warn' : 'crit') : 'muted', proven: mttd != null ? true : undefined,
        sub: 'Mean time to detect (MTTD)', read: mttd != null ? 'How fast we see an adversary — from SIEM telemetry.' : 'Connect your SIEM (Sentinel / Splunk).' }),
    ];

    var ext = [
      tile({ label: 'Trend', value: trend == null ? '—' : (trend < 0 ? '▼ improving' : trend > 0 ? '▲ worsening' : 'flat'), color: trend == null ? 'muted' : trend < 0 ? 'good' : trend > 0 ? 'crit' : 'ink',
        read: trend == null ? 'Two quarters of history needed to trend the program.' : 'Direction of modeled exposure quarter-over-quarter.' }),
      tile({ label: 'Peer benchmark', value: '—', color: 'muted', read: 'Sector-peer comparison runs on Nerion’s consent-based, k-anonymized peer network (flag-gated) — not a third-party rating.' }),
    ];

    // Provenance footer — how much of this board view is proven vs asserted.
    var connMetrics = [bkp, mfa, mttd].filter(function (x) { return x != null; }).length;
    var foot = '<div class="c5foot" style="margin-top:16px">'
      + (post && post.connected ? (post.proven + ' of ' + post.connected + ' controls are sensor-proven from live telemetry; ' + post.attested + ' attested. ') : '')
      + 'Every number here is pulled from your connected tools and value chain — none is re-typed. Where a tile shows “—”, that source is not yet connected and the board view says so rather than guessing. As of ' + new Date().toLocaleDateString() + '.</div>';

    host.innerHTML = '<div class="c5pa-eyebrow" style="margin:2px 0 10px">Cybersecurity metrics · board view · ' + esc(scopeLbl) + '</div>'
      + hero
      + group('Risk & financial exposure', risk)
      + group('Control effectiveness & assurance', ctrl)
      + group('Resilience & response', resil)
      + group('Trajectory & benchmark', ext)
      + foot;
  }
  window.c5BoardMetrics = c5BoardMetrics;
})();
