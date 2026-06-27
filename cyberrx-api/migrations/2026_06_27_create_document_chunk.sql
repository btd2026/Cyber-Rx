-- Document chunk vector store (Stage 3, §2). Section-aware chunks + Voyage
-- embeddings for retrieval-grounded assessment. Requires the pgvector extension.
-- Mirrors VectorStore.ensureTables() (which creates this lazily + best-effort so
-- a missing extension degrades only retrieval). Default dim = 1024 (voyage-3);
-- if EMBED_DIM changes, change the vector(N) dimension here and re-migrate.

CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS document_chunk (
  id                 TEXT PRIMARY KEY,
  org_id             TEXT NOT NULL,
  document_upload_id TEXT NOT NULL,
  ordinal            INT  NOT NULL,
  section_ref        TEXT,                 -- e.g. '§4.2' or '§4.2#2' for a multi-part section
  heading            TEXT,
  text               TEXT NOT NULL,
  char_count         INT,
  embedding          vector(1024),
  embed_model        TEXT,
  created_at         TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS document_chunk_doc ON document_chunk(document_upload_id);
CREATE INDEX IF NOT EXISTS document_chunk_org ON document_chunk(org_id);
CREATE INDEX IF NOT EXISTS document_chunk_embed ON document_chunk USING hnsw (embedding vector_cosine_ops);
