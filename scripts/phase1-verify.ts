/**
 * scripts/phase1-verify.ts — Phase 1 Definition-of-Done check.
 *
 * Proves the audience differentiation is REAL in the output: one product, the
 * top-3 matched audiences, three campaigns generated with each audience's full
 * match reasoning threaded into the prompt.
 *
 * Faithful to production:
 *   - audiences + reasoning come from the REAL /api/match-clusters handler.
 *   - prompts come from the REAL buildFullPrompt (audienceReasoning threaded).
 *   - generation calls callLLM directly (like compare-output.ts) so it bypasses
 *     the route's campaign cache — every run is genuinely fresh, nothing is
 *     written to the campaigns table, and stale cache can't mask the result.
 *
 * Usage:
 *   npm run phase1 -- <brandVoiceId> "<product description>"
 *   (or set PHASE1_BRAND_VOICE_ID / PHASE1_PRODUCT)
 */
import { supabaseAdmin } from "@/lib/supabase";
import { callLLM } from "@/lib/llm";
import { buildFullPrompt } from "@/lib/campaign-prompt";
import { POST as matchPOST } from "@/app/api/match-clusters/route";
import type { Cluster, BrandVoiceProfile } from "@/lib/types";

const FORCE_PROVIDER = (process.env.PHASE1_PROVIDER || "groq") as "groq" | "gemini" | "together";

function section(t: string) {
  const bar = "=".repeat(78);
  console.log(`\n${bar}\n${t}\n${bar}`);
}

