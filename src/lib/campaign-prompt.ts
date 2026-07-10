import type { Cluster, BrandVoiceProfile } from "@/lib/types";
import type { ProductIntelligence } from "@/lib/product-intelligence";
import {
  compileCampaignBrief,
  buildCampaignGenerationPrompt,
  audienceFromReasoning,
  type AudienceReasoningInput,
} from "@/lib/campaign-brief";

// ============================================================
// DESHLY — campaign prompt builder
// Extracted from /api/generate-campaign so the route AND the
// scripts/compare-output.ts harness build the EXACT same prompt.
// buildFullPrompt({ fullContext: true }) bypasses compaction
// (sends the full brand profile + full cluster row).
// ============================================================

export const GENERATION_PROMPT = `You generate a complete marketing campaign for ONE market cluster. The campaign must sound like THIS SPECIFIC BRAND speaking to THIS SPECIFIC MARKET about THIS SPECIFIC PRODUCT.

Two forces shape every line, equally:
1. BRAND VOICE — the brand's signature words, tone, emoji density, sentence rhythm, language mix. The caption must sound like the same person who wrote the brand's own captions.
2. MARKET LOCALIZATION — the cluster's language style and emotional angle (defined below). Not translation — localize the EMOTION.

Blend both. A premium-restrained brand selling to local urban professionals = polished, market-appropriate language in that brand's restrained tone. The same brand to a diaspora audience = heritage/gifting framing, still in the brand's voice.

-----------------------------------
RULE 0: MARKET NEUTRALITY (read before everything else)
-----------------------------------

Do NOT assume or insert any specific country, region, religion, festival, holiday, or language. Reference a market's culture, occasion, or language ONLY when it actually appears in the PRODUCT (its description or occasions), the CLUSTER data (country, language_mix, occasions), or the brand's own voice. Default output language is English; default currency is USD (use the cluster's currency when given). Never default to one home market — let the cluster drive the market context.

-----------------------------------
RULE 1: BE PRODUCT-SPECIFIC (most important)
-----------------------------------

The caption and every output MUST reference CONCRETE attributes of the actual product — its color, material, craft, price point, occasion, limited-ness. Pull real details from the product description.

If the product is "hand-stitched emerald silk jacket, limited holiday capsule, $120" then the caption must evoke emerald silk, hand embroidery, the occasion it's actually made for, and that price tier — NOT generic fashion language.

BANNED — these phrases are category stereotypes that could describe any product. Never use them or anything like them:
- "elegance redefined" / "redefine elegance"
- "visual-first audience" / "perfect for showcasing"
- "elevate your style" / "timeless elegance"
- "premium quality" / "crafted to perfection"
- "must-have" / "game-changer"
- any sentence that would work for a totally different product

If your caption could be pasted onto a different product and still make sense, it is WRONG. Rewrite it until it could ONLY describe this exact product.

-----------------------------------
RULE 2: LOCALIZE THE EMOTIONAL ANGLE PER MARKET
-----------------------------------

Use the cluster's LANGUAGE_STYLE, LANGUAGE_MIX, COUNTRY, and OCCASIONS (all provided in the cluster data) to set tone. Do not assume any specific country, culture, or festival — read it from the cluster:
- Urban professionals → polished, confident, modern; the market's own everyday register
- Students / mobile-first → casual, short, energetic, internet-native
- Mid-tier / smaller-city → simpler, occasion-focused, direct and clear
- Diaspora → heritage + gifting + home-connection. The emotional hook is "a piece of home," sending to family, celebrating cultural identity abroad.

Write in the cluster's language_mix. If that language reads machine-translated or awkward, rewrite it — natural code-switching only, the way real bilingual speakers in THAT market actually write. Awkward language destroys credibility.

-----------------------------------
RULE 3: MATCH BRAND VOICE
-----------------------------------

- Use the brand's signature words and tone.
- Match their emoji density and sentence length.
- Honor their language mix.
- Avoid everything in the brand's "never" list.

Register must match the brand, not default to polished-ad voice:
- Casual / streetwear brand → short, punchy, playful, a little sarcastic; fragments are fine; sound like a person, not a billboard. ("Your daily uniform, minus the overthinking.")
- Premium / elegant brand → restrained, polished, fewer words, no hype.
- Food / café brand → sensory, crave-driven language (taste, heat, freshness, sharing).
- Skincare brand → trust + routine language (concern, ingredient, how it fits a routine), no overclaiming.
- Electronics brand → concrete (specs, battery, reliability, performance), no fluff.
Never flatten a casual brand into corporate ad copy. If the brand is playful, the caption must actually be playful.

-----------------------------------
RULE 4: FRAME THE USE-CASE BY CATEGORY (do NOT force festive framing)
-----------------------------------

Match the occasion framing to the ACTUAL product, using PRODUCT_CATEGORY and the product description:
- Casualwear (tees, basics, everyday fits) → daily wear, campus, hangouts, coffee runs, layering, lifestyle, drop culture, low-pressure gifting. Do NOT force festive/holiday framing onto a basic tee. (Light occasion *gifting* is okay; formal festive *wear* is not.)
- Premium occasion / ethnic wear (silk, embroidered, festive sets) → the relevant holidays, weddings, family gatherings, gifting — festive framing IS appropriate here, but use the occasions the product and cluster actually carry, never an assumed one.
- Food → cravings, freshness, hot delivery, group/family sharing, office lunch, evening snacks, late-night orders, combo value.
- Skincare/Beauty → the specific skin concern, ingredients, routine fit, before/after proof, reviews/trust.
- Electronics → specs, performance, battery, reliability, warranty, compatibility, everyday/work/gaming use.
- Home/Books/Services → use the product's real function; never invent a festive occasion that doesn't fit.

If CUSTOMER_CARES are provided, the angle MUST speak to them concretely. E.g. pizza with [Taste, Hot delivery, Combo deals, Family sharing] → an angle like "Friday-night combo, hot to your door, made for sharing" — NOT "premium feel / occasion wear". Fashion with [Fit, Comfort, Trendy design] → oversized fit, breathable everyday comfort, campus/hangout styling.

-----------------------------------
RETURN ONLY THIS JSON (no markdown, no prose)
-----------------------------------

{
  "why_this_campaign": "ONE specific sentence: why THIS campaign works for THIS market — reference a concrete product attribute AND a specific market behavior/price reality. E.g. 'Emerald silk and hand embroidery at $120 fit urban professionals who want premium occasion wear without luxury-brand pricing.' NO generic phrases.",
  "caption": "Main caption. Product-specific (concrete attributes), brand voice + market localization blended. Match brand language mix + emoji density + sentence length. Reference the cluster's occasion naturally.",
  "image_prompt": "ONE universal image prompt — scene-rich, brand aesthetic aware, references the actual product, 2 sentences. Reusable across Midjourney/DALL-E/Gemini.",
  "reels_storyboard": [
    {"frame": 1, "visual": "scene description featuring the actual product", "overlay": "on-screen text", "seconds": 3},
    {"frame": 2, "visual": "...", "overlay": "...", "seconds": 3},
    {"frame": 3, "visual": "...", "overlay": "call to action", "seconds": 3}
  ],
  "hashtags": ["8-10 hashtags appropriate for this product AND this cluster"],
  "whatsapp_message": "2-3 line broadcast in cluster's language style, product-specific, action-driven",
  "posting_time": "Best day + time in the audience's local timezone, e.g. 'Friday 8-10 PM'",
  "channel_recommendation": "Platform name with one short benefit line specific to this product+market. E.g. 'Instagram — emerald silk photographs beautifully for this visual audience' NOT 'visual-first audience'",
  "predicted_reach_min": number,
  "predicted_reach_max": number,
  "predicted_engagement_min": decimal e.g. 0.025,
  "predicted_engagement_max": decimal e.g. 0.045
}

Predictions: use cluster size × cluster's typical_engagement_rate × visibility (0.05-0.15). Adjust by brand_voice_strength (high = +20%, low = -30%).

-----------------------------------
SELF-CHECK BEFORE RETURNING
-----------------------------------
1. Could the caption be pasted onto a different product? If yes, REWRITE — make it product-specific.
2. Does it use any BANNED phrase? If yes, REWRITE.
3. Does the localized language read naturally (not machine-translated)?
4. Does it sound like the brand's voice AND localize the market emotion?
5. Does why_this_campaign name a concrete product attribute AND a market reality?
6. Is the occasion framing right for the CATEGORY? (No forced festive/holiday framing on basic casualwear. Food = cravings/sharing/delivery. Skincare = concern/routine. Electronics = specs/performance.)
   Did you avoid inventing any country, festival, or language not present in the product or cluster data (RULE 0)?
7. If CUSTOMER_CARES were given, does the angle actually speak to them?
Begin.`;

