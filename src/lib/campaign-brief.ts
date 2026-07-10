// ============================================================
// DESHLY — Campaign Brief compiler
//
// The single structured object the campaign generator consumes. Campaigns are
// NEVER generated from raw product text alone — everything is compiled into a
// CampaignBrief first:
//
//   Brand DNA + Product Intelligence + confirmed edits + audience + goal
//     → compileCampaignBrief() → buildCampaignGenerationPrompt()
//
// Global by design — no region/culture is assumed.
// ============================================================

import type { BrandVoiceProfile, Cluster } from "./types";
import type { ProductIntelligence } from "./product-intelligence";

export interface CampaignBrief {
  brand: {
    name?: string;
    voiceSummary?: string;
    personalityTraits?: string[];
    communicationStyle?: string[];
    alwaysRules?: string[];
    neverRules?: string[];
  };
  product: ProductIntelligence;
  audience: {
    recommendedAudience?: string;
    reason?: string;
    buyerMotivation?: string;
    likelyObjection?: string;
    /** The messaging angle recommended for this market (from match reasoning). */
    positioning?: string;
    /** Where this audience is best reached, with a short why. */
    bestChannel?: string;
    /** Qualitative best timing for this audience. */
    bestTiming?: string;
    /** How strongly Deshly recommends testing here (Strong/Moderate/Exploratory). */
    fitTier?: string;
    /** Price-vs-spend read for this audience, with a campaign implication. */
    affordability?: string;
  };
  campaign: {
    goal?: string;
    tone?: string;
    channel?: string;
    ctaStyle?: string;
    outputAssets?: string[];
  };
  constraints: {
    marketAvailability?: string[];
    languagePreference?: string[];
    avoid?: string[];
  };
}

export interface CompileBriefInput {
  brandName?: string;
  profile?: BrandVoiceProfile | null;
  /**
   * The CONFIRMED, user-edited ProductIntelligence — the object the user
   * approved/edited on the confirmation card, NOT the raw extraction output.
   * Chip edits (FLAW 5) are applied before this reaches the compiler. The
   * original extraction is preserved separately as `extractedIntelligence`
   * for logging and is intentionally NOT used to build the prompt.
   */
  product: ProductIntelligence;
  /** Raw pre-edit extraction — logging/debugging only. Never enters the prompt. */
  extractedIntelligence?: ProductIntelligence;
  /** Optional audience context (e.g. from the cluster match reasoning). */
  audience?: CampaignBrief["audience"];
  cluster?: Cluster | null;
  campaignGoal?: string;
  /** Free-text "audience to avoid" / banned words. */
  avoid?: string[];
  languagePreference?: string[];
}

/**
 * The audience-match reasoning produced by /api/match-clusters for ONE cluster.
 * This is the rich "who am I writing for" object that previously never reached
 * generation. Shape mirrors the match-clusters response exactly so the frontend
 * can forward it untouched.
 */
export interface AudienceReasoningInput {
  /** The cluster this reasoning belongs to — guards against cross-applying it. */
  cluster_id?: string;
  display_name?: string;
  fit_tier?: string;
  one_line_reason?: string;
  reasoning?: {
    why_this_fits?: string;
    affordability_read?: string;
    buying_motivation?: string;
    best_channel?: string;
    best_timing_note?: string;
    risk_note?: string;
    suggested_positioning?: string;
  };
}

/**
 * Map the match-clusters reasoning into the CampaignBrief audience shape. This
 * is the bridge that carries audience intelligence into the generation prompt
 * (the whole point of Phase 1). Returns undefined when there is nothing to map.
 */
export function audienceFromReasoning(
  input: AudienceReasoningInput | null | undefined
): CampaignBrief["audience"] | undefined {
  if (!input) return undefined;
  const r = input.reasoning || {};
  const a: CampaignBrief["audience"] = {
    recommendedAudience: input.display_name?.trim() || undefined,
    reason: r.why_this_fits?.trim() || input.one_line_reason?.trim() || undefined,
    buyerMotivation: r.buying_motivation?.trim() || undefined,
    likelyObjection: r.risk_note?.trim() || undefined,
    positioning: r.suggested_positioning?.trim() || undefined,
    bestChannel: r.best_channel?.trim() || undefined,
    bestTiming: r.best_timing_note?.trim() || undefined,
    fitTier: input.fit_tier?.trim() || undefined,
    affordability: r.affordability_read?.trim() || undefined,
  };
  // Drop entirely if every field is empty (e.g. a malformed payload).
  return Object.values(a).some(Boolean) ? a : undefined;
}

