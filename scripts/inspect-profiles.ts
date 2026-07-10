/**
 * scripts/inspect-profiles.ts — READ-ONLY. Dumps the actual top-level keys of
 * voice_profile across brand_voices rows, so we can see which schema(s) exist
 * before touching compactVoice. Changes nothing.
 *
 * Run: npm run inspect-profiles            (default: 15 most recent rows)
 *      npm run inspect-profiles -- 50
 */
import { supabaseAdmin } from "@/lib/supabase";

const LEGACY_CORE = [
  "their_brand_vibe",
  "brand_personality",
  "how_they_talk",
  "words_they_repeat",
  "what_they_care_about",
  "they_never",
];
const RULEBOOK = ["voice_style", "generation_instructions", "dont_rules", "product_framing"];
const OTHER_VOICE = ["voice", "formality_level", "tone_descriptors", "style_priority", "customer_motivations"];

async function main() {
  const limit = Number(process.argv[2]) || 15;

  const { data: rows, error } = await supabaseAdmin
    .from("brand_voices")
    .select("id, extracted_by, created_at, voice_profile")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error || !rows) {
    console.error("Query failed:", error?.message);
    process.exit(1);
  }

  console.log(`Inspecting ${rows.length} brand_voices rows (most recent first)\n`);

  const shapeTally: Record<string, number> = {};

  for (const r of rows) {
    const vp: any = r.voice_profile || {};
    const keys = Object.keys(vp);
    const has = (k: string) => (k in vp ? "Y" : "·");

    // Classify shape
    const hasLegacyCore = LEGACY_CORE.every((k) => k in vp);
    const hasVoiceObj = "voice" in vp; // the alt shape seen on the test row
    const shape = hasLegacyCore
      ? "legacy-core" + ("voice_style" in vp ? "+rulebook" : "")
      : hasVoiceObj
      ? "alt(voice:{})"
      : "unknown";
    shapeTally[shape] = (shapeTally[shape] || 0) + 1;

    console.log(`── ${r.id}`);
    console.log(`   extracted_by: ${r.extracted_by ?? "?"}   created: ${r.created_at ?? "?"}`);
    console.log(`   shape: ${shape}`);
    console.log(
      `   legacy-core present: ` +
        LEGACY_CORE.map((k) => `${k}=${has(k)}`).join("  ")
    );
    console.log(`   rulebook present:    ` + RULEBOOK.map((k) => `${k}=${has(k)}`).join("  "));
    console.log(`   other:               ` + OTHER_VOICE.map((k) => `${k}=${has(k)}`).join("  "));
    console.log(`   ALL top-level keys:  [${keys.join(", ")}]`);
    // If it has the alt `voice` object, show its keys too — that's what differs.
    if (hasVoiceObj && vp.voice && typeof vp.voice === "object") {
      console.log(`     voice.* keys:      [${Object.keys(vp.voice).join(", ")}]`);
    }
    console.log("");
  }

  console.log("── shape tally ──");
  for (const [k, v] of Object.entries(shapeTally)) console.log(`   ${k}: ${v}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
