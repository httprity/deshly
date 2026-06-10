import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { callLLM } from "@/lib/llm";
import type { Cluster } from "@/lib/types";
import { logSignals } from "@/lib/signals";

const MATCH_PROMPT = `You are Deshly — a diaspora commerce strategist. You decide which markets a brand should TEST a SPECIFIC product in first, score that recommendation on explainable factors, and explain your reasoning in plain language a brand owner understands.

You receive a product, a brand voice, and a set of consumer clusters (diaspora and/or local Bangladesh), each with documented real buying behavior. Reason about how THIS SPECIFIC PRODUCT fits how EACH market actually buys, score the top 3, and return them.

IMPORTANT: You will only be given clusters the brand can ACTUALLY SERVE (based on their fulfillment capability). Never invent or suggest a market that is not in the provided list.

-----------------------------------
FIRST: READ THE PRODUCT
-----------------------------------

Understand what the product IS before scoring:
- CATEGORY & SUBCATEGORY: what is it, specifically
- PRICE TIER: budget / mid / premium / luxury (relative to Bangladeshi retail; budget under ~1000 BDT equiv, mid 1000-4000, premium 4000-12000, luxury 12000+). If a price is given, use it. If not, infer from the description.
- MAIN USE CASE: how/why people use it (e.g. "daily self-care", "festival gifting", "everyday wear")
- TRUST REQUIREMENT: how much trust a buyer needs before purchasing (High for skincare/ingestibles/high-price, Medium for fashion, Low for cheap impulse items)
- CULTURAL CODING: heritage (Bangladeshi/South-Asian tradition), western (global/streetwear), neutral, or fusion
- OCCASION: everyday, or tied to specific occasions (Eid, weddings, Pohela Boishakh)

Use any STRUCTURED HINTS the brand provided (positioning, target buyer, occasions) to sharpen this read — but still reason from the description.

-----------------------------------
THEN: SCORE EACH MARKET ON 4 EXPLAINABLE FACTORS (1-10 integers)
-----------------------------------

For each cluster, score these — based on REASONING, not vibes:

1. PRODUCT-MARKET FIT (1-10): Does THIS exact product match this audience's lifestyle, culture, needs, and buying habits? (Read aesthetic_preference, cultural_notes.)
2. PRICE ALIGNMENT (1-10): Does the product's price tier fit this audience's spending capacity? Compare to their AOV range. In range = high; far above their usual = low.
3. OCCASION FIT (1-10): Does the product match this audience's relevant cultural, seasonal, or daily-use occasions? (Read primary_occasions, gift_giving_pattern.)
4. CHANNEL FIT (1-10): Are this audience's preferred channels suitable for THIS product type? (Read channel preferences. Visual products thrive on Instagram; trust-heavy products need WhatsApp.)

RECOMMENDATION SCORE = weighted average, rounded to ONE decimal:
(ProductMarketFit * 0.35) + (PriceAlignment * 0.25) + (OccasionFit * 0.20) + (ChannelFit * 0.20)

This is a RECOMMENDATION/confidence score — "how strongly Deshly recommends testing this market first." It is NOT a sales or performance prediction.

FIT TIER from the recommendation score:
- 8.3 to 10 = "Strong Fit"
- 6.5 to 8.2 = "Moderate Fit"
- below 6.5 = "Exploratory"

-----------------------------------
THE RANKING MUST CHANGE BASED ON THE PRODUCT
-----------------------------------

Most important rule. A skincare serum, a saree, a snack box, a perfume, and a budget t-shirt must NOT produce the same top markets. Reason from the product. A gift-sending Gulf audience scores high for a sendable festival gift but low for everyday sneakers. Be honest with low scores.

Return the TOP 3 markets by recommendation score, best first — chosen ONLY from the provided clusters.

-----------------------------------
WRITING RULES
-----------------------------------

- NO fake prediction language: no "guaranteed sales", "expected conversion", "estimated reactions", "predicted performance", "+X% boost", "engagement rate". This is recommendation reasoning, not forecasting.
- "one_line_reason" and "why_this_fits" MUST reference a SPECIFIC product attribute AND a SPECIFIC audience behavior. No generic filler.
- "price_fit" is a qualitative sentence comparing the product's price to the audience's typical spend.
- "risk_note" is one honest caution for marketing to this audience with this product.
- Sub-scores are integers 1-10. Recommendation score has ONE decimal.

BANNED PHRASES: "aligns with", "resonates with", "matches preferences", "is a good fit", "perfect for", "ideal target", "target market".

-----------------------------------
RETURN ONLY VALID JSON — NO MARKDOWN
-----------------------------------

{
  "product_read": {
    "category": "short category, e.g. 'Skincare serum'",
    "price_tier": "Budget | Mid | Premium | Luxury",
    "use_case": "short main use case, e.g. 'Daily self-care + pre-event glow'",
    "trust_requirement": "High | Medium | Low"
  },
  "rankings": [
    {
      "cluster_id": "exact_id_from_input",
      "display_name": "'[City] — [Segment]'. Disambiguate repeats. E.g. 'Dhaka — Students 18-24'.",
      "fit_tier": "Strong Fit | Moderate Fit | Exploratory",
      "recommendation_score": 8.7,
      "one_line_reason": "ONE sentence. Why test here first — references a specific product attribute AND a specific audience behavior.",
      "score_breakdown": {
        "product_market_fit": 9,
        "price_alignment": 8,
        "occasion_fit": 7,
        "channel_fit": 8
      },
      "reasoning": {
        "why_this_fits": "2 sentences. Deeper reasoning on product-market fit.",
        "affordability_read": "1-2 sentences comparing product price to this audience's spend, with a campaign implication.",
        "buying_motivation": "Short line: what actually makes this audience buy this product.",
        "best_channel": "Channel(s) + brief reason, e.g. 'Instagram for visual proof, WhatsApp for purchase questions'",
        "best_timing_note": "Qualitative timing from their peak windows, e.g. 'Saturday evening or weekday after work'",
        "risk_note": "One honest caution for marketing this product to this audience.",
        "suggested_positioning": "One line: the recommended messaging angle for this market."
      }
    }
  ]
}

Return EXACTLY 3 rankings (or fewer if fewer clusters are provided), ordered by recommendation_score descending.

-----------------------------------
SELF-CHECK BEFORE RETURNING
-----------------------------------

1. Did the ranking reason about THIS product (not default markets)?
2. Are sub-scores integers 1-10 and recommendation_score one decimal?
3. Does recommendation_score match the weighted formula?
4. Does the fit_tier match the score thresholds?
5. Are ALL returned clusters from the provided list (none invented)?
6. Zero fake-prediction language, zero banned phrases?

Begin.`;

