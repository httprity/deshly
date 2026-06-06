"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Sparkles,
  Loader2,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Wand2,
  X,
} from "lucide-react";
import type { BrandVoiceProfile } from "@/lib/types";
import { ProductShell } from "@/components/ProductShell";

const TONE_OPTIONS = [
  "Elegant, calm, premium",
  "Friendly, warm, family-focused",
  "Bold, trendy, hype-driven",
];

// Q: how strongly to weight brand voice vs market localization
const STYLE_PRIORITY_OPTIONS = [
  { value: "balanced_brand_and_market", label: "Balance brand voice and market tone", hint: "Recommended" },
  { value: "brand_voice_first", label: "Keep my brand voice strongest", hint: "" },
  { value: "market_first", label: "Adapt strongly for each market", hint: "" },
  { value: "custom", label: "Something else", hint: "" },
];

const AVOID_OPTIONS = [
  "Too many emojis",
  "Too much Bangla",
  "Too much English",
  "Pushy sales language",
  "Too formal",
  "Too generic",
  "Discount-heavy tone",
  "Overpromising",
  "Weak CTA",
  "Long captions",
  "Trendy slang",
  "Religious wording",
  "Luxury exaggeration",
];

// Universal "customers care about" chips — correct for ANY business type.
const CARE_UNIVERSAL = [
  "Price",
  "Quality",
  "Trust",
  "Fast delivery",
  "Convenience",
  "Premium feel",
  "Giftability",
  "Limited stock",
  "Reviews/social proof",
  "Original photos",
  "Easy ordering",
  "Value for money",
];

// Business categories for the picker.
const CATEGORY_OPTIONS = [
  "Fashion",
  "Food",
  "Beauty",
  "Electronics",
  "Home Decor",
  "Books",
  "Services",
  "Other",
];

// Full category-specific "customers care about" sets.
const CARE_BY_CATEGORY: Record<string, string[]> = {
  Fashion: [
    "Fabric quality", "Fit", "Comfort", "Modesty", "Trendy design",
    "Occasion wear", "Size availability", "Color options", "Styling versatility",
  ],
  Food: [
    "Taste", "Freshness", "Portion size", "Hygiene", "Fast delivery",
    "Hot delivery", "Combo deals", "Family sharing", "Late-night cravings",
    "Party orders", "Ingredients", "Packaging", "Location convenience",
  ],
  Beauty: [
    "Skin concern", "Ingredients", "Safety", "Before-after proof", "Reviews",
    "Authenticity", "Dermatologist/trust claims", "Skin type match",
    "Routine fit", "Gentle formula", "Premium feel",
  ],
  Electronics: [
    "Durability", "Warranty", "Specs", "Battery life", "Compatibility",
    "Price-value", "After-sales support", "Authenticity", "Ease of use", "Performance",
  ],
  "Home Decor": [
    "Design", "Material quality", "Space fit", "Durability", "Comfort",
    "Premium look", "Easy maintenance", "Customization", "Delivery/setup", "Giftability",
  ],
  Books: [
    "Topic relevance", "Design/aesthetic", "Price", "Giftability",
    "Educational value", "Collectibility", "Paper quality", "Local availability",
  ],
  Services: [
    "Trust", "Expertise", "Portfolio", "Speed", "Pricing clarity",
    "Reliability", "Communication", "Results", "Convenience", "Support",
  ],
  Other: [
    "Design", "Quality", "Convenience", "Trust", "Experience", "Results", "Custom need",
  ],
};

