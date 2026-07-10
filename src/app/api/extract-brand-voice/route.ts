import { NextRequest, NextResponse } from "next/server";
import { callLLM, generateEmbedding } from "@/lib/llm";
import { supabaseAdmin } from "@/lib/supabase";
import { generateBrandHandle } from "@/lib/signals";
import type { BrandVoiceProfile } from "@/lib/types";

const EXTRACTION_PROMPT = `
You are Deshly.

You read a brand's captions and figure out how they naturally sound online.

Your job is NOT to make the brand sound cooler, deeper, smarter, more poetic, or more premium than it actually is.

Your job is to notice:

* how they talk
* what they repeat
* how they treat followers
* what kind of personality keeps showing up
* what makes them different from similar brands

The founder reading this should feel:
"Yeah... this actually sounds like us."

---

## VERY IMPORTANT

Even if two brands are in the same category, they should NOT sound the same.

Two Gen-Z fashion brands are still different.

One may sound:

* chaotic and impulsive
* mysterious and detached
* soft and emotional
* loud and internet-brained
* minimal and dry
* flirty and sarcastic
* older-sibling coded
* Tumblr-coded
* rich-kid coded
* Dhaka-local coded
* extremely online
* emotionally vulnerable
* emotionally unavailable

Your job is to find THAT difference.

Do NOT collapse brands into category stereotypes.

Bad analysis:
"Gen-Z fashion brand using trendy language."

Good analysis:
"Uses short lowercase sentences and talks like the reader already understands the joke."

Bad analysis:
"Friendly skincare brand."

Good analysis:
"Sounds more like a brutally honest friend than a skincare company."

---

## DO NOT USE GENERIC WORDS

Avoid vague words like:

* trendy
* authentic
* bold
* creative
* premium
* aesthetic
* vibrant
* innovative
* modern
* confident
* elevated

These words are lazy and could describe anything.

Be more specific.

Instead of:
"confident"

say:
"writes like they already know you'll agree"

Instead of:
"playful"

say:
"makes jokes in the middle of product explanations"

---

RETURN ONLY VALID JSON
NO MARKDOWN
NO EXPLANATION
--------------

{
"voice_strength": {
"score": 0-100,
"explanation": "One short sentence explaining WHY the voice feels recognizable."
},

"brand_personality": {
"traits": [
"3-5 very specific personality observations"
],
"summary": "One sentence describing how the brand comes across online."
},

"how_they_talk": {
"style": "Describe sentence style, emoji habits, language mix, slang, punctuation, caption rhythm, or recurring writing patterns.",
"feeling": "Describe how the captions make the reader feel."
},

"words_they_repeat": [
"5-8 exact repeated words or phrases from the captions"
],

"what_they_care_about": [
"4-6 recurring priorities, beliefs, or themes"
],

"their_brand_vibe": {
"identity": "A short clear label describing the brand's overall identity.",
"audience_relationship": "Describe how the brand talks to followers."
},

"they_never": [
"3 things the brand avoids doing in their communication"
],

"voice_style": {
"tone": ["2-4 specific tone words observed in the captions"],
"energy_level": "low | low-medium | medium | medium-high | high",
"formality": "casual | semi-formal | polished | formal",
"language_mix": "Describe the English/Bangla/Banglish balance you actually see, e.g. 'mostly English with occasional Bangla warmth'",
"emoji_usage": "none | rare | moderate | heavy",
"urgency_style": "Describe how (or whether) they push urgency, e.g. 'soft scarcity, never aggressive'"
},

"product_framing": {
"usual_angle": "How this brand frames products: style upgrade / gift / occasion piece / comfort essential / status symbol / cultural item / limited drop / everyday practical / premium investment",
"occasion_signals": ["occasions the brand leans on, if any"],
"price_positioning": "budget | mid-range | premium | luxury (as implied by tone, not actual price)"
},

"conversion_style": {
"cta_style": "soft | direct | mixed",
"urgency_level": "none | low | medium | high",
"preferred_ctas": ["2-4 CTA phrases that fit this brand, e.g. 'DM to order', 'available now', 'limited pieces'"]
},

"brand_maturity": "beginner | growing | premium boutique | established | luxury",

"trust_requirements": [
"2-4 concrete things this brand should emphasize to build buyer trust, e.g. 'show fabric closeups', 'mention hand embroidery', 'clarify delivery timeline'"
],

"dont_rules": [
"3-5 concrete writing rules the generator must NOT break, derived from this brand, e.g. 'Do not use hype words like fire or must-have', 'Max one emoji', 'Never sound discount-heavy'"
],

"generation_instructions": {
"caption_instruction": "A direct, ready-to-use instruction telling the next AI exactly how to write captions for THIS brand. Specific. E.g. 'Write in calm premium Banglish, short elegant lines, lead with occasion and craftsmanship, keep urgency soft, max one emoji.'",
"whatsapp_instruction": "Ready-to-use instruction for WhatsApp messages in this brand's voice.",
"image_prompt_instruction": "Ready-to-use instruction for image prompts matching this brand's aesthetic.",
"diaspora_adaptation_instruction": "Ready-to-use instruction for how to adapt this brand's voice for diaspora audiences (nostalgia/gifting/home-connection) WITHOUT breaking the brand's core tone."
}
}

---

## SCORING GUIDE

0-30:
Very generic captions.
Could belong to almost any brand.

31-50:
Some personality exists, but still feels common for the category.

51-70:
Noticeable habits, tone, or recurring communication patterns.

71-85:
Very recognizable voice with clear signature behavior.

86-100:
The captions feel instantly identifiable even without the logo.

Most brands should fall between 45-75.
Do NOT default to 80+.

---

## IMPORTANT

Use observations from the captions.

Do NOT invent personality traits that are not visible.

Do NOT make every brand sound poetic.

Do NOT make every brand sound emotionally deep.

Do NOT use the same structure repeatedly.

For the new fields (voice_style, product_framing, conversion_style, brand_maturity, trust_requirements, dont_rules, generation_instructions): derive them from what the captions actually show. The generation_instructions especially must be concrete and ready for another AI to follow directly — not vague labels.

Avoid repeating:

* "sounds like your friend"
* "cool cousin"
* "insider"
* "stylish girl"
* "bestie"
  unless the captions ACTUALLY sound like that.

The goal is specificity, not performance.

---

## THE CAPTIONS START BELOW

`;



