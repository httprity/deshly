-- ============================================================
-- DESHLY — supporting tables for the critical-gap fixes.
--
-- Both writes are FAIL-OPEN in the app (wrapped in try/catch): the product
-- still works without these tables, but creating them enables FLAW 5 auditing
-- and FLAW 3 violation logging. Run in the Supabase SQL editor.
-- ============================================================

-- FLAW 5 — confirmed (user-edited) Product Intelligence + the raw extraction.
-- The confirmed object is what drives generation; extracted_intelligence is the
-- pre-edit snapshot, preserved for logging only. user_edited records whether the
-- user changed any chip on the confirmation card.
create table if not exists public.product_intelligence (
  id                     uuid primary key default gen_random_uuid(),
  brand_voice_id         uuid references public.brand_voices(id) on delete cascade,
  product_description    text not null,
  confirmed_intelligence jsonb not null,
  extracted_intelligence jsonb,
  user_edited            boolean not null default false,
  created_at             timestamptz not null default now()
);
create index if not exists product_intelligence_brand_voice_idx
  on public.product_intelligence (brand_voice_id);

-- FLAW 3 — brand-compliance validation failures (second attempt still violated
-- the brand's neverRules). For debugging / measuring how often output drifts.
create table if not exists public.brand_rule_violations (
  id                  uuid primary key default gen_random_uuid(),
  brand_voice_id      uuid references public.brand_voices(id) on delete cascade,
  cluster_id          text,
  product_description text,
  violated_rules      jsonb not null,
  generated_copy      text,
  created_at          timestamptz not null default now()
);
create index if not exists brand_rule_violations_brand_voice_idx
  on public.brand_rule_violations (brand_voice_id);
