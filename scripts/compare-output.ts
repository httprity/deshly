/**
 * scripts/compare-output.ts — generation-quality A/B/C harness.
 *
 * Same brand + product + cluster, generated three ways:
 *   RUN 1 — forced Gemini flash-lite  + COMPACTED context (compactVoice/compactCluster)
 *   RUN 2 — forced Groq Llama 3.3 70B + COMPACTED context (compactVoice/compactCluster)
 *   RUN 3 — forced Groq Llama 3.3 70B + FULL context (full profile + full cluster, no compaction)
 *
 * It reuses the REAL prompt builder (buildFullPrompt) from the route — not a new prompt —
 * so RUN 1/2 are byte-identical to what /api/generate-campaign sends, and RUN 3 only
 * swaps in the full profile + full cluster via fullContext:true.
 *
 * It calls callLLM directly, so it NEVER touches the route's campaign cache: every run
 * is a genuinely fresh generation, and nothing is written to the campaigns table.
 *
 * Usage:
 *   npm run compare -- <brandVoiceId> <clusterId> "<product description>"
 * or set env vars COMPARE_BRAND_VOICE_ID / COMPARE_CLUSTER_ID / COMPARE_PRODUCT.
 */
import { supabaseAdmin } from "@/lib/supabase";
import { callLLM } from "@/lib/llm";
import { buildFullPrompt } from "@/lib/campaign-prompt";
import type { Cluster, BrandVoiceProfile } from "@/lib/types";

async function main() {
  const brandVoiceId = process.argv[2] || process.env.COMPARE_BRAND_VOICE_ID;
  const clusterId = process.argv[3] || process.env.COMPARE_CLUSTER_ID;
  const productDescription = process.argv[4] || process.env.COMPARE_PRODUCT;

  if (!brandVoiceId || !clusterId || !productDescription) {
    console.error(
      'Usage: npm run compare -- <brandVoiceId> <clusterId> "<product description>"\n' +
        "   (or set COMPARE_BRAND_VOICE_ID, COMPARE_CLUSTER_ID, COMPARE_PRODUCT)"
    );
    process.exit(1);
  }

  // Same fetches the route does (route.ts: brand_voices + clusters).
  const { data: brandVoiceRow, error: voiceErr } = await supabaseAdmin
    .from("brand_voices")
    .select("id, voice_profile, voice_strength_score")
    .eq("id", brandVoiceId)
    .single();
  if (voiceErr || !brandVoiceRow) {
    console.error("Brand voice not found:", voiceErr?.message || brandVoiceId);
    process.exit(1);
  }

  const { data: cluster, error: clusterErr } = await supabaseAdmin
    .from("clusters")
    .select("*")
    .eq("id", clusterId)
    .single();
  if (clusterErr || !cluster) {
    console.error("Cluster not found:", clusterErr?.message || clusterId);
    process.exit(1);
  }

  const profile = brandVoiceRow.voice_profile as BrandVoiceProfile;
  const voiceStrength = brandVoiceRow.voice_strength_score;

  // Build the two prompts ONCE. RUN 1 and RUN 2 share the compacted prompt;
  // only the forced provider differs. RUN 3 uses the full-context prompt.
  const compactPrompt = buildFullPrompt({
    profile,
    voiceStrength,
    cluster: cluster as Cluster,
    productDescription,
    fullContext: false,
  });
  const fullPrompt = buildFullPrompt({
    profile,
    voiceStrength,
    cluster: cluster as Cluster,
    productDescription,
    fullContext: true,
  });

  const runs = [
    { label: "RUN 1 — Gemini flash-lite + COMPACTED context", provider: "gemini" as const, prompt: compactPrompt },
    { label: "RUN 2 — Groq Llama 3.3 70B + COMPACTED context", provider: "groq" as const, prompt: compactPrompt },
    { label: "RUN 3 — Groq Llama 3.3 70B + FULL context (no compaction)", provider: "groq" as const, prompt: fullPrompt },
  ];

  console.log(
    `\nBrand: ${brandVoiceId}  |  Cluster: ${(cluster as any).city || clusterId}  |  Product: ${productDescription}`
  );
  console.log(
    `[ENV] GROQ=${!!process.env.GROQ_API_KEY}  TOGETHER=${!!process.env.TOGETHER_API_KEY}  GEMINI=${!!process.env.GEMINI_API_KEY}`
  );
  console.log(`compact prompt = ${compactPrompt.length} chars   |   full prompt = ${fullPrompt.length} chars`);
  console.log(`prompts identical? ${compactPrompt === fullPrompt}`);

  // Same LLM call params the route uses (route.ts: jsonMode, temperature 0.7, maxTokens 2500).
  for (const run of runs) {
    const divider = "=".repeat(74);
    console.log(`\n${divider}\n${run.label}\n${divider}`);

    // --- prompt diagnostics: prove each run's prompt is what we think it is ---
    const bvIdx = run.prompt.indexOf("BRAND VOICE:");
    console.log(`[REQUESTED provider] ${run.provider}`);
    console.log(`[prompt] ${run.prompt.length} chars`);
    console.log(`[prompt first 200] ${JSON.stringify(run.prompt.slice(0, 200))}`);
    console.log(`[prompt @BRAND VOICE +260] ${JSON.stringify(run.prompt.slice(bvIdx, bvIdx + 260))}`);

    try {
      const t0 = Date.now();
      const res = await callLLM({
        provider: run.provider,
        userPrompt: run.prompt,
        jsonMode: true,
        temperature: 0.7,
        maxTokens: 2500,
      });
      const ms = Date.now() - t0;
      console.log(`[RETURNED provider/model] ${res.provider}/${res.model}   (${ms} ms, ${res.text.length} chars)\n`);
      const cleaned = res.text
        .replace(/```json\n?/g, "")
        .replace(/```\n?/g, "")
        .trim();
      try {
        console.log(JSON.stringify(JSON.parse(cleaned), null, 2));
      } catch {
        console.log("(could not parse as JSON — raw output below)\n" + cleaned);
      }
    } catch (err: any) {
      console.log(`FAILED: ${err?.message || err}`);
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