export default function BrandDNAPage() {
  const [brandName, setBrandName] = useState("");
  const [captions, setCaptions] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<BrandVoiceProfile | null>(null);
  const [brandVoiceId, setBrandVoiceId] = useState<string | null>(null);
  const [brandHandle, setBrandHandle] = useState<string | null>(null);

  // Refine flow (optional)
  const [refineModalOpen, setRefineModalOpen] = useState(false);
  const [refineStep, setRefineStep] = useState(1);
  const [tone, setTone] = useState("");
  const [stylePriority, setStylePriority] = useState("balanced_brand_and_market");
  const [avoid, setAvoid] = useState<string[]>([]);
  const [customAvoid, setCustomAvoid] = useState("");
  const [cares, setCares] = useState<string[]>([]);
  const [customCare, setCustomCare] = useState("");
  const [bizCategory, setBizCategory] = useState("");
  const [corrections, setCorrections] = useState("");
  const [savingRefine, setSavingRefine] = useState(false);
  const [refineSaved, setRefineSaved] = useState(false);

  async function handleExtract() {
    setLoading(true);
    setError(null);
    setProfile(null);
    setRefineModalOpen(false);
    setRefineStep(1);
    setRefineSaved(false);
    setTone("");
    setStylePriority("balanced_brand_and_market");
    setAvoid([]);
    setCustomAvoid("");
    setCares([]);
    setCustomCare("");
    setBizCategory("");
    setCorrections("");

    try {
      const res = await fetch("/api/extract-brand-voice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ captions, brandName }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to extract brand voice");

      setProfile(data.profile);
      setBrandVoiceId(data.brandVoiceId);
      setBrandHandle(data.brandHandle || null);

      // Category resolution: saved profile category → generator's last category
      // → (else the modal picker asks). Pre-fill so we don't re-ask needlessly.
      const savedCat =
        data.profile?.business_category ||
        (typeof window !== "undefined" ? localStorage.getItem("currentProductCategory") : "") ||
        "";
      if (savedCat) setBizCategory(savedCat);

      if (typeof window !== "undefined") {
        localStorage.setItem("currentBrandVoiceId", data.brandVoiceId);
        localStorage.setItem("currentBrandName", data.brandName);
        if (data.brandHandle) {
          localStorage.setItem("currentBrandHandle", data.brandHandle);
        }
      }
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function saveRefinements() {
    if (!brandVoiceId) return;
    setSavingRefine(true);
    setError(null);
    // Fold custom free-text entries into the selected chip arrays
    const finalAvoid = [...avoid];
    if (customAvoid.trim()) finalAvoid.push(customAvoid.trim());
    const finalCares = [...cares];
    if (customCare.trim()) finalCares.push(customCare.trim());
    try {
      const res = await fetch("/api/refine-brand-voice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brandVoiceId,
          tone: tone || undefined,
          stylePriority: stylePriority || undefined,
          avoid: finalAvoid.length ? finalAvoid : undefined,
          cares: finalCares.length ? finalCares : undefined,
          category: bizCategory || undefined,
          corrections: corrections.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save refinements");
      if (data.profile) setProfile(data.profile);
      setRefineSaved(true);
      setRefineModalOpen(false);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSavingRefine(false);
    }
  }

  // Close refine modal on Escape; lock scroll while open.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setRefineModalOpen(false);
    }
    if (refineModalOpen) {
      document.addEventListener("keydown", onKey);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [refineModalOpen]);

  // Confidence score: based on caption volume + whether the user refined.
  function confidence(): { pct: number; note: string } {
    const captionCount = countCaptions(captions);
    let base = Math.min(70, 20 + captionCount * 5); // 10 captions ≈ 70
    const refined = (profile as any)?.user_refinements?.refined_at;
    if (refined) base = Math.min(95, base + 18);
    const pct = Math.max(20, Math.round(base));
    const bits: string[] = [`${captionCount} captions`];
    if (refined) bits.push("your refinements");
    return {
      pct,
      note:
        pct >= 80
          ? `Based on ${bits.join(" + ")}. Strong personalization.`
          : `Based on ${bits.join(" + ")}. Add more captions or refine for sharper output.`,
    };
  }

  function toggle(list: string[], setList: (v: string[]) => void, val: string) {
    setList(list.includes(val) ? list.filter((x) => x !== val) : [...list, val]);
  }

  return (
    <ProductShell
      stepLabel="STEP 01 — BRAND DNA"
      pageTitle={
        <>
          Teach Deshly{" "}
          <span className="italic text-terracotta">your voice</span>.
        </>
      }
      pageSubtitle={
        <>
          Paste 10 of your recent Instagram or Facebook captions. Deshly reads how your brand actually talks — its personality, words it repeats, vibe, and unwritten rules — and uses that as the personalization layer for every campaign you generate.
        </>
      }
    >
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6">
        {/* ============================================================
            INPUT PANEL
            ============================================================ */}
        <div className="bg-ink rounded-2xl sm:rounded-3xl p-5 sm:p-8 lg:p-10 border border-cream/5 relative overflow-hidden">
          <div
            className="absolute top-0 left-0 right-0 h-px"
            style={{
              background:
                "linear-gradient(90deg, transparent, rgba(213, 97, 62, 0.4), transparent)",
            }}
          />

          <div className="relative space-y-7">
            <div className="flex items-center justify-between">
              <div className="text-[10px] uppercase tracking-[0.2em] text-brass">
                INPUT · YOUR BRAND
              </div>
              <div className="font-mono text-[10px] text-cream/30">01 / 02</div>
            </div>

            {/* Brand Name */}
            <label className="block">
              <div className="text-[11px] uppercase tracking-[0.15em] text-cream/50 mb-3">
                Brand Name
              </div>
              <input
                type="text"
                value={brandName}
                onChange={(e) => setBrandName(e.target.value)}
                placeholder="Aranya, Pohela, Tasnia Modesty..."
                className="w-full bg-ink-soft border border-cream/10 rounded-xl px-5 py-4 text-base text-cream placeholder:text-cream/25 outline-none focus:border-terracotta/50 focus:bg-ink-deep transition-all"
              />
            </label>

            {/* Captions */}
            <label className="block">
              <div className="flex items-baseline justify-between mb-3">
                <div className="text-[11px] uppercase tracking-[0.15em] text-cream/50">
                  Your Captions
                </div>
                <div className="text-[10px] text-cream/30 font-mono">
                  One caption per line — or blank lines between
                </div>
              </div>
              <textarea
                value={captions}
                onChange={(e) => setCaptions(e.target.value)}
                rows={16}
                placeholder="ঈদের আগেই হাতে আসছে নতুন কালেকশন 🌙&#10;&#10;The art of slow fashion. Each piece, hand-stitched...&#10;&#10;..."
                className="w-full bg-ink-soft border border-cream/10 rounded-xl px-5 py-4 text-sm leading-relaxed text-cream placeholder:text-cream/25 outline-none focus:border-terracotta/50 focus:bg-ink-deep transition-all font-mono resize-none"
              />
              <div className="text-[10px] text-cream/40 mt-2 font-mono flex items-center justify-between">
                <span>{captions.length} characters</span>
                <span>{countCaptions(captions)} captions detected</span>
              </div>
            </label>

            {/* CTA */}
            <button
              onClick={handleExtract}
              disabled={loading || !captions.trim()}
              className="w-full bg-gradient-to-r from-terracotta to-terracotta-deep text-cream rounded-full py-5 px-6 font-medium text-sm flex items-center justify-center gap-3 transition-all hover:shadow-[0_0_40px_rgba(213,97,62,0.35)] disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:shadow-none"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Reading your voice...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Extract Brand DNA
                </>
              )}
            </button>

            {error && (
              <div className="p-4 bg-red-950/40 border border-red-800/40 rounded-xl flex items-start gap-3">
                <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-red-300">{error}</div>
              </div>
            )}
          </div>
        </div>

        {/* ============================================================
            OUTPUT PANEL
            ============================================================ */}
        <div className="bg-gradient-to-br from-ink-soft to-ink rounded-2xl sm:rounded-3xl p-5 sm:p-8 lg:p-10 border border-cream/5 min-h-[400px] sm:min-h-[600px] xl:min-h-[700px] relative overflow-hidden">
          <div
            className="absolute top-0 left-0 right-0 h-px"
            style={{
              background:
                "linear-gradient(90deg, transparent, rgba(184, 149, 106, 0.4), transparent)",
            }}
          />

          <div
            className="absolute pointer-events-none"
            style={{
              top: "20%",
              right: "-20%",
              width: "50%",
              height: "50%",
              background:
                "radial-gradient(circle at center, rgba(184, 149, 106, 0.08), transparent 60%)",
              filter: "blur(60px)",
            }}
          />

          <div className="relative">
            <div className="flex items-center justify-between mb-8">
              <div className="text-[10px] uppercase tracking-[0.2em] text-brass">
                OUTPUT · BRAND PROFILE
              </div>
              {profile ? (
                <div className="flex items-center gap-1.5 text-[10px] text-green-400">
                  <CheckCircle2 className="w-3 h-3" />
                  SAVED
                </div>
              ) : (
                <div className="font-mono text-[10px] text-cream/30">02 / 02</div>
              )}
            </div>

            {/* Empty state */}
            {!profile && !loading && (
              <div className="flex flex-col items-center justify-center h-[320px] sm:h-[420px] xl:h-[520px] text-center">
                <div className="relative mb-8">
                  <div className="w-20 h-20 rounded-full border border-brass/20 flex items-center justify-center relative">
                    <Sparkles className="w-7 h-7 text-brass/40" strokeWidth={1.5} />
                    <div className="absolute inset-0 rounded-full border border-brass/10 animate-ping" />
                  </div>
                </div>
                <div className="font-serif italic text-3xl text-cream/35 mb-3">
                  Awaiting your voice
                </div>
                <div className="text-sm text-cream/30 max-w-xs leading-relaxed">
                  Paste your captions on the left. Watch Deshly read between the lines.
                </div>
              </div>
            )}

            {/* Loading state */}
            {loading && (
              <div className="flex flex-col items-center justify-center h-[320px] sm:h-[420px] xl:h-[520px]">
                <div className="relative mb-8">
                  <Loader2 className="w-12 h-12 animate-spin text-terracotta" strokeWidth={1.5} />
                  <div
                    className="absolute inset-0 rounded-full animate-ping"
                    style={{
                      background:
                        "radial-gradient(circle, rgba(213, 97, 62, 0.2), transparent 70%)",
                    }}
                  />
                </div>
                <div className="font-serif italic text-2xl text-cream/70 mb-2">
                  Reading your voice...
                </div>
                <div className="text-xs text-cream/40 font-mono">
                  Multi-LLM extraction in progress
                </div>
              </div>
            )}

            {/* Profile output */}
            {profile && (
              <div className="space-y-6 text-sm">
                {/* Voice Strength — hero metric */}
                <div className="p-6 bg-ink-deep rounded-2xl border border-cream/8 relative overflow-hidden">
                  <div
                    className="absolute inset-0 pointer-events-none"
                    style={{
                      background:
                        "radial-gradient(circle at 100% 50%, rgba(213, 97, 62, 0.08), transparent 60%)",
                    }}
                  />
                  <div className="relative">
                    <div className="text-[10px] uppercase tracking-[0.18em] text-brass mb-3">
                      Voice Strength
                    </div>
                    <div className="flex items-baseline gap-3">
                      <div className="font-serif text-5xl sm:text-6xl xl:text-7xl text-cream leading-none">
                        {profile.voice_strength.score}
                      </div>
                      <div className="text-cream/40 text-lg">/ 100</div>
                    </div>
                    <div className="mt-4 h-1 bg-cream/5 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-terracotta to-brass rounded-full transition-all duration-1000"
                        style={{
                          width: `${profile.voice_strength.score}%`,
                        }}
                      />
                    </div>
                    <div className="text-xs text-cream/55 italic mt-4 leading-relaxed">
                      &ldquo;{profile.voice_strength.explanation}&rdquo;
                    </div>
                  </div>
                </div>

                {/* CONFIDENCE SCORE */}
                {(() => {
                  const c = confidence();
                  return (
                    <div className="p-4 bg-ink-deep border border-cream/8 rounded-xl">
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-[10px] uppercase tracking-[0.18em] text-brass">
                          Brand DNA Confidence
                        </div>
                        <div className="font-mono text-sm text-cream">{c.pct}%</div>
                      </div>
                      <div className="h-1 bg-cream/5 rounded-full overflow-hidden mb-2">
                        <div
                          className="h-full bg-gradient-to-r from-brass to-terracotta rounded-full transition-all duration-700"
                          style={{ width: `${c.pct}%` }}
                        />
                      </div>
                      <div className="text-[11px] text-cream/45 leading-relaxed">{c.note}</div>
                    </div>
                  );
                })()}

                {/* Brand Personality */}
                <Section title="Brand Personality">
                  <div className="flex flex-wrap gap-2 mb-3">
                    {profile.brand_personality.traits.map((t) => (
                      <span
                        key={t}
                        className="px-3 py-1.5 bg-terracotta/15 text-terracotta border border-terracotta/20 rounded-full text-xs"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                  <div className="text-cream/65 text-sm italic leading-relaxed">
                    &ldquo;{profile.brand_personality.summary}&rdquo;
                  </div>
                </Section>

                {/* How They Talk */}
                <Section title="How They Talk">
                  <div className="space-y-3">
                    <div>
                      <div className="text-[10px] uppercase tracking-wider text-brass/80 mb-1.5">
                        Style
                      </div>
                      <div className="text-cream/75 text-sm leading-relaxed">
                        {profile.how_they_talk.style}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] uppercase tracking-wider text-brass/80 mb-1.5">
                        Feeling
                      </div>
                      <div className="text-cream/75 text-sm leading-relaxed">
                        {profile.how_they_talk.feeling}
                      </div>
                    </div>
                  </div>
                </Section>

                {/* They Never */}
                <Section title="They Never">
                  <ul className="space-y-2 text-sm text-cream/65 leading-relaxed">
                    {profile.they_never.map((t, i) => (
                      <li key={i} className="flex gap-2.5">
                        <span className="text-terracotta flex-shrink-0">—</span>
                        <span>{t}</span>
                      </li>
                    ))}
                  </ul>
                </Section>

                {/* ============================================================
                    ADVANCED — collapsed by default. "Here is your brand voice",
                    not "here is a JSON profile". Each renders only if present.
                    ============================================================ */}
                <div className="space-y-2 pt-1">
                  <div className="text-[9px] uppercase tracking-[0.2em] text-cream/30 px-1">
                    Advanced details
                  </div>

                  {profile.words_they_repeat?.length > 0 && (
                    <Collapsible title="Words They Repeat">
                      <div className="flex flex-wrap gap-2">
                        {profile.words_they_repeat.map((w) => (
                          <span
                            key={w}
                            className="px-3 py-1.5 bg-cream/5 border border-cream/10 rounded-full text-xs text-cream/80"
                          >
                            {w}
                          </span>
                        ))}
                      </div>
                    </Collapsible>
                  )}

                  {profile.what_they_care_about?.length > 0 && (
                    <Collapsible title="What They Care About">
                      <div className="flex flex-wrap gap-2">
                        {profile.what_they_care_about.map((t) => (
                          <span
                            key={t}
                            className="px-3 py-1.5 bg-brass/15 text-brass border border-brass/25 rounded-full text-xs"
                          >
                            {t}
                          </span>
                        ))}
                      </div>
                    </Collapsible>
                  )}

                  {profile.their_brand_vibe && (
                    <Collapsible title="Brand Vibe">
                      <div className="p-4 bg-ink border border-cream/8 rounded-xl mb-3">
                        <div className="text-[10px] uppercase tracking-wider text-brass/80 mb-1.5">
                          Identity
                        </div>
                        <div className="font-serif italic text-lg text-cream leading-tight">
                          {profile.their_brand_vibe.identity}
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] uppercase tracking-wider text-brass/80 mb-1.5">
                          How they treat their audience
                        </div>
                        <div className="text-cream/65 text-sm leading-relaxed italic">
                          {profile.their_brand_vibe.audience_relationship}
                        </div>
                      </div>
                    </Collapsible>
                  )}

                  {/* Advanced rulebook fields — surfaced from voice_profile if present */}
                  {(() => {
                    const gi = (profile as any).generation_instructions;
                    const hasGI =
                      gi &&
                      (gi.caption_instruction ||
                        gi.whatsapp_instruction ||
                        gi.image_prompt_instruction ||
                        gi.market_adaptation_instruction ||
                        gi.diaspora_adaptation_instruction);
                    if (!hasGI) return null;
                    const rows: [string, string][] = [
                      ["Caption", gi.caption_instruction],
                      ["WhatsApp", gi.whatsapp_instruction],
                      ["Image prompt", gi.image_prompt_instruction],
                      ["Market adaptation", gi.market_adaptation_instruction],
                      ["Diaspora adaptation", gi.diaspora_adaptation_instruction],
                    ].filter(([, v]) => Boolean(v)) as [string, string][];
                    return (
                      <Collapsible title="Generation Instructions">
                        <div className="space-y-2.5">
                          {rows.map(([label, val]) => (
                            <div key={label}>
                              <div className="text-[9px] uppercase tracking-wider text-brass/70 mb-1">
                                {label}
                              </div>
                              <div className="text-[12px] text-cream/70 leading-relaxed">{val}</div>
                            </div>
                          ))}
                        </div>
                      </Collapsible>
                    );
                  })()}

                  {Array.isArray((profile as any).trust_requirements) &&
                    (profile as any).trust_requirements.length > 0 && (
                      <Collapsible title="Trust Requirements">
                        <ul className="space-y-1.5 text-[12px] text-cream/70 leading-relaxed">
                          {(profile as any).trust_requirements.map((t: string, i: number) => (
                            <li key={i} className="flex gap-2">
                              <span className="text-brass flex-shrink-0">·</span>
                              <span>{t}</span>
                            </li>
                          ))}
                        </ul>
                      </Collapsible>
                    )}

                  {(profile as any).product_framing?.usual_angle && (
                    <Collapsible title="Product Framing">
                      <div className="text-[12px] text-cream/70 leading-relaxed">
                        {(profile as any).product_framing.usual_angle}
                      </div>
                    </Collapsible>
                  )}

                  {(profile as any).conversion_style &&
                    ((profile as any).conversion_style.cta_style ||
                      (profile as any).conversion_style.urgency_level) && (
                      <Collapsible title="Conversion Style">
                        <div className="flex flex-wrap gap-2">
                          {(profile as any).conversion_style.cta_style && (
                            <span className="px-3 py-1.5 bg-cream/5 border border-cream/10 rounded-full text-xs text-cream/80">
                              CTA: {(profile as any).conversion_style.cta_style}
                            </span>
                          )}
                          {(profile as any).conversion_style.urgency_level && (
                            <span className="px-3 py-1.5 bg-cream/5 border border-cream/10 rounded-full text-xs text-cream/80">
                              Urgency: {(profile as any).conversion_style.urgency_level}
                            </span>
                          )}
                        </div>
                      </Collapsible>
                    )}
                </div>

                {/* ============================================================
                    COMPACT "BRAND DNA READY" CARD → opens stepped modal
                    ============================================================ */}
                {!refineSaved ? (
                  <div className="p-4 bg-ink-deep border border-cream/10 rounded-xl flex items-center justify-between gap-3 flex-wrap">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 text-[13px] text-cream/90 font-medium">
                        <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0" />
                        Brand DNA ready
                      </div>
                      <div className="text-[12px] text-cream/55 mt-1">
                        Want to refine it for better campaigns?
                      </div>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <button
                        onClick={() => setRefineSaved(true)}
                        className="text-[12px] px-3 py-2 rounded-full border border-cream/15 text-cream/70 hover:border-cream/30 transition-all"
                      >
                        Skip for now
                      </button>
                      <button
                        onClick={() => { setRefineStep(1); setRefineModalOpen(true); }}
                        className="text-[12px] px-4 py-2 rounded-full border border-terracotta/40 bg-terracotta/10 text-terracotta hover:bg-terracotta/20 transition-all font-medium"
                      >
                        Refine Brand DNA
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="p-3 bg-green-950/20 border border-green-800/30 rounded-xl flex items-center gap-2 text-[12px] text-green-300">
                    <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
                    Brand DNA confirmed. Future campaigns will follow this.
                  </div>
                )}

                {/* Brand handle — save to return later (single, deduped) */}
                {brandHandle && (
                  <div className="p-4 bg-ink-deep border border-brass/25 rounded-xl">
                    <div className="text-[10px] uppercase tracking-[0.18em] text-brass mb-1.5">
                      Your brand handle — save this
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <div className="font-mono text-lg text-cream tracking-wider">
                        {brandHandle}
                      </div>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(brandHandle);
                        }}
                        className="text-[11px] text-cream/55 hover:text-terracotta transition-colors flex items-center gap-1"
                      >
                        Copy
                      </button>
                    </div>
                    <div className="text-[11px] text-cream/45 mt-2 leading-relaxed">
                      Enter this on the Generator to return to your brand and its history on any device.
                    </div>
                  </div>
                )}

                {/* Continue CTA */}
                {brandVoiceId && (
                  <div className="pt-4">
                    <Link
                      href="/generator"
                      className="group flex items-center justify-between bg-gradient-to-r from-terracotta to-terracotta-deep text-cream rounded-full py-5 px-7 font-medium text-sm transition-all hover:shadow-[0_0_40px_rgba(213,97,62,0.35)]"
                    >
                      <div className="flex items-center gap-3">
                        <Wand2 className="w-4 h-4" />
                        <span>Continue to Campaign Generator</span>
                      </div>
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </Link>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ============================================================
          STEPPED REFINE MODAL — centered, 3 steps, premium dark
          ============================================================ */}
      {refineModalOpen && (
        <>
          <div
            onClick={() => setRefineModalOpen(false)}
            className="fixed inset-0 bg-void/80 backdrop-blur-sm z-[60]"
          />
          <div className="fixed inset-0 z-[61] flex items-stretch sm:items-center justify-center p-0 sm:p-6 pointer-events-none">
            <div className="bg-ink border border-cream/10 w-full sm:max-w-lg sm:rounded-2xl h-full sm:h-auto sm:max-h-[88vh] overflow-y-auto pointer-events-auto relative flex flex-col">
              {/* Header with step indicator */}
              <div className="sticky top-0 bg-ink/95 backdrop-blur-xl border-b border-cream/8 px-5 py-4 flex items-center justify-between z-10">
                <div>
                  <div className="text-[10px] uppercase tracking-[0.18em] text-brass">
                    Refine Brand DNA
                  </div>
                  <div className="text-[11px] text-cream/45 mt-0.5">Step {refineStep} of 4</div>
                </div>
                <button
                  onClick={() => setRefineModalOpen(false)}
                  aria-label="Close"
                  className="w-9 h-9 rounded-lg border border-cream/10 flex items-center justify-center text-cream/60 hover:text-cream hover:bg-cream/5 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Progress bar */}
              <div className="h-1 bg-cream/5">
                <div
                  className="h-full bg-gradient-to-r from-brass to-terracotta transition-all duration-300"
                  style={{ width: `${(refineStep / 4) * 100}%` }}
                />
              </div>

              {/* Step content */}
              <div className="p-5 flex-1">
                {/* STEP 1 — Tone */}
                {refineStep === 1 && (
                  <div>
                    <div className="text-[14px] text-cream/90 font-medium mb-1">
                      Which sounds most like your brand?
                    </div>
                    <div className="text-[12px] text-cream/45 mb-4">
                      Pick the closest — this sets your overall voice.
                    </div>
                    <div className="flex flex-col gap-2">
                      {TONE_OPTIONS.map((t) => (
                        <button
                          key={t}
                          onClick={() => setTone(tone === t ? "" : t)}
                          className={`text-left text-[13px] px-4 py-3 rounded-xl border transition-all ${
                            tone === t
                              ? "border-terracotta bg-terracotta/10 text-cream"
                              : "border-cream/12 text-cream/65 hover:border-cream/30"
                          }`}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* STEP 2 — Style priority (brand voice vs market) */}
                {refineStep === 2 && (
                  <div>
                    <div className="text-[14px] text-cream/90 font-medium mb-1">
                      How should Deshly write your campaigns?
                    </div>
                    <div className="text-[12px] text-cream/45 mb-4">
                      This controls how much we adapt to each market vs stay in your voice.
                    </div>
                    <div className="flex flex-col gap-2">
                      {STYLE_PRIORITY_OPTIONS.map((o) => (
                        <button
                          key={o.value}
                          onClick={() => setStylePriority(o.value)}
                          className={`text-left text-[13px] px-4 py-3 rounded-xl border transition-all flex items-center justify-between gap-2 ${
                            stylePriority === o.value
                              ? "border-terracotta bg-terracotta/10 text-cream"
                              : "border-cream/12 text-cream/65 hover:border-cream/30"
                          }`}
                        >
                          <span>{o.label}</span>
                          {o.hint && (
                            <span className="text-[9px] uppercase tracking-[0.12em] text-brass flex-shrink-0">
                              {o.hint}
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* STEP 3 — Avoid */}
                {refineStep === 3 && (
                  <div>
                    <div className="text-[14px] text-cream/90 font-medium mb-1">
                      What should Deshly avoid?
                    </div>
                    <div className="text-[12px] text-cream/45 mb-4">
                      Select anything that doesn&apos;t fit your brand. These become hard rules.
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {AVOID_OPTIONS.map((a) => (
                        <button
                          key={a}
                          onClick={() => toggle(avoid, setAvoid, a)}
                          className={`text-[12px] px-3 py-2 rounded-full border transition-all ${
                            avoid.includes(a)
                              ? "border-terracotta bg-terracotta/10 text-cream"
                              : "border-cream/12 text-cream/60 hover:border-cream/30"
                          }`}
                        >
                          {a}
                        </button>
                      ))}
                    </div>
                    <input
                      type="text"
                      value={customAvoid}
                      onChange={(e) => setCustomAvoid(e.target.value)}
                      placeholder="Other — add your own rule…"
                      className="w-full mt-3 bg-ink-deep border border-cream/10 rounded-xl px-4 py-2.5 text-sm text-cream placeholder:text-cream/25 outline-none focus:border-terracotta/50 transition-all"
                    />
                  </div>
                )}

                {/* STEP 4 — Cares (universal + category) + free text */}
                {refineStep === 4 && (
                  <div>
                    <div className="text-[14px] text-cream/90 font-medium mb-1">
                      What do your customers care about?
                    </div>
                    <div className="text-[12px] text-cream/45 mb-4">
                      Pick a few. Optionally set your business type for tailored options.
                    </div>

                    {/* Universal chips */}
                    <div className="flex flex-wrap gap-2">
                      {CARE_UNIVERSAL.map((c) => (
                        <button
                          key={c}
                          onClick={() => toggle(cares, setCares, c)}
                          className={`text-[12px] px-3 py-2 rounded-full border transition-all ${
                            cares.includes(c)
                              ? "border-brass bg-brass/10 text-brass"
                              : "border-cream/12 text-cream/60 hover:border-cream/30"
                          }`}
                        >
                          {c}
                        </button>
                      ))}
                    </div>

                    {/* Category picker */}
                    <div className="mt-4">
                      <div className="text-[10px] text-cream/40 mb-2">
                        Business type <span className="text-cream/25">(optional)</span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {CATEGORY_OPTIONS.map((cat) => (
                          <button
                            key={cat}
                            onClick={() => setBizCategory(bizCategory === cat ? "" : cat)}
                            className={`text-[12px] px-3 py-2 rounded-full border transition-all ${
                              bizCategory === cat
                                ? "border-terracotta bg-terracotta/10 text-cream"
                                : "border-cream/12 text-cream/50 hover:border-cream/30"
                            }`}
                          >
                            {cat}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Category-specific chips */}
                    {bizCategory && (CARE_BY_CATEGORY[bizCategory] || []).length > 0 && (
                      <div className="mt-4">
                        <div className="text-[10px] text-brass/70 mb-2 uppercase tracking-[0.12em]">
                          For {bizCategory}
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {CARE_BY_CATEGORY[bizCategory].map((c) => (
                            <button
                              key={c}
                              onClick={() => toggle(cares, setCares, c)}
                              className={`text-[12px] px-3 py-2 rounded-full border transition-all ${
                                cares.includes(c)
                                  ? "border-brass bg-brass/10 text-brass"
                                  : "border-cream/12 text-cream/60 hover:border-cream/30"
                              }`}
                            >
                              {c}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Free-text correction */}
                    <div className="mt-4">
                      <div className="text-[10px] text-cream/40 mb-2">
                        Other — add a custom one (optional)
                      </div>
                      <input
                        type="text"
                        value={customCare}
                        onChange={(e) => setCustomCare(e.target.value)}
                        placeholder="e.g. Halal certified, eco-friendly…"
                        className="w-full bg-ink-deep border border-cream/10 rounded-xl px-4 py-2.5 text-sm text-cream placeholder:text-cream/25 outline-none focus:border-terracotta/50 transition-all"
                      />
                    </div>

                    <div className="mt-4">
                      <div className="text-[10px] text-cream/40 mb-2">
                        Anything Deshly got wrong? (optional)
                      </div>
                      <textarea
                        value={corrections}
                        onChange={(e) => setCorrections(e.target.value)}
                        rows={2}
                        placeholder="e.g. We're more playful than this suggests..."
                        className="w-full bg-ink-deep border border-cream/10 rounded-xl px-4 py-3 text-sm text-cream placeholder:text-cream/25 outline-none focus:border-terracotta/50 transition-all resize-none"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Footer controls */}
              <div className="sticky bottom-0 bg-ink/95 backdrop-blur-xl border-t border-cream/8 px-5 py-4 flex items-center justify-between gap-3">
                <button
                  onClick={() => {
                    if (refineStep > 1) setRefineStep(refineStep - 1);
                    else setRefineModalOpen(false);
                  }}
                  className="text-[12px] px-4 py-2.5 rounded-full border border-cream/15 text-cream/65 hover:border-cream/30 transition-all"
                >
                  {refineStep > 1 ? "Back" : "Cancel"}
                </button>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setRefineModalOpen(false)}
                    className="text-[12px] px-3 py-2.5 text-cream/45 hover:text-cream/70 transition-colors"
                  >
                    Skip
                  </button>
                  {refineStep < 4 ? (
                    <button
                      onClick={() => setRefineStep(refineStep + 1)}
                      className="text-[12px] px-5 py-2.5 rounded-full bg-gradient-to-r from-terracotta to-terracotta-deep text-cream font-medium transition-all hover:shadow-[0_0_30px_rgba(213,97,62,0.3)]"
                    >
                      Continue
                    </button>
                  ) : (
                    <button
                      onClick={saveRefinements}
                      disabled={savingRefine}
                      className="text-[12px] px-5 py-2.5 rounded-full bg-gradient-to-r from-terracotta to-terracotta-deep text-cream font-medium transition-all hover:shadow-[0_0_30px_rgba(213,97,62,0.3)] disabled:opacity-40 flex items-center gap-2"
                    >
                      {savingRefine ? (
                        <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving…</>
                      ) : (
                        "Save refinements"
                      )}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </>
      )}

    </ProductShell>
  );
}

// Reusable section block
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-[0.18em] text-brass/80 mb-3">
        {title}
      </div>
      {children}
    </div>
  );
}

// Collapsible advanced section — styled <details>, matches modal drawers.
function Collapsible({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <details className="bg-ink-deep border border-cream/8 rounded-xl group">
      <summary className="p-3.5 cursor-pointer text-[10px] uppercase tracking-[0.18em] text-brass/80 flex items-center justify-between list-none hover:bg-cream/[0.02] rounded-xl transition-colors">
        <span>{title}</span>
        <span className="text-terracotta group-open:rotate-180 transition-transform inline-block text-[10px]">▼</span>
      </summary>
      <div className="px-3.5 pb-3.5 pt-1">{children}</div>
    </details>
  );
}
function countCaptions(text: string): number {
  if (!text.trim()) return 0;
  const blocks = text.split(/\n\s*\n+/).filter((c) => c.trim().length > 0);
  if (blocks.length > 1) return blocks.length;
  const lines = text.split(/\n+/).filter((l) => l.trim().length > 5);
  return Math.max(lines.length, blocks.length, 1);
}