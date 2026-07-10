/**
 * scripts/phase0-introspect.ts — READ-ONLY. Phase 0 verification for the
 * Exemplar-Retrieval RAG plan. Confirms:
 *   1. Live dimension of brand_voices.embedding (plan asserts 768).
 *   2. The real type/shape of cluster ids (plan's RPC assumed uuid).
 *   3. Whether campaigns rows already carry any embedding/quality columns.
 * Changes nothing.
 *
 * Run: node --env-file=.env.local --import ./scripts/ws-polyfill.mjs --import tsx scripts/phase0-introspect.ts
 */
import { supabaseAdmin } from "@/lib/supabase";

function dim(v: unknown): string {
  if (Array.isArray(v)) return `array len ${v.length}`;
  if (typeof v === "string") {
    // pgvector often serializes as a "[0.1,0.2,...]" string over the wire
    const n = v.split(",").length;
    return `string, ~${n} comma-parts (first 40: ${v.slice(0, 40)}…)`;
  }
  return `type ${typeof v} (${v === null ? "null" : "non-array"})`;
}

async function main() {
  // 1. brand_voices.embedding live dimension
  const { data: bv, error: bvErr } = await supabaseAdmin
    .from("brand_voices")
    .select("id, embedding")
    .not("embedding", "is", null)
    .limit(1)
    .maybeSingle();
  console.log("=== brand_voices.embedding ===");
  if (bvErr) console.log("  ERROR:", bvErr.message);
  else if (!bv) console.log("  no row with non-null embedding found");
  else console.log("  dimension =>", dim((bv as any).embedding));

  // 2. cluster id shape
  const { data: cl, error: clErr } = await supabaseAdmin
    .from("clusters")
    .select("id, segment_type, city")
    .limit(5);
  console.log("\n=== clusters.id sample ===");
  if (clErr) console.log("  ERROR:", clErr.message);
  else (cl || []).forEach((c: any) => console.log(`  ${JSON.stringify(c.id)}  (${c.segment_type}, ${c.city})`));

  // 3. campaigns: existing columns of interest + count
  const { data: camp, error: campErr } = await supabaseAdmin
    .from("campaigns")
    .select("id, cluster_id, context_embedding, quality_score, exemplar_eligible")
    .limit(1);
  console.log("\n=== campaigns probe (selecting plan's new columns) ===");
  if (campErr) console.log("  select error (columns likely absent — expected):", campErr.message);
  else console.log("  columns already present. sample:", JSON.stringify(camp?.[0] ?? null).slice(0, 200));

  const { count } = await supabaseAdmin
    .from("campaigns")
    .select("id", { count: "exact", head: true });
  console.log("  campaigns row count (backfill scope) =>", count);

  // 4. user_signals: does campaign_id already exist?
  const { error: usErr } = await supabaseAdmin
    .from("user_signals")
    .select("campaign_id")
    .limit(1);
  console.log("\n=== user_signals.campaign_id ===");
  console.log(usErr ? `  absent (expected): ${usErr.message}` : "  already present");

  // 5. product_intelligence.embedding present?
  const { error: piErr } = await supabaseAdmin
    .from("product_intelligence")
    .select("embedding")
    .limit(1);
  console.log("\n=== product_intelligence.embedding ===");
  console.log(piErr ? `  absent (expected): ${piErr.message}` : "  already present");
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
