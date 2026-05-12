import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { callLLM } from "@/lib/llm";
import type { Cluster, BrandVoiceProfile } from "@/lib/types";

const GENERATION_PROMPT = `You are a culturally-aware marketing campaign generator for a Bangladeshi D2C brand.

You will produce a COMPLETE campaign package for ONE specific cluster, using a specific brand's voice for a specific product.

Critical constraints:
1. Every word must sound like the brand's voice (use their signature words, match their tone, respect their language mix)
2. Every detail must be culturally appropriate for the target cluster
3. Use the cluster's currency, language preference, and channel preferences
4. Time the post for the cluster's peak shopping windows
5. Reference the cluster's primary occasions where appropriate
6. Match the brand's "never does" list — avoid those patterns

Return ONLY valid JSON in this exact structure (no markdown):

{
  "caption": "The main caption — match brand's language mix exactly. If brand uses Bangla-English code-switching, do that. Match emoji density. Match sentence length patterns. Reference cluster occasion if relevant.",
  "image_prompts": {
    "gemini": "Detailed image prompt optimized for Gemini Nano Banana / Imagen — natural language, scene-rich, brand-aesthetic-aware, 1-2 sentences",
    "midjourney": "Midjourney v6 syntax prompt — keyword-dense, with --ar 4:5 --style raw --v 6 at the end",
    "dalle": "DALL-E 3 prompt — natural conversational, descriptive, mood-rich, 1-2 sentences"
  },
  "reels_storyboard": [
    {"frame": 1, "visual": "what's on screen", "caption_overlay": "text shown on screen", "duration_seconds": 3},
    {"frame": 2, "visual": "...", "caption_overlay": "...", "duration_seconds": 3},
    {"frame": 3, "visual": "...", "caption_overlay": "...", "duration_seconds": 4},
    {"frame": 4, "visual": "...", "caption_overlay": "...", "duration_seconds": 3},
    {"frame": 5, "visual": "...", "caption_overlay": "call to action", "duration_seconds": 2}
  ],
  "hashtags": ["array of 8-12 hashtags appropriate for cluster's platform behavior"],
  "whatsapp_message": "Short WhatsApp broadcast message — 2-3 lines, action-driven, in cluster's preferred language",
  "posting_time": "Best day + time in cluster's local timezone, e.g., 'Saturday 11am GMT'",
  "channel_recommendation": "Top platform recommendation with reasoning, e.g., 'Instagram Reels — 72% engagement weight in this cluster'",
  "predicted_reach_min": estimated lower bound number,
  "predicted_reach_max": estimated upper bound number,
  "predicted_engagement_min": decimal like 0.025,
  "predicted_engagement_max": decimal like 0.045,
  "reasoning_trace": "2-3 sentences explaining the predicted outcome based on cluster baseline engagement, brand voice strength, and product-cluster fit. Be honest about what's a confident prediction vs. a range with uncertainty."
}

Predictions must be calculated:
- predicted_reach: Use cluster's estimated_size × engagement_rate × visibility_factor (typically 0.05-0.15 of size for organic posts)
- predicted_engagement: Center around cluster's typical_engagement_rate, vary by ±std_dev
- Adjust by brand_voice_strength (0.81 strong = +20%, 0.5 weak = -30%)`;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { brandVoiceId, productDescription, clusterIds } = body;

    // Validation
    if (!brandVoiceId || !productDescription) {
      return NextResponse.json(
        { error: "brandVoiceId and productDescription required" },
        { status: 400 }
      );
    }

    if (!Array.isArray(clusterIds) || clusterIds.length === 0) {
      return NextResponse.json(
        { error: "clusterIds array required" },
        { status: 400 }
      );
    }

    if (clusterIds.length > 5) {
      return NextResponse.json(
        { error: "Maximum 5 clusters per generation" },
        { status: 400 }
      );
    }

    // Fetch brand voice
    const { data: brandVoiceRow, error: voiceError } = await supabaseAdmin
      .from("brand_voices")
      .select("id, voice_profile, voice_strength_score")
      .eq("id", brandVoiceId)
      .single();

    if (voiceError || !brandVoiceRow) {
      return NextResponse.json(
        { error: "Brand voice not found" },
        { status: 404 }
      );
    }

    const profile = brandVoiceRow.voice_profile as BrandVoiceProfile;
    const voiceStrength = brandVoiceRow.voice_strength_score;

    // Fetch all selected clusters
    const { data: clusters, error: clustersError } = await supabaseAdmin
      .from("clusters")
      .select("*")
      .in("id", clusterIds);

    if (clustersError || !clusters) {
      return NextResponse.json(
        { error: "Failed to fetch clusters: " + clustersError?.message },
        { status: 500 }
      );
    }

    if (clusters.length === 0) {
      return NextResponse.json(
        { error: "No matching clusters found" },
        { status: 404 }
      );
    }

    // Generate campaigns in parallel for speed
    const campaignPromises = clusters.map(async (cluster: Cluster) => {
      const fullPrompt = `${GENERATION_PROMPT}

BRAND VOICE PROFILE:
${JSON.stringify(profile, null, 2)}

BRAND VOICE STRENGTH: ${voiceStrength}

PRODUCT DESCRIPTION:
${productDescription}

TARGET CLUSTER:
${JSON.stringify(cluster, null, 2)}`;

try {
    const llmResult = await callLLM({
      userPrompt: fullPrompt,
      jsonMode: true,
      temperature: 0.7,
      maxTokens: 6000,
    });
    const responseText = llmResult.text;
    const cleaned = responseText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const parsed = JSON.parse(cleaned);

        // Save to Supabase
        const { data: saved, error: saveError } = await supabaseAdmin
          .from("campaigns")
          .insert({
            brand_voice_id: brandVoiceId,
            cluster_id: cluster.id,
            product_description: productDescription,
            caption: parsed.caption,
            image_prompts: parsed.image_prompts,
            reels_storyboard: parsed.reels_storyboard,
            hashtags: parsed.hashtags,
            whatsapp_message: parsed.whatsapp_message,
            posting_time: parsed.posting_time,
            channel_recommendation: parsed.channel_recommendation,
            predicted_reach_min: parsed.predicted_reach_min,
            predicted_reach_max: parsed.predicted_reach_max,
            predicted_engagement_min: parsed.predicted_engagement_min,
            predicted_engagement_max: parsed.predicted_engagement_max,
            reasoning_trace: parsed.reasoning_trace,
            generated_by: `${llmResult.provider}/${llmResult.model}`,
          })
          .select()
          .single();

        if (saveError) {
          console.error("Campaign save error:", saveError);
          // Continue even if save fails — return campaign data anyway
        }

        return {
          cluster,
          campaign: parsed,
          campaignId: saved?.id || null,
          success: true,
        };
      } catch (genError: any) {
        console.error(`Generation failed for cluster ${cluster.id}:`, genError);
        return {
          cluster,
          campaign: null,
          campaignId: null,
          success: false,
          error: genError.message,
        };
      }
    });

    const results = await Promise.all(campaignPromises);

    return NextResponse.json({
      success: true,
      campaigns: results,
    });
  } catch (error: any) {
    console.error("Generate campaign error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}