import { NextRequest, NextResponse } from "next/server";
import {
  extractAndSaveBrandVoice,
  BrandExtractionError,
} from "@/lib/brand-intelligence";
import { createSyntheticBrandCorpusFromGuidelines } from "@/lib/brand-guidelines";
import type { BrandGuidelinesInput } from "@/lib/types";

// ============================================================
// DESHLY — brand-dna/from-guidelines
//
// The NEW primary Brand DNA flow. Takes structured brand-guideline answers,
// converts them into a synthetic brand corpus, and runs the EXISTING Brand
// Intelligence extractor. Captions are no longer required.
//
// Persistence: handled by the shared extractor (brand_voices table), so a
// successful call returns a brandVoiceId usable everywhere downstream.
// ============================================================

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}
function arr(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x) => typeof x === "string" && x.trim()) : [];
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Partial<BrandGuidelinesInput>;

    // --- 1. Validate required answers (friendly, minimal) ---
    const missing: string[] = [];
    if (!str(body.brandName)) missing.push("brand name");
    if (!str(body.whatYouSell)) missing.push("what you sell");
    if (!str(body.productCategory)) missing.push("category");
    if (!str(body.differentiator)) missing.push("what makes you different");
    if (!str(body.idealCustomer)) missing.push("ideal customer");
    if (arr(body.personalityTraits).length === 0)
      missing.push("at least one personality trait");
    if (arr(body.communicationStyle).length === 0)
      missing.push("at least one communication style");

    if (missing.length) {
      return NextResponse.json(
        { error: `Please complete: ${missing.join(", ")}.` },
        { status: 400 }
      );
    }

    // --- 2. Normalize into a clean BrandGuidelinesInput ---
    const input: BrandGuidelinesInput = {
      brandName: str(body.brandName),
      websiteOrSocial: str(body.websiteOrSocial) || undefined,
      productCategory: str(body.productCategory),
      whatYouSell: str(body.whatYouSell),
      differentiator: str(body.differentiator),
      idealCustomer: str(body.idealCustomer),
      targetMarkets: arr(body.targetMarkets),
      languagePreference: arr(body.languagePreference),
      avoidAudiences: str(body.avoidAudiences) || undefined,
      personalityTraits: arr(body.personalityTraits),
      customPersonality: str(body.customPersonality) || undefined,
      communicationStyle: arr(body.communicationStyle),
      alwaysRules: str(body.alwaysRules) || undefined,
      neverRules: str(body.neverRules) || undefined,
      bannedWordsOrTone: str(body.bannedWordsOrTone) || undefined,
      emojiPreference: body.emojiPreference,
      admiredBrands: arr(body.admiredBrands),
      captions: str(body.captions) || undefined,
    };

    // --- 3. Convert answers → synthetic brand corpus ---
    const corpus = createSyntheticBrandCorpusFromGuidelines(input);

    // --- 4. Run the existing Brand Intelligence extractor ---
    //    business_category is surfaced explicitly so the campaign generator
    //    (which reads it) reflects what the user actually told us.
    const result = await extractAndSaveBrandVoice({
      corpus,
      rawText: corpus,
      brandName: input.brandName,
      profileExtras: {
        business_category: input.productCategory,
        brand_guidelines: input,
        source: "guidelines",
      },
    });

    return NextResponse.json({
      success: true,
      brandVoiceId: result.brandVoiceId,
      brandId: result.brandId,
      brandName: result.brandName,
      brandHandle: result.brandHandle,
      profile: result.profile,
    });
  } catch (error) {
    if (error instanceof BrandExtractionError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("brand-dna/from-guidelines error:", error);
    const msg = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
