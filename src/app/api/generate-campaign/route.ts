import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { callLLM } from "@/lib/llm";
import type { Cluster, BrandVoiceProfile } from "@/lib/types";
import { summarizeForGeneration, logSignals } from "@/lib/signals";

const GENERATION_PROMPT = `You generate a complete marketing campaign for ONE market cluster. The campaign must sound like THIS SPECIFIC BRAND speaking to THIS SPECIFIC MARKET about THIS SPECIFIC PRODUCT.

Two forces shape every line, equally:
1. BRAND VOICE — the brand's signature words, tone, emoji density, sentence rhythm, language mix. The caption must sound like the same person who wrote the brand's own captions.
2. MARKET LOCALIZATION — the cluster's language style and emotional angle (defined below). Not translation — localize the EMOTION.

Blend both. A premium-restrained brand selling to Dhaka professionals = polished Banglish in that brand's restrained tone. The same brand to Gulf diaspora = nostalgia/gifting framing, still in the brand's voice.

-----------------------------------
RULE 1: BE PRODUCT-SPECIFIC (most important)
-----------------------------------

The caption and every output MUST reference CONCRETE attributes of the actual product — its color, material, craft, price point, occasion, limited-ness. Pull real details from the product description.

If the product is "hand-stitched emerald silk panjabi, Eid 2026, limited edition, ৳6,500" then the caption must evoke emerald silk, hand embroidery, Eid evenings, ৳6,500-tier value — NOT generic fashion language.

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

Use the cluster's LANGUAGE_STYLE (provided in the cluster data) to set tone:
- Dhaka professionals → polished Banglish (English-led, natural Bangla accents), confident, modern
- Chittagong → warmer, community/family tone, relational
- Sylhet / Khulna / Barisal / mid-tier → simpler, occasion-focused Bangla, direct and clear
- Mobile-first / students → casual, short, energetic, internet-native
- Diaspora (London, Toronto, NYC, Dubai, Sydney, KL, Doha, Riyadh) → nostalgia + gifting + home-connection. The emotional hook is "a piece of home," sending to family, celebrating heritage abroad.

If the Bangla feels machine-translated or awkward, rewrite it. Natural code-switching only — the way real bilingual Bangladeshis actually write captions. Awkward Bangla destroys credibility.

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
- Casualwear (tees, basics, everyday fits) → daily wear, campus, hangouts, coffee runs, layering, lifestyle, drop culture, low-pressure gifting. Do NOT force Eid/wedding/festive framing onto a basic tee. (Light Eid *gifting* is okay; formal Eid *wear* is not.)
- Premium ethnicwear (silk, embroidered, festive sets) → Eid, wedding, family gatherings, gifting — festive framing IS appropriate here.
- Food → cravings, freshness, hot delivery, group/family sharing, office lunch, evening snacks, late-night orders, combo value.
- Skincare/Beauty → the specific skin concern, ingredients, routine fit, before/after proof, reviews/trust.
- Electronics → specs, performance, battery, reliability, warranty, compatibility, everyday/work/gaming use.
- Home/Books/Services → use the product's real function; never invent a festive occasion that doesn't fit.

If CUSTOMER_CARES are provided, the angle MUST speak to them concretely. E.g. pizza with [Taste, Hot delivery, Combo deals, Family sharing] → an angle like "Friday-night combo, hot to your door, made for sharing" — NOT "premium feel / occasion wear". Fashion with [Fit, Comfort, Trendy design] → oversized fit, breathable everyday comfort, campus/hangout styling.

-----------------------------------
RETURN ONLY THIS JSON (no markdown, no prose)
-----------------------------------

{
  "why_this_campaign": "ONE specific sentence: why THIS campaign works for THIS market — reference a concrete product attribute AND a specific market behavior/price reality. E.g. 'Emerald silk and hand embroidery at ৳6,500 fit Dhaka professionals who want premium Eid wear without luxury-brand pricing.' NO generic phrases.",
  "caption": "Main caption. Product-specific (concrete attributes), brand voice + market localization blended. Match brand language mix + emoji density + sentence length. Reference the cluster's occasion naturally.",
  "image_prompt": "ONE universal image prompt — scene-rich, brand aesthetic aware, references the actual product, 2 sentences. Reusable across Midjourney/DALL-E/Gemini.",
  "reels_storyboard": [
    {"frame": 1, "visual": "scene description featuring the actual product", "overlay": "on-screen text", "seconds": 3},
    {"frame": 2, "visual": "...", "overlay": "...", "seconds": 3},
    {"frame": 3, "visual": "...", "overlay": "call to action", "seconds": 3}
  ],
  "hashtags": ["8-10 hashtags appropriate for this product AND this cluster"],
  "whatsapp_message": "2-3 line broadcast in cluster's language style, product-specific, action-driven",
  "posting_time": "Best day + time, e.g. 'Friday 8-10 PM BDT'",
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
3. Does the Bangla read naturally (not machine-translated)?
4. Does it sound like the brand's voice AND localize the market emotion?
5. Does why_this_campaign name a concrete product attribute AND a market reality?
6. Is the occasion framing right for the CATEGORY? (No forced Eid/festive on basic casualwear. Food = cravings/sharing/delivery. Skincare = concern/routine. Electronics = specs/performance.)
7. If CUSTOMER_CARES were given, does the angle actually speak to them?
Begin.`;

