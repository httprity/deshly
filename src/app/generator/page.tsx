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
  ChevronDown,
  X,
} from "lucide-react";
import type { Cluster } from "@/lib/types";
import { ProductShell } from "@/components/ProductShell";

interface CampaignResult {
  cluster: Cluster;
  campaign: {
    why_this_campaign?: string;
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
  display_name?: string;
  fit_tier?: string;
  recommendation_score?: number;
  one_line_reason?: string;
  score_breakdown?: {
    product_market_fit?: number;
    price_alignment?: number;
    occasion_fit?: number;
    channel_fit?: number;
  };
  reasoning?: {
    why_this_fits?: string;
    affordability_read?: string;
    buying_motivation?: string;
    best_channel?: string;
    best_timing_note?: string;
    risk_note?: string;
    suggested_positioning?: string;
  };
}

interface ProductRead {
  category?: string;
  price_tier?: string;
  use_case?: string;
  trust_requirement?: string;
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

// ============================================================================
// CATEGORY-AWARE OPTION GROUPS — drive the optional "extra details" section.
// Keyed by the category <select> values. Falls back to UNIVERSAL when a
// category has no specific set. Additive: chips map into existing backend
// fields (positioning, targetBuyer, occasions, notes) unchanged.
// ============================================================================
const UNIVERSAL_CARE = [
  "Price", "Quality", "Trust", "Convenience", "Fast delivery",
  "Easy ordering", "Reviews", "Premium feel", "Value for money", "Giftability",
];

const POSITIONING_BY_CATEGORY: Record<string, string[]> = {
  Food: ["Budget meal", "Everyday value", "Premium meal", "Catering-style"],
  Fashion: ["Budget", "Mid-range", "Premium", "Luxury"],
};

const BUYER_BY_CATEGORY: Record<string, string[]> = {
  Food: ["Students", "Office workers", "Families", "Foodies", "Groups", "Everyone"],
  Fashion: ["Students", "Professionals", "Families", "Parents", "Women", "Men", "Everyone"],
  Beauty: ["Teens", "Young adults", "Women", "Men", "Sensitive skin", "Everyone"],
  Electronics: ["Students", "Professionals", "Gamers", "Home users", "Gift buyers", "Everyone"],
};

const USECASE_BY_CATEGORY: Record<string, string[]> = {
  Food: ["Lunch", "Dinner", "Late-night craving", "Family meal", "Office meal", "Small gathering", "Party order", "Weekend craving"],
  Fashion: ["Daily wear", "Campus", "Work", "Gift", "Wedding", "Eid", "Lifestyle", "New collection", "Limited drop"],
  Beauty: ["Daily routine", "Product launch", "Skin concern", "Gift", "Review/social proof", "Offer"],
  Electronics: ["Work", "Study", "Gaming", "Travel", "Everyday use", "Gift"],
};

const CARE_BY_CATEGORY: Record<string, string[]> = {
  Food: ["Taste", "Freshness", "Portion size", "Hygiene", "Fast delivery", "Hot delivery", "Combo value", "Packaging", "Easy ordering"],
  Fashion: ["Fit", "Fabric quality", "Comfort", "Modesty", "Trendy design", "Premium feel", "Size availability", "Color options", "Occasion wear"],
  Beauty: ["Ingredients", "Safety", "Authenticity", "Skin type match", "Reviews", "Before-after proof", "Gentle formula", "Premium feel"],
  Electronics: ["Specs", "Battery life", "Warranty", "Durability", "Compatibility", "Performance", "Price-value", "After-sales support"],
};

const INTENT_BY_CATEGORY: Record<string, string[]> = {
  Food: ["Daily orders", "Lunch push", "Dinner push", "Combo offer", "Weekend craving", "Party/group order"],
  Fashion: ["Everyday post", "Festive push", "Limited drop", "Sale", "Restock", "New collection"],
  Beauty: ["Product launch", "Routine education", "Concern-based campaign", "Review/social proof", "Offer"],
};
const INTENT_UNIVERSAL = ["Everyday", "Festive push", "Limited drop", "Sale"];

// Helper-example text under the product description, by category.
const DESC_HINT_BY_CATEGORY: Record<string, string> = {
  Food: "e.g. Wood-fired pepperoni pizza, 12-inch, hand-tossed, ৳650 — best shared, ready in 25 min.",
  Fashion: "e.g. Hand-block-printed cotton kurta, relaxed fit, natural dyes, ৳2,400 — everyday and festive.",
  Beauty: "e.g. Niacinamide 10% serum, 30ml, fragrance-free, ৳1,200 — for oily, acne-prone skin.",
  Electronics: "e.g. Wireless ANC headphones, 40h battery, USB-C, ৳4,500 — for study, work, and travel.",
};

// Resolvers: category-specific set, else universal/empty fallback.
function positioningFor(cat: string): string[] {
  return POSITIONING_BY_CATEGORY[cat] || ["Budget", "Mid-range", "Premium", "Luxury"];
}
function buyersFor(cat: string): string[] {
  return BUYER_BY_CATEGORY[cat] || ["Students", "Professionals", "Families", "Gift buyers", "Everyone"];
}
function useCasesFor(cat: string): string[] {
  return USECASE_BY_CATEGORY[cat] || ["Everyday use", "Gift", "Offer", "New launch"];
}
function caresFor(cat: string): string[] {
  return CARE_BY_CATEGORY[cat] || UNIVERSAL_CARE;
}
function intentsFor(cat: string): string[] {
  return INTENT_BY_CATEGORY[cat] || INTENT_UNIVERSAL;
}

// Fire-and-forget signal logging to the server. Never throws.
function sendSignals(signals: any[]) {
  try {
    fetch("/api/brand-signals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ op: "log", signals }),
      keepalive: true,
    }).catch(() => {});
  } catch {
    /* never let logging break the UI */
  }
}

export default function GeneratorPage() {
  const [brandVoiceId, setBrandVoiceId] = useState<string | null>(null);
  const [brandName, setBrandName] = useState<string>("");
  const [brandHandle, setBrandHandle] = useState<string>("");
  const [handleInput, setHandleInput] = useState("");
  const [resolvingHandle, setResolvingHandle] = useState(false);
  const [personalize, setPersonalize] = useState(true);
  const [productDescription, setProductDescription] = useState("");
  const [price, setPrice] = useState("");
  const [category, setCategory] = useState("");
  const [fulfillment, setFulfillment] = useState("");
  const [showMoreDetails, setShowMoreDetails] = useState(false);
  const [positioning, setPositioning] = useState("");
  const [targetBuyer, setTargetBuyer] = useState("");
  const [occasions, setOccasions] = useState<string[]>([]);
  const [cares, setCares] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  const [hiddenDiasporaCount, setHiddenDiasporaCount] = useState(0);
  const [fulfillmentNote, setFulfillmentNote] = useState<string | null>(null);
  const [matching, setMatching] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [matches, setMatches] = useState<MatchResult[]>([]);
  const [productRead, setProductRead] = useState<ProductRead | null>(null);
  const [marketModalId, setMarketModalId] = useState<string | null>(null);
  const [campaignModalOpen, setCampaignModalOpen] = useState(false);
  const [activeCampaignId, setActiveCampaignId] = useState<string | null>(null);
  const [results, setResults] = useState<CampaignResult[]>([]);
  const [campaignIntent, setCampaignIntent] = useState("");
  const [campaignGoal, setCampaignGoal] = useState("");
  const [editedCaptions, setEditedCaptions] = useState<Record<string, string>>({});
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [prefSummary, setPrefSummary] = useState<string>("");
  const [feedbackGiven, setFeedbackGiven] = useState<Record<string, string>>({});

  useEffect(() => {
    if (typeof window !== "undefined") {
      const id = localStorage.getItem("currentBrandVoiceId");
      const name = localStorage.getItem("currentBrandName");
      const handle = localStorage.getItem("currentBrandHandle");
      if (id) setBrandVoiceId(id);
      if (name) setBrandName(name);
      if (handle) setBrandHandle(handle);
    }
  }, []);

  // Close modals on Escape; lock body scroll while a modal is open.
  useEffect(() => {
    const anyModalOpen = campaignModalOpen || marketModalId !== null;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setCampaignModalOpen(false);
        setMarketModalId(null);
      }
    }
    if (anyModalOpen) {
      document.addEventListener("keydown", onKey);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [campaignModalOpen, marketModalId]);

  async function handleResolveHandle() {
    if (!handleInput.trim()) return;
    setResolvingHandle(true);
    setError(null);
    try {
      const res = await fetch("/api/brand-signals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ op: "resolve", handle: handleInput.trim() }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Handle not found");

      setBrandVoiceId(data.brandVoiceId);
      setBrandHandle(data.brandHandle);
      if (typeof window !== "undefined") {
        localStorage.setItem("currentBrandVoiceId", data.brandVoiceId);
        localStorage.setItem("currentBrandHandle", data.brandHandle);
      }
      setHandleInput("");
    } catch (e: any) {
      setError(e.message);
    } finally {
      setResolvingHandle(false);
    }
  }

  async function handleMatch() {
    if (!brandVoiceId) {
      setError("No brand voice found. Please complete Brand DNA first.");
      return;
    }
    if (productDescription.length < 20) {
      setError("Please describe your product in at least 20 characters.");
      return;
    }
    if (!category) {
      setError("Please select a product category.");
      return;
    }
    if (!price.trim()) {
      setError("Please enter a price.");
      return;
    }
    if (!fulfillment) {
      setError("Please select where you can serve customers (fulfillment).");
      return;
    }

    setMatching(true);
    setError(null);
    setMatches([]);
    setProductRead(null);
    setHiddenDiasporaCount(0);
    setFulfillmentNote(null);
    setResults([]);

    try {
      const res = await fetch("/api/match-clusters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productDescription,
          brandVoiceId,
          price: price.trim() || undefined,
          category,
          fulfillment,
          positioning: positioning || undefined,
          targetBuyer: targetBuyer || undefined,
          occasions: occasions.length ? occasions : undefined,
          notes:
            [notes, cares.length ? `Customers care about: ${cares.join(", ")}.` : ""]
              .filter(Boolean)
              .join(" ")
              .trim() || undefined,
          personalize,
          brandHandle: brandHandle || undefined,
          topN: 3,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Matching failed");

      setMatches(data.matches || []);
      setProductRead(data.productRead || null);
      setHiddenDiasporaCount(data.hiddenDiasporaCount || 0);
      setFulfillmentNote(data.fulfillmentNote || null);
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

      // Signal: user chose to generate for these markets (strong preference)
      sendSignals(
        matches.map((m) => ({
          brandVoiceId,
          brandHandle: brandHandle || null,
          productDescription,
          price: price || null,
          clusterId: m.cluster.id,
          action: "generated",
          recommendationScore: m.recommendation_score ?? null,
          fitTier: m.fit_tier ?? null,
        }))
      );

      const res = await fetch("/api/generate-campaign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brandVoiceId,
          productDescription,
          clusterIds,
          campaignIntent: campaignIntent || undefined,
          campaignGoal: campaignGoal.trim() || undefined,
          personalize,
          brandHandle: brandHandle || undefined,
          productCategory: category || undefined,
          customerCares: cares.length ? cares : undefined,
        }),
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

  // Regenerate a single market's campaign (from the modal). Logs a
  // "regenerated" signal and replaces just that result.
  const [regeneratingId, setRegeneratingId] = useState<string | null>(null);
  async function regenerateOne(clusterId: string) {
    setRegeneratingId(clusterId);
    sendSignals([
      {
        brandVoiceId,
        brandHandle: brandHandle || null,
        productDescription,
        price: price || null,
        clusterId,
        action: "regenerated",
      },
    ]);
    try {
      const res = await fetch("/api/generate-campaign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brandVoiceId,
          productDescription,
          clusterIds: [clusterId],
          campaignIntent: campaignIntent || undefined,
          campaignGoal: campaignGoal.trim() || undefined,
          personalize,
          brandHandle: brandHandle || undefined,
          productCategory: category || undefined,
          customerCares: cares.length ? cares : undefined,
        }),
      });
      const data = await res.json();
      if (res.ok && data.campaigns && data.campaigns[0]) {
        const fresh = data.campaigns[0];
        setResults((prev) => prev.map((x) => (x.cluster.id === clusterId ? fresh : x)));
        // Clear any prior edit for this market so the new caption shows
        setEditedCaptions((prev) => {
          const next = { ...prev };
          delete next[clusterId];
          return next;
        });
      }
    } catch {
      /* non-fatal */
    } finally {
      setRegeneratingId(null);
    }
  }

