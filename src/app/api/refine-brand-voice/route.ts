import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

// ============================================================
// DESHLY — refine-brand-voice
// Merges the user's optional setup answers + corrections INTO the
// existing voice_profile, so the campaign generator's rulebook reflects
// what the user actually told us. Additive merge — never destroys the
// original extraction; layers user intent on top.
// ============================================================

// Map a user "avoid" chip to a concrete dont_rule the generator follows.
const AVOID_TO_RULE: Record<string, string> = {
  "Too many emojis": "Use at most one emoji per caption; prefer none for premium products.",
  "Too much Bangla": "Lean more English; use Bangla only for warmth and key emotional beats.",
  "Too much English": "Lean more Bangla; keep English light and natural.",
  "Discount-heavy tone": "Never sound cheap or discount-driven; emphasize value, not price cuts.",
  "Streetwear slang": "Avoid streetwear slang and hype words.",
  "Trendy slang": "Avoid trendy slang and internet hype words.",
  "Overly poetic captions": "Keep captions grounded and clear; avoid overwrought poetic language.",
  "Pushy sales language": "Keep CTAs soft; never use hard urgency like 'hurry' or 'last chance'.",
  "Too formal": "Keep the tone natural and human; avoid stiff, corporate phrasing.",
  "Too generic": "Be specific and distinctive; never write lines that could fit any other brand.",
  "Overpromising": "Do not overpromise results or outcomes; keep claims honest and grounded.",
  "Weak CTA": "Always include one clear, confident call to action.",
  "Long captions": "Keep captions concise and scannable; avoid long blocks of text.",
  "Religious wording": "Avoid religious phrasing; keep occasion references cultural, not devotional.",
  "Luxury exaggeration": "Do not overpromise luxury; let craft and detail speak instead.",
};

// Map a user "customers care about" chip to a generation emphasis.
// Covers universal + category-specific chips; unknown chips pass through as-is.
const CARE_TO_EMPHASIS: Record<string, string> = {
  // Universal
  "Price": "fair pricing and value",
  "Quality": "quality and craftsmanship",
  "Trust": "trust and credibility",
  "Convenience": "convenience and ease",
  "Taste": "taste and flavour",
  "Style": "style and design",
  "Delivery": "delivery reliability",
  "Social proof": "reviews and social proof",
  "Value": "overall value for money",
  // Fashion
  "Fit": "fit and sizing",
  "Fabric": "fabric and material quality",
  "Trend": "current, trend-aware styling",
  "Occasion wear": "occasion and festive use",
  // Food
  "Freshness": "freshness",
  "Portion": "portion and generosity",
  "Delivery speed": "fast delivery",
  "Hygiene": "hygiene and cleanliness",
  // Beauty
  "Ingredients": "ingredients and formulation",
  "Skin concern": "the specific skin concern it solves",
  "Safety": "safety and gentleness",
  "Results": "visible results",
  // Jewelry
  "Craftsmanship": "craftsmanship and detail",
  "Authenticity": "authenticity and hallmarking",
  "Giftability": "gifting and occasion-sending",
  "Heirloom value": "lasting, heirloom value",
  // Home & Living
  "Durability": "durability and build",
  "Aesthetics": "aesthetics and look",
  "Space fit": "fit for the customer's space",
  "Material": "material quality",
  // Electronics
  "Performance": "performance",
  "Warranty": "warranty and reliability",
  "Specs": "key specifications",
  "After-sales support": "after-sales support",
  // Services
  "Reliability": "reliability",
  "Expertise": "expertise and skill",
  "Turnaround": "turnaround time",
  "Communication": "clear communication",
};

