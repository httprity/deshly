import { NextRequest, NextResponse } from "next/server";
import { resolveBrandHandle, logSignals, summarizeBrandPreferences } from "@/lib/signals";
import type { SignalInput } from "@/lib/signals";

// ============================================================
// DESHLY — brand/signals endpoint (Stage 1 wiring)
// Jobs, chosen by the "op" field:
//   op: "resolve"      → look up a brand by handle, return its id + handle
//   op: "log"          → write client-side signals (copied / generated / etc.)
//   op: "preferences"  → summarize a brand's accumulated preferences
// Kept in ONE route to avoid adding several tiny files.
//
// NOTE: a Next.js route file may ONLY export HTTP handlers (POST, GET, …)
// and Next config constants. Never export helpers/types from here — those
// live in src/lib/signals.ts and are imported above.
// ============================================================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const op = body?.op;

    // ---- Resolve a brand handle to its voice id ----
    if (op === "resolve") {
      const handle = body?.handle;
      if (!handle || typeof handle !== "string") {
        return NextResponse.json({ error: "handle required" }, { status: 400 });
      }
      const brand = await resolveBrandHandle(handle);
      if (!brand) {
        return NextResponse.json(
          { success: false, error: "No brand found for that handle" },
          { status: 404 }
        );
      }
      return NextResponse.json({
        success: true,
        brandVoiceId: brand.id,
        brandHandle: brand.brand_handle,
      });
    }

    // ---- Log one or more signals from the client ----
    if (op === "log") {
      const signals = body?.signals;
      if (!Array.isArray(signals) || signals.length === 0) {
        return NextResponse.json({ error: "signals array required" }, { status: 400 });
      }
      // Only keep allowed fields; never trust arbitrary client input
      const clean: SignalInput[] = signals.map((s: any) => ({
        brandVoiceId: s.brandVoiceId || null,
        brandHandle: s.brandHandle || null,
        productDescription: s.productDescription || null,
        price: s.price || null,
        clusterId: s.clusterId || null,
        action: s.action,
        recommendationScore: typeof s.recommendationScore === "number" ? s.recommendationScore : null,
        fitTier: s.fitTier || null,
        feedbackTag: s.feedbackTag || null,
      }));
      await logSignals(clean);
      return NextResponse.json({ success: true });
    }

    // ---- Summarize a brand's accumulated preferences (honest "learning" line) ----
    if (op === "preferences") {
      const brandVoiceId = body?.brandVoiceId;
      if (!brandVoiceId) {
        return NextResponse.json({ error: "brandVoiceId required" }, { status: 400 });
      }
      const result = await summarizeBrandPreferences(brandVoiceId);
      return NextResponse.json({ success: true, preferences: result });
    }

    return NextResponse.json({ error: "unknown op" }, { status: 400 });
  } catch (error: any) {
    console.error("brand-signals route error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}