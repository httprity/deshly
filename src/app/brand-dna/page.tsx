"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Sparkles,
  Loader2,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Wand2,
} from "lucide-react";
import type { BrandVoiceProfile } from "@/lib/types";
import { ProductShell } from "@/components/ProductShell";

export default function BrandDNAPage() {
  const [brandName, setBrandName] = useState("");
  const [captions, setCaptions] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<BrandVoiceProfile | null>(null);
  const [brandVoiceId, setBrandVoiceId] = useState<string | null>(null);

  async function handleExtract() {
    setLoading(true);
    setError(null);
    setProfile(null);

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

      if (typeof window !== "undefined") {
        localStorage.setItem("currentBrandVoiceId", data.brandVoiceId);
        localStorage.setItem("currentBrandName", data.brandName);
      }
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
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

                {/* Words They Repeat */}
                <Section title="Words They Repeat">
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
                </Section>

                {/* What They Care About */}
                <Section title="What They Care About">
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
                </Section>

                {/* Their Brand Vibe */}
                <Section title="Their Brand Vibe">
                  <div className="p-4 bg-ink-deep border border-cream/8 rounded-xl mb-3">
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
function countCaptions(text: string): number {
  if (!text.trim()) return 0;
  // Prefer blank-line splitting (the recommended format)
  const blocks = text.split(/\n\s*\n+/).filter((c) => c.trim().length > 0);
  if (blocks.length > 1) return blocks.length;
  // Fallback: count non-empty lines (if user used single line breaks)
  const lines = text.split(/\n+/).filter((l) => l.trim().length > 5);
  return Math.max(lines.length, blocks.length, 1);
}