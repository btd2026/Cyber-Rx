/**
 * Guards for the crown-jewel "why?" link (CyberRXNew/public/ciso5.js). Clicking "why?"
 * on an at-risk crown jewel must open a PLAIN-ENGLISH explanation (c5CrownWhy) — the
 * identity/access path is the exposed route, named with the real MFA / PAM deployment
 * gaps — NOT the modeled-dollars metric drilldown (data-c5m="exp_identity") it used to.
 */

const fs = require('fs');
const path = require('path');

const src = fs.readFileSync(path.resolve(__dirname, '../../../CyberRXNew/public/ciso5.js'), 'utf8');

describe('crown-jewel "why?" opens a plain-English explanation, not the $ metric', () => {
  it('the link no longer routes to the exp_identity metric drilldown', () => {
    // was: data-c5m="'+x.why+'" (opened the "Identity sprawl in cloud" $ inspector)
    expect(src).not.toContain('data-c5m="\'+x.why+\'"');
    expect(src).toContain('data-c5crownwhy="\'+c5esc(x.name)+\'"');
    expect(src).toContain('· why? ›');
  });
  it('a dedicated click handler opens c5CrownWhy for [data-c5crownwhy]', () => {
    expect(src).toContain("e.target.closest('[data-c5crownwhy]')");
    expect(src).toContain('c5CrownWhy(w.getAttribute(\'data-c5crownwhy\'))');
    expect(src).toContain('function c5CrownWhy(name)');
  });
});

describe('c5CrownWhy — behavioral plain-English output', () => {
  const a = src.indexOf('function c5CrownWhy(');
  const code = src.slice(a, src.indexOf('\nfunction ', a + 10));

  function run(mfa, pam) {
    global.CAP_BY_KEY = { mfa: { k: 'mfa' }, pam: { k: 'pam' } };
    global.capDeploy = (c) => (c === global.CAP_BY_KEY.mfa ? mfa : pam);
    global.c5esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
    let appended = null;
    global.document = {
      getElementById: () => null,
      createElement: () => ({ style: {}, set innerHTML(v) { this._h = v; }, get innerHTML() { return this._h; }, addEventListener() {} }),
      body: { appendChild: (el) => { appended = el; } },
    };
    // eslint-disable-next-line no-eval
    eval(code + '\n;c5CrownWhy("Active Directory / Entra ID");');
    const html = appended && appended._h;
    delete global.CAP_BY_KEY; delete global.capDeploy; delete global.c5esc; delete global.document;
    return html;
  }

  it('names the asset, the identity path, and the real MFA/PAM gaps', () => {
    const html = run(96, 60);
    expect(html).toMatch(/Active Directory \/ Entra ID/);
    expect(html).toMatch(/At risk/);
    expect(html).toMatch(/identity &amp; access path/);
    expect(html).toMatch(/96% deployed/);
    expect(html).toMatch(/4% of accounts are still unprotected/);
    expect(html).toMatch(/60% deployed/);
    expect(html).toMatch(/40% of accounts are still unprotected/);
    expect(html).toMatch(/What to do:/);
    expect(html).not.toMatch(/data-c5m/); // never jumps to the $ metric
  });
  it('degrades gracefully when a control has no telemetry', () => {
    const html = run(null, 60);
    expect(html).toMatch(/not fully rolled out yet/); // MFA unknown
    expect(html).toMatch(/60% deployed/); // PAM still concrete
  });
});
