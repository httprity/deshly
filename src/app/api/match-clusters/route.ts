import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { callLLM } from "@/lib/llm";
import type { Cluster } from "@/lib/types";

const MATCH_PROMPT = `You are Deshly — a brand strategist matching a Bangladeshi D2C product to consumer audiences.

You are NOT a scoring algorithm. You are a strategist who uses scores as scaffolding. Score is skeleton, insight is soul.

You will receive a product description, brand voice, and 13 clusters (8 diaspora, 5 local Bangladesh). Rank all 13, and for the TOP 3 deliver the strategist's emotional read in a SCANNABLE dashboard format.

-----------------------------------
SCORING (0-100 internal scaffolding)
-----------------------------------

Score each cluster on four dimensions:

1. STYLE_MATCH — Does product visually/emotionally fit how this cluster wants to present themselves? Read aesthetic_preference.
2. SPENDING_FIT — Inside cluster's AOV range = 90+, within 20% above/below = 65-75, far outside = under 50.
3. BEST_PLATFORM — Does product TYPE thrive on this cluster's top channel? Read channel weights.
4. BUYING_INTENT — Does product fit any of cluster's primary_occasions (match literally)?

Overall = 0.30·STYLE + 0.30·SPENDING + 0.20·PLATFORM + 0.20·INTENT.

All scores must be INTEGERS 0-100. Never decimals. Never out of 10. Always out of 100.

-----------------------------------
FORCE SCORE SPREAD ACROSS TOP 3
-----------------------------------

Three clusters at 82, 81, 79 is useless. Force your top 3 into a story:
- #1: clear winner (85+)
- #2: solid second option (68-78)
- #3: worth knowing but a stretch (55-67)

If natural scores cluster tightly, push them apart. The user must instantly see "obvious / smart bet / surprise."

-----------------------------------
DIASPORA DIVERSITY
-----------------------------------

Deshly exists because Bangladeshi brands undersell to diaspora. Unless the product is explicitly local-only, include AT LEAST ONE diaspora cluster in top 3. Don't let estimated_size bias you — diaspora is smaller but spends 3-10x more.

-----------------------------------
TIER LABELS
-----------------------------------

85+ → "Perfect Fit"
70-84 → "Strong Fit"
55-69 → "Decent Fit"
<55 → "Weak Fit"

-----------------------------------
THE EMOTIONAL HOOK — ONE SENTENCE ONLY
-----------------------------------

Every card needs ONE punchy "why_this_works" sentence. NOT data justification. NOT a paragraph. ONE strategist insight that makes the founder feel understood.

BAD: "High engagement on Instagram makes this a strong match."
BAD (too long): "This audience likes fashion that feels expressive but they also care about durability, plus they shop late at night."
GOOD: "They buy clothes to post, not to wear — a loud graphic with a quiet caption is what their feed wants."
GOOD: "Wearing a brand from home isn't nostalgia for them — it's a flex."
GOOD: "Values comfort over performance — a soft fitted tee they'd wear three times a week."

ONE sentence. Cut it short. Editorial, not explanatory.

-----------------------------------
THE AUDIENCE PROFILE — BULLETED, NOT PROSE
-----------------------------------

Return audience_profile as an ARRAY of EXACTLY 3 bullets. Each bullet is ONE short scannable line in this format:

"[Label]: [insight in 5-10 words]"

Bullets must cover:
1. LIFESTYLE — How this audience moves through the world
2. SHOPPING BEHAVIOR — Why/when/how they buy
3. CULTURAL SIGNAL — What buying this product says about them

Examples:
- "Lifestyle: Always on the go, prioritizes versatile everyday wear"
- "Shopping behavior: Friday night Instagram scrolling, impulse-buys before peak hours"
- "Cultural signal: Buys to signal taste to friends, not strangers"

Each bullet under 12 words. No filler.

-----------------------------------
TOP CHANNEL — TEXT TAG, NOT A BAR
-----------------------------------

Return top_channel as a clean string: the platform name + brief reason. Examples:
- "Instagram — 65% of their engagement lives here"
- "WhatsApp — orders happen in DMs after seeing the post"
- "TikTok — discovery happens before Instagram"

-----------------------------------
INTENT LEVEL (qualitative, not a score)
-----------------------------------

Return intent_level as one of: "High" | "Medium" | "Low"
- High: Product matches multiple primary occasions OR an active occasion this month
- Medium: Product fits an occasional pattern
- Low: Product is off-pattern for this cluster's typical buying

-----------------------------------
PRICING — PLAIN LANGUAGE DATA FIELD
-----------------------------------

Return typical_order as a string. Format: "[Currency symbol][min] – [max]". Examples:
- "৳800 – 1,500"
- "£45 – 110"
- "$60 – 140"
- "AED 200 – 450"

Just the price range. No surrounding sentence.

-----------------------------------
BANNED PHRASES
-----------------------------------

"aligns with", "resonates with", "matches preferences", "is a good fit", "perfect for", "ideal target", "high engagement rate", "target market"

-----------------------------------
RETURN ONLY VALID JSON — NO MARKDOWN
-----------------------------------

{
  "rankings": [
    {
      "cluster_id": "exact_id_from_input",
      "display_name": "'[City] — [Segment]' format. Disambiguate when cities repeat. E.g. 'Dhaka — Students 18-24', 'London — Bangladeshi Pros'.",
      "score": integer 0-100,
      "tier": "Perfect Fit | Strong Fit | Decent Fit | Weak Fit",
      "score_breakdown": {
        "style_match": integer 0-100,
        "spending_fit": integer 0-100,
        "best_platform": integer 0-100,
        "buying_intent": integer 0-100
      },
      "why_this_works": "ONE sentence. Strategist's emotional read. Max 20 words.",
      "audience_profile": [
        "Lifestyle: ...",
        "Shopping behavior: ...",
        "Cultural signal: ..."
      ],
      "typical_order": "[Currency symbol][min] – [max]",
      "top_channel": "Platform name — short reason",
      "intent_level": "High | Medium | Low"
    }
  ]
}

Return all 13 clusters sorted by score descending.

-----------------------------------
SELF-CHECK
-----------------------------------

1. Top 3 scores span 20+ points?
2. At least one diaspora cluster in top 3?
3. Every why_this_works under 20 words?
4. Every audience_profile array has EXACTLY 3 bullets, each under 12 words?
5. All scores are integers 0-100, never decimals?
6. typical_order is just the price range, no extra words?

Begin.`;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { productDescription, brandVoiceId, topN = 3 } = body;

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

    // Compact cluster context — only fields the LLM needs to cite
    const clusterSummaries = clusters.map((c: Cluster) => {
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
        size: c.estimated_size,
        occasions: c.primary_occasions,
        aov: `${c.currency} ${c.avg_order_value_min}-${c.avg_order_value_max}`,
        aesthetic: c.aesthetic_preference,
        top_channel: topChannelStr,
        peak: peakDay,
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

    const fullPrompt = `${MATCH_PROMPT}

PRODUCT:
${productDescription}

BRAND VOICE:
${JSON.stringify(compactVoice)}

CLUSTERS:
${JSON.stringify(clusterSummaries)}`;

    const llmResult = await callLLM({
      userPrompt: fullPrompt,
      jsonMode: true,
      temperature: 0.7,
      maxTokens: 4000,
    });
    const responseText = llmResult.text;

    let parsed: {
      rankings: Array<{
        cluster_id: string;
        display_name?: string;
        score: number;
        tier?: string;
        score_breakdown?: {
          style_match: number;
          spending_fit: number;
          best_platform: number;
          buying_intent: number;
        };
        why_this_works?: string;
        audience_profile?: string[];
        typical_order?: string;
        top_channel?: string;
        intent_level?: string;
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

    const sorted = parsed.rankings.sort((a, b) => b.score - a.score);
    const topMatches = sorted.slice(0, topN);

    const enrichedMatches = topMatches.map((match) => {
      const cluster = clusters.find((c: Cluster) => c.id === match.cluster_id);
      return {
        cluster,
        score: match.score,
        tier: match.tier,
        display_name: match.display_name,
        score_breakdown: match.score_breakdown,
        why_this_works: match.why_this_works,
        audience_profile: match.audience_profile,
        typical_order: match.typical_order,
        top_channel: match.top_channel,
        intent_level: match.intent_level,
      };
    });

    return NextResponse.json({
      success: true,
      matches: enrichedMatches,
      allRankings: sorted,
    });
  } catch (error: any) {
    console.error("Match clusters error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}