  function copyToClipboard(text: string, field: string) {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 1800);
  }

  // Log a "copied" signal for a given cluster (strongest positive signal)
  function logCopySignal(clusterId: string) {
    sendSignals([
      {
        brandVoiceId,
        brandHandle: brandHandle || null,
        productDescription,
        price: price || null,
        clusterId,
        action: "copied",
      },
    ]);
  }

  // STAGE 6: capture caption edits as a learning signal. Called on blur when
  // the user has changed the generated caption. Honest — logs that they edited,
  // feeding future personalization (does not claim instant retraining).
  function captureEdit(clusterId: string, original: string, edited: string) {
    if (!edited || edited.trim() === original.trim()) return;
    sendSignals([
      {
        brandVoiceId,
        brandHandle: brandHandle || null,
        productDescription,
        price: price || null,
        clusterId,
        action: "edited",
      },
    ]);
  }

  // Refresh the honest "Deshly is learning..." summary from real logged tags
  async function refreshPreferences() {
    if (!brandVoiceId) return;
    try {
      const res = await fetch("/api/brand-signals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ op: "preferences", brandVoiceId }),
      });
      const data = await res.json();
      if (data?.preferences?.summary) setPrefSummary(data.preferences.summary);
    } catch {
      /* non-fatal */
    }
  }

  // Per-card feedback: maps a button to an action + tag, logs it, refreshes summary
  function giveFeedback(
    clusterId: string,
    action: "used" | "rejected" | "preference" | "feedback",
    tag: string | null,
    btnLabel: string
  ) {
    sendSignals([
      {
        brandVoiceId,
        brandHandle: brandHandle || null,
        productDescription,
        price: price || null,
        clusterId,
        action,
        feedbackTag: tag,
      },
    ]);
    setFeedbackGiven((prev) => ({ ...prev, [`${clusterId}-${btnLabel}`]: btnLabel }));
    // Give the write a moment, then refresh the learning line
    setTimeout(refreshPreferences, 600);
  }

  // Load any existing preferences when results first appear
  useEffect(() => {
    if (results.length > 0 && brandVoiceId) refreshPreferences();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [results.length]);

  return (
    <ProductShell
      stepLabel="STEP 02 — CAMPAIGN GENERATOR"
      pageTitle={
        <>
          One product.{" "}
          <span className="italic text-terracotta">
            {fulfillment === "My city only" || fulfillment === "Nationwide"
              ? "Three markets."
              : fulfillment === "International shipping" || fulfillment === "Worldwide diaspora"
              ? "Three diasporas."
              : "Three audiences."}
          </span>
        </>
      }
      pageSubtitle={
        brandName ? (
          <>
            Generating for <strong className="text-cream not-italic">{brandName}</strong>. Describe your product and let Deshly recommend the best markets to test — then generate full campaign packages in parallel.
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

            {/* Returning brand: enter handle */}
            <div className="mt-8 pt-8 border-t border-cream/8 max-w-sm mx-auto">
              <div className="text-[11px] uppercase tracking-[0.15em] text-cream/45 mb-3">
                Returning? Enter your brand handle
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={handleInput}
                  onChange={(e) => setHandleInput(e.target.value)}
                  placeholder="DESHLY-7K3Q"
                  className="flex-1 bg-ink-soft border border-cream/10 rounded-xl px-4 py-3 text-sm text-cream placeholder:text-cream/25 outline-none focus:border-terracotta/50 transition-all font-mono"
                />
                <button
                  onClick={handleResolveHandle}
                  disabled={resolvingHandle || !handleInput.trim()}
                  className="bg-cream/[0.06] border border-cream/15 hover:border-brass text-cream rounded-xl px-5 text-sm font-medium transition-all disabled:opacity-30"
                >
                  {resolvingHandle ? <Loader2 className="w-4 h-4 animate-spin" /> : "Load"}
                </button>
              </div>
            </div>
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

              {/* Brand handle chip + personalization toggle */}
              {brandHandle && (
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="inline-flex items-center gap-2 text-[11px] text-cream/55 bg-ink-deep border border-cream/8 rounded-full px-3 py-1.5">
                    <span className="text-cream/35 uppercase tracking-[0.12em] text-[9px]">Brand</span>
                    <span className="font-mono text-cream/85">{brandHandle}</span>
                  </div>
                  <button
                    onClick={() => setPersonalize((v) => !v)}
                    className="inline-flex items-center gap-2 text-[11px] text-cream/55 hover:text-cream/85 transition-colors"
                  >
                    <span
                      className={`w-8 h-4 rounded-full transition-colors relative ${
                        personalize ? "bg-terracotta/60" : "bg-cream/15"
                      }`}
                    >
                      <span
                        className={`absolute top-0.5 w-3 h-3 rounded-full bg-cream transition-all ${
                          personalize ? "left-4" : "left-0.5"
                        }`}
                      />
                    </span>
                    Personalize from my history
                  </button>
                </div>
              )}

              <label className="block">
                <div className="text-[11px] uppercase tracking-[0.15em] text-cream/50 mb-3">
                  Product Description
                </div>
                <textarea
                  value={productDescription}
                  onChange={(e) => {
                    setProductDescription(e.target.value);
                    // Auto-grow with content
                    e.target.style.height = "auto";
                    e.target.style.height = `${Math.min(e.target.scrollHeight, 240)}px`;
                  }}
                  rows={2}
                  placeholder="Describe your product in a sentence or two…"
                  className="w-full bg-ink-soft/60 border border-cream/8 rounded-xl px-4 py-3 text-[15px] text-cream placeholder:text-cream/25 outline-none focus:border-terracotta/40 focus:bg-ink-deep/60 transition-all resize-none overflow-hidden leading-relaxed"
                />
                <div className="flex items-center justify-between mt-2 gap-3">
                  <div className="text-[10px] text-cream/40 leading-snug">
                    {DESC_HINT_BY_CATEGORY[category] ||
                      "Mention what it is, key details (color/material/specs), price, and who it's for."}
                  </div>
                  <div className="text-[10px] text-cream/35 font-mono flex-shrink-0">
                    {productDescription.length}
                  </div>
                </div>
              </label>

              {/* CATEGORY (required) */}
              <label className="block">
                <div className="text-[11px] uppercase tracking-[0.15em] text-cream/50 mb-3">
                  Category <span className="text-terracotta">*</span>
                </div>
                <select
                  value={category}
                  onChange={(e) => {
                    const next = e.target.value;
                    setCategory(next);
                    // Reset category-specific chips so stale picks don't carry over
                    setPositioning("");
                    setTargetBuyer("");
                    setOccasions([]);
                    setCares([]);
                    setCampaignIntent("");
                    if (typeof window !== "undefined" && next) {
                      localStorage.setItem("currentProductCategory", next);
                    }
                  }}
                  className="w-full bg-ink-soft border border-cream/10 rounded-xl px-5 py-3.5 text-base text-cream outline-none focus:border-terracotta/50 focus:bg-ink-deep transition-all"
                >
                  <option value="">Select a category…</option>
                  <option value="Fashion">Fashion</option>
                  <option value="Beauty">Beauty</option>
                  <option value="Food">Food</option>
                  <option value="Home & Living">Home &amp; Living</option>
                  <option value="Jewelry">Jewelry</option>
                  <option value="Electronics">Electronics</option>
                  <option value="Services">Services</option>
                  <option value="Other">Other</option>
                </select>
              </label>

              {/* PRICE (required) */}
              <label className="block">
                <div className="text-[11px] uppercase tracking-[0.15em] text-cream/50 mb-3">
                  Price <span className="text-terracotta">*</span>
                </div>
                <input
                  type="text"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="e.g. ৳3,500  ·  $45  ·  £40"
                  className="w-full bg-ink-soft border border-cream/10 rounded-xl px-5 py-3.5 text-base text-cream placeholder:text-cream/25 outline-none focus:border-terracotta/50 focus:bg-ink-deep transition-all"
                />
              </label>

              {/* FULFILLMENT (required) — drives which markets are reachable */}
              <div className="block">
                <div className="text-[11px] uppercase tracking-[0.15em] text-cream/50 mb-3">
                  Where can you serve customers? <span className="text-terracotta">*</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { v: "My city only", label: "My city only" },
                    { v: "Nationwide", label: "Nationwide" },
                    { v: "International shipping", label: "International shipping" },
                    { v: "Worldwide diaspora", label: "Worldwide diaspora" },
                  ].map((opt) => (
                    <button
                      key={opt.v}
                      type="button"
                      onClick={() => setFulfillment(opt.v)}
                      className={`text-left px-4 py-3 rounded-xl border text-sm transition-all ${
                        fulfillment === opt.v
                          ? "border-terracotta bg-terracotta/10 text-cream"
                          : "border-cream/10 bg-ink-soft text-cream/65 hover:border-cream/25"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
                <div className="text-[10px] text-cream/35 mt-2 leading-relaxed">
                  Deshly only recommends markets you can actually serve.
                </div>
              </div>

              {/* ADD MORE DETAILS (optional, collapsed) */}
              <div>
                <button
                  type="button"
                  onClick={() => setShowMoreDetails((v) => !v)}
                  className="flex items-center gap-1.5 text-[11px] text-cream/55 hover:text-terracotta transition-colors"
                >
                  <ChevronDown
                    className={`w-3.5 h-3.5 transition-transform ${showMoreDetails ? "rotate-180" : ""}`}
                  />
                  {showMoreDetails ? "Hide extra details" : "Add more details (optional)"}
                </button>

                <AnimatePresence>
                  {showMoreDetails && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      className="overflow-hidden"
                    >
                      <div className="space-y-6 pt-5">
                        {/* ===== SECTION 1 — AUDIENCE & USE CASE ===== */}
                        <div className="space-y-4">
                          <div className="text-[10px] uppercase tracking-[0.18em] text-brass border-b border-cream/8 pb-2">
                            Audience &amp; Use Case
                          </div>

                          {/* Main buyer (category-aware) */}
                          <div>
                            <div className="text-[10px] uppercase tracking-[0.15em] text-cream/45 mb-2">
                              Main Buyer
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {buyersFor(category).map((b) => (
                                <button
                                  key={b}
                                  type="button"
                                  onClick={() => setTargetBuyer(targetBuyer === b ? "" : b)}
                                  className={`px-3 py-1.5 rounded-full border text-xs transition-all ${
                                    targetBuyer === b
                                      ? "border-terracotta bg-terracotta/10 text-cream"
                                      : "border-cream/10 text-cream/60 hover:border-cream/25"
                                  }`}
                                >
                                  {b}
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Use case (multi-select, category-aware) */}
                          <div>
                            <div className="text-[10px] uppercase tracking-[0.15em] text-cream/45 mb-2">
                              Use Case <span className="text-cream/30 normal-case tracking-normal">(select any)</span>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {useCasesFor(category).map((o) => {
                                const active = occasions.includes(o);
                                return (
                                  <button
                                    key={o}
                                    type="button"
                                    onClick={() =>
                                      setOccasions((prev) =>
                                        prev.includes(o) ? prev.filter((x) => x !== o) : [...prev, o]
                                      )
                                    }
                                    className={`px-3 py-1.5 rounded-full border text-xs transition-all ${
                                      active
                                        ? "border-brass bg-brass/10 text-brass"
                                        : "border-cream/10 text-cream/60 hover:border-cream/25"
                                    }`}
                                  >
                                    {o}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        </div>

                        {/* ===== SECTION 2 — CUSTOMER PRIORITIES (category-aware) ===== */}
                        <div>
                          <div className="text-[10px] uppercase tracking-[0.18em] text-brass border-b border-cream/8 pb-2 mb-3">
                            Customer Priorities <span className="text-cream/30 normal-case tracking-normal">(what they care about)</span>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {caresFor(category).map((c) => {
                              const active = cares.includes(c);
                              return (
                                <button
                                  key={c}
                                  type="button"
                                  onClick={() =>
                                    setCares((prev) =>
                                      prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]
                                    )
                                  }
                                  className={`px-3 py-1.5 rounded-full border text-xs transition-all ${
                                    active
                                      ? "border-brass bg-brass/10 text-brass"
                                      : "border-cream/10 text-cream/60 hover:border-cream/25"
                                  }`}
                                >
                                  {c}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* ===== SECTION 3 — BRAND POSITIONING (category-aware) ===== */}
                        <div>
                          <div className="text-[10px] uppercase tracking-[0.18em] text-brass border-b border-cream/8 pb-2 mb-3">
                            Brand Positioning
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {positioningFor(category).map((p) => (
                              <button
                                key={p}
                                type="button"
                                onClick={() => setPositioning(positioning === p ? "" : p)}
                                className={`px-3 py-1.5 rounded-full border text-xs transition-all ${
                                  positioning === p
                                    ? "border-terracotta bg-terracotta/10 text-cream"
                                    : "border-cream/10 text-cream/60 hover:border-cream/25"
                                }`}
                              >
                                {p}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* ===== SECTION 4 — ADDITIONAL NOTES ===== */}
                        <div>
                          <div className="text-[10px] uppercase tracking-[0.18em] text-brass border-b border-cream/8 pb-2 mb-3">
                            Additional Notes
                          </div>
                          <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            rows={2}
                            placeholder="Anything else Deshly should know…"
                            className="w-full bg-ink-soft border border-cream/10 rounded-xl px-4 py-3 text-sm text-cream placeholder:text-cream/25 outline-none focus:border-terracotta/50 transition-all resize-none"
                          />
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* CAMPAIGN INTENT — this-campaign-only tone, doesn't change DNA */}
              <div>
                <div className="text-[11px] uppercase tracking-[0.15em] text-cream/50 mb-3">
                  Campaign intent <span className="text-cream/30 normal-case tracking-normal">(optional — nudges tone for this campaign only)</span>
                </div>
                <div className="flex flex-wrap gap-2 mb-3">
                  {intentsFor(category).map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setCampaignIntent(campaignIntent === opt ? "" : opt)}
                      className={`text-[11px] px-3 py-1.5 rounded-full border transition-all ${
                        campaignIntent === opt
                          ? "border-terracotta bg-terracotta/10 text-cream"
                          : "border-cream/12 text-cream/60 hover:border-cream/30"
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  value={campaignGoal}
                  onChange={(e) => setCampaignGoal(e.target.value)}
                  placeholder="Or describe your goal, e.g. 'clear old stock before Eid'"
                  className="w-full bg-ink-soft border border-cream/10 rounded-xl px-4 py-2.5 text-sm text-cream placeholder:text-cream/25 outline-none focus:border-terracotta/50 transition-all"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  onClick={handleMatch}
                  disabled={matching || generating || productDescription.length < 20 || !category || !price.trim() || !fulfillment}
                  className="bg-cream/[0.04] border border-cream/15 hover:border-brass hover:bg-cream/[0.08] text-cream rounded-full py-4 px-6 font-medium text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  {matching ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Finding markets...
                    </>
                  ) : (
                    <>
                      <Globe className="w-4 h-4" />
                      1 — Recommend Markets
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

          {/* RECOMMENDED MARKETS */}
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
                    <span>RECOMMENDED MARKETS TO TEST</span>
                  </div>
                  <div className="font-mono text-[10px] text-cream/40">
                    {matches.length} ranked
                  </div>
                </div>

                {/* HIDDEN MARKETS NOTE — fulfillment filter feedback */}
                {hiddenDiasporaCount > 0 && fulfillmentNote && (
                  <div className="bg-brass/[0.06] border border-brass/20 rounded-xl px-4 py-3 mb-5 flex items-center gap-2.5">
                    <Globe className="w-3.5 h-3.5 text-brass flex-shrink-0" />
                    <div className="text-[12px] text-cream/70">{fulfillmentNote}</div>
                  </div>
                )}

                {/* HOW DESHLY READ YOUR PRODUCT — 4 pills */}
                {productRead && (
                  <div className="bg-ink border border-cream/8 rounded-xl px-5 py-4 mb-5">
                    <div className="flex items-center gap-2 mb-3">
                      <Lightbulb className="w-4 h-4 text-brass flex-shrink-0" strokeWidth={1.5} />
                      <div className="text-[9px] uppercase tracking-[0.18em] text-brass font-medium">
                        How Deshly read your product
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {productRead.category && (
                        <ProductPill label="Category" value={productRead.category} />
                      )}
                      {productRead.price_tier && (
                        <ProductPill label="Price Tier" value={productRead.price_tier} />
                      )}
                      {productRead.use_case && (
                        <ProductPill label="Use Case" value={productRead.use_case} />
                      )}
                      {productRead.trust_requirement && (
                        <ProductPill label="Trust" value={productRead.trust_requirement} />
                      )}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {matches.map((m, i) => {
                    const seg = segmentName(m.cluster);
                    const tier = m.fit_tier || "Moderate Fit";
                    const tierColor = fitTierToColor(tier);
                    const score = m.recommendation_score;

                    return (
                      <motion.button
                        key={m.cluster.id}
                        onClick={() => setMarketModalId(m.cluster.id)}
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        transition={{ delay: i * 0.12, duration: 0.5 }}
                        className="text-left bg-ink rounded-2xl p-5 sm:p-6 border border-cream/8 relative overflow-hidden group hover:border-terracotta/30 transition-all"
                      >
                        <div
                          className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                          style={{
                            background:
                              "radial-gradient(circle at top, rgba(213, 97, 62, 0.08), transparent 60%)",
                          }}
                        />
                        <div className="relative">
                          {/* COMPACT — decision info only */}
                          <div className="flex items-start justify-between mb-3 gap-3">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="text-2xl flex-shrink-0">{FLAGS[m.cluster.country] || "🌍"}</div>
                              <div className="min-w-0">
                                <div className="font-serif text-lg leading-tight">
                                  {seg.title}
                                </div>
                                <div className="text-[9px] uppercase tracking-wider text-cream/40 font-mono mt-0.5">
                                  {seg.subtitle || m.cluster.country}
                                </div>
                              </div>
                            </div>
                            <div
                              className={`px-2.5 py-1 rounded-full text-[9px] uppercase tracking-[0.12em] font-medium border flex-shrink-0 ${tierColor}`}
                            >
                              {tier}
                            </div>
                          </div>

                          {typeof score === "number" && (
                            <div className="flex items-baseline gap-2 mb-3">
                              <div className="font-serif text-3xl text-terracotta leading-none">
                                {score.toFixed(1)}
                                <span className="text-base text-cream/40">/10</span>
                              </div>
                              <div className="text-[9px] uppercase tracking-[0.14em] text-cream/45 font-medium pb-1">
                                Recommendation
                              </div>
                            </div>
                          )}

                          {m.one_line_reason && (
                            <div className="bg-terracotta/8 border border-terracotta/20 rounded-lg px-3.5 py-3 mb-3">
                              <div className="text-[8px] uppercase tracking-[0.18em] text-terracotta mb-1 font-medium">
                                Best reason
                              </div>
                              <div className="text-[12.5px] text-cream/90 leading-snug line-clamp-3">
                                {m.one_line_reason}
                              </div>
                            </div>
                          )}

                          {/* Mini scores — compact one-liner */}
                          {m.score_breakdown && (
                            <div className="flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-cream/55 mb-4 font-mono">
                              {typeof m.score_breakdown.product_market_fit === "number" && (
                                <span>Product <span className="text-cream/85">{m.score_breakdown.product_market_fit}</span></span>
                              )}
                              {typeof m.score_breakdown.price_alignment === "number" && (
                                <span>Price <span className="text-cream/85">{m.score_breakdown.price_alignment}</span></span>
                              )}
                              {typeof m.score_breakdown.occasion_fit === "number" && (
                                <span>Use-case <span className="text-cream/85">{m.score_breakdown.occasion_fit}</span></span>
                              )}
                              {typeof m.score_breakdown.channel_fit === "number" && (
                                <span>Channel <span className="text-cream/85">{m.score_breakdown.channel_fit}</span></span>
                              )}
                            </div>
                          )}

                          <div className="w-full flex items-center justify-center gap-1.5 text-[11px] text-cream/55 group-hover:text-terracotta transition-colors py-2 border-t border-cream/8">
                            View reasoning
                            <ArrowRight className="w-3.5 h-3.5" />
                          </div>
                        </div>
                      </motion.button>
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

                {/* LEARNING LINE — honest: neutral before clicks, real summary after */}
                <div className="bg-brass/[0.06] border border-brass/20 rounded-xl px-4 py-3 mb-5 flex items-start gap-2.5">
                  <Sparkles className="w-3.5 h-3.5 text-brass flex-shrink-0 mt-0.5" />
                  <div className="text-[12px] text-cream/75 leading-snug">
                    {prefSummary ||
                      "Deshly captures your feedback to tune future campaigns for this brand. React on each card to start."}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {results.map((r, i) => {
                    const seg = segmentName(r.cluster);
                    const channelInfo = r.campaign
                      ? parseChannelRecommendation(r.campaign.channel_recommendation)
                      : { platform: "—", insight: "" };
                    const platformStyle = platformBadge(channelInfo.platform);
                    const match = matches.find((mm) => mm.cluster.id === r.cluster.id);
                    const fit = match?.fit_tier || "Moderate Fit";
                    const fitColor = fitTierToColor(fit);
                    let potential = { label: "Medium", color: "" };
                    if (r.campaign) {
                      const mid = (r.campaign.predicted_engagement_min + r.campaign.predicted_engagement_max) / 2;
                      potential = potentialLevel(mid, r.cluster.typical_engagement_rate || 0.03);
                    }
                    const open = () => {
                      setActiveCampaignId(r.cluster.id);
                      setCampaignModalOpen(true);
                    };
                    return (
                      <motion.div
                        key={r.cluster.id}
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.12, duration: 0.5 }}
                        className="bg-gradient-to-br from-ink-soft to-ink rounded-2xl p-5 sm:p-6 border border-cream/8 relative overflow-hidden group hover:border-terracotta/30 transition-all"
                      >
                        <div
                          className="absolute top-0 left-0 right-0 h-px"
                          style={{
                            background:
                              "linear-gradient(90deg, transparent, rgba(184, 149, 106, 0.4), transparent)",
                          }}
                        />
                        <div className="relative">
                          {/* HEADER — segment name + fit label */}
                          <div className="flex items-start justify-between mb-3 gap-3">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="text-2xl flex-shrink-0">
                                {FLAGS[r.cluster.country] || "🌍"}
                              </div>
                              <div className="min-w-0">
                                <div className="font-serif text-lg leading-tight">
                                  {seg.title}
                                </div>
                                <div className="text-[10px] uppercase tracking-[0.12em] text-cream/45 mt-0.5">
                                  {seg.subtitle}
                                </div>
                              </div>
                            </div>
                            <div className={`px-2.5 py-1 rounded-full text-[9px] uppercase tracking-[0.12em] font-medium border flex-shrink-0 ${fitColor}`}>
                              {fit}
                            </div>
                          </div>

                          {!r.success && (
                            <div className="bg-red-950/40 border border-red-800/40 rounded-xl p-3 text-xs text-red-300">
                              Generation failed: {r.error}
                            </div>
                          )}

                          {r.success && r.campaign && (
                            <>
                              {/* Why this works — one line */}
                              {r.campaign.why_this_campaign && (
                                <div className="mb-3">
                                  <div className="text-[8px] uppercase tracking-[0.18em] text-terracotta mb-1 font-medium">
                                    Why this works
                                  </div>
                                  <div className="text-[12.5px] text-cream/85 leading-snug line-clamp-2">
                                    {r.campaign.why_this_campaign}
                                  </div>
                                </div>
                              )}

                              {/* Campaign angle — caption preview as the angle */}
                              <div className="mb-3">
                                <div className="text-[8px] uppercase tracking-[0.18em] text-brass mb-1 font-medium">
                                  Campaign angle
                                </div>
                                <div className="text-[12px] text-cream/65 leading-relaxed line-clamp-2">
                                  {editedCaptions[r.cluster.id] ?? r.campaign.caption}
                                </div>
                              </div>

                              {/* Signal + best time */}
                              <div className="flex flex-wrap gap-2 mb-4">
                                <span className={`inline-flex items-center gap-1.5 text-[10px] px-2.5 py-1 rounded-full border border-cream/8 ${platformStyle.text}`}>
                                  {platformStyle.icon} {channelInfo.platform} · {potential.label}
                                </span>
                                <span className="inline-flex items-center gap-1.5 text-[10px] text-cream/60 bg-ink-deep border border-cream/8 rounded-full px-2.5 py-1">
                                  <Clock className="w-3 h-3 text-brass" />
                                  {r.campaign.posting_time}
                                </span>
                              </div>

                              {/* CTAs — Copy caption + View full package */}
                              <div className="flex gap-2 pt-3 border-t border-cream/8">
                                <button
                                  onClick={() => {
                                    copyToClipboard(editedCaptions[r.cluster.id] ?? r.campaign!.caption, `${r.cluster.id}-cardcap`);
                                    logCopySignal(r.cluster.id);
                                  }}
                                  className="flex-1 flex items-center justify-center gap-1.5 text-[11px] text-cream/70 hover:text-terracotta border border-cream/12 hover:border-terracotta/40 rounded-lg py-2 transition-all"
                                >
                                  {copiedField === `${r.cluster.id}-cardcap` ? (
                                    <><Check className="w-3.5 h-3.5" /> Copied</>
                                  ) : (
                                    <><Copy className="w-3.5 h-3.5" /> Copy caption</>
                                  )}
                                </button>
                                <button
                                  onClick={open}
                                  className="flex-1 flex items-center justify-center gap-1.5 text-[11px] text-cream bg-terracotta/15 hover:bg-terracotta/25 border border-terracotta/30 rounded-lg py-2 transition-all font-medium"
                                >
                                  View full package
                                  <ArrowRight className="w-3.5 h-3.5" />
                                </button>
                              </div>
                              <button
                                onClick={open}
                                className="w-full text-center text-[10px] text-cream/40 hover:text-cream/70 transition-colors mt-2"
                              >
                                Tune output
                              </button>
                            </>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}

          {/* ============================================================
              MARKET REASONING MODAL
              ============================================================ */}
          <AnimatePresence>
            {marketModalId && (() => {
              const m = matches.find((x) => x.cluster.id === marketModalId);
              if (!m) return null;
              const seg = segmentName(m.cluster);
              const tier = m.fit_tier || "Moderate Fit";
              const tierColor = fitTierToColor(tier);
              const score = m.recommendation_score;
              const bd = m.score_breakdown;
              const channelName = (m.reasoning?.best_channel || "").split(/[—\-–]/)[0].trim();
              return (
                <>
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={() => setMarketModalId(null)}
                    className="fixed inset-0 bg-void/80 backdrop-blur-sm z-[60]"
                  />
                  <motion.div
                    initial={{ opacity: 0, scale: 0.96, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.96, y: 20 }}
                    transition={{ duration: 0.25 }}
                    className="fixed inset-0 z-[61] flex items-center justify-center p-0 sm:p-6 pointer-events-none"
                  >
                    <div className="bg-ink border border-cream/10 w-full sm:max-w-lg sm:rounded-2xl h-full sm:h-auto sm:max-h-[85vh] overflow-y-auto pointer-events-auto relative">
                      {/* Header */}
                      <div className="sticky top-0 bg-ink/95 backdrop-blur-xl border-b border-cream/8 px-5 py-4 flex items-center justify-between z-10">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="text-2xl flex-shrink-0">{FLAGS[m.cluster.country] || "🌍"}</div>
                          <div className="min-w-0">
                            <div className="font-serif text-lg leading-tight">{seg.title}</div>
                            <div className="text-[9px] uppercase tracking-wider text-cream/40 font-mono mt-0.5">
                              {seg.subtitle || m.cluster.country}
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={() => setMarketModalId(null)}
                          aria-label="Close"
                          className="w-9 h-9 rounded-lg border border-cream/10 flex items-center justify-center text-cream/60 hover:text-cream hover:bg-cream/5 transition-colors flex-shrink-0"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="p-5 space-y-5">
                        {/* Score + tier */}
                        <div className="flex items-center justify-between gap-3">
                          {typeof score === "number" && (
                            <div className="flex items-baseline gap-2">
                              <div className="font-serif text-4xl text-terracotta leading-none">
                                {score.toFixed(1)}
                                <span className="text-lg text-cream/40">/10</span>
                              </div>
                              <div className="text-[9px] uppercase tracking-[0.14em] text-cream/45 font-medium pb-1">
                                Recommendation
                              </div>
                            </div>
                          )}
                          <div className={`px-2.5 py-1 rounded-full text-[9px] uppercase tracking-[0.12em] font-medium border ${tierColor}`}>
                            {tier}
                          </div>
                        </div>

                        {m.one_line_reason && (
                          <div className="bg-terracotta/8 border border-terracotta/20 rounded-lg px-3.5 py-3">
                            <div className="text-[8px] uppercase tracking-[0.18em] text-terracotta mb-1 font-medium">
                              Best reason
                            </div>
                            <div className="text-[13px] text-cream/90 leading-snug">{m.one_line_reason}</div>
                          </div>
                        )}

                        {bd && (
                          <div className="grid grid-cols-2 gap-2">
                            <ScoreChip label="Product–Market" value={bd.product_market_fit} />
                            <ScoreChip label="Price Align" value={bd.price_alignment} />
                            <ScoreChip label="Occasion Fit" value={bd.occasion_fit} />
                            <ScoreChip label="Channel Fit" value={bd.channel_fit} />
                          </div>
                        )}

                        {m.reasoning && (
                          <div className="space-y-3">
                            <ReasonBlock label="Why this market fits" text={m.reasoning.why_this_fits} />
                            <ReasonBlock label="Price fit" text={m.reasoning.affordability_read} />
                            <ReasonBlock label="Buying motivation" text={m.reasoning.buying_motivation} />
                            {m.reasoning.suggested_positioning && (
                              <ReasonBlock label="Suggested positioning" text={m.reasoning.suggested_positioning} />
                            )}
                            {m.reasoning.risk_note && (
                              <div className="bg-cream/[0.03] border border-cream/10 rounded-lg px-3 py-2.5">
                                <div className="text-[8px] uppercase tracking-[0.16em] text-brass mb-1 font-medium">
                                  Risk / caution
                                </div>
                                <div className="text-[12px] text-cream/70 leading-snug">{m.reasoning.risk_note}</div>
                              </div>
                            )}
                            <div className="flex flex-wrap gap-2 pt-1">
                              {channelName && (
                                <div className="inline-flex items-center gap-1.5 text-[10px] text-cream/70 bg-ink-deep border border-cream/8 rounded-full px-2.5 py-1">
                                  <Send className="w-3 h-3 text-brass" />
                                  {channelName}
                                </div>
                              )}
                              {m.reasoning.best_timing_note && (
                                <div className="inline-flex items-center gap-1.5 text-[10px] text-cream/70 bg-ink-deep border border-cream/8 rounded-full px-2.5 py-1">
                                  <Clock className="w-3 h-3 text-brass" />
                                  {m.reasoning.best_timing_note}
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                </>
              );
            })()}
          </AnimatePresence>

          {/* ============================================================
              CAMPAIGN PACKAGE MODAL (shared, with market switcher)
              ============================================================ */}
          <AnimatePresence>
            {campaignModalOpen && results.length > 0 && (() => {
              const active = results.find((x) => x.cluster.id === activeCampaignId) || results[0];
              const r = active;
              return (
                <>
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={() => setCampaignModalOpen(false)}
                    className="fixed inset-0 bg-void/80 backdrop-blur-sm z-[60]"
                  />
                  <motion.div
                    initial={{ opacity: 0, scale: 0.97, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.97, y: 20 }}
                    transition={{ duration: 0.25 }}
                    className="fixed inset-0 z-[61] flex items-stretch sm:items-center justify-center p-0 sm:p-6 pointer-events-none"
                  >
                    <div className="bg-ink border border-cream/10 w-full sm:max-w-4xl sm:rounded-2xl h-full sm:h-auto sm:max-h-[88vh] overflow-hidden pointer-events-auto relative flex flex-col sm:flex-row">
                      {/* Market switcher (left on desktop, top on mobile) */}
                      <div className="border-b sm:border-b-0 sm:border-r border-cream/8 sm:w-52 flex-shrink-0 bg-ink-deep/50">
                        <div className="px-4 py-4 flex sm:flex-col gap-2 overflow-x-auto">
                          <div className="hidden sm:block text-[9px] uppercase tracking-[0.18em] text-brass mb-1 px-1">
                            Markets
                          </div>
                          {results.map((rr) => {
                            const isActive = rr.cluster.id === active.cluster.id;
                            const rrSeg = segmentName(rr.cluster);
                            return (
                              <button
                                key={rr.cluster.id}
                                onClick={() => setActiveCampaignId(rr.cluster.id)}
                                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-all flex-shrink-0 ${
                                  isActive
                                    ? "bg-terracotta/15 border border-terracotta/30 text-cream"
                                    : "border border-transparent text-cream/55 hover:text-cream hover:bg-cream/[0.03]"
                                }`}
                              >
                                <span className="text-lg flex-shrink-0">{FLAGS[rr.cluster.country] || "🌍"}</span>
                                <span className="text-[12px] font-medium whitespace-nowrap sm:whitespace-normal">{rrSeg.title}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Active campaign detail */}
                      <div className="flex-1 overflow-y-auto min-w-0">
                        <div className="sticky top-0 bg-ink/95 backdrop-blur-xl border-b border-cream/8 px-5 py-4 flex items-center justify-between z-10">
                          <div className="min-w-0">
                            <div className="font-serif text-lg leading-tight">{segmentName(r.cluster).title}</div>
                            <div className="text-[10px] uppercase tracking-[0.12em] text-cream/45 mt-0.5">
                              {segmentName(r.cluster).subtitle}
                            </div>
                          </div>
                          <button
                            onClick={() => setCampaignModalOpen(false)}
                            aria-label="Close"
                            className="w-9 h-9 rounded-lg border border-cream/10 flex items-center justify-center text-cream/60 hover:text-cream hover:bg-cream/5 transition-colors flex-shrink-0"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>

                        {!r.success && (
                          <div className="m-5 bg-red-950/40 border border-red-800/40 rounded-xl p-3 text-xs text-red-300">
                            Generation failed: {r.error}
                          </div>
                        )}

                        {r.success && r.campaign && (
                          <div className="p-5 space-y-5">
                            {/* Learning line */}
                            <div className="bg-brass/[0.06] border border-brass/20 rounded-xl px-4 py-3 flex items-start gap-2.5">
                              <Sparkles className="w-3.5 h-3.5 text-brass flex-shrink-0 mt-0.5" />
                              <div className="text-[12px] text-cream/75 leading-snug">
                                {prefSummary ||
                                  "Deshly captures your feedback to tune future campaigns for this brand. React below to start."}
                              </div>
                            </div>

                            {/* Why this campaign */}
                            {r.campaign.why_this_campaign && (
                              <div className="bg-terracotta/8 border border-terracotta/20 rounded-lg px-3.5 py-3">
                                <div className="text-[8px] uppercase tracking-[0.18em] text-terracotta mb-1 font-medium">
                                  Why this campaign works here
                                </div>
                                <div className="text-[12.5px] text-cream/90 leading-snug">
                                  {r.campaign.why_this_campaign}
                                </div>
                              </div>
                            )}

                            {/* Caption (editable) */}
                            <div>
                              <div className="flex items-center justify-between mb-2">
                                <div className="text-[10px] uppercase tracking-[0.15em] text-cream/55 font-medium">
                                  Caption
                                </div>
                                <button
                                  onClick={() => {
                                    copyToClipboard(editedCaptions[r.cluster.id] ?? r.campaign!.caption, `${r.cluster.id}-caption`);
                                    logCopySignal(r.cluster.id);
                                  }}
                                  className="text-[10px] flex items-center gap-1 text-cream/50 hover:text-terracotta transition-colors"
                                >
                                  {copiedField === `${r.cluster.id}-caption` ? (
                                    <><Check className="w-3 h-3" /> Copied</>
                                  ) : (
                                    <><Copy className="w-3 h-3" /> Copy</>
                                  )}
                                </button>
                              </div>
                              <textarea
                                defaultValue={r.campaign.caption}
                                onChange={(e) =>
                                  setEditedCaptions((prev) => ({ ...prev, [r.cluster.id]: e.target.value }))
                                }
                                onBlur={(e) => captureEdit(r.cluster.id, r.campaign!.caption, e.target.value)}
                                rows={5}
                                className="w-full bg-ink-deep/60 border border-cream/8 rounded-lg p-3.5 text-[13px] leading-relaxed text-cream/85 whitespace-pre-wrap outline-none focus:border-terracotta/40 transition-all resize-y"
                              />
                              <div className="text-[9px] text-cream/30 mt-1">
                                You can edit this caption — your changes help Deshly learn your brand.
                              </div>
                            </div>

                            {/* Campaign signal — honest potential */}
                            {(() => {
                              const channelInfo = parseChannelRecommendation(r.campaign.channel_recommendation);
                              const midEngagement = (r.campaign.predicted_engagement_min + r.campaign.predicted_engagement_max) / 2;
                              const baseline = r.cluster.typical_engagement_rate || 0.03;
                              const potential = potentialLevel(midEngagement, baseline);
                              const platformStyle = platformBadge(channelInfo.platform);
                              return (
                                <div className="bg-ink-deep border border-cream/12 rounded-xl overflow-hidden">
                                  <div className={`px-4 py-3 border-b border-cream/8 flex items-center gap-2.5 ${platformStyle.bg}`}>
                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-base ${platformStyle.iconBg}`}>
                                      {platformStyle.icon}
                                    </div>
                                    <div className="min-w-0">
                                      <div className="text-[9px] uppercase tracking-[0.15em] text-cream/50 font-medium leading-none mb-1">
                                        Campaign Signal
                                      </div>
                                      <div className={`text-sm font-semibold leading-none ${platformStyle.text}`}>
                                        Best on {channelInfo.platform}
                                      </div>
                                    </div>
                                  </div>
                                  <div className="px-4 pt-4 pb-3 border-b border-cream/8">
                                    <div className="text-[9px] uppercase tracking-[0.15em] text-cream/45 mb-2 font-medium">
                                      Test Potential
                                    </div>
                                    <div className={`inline-block text-[11px] uppercase tracking-[0.12em] px-3 py-1.5 rounded-full border font-medium ${potential.color}`}>
                                      {potential.label} potential
                                    </div>
                                    <div className="text-[10px] text-cream/40 mt-2.5 leading-relaxed">
                                      Based on audience size, platform fit, and typical engagement assumptions — not a guaranteed result.
                                    </div>
                                  </div>
                                  <div className="px-4 py-3 border-b border-cream/8 space-y-2.5">
                                    <div className="flex items-center gap-2.5 text-xs">
                                      <Clock className="w-3.5 h-3.5 text-brass flex-shrink-0" />
                                      <div className="text-cream/55">Best time:</div>
                                      <div className="text-cream/95 font-medium min-w-0">{r.campaign.posting_time}</div>
                                    </div>
                                    <div className="flex items-center gap-2.5 text-xs">
                                      <span className="text-brass flex-shrink-0">👥</span>
                                      <div className="text-cream/55">Audience size:</div>
                                      <div className="text-cream/95 font-medium">~{formatReach(r.cluster.estimated_size)} people</div>
                                    </div>
                                  </div>
                                  <div className="px-4 py-3">
                                    <div className="text-[9px] uppercase tracking-[0.15em] text-cream/45 mb-1.5 font-medium">
                                      Why this platform
                                    </div>
                                    <div className="text-[11px] text-cream/75 leading-relaxed">{channelInfo.insight}</div>
                                  </div>
                                </div>
                              );
                            })()}

                            {/* Copy full package */}
                            <button
                              onClick={() => {
                                copyToClipboard(buildCampaignPackage(r), `${r.cluster.id}-package`);
                                logCopySignal(r.cluster.id);
                              }}
                              className="w-full bg-gradient-to-r from-terracotta to-terracotta-deep text-cream rounded-xl py-3.5 px-4 font-medium text-sm flex items-center justify-center gap-2 transition-all hover:shadow-[0_0_30px_rgba(213,97,62,0.3)]"
                            >
                              {copiedField === `${r.cluster.id}-package` ? (
                                <><Check className="w-4 h-4" /> Copied entire package</>
                              ) : (
                                <><Copy className="w-4 h-4" /> Copy Full Campaign Package</>
                              )}
                            </button>

                            {/* Feedback */}
                            <div className="border border-cream/8 rounded-xl p-3">
                              <div className="text-[9px] uppercase tracking-[0.15em] text-cream/45 mb-2 font-medium">
                                Tune this for your brand
                              </div>
                              <div className="flex flex-wrap gap-1.5">
                                {([
                                  { label: "Use this", action: "used", tag: null },
                                  { label: "Not relevant", action: "rejected", tag: "not_relevant" },
                                  { label: "Too formal", action: "feedback", tag: "too_formal" },
                                  { label: "Too generic", action: "feedback", tag: "too_generic" },
                                  { label: "More emotional", action: "preference", tag: "more_emotional" },
                                  { label: "More premium", action: "preference", tag: "more_premium" },
                                  { label: "More Bangla", action: "preference", tag: "more_bangla" },
                                  { label: "More direct", action: "preference", tag: "more_direct" },
                                  { label: "Wrong audience", action: "rejected", tag: "wrong_audience" },
                                ] as const).map((b) => {
                                  const key = `${r.cluster.id}-${b.label}`;
                                  const act = feedbackGiven[key];
                                  return (
                                    <button
                                      key={b.label}
                                      onClick={() => giveFeedback(r.cluster.id, b.action, b.tag, b.label)}
                                      className={`text-[10.5px] px-2.5 py-1 rounded-full border transition-all ${
                                        act
                                          ? "border-terracotta bg-terracotta/15 text-terracotta"
                                          : "border-cream/12 text-cream/60 hover:border-cream/30 hover:text-cream/85"
                                      }`}
                                    >
                                      {act ? "✓ " : ""}{b.label}
                                    </button>
                                  );
                                })}
                              </div>
                              <button
                                onClick={() => regenerateOne(r.cluster.id)}
                                disabled={regeneratingId === r.cluster.id}
                                className="mt-2.5 w-full flex items-center justify-center gap-1.5 text-[11px] text-cream/70 hover:text-terracotta border border-cream/12 hover:border-terracotta/40 rounded-lg py-2 transition-all disabled:opacity-40"
                              >
                                {regeneratingId === r.cluster.id ? (
                                  <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Regenerating…</>
                                ) : (
                                  <><Wand2 className="w-3.5 h-3.5" /> Regenerate this campaign</>
                                )}
                              </button>
                            </div>

                            {/* Drawers: WhatsApp, Hashtags, Image Prompts */}
                            <div className="space-y-2">
                              <details className="bg-ink-deep border border-cream/8 rounded-xl group">
                                <summary className="p-3 cursor-pointer text-xs font-medium flex items-center justify-between list-none hover:bg-cream/[0.02] rounded-xl transition-colors">
                                  <span className="flex items-center gap-2">
                                    <span>🎨</span>
                                    <span className="uppercase tracking-[0.15em] text-brass">Image Prompts</span>
                                    <span className="text-[10px] text-cream/40 font-mono">[3]</span>
                                  </span>
                                  <span className="text-terracotta group-open:rotate-180 transition-transform inline-block text-[10px]">▼</span>
                                </summary>
                                <div className="px-3 pb-3 space-y-2">
                                  {(["gemini", "midjourney", "dalle"] as const).map((model) => (
                                    <div key={model} className="bg-ink border border-cream/8 rounded-lg p-3">
                                      <div className="flex items-center justify-between mb-1.5">
                                        <span className="text-[10px] uppercase tracking-[0.15em] text-brass font-medium">For {model}</span>
                                        <button
                                          onClick={() => copyToClipboard(r.campaign!.image_prompts[model], `${r.cluster.id}-${model}`)}
                                          className="text-[10px] flex items-center gap-1 text-cream/50 hover:text-terracotta transition-colors"
                                        >
                                          {copiedField === `${r.cluster.id}-${model}` ? (
                                            <><Check className="w-3 h-3" /> Copied</>
                                          ) : (
                                            <><Copy className="w-3 h-3" /> Copy</>
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

                              <details className="bg-ink-deep border border-cream/8 rounded-xl group">
                                <summary className="p-3 cursor-pointer text-xs font-medium flex items-center justify-between list-none hover:bg-cream/[0.02] rounded-xl transition-colors">
                                  <span className="flex items-center gap-2">
                                    <Send className="w-3 h-3 text-brass" />
                                    <span className="uppercase tracking-[0.15em] text-brass">WhatsApp Message</span>
                                    <span className="text-[10px] text-cream/40 font-mono">[1]</span>
                                  </span>
                                  <span className="text-terracotta group-open:rotate-180 transition-transform inline-block text-[10px]">▼</span>
                                </summary>
                                <div className="px-3 pb-3">
                                  <div className="bg-ink border border-cream/8 rounded-lg p-3">
                                    <div className="flex items-center justify-end mb-1.5">
                                      <button
                                        onClick={() => copyToClipboard(r.campaign!.whatsapp_message, `${r.cluster.id}-whatsapp`)}
                                        className="text-[10px] flex items-center gap-1 text-cream/50 hover:text-terracotta transition-colors"
                                      >
                                        {copiedField === `${r.cluster.id}-whatsapp` ? (
                                          <><Check className="w-3 h-3" /> Copied</>
                                        ) : (
                                          <><Copy className="w-3 h-3" /> Copy</>
                                        )}
                                      </button>
                                    </div>
                                    <div className="text-xs leading-relaxed text-cream/80 whitespace-pre-wrap">
                                      {r.campaign.whatsapp_message}
                                    </div>
                                  </div>
                                </div>
                              </details>

                              <details className="bg-ink-deep border border-cream/8 rounded-xl group">
                                <summary className="p-3 cursor-pointer text-xs font-medium flex items-center justify-between list-none hover:bg-cream/[0.02] rounded-xl transition-colors">
                                  <span className="flex items-center gap-2">
                                    <span className="text-brass">#</span>
                                    <span className="uppercase tracking-[0.15em] text-brass">Hashtags</span>
                                    <span className="text-[10px] text-cream/40 font-mono">[{r.campaign.hashtags.length}]</span>
                                  </span>
                                  <span className="text-terracotta group-open:rotate-180 transition-transform inline-block text-[10px]">▼</span>
                                </summary>
                                <div className="px-3 pb-3">
                                  <div className="bg-ink border border-cream/8 rounded-lg p-3">
                                    <div className="flex items-center justify-end mb-2">
                                      <button
                                        onClick={() => copyToClipboard(r.campaign!.hashtags.join(" "), `${r.cluster.id}-hashtags`)}
                                        className="text-[10px] flex items-center gap-1 text-cream/50 hover:text-terracotta transition-colors"
                                      >
                                        {copiedField === `${r.cluster.id}-hashtags` ? (
                                          <><Check className="w-3 h-3" /> Copied</>
                                        ) : (
                                          <><Copy className="w-3 h-3" /> Copy all</>
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
                    </div>
                  </motion.div>
                </>
              );
            })()}
          </AnimatePresence>

    </ProductShell>
  );
}

// ============================================================================
// HELPERS
// ============================================================================

// Build a human-readable segment name + subtitle from a cluster.
// Title is 2–3 words max; locations/age go in subtitle. Handles slash-grouped
// regional clusters ("Sylhet/Khulna/..." → "Regional Youth Buyers").
function segmentName(cluster: {
  city?: string;
  age_band?: string;
  segment_type?: string;
}): { title: string; subtitle: string } {
  const city = (cluster.city || "").trim();
  const age = (cluster.age_band || "").trim();
  const seg = (cluster.segment_type || "").toLowerCase();

  // Age → a short buyer word
  function buyerWord(a: string): string {
    const lo = a.split(/[–\-]/)[0].replace(/\D/g, "");
    const n = parseInt(lo, 10);
    if (!isNaN(n)) {
      if (n <= 24) return "Students";
      if (n <= 40) return "Professionals";
      return "Buyers";
    }
    return "Buyers";
  }

  // Multi-city regional clusters: "Sylhet/Khulna/Rajshahi/Barisal" or comma-list
  const cities = city.split(/[\/,·|]/).map((c) => c.trim()).filter(Boolean);
  if (cities.length > 1) {
    const word = buyerWord(age);
    const title = word === "Students" ? "Regional Youth Buyers" : "Regional Urban Buyers";
    return { title, subtitle: cities.join(" · ") };
  }

  // Mid-tier / generic labels
  if (/mid-?tier|urban/i.test(city)) {
    return { title: "Regional Urban Buyers", subtitle: age ? `${city} · ${age}` : city };
  }

  // Single city → "Dhaka Students"
  if (city) {
    const word = buyerWord(age);
    const subParts: string[] = [];
    if (seg) subParts.push(seg === "diaspora" ? "Diaspora" : "Local");
    if (age) subParts.push(age);
    return { title: `${city} ${word}`, subtitle: subParts.join(" · ") };
  }

  return { title: "Audience Segment", subtitle: age };
}

function ProductPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="inline-flex items-center gap-1.5 bg-ink-deep border border-cream/10 rounded-full px-3 py-1.5">
      <span className="text-[9px] uppercase tracking-[0.12em] text-cream/40 font-medium">{label}</span>
      <span className="text-[12px] text-cream/90 font-medium">{value}</span>
    </div>
  );
}

function ScoreChip({ label, value }: { label: string; value?: number }) {
  if (typeof value !== "number") return null;
  const color =
    value >= 8 ? "text-terracotta" :
    value >= 6 ? "text-brass" :
    "text-cream/55";
  return (
    <div className="bg-ink-deep border border-cream/8 rounded-lg px-3 py-2">
      <div className="text-[8.5px] uppercase tracking-[0.1em] text-cream/45 mb-0.5 font-medium leading-tight">
        {label}
      </div>
      <div className={`text-sm font-semibold ${color}`}>
        {value}<span className="text-[10px] text-cream/35">/10</span>
      </div>
    </div>
  );
}

function ReasonBlock({ label, text }: { label: string; text?: string }) {
  if (!text) return null;
  return (
    <div>
      <div className="text-[8px] uppercase tracking-[0.16em] text-terracotta mb-1 font-medium">
        {label}
      </div>
      <div className="text-[12px] text-cream/75 leading-snug">{text}</div>
    </div>
  );
}

function fitTierToColor(tier: string): string {
  const t = tier.toLowerCase();
  if (t.includes("strong")) return "bg-terracotta/15 text-terracotta border-terracotta/30";
  if (t.includes("moderate")) return "bg-brass/15 text-brass border-brass/30";
  if (t.includes("exploratory")) return "bg-cream/8 text-cream/70 border-cream/15";
  return "bg-cream/8 text-cream/70 border-cream/15";
}

function formatReach(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return n.toString();
}

function potentialLevel(
  midEngagement: number,
  baseline: number
): { label: string; color: string } {
  const ratio = midEngagement / (baseline || 0.03);
  if (ratio >= 1.1) {
    return {
      label: "High",
      color: "bg-terracotta/15 text-terracotta border-terracotta/30",
    };
  }
  if (ratio >= 0.85) {
    return {
      label: "Medium",
      color: "bg-brass/15 text-brass border-brass/30",
    };
  }
  return {
    label: "Lower",
    color: "bg-cream/8 text-cream/60 border-cream/15",
  };
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
  const storyboard = (c.reels_storyboard || [])
    .map(
      (f: any) =>
        `Frame ${f.frame} (${f.duration_seconds}s): ${f.visual}${
          f.caption_overlay ? `\n  Overlay: "${f.caption_overlay}"` : ""
        }`
    )
    .join("\n\n");

  return `═══ CAMPAIGN PACKAGE — ${r.cluster.city.toUpperCase()} ═══

📍 AUDIENCE
${r.cluster.city} · ${r.cluster.age_band} · ${r.cluster.segment_type}

📝 CAPTION
${c.caption}

⏰ BEST TIME TO POST
${c.posting_time}

🏆 BEST PLATFORM
${platform}

👥 AUDIENCE SIZE
~${r.cluster.estimated_size?.toLocaleString?.() || r.cluster.estimated_size} people in this market
(Test potential is based on audience size, platform fit, and typical engagement assumptions — not a guaranteed result.)

# HASHTAGS
${c.hashtags.join(" ")}

💬 WHATSAPP MESSAGE
${c.whatsapp_message}

🎬 REELS STORYBOARD
${storyboard}

🎨 IMAGE PROMPT
${c.image_prompts.gemini}

═══ END PACKAGE ═══`;
}

function parseChannelRecommendation(channelRec: string): {
  platform: string;
  insight: string;
} {
  const dashSplit = channelRec.split(/[—\-–]/);
  let platform = "Instagram";
  let insight = channelRec.trim();

  if (dashSplit.length >= 2) {
    platform = dashSplit[0].trim();
    insight = dashSplit.slice(1).join(" — ").trim();
  } else {
    const platforms = ["Instagram", "Facebook", "TikTok", "WhatsApp", "Twitter", "YouTube", "LinkedIn"];
    const found = platforms.find((p) => channelRec.toLowerCase().includes(p.toLowerCase()));
    if (found) platform = found;
  }

  insight = insight
    .replace(/\d+%\s*engagement\s*weight\s*(in\s*this\s*cluster)?[,.]?\s*/gi, "")
    .replace(/with\s+a\s+strong\s+focus\s+on/gi, "Great for")
    .replace(/due\s+to\s+high\s+usage\s+of\s+[a-z]+\s+among/gi, "High activity among")
    .replace(/^\s*[,.]?\s*/, "")
    .replace(/\s+/g, " ")
    .trim();

  if (insight.length > 0) {
    insight = insight.charAt(0).toUpperCase() + insight.slice(1);
  }

  if (!insight || insight.length < 5) {
    insight = `Best fit for this audience's daily habits.`;
  }

  return { platform, insight };
}