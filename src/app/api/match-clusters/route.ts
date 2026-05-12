import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { callLLM } from "@/lib/llm";
import type { Cluster } from "@/lib/types";

const MATCH_PROMPT = `You are a marketing intelligence engine matching a product to consumer clusters.

You will be given:
1. A product description
2. A brand voice profile (themes, register)
3. A list of 13 consumer clusters with their attributes

Your job: Score each cluster 0-100 on how well this product fits, considering:
- Cultural fit (occasions, religious/regional alignment)
- Budget fit (does product price likely match cluster's AOV range)
- Aesthetic fit (cluster's aesthetic_preference vs brand themes)
- Channel viability (does cluster use channels that suit this product)
- Gift-giving relevance (if product fits gifting patterns)

Return ONLY valid JSON of this exact shape (no markdown):

{
  "rankings": [
    {
      "cluster_id": "exact_cluster_id_from_input",
      "score": 0-100,
      "reasoning": "1-2 sentences explaining the fit"
    },
    ... (one entry per cluster, all 13)
  ]
}

Sort by score descending. Be honest — don't inflate weak fits.`;

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

    // Build context for Gemini
    const clusterSummaries = clusters.map((c: Cluster) => ({
      id: c.id,
      segment_type: c.segment_type,
      country: c.country,
      city: c.city,
      age_band: c.age_band,
      primary_occasions: c.primary_occasions,
      currency: c.currency,
      aov_range: `${c.avg_order_value_min}-${c.avg_order_value_max}`,
      aesthetic_preference: c.aesthetic_preference,
      gift_pattern: c.gift_giving_pattern,
      channel_top: Object.entries(c.channel_preferences || {})
        .sort(([, a]: any, [, b]: any) => b - a)
        .slice(0, 2)
        .map(([k]) => k)
        .join(", "),
    }));

    const fullPrompt = `${MATCH_PROMPT}

PRODUCT DESCRIPTION:
${productDescription}

BRAND VOICE PROFILE:
${JSON.stringify(brandVoice.voice_profile, null, 2)}

CLUSTERS:
${JSON.stringify(clusterSummaries, null, 2)}`;

const llmResult = await callLLM({
    userPrompt: fullPrompt,
    jsonMode: true,
    temperature: 0.4,
    maxTokens: 4096,
  });
  const responseText = llmResult.text;

    let parsed: { rankings: Array<{ cluster_id: string; score: number; reasoning: string }> };
try {
  let cleaned = responseText
    .replace(/```json\n?/g, "")
    .replace(/```\n?/g, "")
    .trim();
  
  // Try to extract just the JSON object if there's surrounding text
  const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    cleaned = jsonMatch[0];
  }
  
  parsed = JSON.parse(cleaned);
} catch (parseError) {
  console.error("=== FAILED TO PARSE GEMINI RESPONSE ===");
  console.error(responseText);
  console.error("=== END RESPONSE ===");
  return NextResponse.json(
    { 
      error: "Failed to parse cluster rankings",
      hint: "Check server logs for raw Gemini output",
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

    // Sort by score, take top N
    const sorted = parsed.rankings.sort((a, b) => b.score - a.score);
    const topMatches = sorted.slice(0, topN);

    // Hydrate with full cluster data
    const enrichedMatches = topMatches.map((match) => {
      const cluster = clusters.find((c: Cluster) => c.id === match.cluster_id);
      return {
        cluster,
        score: match.score,
        reasoning: match.reasoning,
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