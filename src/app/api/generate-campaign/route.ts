import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { callLLM } from "@/lib/llm";
import type { Cluster, BrandVoiceProfile } from "@/lib/types";

const GENERATION_PROMPT = `You generate a complete marketing campaign for ONE cluster in the brand's exact voice.

Rules:
- Match brand voice exactly: signature words, tone, emoji density, language mix (English/Bangla code-switching if present)
- Honor cluster: use its currency, language, peak shopping window, and primary occasions
- Avoid anything in the brand's "never" list

Return ONLY this JSON (no markdown, no prose):

{
  "caption": "Main caption. Match brand language mix + emoji density + sentence length. Reference cluster occasion if relevant.",
  "image_prompt": "ONE universal image prompt — scene-rich, brand aesthetic aware, 2 sentences. Reusable across Midjourney/DALL-E/Gemini.",
  "reels_storyboard": [
    {"frame": 1, "visual": "scene description", "overlay": "on-screen text", "seconds": 3},
    {"frame": 2, "visual": "...", "overlay": "...", "seconds": 3},
    {"frame": 3, "visual": "...", "overlay": "call to action", "seconds": 3}
  ],
  "hashtags": ["8-10 hashtags appropriate for this cluster"],
  "whatsapp_message": "2-3 line broadcast in cluster's language, action-driven",
  "posting_time": "Best day + time, e.g. 'Friday 8-10 PM BDT'",
  "channel_recommendation": "Platform name with one short benefit line. E.g. 'Instagram — visual-first audience' or 'WhatsApp — they buy in DMs'",
  "predicted_reach_min": number,
  "predicted_reach_max": number,
  "predicted_engagement_min": decimal e.g. 0.025,
  "predicted_engagement_max": decimal e.g. 0.045
}

Predictions: use cluster size × cluster's typical_engagement_rate × visibility (0.05-0.15). Adjust by brand_voice_strength (high = +20%, low = -30%).`;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function callLLMWithRetry(args: Parameters<typeof callLLM>[0]) {
  try {
    return await callLLM(args);
  } catch (error: any) {
    const msg = String(error?.message || error);
    const isRateLimit = msg.includes("429") || msg.includes("rate_limit");
    if (isRateLimit) {
      await sleep(4000);
      return await callLLM(args);
    }
    throw error;
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { brandVoiceId, productDescription, clusterIds } = body;

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

    const { data: brandVoiceRow, error: voiceError } = await supabaseAdmin
      .from("brand_voices")
      .select("id, voice_profile, voice_strength_score")
      .eq("id", brandVoiceId)
      .single();

    if (voiceError || !brandVoiceRow) {
      return NextResponse.json({ error: "Brand voice not found" }, { status: 404 });
    }

    const profile = brandVoiceRow.voice_profile as BrandVoiceProfile;
    const voiceStrength = brandVoiceRow.voice_strength_score;

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
      return NextResponse.json({ error: "No matching clusters found" }, { status: 404 });
    }

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

    // Compact cluster — only fields needed for cultural-fit content
    const compactCluster = (c: Cluster) => ({
      city: c.city,
      country: c.country,
      age: c.age_band,
      size: c.estimated_size,
      occasions: c.primary_occasions,
      currency: c.currency,
      aov: `${c.avg_order_value_min}-${c.avg_order_value_max}`,
      language_mix: c.language_mix,
      typical_engagement_rate: c.typical_engagement_rate,
      aesthetic: c.aesthetic_preference,
      peak: Array.isArray(c.peak_shopping_windows) && c.peak_shopping_windows[0]
        ? `${c.peak_shopping_windows[0].day} ${c.peak_shopping_windows[0].hours}`
        : "—",
    });

    const generateForCluster = async (cluster: Cluster) => {
      const fullPrompt = `${GENERATION_PROMPT}

BRAND VOICE:
${JSON.stringify(compactVoice)}

BRAND VOICE STRENGTH: ${voiceStrength}

PRODUCT:
${productDescription}

CLUSTER:
${JSON.stringify(compactCluster(cluster))}`;

      try {
        const llmResult = await callLLMWithRetry({
          userPrompt: fullPrompt,
          jsonMode: true,
          temperature: 0.7,
          maxTokens: 2500,
        });
        const responseText = llmResult.text;
        const cleaned = responseText
          .replace(/```json\n?/g, "")
          .replace(/```\n?/g, "")
          .trim();
        const parsed = JSON.parse(cleaned);

        // Normalize back to the schema your frontend expects
        // (frontend expects image_prompts.gemini/midjourney/dalle as 3 separate strings — we mirror the universal one)
        const universalPrompt = parsed.image_prompt || parsed.image_prompts?.gemini || "";
        const normalizedImagePrompts = {
          gemini: universalPrompt,
          midjourney: universalPrompt + " --ar 4:5 --style raw --v 6",
          dalle: universalPrompt,
        };

        // Normalize storyboard (new key 'seconds' → frontend key 'duration_seconds', 'overlay' → 'caption_overlay')
        const normalizedStoryboard = (parsed.reels_storyboard || []).map((f: any) => ({
          frame: f.frame,
          visual: f.visual,
          caption_overlay: f.caption_overlay || f.overlay || "",
          duration_seconds: f.duration_seconds || f.seconds || 3,
        }));

        const finalCampaign = {
          caption: parsed.caption,
          image_prompts: normalizedImagePrompts,
          reels_storyboard: normalizedStoryboard,
          hashtags: parsed.hashtags || [],
          whatsapp_message: parsed.whatsapp_message,
          posting_time: parsed.posting_time,
          channel_recommendation: parsed.channel_recommendation,
          predicted_reach_min: parsed.predicted_reach_min,
          predicted_reach_max: parsed.predicted_reach_max,
          predicted_engagement_min: parsed.predicted_engagement_min,
          predicted_engagement_max: parsed.predicted_engagement_max,
          reasoning_trace: "", // intentionally empty — we removed the paragraph
        };

        const { data: saved } = await supabaseAdmin
          .from("campaigns")
          .insert({
            brand_voice_id: brandVoiceId,
            cluster_id: cluster.id,
            product_description: productDescription,
            ...finalCampaign,
            generated_by: `${llmResult.provider}/${llmResult.model}`,
          })
          .select()
          .single();

        return {
          cluster,
          campaign: finalCampaign,
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
    };

    const results = [];
    for (let i = 0; i < clusters.length; i++) {
      if (i > 0) await sleep(700);
      const result = await generateForCluster(clusters[i]);
      results.push(result);
    }

    return NextResponse.json({ success: true, campaigns: results });
  } catch (error: any) {
    console.error("Generate campaign error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}