// Per-market language style hint — sent with each cluster so the LLM localizes
// emotion, not just words. Fully cluster-driven and market-neutral: it derives
// the tone from the cluster's OWN fields (segment_type, language_mix, city,
// country, age_band, id) and never assumes a specific country or language.
export function languageStyleFor(c: Cluster): string {
  const type = (c.segment_type || "").toLowerCase();
  const id = (c.id || "").toLowerCase();
  const age = (c.age_band || "").toLowerCase();
  const place = [c.city, c.country].filter(Boolean).join(", ") || "this market";
  const langMix = (c.language_mix || "").trim();
  const langClause = langMix
    ? `Write in their language mix (${langMix}) — natural code-switching only, never machine-translated.`
    : `Write in the language this market actually uses; natural and idiomatic, never machine-translated.`;

  if (type === "diaspora") {
    return `Diaspora audience in ${place}: emotional hook = connection to heritage and home — sending/gifting to family, celebrating cultural identity while abroad. ${langClause}`;
  }

  // Local audiences — tone from segment signals (students/mobile/mid-tier),
  // not from any hardcoded city. Everything else stays market-neutral.
  const isStudent = id.includes("student") || /1[5-9]|2[0-4]/.test(age);
  const isMobileFirst = id.includes("mobile") || id.includes("tier_2") || id.includes("tier2") || id.includes("midtier") || id.includes("mid_tier");
  const isProfessional = id.includes("professional") || /3[0-9]|4[0-9]/.test(age);

  if (isStudent) {
    return `Local audience in ${place} (younger / student): casual, short, energetic, internet-native, heavy code-switching. ${langClause}`;
  }
  if (isMobileFirst) {
    return `Local audience in ${place} (mobile-first / smaller-city): simpler, occasion-focused, very direct and clear. ${langClause}`;
  }
  if (isProfessional) {
    return `Local audience in ${place} (urban professionals): polished, confident, modern; the market's own everyday register. ${langClause}`;
  }
  return `Local audience in ${place}: speak to everyday life and the occasions that actually matter here (see the cluster's occasions), culturally appropriate to ${place}, clear and warm. ${langClause}`;
}