// Map a chosen tone option to voice_style adjustments.
const TONE_PRESET: Record<string, { tone: string[]; energy: string; formality: string }> = {
  "Elegant, calm, premium": { tone: ["elegant", "calm", "premium"], energy: "low-medium", formality: "polished" },
  "Friendly, warm, family-focused": { tone: ["friendly", "warm", "family-focused"], energy: "medium", formality: "semi-formal" },
  "Bold, trendy, hype-driven": { tone: ["bold", "trendy", "energetic"], energy: "high", formality: "casual" },
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { brandVoiceId, tone, stylePriority, avoid, cares, corrections, category } = body;

    if (!brandVoiceId) {
      return NextResponse.json({ error: "brandVoiceId required" }, { status: 400 });
    }

    // Load current profile
    const { data: row, error: loadErr } = await supabaseAdmin
      .from("brand_voices")
      .select("voice_profile")
      .eq("id", brandVoiceId)
      .single();

    if (loadErr || !row) {
      return NextResponse.json({ error: "Brand voice not found" }, { status: 404 });
    }

    const profile: any = row.voice_profile || {};

    // Ensure containers exist
    profile.voice_style = profile.voice_style || {};
    profile.dont_rules = Array.isArray(profile.dont_rules) ? profile.dont_rules : [];
    profile.generation_instructions = profile.generation_instructions || {};
    profile.user_refinements = profile.user_refinements || {}; // record raw user intent

    // 1) Tone correction → adjust voice_style + record (tone = writing style)
    if (tone && TONE_PRESET[tone]) {
      const preset = TONE_PRESET[tone];
      profile.voice_style.tone = preset.tone;
      profile.voice_style.energy_level = preset.energy;
      profile.voice_style.formality = preset.formality;
      profile.user_refinements.tone = tone;
      profile.tone_preferences = preset.tone; // named field for tone (style)
    }

    // 2) Avoid chips → dont_rules (dedup)
    if (Array.isArray(avoid) && avoid.length) {
      const newRules = avoid
        .map((a: string) => AVOID_TO_RULE[a] || `Avoid: ${a}`)
        .filter(Boolean);
      profile.dont_rules = Array.from(new Set([...profile.dont_rules, ...newRules]));
      profile.user_refinements.avoid = avoid;
    }

    // 3) Cares chips → emphasis baked into caption_instruction
    if (Array.isArray(cares) && cares.length) {
      const emphases = cares.map((c: string) => CARE_TO_EMPHASIS[c] || c).filter(Boolean);
      const emphasisLine = `Emphasize what these customers care about: ${emphases.join(", ")}.`;
      const existing = profile.generation_instructions.caption_instruction || "";
      // Append once; avoid duplicate stacking
      if (!existing.includes("Emphasize what these customers care about")) {
        profile.generation_instructions.caption_instruction = `${existing} ${emphasisLine}`.trim();
      }
      profile.user_refinements.cares = cares;
    }

    // 4) Free-text corrections (from "Needs changes") → record + nudge instruction
    if (corrections && typeof corrections === "string" && corrections.trim()) {
      profile.user_refinements.corrections = corrections.trim();
      const existing = profile.generation_instructions.caption_instruction || "";
      profile.generation_instructions.caption_instruction =
        `${existing} User note: ${corrections.trim()}`.trim();
    }

    // Record business category (optional) — informs future generation context
    if (category && typeof category === "string") {
      profile.business_category = category;
      profile.user_refinements.category = category;
    }

    // ============================================================
    // HYBRID: write the clearer NAMED fields alongside the existing
    // working structure. Additive + backward-compatible. Generation
    // prefers these when present, else falls back to the old fields.
    // ============================================================
    profile.refinement_preferences = profile.refinement_preferences || {};

    // style_priority — explicit, controls brand-voice vs market adaptation
    if (stylePriority && typeof stylePriority === "string") {
      profile.style_priority = stylePriority;
      profile.refinement_preferences.style_priority = stylePriority;

      const ADAPTATION: Record<string, string> = {
        balanced_brand_and_market:
          "Preserve the brand voice but adapt the angle and language to each market.",
        brand_voice_first:
          "Stay very close to the brand voice; adapt market references lightly.",
        market_first:
          "Let market context shape tone more strongly, while still respecting the brand's dont_rules.",
        custom: "",
      };
      const instr = ADAPTATION[stylePriority];
      if (instr) {
        profile.generation_instructions.market_adaptation_instruction = instr;
      }
    }
    if (tone) {
      profile.refinement_preferences.tone = tone;
    }

    // customer_motivations — the mapped emphases (named, structured)
    if (Array.isArray(cares) && cares.length) {
      const motivations = cares.map((c: string) => CARE_TO_EMPHASIS[c] || c).filter(Boolean);
      const prev = Array.isArray(profile.customer_motivations) ? profile.customer_motivations : [];
      profile.customer_motivations = Array.from(new Set([...prev, ...motivations]));
      // raw chips kept too, scoped by category if known
      profile.category_specific_customer_cares = {
        ...(profile.category_specific_customer_cares || {}),
        [category || "general"]: cares,
      };
      profile.refinement_preferences.cares = cares;
    }

    // trust_requirements — seed sensible defaults from category if not already present
    if (category) {
      const TRUST_BY_CATEGORY: Record<string, string[]> = {
        Fashion: ["show real product photos", "clarify sizing/fit"],
        Food: ["show real food photos", "mention freshness/hygiene", "clarify delivery timing"],
        Beauty: ["mention ingredients", "set realistic results expectations", "note safety/patch test"],
        Jewelry: ["show craftsmanship detail", "clarify authenticity/materials"],
        "Home & Living": ["show real product in-room", "clarify dimensions/materials"],
        Electronics: ["list key specs", "clarify warranty/after-sales"],
        Services: ["show proof/past work", "clarify turnaround and scope"],
      };
      const seed = TRUST_BY_CATEGORY[category] || [];
      const prevTrust = Array.isArray(profile.trust_requirements) ? profile.trust_requirements : [];
      if (seed.length) {
        profile.trust_requirements = Array.from(new Set([...prevTrust, ...seed]));
      }
    }

    // conversion_style — derived from avoid choices (e.g. avoid pushy → soft CTA)
    {
      const avoidList: string[] = Array.isArray(avoid) ? avoid : [];
      const wantsSoft = avoidList.includes("Pushy sales language") || avoidList.includes("Discount-heavy tone");
      const prevPatterns = Array.isArray(profile.conversion_style?.avoid_patterns)
        ? profile.conversion_style.avoid_patterns
        : [];
      profile.conversion_style = {
        ...(profile.conversion_style || {}),
        cta_style: wantsSoft ? "soft" : (profile.conversion_style?.cta_style || "balanced"),
        urgency_level: wantsSoft ? "low" : (profile.conversion_style?.urgency_level || "medium"),
        avoid_patterns: Array.from(new Set([...prevPatterns, ...avoidList])),
      };
    }

    // Mark that the user has refined this profile (used by confidence score)
    profile.user_refinements.refined_at = new Date().toISOString();
    profile.refinement_preferences.refined_at = profile.user_refinements.refined_at;

    // Save merged profile back
    const { error: saveErr } = await supabaseAdmin
      .from("brand_voices")
      .update({ voice_profile: profile })
      .eq("id", brandVoiceId);

    if (saveErr) {
      return NextResponse.json({ error: "Failed to save: " + saveErr.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, profile });
  } catch (error: any) {
    console.error("refine-brand-voice error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}