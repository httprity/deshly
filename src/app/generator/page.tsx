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
  ArrowLeft,
  Clock,
  Send,
  ChevronDown,
  X,
  Pencil,
} from "lucide-react";
import type { Cluster } from "@/lib/types";
import type { ProductIntelligence } from "@/lib/product-intelligence";
import { ProductShell } from "@/components/ProductShell";

// ============================================================================
// CAMPAIGN GENERATOR — prompt-enrichment flow.
//
//   product input → extract product intelligence → confirm/edit chips
//     → audience + campaign generation
//
// Campaigns are never generated from raw text alone. The user gives a few
// high-signal inputs; Deshly extracts the rest; the user confirms; then a
// structured CampaignBrief drives generation. Global by design — no region or
// culture is assumed or defaulted.
// ============================================================================

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
  } | null;
  success: boolean;
  error?: string;
  /** FLAW 3 — set when the brand-compliance validator could not clear the copy. */
  brand_check_flag?: string;
}

interface MatchResult {
  cluster: Cluster;
  display_name?: string;
  fit_tier?: string;
  one_line_reason?: string;
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

// FLAW 7 — recommendation framing, never an analytics label. Index 0 is the
// strongest match; alternatives are described qualitatively, not by score.
const ALT_TIER_LABEL = ["Recommended", "Also worth testing", "Exploratory"];

// "Where can you sell?" — flexible, global options. `value` is what the backend
// fulfillment filter reads (substring match); `label` is what the user sees.
const FULFILLMENT_OPTIONS: { label: string; value: string }[] = [
  { label: "Local only", value: "My city only" },
  { label: "Nationwide", value: "Nationwide" },
  { label: "International shipping", value: "International shipping" },
  { label: "Online / global", value: "Worldwide online" },
  { label: "Specific regions", value: "Specific regions" },
];

const CAMPAIGN_GOALS = [
  "Launch product", "Drive sales", "Build awareness", "Promote offer",
  "Clear inventory", "Test audience", "Grow waitlist", "Seasonal campaign",
];

const PRICE_TIERS = ["budget", "mid", "premium", "luxury", "unknown"] as const;

const DETAIL_CATEGORY_OPTIONS = [
  "Fashion", "Beauty", "Food & Drink", "Home & Living", "Electronics",
  "Wellness", "Services", "Jewelry", "Other",
];

// Optional details, asked as an onboarding-style flow (one question per screen)
// rather than a stack of form fields. Each binds to an existing input state.
type DetailKey = "category" | "materialsSpecs" | "offer" | "avoidAudience" | "creativeStyle" | "customRegion";
const DETAIL_QUESTIONS: { key: DetailKey; title: string; kind: "category" | "text"; placeholder?: string }[] = [
  { key: "category", title: "What category best fits this product?", kind: "category" },
  { key: "materialsSpecs", title: "Any materials or specs worth highlighting?", kind: "text", placeholder: "e.g. full-grain leather, 40h battery, organic cotton" },
  { key: "offer", title: "Running any offer or promotion?", kind: "text", placeholder: "e.g. 20% launch discount, free shipping this week" },
  { key: "avoidAudience", title: "Anyone this product is NOT for?", kind: "text", placeholder: "e.g. not for kids, not bargain hunters" },
  { key: "creativeStyle", title: "Any creative style you prefer?", kind: "text", placeholder: "e.g. minimal and editorial, warm and playful" },
  { key: "customRegion", title: "Any specific cities, countries, or regions?", kind: "text", placeholder: "Add cities, countries, or regions" },
];

type Phase = "input" | "confirm" | "results";

export default function GeneratorPage() {
  const [brandVoiceId, setBrandVoiceId] = useState<string | null>(null);
  const [brandName, setBrandName] = useState<string>("");
  const [brandHandle, setBrandHandle] = useState<string>("");
  const [handleInput, setHandleInput] = useState("");
  const [resolvingHandle, setResolvingHandle] = useState(false);

  const [personalize, setPersonalize] = useState(true);

  // High-signal inputs
  const [productDescription, setProductDescription] = useState("");
  const [price, setPrice] = useState("");
  const [fulfillment, setFulfillment] = useState("");
  const [customRegion, setCustomRegion] = useState("");
  const [campaignGoal, setCampaignGoal] = useState("");

  // Optional details — asked as a short guided flow, one question at a time
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailStep, setDetailStep] = useState(1);
  const [category, setCategory] = useState("");
  const [materialsSpecs, setMaterialsSpecs] = useState("");
  const [offer, setOffer] = useState("");
  const [avoidAudience, setAvoidAudience] = useState("");
  const [creativeStyle, setCreativeStyle] = useState("");

  // Flow
  const [phase, setPhase] = useState<Phase>("input");
  const [pi, setPi] = useState<ProductIntelligence | null>(null);
  // FLAW 5 — the raw pre-edit extraction, preserved for logging. The user edits
  // `pi`; `extractedPi` is never mutated and is sent to the backend untouched.
  const [extractedPi, setExtractedPi] = useState<ProductIntelligence | null>(null);
  const [userEdited, setUserEdited] = useState(false);
  // FLAW 4 — show low-confidence ("Check this") hints only when a follow-up was
  // actually triggered for this extraction (answered or skipped).
  const [confHints, setConfHints] = useState(false);
  const [followUp, setFollowUp] = useState<{ signal: string; question: string } | null>(null);
  const [followUpAnswer, setFollowUpAnswer] = useState("");

  const [extracting, setExtracting] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [matches, setMatches] = useState<MatchResult[]>([]);
  const [audiencePreviewed, setAudiencePreviewed] = useState(false);
  // FLAW 7 — single-audience model: one recommendation generates at a time.
  const [selectedClusterId, setSelectedClusterId] = useState<string | null>(null);
  const [showOthers, setShowOthers] = useState(false);
  const [results, setResults] = useState<CampaignResult[]>([]);

