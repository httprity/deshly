// READ-ONLY. Tally voice_profile shapes across the WHOLE brand_voices table.
import { supabaseAdmin } from "@/lib/supabase";

async function main() {
  const { data, error } = await supabaseAdmin
    .from("brand_voices")
    .select("id, created_at, extracted_by, voice_profile");
  if (error || !data) {
    console.error("query failed:", error?.message);
    return;
  }

  let total = 0;
  let legacyCore = 0;
  let altVoice = 0;
  let neither = 0;
  const outliers: Array<{ id: string; created_at: string; extracted_by: string; keys: string[] }> = [];

  for (const r of data) {
    total++;
    const vp: any = r.voice_profile || {};
    const hasLegacy = "their_brand_vibe" in vp && "brand_personality" in vp && "words_they_repeat" in vp;
    if (hasLegacy) {
      legacyCore++;
    } else if ("voice" in vp) {
      altVoice++;
      outliers.push({ id: r.id, created_at: r.created_at, extracted_by: r.extracted_by, keys: Object.keys(vp) });
    } else {
      neither++;
      outliers.push({ id: r.id, created_at: r.created_at, extracted_by: r.extracted_by, keys: Object.keys(vp) });
    }
  }

  console.log(`TOTAL brand_voices rows: ${total}`);
  console.log(`  legacy-core (has their_brand_vibe/brand_personality/words_they_repeat — compactVoice reads these): ${legacyCore}`);
  console.log(`  alt 'voice:{}' shape (compactVoice reads nothing): ${altVoice}`);
  console.log(`  neither: ${neither}`);
  if (outliers.length) {
    console.log(`\nNON-legacy rows (the only ones where compactVoice comes out empty):`);
    for (const o of outliers) {
      console.log(`  ${o.id}  ${o.created_at}  by=${o.extracted_by}`);
      console.log(`    keys: [${o.keys.join(", ")}]`);
    }
  }
}
main().catch((e) => console.error(e));
