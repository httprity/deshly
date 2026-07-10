-- ============================================================
-- DESHLY — Exemplar-Retrieval RAG · Phase 1 migration (VECTORS ONLY)
--
-- Run in the Supabase SQL editor (same as flaws-tables.sql). Additive and
-- idempotent. Phase 2 (quality_score / exemplar_eligible / user_signals.campaign_id)
-- and Phase 3 (match_exemplar_campaigns RPC) ship in later migration files.
--
-- VERIFIED against the live DB before writing this (scripts/phase0-introspect.ts):
--   • brand_voices.embedding is 768-dim  -> all new vector columns are vector(768)
--   • clusters.id is a TEXT slug (e.g. 'ca_toronto_professional_25_40'),
--     NOT a uuid -> the eventual RPC's p_cluster_id is TEXT (see Phase 3 file)
--   • campaigns has ~133 rows -> backfill is meaningful (see backfill script)
--
-- Requires the pgvector extension (already in use for brand_voices.embedding).
-- ============================================================

-- 1. Campaign context vector — the retrieval target.
--    Built ONLY via buildContextEmbeddingText() (src/lib/embedding-text.ts),
--    including the rich audience reasoning (Invariant 1 / Gap-1 decoupling).
alter table public.campaigns
  add column if not exists context_embedding vector(768);

-- ------------------------------------------------------------
-- INDEX — create AFTER the backfill (scripts/backfill-context-embeddings.ts),
-- not now. Building it against an empty/partial column wastes the index and
-- forces a rebuild. Run the block below ONLY once the column is populated.
--
-- IVFFlat matches the existing brand_voices index style and works on older
-- pgvector. (Switch to HNSW if the deployed pgvector is >= 0.5.0 and the corpus
-- grows large.) Tune `lists` ~ sqrt(rowcount); 100 is fine for ~hundreds–low-thousands.
-- ------------------------------------------------------------
-- create index if not exists campaigns_context_embedding_idx
--   on public.campaigns
--   using ivfflat (context_embedding vector_cosine_ops)
--   with (lists = 100);

-- NOTE (deferred): product_intelligence.embedding is intentionally NOT created
-- here. This plan's retrieval queries campaigns.context_embedding only; the
-- product vector is for future product-to-product matching. Add it in its own
-- migration if/when that lands — don't leave an unused column.