function dedupe(list: (string | undefined)[]): string[] {
  return Array.from(new Set(list.filter((x): x is string => Boolean(x && x.trim())).map((x) => x.trim())));
}

/**
 * Compile every available signal into one CampaignBrief.
 *
 * CONTRACT (FLAW 5): `input.product` is the CONFIRMED, user-edited
 * ProductIntelligence — the values the user approved on the confirmation card,
 * with any chip edits applied. The compiler never reads raw extraction output;
 * `input.extractedIntelligence` (if provided) is preserved for logging only.
 *
 * CONFLICT RESOLUTION (FLAW 6) — when Brand DNA and the campaign goal disagree,
 * apply this priority hierarchy. These rules are documented here AND emitted as
 * explicit instructions in buildCampaignGenerationPrompt() so the generator
 * obeys them, not just the compiler:
 *
 *   Priority 1 — neverRules ALWAYS win. A brand "never" rule (e.g. "never use
 *     urgency language") is never overridden by the campaign goal (e.g. "clear
 *     inventory"). neverRules therefore also flow into constraints.avoid.
 *   Priority 2 — campaign goal wins over personality traits on TONE. A "calm,
 *     minimal" brand running a "launch" goal may read energetic/bold for this
 *     campaign. Personality sets the base style; the goal can override tone.
 *   Priority 3 — brand voice wins over audience/channel defaults on STYLE. If
 *     a channel suggests "high-energy short captions" but the brand voice is
 *     "educational, warm", the caption follows the brand voice. Channel
 *     defaults are a fallback, not an override.
 *
 * Tolerant of missing pieces — an absent brand profile or audience just yields
 * a thinner brief.
 */
export function compileCampaignBrief(input: CompileBriefInput): CampaignBrief {
  const vp = (input.profile || {}) as unknown as Record<string, unknown>;
  const personality = (vp.brand_personality as { traits?: string[]; summary?: string }) || {};
  const talk = (vp.how_they_talk as { style?: string }) || {};
  const vibe = (vp.their_brand_vibe as { identity?: string }) || {};

  const audienceFromCluster: CampaignBrief["audience"] = input.cluster
    ? {
        recommendedAudience: `${input.cluster.city || input.cluster.country} buyers`,
        ...input.audience,
      }
    : input.audience || {};

  return {
    brand: {
      name: input.brandName || undefined,
      voiceSummary: vibe.identity || personality.summary || talk.style || undefined,
      personalityTraits: Array.isArray(personality.traits) ? personality.traits.slice(0, 6) : [],
      communicationStyle: talk.style ? [talk.style] : [],
      alwaysRules: Array.isArray(vp.what_they_care_about) ? (vp.what_they_care_about as string[]).slice(0, 5) : [],
      neverRules: Array.isArray(vp.they_never) ? (vp.they_never as string[]).slice(0, 6) : [],
    },
    product: input.product,
    audience: audienceFromCluster,
    campaign: {
      goal: input.campaignGoal || input.product.campaignGoal || undefined,
      tone: (input.product.productPersonality || []).slice(0, 3).join(", ") || undefined,
      channel: undefined,
      ctaStyle: undefined,
      outputAssets: ["caption", "hashtags", "whatsapp_message", "image_prompt", "reels_storyboard"],
    },
    constraints: {
      marketAvailability: dedupe(input.product.targetMarketAvailability || []),
      languagePreference: dedupe(input.languagePreference || []),
      avoid: dedupe([...(input.avoid || []), ...((input.profile && (vp.they_never as string[])) || [])]),
    },
  };
}

/**
 * Render the brief as a compact, instruction-rich text block to inject into
 * the campaign-generation prompt. This is what makes generation specific:
 * the model sees confirmed structured attributes, not just a raw sentence.
 *
 * Not shown to the user in normal UI.
 */
