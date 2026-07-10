// ============================================================
// DESHLY — Product Intelligence extraction
//
// Turns a few high-signal user inputs (raw product description + optional
// price / market / goal / details) into a STRUCTURED ProductIntelligence
// object the rest of the pipeline can reason over. This is the step that
// stops Deshly from generating campaigns straight off a weak raw prompt:
//
//   raw product input → extractProductIntelligence() → confirm/edit → brief
//
// Global by design — no region/culture is assumed. Examples are universal
// (sneakers, skincare, coffee, SaaS, restaurant offer, jewelry, fashion,
// home decor, fitness, subscription).
// ============================================================

import { callLLM } from "./llm";

export type PriceTier = "budget" | "mid" | "premium" | "luxury" | "unknown";
export type CulturalRelevance = "high" | "moderate" | "low" | "unknown";

export interface ProductIntelligence {
  productName?: string;
  productCategory?: string;
  subCategory?: string;
  price?: string;
  priceTier?: PriceTier;
  targetMarketAvailability?: string[];
  likelyUseCases?: string[];
  likelyAudienceContexts?: string[];
  emotionalDrivers?: string[];
  occasions?: string[];
  differentiators?: string[];
  productPersonality?: string[];
  offer?: string;
  campaignGoal?: string;
  /**
   * Internal-only retrieval signal — never shown to the user by label. Feeds
   * the audience matching layer (e.g. "matched because the product has strong
   * cultural relevance for this community"). GLOBAL by design: this measures
   * whether the product connects to ANY cultural identity/tradition/community,
   * never a hardcoded region. Defaults to "unknown" (never "low") when unclear.
   */
  culturalRelevance?: CulturalRelevance;
  /** Internal only — signals the user did not provide that weaken output. */
  missingSignals?: string[];
  /** Internal only — never shown in normal UI. 0..1 per field. */
  confidence?: {
    category?: number;
    priceTier?: number;
    audienceContext?: number;
    differentiator?: number;
    market?: number;
  };
}

// What the user actually typed/selected. Everything except `description`
// is optional — that's the whole point.
export interface ProductIntelligenceInput {
  description: string;
  price?: string;
  marketAvailability?: string[];
  campaignGoal?: string;
  productCategory?: string;
  materialsOrSpecs?: string;
  offer?: string;
  avoidAudience?: string;
  creativeStyle?: string;
  /** Brand context to sharpen extraction (optional). */
  brandName?: string;
  brandCategory?: string;
}

const SYSTEM = `You are a senior marketing strategist. You read a short product description and extract a STRUCTURED product brief. You are global and neutral — never assume a country, culture, religion, language, or festival unless the user explicitly mentions it.

Return ONLY valid JSON matching this exact shape (no markdown, no prose):
{
  "productName": "short human name for the product, e.g. 'Everyday sneaker'",
  "productCategory": "broad category, e.g. 'Footwear', 'Skincare', 'Coffee', 'SaaS'",
  "subCategory": "more specific type, e.g. 'Lifestyle sneaker', 'Niacinamide serum'",
  "priceTier": "budget | mid | premium | luxury | unknown",
  "likelyUseCases": ["2-4 concrete situations the product is used in"],
  "likelyAudienceContexts": ["2-4 short buyer personas/contexts, e.g. 'Urban style buyers'"],
  "emotionalDrivers": ["2-3 emotional reasons someone buys, e.g. 'Confidence', 'Self-care'"],
  "occasions": ["0-3 occasions if clearly relevant, else empty array — do NOT invent festivals"],
  "differentiators": ["1-3 concrete things that set it apart, from the description if stated"],
  "productPersonality": ["2-3 adjectives describing the product's feel, e.g. 'Modern', 'Understated'"],
  "culturalRelevance": "high | moderate | low | unknown",
  "confidence": {
    "category": 0.0-1.0,
    "priceTier": 0.0-1.0,
    "audienceContext": 0.0-1.0,
    "differentiator": 0.0-1.0,
    "market": 0.0-1.0
  }
}

Rules:
- Infer from the description; do not fabricate facts that contradict it.
- If a differentiator is not stated, infer a plausible one but set confidence.differentiator low (< 0.5).
- priceTier: if a price is given use it; otherwise infer and set confidence.priceTier accordingly.
- Keep every string short. No sentences longer than ~8 words.
- occasions must be empty unless the product is genuinely occasion-driven (e.g. gifting, seasonal). Never assume a specific culture's festival.
- culturalRelevance: Does this product connect to a specific cultural identity, heritage, tradition, or community lifestyle?
  - "high" = clearly tied to a cultural occasion, tradition, or identity group.
  - "moderate" = could resonate with specific cultural audiences but is not exclusively tied to them.
  - "low" = broadly universal with no meaningful cultural specificity.
  - "unknown" = insufficient information to determine.
  Do NOT default to "low". If in doubt, return "unknown". This is a global signal — never tie it to one assumed region.`;

