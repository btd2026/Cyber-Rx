'use strict';

/**
 * Section-aware document chunker (§2 step 2). Splits a policy/standard into
 * semantic sections — NOT fixed token windows — and tags every chunk with its
 * section reference so evidence can cite "§4.2" back to the source. Large
 * sections are split at paragraph boundaries (keeping the section ref, with a
 * part index); tiny slivers are merged forward so we don't embed noise.
 *
 * Heading detection (order of precedence per line):
 *   - Markdown ATX:           "## 4.2 Access Control"
 *   - Numbered clause:        "4.2 Access Control" / "4.2. Access Control" / "4.2.1 ..."
 *   - Labeled section:        "Section 4 — ...", "Article 4 ...", "Clause 4 ..."
 *   - Short ALL-CAPS / Title heading line (no trailing period, < 80 chars)
 * The detected number (e.g. 4.2) becomes section_ref "§4.2"; unnumbered
 * headings get a slug ref; preamble before the first heading is "§preamble".
 */

const cfg = require('../../config/ragConfig');

const ATX = /^(#{1,6})\s+(.*\S)\s*$/;
const NUMBERED = /^\s*(\d+(?:\.\d+){0,4})\.?\s+(\S.*)$/;            // 4 / 4.2 / 4.2.1 + title
const LABELED = /^\s*(?:section|article|clause|appendix|annex)\s+([A-Za-z0-9.]+)\b[\s.:—-]*(.*)$/i;
const numberish = /^\d+(?:\.\d+)*$/;

function slug(s) {
  return String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'section';
}

// Decide whether a single line is a heading; return {ref,title} or null.
function asHeading(line) {
  const raw = line.trim();
  if (!raw) return null;

  const atx = raw.match(ATX);
  if (atx) {
    const body = atx[2].trim();
    const n = body.match(NUMBERED);
    if (n) return { ref: `§${n[1]}`, title: n[2].trim() };
    return { ref: `§${slug(body)}`, title: body };
  }

  const lab = raw.match(LABELED);
  if (lab) {
    const id = lab[1].replace(/\.$/, '');
    return { ref: `§${id}`, title: (lab[2] || '').trim() || `Section ${id}` };
  }

  const num = raw.match(NUMBERED);
  if (num) {
    const title = num[2].trim();
    // Guard against ordinary numbered prose / list items: a heading title is
    // short, has no terminal period, and isn't an obvious sentence.
    if (title.length <= 80 && !/[.!?]$/.test(title) && title.split(/\s+/).length <= 12) {
      return { ref: `§${num[1]}`, title };
    }
    return null;
  }

  // Short ALL-CAPS or Title-style standalone heading (no terminal punctuation).
  if (raw.length <= 80 && !/[.!?;,:]$/.test(raw)) {
    const letters = raw.replace(/[^A-Za-z]/g, '');
    const isCaps = letters.length >= 3 && raw === raw.toUpperCase();
    if (isCaps) return { ref: `§${slug(raw)}`, title: raw };
  }
  return null;
}

function splitParagraphs(text) {
  return text.split(/\n\s*\n/).map((p) => p.replace(/\s+/g, ' ').trim()).filter(Boolean);
}

/**
 * @param {string} text
 * @param {{maxChars?:number,minChars?:number}} [opts]
 * @returns {Array<{ordinal,section_ref,heading,text,char_count}>}
 */
function chunkDocument(text, opts = {}) {
  const maxChars = opts.maxChars || cfg.chunkMaxChars;
  const minChars = opts.minChars || cfg.chunkMinChars;
  const lines = String(text || '').split(/\r?\n/);

  // 1. Partition lines into sections by heading.
  const sections = [];
  let cur = { ref: '§preamble', heading: '', lines: [] };
  for (const line of lines) {
    const h = asHeading(line);
    if (h) {
      if (cur.lines.join('\n').trim()) sections.push(cur);
      cur = { ref: h.ref, heading: h.title, lines: [] };
    } else {
      cur.lines.push(line);
    }
  }
  if (cur.lines.join('\n').trim() || sections.length === 0) sections.push(cur);

  // 2. Within each section, pack paragraphs into <=maxChars chunks.
  const chunks = [];
  for (const sec of sections) {
    const body = sec.lines.join('\n').trim();
    if (!body) continue;
    const paras = splitParagraphs(body);
    let buf = '';
    const flush = () => { if (buf.trim()) { chunks.push({ section_ref: sec.ref, heading: sec.heading, text: buf.trim() }); buf = ''; } };
    for (const p of paras) {
      if (p.length >= maxChars) {           // a single huge paragraph -> hard-split by sentence
        flush();
        let s = p;
        while (s.length > maxChars) {
          let cut = s.lastIndexOf('. ', maxChars); if (cut < minChars) cut = maxChars;
          chunks.push({ section_ref: sec.ref, heading: sec.heading, text: s.slice(0, cut + 1).trim() });
          s = s.slice(cut + 1);
        }
        buf = s;
      } else if ((buf + ' ' + p).trim().length > maxChars) {
        flush(); buf = p;
      } else {
        buf = buf ? `${buf}\n\n${p}` : p;
      }
    }
    flush();
  }

  // 3. Merge slivers below minChars into the previous chunk of the SAME section.
  const merged = [];
  for (const c of chunks) {
    const prev = merged[merged.length - 1];
    if (prev && prev.section_ref === c.section_ref && c.text.length < minChars) {
      prev.text = `${prev.text}\n\n${c.text}`;
    } else {
      merged.push({ ...c });
    }
  }

  // 4. Number chunks; add a part index when a section spans multiple chunks.
  const bySection = {};
  merged.forEach((c) => { bySection[c.section_ref] = (bySection[c.section_ref] || 0) + 1; });
  const partSeen = {};
  return merged.map((c, i) => {
    const total = bySection[c.section_ref];
    partSeen[c.section_ref] = (partSeen[c.section_ref] || 0) + 1;
    const ref = total > 1 ? `${c.section_ref}#${partSeen[c.section_ref]}` : c.section_ref;
    return { ordinal: i, section_ref: ref, heading: c.heading, text: c.text, char_count: c.text.length };
  });
}

module.exports = { chunkDocument, asHeading, slug };