export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { captions, brandName } = body;

    // Input validation
    if (!captions || typeof captions !== "string") {
      return NextResponse.json(
        { error: "captions field required as string" },
        { status: 400 }
      );
    }

    if (captions.length < 100) {
      return NextResponse.json(
        { error: "Please provide at least 10 substantial captions (min 100 characters total)" },
        { status: 400 }
      );
    }

    if (captions.length > 20000) {
      return NextResponse.json(
        { error: "Captions too long. Please limit to ~10 captions." },
        { status: 400 }
      );
    }
    // --- idempotency: reuse existing voice for identical captions (instant demo) ---
    try {
      const { data: existingVoice } = await supabaseAdmin
        .from("brand_voices")
        .select("id, brand_id, voice_profile, voice_strength_score")
        .eq("raw_captions", captions)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (existingVoice) {
        const { data: brandRow } = await supabaseAdmin
          .from("brands")
          .select("name")
          .eq("id", existingVoice.brand_id)
          .maybeSingle();
        return NextResponse.json({
          success: true,
          brandVoiceId: existingVoice.id,
          brandId: existingVoice.brand_id,
          brandName: brandRow?.name || brandName?.trim() || "Untitled Brand",
          profile: existingVoice.voice_profile,
          voiceStrength: existingVoice.voice_strength_score,
        });
      }
    } catch {
      // no cached voice — fall through to live extraction
    }
    // --- end idempotency ---
    // Build the full prompt
    const fullPrompt = EXTRACTION_PROMPT + captions;
      
    // Call LLM with fallback chain (Groq → Together → Gemini → Ollama)
    const llmResult = await callLLM({
      
      userPrompt: fullPrompt,
      jsonMode: true,
      temperature: 0.35,
      maxTokens: 5000,
    });
    const responseText = llmResult.text;
    const usedProvider = `${llmResult.provider}/${llmResult.model}`;

    // Parse JSON response (some providers wrap in markdown despite jsonMode)
    let profile: BrandVoiceProfile;
    try {
      const cleaned = responseText
        .replace(/```json\n?/g, "")
        .replace(/```\n?/g, "")
        .trim();
      profile = JSON.parse(cleaned);
    } catch (parseError) {
      console.error("Failed to parse LLM response:", responseText);
      return NextResponse.json(
        { error: "Failed to parse brand voice. Please try again with different captions." },
        { status: 500 }
      );
    }

    // Validate the parsed profile has the expected shape.
    // NOTE: only the ORIGINAL fields are required — the new rulebook layers
    // are optional, so an older/partial LLM response can never break extraction.
    if (
      !profile.voice_strength ||
      !profile.brand_personality ||
      !profile.how_they_talk ||
      !Array.isArray(profile.words_they_repeat) ||
      !Array.isArray(profile.what_they_care_about) ||
      !profile.their_brand_vibe ||
      !Array.isArray(profile.they_never)
    ) {
      console.error("Profile missing required fields:", profile);
      return NextResponse.json(
        { error: "Generated profile is incomplete. Please try again." },
        { status: 500 }
      );
    }

    // Generate vector embedding for hybrid RAG later
    // Combine the most semantically rich fields into one string
    const embeddingText = [
      profile.their_brand_vibe.identity,
      profile.brand_personality.summary,
      profile.brand_personality.traits.join(" "),
      profile.how_they_talk.style,
      profile.how_they_talk.feeling,
      profile.words_they_repeat.join(" "),
      profile.what_they_care_about.join(" "),
    ]
      .filter(Boolean)
      .join(" · ");

    let embedding: number[] | null = null;
    try {
      embedding = await generateEmbedding(embeddingText);
    } catch (embedError) {
      console.warn("Embedding failed, continuing without:", embedError);
    }

    // Normalize voice strength score to 0-1 for database storage
    // (DB expects numeric in 0-1 range; new prompt returns 0-100)
    const normalizedScore = Math.max(0, Math.min(1, profile.voice_strength.score / 100));

    // Save brand record
    const safeBrandName = brandName?.trim() || "Untitled Brand";
    const { data: brand, error: brandError } = await supabaseAdmin
      .from("brands")
      .insert({ name: safeBrandName })
      .select()
      .single();

    if (brandError) {
      console.error("Brand insert error:", brandError);
      return NextResponse.json(
        { error: "Database error: " + brandError.message },
        { status: 500 }
      );
    }

    // Generate a durable, shareable brand handle (e.g. DESHLY-7K3Q)
    const brandHandle = await generateBrandHandle();

    // Save brand_voice record
    // The full profile (including the new rulebook layers) is stored in
    // voice_profile (jsonb), so no schema change is needed for the new fields.
    const { data: brandVoice, error: voiceError } = await supabaseAdmin
      .from("brand_voices")
      .insert({
        brand_id: brand.id,
        raw_captions: captions,
        voice_profile: profile,
        voice_strength_score: normalizedScore,
        embedding: embedding,
        extracted_by: usedProvider,
        brand_handle: brandHandle,
      })
      .select()
      .single();

    if (voiceError) {
      console.error("Voice insert error:", voiceError);
      return NextResponse.json(
        { error: "Database error: " + voiceError.message },
        { status: 500 }
      );
    }

    // --- idempotency: reuse existing voice for identical captions (instant demo) ---
    try {
      const { data: existingVoice } = await supabaseAdmin
        .from("brand_voices")
        .select("id, brand_id, voice_profile, brand_handle")
        .eq("raw_captions", captions)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (existingVoice) {
        const { data: brandRow } = await supabaseAdmin
          .from("brands")
          .select("name")
          .eq("id", existingVoice.brand_id)
          .maybeSingle();
        return NextResponse.json({
          success: true,
          brandVoiceId: existingVoice.id,
          brandId: existingVoice.brand_id,
          brandName: brandRow?.name || brandName?.trim() || "Untitled Brand",
          brandHandle: existingVoice.brand_handle,
          profile: existingVoice.voice_profile,
        });
      }
    } catch {
      // no cached voice — fall through to live extraction
    }
    // --- end idempotency ---
  } catch (error: any) {
    console.error("Extract brand voice error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}