export function buildCampaignGenerationPrompt(brief: CampaignBrief): string {
  const p = brief.product;
  const lines: string[] = [];

  lines.push("CAMPAIGN BRIEF (confirmed by the user — generate strictly from this):");

  // Product
  const prod: string[] = [];
  if (p.productName) prod.push(`name: ${p.productName}`);
  if (p.productCategory) prod.push(`category: ${p.productCategory}`);
  if (p.subCategory) prod.push(`type: ${p.subCategory}`);
  if (p.priceTier && p.priceTier !== "unknown") prod.push(`price tier: ${p.priceTier}`);
  if (p.price) prod.push(`price: ${p.price}`);
  if (prod.length) lines.push(`- Product → ${prod.join(" · ")}`);
  if (p.differentiators?.length) lines.push(`- Differentiators (USE these, do not be generic): ${p.differentiators.join("; ")}`);
  if (p.likelyUseCases?.length) lines.push(`- Use cases: ${p.likelyUseCases.join(", ")}`);
  if (p.likelyAudienceContexts?.length) lines.push(`- Buyer contexts: ${p.likelyAudienceContexts.join(", ")}`);
  if (p.emotionalDrivers?.length) lines.push(`- Emotional drivers (lead with these): ${p.emotionalDrivers.join(", ")}`);
  if (p.occasions?.length) lines.push(`- Occasions: ${p.occasions.join(", ")}`);
  if (p.productPersonality?.length) lines.push(`- Product personality: ${p.productPersonality.join(", ")}`);
  if (p.offer) lines.push(`- Offer/promotion: ${p.offer}`);

  // Audience — the full reasoning block. This is who the copy is FOR; it must
  // visibly shape the angle, motivation, positioning, and channel so that two
  // different audiences for the same product produce two different campaigns.
  const a = brief.audience;
  const hasAudience =
    a.recommendedAudience ||
    a.reason ||
    a.buyerMotivation ||
    a.positioning ||
    a.bestChannel;
  if (hasAudience) {
    const al: string[] = [];
    al.push(
      "AUDIENCE (write this campaign specifically for them — the angle, motivation, and channel below MUST shape the output; a different audience must yield a different campaign):"
    );
    if (a.recommendedAudience) al.push(`- Who: ${a.recommendedAudience}${a.fitTier ? ` (${a.fitTier})` : ""}`);
    if (a.reason) al.push(`- Why they fit this product: ${a.reason}`);
    if (a.buyerMotivation) al.push(`- What makes them buy (lead the angle with this): ${a.buyerMotivation}`);
    if (a.positioning) al.push(`- Positioning angle to take for THIS market: ${a.positioning}`);
    if (a.likelyObjection) al.push(`- Objection to disarm: ${a.likelyObjection}`);
    if (a.affordability) al.push(`- Price reality for them: ${a.affordability}`);
    if (a.bestChannel) al.push(`- Best channel: ${a.bestChannel}`);
    if (a.bestTiming) al.push(`- Best timing: ${a.bestTiming}`);
    lines.push(al.join("\n"));
  }

  // Campaign
  if (brief.campaign.goal) lines.push(`- Campaign goal: ${brief.campaign.goal}`);
  if (brief.campaign.tone) lines.push(`- Tone: ${brief.campaign.tone}`);

  // Constraints
  if (brief.constraints.marketAvailability?.length)
    lines.push(`- Sells in: ${brief.constraints.marketAvailability.join(", ")} (do not reference markets it cannot reach)`);
  if (brief.constraints.avoid?.length)
    lines.push(`- Avoid: ${brief.constraints.avoid.join("; ")}`);

  // Conflict resolution (FLAW 6) — explicit, ordered instructions the generator
  // must follow when brand DNA and the campaign goal disagree. Interpolated with
  // this brand's actual neverRules and goal so the priority is concrete.
  const never = brief.brand.neverRules || [];
  const goal = brief.campaign.goal;
  const personality = brief.brand.personalityTraits || [];
  const conflict: string[] = ["CONFLICT RULES (apply in this order if signals disagree):"];
  conflict.push(
    `1. NEVER-RULES WIN. These brand rules are absolute and override the campaign goal, the audience, and the channel — never break them${
      never.length ? `: ${never.join("; ")}` : "."
    }`
  );
  conflict.push(
    `2. CAMPAIGN GOAL OVERRIDES PERSONALITY ON TONE.${
      goal ? ` For this campaign the goal is "${goal}", so the tone may shift toward it` : " The campaign goal may shift the tone"
    }${
      personality.length ? ` even though the base personality is ${personality.join(", ")}` : ""
    } — but only within Rule 1.`
  );
  conflict.push(
    `3. BRAND VOICE OVERRIDES CHANNEL DEFAULTS ON STYLE. If a channel convention conflicts with the brand's voice, follow the brand's voice. Channel norms are a fallback, not an override.`
  );
  lines.push(conflict.join("\n"));

  lines.push(
    "Write copy that could ONLY describe this exact product for this exact audience. Use the confirmed differentiator and emotional drivers. No generic phrases, no unsupported claims, ready to publish."
  );

  return lines.join("\n");
}
