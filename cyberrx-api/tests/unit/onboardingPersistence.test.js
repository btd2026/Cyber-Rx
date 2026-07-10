/**
 * Guards for onboarding uploads surviving a reload. The register rows (SBOM, risk
 * appetite, regulatory, materiality, benchmark) are serialized by makeRowList.collect()
 * keyed by each field's `key` (the backend-payload shape) — so makeRowList.add() must
 * accept that shape on restore, not only the CSV-import shape (keyed by `cls`). Money
 * fields must round-trip their full-dollar snapshot back to a clean number + unit.
 * CSV import and AI-inventory load also persist immediately (obSaveSoon), and the
 * AI-inventory badge is restored so the loaded state reads as saved.
 */

const fs = require('fs');
const path = require('path');

const onb = fs.readFileSync(path.resolve(__dirname, '../../../CyberRXNew/public/onboarding.html'), 'utf8');
const mrl = onb.slice(onb.indexOf('function makeRowList('), onb.indexOf('\n  var SBOM=makeRowList'));

describe('makeRowList rows round-trip through save → restore', () => {
  it('add() accepts BOTH the import shape (cls) and the snapshot shape (key)', () => {
    expect(mrl).toContain('var raw=(v[f.cls]!=null)?v[f.cls]:(v[f.key]!=null?v[f.key]:null);');
  });
  it('money fields rescale a full-dollar snapshot back to a clean value + unit', () => {
    expect(mrl).toContain("if(f.type==='money'){");
    expect(mrl).toContain('var unit=num>=1e9?1e9:(num>=1e6?1e6:(num>=1e3?1e3:1))');
    expect(mrl).toContain('if(uu)uu.value=String(unit);');
    // import path (cls present) keeps the raw number part, default unit
    expect(mrl).toContain('if(v[f.cls]!=null){el.value=raw;}');
  });
  it('collect() still emits the backend key-shape (so the payload is unchanged)', () => {
    expect(mrl).toContain('o[f.key]=');
  });
});

describe('uploads persist immediately, not only on the 6s backstop', () => {
  it('a CSV import triggers an immediate save', () => {
    expect(onb).toContain('if(n&&typeof obSaveSoon===\'function\')obSaveSoon();');
  });
  it('loading the AI inventory triggers an immediate save + remembers the count', () => {
    expect(onb).toContain('AI_INV._count=rows.length;');
    expect(onb).toContain("if(typeof obSaveSoon==='function')obSaveSoon(); // persist the loaded inventory immediately");
  });
  it('restoring brings back the AI-inventory badge + message so it reads as saved', () => {
    expect(onb).toContain('if(AI_INV._loaded){var cnt=AI_INV._count||');
    expect(onb).toContain("bas.textContent='✓ '+cnt+' assets'");
    expect(onb).toMatch(/\['aiInvMsg','aiGovInvMsg'\]\.forEach/);
  });
});

describe('behavioral — a money register survives clear + re-add from its snapshot', () => {
  it('import → collect → clear → re-add → collect is identity', () => {
    global.OB_REGISTERS = {};
    function El(tag) { this.tag = tag; this.children = []; this.attrs = {}; this.style = {}; this.value = ''; this.parentNode = null; }
    El.prototype.querySelectorAll = function (sel) { const cls = sel.replace('.', ''); const out = []; (function walk(n) { n.children.forEach((c) => { if (c._classList && c._classList.indexOf(cls) >= 0) out.push(c); walk(c); }); })(this); return out; };
    El.prototype.querySelector = function (sel) { const cls = sel.replace('.', ''); let found = null; (function walk(n) { for (let i = 0; i < n.children.length && !found; i++) { const c = n.children[i]; if (c._classList && c._classList.indexOf(cls) >= 0) { found = c; return; } walk(c); } })(this); return found; };
    El.prototype.appendChild = function (c) { c.parentNode = this; this.children.push(c); return c; };
    El.prototype.insertBefore = function (c) { this.children.unshift(c); c.parentNode = this; };
    El.prototype.setAttribute = function (k, v) { this.attrs[k] = v; };
    El.prototype.getAttribute = function (k) { return this.attrs[k] != null ? this.attrs[k] : null; };
    El.prototype.addEventListener = function () {};
    El.prototype.remove = function () { if (this.parentNode) { const i = this.parentNode.children.indexOf(this); if (i >= 0) this.parentNode.children.splice(i, 1); } };
    Object.defineProperty(El.prototype, 'className', { set(v) { this._classList = v.split(' '); }, get() { return (this._classList || []).join(' '); } });
    Object.defineProperty(El.prototype, 'innerHTML', { set(v) { this.children = []; const self = this; const re = /class="([^"]*)"/g; let m; while ((m = re.exec(v))) { const cl = m[1]; const e = new El(/rl-del/.test(cl) ? 'button' : 'input'); e._classList = cl.split(' '); if (/munit/.test(cl)) e.value = '1000000'; self.appendChild(e); } }, get() { return ''; } });
    const wraps = {};
    const w = new El('div'); w.id = 'rapRows'; const p = new El('div'); p.appendChild(w); wraps.rapRows = w;
    global.document = {
      getElementById: (id) => wraps[id] || null,
      createElement: (t) => new El(t),
      querySelectorAll: (sel) => { const mm = /#(\w+) \.(\S+)/.exec(sel); if (mm) { const ww = wraps[mm[1]]; return ww ? ww.querySelectorAll('.' + mm[2]) : []; } return []; },
    };

    // strict-mode eval won't leak the declaration into this scope — return it explicitly
    // eslint-disable-next-line no-eval
    const makeRowListFn = eval(mrl + '\n;makeRowList');
    const RAP = makeRowListFn('rapRows', 'rap-row', [
      { cls: 'rap-cat', key: 'category', w: '1.6fr' },
      { cls: 'rap-app', key: 'appetite_usd', type: 'money', w: '1.1fr' },
      { cls: 'rap-thr', key: 'threshold', w: '1fr' },
    ], 'brap', 'category');

    RAP.add({ 'rap-cat': 'Identity & access', 'rap-app': '120', 'rap-thr': 'High' }); // CSV import shape
    const snap = RAP.collect();
    expect(snap[0]).toEqual({ category: 'Identity & access', appetite_usd: 120000000, threshold: 'High' });

    RAP.clear();
    snap.forEach((v) => RAP.add(v)); // reload: re-add from the key-shaped snapshot
    const snap2 = RAP.collect();
    expect(snap2).toEqual(snap); // faithful round-trip (was empty before the fix)

    const row = wraps.rapRows.querySelectorAll('.rap-row')[0];
    expect(row.querySelector('.rap-app').value).toBe('120');       // clean number
    expect(row.querySelector('.rap-appu').value).toBe('1000000');  // unit = M

    delete global.document; delete global.OB_REGISTERS;
  });
});