// ---- Fulfillment → which clusters the brand can actually serve ----
// Returns a filter function over clusters + a count of hidden diaspora markets.
function applyFulfillmentFilter(
  clusters: Cluster[],
  fulfillment: string | undefined,
  productDescription: string
): { allowed: Cluster[]; hiddenDiasporaCount: number; note: string | null } {
  const f = (fulfillment || "").toLowerCase();

  const localClusters = clusters.filter((c) => c.segment_type === "local");
  const diasporaClusters = clusters.filter((c) => c.segment_type === "diaspora");

  // "my city only" — try to match the city named in the description; else all local
  if (f.includes("city")) {
    const desc = productDescription.toLowerCase();
    const cityMatch = localClusters.filter((c) =>
      desc.includes((c.city || "").toLowerCase())
    );
    const allowed = cityMatch.length > 0 ? cityMatch : localClusters;
    return {
      allowed,
      hiddenDiasporaCount: diasporaClusters.length,
      note: `${diasporaClusters.length} diaspora markets hidden — enable international shipping to see them.`,
    };
  }

  // "nationwide" — all local, no diaspora
  if (f.includes("nationwide")) {
    return {
      allowed: localClusters,
      hiddenDiasporaCount: diasporaClusters.length,
      note: `${diasporaClusters.length} diaspora markets hidden — enable international shipping to see them.`,
    };
  }

  // "international" — local + diaspora (can ship abroad)
  if (f.includes("international")) {
    return { allowed: clusters, hiddenDiasporaCount: 0, note: null };
  }

  // "worldwide" — everything, diaspora fully in play
  if (f.includes("worldwide")) {
    return { allowed: clusters, hiddenDiasporaCount: 0, note: null };
  }

  // default (no fulfillment given) — everything, no hiding
  return { allowed: clusters, hiddenDiasporaCount: 0, note: null };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      productDescription,
      brandVoiceId,
      price,
      topN = 3,
      // new structured fields (all optional except fulfillment, which has a safe default)
      category,
      fulfillment,
      positioning,
      targetBuyer,
      occasions,
      notes,
      personalize,
      brandHandle,
    } = body;

    if (!productDescription || typeof productDescription !== "string") {
      return NextResponse.json(
        { error: "productDescription required" },
        { status: 400 }
      );
    }

    if (!brandVoiceId) {
      return NextResponse.json(
        { error: "brandVoiceId required" },
        { status: 400 }
      );
    }

    // Fetch all clusters
    const { data: clusters, error: clustersError } = await supabaseAdmin
      .from("clusters")
      .select("*");

    if (clustersError || !clusters) {
      return NextResponse.json(
        { error: "Failed to load clusters: " + clustersError?.message },
        { status: 500 }
      );
    }

    // Fetch brand voice
    const { data: brandVoice, error: voiceError } = await supabaseAdmin
      .from("brand_voices")
      .select("voice_profile")
      .eq("id", brandVoiceId)
      .single();

    if (voiceError || !brandVoice) {
      return NextResponse.json(
        { error: "Brand voice not found" },
        { status: 404 }
      );
    }

    // ---- FULFILLMENT FILTER: only score markets the brand can serve ----
    const { allowed, hiddenDiasporaCount, note } = applyFulfillmentFilter(
      clusters as Cluster[],
      fulfillment,
      productDescription
    );

    const clustersToScore = allowed.length > 0 ? allowed : (clusters as Cluster[]);

    // Compact cluster context — fields the LLM needs to reason about fit
    const clusterSummaries = clustersToScore.map((c: Cluster) => {
      const topChannel = Object.entries(c.channel_preferences || {})
        .sort(([, a]: any, [, b]: any) => (b as number) - (a as number))[0];
      const topChannelStr = topChannel
        ? `${topChannel[0]} ${Math.round((topChannel[1] as number) * 100)}%`
        : "—";
      const peakDay = Array.isArray(c.peak_shopping_windows) && c.peak_shopping_windows[0]
        ? `${c.peak_shopping_windows[0].day} ${c.peak_shopping_windows[0].hours}`
        : "—";

      return {
        id: c.id,
        type: c.segment_type,
        city: c.city,
        country: c.country,
        age: c.age_band,
        occasions: c.primary_occasions,
        aov: `${c.currency} ${c.avg_order_value_min}-${c.avg_order_value_max}`,
        gift_pattern: c.gift_giving_pattern,
        aesthetic: c.aesthetic_preference,
        channels: c.channel_preferences,
        top_channel: topChannelStr,
        peak: peakDay,
        notes: (c.cultural_notes || "").slice(0, 180),
      };
    });

    // Compact brand voice — top fields only
    const vp: any = brandVoice.voice_profile || {};
    const compactVoice = {
      vibe: vp.their_brand_vibe?.identity || vp.identity || "—",
      personality: vp.brand_personality?.traits || vp.traits || [],
      style: vp.how_they_talk?.style || "—",
      cares_about: vp.what_they_care_about || [],
    };

    const priceLine = price
      ? `\nPRODUCT PRICE: ${price}`
      : "\nPRODUCT PRICE: not given — infer price tier from the description.";

    // Structured hints block (only include provided fields)
    const hints: string[] = [];
    if (category) hints.push(`Category: ${category}`);
    if (positioning) hints.push(`Brand positioning: ${positioning}`);
    if (targetBuyer) hints.push(`Main buyer: ${targetBuyer}`);
    if (Array.isArray(occasions) && occasions.length) hints.push(`Purchase occasions: ${occasions.join(", ")}`);
    if (notes) hints.push(`Brand notes: ${notes}`);
    const hintsBlock = hints.length ? `\nSTRUCTURED HINTS:\n${hints.join("\n")}` : "";

    const fullPrompt = `${MATCH_PROMPT}

PRODUCT:
${productDescription}${priceLine}${hintsBlock}

BRAND VOICE:
${JSON.stringify(compactVoice)}

CLUSTERS (only markets this brand can serve):
${JSON.stringify(clusterSummaries)}`;

    // --- cache: return saved match result for identical inputs (instant demo) ---
    try {
      const { data: cachedMatch } = await supabaseAdmin
        .from("match_cache")
        .select("matches")
        .eq("brand_voice_id", brandVoiceId)
        .eq("product_description", productDescription)
        .maybeSingle();

      if (cachedMatch?.matches) {
        return NextResponse.json(cachedMatch.matches);
      }
    } catch {
      // no cached match — fall through to live matching
    }
    // --- end cache ---
    const llmResult = await callLLM({
      userPrompt: fullPrompt,
      jsonMode: true,
      temperature: 0.7,
      maxTokens: 3500,
    });
    const responseText = llmResult.text;

    let parsed: {
      product_read?: {
        category?: string;
        price_tier?: string;
        use_case?: string;
        trust_requirement?: string;
      };
      rankings: Array<{
        cluster_id: string;
        display_name?: string;
        fit_tier?: string;
        recommendation_score?: number;
        one_line_reason?: string;
        score_breakdown?: {
          product_market_fit?: number;
          price_alignment?: number;
          occasion_fit?: number;
          channel_fit?: number;
        };
        reasoning?: {
          why_this_fits?: string;
          affordability_read?: string;
          buying_motivation?: string;
          best_channel?: string;
          best_timing_note?: string;
          risk_note?: string;
          suggested_positioning?: string;
        };
      }>;
    };

    try {
      let cleaned = responseText
        .replace(/```json\n?/g, "")
        .replace(/```\n?/g, "")
        .trim();

      const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        cleaned = jsonMatch[0];
      }

      parsed = JSON.parse(cleaned);
    } catch (parseError) {
      console.error("=== FAILED TO PARSE LLM RESPONSE ===");
      console.error(responseText);
      return NextResponse.json(
        {
          error: "Failed to parse cluster rankings",
          rawSnippet: responseText.substring(0, 500),
        },
        { status: 500 }
      );
    }

    if (!parsed.rankings || !Array.isArray(parsed.rankings)) {
      return NextResponse.json(
        { error: "Invalid rankings response from AI" },
        { status: 500 }
      );
    }

    // Sort by recommendation score desc, take top N
    const sorted = parsed.rankings
      .slice()
      .sort((a, b) => (b.recommendation_score || 0) - (a.recommendation_score || 0));
    const topMatches = sorted.slice(0, topN);

    const enrichedMatches = topMatches
      .map((match) => {
        const cluster = clustersToScore.find((c: Cluster) => c.id === match.cluster_id);
        return {
          cluster,
          display_name: match.display_name,
          fit_tier: match.fit_tier,
          recommendation_score: match.recommendation_score,
          one_line_reason: match.one_line_reason,
          score_breakdown: match.score_breakdown,
          reasoning: match.reasoning,
        };
      })
      .filter((m) => m.cluster); // drop hallucinated cluster_ids

    // Log one "recommended" signal per market (fire-and-forget; never blocks)
    logSignals(
      enrichedMatches.map((m) => ({
        brandVoiceId,
        brandHandle: brandHandle || null,
        productDescription,
        price: price || null,
        clusterId: m.cluster!.id,
        action: "recommended" as const,
        recommendationScore: m.recommendation_score ?? null,
        fitTier: m.fit_tier ?? null,
      }))
    );

    const responsePayload = {
      success: true,
      productRead: parsed.product_read || null,
      matches: enrichedMatches,
      hiddenDiasporaCount,
      fulfillmentNote: note,
    };

    // save the full result so the demo replays instantly next time (best-effort)
    try {
      await supabaseAdmin.from("match_cache").upsert(
        {
          brand_voice_id: brandVoiceId,
          product_description: productDescription,
          matches: responsePayload,
        },
        { onConflict: "brand_voice_id,product_description" }
      );
    } catch {
      // cache write failed — not fatal
    }

    return NextResponse.json(responsePayload);
  } catch (error: any) {
    console.error("Match clusters error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}