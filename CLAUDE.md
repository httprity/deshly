# CLAUDE.md — Deshly

Project context for Claude Code. Read this first.

## What Deshly is

An AI marketing-intelligence layer for emerging-market D2C brands selling to their
global diaspora. It learns a brand's voice, understands a product, matches the product
to the audiences (local + diaspora) most likely to buy it, and generates complete
localized campaigns (caption, hashtags, WhatsApp copy, image/reel concepts), with
generated image/video assets on the roadmap.

Positioning: brand understanding + product understanding + audience intelligence +
content execution in one workflow. NOT a generic AI content generator.

Live: https://deshly.vercel.app · Repo: github.com/httprity/deshly · Dev path: D:\deshly

## Team

- Samprity Haque (httprity) — Lead, full-stack + AI
- Sirajus Salikin Siddique — Backend
- Meher Nigar — Frontend

## Stack (what actually runs today)

Frontend: Next.js 16.2.4 (App Router, Webpack), React 19, Tailwind v4, Framer Motion,
GSAP + Lenis (landing), Leaflet + react-leaflet + OpenStreetMap (/clusters map),
Lucide, TypeScript (strict).

Backend/data: Supabase (Postgres + pgvector + auth + storage), PostgreSQL 15,
pgvector (1536-dim, IVFFlat cosine), supabase-js, Next.js API routes.

AI: multi-provider fallback chain Groq (Llama 3.3 70B, primary) -> Together AI ->
Gemini 2.5 Flash Lite -> Ollama (Phi-3 local). Together embeddings (1536-dim).
@modelcontextprotocol/sdk — 3 custom MCP servers: DiasporaGraph, BrandVoice,
CampaignGenerator.

Ingestion: Snoowrap (Reddit signals), native fetch.
Infra: Vercel, GitHub CI. Cloudflare Tunnel (cloudflared) is dev-only.
Tooling: Cursor IDE, ESLint + Prettier.

## Key routes

- POST /api/extract-brand-voice — captions -> structured voice profile + 1536-dim embedding. Saves raw_captions. Has idempotency (exact raw_captions match returns existing voice).
- POST /api/match-clusters — productDescription + brandVoiceId -> ranked clusters. Has result-cache (match_cache table, keyed on brand_voice_id + exact product_description).
- POST /api/generate-campaign — brandVoiceId + productDescription + clusterIds -> multimodal campaign packages. Generates SEQUENTIALLY (for-loop, ~700ms stagger, NOT .map). Has result-cache via campaigns table.
- GET /api/clusters-list, GET /api/system-status.

The cache key for everything is `brand_voices.id` (NOT brand_id), called brandVoiceId everywhere.

## Patterns to follow

- **Fail-open caching.** Every cache read is wrapped in try/catch; on any error, fall through to live LLM. Caches replay REAL prior output, never fabricated content. Match this pattern for any new cache.
- **DB access is server-side only.** Routes use the service-role supabaseAdmin client. Client never touches the DB directly. Never commit service-role keys; they live in env vars.
- **Schema-validated LLM output.** Every LLM response is parsed and validated against typed contracts before persistence. Strict JSON mode, banned-phrase blocklist enforced.
- **Token discipline.** Context is compacted before hitting the LLM (~48% token reduction vs naive). NOTE: compaction may be too aggressive and starve output specificity — if outputs are generic, test feeding fuller context before adding retrieval machinery.

## Honesty rules (important — these govern docs, forms, and any status labels)

This project is judged/evaluated against its live /docs page and submission forms, and
will be launched to real customers. Claims must match what actually runs.

- **Built = "Live" / a checkbox. Planned = prose / "Phase 2" / "Phase 3" tag.** Never label a planned feature as live.
- The test for "Live": *if someone said "show me that running right now," could you?* Yes = Live. Configured-but-never-run or roadmap = not Live.
- **Live today:** Brand voice extraction, pgvector vector search, Naive RAG, structured-context payload builder (no chunking), relational SQL filters, 3 MCP servers, multi-LLM fallback, cluster matching, multimodal campaign text, diaspora map, result caching.
- **Graph RAG nuance:** graph-STYLE reasoning over Postgres relationship tables (FKs) is live and can be called "Live." A dedicated graph DB (Neo4j / Apache AGE) is Phase 3. Keep this distinction exact; never imply graph storage is live.
- **Phase 2 (NOT live):** Hybrid search (BM25 + vector rank fusion), Query rewriting / HyDE, native image/video generation, direct publishing, OAuth onboarding.
  - A "hybrid-lite" (vector + SQL filter combined) is arguably real; only label it live if the fusion actually runs in code.
- **Phase 3:** Closed-loop Meta performance reconciliation, graph DB migration, automated cluster discovery.
- Do not fabricate validation data, demo output, or AI-generated content. Real or nothing.

## Build sequence for the launch product (dependency order)

1. **Brand Guidelines onboarding** — replace caption-paste with structured intake -> clean Brand DNA. Everything downstream depends on this.
2. **Product Intelligence layer** — structured product record (category, subcategory, price tier, giftability, occasion/diaspora relevance, shipping) + product embedding. Currently only brand voices are embedded; products are NOT. This unblocks audience matching and exemplar retrieval. Highest-leverage next step.
3. **Hybrid retrieval** — fuse existing vector search + metadata filters into one ranked query. Closest to done; finishing it makes "hybrid search" genuinely live.
4. **Exemplar retrieval (the campaign-quality lever)** — retrieve best past campaigns for similar product + same cluster, inject as few-shot exemplars in the generation prompt. Depends on product embeddings (#2) AND a corpus of GOOD campaigns. Cold-start fallback required: when corpus empty or low-similarity, fall through to no-exemplar generation (fail-open).
5. **Campaign generation** — already live; improves as 1-4 feed it better context.
6. **Asset generation** — image pipeline first (provider wiring, storage, CDN, watermark), then video. Largest standalone subsystem. Build AFTER text quality is high, not before.

Thread a small **eval set** (10-15 brand+product cases with expected outputs) through all
of it; run after each layer to measure whether a change actually improved output quality
vs just added latency.

## Output-quality note (re: "outputs feel generic")

Likely causes, in order: (1) weak model — flash-lite produces generic text; test on Groq
Llama 3.3 70B first. (2) over-aggressive context compaction starving specificity.
(3) vague brand voice profile (garbage in). (4) model ignoring anti-generic prompt rules
(again, model strength). The generation path uses little retrieval BY DESIGN (loads brand
+ cluster by id), so "add RAG" is not the main lever for genericness — exemplar retrieval
(#4 above) is the retrieval that genuinely helps, but only once the corpus is seeded with
strong (not flash-lite) campaigns.

## Cost note (for any asset-generation work)

Image/video generation has real per-unit cost. While building, default to the CHEAPEST
models (e.g. budget image models ~$0.005-0.02/image; budget video ~$0.05/sec) so dev
testing doesn't burn money. Swap to quality models only once the pipeline works and
pricing is decided. Video dominates per-campaign cost (often 70-90%); keep it isolated
and easy to toggle/meter.

## Build verification

`npm run build` should be green. A parquetjs warning from the together-ai SDK is
pre-existing and harmless. An `fdprocessedid` hydration warning is harmless
browser-extension noise (test in Incognito).