import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET() {
  try {
    const [brands, brandVoices, clusters, campaigns, ingestionLogs] = await Promise.all([
      supabaseAdmin.from("brands").select("*", { count: "exact", head: true }),
      supabaseAdmin.from("brand_voices").select("*", { count: "exact", head: true }),
      supabaseAdmin.from("clusters").select("*", { count: "exact", head: true }),
      supabaseAdmin.from("campaigns").select("*", { count: "exact", head: true }),
      supabaseAdmin.from("ingestion_logs").select("*", { count: "exact", head: true }),
    ]);

    return NextResponse.json({
      status: {
        brands: brands.count ?? 0,
        brandVoices: brandVoices.count ?? 0,
        clusters: clusters.count ?? 0,
        campaigns: campaigns.count ?? 0,
        ingestionLogs: ingestionLogs.count ?? 0,
      },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}