function buildUserPrompt(input: ProductIntelligenceInput): string {
  const lines: string[] = [];
  lines.push(`PRODUCT DESCRIPTION:\n${input.description.trim()}`);
  if (input.price?.trim()) lines.push(`PRICE: ${input.price.trim()}`);
  if (input.marketAvailability?.length)
    lines.push(`MARKET AVAILABILITY: ${input.marketAvailability.join(", ")}`);
  if (input.campaignGoal?.trim()) lines.push(`CAMPAIGN GOAL: ${input.campaignGoal.trim()}`);
  if (input.productCategory?.trim()) lines.push(`STATED CATEGORY: ${input.productCategory.trim()}`);
  if (input.materialsOrSpecs?.trim()) lines.push(`MATERIALS / SPECS: ${input.materialsOrSpecs.trim()}`);
  if (input.offer?.trim()) lines.push(`OFFER / PROMOTION: ${input.offer.trim()}`);
  if (input.avoidAudience?.trim()) lines.push(`AUDIENCE TO AVOID: ${input.avoidAudience.trim()}`);
  if (input.creativeStyle?.trim()) lines.push(`CREATIVE STYLE PREFERENCE: ${input.creativeStyle.trim()}`);
  if (input.brandName?.trim()) lines.push(`BRAND: ${input.brandName.trim()}`);
  if (input.brandCategory?.trim()) lines.push(`BRAND CATEGORY: ${input.brandCategory.trim()}`);
  return lines.join("\n");
}

function priceTierFromString(price?: string): PriceTier | undefined {
  if (!price) return undefined;
  const num = parseFloat(price.replace(/[^0-9.]/g, ""));
  if (isNaN(num)) return undefined;
  // Currency-agnostic, rough tiers in major-unit terms.
  if (num < 20) return "budget";
  if (num < 80) return "mid";
  if (num < 250) return "premium";
  return "luxury";
}

function parseJson(text: string): Record<string, unknown> | null {
  const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(cleaned.slice(start, end + 1));
      } catch {
        return null;
      }
    }
    return null;
  }
}

function arr(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x) => typeof x === "string" && x.trim()).map((x) => (x as string).trim()) : [];
}
function str(v: unknown): string | undefined {
  return typeof v === "string" && v.trim() ? v.trim() : undefined;
}
function culturalRelevance(v: unknown): CulturalRelevance {
  const s = typeof v === "string" ? v.trim().toLowerCase() : "";
  // Never default to "low" — when the model omits or returns junk, fall to
  // "unknown" and let the retrieval layer decide. Global by design.
  return s === "high" || s === "moderate" || s === "low" ? s : "unknown";
}

/**
 * Extract structured product intelligence from a few user inputs.
 * Fail-open: if the LLM is unavailable or returns junk, returns a minimal
 * object built from the raw inputs so the flow never hard-blocks the user.
 */
