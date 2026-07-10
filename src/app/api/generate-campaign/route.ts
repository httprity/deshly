import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { callLLM } from "@/lib/llm";
import type { Cluster, BrandVoiceProfile } from "@/lib/types";
import { summarizeForGeneration, logSignals } from "@/lib/signals";
import { buildFullPrompt } from "@/lib/campaign-prompt";

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

const BRAND_CHECK_FLAG =
  "Some content may not match your brand rules — review before publishing.";

// FLAW 3 — brand-compliance validator. A second LLM pass checks generated copy
// against the brand's neverRules and returns ONLY the violated rule strings.
// Fail-open: any error returns [] (never blocks delivery). The spec calls for a
// "Claude API call"; this project routes all LLM calls through the multi-provider
// callLLM chain (Groq → Together → Gemini → Ollama), so we use that here.
const VALIDATOR_SYSTEM = `You are a brand compliance checker. You will be given brand rules and a piece of generated marketing copy. Your job is to identify any rules that are violated. Return ONLY a valid JSON array of violated rule strings. If no rules are violated, return an empty array: []. Do not explain. Do not add any text outside the JSON array.`;

async function validateAgainstBrandRules(
  neverRules: string[],
  generatedOutput: string
): Promise<string[]> {
  if (!neverRules.length || !generatedOutput.trim()) return [];
  try {
    const res = await callLLM({
      systemPrompt: VALIDATOR_SYSTEM,
      userPrompt: `Brand rules (things this brand must never do):\n${neverRules
        .map((r) => `- ${r}`)
        .join("\n")}\n\nGenerated copy to check:\n${generatedOutput}`,
      jsonMode: true,
      temperature: 0,
      maxTokens: 500,
    });
    const cleaned = res.text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    // jsonMode may wrap the array as { "violations": [...] } or { "result": [...] };
    // accept a bare array or the first array-valued property.
    const parsed = JSON.parse(cleaned);
    if (Array.isArray(parsed)) return parsed.filter((x) => typeof x === "string" && x.trim());
    if (parsed && typeof parsed === "object") {
      const firstArray = Object.values(parsed).find((v) => Array.isArray(v));
      if (Array.isArray(firstArray)) return firstArray.filter((x) => typeof x === "string" && x.trim());
    }
    return [];
  } catch {
    // Fail-open — validation must never block campaign delivery.
    return [];
  }
}

// Best-effort log of a validation failure for future debugging. Fail-open.
async function logRuleViolation(row: {
  brandVoiceId: string;
  clusterId: string;
  productDescription: string;
  violatedRules: string[];
  generatedCopy: string;
}) {
  try {
    await supabaseAdmin.from("brand_rule_violations").insert({
      brand_voice_id: row.brandVoiceId,
      cluster_id: row.clusterId,
      product_description: row.productDescription,
      violated_rules: row.violatedRules,
      generated_copy: row.generatedCopy,
    });
  } catch {
    // table may not exist yet / write failed — never fatal.
  }
}

