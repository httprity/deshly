// ============================================================
// DESHLY — context-embedding text (Exemplar-Retrieval RAG keystone)
//
// INVARIANT 1 (non-negotiable): the text used to build campaigns.context_embedding
// at INDEX time and the text used to build the retrieval QUERY vector MUST be
// produced by the SAME function with the SAME field composition. If the two
// drift, cosine similarity degrades silently and top-k becomes mush — the #1
// cause of silent RAG failure.
//
// Therefore `buildContextEmbeddingText()` is the ONE allowed source of
// context-embedding text. No other code path may assemble it. Index-time
// (generate-campaign save) and query-time (retrieveExemplars) both call the
// adapter + this function — never reimplement the composition inline.
//
// Pure string assembly. No LLM, no I/O. Deterministic: same input -> same bytes.
//
// WHY audience reasoning is encoded here (Gap-1 decoupling): retrieval's whole
// edge is AUDIENCE discrimination. Indexing on thin signal (city only) means
// vectors can't separate audiences. So the rich match-reasoning is part of the
// vector NOW, independent of any prompt change shipping later. Good vectors now,
// prompt fix later, no re-embedding required.
// ============================================================

import type { ProductIntelligence } from "./product-intelligence";
import type { Cluster } from "./types";

/**
 * The canonical, fully-normalized input to the context-embedding text. Every
 * field is optional (we fail-soft on thin data), but the COMPOSITION ORDER below
 * is fixed and must never be reordered — reordering changes the embedding.
 */
export interface ContextEmbeddingInput {
  product: {
    category?: string;
    subCategory?: string;
    useCases?: string[];
    emotionalDrivers?: string[];
    /** "decision criteria" in the plan — what makes this product distinct. */
    decisionCriteria?: string[];
    culturalRelevance?: string;
  };
  audience: {
    segmentType?: string; // "diaspora" | "local"
    city?: string;
    country?: string;
    clusterId?: string;
    /** Rich match-reasoning (from /api/match-clusters). The discriminating signal. */
    buyingMotivation?: string;
    suggestedPositioning?: string;
    bestChannel?: string;
  };
}

function norm(s: unknown): string {
  return typeof s === "string" ? s.trim() : "";
}
function list(a: unknown): string {
  return Array.isArray(a)
    ? a.filter((x): x is string => typeof x === "string" && Boolean(x.trim())).map((x) => x.trim()).join(", ")
    : "";
}

/**
 * THE keystone. Assemble the canonical context-embedding text. Fixed field
 * order; empty fields are skipped (never emit dangling labels) so a thin row and
 * a rich row stay comparable. Used at BOTH index time and query time.
 */
export function buildContextEmbeddingText(input: ContextEmbeddingInput): string {
  const p = input.product || {};
  const a = input.audience || {};
  const lines: string[] = [];

  const push = (label: string, value: string) => {
    if (value) lines.push(`${label}: ${value}`);
  };

  // --- PRODUCT block (stable order) ---
  push("PRODUCT_CATEGORY", norm(p.category));
  push("PRODUCT_SUBCATEGORY", norm(p.subCategory));
  push("USE_CASES", list(p.useCases));
  push("EMOTIONAL_DRIVERS", list(p.emotionalDrivers));
  push("DECISION_CRITERIA", list(p.decisionCriteria));
  push("CULTURAL_RELEVANCE", norm(p.culturalRelevance));

  // --- AUDIENCE block (stable order) — the discriminating signal ---
  push("AUDIENCE_SEGMENT", norm(a.segmentType));
  push("AUDIENCE_CITY", norm(a.city));
  push("AUDIENCE_COUNTRY", norm(a.country));
  push("AUDIENCE_ID", norm(a.clusterId));
  push("BUYING_MOTIVATION", norm(a.buyingMotivation));
  push("SUGGESTED_POSITIONING", norm(a.suggestedPositioning));
  push("BEST_CHANNEL", norm(a.bestChannel));

  return lines.join("\n");
}

/**
 * The match-reasoning shape returned by /api/match-clusters (the subset we
 * embed). Optional throughout — when the client doesn't forward reasoning we
 * fall back to cluster identity only (thinner, but valid).
 */
export interface MatchReasoning {
  buying_motivation?: string;
  suggested_positioning?: string;
  best_channel?: string;
}

/**
 * Adapter: ProductIntelligence + Cluster + (optional) match reasoning -> the
 * canonical ContextEmbeddingInput. BOTH index-time and query-time must build
 * their input via this adapter so the two stay identical (Invariant 1).
 *
 * `decisionCriteria` maps to the product's confirmed differentiators — the
 * concrete "why this over alternatives" signal the brief already leans on.
 */
export function contextEmbeddingInputFrom(args: {
  product: ProductIntelligence | null | undefined;
  cluster: Cluster | null | undefined;
  reasoning?: MatchReasoning | null;
}): ContextEmbeddingInput {
  const p = args.product || {};
  const c = args.cluster || ({} as Partial<Cluster>);
  const r = args.reasoning || {};
  return {
    product: {
      category: p.productCategory,
      subCategory: p.subCategory,
      useCases: p.likelyUseCases,
      emotionalDrivers: p.emotionalDrivers,
      decisionCriteria: p.differentiators,
      culturalRelevance: p.culturalRelevance,
    },
    audience: {
      segmentType: c.segment_type,
      city: c.city,
      country: c.country,
      clusterId: c.id,
      buyingMotivation: r.buying_motivation,
      suggestedPositioning: r.suggested_positioning,
      bestChannel: r.best_channel,
    },
  };
}
