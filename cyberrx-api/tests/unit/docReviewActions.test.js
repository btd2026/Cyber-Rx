/**
 * Guards for three document-review affordances in the CISO Frameworks view:
 *  1. every missing-document gap in "Close the gap" gets an "upload now →" link that
 *     deep-links onboarding to the exact uploader for that document type,
 *  2. "open the document reference" draws a PERSISTENT green transparent box around the
 *     referenced control (not a brief flash),
 *  3. each reviewed document header gets an "Open document" button that reads the
 *     document text captured at onboarding upload.
 */

const fs = require('fs');
const path = require('path');

const ciso = fs.readFileSync(path.resolve(__dirname, '../../../CyberRXNew/public/ciso5.js'), 'utf8');
const onb = fs.readFileSync(path.resolve(__dirname, '../../../CyberRXNew/public/onboarding.html'), 'utf8');
const idx = fs.readFileSync(path.resolve(__dirname, '../../../CyberRXNew/public/index.html'), 'utf8');

describe('1 · missing-document gaps get an "upload now" deep-link', () => {
  it('c5fwGaps carries the onboarding doc-type key (s) for each gap', () => {
    expect(ciso).toContain('var src=d?d.s:(node.r53doc||label);');
    expect(ciso).toContain('{kind:kind,label:label,n:0,s:src}');
  });
  it('the Close-the-gap box renders an upload-now link only for document gaps', () => {
    expect(ciso).toContain("g.kind==='d'?(' <a class=\"c5gap-up\" data-c5gapup=\"'+c5esc(g.s||g.label)+'\"");
    expect(ciso).toContain('upload now →</a>');
  });
  it('the link is wired and routes to onboarding deep-linked to the doc type', () => {
    expect(ciso).toContain('host.querySelectorAll(\'[data-c5gapup]\')');
    expect(ciso).toContain('function c5GapUpload(target)');
    expect(ciso).toContain("window.location.href=base+'#upload='+encodeURIComponent(target||'')");
  });
  it('asks the shell to switch views (keeps the cockpit) rather than navigating its own iframe', () => {
    // regression: window.location.href replaced the cockpit iframe with onboarding
    expect(ciso).toContain('if(window.parent&&window.parent!==window){');
    expect(ciso).toContain("window.parent.postMessage({type:'cyberrx-goto-onboarding',tool:'document review',upload:target||''},'*');");
  });
  it('the shell forwards the upload target to the onboarding iframe', () => {
    expect(idx).toContain('(e.data.tool||e.data.upload)');
    expect(idx).toContain('upload:e.data.upload');
  });
  it('onboarding focuses the uploader from the postMessage (not only the hash)', () => {
    expect(onb).toContain('function obFocusUpload(target)');
    expect(onb).toContain('if(e.data.upload){try{obFocusUpload(String(e.data.upload));}catch(_){}return;}');
  });
  it('onboarding resolves the deep-link to the right uploader + tab', () => {
    expect(onb).toContain('function obHandleUploadDeepLink()');
    expect(onb).toContain('mu=/[#&]upload=([^&]+)/.exec(h)');
    expect(onb).toContain("var isAi=t?/^AI /.test(t.l):false,selId=isAi?'aiGovDocType':'obDocType';");
    expect(onb).toContain("if(typeof obShow==='function')obShow('gov');");
    expect(onb).toContain('.ob-uploadflash{animation:obUploadFlash');
    expect(onb).toContain('window.addEventListener(\'hashchange\',obHandleUploadDeepLink);');
  });
});

describe('1b · missing-telemetry gaps get a "connect now" link, routed shell-safely', () => {
  it('the Close-the-gap box renders a connect-now link for tool gaps', () => {
    expect(ciso).toContain("data-c5gapconn=\"'+c5esc(g.label)+'\"");
    expect(ciso).toContain('connect now →</a>');
  });
  it('the link is wired and c5GapConnect switches views via the shell (not its own frame)', () => {
    expect(ciso).toContain("host.querySelectorAll('[data-c5gapconn]')");
    expect(ciso).toContain('function c5GapConnect(tool)');
    expect(ciso).toContain("window.parent.postMessage({type:'cyberrx-goto-onboarding',tool:tool||''},'*');");
    expect(ciso).toContain("window.location.href=base+'#connect='+encodeURIComponent(tool||'')"); // standalone fallback
  });
  it('onboarding routes a tool to its connector, defaulting to "Connect your systems"', () => {
    expect(onb).toContain('function obFocusTool(toolStr)');
    expect(onb).toContain("else id='secTools';"); // any unrecognized tool lands on the connectors section
    expect(onb).toContain('try{obFocusTool(e.data.tool);}catch(_){}');
    expect(onb).toContain('else if(mc)obFocusTool(decodeURIComponent(mc[1]));'); // #connect= hash
  });
});

