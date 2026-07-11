/**
 * Connector catalog — each category offers an "Other" card so a user can connect a tool
 * that isn't in the curated top set. Source-scan guard over connector-setup.html:
 * the Other card is appended after the category's real tools, and it opens a generic
 * read-only connect flow (openOther) that maps the tool's telemetry to the category's controls.
 */
const fs = require('fs');
const path = require('path');

const html = fs.readFileSync(path.resolve(__dirname, '../../../CyberRXNew/public/connector-setup.html'), 'utf8');

describe('connector catalog — "Other" card per category', () => {
  it('appends an Other card after each category\'s tool cards', () => {
    // built inside the same Object.keys(byCat).forEach that renders the category's cards,
    // after the per-tool byCat[cat].forEach loop
    expect(html).toContain('class="card other" data-other="');
    expect(html).toContain('Other \'+esc(cat)+\' tool');
    expect(html).toContain('Not listed here?');
  });

  it('wires real cards and Other cards to their own handlers', () => {
    expect(html).toContain(".card[data-id]");           // real tools → open()
    expect(html).toContain('.card.other');              // other → openOther()
    expect(html).toContain('openOther(el.getAttribute(\'data-other\'))');
  });

  it('openOther keeps the read-only, control-mapping framing', () => {
    expect(html).toContain('function openOther(cat)');
    expect(html).toContain('Read-only access only.');
    expect(html).toContain('maps its telemetry to the controls this category supports');
    expect(html).toContain('id="otherName"');
    expect(html).toContain('id="otherGo"');
  });
});
