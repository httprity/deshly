/**
 * scripts/verify-prompt-parity.ts — proves the refactor did NOT change the
 * production prompt.
 *
 * CHECK A (runtime): build the campaign prompt the OLD way (inline, exactly as
 *   route.ts assembled it before the refactor) and the NEW way (buildFullPrompt,
 *   fullContext:false) for the SAME brand+cluster+product, then assert the two
 *   strings are byte-identical. All optional branches (intent, goal, category,
 *   cares, history, rulebook) are exercised.
 *
 * CHECK B (git/text): CHECK A imports GENERATION_PROMPT and languageStyleFor from
 *   the module, so a change to either would cancel out on both sides and hide.
 *   So we separately diff those two declarations' text against the ORIGINAL route
 *   committed at HEAD (`git show HEAD:...route.ts`) to prove they were moved verbatim.
 *
 * Run:  npm run verify-prompt            (uses the first brand_voice + cluster in the DB)
 *       npm run verify-prompt -- <brandVoiceId> <clusterId>
 */
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { supabaseAdmin } from "@/lib/supabase";
import { buildFullPrompt, GENERATION_PROMPT, languageStyleFor } from "@/lib/campaign-prompt";
import type { Cluster, BrandVoiceProfile } from "@/lib/types";

// Inputs chosen to exercise EVERY optional block in the builder.
const productDescription = "Hand-stitched emerald silk panjabi, Eid 2026, limited edition, ৳6,500";
const campaignIntent = "Limited drop";
const campaignGoal = "Drive pre-Eid pre-orders from premium buyers";
const productCategory = "Premium ethnicwear";
const customerCares = ["Craftsmanship", "Exclusivity", "Gifting"];
const historyContext = "PAST SIGNALS: this brand's emerald pieces over-index with Gulf diaspora gifting.";

// ---------------------------------------------------------------------------
// OLD WAY — copied verbatim from route.ts as it was BEFORE the refactor.
// (GENERATION_PROMPT + languageStyleFor are the verbatim-moved pieces; CHECK B
//  proves those independently, so importing them here is sound.)
// ---------------------------------------------------------------------------
function buildOldWay(profile: BrandVoiceProfile | null, voiceStrength: number | null | undefined, cluster: Cluster): string {
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

  const vp: any = profile || {};
  const compactVoice = {
    vibe: vp.their_brand_vibe?.identity || "—",
    personality: (vp.brand_personality?.traits || []).slice(0, 4),
    style: vp.how_they_talk?.style || "—",
    signature_words: (vp.words_they_repeat || []).slice(0, 6),
    cares_about: (vp.what_they_care_about || []).slice(0, 4),
    never: (vp.they_never || []).slice(0, 3),
  };

  const gi: any = vp.generation_instructions || {};
  const rulebook = {
    caption_instruction: gi.caption_instruction || "",
    whatsapp_instruction: gi.whatsapp_instruction || "",
    image_prompt_instruction: gi.image_prompt_instruction || "",
    diaspora_adaptation_instruction: gi.diaspora_adaptation_instruction || "",
    market_adaptation_instruction: gi.market_adaptation_instruction || "",
    dont_rules: (vp.dont_rules || []).slice(0, 6),
    product_framing: vp.product_framing?.usual_angle || "",
    conversion_style: vp.conversion_style
      ? `${vp.conversion_style.cta_style || ""} CTA, urgency ${vp.conversion_style.urgency_level || "—"}`
      : "",
    brand_maturity: vp.brand_maturity || "",
    trust_requirements: (vp.trust_requirements || []).slice(0, 4),
    style_priority: vp.style_priority || "",
    customer_motivations: Array.isArray(vp.customer_motivations) ? vp.customer_motivations.slice(0, 6) : [],
  };
  const hasRulebook = Boolean(
    rulebook.caption_instruction ||
      rulebook.dont_rules.length ||
      rulebook.product_framing ||
      rulebook.style_priority ||
      rulebook.customer_motivations.length
  );

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

  return `${GENERATION_PROMPT}

BRAND VOICE:
${JSON.stringify(compactVoice)}

BRAND VOICE STRENGTH: ${voiceStrength}${rulebookBlock}${categoryBlock}${historyContext ? `\n\n${historyContext}` : ""}${intentBlock}

PRODUCT:
${productDescription}

CLUSTER (note language_style — localize the emotional angle accordingly):
${JSON.stringify(compactCluster(cluster))}`;
}

function firstDivergence(a: string, b: string): number {
  const min = Math.min(a.length, b.length);
  let i = 0;
  while (i < min && a[i] === b[i]) i++;
  return i === min && a.length === b.length ? -1 : i;
}