// STAGE 5: campaign intent — a THIS-CAMPAIGN-ONLY tone nudge that never
// overwrites the permanent brand DNA.
const INTENT_NUDGE: Record<string, string> = {
  "Everyday": "Everyday intent: keep the brand's normal tone, no added urgency.",
  "Festive push": "Festive intent: lean into the occasion warmly; a little more energy is okay, but stay in brand voice.",
  "Limited drop": "Limited-drop intent: soft scarcity is allowed (e.g. 'limited pieces'), never hard hype.",
  "Sale": "Sale intent: a clear value/offer mention is allowed, but keep it tasteful and on-brand — no 'HURRY!!!'.",
};

export interface BuildPromptInput {
  profile: BrandVoiceProfile | null;
  voiceStrength: number | null | undefined;
  cluster: Cluster;
  productDescription: string;
  campaignIntent?: string;
  campaignGoal?: string;
  productCategory?: string;
  customerCares?: string[];
  historyContext?: string;
  /**
   * Confirmed Product Intelligence. When present, a structured CAMPAIGN BRIEF
   * block is compiled and injected so generation runs off confirmed attributes
   * (differentiator, use cases, emotional drivers, …) — not just raw text.
   */
  productIntelligence?: ProductIntelligence;
  brandName?: string;
  /** Free-text things to avoid (audience-to-avoid / banned tone). */
  avoid?: string[];
  /**
   * The audience-match reasoning for THIS cluster (from /api/match-clusters):
   * buying_motivation, suggested_positioning, best_channel, why_this_fits, …
   * This is what makes one audience's campaign differ from another's. Without
   * it, audience collapses to "<city> buyers" and all outputs look alike.
   */
  audienceReasoning?: AudienceReasoningInput;
  /**
   * Test harness only. When true, send the FULL brand profile + FULL cluster row
   * instead of the compacted versions. Default false = production compaction.
   */
  fullContext?: boolean;
}