export async function extractProductIntelligence(
  input: ProductIntelligenceInput
): Promise<ProductIntelligence> {
  let parsed: Record<string, unknown> | null = null;
  try {
    const res = await callLLM({
      systemPrompt: SYSTEM,
      userPrompt: buildUserPrompt(input),
      jsonMode: true,
      temperature: 0.3,
      maxTokens: 900,
    });
    parsed = parseJson(res.text);
  } catch {
    parsed = null;
  }

  const givenTier = priceTierFromString(input.price);
  const conf = (parsed?.confidence as ProductIntelligence["confidence"]) || {};

  const pi: ProductIntelligence = {
    productName: str(parsed?.productName),
    productCategory: input.productCategory?.trim() || str(parsed?.productCategory),
    subCategory: str(parsed?.subCategory),
    price: input.price?.trim() || undefined,
    priceTier: (givenTier || (str(parsed?.priceTier) as PriceTier) || "unknown") as PriceTier,
    targetMarketAvailability: input.marketAvailability?.length
      ? input.marketAvailability
      : arr(parsed?.targetMarketAvailability),
    likelyUseCases: arr(parsed?.likelyUseCases),
    likelyAudienceContexts: arr(parsed?.likelyAudienceContexts),
    emotionalDrivers: arr(parsed?.emotionalDrivers),
    occasions: arr(parsed?.occasions),
    differentiators: arr(parsed?.differentiators),
    productPersonality: arr(parsed?.productPersonality),
    offer: input.offer?.trim() || str(parsed?.offer),
    campaignGoal: input.campaignGoal?.trim() || undefined,
    culturalRelevance: culturalRelevance(parsed?.culturalRelevance),
    confidence: {
      category: typeof conf.category === "number" ? conf.category : input.productCategory ? 0.9 : 0.5,
      priceTier: typeof conf.priceTier === "number" ? conf.priceTier : givenTier ? 0.95 : 0.4,
      audienceContext: typeof conf.audienceContext === "number" ? conf.audienceContext : 0.5,
      differentiator: typeof conf.differentiator === "number" ? conf.differentiator : 0.4,
      market: typeof conf.market === "number" ? conf.market : input.marketAvailability?.length ? 0.9 : 0.3,
    },
  };

  pi.missingSignals = detectMissingSignals(pi, input);
  return pi;
}

/**
 * Which high-value signals are weak/absent. Used internally to decide whether
 * to ask ONE targeted follow-up — never surfaced as a list of errors.
 */
export function detectMissingSignals(
  pi: ProductIntelligence,
  input: ProductIntelligenceInput
): string[] {
  const missing: string[] = [];
  const lowDiff =
    (!pi.differentiators || pi.differentiators.length === 0) ||
    (pi.confidence?.differentiator ?? 0) < 0.5;
  if (lowDiff) missing.push("differentiator");
  if (!pi.likelyAudienceContexts?.length || (pi.confidence?.audienceContext ?? 0) < 0.45)
    missing.push("audience");
  if (!input.marketAvailability?.length && !pi.targetMarketAvailability?.length)
    missing.push("market");
  if (!input.price?.trim()) missing.push("price");
  if (!input.campaignGoal?.trim() && !pi.campaignGoal) missing.push("goal");
  return missing;
}

export interface FollowUp {
  signal: string;
  question: string;
}

const FOLLOW_UPS: Record<string, string> = {
  differentiator: "What makes this product different from alternatives?",
  audience: "Who do you imagine buying this?",
  market: "Where can you sell this product?",
  price: "Do you want to add a price or price range?",
  goal: "What do you want this campaign to achieve?",
};

// Ask the single most valuable missing thing first. Differentiator and
// audience hurt output quality the most, so they lead.
const PRIORITY = ["differentiator", "audience", "market", "price", "goal"];

/**
 * Return ONE targeted follow-up question for the weakest signal, or null when
 * the input is strong enough to proceed straight to confirmation.
 */
export function nextFollowUp(pi: ProductIntelligence): FollowUp | null {
  const missing = new Set(pi.missingSignals || []);
  for (const sig of PRIORITY) {
    if (missing.has(sig)) return { signal: sig, question: FOLLOW_UPS[sig] };
  }
  return null;
}