function checkB() {
  // Extract the two moved declarations from the ORIGINAL route (HEAD) and the new module, compare text.
  const headRoute = execSync("git show HEAD:src/app/api/generate-campaign/route.ts", { encoding: "utf8" });
  const moduleSrc = readFileSync("src/lib/campaign-prompt.ts", "utf8");

  const extract = (src: string, start: string, end: string): string | null => {
    const i = src.indexOf(start);
    if (i === -1) return null;
    const j = src.indexOf(end, i);
    if (j === -1) return null;
    return src.slice(i, j + end.length);
  };

  const regions: Array<{ name: string; start: string; end: string }> = [
    { name: "GENERATION_PROMPT", start: "You generate a complete marketing campaign for ONE market cluster.", end: "Begin." },
    { name: "languageStyleFor", start: 'const city = (c.city || "").toLowerCase();', end: 'clear and warm.";' },
  ];

  let ok = true;
  for (const r of regions) {
    const head = extract(headRoute, r.start, r.end);
    const mod = extract(moduleSrc, r.start, r.end);
    if (head === null || mod === null) {
      console.log(`  ${r.name}: ⚠️  could not locate region (head=${head !== null}, module=${mod !== null})`);
      ok = false;
      continue;
    }
    if (head === mod) {
      console.log(`  ${r.name}: ✅ verbatim move (${mod.length} chars identical)`);
    } else {
      ok = false;
      const at = firstDivergence(head, mod);
      console.log(`  ${r.name}: ❌ DIFFERS at offset ${at}`);
      console.log(`     HEAD: ${JSON.stringify(head.slice(Math.max(0, at - 40), at + 40))}`);
      console.log(`     MOD : ${JSON.stringify(mod.slice(Math.max(0, at - 40), at + 40))}`);
    }
  }
  return ok;
}

async function main() {
  const brandArg = process.argv[2];
  const clusterArg = process.argv[3];

  const bvQuery = supabaseAdmin
    .from("brand_voices")
    .select("id, voice_profile, voice_strength_score");
  const { data: bv } = brandArg
    ? await bvQuery.eq("id", brandArg).maybeSingle()
    : await bvQuery.not("voice_profile", "is", null).limit(1).maybeSingle();

  const clQuery = supabaseAdmin.from("clusters").select("*");
  const { data: cl } = clusterArg
    ? await clQuery.eq("id", clusterArg).maybeSingle()
    : await clQuery.limit(1).maybeSingle();

  if (!bv || !cl) {
    console.error("Need at least one brand_voice (with voice_profile) and one cluster in the DB.");
    process.exit(1);
  }

  const profile = bv.voice_profile as BrandVoiceProfile;
  const voiceStrength = bv.voice_strength_score;
  const cluster = cl as Cluster;

  console.log(`Fixture: brand_voice=${bv.id}  cluster=${(cl as any).id}  (${(cl as any).city || "?"})`);

  // ---- CHECK A ----
  const oldPrompt = buildOldWay(profile, voiceStrength, cluster);
  const newPrompt = buildFullPrompt({
    profile,
    voiceStrength,
    cluster,
    productDescription,
    campaignIntent,
    campaignGoal,
    productCategory,
    customerCares,
    historyContext,
    fullContext: false,
  });

  console.log(`\nCHECK A — OLD inline vs NEW buildFullPrompt (fullContext:false)`);
  console.log(`  OLD length=${oldPrompt.length}  NEW length=${newPrompt.length}`);
  const at = firstDivergence(oldPrompt, newPrompt);
  const aPass = at === -1;
  if (aPass) {
    console.log(`  ✅ BYTE-IDENTICAL — production prompt unchanged.`);
  } else {
    const ctx = 80;
    console.log(`  ❌ DIFFER at index ${at}`);
    console.log(`     OLD …${JSON.stringify(oldPrompt.slice(Math.max(0, at - ctx), at + ctx))}`);
    console.log(`     NEW …${JSON.stringify(newPrompt.slice(Math.max(0, at - ctx), at + ctx))}`);
    console.log(`     OLD char @${at}: ${JSON.stringify(oldPrompt[at] ?? "<EOF>")}`);
    console.log(`     NEW char @${at}: ${JSON.stringify(newPrompt[at] ?? "<EOF>")}`);
  }

  // ---- CHECK B ----
  console.log(`\nCHECK B — moved declarations vs ORIGINAL route at HEAD`);
  const bPass = checkB();

  console.log(`\n${aPass && bPass ? "✅ PASS — refactor is prompt-preserving." : "❌ FAIL — see above."}`);
  process.exit(aPass && bPass ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