  // Output modal
  const [campaignModalOpen, setCampaignModalOpen] = useState(false);
  const [activeCampaignId, setActiveCampaignId] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

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

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setCampaignModalOpen(false);
    }
    if (campaignModalOpen) {
      document.addEventListener("keydown", onKey);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [campaignModalOpen]);

  function copyToClipboard(text: string, field: string) {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 1800);
  }

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
    } catch (e) {
      setError(e instanceof Error ? e.message : "Handle not found");
    } finally {
      setResolvingHandle(false);
    }
  }

  // Human-readable market list (label + custom regions) for extraction context.
  function marketList(): string[] {
    const out: string[] = [];
    const f = FULFILLMENT_OPTIONS.find((o) => o.value === fulfillment);
    if (f) out.push(f.label);
    customRegion
      .split(/[,\n]/)
      .map((s) => s.trim())
      .filter(Boolean)
      .forEach((r) => out.push(r));
    return out;
  }

  function avoidList(): string[] {
    return avoidAudience.trim() ? [avoidAudience.trim()] : [];
  }

  // STEP 1 → 2: extract product intelligence, then move to confirmation.
  async function handleExtract() {
    if (!brandVoiceId) {
      setError("Build your Brand DNA first.");
      return;
    }
    if (productDescription.trim().length < 20) {
      setError("Tell Deshly a little more about the product (at least 20 characters).");
      return;
    }
    setExtracting(true);
    setError(null);
    setResults([]);
    setMatches([]);
    setAudiencePreviewed(false);
    try {
      const res = await fetch("/api/extract-product", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productDescription,
          price: price.trim() || undefined,
          marketAvailability: marketList(),
          campaignGoal: campaignGoal.trim() || undefined,
          productCategory: category || undefined,
          materialsOrSpecs: materialsSpecs.trim() || undefined,
          offer: offer.trim() || undefined,
          avoidAudience: avoidAudience.trim() || undefined,
          creativeStyle: creativeStyle.trim() || undefined,
          brandVoiceId,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not read the product");
      const extracted = data.productIntelligence as ProductIntelligence;
      setPi(extracted);
      // FLAW 5 — snapshot the raw extraction (deep copy) and reset edit state.
      setExtractedPi(JSON.parse(JSON.stringify(extracted)) as ProductIntelligence);
      setUserEdited(false);
      // FLAW 4 — only surface "Check this" hints when a follow-up was triggered.
      setConfHints(Boolean(data.followUp));
      setFollowUp(data.followUp || null);
      setFollowUpAnswer("");
      setShowOthers(false);
      setSelectedClusterId(null);
      setPhase("confirm");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not read the product");
    } finally {
      setExtracting(false);
    }
  }

  // Which confidence key a follow-up signal maps to (goal has none).
  const CONF_KEY: Record<string, keyof NonNullable<ProductIntelligence["confidence"]>> = {
    differentiator: "differentiator",
    audience: "audienceContext",
    market: "market",
    price: "priceTier",
  };

  // Apply the single follow-up answer to the right attribute. Answering a
  // follow-up confirms that signal, so its confidence is raised (no "Check
  // this" hint). Fields the user already confirmed are never reset.
  function applyFollowUp() {
    const answer = followUpAnswer.trim();
    if (!answer || !followUp || !pi) {
      skipFollowUp();
      return;
    }
    const next: ProductIntelligence = { ...pi };
    switch (followUp.signal) {
      case "differentiator":
        next.differentiators = [...(next.differentiators || []), answer];
        break;
      case "audience":
        next.likelyAudienceContexts = [...(next.likelyAudienceContexts || []), answer];
        break;
      case "market":
        next.targetMarketAvailability = [...(next.targetMarketAvailability || []), answer];
        setCustomRegion((r) => (r ? `${r}, ${answer}` : answer));
        break;
      case "price":
        next.price = answer;
        setPrice(answer);
        break;
      case "goal":
        next.campaignGoal = answer;
        setCampaignGoal(answer);
        break;
    }
    const key = CONF_KEY[followUp.signal];
    if (key) next.confidence = { ...(next.confidence || {}), [key]: 0.9 };
    setPi(next);
    setUserEdited(true);
    setFollowUp(null);
    setFollowUpAnswer("");
  }

  // FLAW 4 — skip path. Keep the best-guess/null value, drop the field's
  // confidence below threshold so the confirmation card flags it with the
  // amber "Check this — we weren't sure" hint. Never blocks generation.
  function skipFollowUp() {
    if (followUp && pi) {
      const key = CONF_KEY[followUp.signal];
      if (key) {
        setPi({ ...pi, confidence: { ...(pi.confidence || {}), [key]: 0.3 } });
      }
    }
    setFollowUp(null);
    setFollowUpAnswer("");
  }

  // Build the audience-match request from confirmed intelligence.
  function matchBody() {
    const noteBits = [
      customRegion.trim() && `Can sell in: ${customRegion.trim()}.`,
      pi?.likelyAudienceContexts?.length && `Buyer contexts: ${pi.likelyAudienceContexts.join(", ")}.`,
      pi?.likelyUseCases?.length && `Use cases: ${pi.likelyUseCases.join(", ")}.`,
      avoidAudience.trim() && `Avoid: ${avoidAudience.trim()}.`,
    ].filter(Boolean);
    return {
      productDescription,
      brandVoiceId,
      price: pi?.price || price.trim() || undefined,
      category: pi?.productCategory || category || undefined,
      fulfillment: fulfillment || undefined,
      notes: noteBits.join(" ") || undefined,
      // FLAW 2 — cultural relevance feeds matching as a retrieval signal.
      culturalRelevance: pi?.culturalRelevance || undefined,
      personalize,
      brandHandle: brandHandle || undefined,
      // Still fetch the top 3 so we can offer alternatives, but only ONE is
      // generated at a time (FLAW 7 — single-audience recommendation model).
      topN: 3,
    };
  }

  async function runMatch(): Promise<MatchResult[]> {
    const res = await fetch("/api/match-clusters", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(matchBody()),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Could not find an audience");
    return (data.matches || []) as MatchResult[];
  }

  // Quiet secondary — recommend the audience without generating.
  async function handlePreviewAudience() {
    setPreviewing(true);
    setError(null);
    try {
      const m = await runMatch();
      setMatches(m);
      setAudiencePreviewed(true);
      if (m.length === 0) setError("No matching audience found yet. Try adding a little more detail.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not find an audience");
    } finally {
      setPreviewing(false);
    }
  }

  // PRIMARY — recommend the single best audience, then generate ONE campaign
  // for it (FLAW 7). `targetClusterId` lets "Generate for this audience instead"
  // regenerate for an alternative without changing the mental model.
  async function handleGenerate(targetClusterId?: string) {
    setGenerating(true);
    setError(null);
    try {
      let m = matches;
      if (m.length === 0) {
        m = await runMatch();
        setMatches(m);
      }
      if (m.length === 0) {
        setError("No matching audience found yet. Try adding a little more detail.");
        return;
      }
      // Default to the strongest match; the backend already returns them ranked.
      const chosenId = targetClusterId || selectedClusterId || m[0].cluster.id;
      setSelectedClusterId(chosenId);
      // Phase 1 — forward the chosen audience's full match reasoning so the
      // generated campaign is written FOR that specific audience (different
      // audience → different campaign). Shape mirrors the match-clusters row.
      const chosenMatch = m.find((x) => x.cluster.id === chosenId);
      const audienceReasoning = chosenMatch
        ? {
            cluster_id: chosenMatch.cluster.id,
            display_name: chosenMatch.display_name,
            fit_tier: chosenMatch.fit_tier,
            one_line_reason: chosenMatch.one_line_reason,
            reasoning: chosenMatch.reasoning,
          }
        : undefined;
      const res = await fetch("/api/generate-campaign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brandVoiceId,
          productDescription,
          clusterIds: [chosenId], // one audience at a time
          campaignGoal: (pi?.campaignGoal || campaignGoal).trim() || undefined,
          personalize,
          brandHandle: brandHandle || undefined,
          productCategory: pi?.productCategory || category || undefined,
          productIntelligence: pi || undefined,
          // FLAW 5 — send the raw extraction + edit flag for logging/audit.
          extractedIntelligence: extractedPi || undefined,
          userEdited,
          brandName: brandName || undefined,
          avoid: avoidList(),
          audienceReasoning,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Generation failed");
      setResults(data.campaigns || []);
      setShowOthers(false);
      setPhase("results");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Generation failed");
    } finally {
      setGenerating(false);
    }
  }

  function startOver() {
    setPhase("input");
    setPi(null);
    setExtractedPi(null);
    setUserEdited(false);
    setConfHints(false);
    setFollowUp(null);
    setMatches([]);
    setAudiencePreviewed(false);
    setSelectedClusterId(null);
    setShowOthers(false);
    setResults([]);
    setError(null);
  }

  // Which confidence key a confirmation-card field maps to (for clearing the
  // "Check this" amber hint once the user edits that field).
  const FIELD_CONF_KEY: Partial<Record<keyof ProductIntelligence, keyof NonNullable<ProductIntelligence["confidence"]>>> = {
    productCategory: "category",
    priceTier: "priceTier",
    targetMarketAvailability: "market",
    likelyAudienceContexts: "audienceContext",
    differentiators: "differentiator",
  };

  // ---- helpers for editing the ProductIntelligence chips (FLAW 5) ----
  // Edits update local state only — no extraction re-run, no loading state, no
  // reset of other chips. `userEdited` is recorded and sent to the backend.
  function setField<K extends keyof ProductIntelligence>(key: K, val: ProductIntelligence[K]) {
    setUserEdited(true);
    setPi((prev) => {
      if (!prev) return prev;
      const next = { ...prev, [key]: val };
      const ck = FIELD_CONF_KEY[key];
      if (ck) next.confidence = { ...(prev.confidence || {}), [ck]: 0.9 }; // user fixed it → clear hint
      return next;
    });
  }
  function updateArr(key: keyof ProductIntelligence, list: string[]) {
    setField(key, list as ProductIntelligence[typeof key]);
  }

  // FLAW 4 — is this confirmation field low-confidence (and should it show the
  // amber "Check this" hint)? Only when a follow-up was triggered this run.
  function isLow(key: keyof NonNullable<ProductIntelligence["confidence"]>): boolean {
    if (!confHints || !pi?.confidence) return false;
    const v = pi.confidence[key];
    return typeof v === "number" && v < 0.5;
  }

  // ---- optional-details guided flow ----
  const detailBindings: Record<DetailKey, { value: string; set: (v: string) => void }> = {
    category: { value: category, set: setCategory },
    materialsSpecs: { value: materialsSpecs, set: setMaterialsSpecs },
    offer: { value: offer, set: setOffer },
    avoidAudience: { value: avoidAudience, set: setAvoidAudience },
    creativeStyle: { value: creativeStyle, set: setCreativeStyle },
    customRegion: { value: customRegion, set: setCustomRegion },
  };
  const filledDetailCount = (Object.keys(detailBindings) as DetailKey[]).filter((k) => detailBindings[k].value.trim()).length;
  function openDetails() { setDetailOpen(true); setDetailStep(1); }
  function finishDetails() { setDetailOpen(false); setDetailStep(1); }
  function detailBack() { setDetailStep((s) => Math.max(1, s - 1)); }
  function detailNext() {
    if (detailStep >= DETAIL_QUESTIONS.length) finishDetails();
    else setDetailStep((s) => s + 1);
  }

  return (
    <ProductShell
      stepLabel="STEP 02 — CAMPAIGN GENERATOR"
      pageTitle={
        <>
          One product.{" "}
          <span className="italic text-terracotta">The right audience.</span>
        </>
      }
      pageSubtitle={
        brandName ? (
          <>
            Generating for <strong className="text-[#0F0F0F] not-italic">{brandName}</strong>. Give Deshly the key product details — it turns them into audience-ready campaign output.
          </>
        ) : (
          <>Give Deshly the key product details. It turns them into audience-ready campaign output.</>
        )
      }
    >
      {/* ============================ EMPTY STATE ============================ */}
      {!brandVoiceId && (
        <div className="bg-[#FBF9F5] rounded-2xl sm:rounded-3xl p-8 sm:p-12 lg:p-16 text-center border border-[#0F0F0F]/5 relative overflow-hidden">
          <div
            className="absolute inset-0 pointer-events-none"
            style={{ background: "radial-gradient(circle at center, rgba(213, 97, 62, 0.06), transparent 60%)" }}
          />
          <div className="relative">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full border border-terracotta/30 flex items-center justify-center">
              <Sparkles className="w-7 h-7 text-terracotta" strokeWidth={1.5} />
            </div>
            <h2 className="font-display font-semibold text-3xl mb-3">Build Brand DNA for better results</h2>
            <p className="text-[#0F0F0F]/55 mb-8 max-w-md mx-auto leading-relaxed">
              Answer a few quick questions and Deshly builds a reusable brand voice — then every campaign sounds like you.
            </p>
            <Link
              href="/brand-dna"
              className="inline-flex items-center gap-2 bg-gradient-to-r from-terracotta to-terracotta-deep text-[#F6F3EE] rounded-full px-7 py-4 text-sm font-medium hover:shadow-[0_0_40px_rgba(213,97,62,0.35)] transition-all"
            >
              Build Brand DNA <ArrowRight className="w-4 h-4" />
            </Link>
            <div className="mt-8 pt-8 border-t border-[#0F0F0F]/8 max-w-sm mx-auto">
              <div className="text-[11px] uppercase tracking-[0.15em] text-[#0F0F0F]/45 mb-3">
                Returning? Enter your brand handle
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={handleInput}
                  onChange={(e) => setHandleInput(e.target.value)}
                  placeholder="DESHLY-7K3Q"
                  className="flex-1 bg-[#FBF9F5] border border-[#0F0F0F]/10 rounded-xl px-4 py-3 text-sm text-[#0F0F0F] placeholder:text-[#0F0F0F]/25 outline-none focus:border-terracotta/50 transition-all font-mono"
                />
                <button
                  onClick={handleResolveHandle}
                  disabled={resolvingHandle || !handleInput.trim()}
                  className="bg-[#0F0F0F]/[0.06] border border-[#0F0F0F]/15 hover:border-[#6F655A] text-[#0F0F0F] rounded-xl px-5 text-sm font-medium transition-all disabled:opacity-30"
                >
                  {resolvingHandle ? <Loader2 className="w-4 h-4 animate-spin" /> : "Load"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================ INPUT PHASE ============================ */}
      {brandVoiceId && phase === "input" && (
        <div className="bg-[#FBF9F5] rounded-2xl sm:rounded-3xl p-5 sm:p-8 lg:p-10 border border-[#0F0F0F]/5 relative overflow-hidden">
          <div
            className="absolute top-0 left-0 right-0 h-px"
            style={{ background: "linear-gradient(90deg, transparent, rgba(213, 97, 62, 0.4), transparent)" }}
          />
          <div className="relative space-y-5">
            {/* MAIN INPUT — dominant */}
            <label className="block">
              <div className="font-display font-semibold tracking-[-0.02em] text-2xl sm:text-3xl text-[#0F0F0F] leading-snug mb-3">
                What are you marketing today?
              </div>
              <textarea
                value={productDescription}
                onChange={(e) => {
                  setProductDescription(e.target.value);
                  e.target.style.height = "auto";
                  e.target.style.height = `${Math.min(e.target.scrollHeight, 260)}px`;
                }}
                rows={3}
                placeholder="Example: A premium everyday sneaker for city walks, priced at $89, available across the US."
                className="w-full bg-[#FBF9F5]/60 border border-[#0F0F0F]/8 rounded-2xl px-5 py-4 text-[17px] sm:text-[18px] text-[#0F0F0F] placeholder:text-[#0F0F0F]/25 outline-none focus:border-terracotta/40 focus:bg-[#EDE8DE]/40 transition-all resize-none overflow-hidden leading-relaxed"
              />
              <div className="flex items-center justify-between mt-2 gap-3">
                <div className="text-[10px] text-[#0F0F0F]/40 leading-snug">
                  Mention what it is, who it&apos;s for, price, where it sells, and what makes it different.
                </div>
                <div className="text-[10px] text-[#0F0F0F]/35 font-mono flex-shrink-0">{productDescription.length}</div>
              </div>
            </label>

            {/* Use Brand DNA toggle + handle */}
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <button
                onClick={() => setPersonalize((v) => !v)}
                className="inline-flex items-center gap-2 text-[12px] text-[#0F0F0F]/55 hover:text-[#0F0F0F]/85 transition-colors"
              >
                <span className={`w-8 h-4 rounded-full transition-colors relative ${personalize ? "bg-terracotta/60" : "bg-[#0F0F0F]/15"}`}>
                  <span className={`absolute top-0.5 w-3 h-3 rounded-full bg-[#0F0F0F] transition-all ${personalize ? "left-4" : "left-0.5"}`} />
                </span>
                Use Brand DNA
              </button>
              {brandHandle && (
                <div className="inline-flex items-center gap-2 text-[11px] text-[#0F0F0F]/55 bg-[#EDE8DE] border border-[#0F0F0F]/8 rounded-full px-3 py-1.5">
                  <span className="text-[#0F0F0F]/35 uppercase tracking-[0.12em] text-[9px]">Brand</span>
                  <span className="font-mono text-[#0F0F0F]/85">{brandHandle}</span>
                </div>
              )}
            </div>

            {/* Light high-signal row: price, market, goal */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="block">
                <div className="font-display font-semibold tracking-[-0.02em] text-lg sm:text-xl text-[#0F0F0F] leading-snug mb-2.5">Price, if relevant</div>
                <input
                  type="text"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="$49, £80, €120, or leave blank"
                  className="w-full bg-[#FBF9F5] border border-[#0F0F0F]/10 rounded-xl px-4 py-3 text-sm text-[#0F0F0F] placeholder:text-[#0F0F0F]/25 outline-none focus:border-terracotta/50 focus:bg-[#EDE8DE] transition-all"
                />
              </label>
              <div className="block">
                <div className="font-display font-semibold tracking-[-0.02em] text-lg sm:text-xl text-[#0F0F0F] leading-snug mb-2.5">Where can you sell?</div>
                <div className="flex flex-wrap gap-1.5">
                  {FULFILLMENT_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setFulfillment(fulfillment === opt.value ? "" : opt.value)}
                      className={`text-[12px] px-2.5 py-1.5 rounded-full border transition-all ${
                        fulfillment === opt.value
                          ? "border-terracotta bg-terracotta/10 text-[#0F0F0F]"
                          : "border-[#0F0F0F]/12 text-[#0F0F0F]/60 hover:border-[#0F0F0F]/30"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <div className="font-display font-semibold tracking-[-0.02em] text-lg sm:text-xl text-[#0F0F0F] leading-snug mb-2.5">Campaign goal</div>
              <div className="flex flex-wrap gap-1.5">
                {CAMPAIGN_GOALS.map((g) => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => setCampaignGoal(campaignGoal === g ? "" : g)}
                    className={`text-[12px] px-3 py-1.5 rounded-full border transition-all ${
                      campaignGoal === g
                        ? "border-terracotta bg-terracotta/10 text-[#0F0F0F]"
                        : "border-[#0F0F0F]/12 text-[#0F0F0F]/60 hover:border-[#0F0F0F]/30"
                    }`}
                  >
                    {g}
                  </button>
                ))}
              </div>
            </div>

            {/* Optional details — asked as a short guided flow, one at a time */}
            <div>
              {!detailOpen ? (
                <div className="flex items-center gap-3 flex-wrap">
                  <button
                    type="button"
                    onClick={openDetails}
                    className="flex items-center gap-1.5 text-[11px] text-[#0F0F0F]/55 hover:text-terracotta transition-colors"
                  >
                    <ChevronDown className="w-3.5 h-3.5 -rotate-90" />
                    {filledDetailCount > 0 ? "Edit details for sharper output" : "Add details for sharper output (optional)"}
                  </button>
                  {filledDetailCount > 0 && (
                    <span className="text-[11px] text-[#0F0F0F]/40">{filledDetailCount} added</span>
                  )}
                </div>
              ) : (
                <AnimatePresence mode="wait">
                  <motion.div
                    key={detailStep}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.22 }}
                    className="rounded-2xl border border-[#0F0F0F]/10 bg-[#F6F3EE] p-5 sm:p-6"
                  >
                    {(() => {
                      const q = DETAIL_QUESTIONS[detailStep - 1];
                      const bind = detailBindings[q.key];
                      return (
                        <div className="space-y-5">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] uppercase tracking-[0.18em] text-[#6F655A]">
                              Detail {detailStep} of {DETAIL_QUESTIONS.length}
                              <span className="text-[#0F0F0F]/30 normal-case tracking-normal"> · optional</span>
                            </span>
                            <button onClick={finishDetails} className="text-[11px] text-[#0F0F0F]/45 hover:text-[#0F0F0F] transition-colors">
                              Done
                            </button>
                          </div>
                          <div className="h-[2px] bg-[#EDE8DE] rounded-full overflow-hidden">
                            <div
                              className="h-full bg-terracotta rounded-full transition-all duration-500"
                              style={{ width: `${(detailStep / DETAIL_QUESTIONS.length) * 100}%` }}
                            />
                          </div>

                          <div className="font-display font-semibold text-lg sm:text-xl text-[#0F0F0F] leading-snug">
                            {q.title}
                          </div>

                          {q.kind === "category" ? (
                            <div className="flex flex-wrap gap-2">
                              <button
                                type="button"
                                onClick={() => setCategory("")}
                                className={`text-[13px] px-3.5 py-2 rounded-full border transition-all ${
                                  !category
                                    ? "border-terracotta bg-terracotta/10 text-[#0F0F0F]"
                                    : "border-[#0F0F0F]/12 text-[#0F0F0F]/60 hover:border-[#0F0F0F]/30"
                                }`}
                              >
                                Let Deshly infer it
                              </button>
                              {DETAIL_CATEGORY_OPTIONS.map((c) => (
                                <button
                                  key={c}
                                  type="button"
                                  onClick={() => setCategory(c)}
                                  className={`text-[13px] px-3.5 py-2 rounded-full border transition-all ${
                                    category === c
                                      ? "border-terracotta bg-terracotta/10 text-[#0F0F0F]"
                                      : "border-[#0F0F0F]/12 text-[#0F0F0F]/60 hover:border-[#0F0F0F]/30"
                                  }`}
                                >
                                  {c}
                                </button>
                              ))}
                            </div>
                          ) : (
                            <input
                              type="text"
                              autoFocus
                              value={bind.value}
                              onChange={(e) => bind.set(e.target.value)}
                              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); detailNext(); } }}
                              placeholder={q.placeholder}
                              className="w-full bg-[#FBF9F5] border border-[#0F0F0F]/12 rounded-xl px-4 py-3.5 text-[15px] text-[#0F0F0F] placeholder:text-[#0F0F0F]/30 outline-none focus:border-terracotta/50 transition-all"
                            />
                          )}

                          <div className="flex items-center justify-between gap-3 pt-1">
                            <button
                              onClick={detailBack}
                              disabled={detailStep === 1}
                              className="inline-flex items-center gap-1.5 text-[13px] text-[#0F0F0F]/55 hover:text-[#0F0F0F] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                            >
                              <ArrowLeft className="w-3.5 h-3.5" /> Back
                            </button>
                            <div className="flex items-center gap-3">
                              <button onClick={detailNext} className="text-[13px] text-[#0F0F0F]/45 hover:text-[#0F0F0F] transition-colors">
                                Skip
                              </button>
                              <button
                                onClick={detailNext}
                                className="inline-flex items-center gap-1.5 bg-[#0F0F0F] text-[#F6F3EE] hover:bg-terracotta rounded-full px-5 py-2.5 text-sm font-medium transition-colors"
                              >
                                {detailStep === DETAIL_QUESTIONS.length ? "Done" : "Continue"}
                                <ArrowRight className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                  </motion.div>
                </AnimatePresence>
              )}
            </div>

            {error && <ErrorBanner message={error} />}

            {/* One primary CTA */}
            <div className="pt-1">
              <button
                onClick={handleExtract}
                disabled={extracting || productDescription.trim().length < 20}
                className="w-full bg-gradient-to-r from-terracotta to-terracotta-deep text-[#F6F3EE] rounded-full py-4 px-6 font-medium text-sm flex items-center justify-center gap-2 transition-all hover:shadow-[0_0_40px_rgba(213,97,62,0.35)] disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:shadow-none"
              >
                {extracting ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Reading your product…</>
                ) : (
                  <><Wand2 className="w-4 h-4" /> Generate campaign</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================== CONFIRM PHASE ========================== */}
      {brandVoiceId && phase === "confirm" && pi && (
        <div className="space-y-5">
          {/* Follow-up — one targeted question at a time */}
          {followUp && (
            <div className="bg-[#FBF9F5] border border-terracotta/25 rounded-2xl p-5 sm:p-6">
              <div className="text-[10px] uppercase tracking-[0.18em] text-terracotta mb-2">One quick thing</div>
              <div className="font-display font-semibold text-lg text-[#0F0F0F] mb-3">{followUp.question}</div>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  value={followUpAnswer}
                  onChange={(e) => setFollowUpAnswer(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") applyFollowUp(); }}
                  placeholder="Type your answer…"
                  className="flex-1 bg-[#FBF9F5] border border-[#0F0F0F]/12 rounded-xl px-4 py-3 text-sm text-[#0F0F0F] placeholder:text-[#0F0F0F]/25 outline-none focus:border-terracotta/50 transition-all"
                />
                <button onClick={applyFollowUp} className="bg-[#0F0F0F] text-[#F6F3EE] hover:bg-terracotta rounded-xl px-5 py-3 text-sm font-medium transition-colors">
                  Add
                </button>
                <button onClick={skipFollowUp} className="text-[13px] text-[#0F0F0F]/45 hover:text-[#0F0F0F] px-3 transition-colors">
                  Skip
                </button>
              </div>
            </div>
          )}

          {/* Confirmation card — editable chips */}
          <div className="bg-[#FBF9F5] rounded-2xl sm:rounded-3xl p-5 sm:p-8 border border-[#0F0F0F]/8">
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="w-4 h-4 text-terracotta" strokeWidth={1.75} />
              <div className="font-display font-semibold text-xl text-[#0F0F0F]">Deshly understood</div>
            </div>
            <p className="text-[13px] text-[#0F0F0F]/50 mb-6 leading-relaxed">
              Quick check — edit anything that&apos;s off, then generate.
            </p>

            <div className="space-y-5">
              <SingleEdit label="Product" value={pi.productName || ""} onChange={(v) => setField("productName", v)} placeholder="Product name" />
              <SingleEdit label="Category" value={pi.productCategory || ""} onChange={(v) => setField("productCategory", v)} placeholder="Category" lowConfidence={isLow("category")} />
              <div>
                <ChipLabel lowConfidence={isLow("priceTier")}>Price tier</ChipLabel>
                <div className="flex flex-wrap gap-1.5">
                  {PRICE_TIERS.map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setField("priceTier", t)}
                      className={`text-[12px] px-3 py-1.5 rounded-full border capitalize transition-all ${
                        pi.priceTier === t
                          ? "border-terracotta bg-terracotta/10 text-[#0F0F0F]"
                          : "border-[#0F0F0F]/12 text-[#0F0F0F]/60 hover:border-[#0F0F0F]/30"
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
              <EditableChips label="Market" values={pi.targetMarketAvailability || []} onChange={(v) => updateArr("targetMarketAvailability", v)} placeholder="Add a market" lowConfidence={isLow("market")} />
              <EditableChips label="Use case" values={pi.likelyUseCases || []} onChange={(v) => updateArr("likelyUseCases", v)} placeholder="Add a use case" />
              <EditableChips label="Buyer context" values={pi.likelyAudienceContexts || []} onChange={(v) => updateArr("likelyAudienceContexts", v)} placeholder="Add a buyer context" lowConfidence={isLow("audienceContext")} />
              <EditableChips label="Emotional driver" values={pi.emotionalDrivers || []} onChange={(v) => updateArr("emotionalDrivers", v)} placeholder="Add an emotional driver" />
              <EditableChips label="Occasion" values={pi.occasions || []} onChange={(v) => updateArr("occasions", v)} placeholder="Add an occasion" />
              <EditableChips label="Differentiator" values={pi.differentiators || []} onChange={(v) => updateArr("differentiators", v)} placeholder="What makes it different?" lowConfidence={isLow("differentiator")} />
              <SingleEdit label="Campaign goal" value={pi.campaignGoal || campaignGoal || ""} onChange={(v) => setField("campaignGoal", v)} placeholder="e.g. Drive sales" />
            </div>

            {/* Audience preview — single best match + quiet alternatives (FLAW 7) */}
            {audiencePreviewed && matches.length > 0 && (
              <div className="mt-6 pt-5 border-t border-[#0F0F0F]/8">
                <PrimaryAudience match={matches[0]} />
                <OtherAudiences
                  matches={matches}
                  excludeId={matches[0].cluster.id}
                  open={showOthers}
                  onToggle={() => setShowOthers((s) => !s)}
                  busy={generating || previewing}
                  onChoose={(id) => handleGenerate(id)}
                />
              </div>
            )}

            {error && <div className="mt-5"><ErrorBanner message={error} /></div>}

            {/* CTAs */}
            <div className="mt-7 flex flex-col-reverse sm:flex-row sm:items-center gap-3">
              <button
                onClick={() => { setPhase("input"); setError(null); }}
                className="inline-flex items-center justify-center gap-2 text-[13px] text-[#0F0F0F]/55 hover:text-[#0F0F0F] border border-[#0F0F0F]/12 hover:border-[#0F0F0F]/25 rounded-full py-3 px-5 transition-all"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Edit details
              </button>
              <button
                onClick={handlePreviewAudience}
                disabled={previewing || generating}
                className="inline-flex items-center justify-center gap-2 text-[13px] text-[#0F0F0F]/65 hover:text-[#0F0F0F] border border-[#0F0F0F]/12 hover:border-[#0F0F0F]/25 rounded-full py-3 px-5 transition-all disabled:opacity-40"
              >
                {previewing ? <><Loader2 className="w-4 h-4 animate-spin" /> Finding…</> : <><Globe className="w-4 h-4" /> Preview audience</>}
              </button>
              <button
                onClick={() => handleGenerate()}
                disabled={generating || previewing}
                className="flex-1 bg-gradient-to-r from-terracotta to-terracotta-deep text-[#F6F3EE] rounded-full py-4 px-6 font-medium text-sm flex items-center justify-center gap-2 transition-all hover:shadow-[0_0_40px_rgba(213,97,62,0.35)] disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:shadow-none"
              >
                {generating ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Building your campaign…</>
                ) : (
                  <><Wand2 className="w-4 h-4" /> Generate campaign</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================== RESULTS PHASE ========================== */}
      {brandVoiceId && phase === "results" && (
        <div>
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3 text-[10px] uppercase tracking-[0.2em] text-terracotta">
              <span className="w-8 h-px bg-terracotta" />
              <span>YOUR CAMPAIGN</span>
            </div>
            <button onClick={startOver} className="inline-flex items-center gap-1.5 text-[12px] text-[#0F0F0F]/55 hover:text-terracotta transition-colors">
              <Pencil className="w-3.5 h-3.5" /> New campaign
            </button>
          </div>

          {/* Single best-match campaign (FLAW 7 — one recommendation at a time) */}
          <div className="max-w-2xl mx-auto">
            {results.map((r, i) => {
              const seg = segmentName(r.cluster);
              const match = matches.find((m) => m.cluster.id === r.cluster.id);
              const why = r.campaign?.why_this_campaign || match?.one_line_reason || match?.reasoning?.why_this_fits || "";
              const motivation = match?.reasoning?.buying_motivation || "";
              const channel = r.campaign ? parseChannelRecommendation(r.campaign.channel_recommendation).platform : "";
              const open = () => { setActiveCampaignId(r.cluster.id); setCampaignModalOpen(true); };
              return (
                <motion.div
                  key={r.cluster.id}
                  initial={{ opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1, duration: 0.45 }}
                  className="bg-[#FBF9F5] rounded-2xl p-5 sm:p-7 border border-[#0F0F0F]/8 relative overflow-hidden group hover:border-terracotta/30 transition-all flex flex-col"
                >
                  <div className="text-[9px] uppercase tracking-[0.18em] text-terracotta mb-1 font-medium">Your best match</div>
                  <div className="font-display font-semibold text-xl leading-tight text-[#0F0F0F]">{seg.title}</div>
                  {seg.subtitle && <div className="text-[10px] uppercase tracking-[0.12em] text-[#0F0F0F]/40 mt-0.5">{seg.subtitle}</div>}

                  {/* FLAW 3 — brand-compliance flag (only when validation couldn't clear it) */}
                  {r.brand_check_flag && (
                    <div className="mt-3 flex items-start gap-2 text-[12px] text-[#B45309] bg-[#F5C84B]/10 border border-[#D9A441]/40 rounded-lg px-3 py-2">
                      <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                      <span>{r.brand_check_flag}</span>
                    </div>
                  )}

                  {!r.success && <div className="mt-3 text-xs text-[#D5613E]">Generation failed: {r.error}</div>}

                  {r.success && r.campaign && (
                    <>
                      {why && (
                        <div className="mt-4">
                          <div className="text-[8px] uppercase tracking-[0.18em] text-terracotta mb-1 font-medium">Why this audience is most likely to respond</div>
                          <div className="text-[13px] text-[#0F0F0F]/80 leading-snug">{why}</div>
                        </div>
                      )}
                      {motivation && (
                        <div className="mt-3">
                          <div className="text-[8px] uppercase tracking-[0.18em] text-[#6F655A] mb-1 font-medium">What makes them buy</div>
                          <div className="text-[12.5px] text-[#0F0F0F]/70 leading-snug">{motivation}</div>
                        </div>
                      )}
                      <div className="mt-4">
                        <div className="text-[8px] uppercase tracking-[0.18em] text-[#6F655A] mb-1 font-medium">Caption</div>
                        <div className="text-[12.5px] text-[#0F0F0F]/70 leading-relaxed line-clamp-4">{r.campaign.caption}</div>
                      </div>
                      <div className="flex flex-wrap gap-2 mt-3">
                        {channel && (
                          <span className="inline-flex items-center gap-1.5 text-[10px] text-[#0F0F0F]/60 bg-[#EDE8DE] border border-[#0F0F0F]/8 rounded-full px-2.5 py-1">
                            <Send className="w-3 h-3 text-[#6F655A]" /> Best on {channel}
                          </span>
                        )}
                        <span className="inline-flex items-center gap-1.5 text-[10px] text-[#0F0F0F]/60 bg-[#EDE8DE] border border-[#0F0F0F]/8 rounded-full px-2.5 py-1">
                          <Clock className="w-3 h-3 text-[#6F655A]" /> {r.campaign.posting_time}
                        </span>
                      </div>
                      <div className="flex gap-2 mt-5 pt-4 border-t border-[#0F0F0F]/8">
                        <button
                          onClick={() => copyToClipboard(r.campaign!.caption, `${r.cluster.id}-cap`)}
                          className="flex-1 flex items-center justify-center gap-1.5 text-[11px] text-[#0F0F0F]/70 hover:text-terracotta border border-[#0F0F0F]/12 hover:border-terracotta/40 rounded-lg py-2 transition-all"
                        >
                          {copiedField === `${r.cluster.id}-cap` ? <><Check className="w-3.5 h-3.5" /> Copied</> : <><Copy className="w-3.5 h-3.5" /> Copy caption</>}
                        </button>
                        <button onClick={open} className="flex-1 flex items-center justify-center gap-1.5 text-[11px] text-[#0F0F0F] bg-terracotta/15 hover:bg-terracotta/25 border border-terracotta/30 rounded-lg py-2 transition-all font-medium">
                          Full campaign <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </>
                  )}
                </motion.div>
              );
            })}

            {/* Quiet alternatives — regenerate for another audience (FLAW 7) */}
            <OtherAudiences
              matches={matches}
              excludeId={selectedClusterId || results[0]?.cluster.id}
              open={showOthers}
              onToggle={() => setShowOthers((s) => !s)}
              busy={generating}
              onChoose={(id) => handleGenerate(id)}
            />
            {error && <div className="mt-4"><ErrorBanner message={error} /></div>}
          </div>
        </div>
      )}

      {/* ========================= CAMPAIGN MODAL ========================= */}
      <AnimatePresence>
        {campaignModalOpen && results.length > 0 && (() => {
          const active = results.find((x) => x.cluster.id === activeCampaignId) || results[0];
          const r = active;
          const seg = segmentName(r.cluster);
          return (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setCampaignModalOpen(false)}
                className="fixed inset-0 bg-[#0F0F0F]/40 backdrop-blur-sm z-[60]"
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.97, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.97, y: 20 }}
                transition={{ duration: 0.25 }}
                className="fixed inset-0 z-[61] flex items-stretch sm:items-center justify-center p-0 sm:p-6 pointer-events-none"
              >
                <div className="bg-[#FBF9F5] border border-[#0F0F0F]/10 w-full sm:max-w-2xl sm:rounded-2xl h-full sm:h-auto sm:max-h-[88vh] overflow-y-auto pointer-events-auto relative">
                  <div className="sticky top-0 bg-[#FBF9F5]/95 backdrop-blur-xl border-b border-[#0F0F0F]/8 px-5 py-4 flex items-center justify-between z-10">
                    <div className="min-w-0">
                      <div className="text-[9px] uppercase tracking-[0.18em] text-[#6F655A]">Recommended audience</div>
                      <div className="font-display font-semibold text-lg leading-tight">{seg.title}</div>
                    </div>
                    <button
                      onClick={() => setCampaignModalOpen(false)}
                      aria-label="Close"
                      className="w-9 h-9 rounded-lg border border-[#0F0F0F]/10 flex items-center justify-center text-[#0F0F0F]/60 hover:text-[#0F0F0F] hover:bg-[#0F0F0F]/5 transition-colors flex-shrink-0"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {!r.success && <div className="m-5 text-sm text-[#D5613E]">Generation failed: {r.error}</div>}

                  {r.success && r.campaign && (
                    <div className="p-5 space-y-5">
                      {r.campaign.why_this_campaign && (
                        <div className="bg-terracotta/8 border border-terracotta/20 rounded-lg px-3.5 py-3">
                          <div className="text-[8px] uppercase tracking-[0.18em] text-terracotta mb-1 font-medium">Why this audience</div>
                          <div className="text-[12.5px] text-[#0F0F0F]/90 leading-snug">{r.campaign.why_this_campaign}</div>
                        </div>
                      )}

                      <ModalBlock
                        label="Caption"
                        onCopy={() => copyToClipboard(r.campaign!.caption, `${r.cluster.id}-mcap`)}
                        copied={copiedField === `${r.cluster.id}-mcap`}
                      >
                        <div className="text-[13px] leading-relaxed text-[#0F0F0F]/85 whitespace-pre-wrap">{r.campaign.caption}</div>
                      </ModalBlock>

                      <ModalBlock
                        label="Hashtags"
                        onCopy={() => copyToClipboard(r.campaign!.hashtags.join(" "), `${r.cluster.id}-tags`)}
                        copied={copiedField === `${r.cluster.id}-tags`}
                      >
                        <div className="text-[12px] leading-relaxed text-[#0F0F0F]/70 font-mono break-words">{r.campaign.hashtags.join(" ")}</div>
                      </ModalBlock>

                      <ModalBlock
                        label="WhatsApp copy"
                        onCopy={() => copyToClipboard(r.campaign!.whatsapp_message, `${r.cluster.id}-wa`)}
                        copied={copiedField === `${r.cluster.id}-wa`}
                      >
                        <div className="text-[12px] leading-relaxed text-[#0F0F0F]/80 whitespace-pre-wrap">{r.campaign.whatsapp_message}</div>
                      </ModalBlock>

                      <ModalBlock
                        label="Image prompt"
                        onCopy={() => copyToClipboard(r.campaign!.image_prompts.gemini, `${r.cluster.id}-img`)}
                        copied={copiedField === `${r.cluster.id}-img`}
                      >
                        <div className="text-[12px] leading-relaxed text-[#0F0F0F]/70 font-mono">{r.campaign.image_prompts.gemini}</div>
                      </ModalBlock>

                      {r.campaign.reels_storyboard?.length > 0 && (
                        <div>
                          <div className="text-[10px] uppercase tracking-[0.15em] text-[#6F655A] mb-2 font-medium">Reel concept</div>
                          <div className="space-y-2">
                            {r.campaign.reels_storyboard.map((f) => (
                              <div key={f.frame} className="bg-[#F6F3EE] border border-[#0F0F0F]/8 rounded-lg p-3">
                                <div className="text-[10px] text-[#6F655A] font-mono mb-1">Frame {f.frame} · {f.duration_seconds}s</div>
                                <div className="text-[12px] text-[#0F0F0F]/80 leading-snug">{f.visual}</div>
                                {f.caption_overlay && <div className="text-[11px] text-[#0F0F0F]/55 italic mt-1">“{f.caption_overlay}”</div>}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <button
                        onClick={() => copyToClipboard(buildCampaignPackage(r), `${r.cluster.id}-pkg`)}
                        className="w-full bg-gradient-to-r from-terracotta to-terracotta-deep text-[#F6F3EE] rounded-xl py-3.5 px-4 font-medium text-sm flex items-center justify-center gap-2 transition-all hover:shadow-[0_0_30px_rgba(213,97,62,0.3)]"
                      >
                        {copiedField === `${r.cluster.id}-pkg` ? <><Check className="w-4 h-4" /> Copied package</> : <><Copy className="w-4 h-4" /> Copy full campaign</>}
                      </button>
                    </div>
                  )}
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
// SMALL COMPONENTS
// ============================================================================
function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="p-4 bg-[#D5613E]/8 border border-[#D5613E]/30 rounded-xl flex items-start gap-3">
      <AlertCircle className="w-4 h-4 text-[#D5613E] mt-0.5 flex-shrink-0" />
      <div className="text-sm text-[#0F0F0F]/80">{message}</div>
    </div>
  );
}

// FLAW 7 — the single strongest audience, framed as a recommendation (never an
// analytics report). No size, percentages, scores, or demographic tables.
function PrimaryAudience({ match }: { match: MatchResult }) {
  const seg = segmentName(match.cluster);
  const reason = match.one_line_reason || match.reasoning?.why_this_fits || "";
  const motivation = match.reasoning?.buying_motivation || "";
  const channel = match.reasoning?.best_channel || "";
  return (
    <div className="bg-[#F6F3EE] border border-terracotta/25 rounded-xl px-4 py-4">
      <div className="text-[9px] uppercase tracking-[0.18em] text-terracotta mb-1 font-medium">Your best match</div>
      <div className="font-display font-semibold text-base text-[#0F0F0F]">{seg.title}</div>
      {seg.subtitle && <div className="text-[10px] uppercase tracking-[0.12em] text-[#0F0F0F]/40 mt-0.5">{seg.subtitle}</div>}
      {reason && <div className="text-[12.5px] text-[#0F0F0F]/70 leading-snug mt-2">{reason}</div>}
      <div className="flex flex-wrap gap-x-5 gap-y-1 mt-2.5">
        {motivation && (
          <div className="text-[11px] text-[#0F0F0F]/55"><span className="text-[#6F655A]">Buys because:</span> {motivation}</div>
        )}
        {channel && (
          <div className="text-[11px] text-[#0F0F0F]/55"><span className="text-[#6F655A]">Best channel:</span> {channel}</div>
        )}
      </div>
    </div>
  );
}

// FLAW 7 — collapsed-by-default alternatives. Each shows a name, a one-line
// reason, and a "Generate for this audience instead" action. Recommendation
// language only — no scores or rankings surfaced.
function OtherAudiences({
  matches,
  excludeId,
  open,
  onToggle,
  onChoose,
  busy,
}: {
  matches: MatchResult[];
  excludeId?: string | null;
  open: boolean;
  onToggle: () => void;
  onChoose: (id: string) => void;
  busy?: boolean;
}) {
  const others = matches.filter((m) => m.cluster.id !== excludeId);
  if (others.length === 0) return null;
  return (
    <div className="mt-4">
      <button
        onClick={onToggle}
        className="inline-flex items-center gap-1.5 text-[12px] text-[#0F0F0F]/55 hover:text-terracotta transition-colors"
      >
        See other audiences
        <ChevronDown className={`w-3.5 h-3.5 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="mt-3 space-y-2">
          {others.map((m, i) => {
            const seg = segmentName(m.cluster);
            const reason = m.one_line_reason || m.reasoning?.why_this_fits || "";
            return (
              <div key={m.cluster.id} className="bg-[#F6F3EE] border border-[#0F0F0F]/8 rounded-xl px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-[8px] uppercase tracking-[0.16em] text-[#6F655A] mb-0.5">{ALT_TIER_LABEL[i + 1] || "Exploratory"}</div>
                    <div className="font-medium text-sm text-[#0F0F0F] truncate">{seg.title}</div>
                  </div>
                  <button
                    onClick={() => onChoose(m.cluster.id)}
                    disabled={busy}
                    className="flex-shrink-0 inline-flex items-center gap-1.5 text-[11px] text-[#0F0F0F] border border-[#0F0F0F]/15 hover:border-terracotta/50 hover:text-terracotta rounded-full px-3 py-1.5 transition-all disabled:opacity-40"
                  >
                    {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <>Generate for this audience instead</>}
                  </button>
                </div>
                {reason && <div className="text-[12px] text-[#0F0F0F]/55 leading-snug mt-1.5">{reason}</div>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ChipLabel({ children, lowConfidence }: { children: React.ReactNode; lowConfidence?: boolean }) {
  return (
    <div className="flex items-center gap-2 mb-2">
      <span className="text-[10px] uppercase tracking-[0.15em] text-[#0F0F0F]/45">{children}</span>
      {lowConfidence && (
        <span className="inline-flex items-center gap-1 text-[10px] text-[#B45309]">
          <AlertCircle className="w-3 h-3" /> Check this — we weren&apos;t sure
        </span>
      )}
    </div>
  );
}

// Amber ring applied to a field when its extracted confidence is low (FLAW 4).
const LOW_CONF_RING = "border-[#D9A441]/70 bg-[#F5C84B]/8";

function SingleEdit({ label, value, onChange, placeholder, lowConfidence }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; lowConfidence?: boolean }) {
  return (
    <div>
      <ChipLabel lowConfidence={lowConfidence}>{label}</ChipLabel>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`w-full bg-[#F6F3EE] border rounded-xl px-4 py-2.5 text-sm text-[#0F0F0F] placeholder:text-[#0F0F0F]/30 outline-none focus:border-terracotta/50 transition-all ${lowConfidence ? LOW_CONF_RING : "border-[#0F0F0F]/10"}`}
      />
    </div>
  );
}

// Editable list of chips: each value is removable; an input adds new ones.
function EditableChips({ label, values, onChange, placeholder, lowConfidence }: { label: string; values: string[]; onChange: (v: string[]) => void; placeholder?: string; lowConfidence?: boolean }) {
  const [draft, setDraft] = useState("");
  function add() {
    const v = draft.trim();
    if (v && !values.includes(v)) onChange([...values, v]);
    setDraft("");
  }
  return (
    <div className={lowConfidence ? `rounded-xl border ${LOW_CONF_RING} p-3 -m-0` : undefined}>
      <ChipLabel lowConfidence={lowConfidence}>{label}</ChipLabel>
      <div className="flex flex-wrap gap-1.5 items-center">
        {values.map((v) => (
          <span key={v} className="inline-flex items-center gap-1.5 text-[12px] px-3 py-1.5 rounded-full border border-terracotta/30 bg-terracotta/10 text-[#0F0F0F]">
            {v}
            <button onClick={() => onChange(values.filter((x) => x !== v))} aria-label={`Remove ${v}`} className="text-[#0F0F0F]/40 hover:text-[#D5613E] transition-colors">
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }}
          onBlur={add}
          placeholder={placeholder}
          className="flex-1 min-w-[140px] bg-transparent border-b border-[#0F0F0F]/12 px-1 py-1.5 text-[13px] text-[#0F0F0F] placeholder:text-[#0F0F0F]/30 outline-none focus:border-terracotta/50 transition-all"
        />
      </div>
    </div>
  );
}

function ModalBlock({ label, onCopy, copied, children }: { label: string; onCopy: () => void; copied: boolean; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div className="text-[10px] uppercase tracking-[0.15em] text-[#6F655A] font-medium">{label}</div>
        <button onClick={onCopy} className="text-[10px] flex items-center gap-1 text-[#0F0F0F]/50 hover:text-terracotta transition-colors">
          {copied ? <><Check className="w-3 h-3" /> Copied</> : <><Copy className="w-3 h-3" /> Copy</>}
        </button>
      </div>
      <div className="bg-[#F6F3EE] border border-[#0F0F0F]/8 rounded-lg p-3.5">{children}</div>
    </div>
  );
}

// ============================================================================
// HELPERS
// ============================================================================
function segmentName(cluster: { city?: string; age_band?: string; segment_type?: string; country?: string }): { title: string; subtitle: string } {
  const city = (cluster.city || "").trim();
  const age = (cluster.age_band || "").trim();
  const seg = (cluster.segment_type || "").toLowerCase();

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

  const cities = city.split(/[\/,·|]/).map((c) => c.trim()).filter(Boolean);
  if (cities.length > 1) {
    const word = buyerWord(age);
    const title = word === "Students" ? "Regional Youth Buyers" : "Regional Urban Buyers";
    return { title, subtitle: cities.join(" · ") };
  }
  if (/mid-?tier|urban/i.test(city)) {
    return { title: "Regional Urban Buyers", subtitle: age ? `${city} · ${age}` : city };
  }
  if (city) {
    const word = buyerWord(age);
    const subParts: string[] = [];
    if (seg) subParts.push(seg === "diaspora" ? "Diaspora" : "Local");
    if (age) subParts.push(age);
    return { title: `${city} ${word}`, subtitle: subParts.join(" · ") };
  }
  return { title: cluster.country || "Audience Segment", subtitle: age };
}

function parseChannelRecommendation(channelRec: string): { platform: string; insight: string } {
  const dashSplit = (channelRec || "").split(/[—\-–]/);
  let platform = "Instagram";
  let insight = (channelRec || "").trim();
  if (dashSplit.length >= 2) {
    platform = dashSplit[0].trim();
    insight = dashSplit.slice(1).join(" — ").trim();
  } else {
    const platforms = ["Instagram", "Facebook", "TikTok", "WhatsApp", "Twitter", "YouTube", "LinkedIn"];
    const found = platforms.find((p) => (channelRec || "").toLowerCase().includes(p.toLowerCase()));
    if (found) platform = found;
  }
  return { platform, insight };
}

function buildCampaignPackage(r: CampaignResult): string {
  if (!r.campaign) return "";
  const c = r.campaign;
  const seg = segmentName(r.cluster);
  const platform = parseChannelRecommendation(c.channel_recommendation).platform;
  const storyboard = (c.reels_storyboard || [])
    .map((f) => `Frame ${f.frame} (${f.duration_seconds}s): ${f.visual}${f.caption_overlay ? `\n  Overlay: "${f.caption_overlay}"` : ""}`)
    .join("\n\n");

  return `=== CAMPAIGN — ${seg.title.toUpperCase()} ===

CAPTION
${c.caption}

BEST TIME
${c.posting_time}

BEST PLATFORM
${platform}

HASHTAGS
${c.hashtags.join(" ")}

WHATSAPP
${c.whatsapp_message}

REEL CONCEPT
${storyboard}

IMAGE PROMPT
${c.image_prompts.gemini}

=== END ===`;
}
