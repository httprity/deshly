import { NextRequest, NextResponse } from "next/server";
import { callLLM, generateEmbedding } from "@/lib/llm";
import { supabaseAdmin } from "@/lib/supabase";
import type { BrandVoiceProfile } from "@/lib/types";


const EXTRACTION_PROMPT = `You are an expert brand strategist analyzing a Bangladeshi D2C brand's social media voice.

You will be given 10 Instagram/Facebook captions from a single brand. Your job is to extract a deeply structured "Brand DNA" profile that captures every dimension of how this brand communicates.

Return ONLY valid JSON matching this exact structure (no markdown, no explanation, just JSON):

{
  "voice": {
    "tone": ["array of 2-4 tone descriptors, e.g., 'warm', 'confident', 'playful', 'sophisticated'"],
    "formality_level": 1-5 (1=very casual, 5=very formal),
    "tone_descriptors": "one sentence describing the overall tonal personality"
  },
  "vocabulary": {
    "signature_words": ["5-8 distinctive words/phrases this brand uses repeatedly"],
    "avoided_words": ["3-5 words this brand notably never uses (inferred from absence)"],
    "preferred_phrases": ["3-5 recurring phrases or sentence patterns"]
  },
  "linguistic_patterns": {
    "avg_sentence_length": "short" | "short-medium" | "medium" | "medium-long" | "long",
    "uses_questions": true | false,
    "uses_exclamations": "low" | "moderate" | "high",
    "emoji_density": "none" | "low" | "low-medium" | "medium" | "high",
    "preferred_emojis": ["actual emoji characters used most, max 5"]
  },
  "language_mix": {
    "bangla_english_ratio": "estimated ratio like '60-40' or '40-60' or '100-0'",
    "code_switching_pattern": "describe when they switch languages, e.g., 'Bangla for emotional moments, English for product details'"
  },
  "cultural_register": {
    "religious_references": "description of how/when they reference religion/occasions, or 'none'",
    "regional_identity": "Dhaka-modern | Chittagong-traditional | Pan-Bangladesh | Diaspora-aware | etc",
    "formality_with_audience": "describe the relationship the brand assumes with reader, e.g., 'you-friend casual', 'you-customer respectful'"
  },
  "brand_themes": ["4-6 recurring thematic concerns, e.g., 'heritage', 'craftsmanship', 'family', 'modern-modesty'"],
  "things_brand_never_does": ["3-5 anti-patterns this brand avoids based on observable absence"],
  "voice_strength_score": 0.0-1.0 (1.0 = highly consistent and distinctive voice; 0.5 = generic)
}

Be precise. Every field must be filled with substantive analysis based on the actual captions. If a brand's voice is weak/generic, score it accordingly — don't inflate.

The captions follow:
---
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

    // Build the full prompt
    const fullPrompt = EXTRACTION_PROMPT + captions;

  // Call LLM with fallback chain (Groq → Together → Gemini)
  const llmResult = await callLLM({
    userPrompt: fullPrompt,
    jsonMode: true,
    temperature: 0.5,
    maxTokens: 4096,
  });
  const responseText = llmResult.text;
  const usedProvider = `${llmResult.provider}/${llmResult.model}`;

    // Parse JSON response (Gemini sometimes wraps in markdown despite responseMimeType)
    let profile: BrandVoiceProfile;
    try {
      const cleaned = responseText
        .replace(/```json\n?/g, "")
        .replace(/```\n?/g, "")
        .trim();
      profile = JSON.parse(cleaned);
    } catch (parseError) {
      console.error("Failed to parse Gemini response:", responseText);
      return NextResponse.json(
        { error: "Failed to parse brand voice. Please try again with different captions." },
        { status: 500 }
      );
    }

    // Generate vector embedding for hybrid RAG later
    const embeddingText = JSON.stringify(profile.voice) + " " +
      profile.brand_themes.join(" ") + " " +
      profile.vocabulary.signature_words.join(" ");

    let embedding: number[] | null = null;
    try {
      embedding = await generateEmbedding(embeddingText);
    } catch (embedError) {
      console.warn("Embedding failed, continuing without:", embedError);
    }

    // Save brand record (or get existing)
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

    // Save brand_voice record
    const { data: brandVoice, error: voiceError } = await supabaseAdmin
      .from("brand_voices")
      .insert({
        brand_id: brand.id,
        raw_captions: captions,
        voice_profile: profile,
        voice_strength_score: profile.voice_strength_score,
        embedding: embedding,
        extracted_by: usedProvider,
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

    return NextResponse.json({
      success: true,
      brandVoiceId: brandVoice.id,
      brandId: brand.id,
      brandName: safeBrandName,
      profile,
    });
  } catch (error: any) {
    console.error("Extract brand voice error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}