function parseCampaignJson(text: string): any {
  const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
  return JSON.parse(cleaned);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      brandVoiceId,
      productDescription,
      clusterIds,
      campaignIntent,
      campaignGoal,
      personalize,
      brandHandle,
      productCategory,
      customerCares,
      productIntelligence,
      extractedIntelligence,
      userEdited,
      brandName,
      avoid,
      audienceReasoning,
    } = body;

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

    // FLAW 3 — the brand's enforceable "never" rules: profile never-list +
    // explicit dont_rules + any per-request avoid terms. Drives the validator.
    const vpAny = (profile || {}) as unknown as Record<string, unknown>;
    const neverRules: string[] = [
      ...(Array.isArray(vpAny.they_never) ? (vpAny.they_never as string[]) : []),
      ...(Array.isArray(vpAny.dont_rules) ? (vpAny.dont_rules as string[]) : []),
      ...(Array.isArray(avoid) ? (avoid as string[]) : []),
    ]
      .map((r) => String(r).trim())
      .filter(Boolean);

    // FLAW 5 — persist the confirmed (user-edited) ProductIntelligence alongside
    // the raw extraction for audit/logging. Best-effort, fail-open (the table may
    // not exist yet). The confirmed object is what actually drives generation.
    if (productIntelligence) {
      try {
        await supabaseAdmin.from("product_intelligence").insert({
          brand_voice_id: brandVoiceId,
          product_description: productDescription,
          confirmed_intelligence: productIntelligence,
          extracted_intelligence: extractedIntelligence || null,
          user_edited: Boolean(userEdited),
        });
      } catch {
        // logging table missing / write failed — never block generation.
      }
    }

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

    // STAGE 6: adaptation loop — if personalize is on, read this brand's
    // accumulated signal history and feed it as soft guidance. Honest: only
    // returns content when there's real history; otherwise empty string.
    let historyContext = "";
    if (personalize) {
      historyContext = await summarizeForGeneration(brandVoiceId);
    }

    const generateForCluster = async (cluster: Cluster) => {
      // --- cache: return saved campaign for identical inputs (instant demo) ---
      try {
        const { data: cachedCampaign } = await supabaseAdmin
          .from("campaigns")
          .select("*")
          .eq("brand_voice_id", brandVoiceId)
          .eq("cluster_id", cluster.id)
          .eq("product_description", productDescription)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (cachedCampaign) {
          return {
            cluster,
            campaign: {
              why_this_campaign: cachedCampaign.why_this_campaign || "",
              caption: cachedCampaign.caption,
              image_prompts: cachedCampaign.image_prompts,
              reels_storyboard: cachedCampaign.reels_storyboard,
              hashtags: cachedCampaign.hashtags || [],
              whatsapp_message: cachedCampaign.whatsapp_message,
              posting_time: cachedCampaign.posting_time,
              channel_recommendation: cachedCampaign.channel_recommendation,
              predicted_reach_min: cachedCampaign.predicted_reach_min,
              predicted_reach_max: cachedCampaign.predicted_reach_max,
              predicted_engagement_min: cachedCampaign.predicted_engagement_min,
              predicted_engagement_max: cachedCampaign.predicted_engagement_max,
              reasoning_trace: cachedCampaign.reasoning_trace || "",
            },
            campaignId: cachedCampaign.id,
            success: true,
          };
        }
      } catch {
        // cache miss or error — fall through to live generation
      }
      // --- end cache ---
      const fullPrompt = buildFullPrompt({
        profile,
        voiceStrength,
        cluster,
        productDescription,
        campaignIntent,
        campaignGoal,
        productCategory,
        customerCares,
        historyContext,
        productIntelligence,
        brandName,
        avoid: Array.isArray(avoid) ? avoid : undefined,
        // Phase 1 — thread the per-cluster audience reasoning into the prompt so
        // each audience produces a visibly different campaign. The frontend
        // sends one cluster at a time; we still guard on cluster_id so a
        // multi-cluster caller can't leak one audience's reasoning onto another.
        audienceReasoning:
          audienceReasoning &&
          (!audienceReasoning.cluster_id || audienceReasoning.cluster_id === cluster.id)
            ? audienceReasoning
            : undefined,
      });

      try {
        let llmResult = await callLLMWithRetry({
          userPrompt: fullPrompt,
          jsonMode: true,
          temperature: 0.7,
          maxTokens: 2500,
        });
        let parsed = parseCampaignJson(llmResult.text);

        // FLAW 3 — validate generated copy against neverRules. On violation,
        // regenerate ONCE with an explicit correction instruction; if the second
        // attempt still violates, deliver with a visible flag (never block).
        let brandCheckFlag: string | undefined;
        if (neverRules.length) {
          const copyOf = (p: any) =>
            [p?.caption, p?.whatsapp_message, ...(Array.isArray(p?.hashtags) ? p.hashtags : [])]
              .filter(Boolean)
              .join("\n");
          let violations = await validateAgainstBrandRules(neverRules, copyOf(parsed));
          if (violations.length) {
            const retryPrompt = `${fullPrompt}\n\nThe following brand rules were violated in your previous response. Regenerate the output ensuring none of these rules are broken: ${violations.join(
              "; "
            )}`;
            try {
              const retryResult = await callLLMWithRetry({
                userPrompt: retryPrompt,
                jsonMode: true,
                temperature: 0.7,
                maxTokens: 2500,
              });
              const retryParsed = parseCampaignJson(retryResult.text);
              // Prefer the corrected attempt and re-check it.
              llmResult = retryResult;
              parsed = retryParsed;
              violations = await validateAgainstBrandRules(neverRules, copyOf(retryParsed));
            } catch {
              // retry failed to produce parseable output — keep first attempt.
            }
            if (violations.length) {
              brandCheckFlag = BRAND_CHECK_FLAG;
              logRuleViolation({
                brandVoiceId,
                clusterId: cluster.id,
                productDescription,
                violatedRules: violations,
                generatedCopy: copyOf(parsed),
              });
            }
          }
        }

        // Normalize back to the schema your frontend expects
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
          why_this_campaign: parsed.why_this_campaign || "",
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
            why_this_campaign: finalCampaign.why_this_campaign,
            caption: finalCampaign.caption,
            image_prompts: finalCampaign.image_prompts,
            reels_storyboard: finalCampaign.reels_storyboard,
            hashtags: finalCampaign.hashtags,
            whatsapp_message: finalCampaign.whatsapp_message,
            posting_time: finalCampaign.posting_time,
            channel_recommendation: finalCampaign.channel_recommendation,
            predicted_reach_min: finalCampaign.predicted_reach_min,
            predicted_reach_max: finalCampaign.predicted_reach_max,
            predicted_engagement_min: finalCampaign.predicted_engagement_min,
            predicted_engagement_max: finalCampaign.predicted_engagement_max,
            reasoning_trace: finalCampaign.reasoning_trace,
            generated_by: `${llmResult.provider}/${llmResult.model}`,
          })
          .select()
          .single();

        return {
          cluster,
          campaign: finalCampaign,
          campaignId: saved?.id || null,
          success: true,
          brand_check_flag: brandCheckFlag,
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