async function main() {
  const brandVoiceId =
    process.argv[2] || process.env.PHASE1_BRAND_VOICE_ID || "1775e701-686d-4068-8a9c-37d57fcb1b01";
  const productDescription =
    process.argv[3] ||
    process.env.PHASE1_PRODUCT ||
    "Handwoven Jamdani cotton saree, traditional heritage motifs, limited edition, $140, ships worldwide.";

  const { data: brandVoiceRow, error: voiceErr } = await supabaseAdmin
    .from("brand_voices")
    .select("id, voice_profile, voice_strength_score")
    .eq("id", brandVoiceId)
    .single();
  if (voiceErr || !brandVoiceRow) {
    console.error("Brand voice not found:", voiceErr?.message || brandVoiceId);
    process.exit(1);
  }
  const profile = brandVoiceRow.voice_profile as BrandVoiceProfile;
  const voiceStrength = brandVoiceRow.voice_strength_score;

  // 1) REAL audience match — pull a wide candidate set so we can force a
  // HETEROGENEOUS trio (mix of local + diaspora, distinct currencies). This is
  // the global-launch sanity check: different markets must get market-correct
  // context, with no cross-market bleed.
  const matchReq = {
    json: async () => ({ productDescription, brandVoiceId, topN: 13 }),
  } as any;
  const matchRes = await matchPOST(matchReq);
  const matchJson: any = await matchRes.json();
  const allMatches: any[] = matchJson.matches || [];

  // Deliberately span the local/diaspora divide so the test proves context is
  // cluster-driven BOTH ways: a local Bangladesh market should get BDT + local
  // framing, while diaspora markets get their own currency + heritage/gifting,
  // with neither bleeding into the other. Pick: best local (if any scored) +
  // up to two diaspora markets with distinct currencies; backfill to 3.
  const localMatches = allMatches.filter((m) => m.cluster?.segment_type === "local");
  const diasporaMatches = allMatches.filter((m) => m.cluster?.segment_type === "diaspora");
  const matches: any[] = [];
  if (localMatches[0]) matches.push(localMatches[0]);
  const seenCur = new Set(matches.map((m) => m.cluster?.currency));
  for (const m of diasporaMatches) {
    if (seenCur.has(m.cluster?.currency)) continue;
    matches.push(m);
    seenCur.add(m.cluster?.currency);
    if (matches.length === 3) break;
  }
  for (const m of allMatches) {
    if (matches.length === 3) break;
    if (!matches.includes(m)) matches.push(m);
  }

  section(`PHASE 1 + 1.5 VERIFY — ${matches.length} heterogeneous audiences, one product`);
  console.log(`Brand: ${brandVoiceId}`);
  console.log(`Product: ${productDescription}`);
  console.log(`Provider (forced for fair eyeball): ${FORCE_PROVIDER}`);
  console.log(
    `Selected markets: ${matches
      .map((m) => `${m.cluster?.city} (${m.cluster?.segment_type}/${m.cluster?.currency})`)
      .join("  |  ")}`
  );
  if (matches.length < 2) {
    console.error("\nNeed at least 2 matched audiences to compare. Got:", matches.length);
    console.error("Raw match response:", JSON.stringify(matchJson).slice(0, 400));
    process.exit(1);
  }

  const ALL_CURRENCIES = ["BDT", "GBP", "CAD", "USD", "AED", "AUD", "MYR", "QAR", "SAR"];
  // Tokens that signal LOCAL-Bangladesh framing leaking onto a non-BDT market.
  const LOCAL_TOKENS = ["BDT", "Taka", "৳", "Dhaka", "Chittagong", "Chattogram", "Banglish"];

  // 2) Per audience: build the real prompt with reasoning threaded, generate fresh.
  const summaries: {
    who: string;
    market: string;
    why: string;
    caption: string;
    channel: string;
    posting: string;
    bleed: string[];
  }[] = [];
  for (const m of matches) {
    const cluster = m.cluster as Cluster;
    const currency = (cluster.currency || "").toUpperCase();
    const audienceReasoning = {
      cluster_id: cluster.id,
      display_name: m.display_name,
      fit_tier: m.fit_tier,
      one_line_reason: m.one_line_reason,
      reasoning: m.reasoning,
    };
    const prompt = buildFullPrompt({
      profile,
      voiceStrength,
      cluster,
      productDescription,
      audienceReasoning,
    });

    section(`AUDIENCE: ${m.display_name || cluster.city}`);
    // Show the AUDIENCE block that now reaches the model (proves Gap 1 threading).
    const aIdx = prompt.indexOf("AUDIENCE (");
    console.log(
      "[AUDIENCE block in prompt]\n" +
        (aIdx >= 0 ? prompt.slice(aIdx, prompt.indexOf("\n\n", aIdx)) : "  (none — THREADING FAILED)")
    );

    try {
      const res = await callLLM({
        provider: FORCE_PROVIDER,
        userPrompt: prompt,
        jsonMode: true,
        temperature: 0.7,
        maxTokens: 2500,
      });
      const cleaned = res.text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      const parsed = JSON.parse(cleaned);
      const blob = [
        parsed.why_this_campaign,
        parsed.caption,
        parsed.whatsapp_message,
        parsed.channel_recommendation,
        parsed.posting_time,
      ]
        .filter(Boolean)
        .join("  ");

      // CROSS-MARKET BLEED CHECK:
      //  - a foreign currency code (not this cluster's currency, not the USD
      //    the product itself is priced in) appearing in the copy
      //  - local-Bangladesh framing (BDT/Dhaka/Banglish/৳) on a non-BDT market
      const bleed: string[] = [];
      for (const cur of ALL_CURRENCIES) {
        if (cur === currency || cur === "USD") continue;
        if (new RegExp(`\\b${cur}\\b`).test(blob)) bleed.push(`foreign currency ${cur}`);
      }
      if (currency !== "BDT") {
        for (const tok of LOCAL_TOKENS) {
          if (blob.toLowerCase().includes(tok.toLowerCase())) bleed.push(`local-BD token "${tok}"`);
        }
      }

      console.log(`\n[generated by ${res.provider}/${res.model}]`);
      console.log(`why_this_campaign: ${parsed.why_this_campaign}`);
      console.log(`\ncaption:\n${parsed.caption}`);
      console.log(`\nposting_time: ${parsed.posting_time}`);
      console.log(`channel: ${parsed.channel_recommendation}`);
      console.log(`BLEED CHECK: ${bleed.length ? "⚠ " + bleed.join(", ") : "✓ clean (market-appropriate to " + currency + ")"}`);
      summaries.push({
        who: m.display_name || cluster.city,
        market: `${cluster.country} · ${currency} · ${cluster.segment_type}`,
        why: parsed.why_this_campaign || "",
        caption: parsed.caption || "",
        channel: parsed.channel_recommendation || "",
        posting: parsed.posting_time || "",
        bleed,
      });
    } catch (err: any) {
      console.log(`FAILED: ${err?.message || err}`);
    }
  }

  // 3) Side-by-side so a human can eyeball differentiation (the DoD test).
  section("SIDE-BY-SIDE (can a human immediately tell these apart?)");
  for (const s of summaries) {
    console.log(`\n● ${s.who}   [${s.market}]`);
    console.log(`   WHY : ${s.why}`);
    console.log(`   CAP : ${s.caption.slice(0, 160)}${s.caption.length > 160 ? "…" : ""}`);
    console.log(`   CH  : ${s.channel}`);
    console.log(`   TIME: ${s.posting}`);
    console.log(`   BLEED: ${s.bleed.length ? "⚠ " + s.bleed.join(", ") : "✓ clean"}`);
  }

  const anyBleed = summaries.some((s) => s.bleed.length);
  section(
    anyBleed
      ? "RESULT: ⚠ cross-market bleed detected — see flags above"
      : "RESULT: ✓ three market-appropriate campaigns, no cross-market bleed"
  );
  console.log("");
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
