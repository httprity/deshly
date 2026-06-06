import { supabaseAdmin } from "@/lib/supabase";

// ============================================================
// DESHLY — signals lib (Stage 1)
// Handle generation + signal logging. Additive; imported by routes.
// ============================================================

// Unambiguous alphabet (no 0/O/1/I/L) for human-readable handles.
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

function randomCode(len = 4): string {
  let out = "";
  for (let i = 0; i < len; i++) {
    out += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  }
  return out;
}

/**
 * Generate a unique brand handle like "DESHLY-7K3Q".
 * Retries on the rare collision. Returns the handle string.
 */
export async function generateBrandHandle(maxTries = 6): Promise<string> {
  for (let i = 0; i < maxTries; i++) {
    const handle = `DESHLY-${randomCode(4)}`;
    const { data, error } = await supabaseAdmin
      .from("brand_voices")
      .select("id")
      .eq("brand_handle", handle)
      .maybeSingle();
    // If no row uses it (and no error), it's free.
    if (!error && !data) return handle;
  }
  // Fallback: longer code to virtually guarantee uniqueness.
  return `DESHLY-${randomCode(6)}`;
}

/**
 * Resolve a brand handle to its brand_voice row.
 * Returns { id, voice_profile, brand_handle } or null.
 * Case-insensitive, trims, tolerates a missing "DESHLY-" prefix.
 */
export async function resolveBrandHandle(rawHandle: string) {
  if (!rawHandle) return null;
  let h = rawHandle.trim().toUpperCase();
  if (!h.startsWith("DESHLY-")) {
    // allow user to type just "7K3Q"
    h = `DESHLY-${h.replace(/^DESHLY-?/, "")}`;
  }
  const { data, error } = await supabaseAdmin
    .from("brand_voices")
    .select("id, voice_profile, brand_handle")
    .eq("brand_handle", h)
    .maybeSingle();
  if (error || !data) return null;
  return data;
}

// ---- Signal taxonomy: action → quality weight -------------------
// Strong positive = user acted; negative = output rejected/ignored.
const SIGNAL_WEIGHTS: Record<string, number> = {
  copied: 4,
  used: 4,
  edited: 3,
  selected: 3,
  generated: 3,
  preference: 2,
  recommended: 0,
  feedback: -1,
  ignored: -1,
  regenerated: -1,
  rejected: -2,
};

export type SignalAction =
  | "recommended"
  | "selected"
  | "generated"
  | "copied"
  | "used"
  | "edited"
  | "preference"
  | "feedback"
  | "regenerated"
  | "rejected"
  | "ignored";

export interface SignalInput {
  brandVoiceId?: string | null;
  brandHandle?: string | null;
  productDescription?: string | null;
  price?: string | null;
  clusterId?: string | null;
  action: SignalAction;
  recommendationScore?: number | null;
  fitTier?: string | null;
  feedbackTag?: string | null;
}

/**
 * Read back a brand's accumulated preference/feedback tags and return a
 * short human summary + the raw tag counts. Used for the honest
 * "Deshly is learning..." line. Returns null if no tags yet.
 */
export async function summarizeBrandPreferences(
  brandVoiceId: string
): Promise<{ summary: string; tags: Record<string, number> } | null> {
  try {
    const { data, error } = await supabaseAdmin
      .from("user_signals")
      .select("feedback_tag")
      .eq("brand_voice_id", brandVoiceId)
      .not("feedback_tag", "is", null)
      .limit(500);

    if (error || !data || data.length === 0) return null;

    const counts: Record<string, number> = {};
    for (const row of data) {
      const t = (row as any).feedback_tag as string;
      if (t) counts[t] = (counts[t] || 0) + 1;
    }
    if (Object.keys(counts).length === 0) return null;

    // Map raw tags to human words for the summary
    const LABELS: Record<string, string> = {
      more_emotional: "emotional",
      more_premium: "premium",
      more_bangla: "Bangla-English",
      too_formal: "less formal",
      too_generic: "more distinctive",
    };

    // Take the most-clicked preference tags (positive direction first)
    const positiveOrder = ["more_emotional", "more_premium", "more_bangla", "too_formal", "too_generic"];
    const chosen = positiveOrder
      .filter((t) => counts[t])
      .sort((a, b) => counts[b] - counts[a])
      .map((t) => LABELS[t])
      .filter(Boolean);

    if (chosen.length === 0) return { summary: "", tags: counts };

    const list =
      chosen.length === 1
        ? chosen[0]
        : chosen.slice(0, -1).join(", ") + " and " + chosen[chosen.length - 1];

    return {
      summary: `Deshly is learning this brand prefers ${list} campaigns.`,
      tags: counts,
    };
  } catch (e) {
    console.error("summarizeBrandPreferences failed (non-fatal):", e);
    return null;
  }
}

