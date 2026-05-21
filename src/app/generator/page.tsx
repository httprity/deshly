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
  const [matches, setMatches] = useState<Array<{ cluster: Cluster; score: number; reasoning: string }>>([]);
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
      setMatches(data.matches || []);
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
      {/* Empty state — no brand voice */}
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
                    <span>MATCHED CLUSTERS · GRAPH RAG</span>
                  </div>
                  <div className="font-mono text-[10px] text-cream/40">
                    {matches.length} ranked
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {matches.map((m, i) => (
                    <motion.div
                      key={m.cluster.id}
                      initial={{ opacity: 0, scale: 0.95, y: 20 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      transition={{ delay: i * 0.12, duration: 0.5 }}
                      className="bg-ink rounded-2xl p-6 border border-cream/8 relative overflow-hidden group hover:border-terracotta/30 transition-all"
                    >
                      <div
                        className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                        style={{
                          background:
                            "radial-gradient(circle at top, rgba(213, 97, 62, 0.08), transparent 60%)",
                        }}
                      />
                      <div className="relative">
                        <div className="flex items-start justify-between mb-4">
                          <div className="text-3xl">{FLAGS[m.cluster.country] || "🌍"}</div>
                          <div className="text-right">
                            <div className="font-serif text-3xl text-cream leading-none">
                              {m.score}
                            </div>
                            <div className="text-[9px] text-cream/40 uppercase tracking-wider mt-1">
                              / 100 fit
                            </div>
                          </div>
                        </div>
                        <div className="font-serif text-2xl mb-1 leading-tight">
                          {m.cluster.city}
                        </div>
                        <div className="text-[10px] uppercase tracking-wider text-cream/40 mb-4">
                          {m.cluster.age_band} · {m.cluster.segment_type}
                        </div>
                        <p className="text-xs text-cream/65 leading-relaxed">
                          {m.reasoning}
                        </p>
                      </div>
                    </motion.div>
                  ))}
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
                        {/* Header */}
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
                            {/* Caption */}
                            <div>
                              <div className="text-[10px] uppercase tracking-[0.18em] text-brass mb-2.5">
                                Caption
                              </div>
                              <div className="bg-ink-deep border border-cream/8 rounded-xl p-4 text-sm leading-relaxed text-cream/90 whitespace-pre-wrap min-h-[100px]">
                                {r.campaign.caption}
                              </div>
                            </div>

                            {/* Time + Reach */}
                            <div className="grid grid-cols-2 gap-2">
                              <div className="bg-ink-deep border border-cream/8 rounded-xl p-3">
                                <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-brass mb-1.5">
                                  <Clock className="w-3 h-3" />
                                  Time
                                </div>
                                <div className="text-xs font-medium text-cream/85 leading-tight">
                                  {r.campaign.posting_time}
                                </div>
                              </div>
                              <div className="bg-ink-deep border border-cream/8 rounded-xl p-3">
                                <div className="text-[10px] uppercase tracking-wider text-brass mb-1.5">
                                  Reach
                                </div>
                                <div className="text-xs font-medium text-cream/85">
                                  {r.campaign.predicted_reach_min.toLocaleString()}–{r.campaign.predicted_reach_max.toLocaleString()}
                                </div>
                              </div>
                            </div>

                            {/* Engagement Prediction — hero metric */}
                            <div className="bg-gradient-to-br from-terracotta/15 to-terracotta/5 border border-terracotta/25 rounded-xl p-4 relative overflow-hidden">
                              <div
                                className="absolute inset-0 pointer-events-none"
                                style={{
                                  background:
                                    "radial-gradient(circle at 100% 0%, rgba(213, 97, 62, 0.15), transparent 60%)",
                                }}
                              />
                              <div className="relative">
                                <div className="flex items-center gap-2 mb-2">
                                  <TrendingUp className="w-3 h-3 text-terracotta" />
                                  <div className="text-[10px] uppercase tracking-[0.15em] text-terracotta font-medium">
                                    Predicted Engagement
                                  </div>
                                </div>
                                <div className="font-serif text-2xl text-cream leading-none mb-2">
                                  {(r.campaign.predicted_engagement_min * 100).toFixed(1)}–{(r.campaign.predicted_engagement_max * 100).toFixed(1)}%
                                </div>
                                <div className="text-[10px] text-cream/60 leading-relaxed">
                                  {r.campaign.reasoning_trace}
                                </div>
                              </div>
                            </div>

                            {/* Image Prompts (collapsible) */}
                            <details className="bg-ink-deep border border-cream/8 rounded-xl group">
                              <summary className="p-3 cursor-pointer text-xs font-medium flex items-center justify-between list-none">
                                <span className="uppercase tracking-[0.15em] text-brass">
                                  Image Prompts × 3 Models
                                </span>
                                <span className="text-terracotta group-open:rotate-180 transition-transform inline-block">▼</span>
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

                            {/* Hashtags */}
                            <div>
                              <div className="text-[10px] uppercase tracking-[0.18em] text-brass mb-2.5">
                                Hashtags
                              </div>
                              <div className="flex flex-wrap gap-1.5">
                                {r.campaign.hashtags.slice(0, 8).map((tag, j) => (
                                  <span
                                    key={j}
                                    className="text-[11px] bg-cream/5 border border-cream/10 rounded-full px-2.5 py-1 text-cream/70 font-mono"
                                  >
                                    {tag}
                                  </span>
                                ))}
                              </div>
                            </div>

                            {/* WhatsApp */}
                            <div>
                              <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.18em] text-brass mb-2.5">
                                <Send className="w-3 h-3" />
                                WhatsApp Broadcast
                              </div>
                              <div className="bg-ink-deep border border-cream/8 rounded-xl p-3 text-xs leading-relaxed text-cream/80 whitespace-pre-wrap">
                                {r.campaign.whatsapp_message}
                              </div>
                            </div>

                            {/* Channel rec */}
                            <div className="flex items-start gap-2 text-[11px] text-cream/55 italic leading-relaxed pt-4 border-t border-cream/8">
                              <Lightbulb className="w-3 h-3 text-brass flex-shrink-0 mt-0.5" />
                              <span>{r.campaign.channel_recommendation}</span>
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