/**
 * Builds the exact campaign-generation prompt used by /api/generate-campaign.
 * This is the single source of truth for that prompt — do not duplicate it.
 */
export function buildFullPrompt(input: BuildPromptInput): string {
  const {
    profile,
    voiceStrength,
    cluster,
    productDescription,
    campaignIntent,
    campaignGoal,
    productCategory,
    customerCares,
    historyContext = "",
    productIntelligence,
    brandName,
    avoid,
    audienceReasoning,
    fullContext = false,
  } = input;

  // Structured CAMPAIGN BRIEF — confirmed product attributes + the audience
  // reasoning for THIS cluster. Generation runs off this, not just the raw
  // productDescription.
  //
  // NON-CONDITIONAL (Phase 1, Gap 2): the brief is ALWAYS built. Previously it
  // was gated on `productIntelligence`, so any caller that omitted it silently
  // fell back to raw product text — the generic-output failure mode. Now, when
  // product intelligence is absent we still compile a brief (audience block +
  // conflict rules) from whatever is available, so the audience reasoning and
  // brand rules always reach the model. The raw PRODUCT text is still appended
  // below, so nothing is lost.
  const audience = audienceFromReasoning(audienceReasoning);
  const briefBlock = `\n\n${buildCampaignGenerationPrompt(
    compileCampaignBrief({
      brandName,
      profile,
      product: productIntelligence || {},
      cluster,
      campaignGoal,
      avoid,
      audience,
    })
  )}`;

  // Compact brand voice — only fields the LLM needs to write in voice
  const vp: any = profile || {};
  const compactVoice = {
    vibe: vp.their_brand_vibe?.identity || "—",
    personality: (vp.brand_personality?.traits || []).slice(0, 4),
    style: vp.how_they_talk?.style || "—",
    signature_words: (vp.words_they_repeat || []).slice(0, 6),
    cares_about: (vp.what_they_care_about || []).slice(0, 4),
    never: (vp.they_never || []).slice(0, 3),
  };

  // Rulebook layers (new, optional — present only if the brand was extracted
  // with the upgraded schema). The campaign LLM follows these DIRECTLY.
  // HYBRID: prefer the clearer NAMED refinement fields when present, else
  // fall back to the original working fields. Fully backward-compatible.
  const gi: any = vp.generation_instructions || {};
  const rulebook = {
    caption_instruction: gi.caption_instruction || "",
    whatsapp_instruction: gi.whatsapp_instruction || "",
    image_prompt_instruction: gi.image_prompt_instruction || "",
    diaspora_adaptation_instruction: gi.diaspora_adaptation_instruction || "",
    market_adaptation_instruction: gi.market_adaptation_instruction || "",
    dont_rules: (vp.dont_rules || []).slice(0, 6),
    product_framing: vp.product_framing?.usual_angle || "",
    // prefer structured conversion_style (new) — same shape in both, safe
    conversion_style: vp.conversion_style
      ? `${vp.conversion_style.cta_style || ""} CTA, urgency ${vp.conversion_style.urgency_level || "—"}`
      : "",
    brand_maturity: vp.brand_maturity || "",
    trust_requirements: (vp.trust_requirements || []).slice(0, 4),
    // NEW named fields (prefer these; empty if not refined yet)
    style_priority: vp.style_priority || "",
    customer_motivations: Array.isArray(vp.customer_motivations)
      ? vp.customer_motivations.slice(0, 6)
      : [],
  };
  const hasRulebook = Boolean(
    rulebook.caption_instruction ||
      rulebook.dont_rules.length ||
      rulebook.product_framing ||
      rulebook.style_priority ||
      rulebook.customer_motivations.length
  );

  // Category + customer-cares: prefer the request (live generator selections),
  // else fall back to the saved profile (Brand DNA refinement). Point 11.
  const resolvedCategory = productCategory || vp.business_category || "";
  const resolvedCares: string[] =
    (Array.isArray(customerCares) && customerCares.length
      ? customerCares
      : Array.isArray(vp.customer_motivations)
      ? vp.customer_motivations
      : []) || [];
  const categoryBlock =
    resolvedCategory || resolvedCares.length
      ? `\n\nPRODUCT_CATEGORY: ${resolvedCategory || "—"}\nCUSTOMER_CARES (the angle MUST speak to these): ${
          resolvedCares.length ? resolvedCares.join(", ") : "—"
        }`
      : "";

  const intentParts: string[] = [];
  if (campaignIntent && INTENT_NUDGE[campaignIntent]) intentParts.push(INTENT_NUDGE[campaignIntent]);
  if (campaignGoal && typeof campaignGoal === "string" && campaignGoal.trim()) {
    intentParts.push(`Campaign goal for this run: ${campaignGoal.trim()}.`);
  }
  const intentBlock = intentParts.length
    ? `\nCAMPAIGN INTENT (applies to THIS campaign only — do NOT permanently change the brand voice):\n${intentParts.join(" ")}`
    : "";

  // Compact cluster — only fields needed for cultural-fit content + language style
  const compactCluster = (c: Cluster) => ({
    city: c.city,
    country: c.country,
    age: c.age_band,
    size: c.estimated_size,
    occasions: c.primary_occasions,
    currency: c.currency,
    aov: `${c.avg_order_value_min}-${c.avg_order_value_max}`,
    language_mix: c.language_mix,
    language_style: languageStyleFor(c),
    typical_engagement_rate: c.typical_engagement_rate,
    aesthetic: c.aesthetic_preference,
    peak: Array.isArray(c.peak_shopping_windows) && c.peak_shopping_windows[0]
      ? `${c.peak_shopping_windows[0].day} ${c.peak_shopping_windows[0].hours}`
      : "—",
  });

  const rulebookBlock = hasRulebook
    ? `

BRAND RULEBOOK (follow these instructions DIRECTLY — they are this brand's own rules):
- Caption instruction: ${rulebook.caption_instruction || "—"}
- WhatsApp instruction: ${rulebook.whatsapp_instruction || "—"}
- Image prompt instruction: ${rulebook.image_prompt_instruction || "—"}
- Diaspora adaptation: ${rulebook.diaspora_adaptation_instruction || "—"}
- Market adaptation (brand vs market balance): ${rulebook.market_adaptation_instruction || "—"}
- Product framing: ${rulebook.product_framing || "—"}
- Conversion style: ${rulebook.conversion_style || "—"}
- Style priority: ${rulebook.style_priority || "—"}
- Customer motivations to speak to: ${rulebook.customer_motivations.join(", ") || "—"}
- Brand maturity: ${rulebook.brand_maturity || "—"}
- Trust to emphasize: ${rulebook.trust_requirements.join(", ") || "—"}
- MUST NOT do: ${rulebook.dont_rules.join(" | ") || "—"}`
    : "";

  // fullContext bypasses compaction — send the entire profile + entire cluster row.
  const voiceBlock = fullContext
    ? JSON.stringify(profile)
    : JSON.stringify(compactVoice);
  const clusterBlock = fullContext
    ? JSON.stringify(cluster)
    : JSON.stringify(compactCluster(cluster));

  return `${GENERATION_PROMPT}

BRAND VOICE:
${voiceBlock}

BRAND VOICE STRENGTH: ${voiceStrength}${rulebookBlock}${categoryBlock}${historyContext ? `\n\n${historyContext}` : ""}${intentBlock}${briefBlock}

PRODUCT:
${productDescription}

CLUSTER (note language_style — localize the emotional angle accordingly):
${clusterBlock}`;
}