describe('2 · "open the document reference" boxes the control persistently', () => {
  it('adds a persistent green transparent outline class (not a timed flash)', () => {
    expect(ciso).toContain('.c5doc-ref{outline:2px solid var(--good);outline-offset:4px;border-radius:6px;background:transparent}');
    expect(ciso).toContain("el.classList.add('c5doc-ref');");
  });
  it('clears any prior box so only the just-opened control is boxed', () => {
    const s = ciso.indexOf('function c5OpenDocsReviewAt(');
    const fn = ciso.slice(s, ciso.indexOf('\nfunction ', s + 10));
    expect(fn).toContain(".c5doc-ref').forEach(function(x){x.classList.remove('c5doc-ref');})");
    expect(fn).not.toContain('c5doc-flash'); // no longer the brief-flash behavior
  });
  it('closing the review removes the box', () => {
    const s = ciso.indexOf('function c5CloseDocsReview(');
    const fn = ciso.slice(s, s + 400);
    expect(fn).toContain("querySelectorAll('.c5doc-ref')");
  });
});

describe('3 · reviewed documents can be opened and read', () => {
  it('defines the text map + viewer', () => {
    expect(ciso).toContain('function c5DocTextMap()');
    expect(ciso).toContain('function c5ViewDoc(fname)');
    expect(ciso).toContain("localStorage.getItem('cyberrx_doc_text')");
  });
  it('renders an "Open document" button only when the text is available', () => {
    expect(ciso).toContain('var textMap=c5DocTextMap();');
    expect(ciso).toContain("textMap[dn]?('<button type=\"button\" data-c5docview=\"'+c5esc(dn)+'\"");
    expect(ciso).toContain('📄 Open document</button>');
    expect(ciso).toContain("host.querySelectorAll('[data-c5docview]')");
  });
  it('behaviorally maps filename → uploaded text, skipping entries with no text', () => {
    const a = ciso.indexOf('function c5DocTextMap(');
    const code = ciso.slice(a, ciso.indexOf('\nfunction ', a + 10));
    global.localStorage = {
      getItem: (k) => (k === 'cyberrx_doc_text'
        ? JSON.stringify({ d1: { text: 'POLICY BODY', filename: 'd1_information_security_policy.pdf' }, d8: { filename: 'x.pdf' } })
        : null),
    };
    // eslint-disable-next-line no-eval
    const m = eval(code + '\n;c5DocTextMap()');
    expect(m['d1_information_security_policy.pdf']).toBe('POLICY BODY');
    expect(Object.prototype.hasOwnProperty.call(m, 'x.pdf')).toBe(false);
    delete global.localStorage;
  });
  it('the viewer decodes a raw PDF stream into readable prose (c5PdfText)', () => {
    expect(ciso).toContain('function c5PdfText(raw)');
    expect(ciso).toContain('var txt=c5PdfText(c5DocTextMap()[fname]);'); // decode before display
    const a = ciso.indexOf('function c5PdfText(');
    const code = ciso.slice(a, ciso.indexOf('\nfunction c5ViewDoc'));
    // eslint-disable-next-line no-eval
    const c5PdfText = eval('(' + code.replace('function c5PdfText', 'function') + ')');
    const pdf = '%PDF-1.4 1 0 obj << /Type /Font >> endobj stream '
      + 'BT /F2 17 Tf 54 730 Td (Access Control Policy) Tj ET '
      + 'BT /F1 10 Tf 54 674 Td (This policy applies to Hewlett Packard Enterprise \\(HPE\\).) Tj ET endstream';
    const out = c5PdfText(pdf);
    expect(out).toContain('Access Control Policy');
    expect(out).toContain('This policy applies to Hewlett Packard Enterprise (HPE).');
    expect(out).not.toContain('endobj');
    expect(out).not.toContain(' Tj '); // no raw operators
    expect(c5PdfText('plain readable text')).toBe('plain readable text'); // passthrough
  });
});

describe('4 · Upload Final — the human-reviewed deck, with attribution', () => {
  const cStart = ciso.indexOf('function c5FrameworksClassic(');
  const classic = ciso.slice(cStart, ciso.indexOf('\nfunction ', cStart + 10));
  it('the middle export button is "Upload Final" with a hidden file input', () => {
    expect(classic).toContain('id="c5fwUploadFinalBtn"');
    expect(classic).toContain('↥ Upload Final');
    expect(classic).toContain('id="c5fwFinalFile"');
    expect(classic).toContain('c5fwFinalMetaHtml()'); // attribution rendered under the buttons
  });
  it('stores who uploaded (CISO) and when, and records the file when small enough', () => {
    expect(ciso).toContain('function c5fwStoreFinal(file)');
    expect(ciso).toContain("by=(typeof c5CisoName==='function'&&c5CisoName())||'the CISO'");
    expect(ciso).toContain('at:Date.now()');
    expect(ciso).toContain('file.size<=3*1024*1024'); // keep the file only when it fits localStorage
    expect(ciso).toContain("localStorage.setItem('cyberrx_fw_final'");
  });
  it('the attribution line shows uploader + timestamp + download/replace/remove', () => {
    const a = ciso.indexOf('function c5fwFinalMetaHtml(');
    const fn = ciso.slice(a, ciso.indexOf('\nfunction ', a + 10));
    expect(fn).toContain('uploaded by <b');
    expect(fn).toContain('fmtWhen');
    expect(fn).toContain('id="c5fwFinalReplace"');
    expect(fn).toContain('id="c5fwFinalRemove"');
  });
  it('the button + replace/remove are wired', () => {
    expect(classic).toContain("getElementById('c5fwUploadFinalBtn')");
    expect(classic).toContain('c5fwStoreFinal(f)');
    expect(classic).toContain('c5fwFinalRemove()');
  });
});
