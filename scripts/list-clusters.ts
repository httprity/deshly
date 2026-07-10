// READ-ONLY. List diaspora clusters (London/Toronto) to pick a valid clusterId.
import { supabaseAdmin } from "@/lib/supabase";

async function main() {
  const { data, error } = await supabaseAdmin
    .from("clusters")
    .select("id, city, country, segment_type, age_band, estimated_size");
  if (error || !data) {
    console.error("query failed:", error?.message);
    return;
  }
  const hits = data.filter((c: any) => {
    const city = (c.city || "").toLowerCase();
    return city.includes("london") || city.includes("toronto");
  });
  console.log(`clusters in London/Toronto (${hits.length}):`);
  for (const c of hits) {
    console.log(`  ${c.id}  | city=${c.city} country=${c.country} segment=${c.segment_type} age=${c.age_band} size=${c.estimated_size}`);
  }
}
main().catch((e) => console.error(e));