/**
 * Build a compact preference-context string for the GENERATION prompt.
 * Reads this brand's accumulated signals and turns them into honest guidance:
 *   - which markets they actually act on (copied/generated/used)
 *   - which feedback tags they've given (too_formal, more_emotional, etc.)
 *   - whether they tend to edit captions (signal that defaults miss them)
 * Returns "" if there's not enough history — so it never fabricates learning.
 */
export async function summarizeForGeneration(
  brandVoiceId: string
): Promise<string> {
  try {
    const { data, error } = await supabaseAdmin
      .from("user_signals")
      .select("action, cluster_id, feedback_tag, signal_weight")
      .eq("brand_voice_id", brandVoiceId)
      .limit(800);

    if (error || !data || data.length === 0) return "";

    // Tally feedback tags
    const tagCounts: Record<string, number> = {};
    // Tally markets actually acted on (positive weight actions)
    const marketCounts: Record<string, number> = {};
    let editCount = 0;

    for (const r of data as any[]) {
      if (r.feedback_tag) tagCounts[r.feedback_tag] = (tagCounts[r.feedback_tag] || 0) + 1;
      if (r.action === "edited") editCount++;
      if (
        ["copied", "used", "generated", "selected"].includes(r.action) &&
        r.cluster_id
      ) {
        marketCounts[r.cluster_id] = (marketCounts[r.cluster_id] || 0) + 1;
      }
    }

    const TAG_GUIDANCE: Record<string, string> = {
      more_emotional: "lean more emotional",
      more_premium: "lean more premium/restrained",
      more_bangla: "use more Bangla-English mixing",
      too_formal: "be less formal",
      too_generic: "be more distinctive and specific",
    };

    const parts: string[] = [];

    const tagGuides = Object.entries(tagCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([t]) => TAG_GUIDANCE[t])
      .filter(Boolean);
    if (tagGuides.length) {
      parts.push(`This brand has previously asked to: ${tagGuides.join(", ")}.`);
    }

    const topMarkets = Object.entries(marketCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([id]) => id);
    if (topMarkets.length) {
      parts.push(`They have acted on these markets before: ${topMarkets.join(", ")}.`);
    }

    if (editCount >= 2) {
      parts.push(
        "They tend to edit generated captions — push for sharper, more specific, less templated copy."
      );
    }

    if (parts.length === 0) return "";

    return `BRAND HISTORY (use as soft guidance, do not contradict the brand voice):\n${parts.join(
      " "
    )}`;
  } catch (e) {
    console.error("summarizeForGeneration failed (non-fatal):", e);
    return "";
  }
}

export async function logSignals(signals: SignalInput[]): Promise<void> {
  if (!signals || signals.length === 0) return;
  try {
    const rows = signals.map((s) => ({
      brand_voice_id: s.brandVoiceId || null,
      brand_handle: s.brandHandle || null,
      product_description: s.productDescription || null,
      price: s.price || null,
      cluster_id: s.clusterId || null,
      action: s.action,
      signal_weight: SIGNAL_WEIGHTS[s.action] ?? 0,
      recommendation_score: s.recommendationScore ?? null,
      fit_tier: s.fitTier ?? null,
      feedback_tag: s.feedbackTag ?? null,
    }));
    await supabaseAdmin.from("user_signals").insert(rows);
  } catch (e) {
    // Swallow — never let logging failure surface to the user.
    console.error("logSignals failed (non-fatal):", e);
  }
}