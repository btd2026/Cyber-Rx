'use strict';

/**
 * RAG ingest + vector store integration (requires Postgres WITH pgvector).
 * Proves a chunk round-trips with its section ref and that cosine search
 * returns the nearest chunk. Self-skips when no DB / no pgvector is available.
 */

const db = require('../../src/utils/db');
const VectorStore = require('../../src/services/rag/VectorStore');
const RagIngest = require('../../src/services/rag/RagIngestService');

let ready = false;
const ORG = `it-rag-${Date.now()}`;
const UP = `du_${Date.now()}`;

beforeAll(async () => {
  try {
    await db.query('SELECT 1');
    await db.init();
    await db.query(`CREATE TABLE IF NOT EXISTS document_upload (id TEXT PRIMARY KEY, org_id TEXT, document_type_id TEXT, file_name TEXT, normalized_text TEXT, format TEXT, status TEXT, error TEXT, uploaded_at TIMESTAMPTZ DEFAULT NOW())`).catch(() => {});
    ready = await VectorStore.ensureTables(); // false if pgvector missing
  } catch (e) { console.warn(`[ragIngest.integration] skipped — ${e.message}`); }
}, 60000);

const itDb = (n, fn) => test(n, async () => { if (!ready) return; await fn(); });

describe('rag ingest (live Postgres + pgvector)', () => {
  itDb('chunks an upload and round-trips chunks with section refs', async () => {
    const text = 'ACCESS CONTROL POLICY\n\n1. Purpose\n\nDefine account management.\n\n2.2 Access Reviews\n\nDormant accounts are disabled after 45 days.';
    await db.query('INSERT INTO document_upload (id, org_id, normalized_text, status) VALUES ($1,$2,$3,$4) ON CONFLICT (id) DO UPDATE SET normalized_text=EXCLUDED.normalized_text', [UP, ORG, text, 'normalized']);
    const res = await RagIngest.ingestUpload(ORG, UP, text);
    expect(res.chunks).toBeGreaterThanOrEqual(2);
    const chunks = await VectorStore.listChunks(ORG, UP);
    const reviews = chunks.find((c) => c.section_ref.startsWith('§2.2'));
    expect(reviews).toBeDefined();
    expect(reviews.text).toMatch(/Dormant accounts/);
  });

  itDb('cosine search returns the nearest chunk when embeddings exist', async () => {
    // Manually store two chunks with tiny embeddings to test search without Voyage.
    const chunks = [
      { ordinal: 0, section_ref: '§a', heading: 'A', text: 'mfa', char_count: 3 },
      { ordinal: 1, section_ref: '§b', heading: 'B', text: 'backup', char_count: 6 },
    ];
    const dim = require('../../src/config/ragConfig').embedDim;
    const e0 = Array(dim).fill(0); e0[0] = 1;       // points along axis 0
    const e1 = Array(dim).fill(0); e1[1] = 1;       // points along axis 1
    await VectorStore.upsertChunks(ORG, UP, chunks, [e0, e1]);
    const q = Array(dim).fill(0); q[0] = 1;          // closest to chunk 0
    const hits = await VectorStore.search(ORG, q, 1, { uploadId: UP });
    expect(hits[0].section_ref).toBe('§a');
    expect(Number(hits[0].similarity)).toBeGreaterThan(0.9);
  });
});
