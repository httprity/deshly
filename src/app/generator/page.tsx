"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  Wand2,
  Globe,
  Loader2,
  AlertCircle,
  Copy,
  Check,
  ArrowRight,
  TrendingUp,
  Clock,
  Send,
  Lightbulb,
} from "lucide-react";
import type { Cluster } from "@/lib/types";
import { ProductShell } from "@/components/ProductShell";

interface CampaignResult {
  cluster: Cluster;
  campaign: {
    caption: string;
    image_prompts: { gemini: string; midjourney: string; dalle: string };
    reels_storyboard: Array<{ frame: number; visual: string; caption_overlay: string; duration_seconds: number }>;
    hashtags: string[];
    whatsapp_message: string;
    posting_time: string;
    channel_recommendation: string;
    predicted_reach_min: number;
    predicted_reach_max: number;
    predicted_engagement_min: number;
    predicted_engagement_max: number;
    reasoning_trace: string;
  } | null;
  success: boolean;
  error?: string;
}

interface MatchResult {
  cluster: Cluster;
  score: number;
  tier?: string;
  display_name?: string;
  score_breakdown?: {
    style_match: number;
    spending_fit: number;
    best_platform: number;
    buying_intent: number;
  };
  why_this_works?: string;
  audience_profile?: string[];
  typical_order?: string;
  top_channel?: string;
  intent_level?: string;
}

const FLAGS: Record<string, string> = {
  "United Kingdom": "🇬🇧",
  "Canada": "🇨🇦",
  "United States": "🇺🇸",
  "United Arab Emirates": "🇦🇪",
  "Australia": "🇦🇺",
  "Malaysia": "🇲🇾",
  "Qatar": "🇶🇦",
  "Saudi Arabia": "🇸🇦",
  "Bangladesh": "🇧🇩",
};

