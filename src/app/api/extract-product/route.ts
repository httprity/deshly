import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import {
  extractProductIntelligence,
  nextFollowUp,
  type ProductIntelligenceInput,
} from "@/lib/product-intelligence";

// ============================================================
// DESHLY — /api/extract-product
//
// Step between "user typed a product" and "generate a campaign". Turns a few
// high-signal inputs into a structured ProductIntelligence object the user
// confirms/edits before anything is generated. Optionally returns ONE targeted
// follow-up question when a high-value signal is weak.
// ============================================================

function str(v: unknown): string | undefined {
  return typeof v === "string" && v.trim() ? v.trim() : undefined;
}
function arr(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x) => typeof x === "string" && x.trim()) : [];
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const description = str(body.description) || str(body.productDescription);
    if (!description || description.length < 12) {
      return NextResponse.json(
        { error: "Tell Deshly a little more about the product." },
        { status: 400 }
      );
    }

    // Pull brand context (name + category) to sharpen extraction, if available.
    let brandName: string | undefined;
    let brandCategory: string | undefined;
    if (str(body.brandVoiceId)) {
      try {
        const { data } = await supabaseAdmin
          .from("brand_voices")
          .select("voice_profile, brands(name)")
          .eq("id", body.brandVoiceId)
          .maybeSingle();
        if (data) {
          const vp = (data.voice_profile || {}) as Record<string, unknown>;
          brandCategory = str(vp.business_category);
          const brands = data.brands as unknown;
          if (Array.isArray(brands)) brandName = str((brands[0] as { name?: string })?.name);
          else if (brands && typeof brands === "object") brandName = str((brands as { name?: string }).name);
        }
      } catch {
        // brand context is optional — never block extraction on it
      }
    }

    const input: ProductIntelligenceInput = {
      description,
      price: str(body.price),
      marketAvailability: arr(body.marketAvailability),
      campaignGoal: str(body.campaignGoal),
      productCategory: str(body.productCategory),
      materialsOrSpecs: str(body.materialsOrSpecs),
      offer: str(body.offer),
      avoidAudience: str(body.avoidAudience),
      creativeStyle: str(body.creativeStyle),
      brandName,
      brandCategory,
    };

    const productIntelligence = await extractProductIntelligence(input);
    const followUp = nextFollowUp(productIntelligence);

    return NextResponse.json({ success: true, productIntelligence, followUp });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Extraction failed";
    console.error("extract-product error:", error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