// Per-market language style hint — sent with each cluster so the LLM localizes emotion, not just words.
function languageStyleFor(c: Cluster): string {
  const city = (c.city || "").toLowerCase();
  const type = (c.segment_type || "").toLowerCase();
  const id = (c.id || "").toLowerCase();

  if (type === "diaspora") {
    return "Diaspora: nostalgia + gifting + home-connection. Emotional hook = a piece of home, sending to family, celebrating heritage abroad. Banglish or English with warm Bangla accents.";
  }
  if (city.includes("dhaka") && id.includes("professional")) {
    return "Dhaka professionals: polished Banglish, English-led with natural Bangla, confident and modern.";
  }
  if (city.includes("dhaka") && id.includes("student")) {
    return "Dhaka students: casual, short, energetic, internet-native, heavy code-switching.";
  }
  if (city.includes("chittagong") || city.includes("chattogram")) {
    return "Chittagong: warmer, community and family tone, relational, occasion-aware.";
  }
  if (id.includes("mobile_first")) {
    return "Mobile-first Tier 2/3: casual, short, energetic, simple Bangla-led, very direct.";
  }
  if (id.includes("midtier") || city.includes("sylhet") || city.includes("khulna") || city.includes("barisal") || city.includes("rajshahi")) {
    return "Mid-tier urban (Sylhet/Khulna/Barisal/Rajshahi): simpler, occasion-focused Bangla, direct and clear.";
  }
  return "Local Bangladesh: natural Bangla-English code-switching, occasion-aware, clear and warm.";
}

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

    // STAGE 5: campaign intent — a THIS-CAMPAIGN-ONLY tone nudge that never
    // overwrites the permanent brand DNA.
    const INTENT_NUDGE: Record<string, string> = {
      "Everyday": "Everyday intent: keep the brand's normal tone, no added urgency.",
      "Festive push": "Festive intent: lean into the occasion warmly; a little more energy is okay, but stay in brand voice.",
      "Limited drop": "Limited-drop intent: soft scarcity is allowed (e.g. 'limited pieces'), never hard hype.",
      "Sale": "Sale intent: a clear value/offer mention is allowed, but keep it tasteful and on-brand — no 'HURRY!!!'.",
    };
    const intentParts: string[] = [];
    if (campaignIntent && INTENT_NUDGE[campaignIntent]) intentParts.push(INTENT_NUDGE[campaignIntent]);
    if (campaignGoal && typeof campaignGoal === "string" && campaignGoal.trim()) {
      intentParts.push(`Campaign goal for this run: ${campaignGoal.trim()}.`);
    }
    const intentBlock = intentParts.length
      ? `\nCAMPAIGN INTENT (applies to THIS campaign only — do NOT permanently change the brand voice):\n${intentParts.join(" ")}`
      : "";

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

    const generateForCluster = async (cluster: Cluster) => {
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

      const fullPrompt = `${GENERATION_PROMPT}

BRAND VOICE:
${JSON.stringify(compactVoice)}

BRAND VOICE STRENGTH: ${voiceStrength}${rulebookBlock}${categoryBlock}${historyContext ? `\n\n${historyContext}` : ""}${intentBlock}

PRODUCT:
${productDescription}

CLUSTER (note language_style — localize the emotional angle accordingly):
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