export default function GeneratorPage() {
  const [brandVoiceId, setBrandVoiceId] = useState<string | null>(null);
  const [brandName, setBrandName] = useState<string>("");
  const [productDescription, setProductDescription] = useState("");
  const [matching, setMatching] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [matches, setMatches] = useState<MatchResult[]>([]);
  const [results, setResults] = useState<CampaignResult[]>([]);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const id = localStorage.getItem("currentBrandVoiceId");
      const name = localStorage.getItem("currentBrandName");
      if (id) setBrandVoiceId(id);
      if (name) setBrandName(name);
    }
  }, []);

  async function handleMatch() {
    if (!brandVoiceId) {
      setError("No brand voice found. Please complete Brand DNA first.");
      return;
    }
    if (productDescription.length < 20) {
      setError("Please describe your product in at least 20 characters.");
      return;
    }

    setMatching(true);
    setError(null);
    setMatches([]);
    setResults([]);

    try {
      const res = await fetch("/api/match-clusters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productDescription, brandVoiceId, topN: 3 }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Matching failed");

      // Normalize scores: if LLM returned 0-10 scale, scale up to 0-100
      const normalized = (data.matches || []).map((m: MatchResult) => {
        const fixedScore = m.score < 11 ? Math.round(m.score * 10) : Math.round(m.score);
        const breakdown = m.score_breakdown;
        const fixedBreakdown = breakdown
          ? {
              style_match: breakdown.style_match < 11 ? Math.round(breakdown.style_match * 10) : Math.round(breakdown.style_match),
              spending_fit: breakdown.spending_fit < 11 ? Math.round(breakdown.spending_fit * 10) : Math.round(breakdown.spending_fit),
              best_platform: breakdown.best_platform < 11 ? Math.round(breakdown.best_platform * 10) : Math.round(breakdown.best_platform),
              buying_intent: breakdown.buying_intent < 11 ? Math.round(breakdown.buying_intent * 10) : Math.round(breakdown.buying_intent),
            }
          : undefined;
        return {
          ...m,
          score: fixedScore,
          score_breakdown: fixedBreakdown,
        };
      });

      setMatches(normalized);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setMatching(false);
    }
  }

  async function handleGenerate() {
    if (matches.length === 0) {
      setError("Please match clusters first.");
      return;
    }

    setGenerating(true);
    setError(null);
    setResults([]);

    try {
      const clusterIds = matches.map((m) => m.cluster.id);
      const res = await fetch("/api/generate-campaign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brandVoiceId, productDescription, clusterIds }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Generation failed");
      setResults(data.campaigns || []);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setGenerating(false);
    }
  }

  function copyToClipboard(text: string, field: string) {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 1800);
  }

  return (
    <ProductShell
      stepLabel="STEP 02 — CAMPAIGN GENERATOR"
      pageTitle={
        <>
          One product.{" "}
          <span className="italic text-terracotta">Three diasporas.</span>
        </>
      }
      pageSubtitle={
        brandName ? (
          <>
            Generating for <strong className="text-cream not-italic">{brandName}</strong>. Describe your product and let Deshly auto-match three best-fit clusters — then generate full campaign packages in parallel.
          </>
        ) : (
          <>
            Please <Link href="/brand-dna" className="text-terracotta underline">capture your brand DNA</Link> first.
          </>
        )
      }
    >
      {!brandVoiceId && (
        <div className="bg-ink rounded-2xl sm:rounded-3xl p-8 sm:p-12 lg:p-16 text-center border border-cream/5 relative overflow-hidden">
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                "radial-gradient(circle at center, rgba(213, 97, 62, 0.06), transparent 60%)",
            }}
          />
          <div className="relative">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full border border-terracotta/30 flex items-center justify-center">
              <Sparkles className="w-7 h-7 text-terracotta" strokeWidth={1.5} />
            </div>
            <h2 className="font-serif text-3xl mb-3">No brand voice yet</h2>
            <p className="text-cream/55 mb-8 max-w-md mx-auto leading-relaxed">
              Capture your brand DNA from 10 captions before generating campaigns. Takes ~30 seconds.
            </p>
            <Link
              href="/brand-dna"
              className="inline-flex items-center gap-2 bg-gradient-to-r from-terracotta to-terracotta-deep text-cream rounded-full px-7 py-4 text-sm font-medium hover:shadow-[0_0_40px_rgba(213,97,62,0.35)] transition-all"
            >
              Start with Brand DNA <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      )}

      {brandVoiceId && (
        <>
          {/* PRODUCT INPUT */}
          <div className="bg-ink rounded-2xl sm:rounded-3xl p-5 sm:p-8 lg:p-10 mb-6 border border-cream/5 relative overflow-hidden">
            <div
              className="absolute top-0 left-0 right-0 h-px"
              style={{
                background:
                  "linear-gradient(90deg, transparent, rgba(213, 97, 62, 0.4), transparent)",
              }}
            />

            <div className="relative space-y-6">
              <div className="flex items-center justify-between">
                <div className="text-[10px] uppercase tracking-[0.2em] text-brass">
                  INPUT · YOUR PRODUCT
                </div>
                <div className="font-mono text-[10px] text-cream/30">
                  {generating || results.length > 0 ? "STEP 3 / 3" : matches.length > 0 ? "STEP 2 / 3" : "STEP 1 / 3"}
                </div>
              </div>

              <label className="block">
                <div className="text-[11px] uppercase tracking-[0.15em] text-cream/50 mb-3">
                  Product Description
                </div>
                <textarea
                  value={productDescription}
                  onChange={(e) => setProductDescription(e.target.value)}
                  rows={3}
                  placeholder="Hand-stitched silk panjabi, deep emerald green. Eid 2026 collection. Limited edition. ৳3,500..."
                  className="w-full bg-ink-soft border border-cream/10 rounded-xl px-5 py-4 text-base text-cream placeholder:text-cream/25 outline-none focus:border-terracotta/50 focus:bg-ink-deep transition-all resize-none"
                />
                <div className="text-[10px] text-cream/40 mt-2 font-mono">
                  {productDescription.length} characters
                </div>
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  onClick={handleMatch}
                  disabled={matching || generating || productDescription.length < 20}
                  className="bg-cream/[0.04] border border-cream/15 hover:border-brass hover:bg-cream/[0.08] text-cream rounded-full py-4 px-6 font-medium text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  {matching ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Matching clusters...
                    </>
                  ) : (
                    <>
                      <Globe className="w-4 h-4" />
                      1 — Match Best Clusters
                    </>
                  )}
                </button>
                <button
                  onClick={handleGenerate}
                  disabled={generating || matching || matches.length === 0}
                  className="bg-gradient-to-r from-terracotta to-terracotta-deep text-cream rounded-full py-4 px-6 font-medium text-sm flex items-center justify-center gap-2 transition-all hover:shadow-[0_0_40px_rgba(213,97,62,0.35)] disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:shadow-none"
                >
                  {generating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Generating campaigns...
                    </>
                  ) : (
                    <>
                      <Wand2 className="w-4 h-4" />
                      2 — Generate Campaigns
                    </>
                  )}
                </button>
              </div>

              {error && (
                <div className="p-4 bg-red-950/40 border border-red-800/40 rounded-xl flex items-start gap-3">
                  <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-red-300">{error}</div>
                </div>
              )}
            </div>
          </div>

          {/* MATCHED CLUSTERS */}
          <AnimatePresence>
            {matches.length > 0 && results.length === 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="mb-6"
              >
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-3 text-[10px] uppercase tracking-[0.2em] text-brass">
                    <span className="w-8 h-px bg-brass" />
                    <span>MATCHED AUDIENCES</span>
                  </div>
                  <div className="font-mono text-[10px] text-cream/40">
                    {matches.length} ranked
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {matches.map((m, i) => {
                    const displayName = m.display_name ||
                      `${m.cluster.city} — ${m.cluster.age_band}`;
                    const breakdown = m.score_breakdown;
                    const tier = m.tier || tierFromScore(m.score);
                    const tierColor = tierToColor(tier);
                    const intent = m.intent_level || intentFromScore(breakdown?.buying_intent);
                    const intentColor = intentToColor(intent);

                    return (
                      <motion.div
                        key={m.cluster.id}
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        transition={{ delay: i * 0.12, duration: 0.5 }}
                        className="bg-ink rounded-2xl p-6 sm:p-7 border border-cream/8 relative overflow-hidden group hover:border-terracotta/30 transition-all"
                      >
                        <div
                          className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                          style={{
                            background:
                              "radial-gradient(circle at top, rgba(213, 97, 62, 0.08), transparent 60%)",
                          }}
                        />
                        <div className="relative">
                          {/* HEADER ZONE */}
                          <div className="flex items-start justify-between mb-5 gap-3">
                            <div className="text-3xl">{FLAGS[m.cluster.country] || "🌍"}</div>
                            <div
                              className={`px-3 py-1.5 rounded-full text-[10px] uppercase tracking-[0.15em] font-medium border ${tierColor}`}
                            >
                              {tier}
                            </div>
                          </div>

                          <div className="font-serif text-xl mb-1 leading-tight">
                            {displayName}
                          </div>
                          <div className="text-[10px] uppercase tracking-wider text-cream/40 mb-5 font-mono">
                            {m.cluster.country} · {(m.cluster.estimated_size / 1000).toFixed(0)}k people
                          </div>

                          {/* WHY IT WORKS HOOK */}
                          {m.why_this_works && (
                            <div className="bg-terracotta/8 border border-terracotta/25 rounded-xl p-4 mb-5">
                              <div className="text-[9px] uppercase tracking-[0.18em] text-terracotta mb-2 font-medium">
                                Why this works here
                              </div>
                              <div className="text-[13px] text-cream/95 leading-snug italic font-serif">
                                &ldquo;{m.why_this_works}&rdquo;
                              </div>
                            </div>
                          )}

                          {/* AUDIENCE PROFILE — BULLET LIST */}
                          {m.audience_profile && m.audience_profile.length > 0 && (
                            <ul className="space-y-2 mb-5">
                              {m.audience_profile.map((bullet, j) => {
                                const [label, ...rest] = bullet.split(":");
                                const detail = rest.join(":").trim();
                                return (
                                  <li key={j} className="flex gap-2.5 text-[12px] leading-relaxed">
                                    <span className="mt-2 flex-shrink-0">
                                      <span className="block w-1 h-1 rounded-full bg-terracotta" />
                                    </span>
                                    <span>
                                      <span className="text-cream/85 font-medium">{label}:</span>{" "}
                                      <span className="text-cream/60">{detail}</span>
                                    </span>
                                  </li>
                                );
                              })}
                            </ul>
                          )}

                          {/* TYPICAL ORDER — KEY-VALUE PAIR */}
                          {m.typical_order && (
                            <div className="flex items-baseline justify-between mb-5 pb-5 border-b border-cream/8">
                              <div className="text-[10px] uppercase tracking-[0.15em] text-cream/50 font-medium">
                                Typical Order
                              </div>
                              <div className="font-serif text-lg text-cream">
                                {m.typical_order}
                              </div>
                            </div>
                          )}

                          {/* FIT METRICS — 2x2 GRID */}
                          {breakdown && (
                            <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                              <MetricChip
                                label="Style Match"
                                value={`${breakdown.style_match}%`}
                                level={breakdown.style_match}
                              />
                              <MetricChip
                                label="Spending Fit"
                                value={`${breakdown.spending_fit}%`}
                                level={breakdown.spending_fit}
                              />
                              <div>
                                <div className="text-[9px] uppercase tracking-[0.15em] text-cream/45 mb-1 font-medium">
                                  Buying Intent
                                </div>
                                <div className={`text-sm font-medium ${intentColor}`}>
                                  {intent}
                                </div>
                              </div>
                              {m.top_channel && (
                                <div>
                                  <div className="text-[9px] uppercase tracking-[0.15em] text-cream/45 mb-1 font-medium">
                                    Top Channel
                                  </div>
                                  <div className="text-sm font-medium text-cream/85">
                                    {m.top_channel.split("—")[0].trim()}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* GENERATED CAMPAIGNS */}
          <AnimatePresence>
            {results.length > 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="mb-6"
              >
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-3 text-[10px] uppercase tracking-[0.2em] text-terracotta">
                    <span className="w-8 h-px bg-terracotta" />
                    <span>GENERATED CAMPAIGNS</span>
                  </div>
                  <div className="font-mono text-[10px] text-cream/40">
                    {results.length} packages
                  </div>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
                  {results.map((r, i) => (
                    <motion.div
                      key={r.cluster.id}
                      initial={{ opacity: 0, y: 30 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.15, duration: 0.5 }}
                      className="bg-gradient-to-br from-ink-soft to-ink rounded-2xl sm:rounded-3xl p-5 sm:p-7 border border-cream/8 relative overflow-hidden"
                    >
                      <div
                        className="absolute top-0 left-0 right-0 h-px"
                        style={{
                          background:
                            "linear-gradient(90deg, transparent, rgba(184, 149, 106, 0.4), transparent)",
                        }}
                      />

                      <div className="relative">
                        {/* HEADER */}
                        <div className="flex items-start justify-between mb-6 pb-5 border-b border-cream/8">
                          <div>
                            <div className="text-3xl mb-3">
                              {FLAGS[r.cluster.country] || "🌍"}
                            </div>
                            <div className="text-[10px] uppercase tracking-[0.15em] text-brass mb-1">
                              {r.cluster.segment_type}
                            </div>
                            <div className="font-serif text-2xl leading-tight">
                              {r.cluster.city}
                            </div>
                            <div className="text-[11px] text-cream/40 mt-1">
                              {r.cluster.age_band}
                            </div>
                          </div>
                          <div className="font-mono text-[10px] text-cream/30">
                            0{i + 1} / 0{results.length}
                          </div>
                        </div>

                        {!r.success && (
                          <div className="bg-red-950/40 border border-red-800/40 rounded-xl p-3 text-xs text-red-300">
                            Generation failed: {r.error}
                          </div>
                        )}

                        {r.success && r.campaign && (
                          <div className="space-y-5">
                            {/* CAPTION */}
                            <div>
                              <div className="flex items-center justify-between mb-2.5">
                                <div className="text-[10px] uppercase tracking-[0.18em] text-brass">
                                  Caption
                                </div>
                                <button
                                  onClick={() =>
                                    copyToClipboard(r.campaign!.caption, `${r.cluster.id}-caption`)
                                  }
                                  className="text-[10px] flex items-center gap-1 text-cream/50 hover:text-terracotta transition-colors"
                                >
                                  {copiedField === `${r.cluster.id}-caption` ? (
                                    <>
                                      <Check className="w-3 h-3" />
                                      Copied
                                    </>
                                  ) : (
                                    <>
                                      <Copy className="w-3 h-3" />
                                      Copy
                                    </>
                                  )}
                                </button>
                              </div>
                              <div className="bg-ink-deep border border-cream/12 rounded-xl p-4 text-sm leading-relaxed text-cream/90 whitespace-pre-wrap min-h-[100px]">
                                {r.campaign.caption}
                              </div>
                            </div>

                            {/* PERFORMANCE SNAPSHOT — unified box */}
                            {(() => {
                              const channelInfo = parseChannelRecommendation(r.campaign.channel_recommendation);
                              const midReach = (r.campaign.predicted_reach_min + r.campaign.predicted_reach_max) / 2;
                              const reactionsMin = Math.round(r.campaign.predicted_reach_min * r.campaign.predicted_engagement_min);
                              const reactionsMax = Math.round(r.campaign.predicted_reach_max * r.campaign.predicted_engagement_max);
                              const midEngagement = (r.campaign.predicted_engagement_min + r.campaign.predicted_engagement_max) / 2;
                              const baseline = r.cluster.typical_engagement_rate || 0.03;
                              const benchmark = engagementBenchmark(midEngagement, baseline);
                              const platformStyle = platformBadge(channelInfo.platform);

                              return (
                                <div className="bg-ink-deep border border-cream/12 rounded-xl overflow-hidden">
                                  {/* Platform header */}
                                  <div className={`px-4 py-3 border-b border-cream/8 flex items-center gap-2.5 ${platformStyle.bg}`}>
                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-base ${platformStyle.iconBg}`}>
                                      {platformStyle.icon}
                                    </div>
                                    <div className="min-w-0">
                                      <div className="text-[9px] uppercase tracking-[0.15em] text-cream/50 font-medium leading-none mb-1">
                                        Performance Snapshot
                                      </div>
                                      <div className={`text-sm font-semibold leading-none ${platformStyle.text}`}>
                                        Best on {channelInfo.platform}
                                      </div>
                                    </div>
                                  </div>

                                  {/* Estimated reactions — the hero number */}
                                  <div className="px-4 pt-4 pb-3 border-b border-cream/8">
                                    <div className="text-[9px] uppercase tracking-[0.15em] text-cream/45 mb-1.5 font-medium">
                                      Estimated Reactions
                                    </div>
                                    <div className="flex items-baseline gap-3 mb-2">
                                      <div className="font-serif text-2xl text-cream leading-none">
                                        {formatReach(reactionsMin)}–{formatReach(reactionsMax)}
                                      </div>
                                    </div>
                                    <div className={`inline-block text-[10px] uppercase tracking-[0.12em] px-2.5 py-1 rounded-full border font-medium ${benchmark.color}`}>
                                      {benchmark.label}
                                    </div>
                                  </div>

                                  {/* Time + Reach */}
                                  <div className="px-4 py-3 border-b border-cream/8 space-y-2.5">
                                    <div className="flex items-center gap-2.5 text-xs">
                                      <Clock className="w-3.5 h-3.5 text-brass flex-shrink-0" />
                                      <div className="text-cream/55">Best Time:</div>
                                      <div className="text-cream/95 font-medium min-w-0 truncate">
                                        {r.campaign.posting_time}
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-2.5 text-xs">
                                      <span className="text-brass flex-shrink-0">👁</span>
                                      <div className="text-cream/55">Reach:</div>
                                      <div className="text-cream/95 font-medium">
                                        {formatReach(r.campaign.predicted_reach_min)}–{formatReach(r.campaign.predicted_reach_max)} people
                                      </div>
                                    </div>
                                  </div>

                                  {/* Why this platform */}
                                  <div className="px-4 py-3">
                                    <div className="text-[9px] uppercase tracking-[0.15em] text-cream/45 mb-1.5 font-medium">
                                      Why this platform
                                    </div>
                                    <div className="text-[11px] text-cream/75 leading-relaxed">
                                      {channelInfo.insight}
                                    </div>
                                  </div>
                                </div>
                              );
                            })()}

                            {/* PRIMARY ACTION — Copy Full Campaign Package */}
                            <button
                              onClick={() => {
                                const packageText = buildCampaignPackage(r);
                                copyToClipboard(packageText, `${r.cluster.id}-package`);
                              }}
                              className="w-full bg-gradient-to-r from-terracotta to-terracotta-deep text-cream rounded-xl py-3.5 px-4 font-medium text-sm flex items-center justify-center gap-2 transition-all hover:shadow-[0_0_30px_rgba(213,97,62,0.3)]"
                            >
                              {copiedField === `${r.cluster.id}-package` ? (
                                <>
                                  <Check className="w-4 h-4" />
                                  Copied entire package
                                </>
                              ) : (
                                <>
                                  <Copy className="w-4 h-4" />
                                  Copy Full Campaign Package
                                </>
                              )}
                            </button>

                            {/* COLLAPSIBLE DRAWERS — with counts */}
                            <div className="space-y-2">
                              {/* Image Prompts */}
                              <details className="bg-ink-deep border border-cream/8 rounded-xl group">
                                <summary className="p-3 cursor-pointer text-xs font-medium flex items-center justify-between list-none hover:bg-cream/[0.02] rounded-xl transition-colors">
                                  <span className="flex items-center gap-2">
                                    <span>🎨</span>
                                    <span className="uppercase tracking-[0.15em] text-brass">
                                      Image Prompts
                                    </span>
                                    <span className="text-[10px] text-cream/40 font-mono">[3]</span>
                                  </span>
                                  <span className="text-terracotta group-open:rotate-180 transition-transform inline-block text-[10px]">▼</span>
                                </summary>
                                <div className="px-3 pb-3 space-y-2">
                                  {(["gemini", "midjourney", "dalle"] as const).map((model) => (
                                    <div key={model} className="bg-ink border border-cream/8 rounded-lg p-3">
                                      <div className="flex items-center justify-between mb-1.5">
                                        <span className="text-[10px] uppercase tracking-[0.15em] text-brass font-medium">
                                          For {model}
                                        </span>
                                        <button
                                          onClick={() =>
                                            copyToClipboard(
                                              r.campaign!.image_prompts[model],
                                              `${r.cluster.id}-${model}`
                                            )
                                          }
                                          className="text-[10px] flex items-center gap-1 text-cream/50 hover:text-terracotta transition-colors"
                                        >
                                          {copiedField === `${r.cluster.id}-${model}` ? (
                                            <>
                                              <Check className="w-3 h-3" />
                                              Copied
                                            </>
                                          ) : (
                                            <>
                                              <Copy className="w-3 h-3" />
                                              Copy
                                            </>
                                          )}
                                        </button>
                                      </div>
                                      <div className="text-[11px] leading-relaxed text-cream/65 font-mono">
                                        {r.campaign?.image_prompts[model]}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </details>

                              {/* WhatsApp */}
                              <details className="bg-ink-deep border border-cream/8 rounded-xl group">
                                <summary className="p-3 cursor-pointer text-xs font-medium flex items-center justify-between list-none hover:bg-cream/[0.02] rounded-xl transition-colors">
                                  <span className="flex items-center gap-2">
                                    <Send className="w-3 h-3 text-brass" />
                                    <span className="uppercase tracking-[0.15em] text-brass">
                                      WhatsApp Message
                                    </span>
                                    <span className="text-[10px] text-cream/40 font-mono">[1]</span>
                                  </span>
                                  <span className="text-terracotta group-open:rotate-180 transition-transform inline-block text-[10px]">▼</span>
                                </summary>
                                <div className="px-3 pb-3">
                                  <div className="bg-ink border border-cream/8 rounded-lg p-3">
                                    <div className="flex items-center justify-end mb-1.5">
                                      <button
                                        onClick={() =>
                                          copyToClipboard(
                                            r.campaign!.whatsapp_message,
                                            `${r.cluster.id}-whatsapp`
                                          )
                                        }
                                        className="text-[10px] flex items-center gap-1 text-cream/50 hover:text-terracotta transition-colors"
                                      >
                                        {copiedField === `${r.cluster.id}-whatsapp` ? (
                                          <>
                                            <Check className="w-3 h-3" />
                                            Copied
                                          </>
                                        ) : (
                                          <>
                                            <Copy className="w-3 h-3" />
                                            Copy
                                          </>
                                        )}
                                      </button>
                                    </div>
                                    <div className="text-xs leading-relaxed text-cream/80 whitespace-pre-wrap">
                                      {r.campaign.whatsapp_message}
                                    </div>
                                  </div>
                                </div>
                              </details>

                              {/* Hashtags */}
                              <details className="bg-ink-deep border border-cream/8 rounded-xl group">
                                <summary className="p-3 cursor-pointer text-xs font-medium flex items-center justify-between list-none hover:bg-cream/[0.02] rounded-xl transition-colors">
                                  <span className="flex items-center gap-2">
                                    <span className="text-brass">#</span>
                                    <span className="uppercase tracking-[0.15em] text-brass">
                                      Hashtags
                                    </span>
                                    <span className="text-[10px] text-cream/40 font-mono">
                                      [{r.campaign.hashtags.length}]
                                    </span>
                                  </span>
                                  <span className="text-terracotta group-open:rotate-180 transition-transform inline-block text-[10px]">▼</span>
                                </summary>
                                <div className="px-3 pb-3">
                                  <div className="bg-ink border border-cream/8 rounded-lg p-3">
                                    <div className="flex items-center justify-end mb-2">
                                      <button
                                        onClick={() =>
                                          copyToClipboard(
                                            r.campaign!.hashtags.join(" "),
                                            `${r.cluster.id}-hashtags`
                                          )
                                        }
                                        className="text-[10px] flex items-center gap-1 text-cream/50 hover:text-terracotta transition-colors"
                                      >
                                        {copiedField === `${r.cluster.id}-hashtags` ? (
                                          <>
                                            <Check className="w-3 h-3" />
                                            Copied
                                          </>
                                        ) : (
                                          <>
                                            <Copy className="w-3 h-3" />
                                            Copy all
                                          </>
                                        )}
                                      </button>
                                    </div>
                                    <div className="text-[11px] leading-relaxed text-cream/70 font-mono break-words">
                                      {r.campaign.hashtags.join(" ")}
                                    </div>
                                  </div>
                                </div>
                              </details>
                            </div>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}
    </ProductShell>
  );
}

// ============================================================================
// HELPERS
// ============================================================================

function MetricChip({ label, value, level }: { label: string; value: string; level: number }) {
  const valueColor =
    level >= 80 ? "text-terracotta" :
    level >= 60 ? "text-brass" :
    "text-cream/60";
  const barColor =
    level >= 80 ? "from-terracotta to-brass" :
    level >= 60 ? "from-brass to-brass/60" :
    "from-cream/25 to-cream/10";
  return (
    <div>
      <div className="text-[9px] uppercase tracking-[0.15em] text-cream/45 mb-1 font-medium">
        {label}
      </div>
      <div className="flex items-baseline gap-2">
        <div className={`text-sm font-medium ${valueColor}`}>{value}</div>
      </div>
      <div className="mt-1.5 h-[2px] bg-cream/5 rounded-full overflow-hidden">
        <div
          className={`h-full bg-gradient-to-r ${barColor} rounded-full transition-all duration-700`}
          style={{ width: `${level}%` }}
        />
      </div>
    </div>
  );
}

function tierFromScore(score: number): string {
  if (score >= 85) return "Perfect Fit";
  if (score >= 70) return "Strong Fit";
  if (score >= 55) return "Decent Fit";
  return "Weak Fit";
}

function tierToColor(tier: string): string {
  switch (tier) {
    case "Perfect Fit":
      return "bg-terracotta/15 text-terracotta border-terracotta/30";
    case "Strong Fit":
      return "bg-brass/15 text-brass border-brass/30";
    case "Decent Fit":
      return "bg-cream/8 text-cream/70 border-cream/15";
    default:
      return "bg-cream/5 text-cream/45 border-cream/10";
  }
}

function intentFromScore(score?: number): string {
  if (typeof score !== "number") return "Medium";
  if (score >= 75) return "High";
  if (score >= 55) return "Medium";
  return "Low";
}

function intentToColor(intent: string): string {
  switch (intent) {
    case "High":
      return "text-terracotta";
    case "Medium":
      return "text-brass";
    default:
      return "text-cream/50";
  }
}
function formatReach(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return n.toString();
}

function engagementBenchmark(
  midEngagement: number,
  baseline: number
): { label: string; color: string } {
  const ratio = midEngagement / baseline;
  const pct = Math.round((ratio - 1) * 100);

  if (ratio >= 1.15) {
    return {
      label: `High Potential (+${pct}% above average)`,
      color: "bg-terracotta/15 text-terracotta border-terracotta/30",
    };
  }
  if (ratio >= 0.9) {
    return {
      label: "Steady (matches typical performance)",
      color: "bg-brass/15 text-brass border-brass/30",
    };
  }
  const drop = Math.abs(pct);
  return {
    label: `Conservative (-${drop}% vs typical)`,
    color: "bg-cream/8 text-cream/55 border-cream/15",
  };
}

function platformBadge(platform: string): {
  icon: string;
  iconBg: string;
  bg: string;
  text: string;
} {
  const p = platform.toLowerCase();
  if (p.includes("facebook")) {
    return {
      icon: "📘",
      iconBg: "bg-[#1877F2]/20 border border-[#1877F2]/40",
      bg: "bg-[#1877F2]/[0.05]",
      text: "text-[#4493FF]",
    };
  }
  if (p.includes("instagram")) {
    return {
      icon: "📸",
      iconBg: "bg-gradient-to-br from-purple-500/30 to-pink-500/30 border border-pink-400/40",
      bg: "bg-gradient-to-r from-purple-500/[0.04] to-pink-500/[0.04]",
      text: "text-pink-300",
    };
  }
  if (p.includes("tiktok")) {
    return {
      icon: "🎵",
      iconBg: "bg-cream/15 border border-cream/25",
      bg: "bg-cream/[0.03]",
      text: "text-cream/95",
    };
  }
  if (p.includes("whatsapp")) {
    return {
      icon: "💬",
      iconBg: "bg-[#25D366]/20 border border-[#25D366]/40",
      bg: "bg-[#25D366]/[0.04]",
      text: "text-[#4EE188]",
    };
  }
  if (p.includes("youtube")) {
    return {
      icon: "▶️",
      iconBg: "bg-red-500/20 border border-red-500/40",
      bg: "bg-red-500/[0.04]",
      text: "text-red-300",
    };
  }
  // Default
  return {
    icon: "🌐",
    iconBg: "bg-brass/20 border border-brass/40",
    bg: "bg-brass/[0.04]",
    text: "text-brass",
  };
}

function buildCampaignPackage(r: any): string {
  if (!r.campaign) return "";
  const c = r.campaign;
  const platform = parseChannelRecommendation(c.channel_recommendation).platform;
  return `═══ CAMPAIGN PACKAGE — ${r.cluster.city.toUpperCase()} ═══

📍 AUDIENCE
${r.cluster.city} · ${r.cluster.age_band} · ${r.cluster.segment_type}

📝 CAPTION
${c.caption}

⏰ BEST TIME TO POST
${c.posting_time}

🏆 BEST PLATFORM
${platform}

📊 PERFORMANCE
Reach: ${c.predicted_reach_min.toLocaleString()}–${c.predicted_reach_max.toLocaleString()} people
Engagement: ${(c.predicted_engagement_min * 100).toFixed(1)}%–${(c.predicted_engagement_max * 100).toFixed(1)}%

# HASHTAGS
${c.hashtags.join(" ")}

💬 WHATSAPP MESSAGE
${c.whatsapp_message}

🎨 IMAGE PROMPTS

— For Gemini —
${c.image_prompts.gemini}

— For Midjourney —
${c.image_prompts.midjourney}

— For DALL·E —
${c.image_prompts.dalle}

═══ END PACKAGE ═══`;
}

function parseChannelRecommendation(channelRec: string): {
  platform: string;
  insight: string;
} {
  // Try to extract platform name from typical AI output like
  // "Instagram Reels — 72% engagement weight, ..."
  // "Facebook — 85% engagement weight in this cluster"
  const dashSplit = channelRec.split(/[—\-–]/);
  let platform = "Instagram";
  let insight = channelRec.trim();

  if (dashSplit.length >= 2) {
    platform = dashSplit[0].trim();
    insight = dashSplit.slice(1).join(" — ").trim();
  } else {
    // Try matching platform name from common platforms
    const platforms = ["Instagram", "Facebook", "TikTok", "WhatsApp", "Twitter", "YouTube", "LinkedIn"];
    const found = platforms.find((p) => channelRec.toLowerCase().includes(p.toLowerCase()));
    if (found) platform = found;
  }

  // De-jargonize the insight — strip "X% engagement weight in this cluster"
  insight = insight
    .replace(/\d+%\s*engagement\s*weight\s*(in\s*this\s*cluster)?[,.]?\s*/gi, "")
    .replace(/with\s+a\s+strong\s+focus\s+on/gi, "Great for")
    .replace(/due\s+to\s+high\s+usage\s+of\s+[a-z]+\s+among/gi, "High activity among")
    .replace(/^\s*[,.]?\s*/, "")
    .replace(/\s+/g, " ")
    .trim();

  // Capitalize first letter
  if (insight.length > 0) {
    insight = insight.charAt(0).toUpperCase() + insight.slice(1);
  }

  // Fallback if insight ended up empty
  if (!insight || insight.length < 5) {
    insight = `Best fit for this audience's daily habits.`;
  }

  return { platform, insight };
}