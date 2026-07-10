"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Sparkles,
  Loader2,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  Wand2,
  Pencil,
} from "lucide-react";
import type {
  BrandVoiceProfile,
  BrandGuidelinesInput,
} from "@/lib/types";
import { sampleBrandCopyFromGuidelines } from "@/lib/brand-guidelines";
import { ProductShell } from "@/components/ProductShell";
import {
  TextInput,
  TextArea,
  Chip,
  ChipSelect,
  Pill,
  LabeledCard,
  Disclosure,
} from "@/components/ui";
import { T } from "@/components/system";

// ============================================================
// BRAND DNA — one-question-at-a-time guided interview.
//
// Deshly "interviews" the brand: one question, one control per screen,
// generous whitespace, low cognitive load. Answers map directly onto the
// existing BrandGuidelinesInput contract and POST to the unchanged
// /api/brand-dna/from-guidelines pipeline (corpus → extractor → embeddings
// → RAG → profile). No backend changes.
//
// Option sets are global and market-agnostic — no region/culture hardcoded.
// ============================================================
const CATEGORY_OPTIONS = [
  "Fashion", "Beauty", "Food & Drink", "Home & Living", "Electronics",
  "Wellness", "Services", "SaaS", "Education", "Jewelry", "Other",
];
const MARKET_OPTIONS = [
  "Local city", "Nationwide", "United States", "United Kingdom", "Canada",
  "Europe", "Middle East", "Southeast Asia", "Global", "Online only", "Other",
];
const PERSONALITY_OPTIONS = [
  "Premium", "Modern", "Minimal", "Friendly", "Playful", "Bold", "Elegant",
  "Professional", "Experimental", "Youthful", "Trustworthy", "Luxury",
  "Affordable", "Calm", "Energetic",
];
const COMMUNICATION_OPTIONS = [
  "Professional", "Conversational", "Inspirational", "Educational", "Direct",
  "Humorous", "Aspirational", "Warm", "Sharp", "Minimal", "High-energy",
];

type Form = {
  brandName: string;
  whatYouSell: string;
  productCategory: string;
  differentiator: string;
  idealCustomer: string;
  targetMarkets: string[];
  personalityTraits: string[];
  communicationStyle: string[];
  alwaysRules: string;
  neverRules: string;
  admiredBrandsText: string;
  captions: string;
};

const EMPTY: Form = {
  brandName: "", whatYouSell: "", productCategory: "", differentiator: "",
  idealCustomer: "", targetMarkets: [], personalityTraits: [],
  communicationStyle: [], alwaysRules: "", neverRules: "",
  admiredBrandsText: "", captions: "",
};

// One question = one screen. `required` gates Continue; `skip` shows a quiet
// Skip control. `kind` selects the control rendered in the question body.
type FieldKey = keyof Form;
type Question = {
  field: FieldKey;
  title: string;
  helper?: string;
  required?: boolean;
  skip?: boolean;
  kind: "text" | "textarea" | "category" | "markets" | "personality" | "communication";
};

const QUESTIONS: Question[] = [
  {
    field: "brandName",
    title: "What's your brand called?",
    helper: "This is the brand Deshly will build a reusable voice system for.",
    required: true,
    kind: "text",
  },
  {
    field: "whatYouSell",
    title: "What do you sell?",
    required: true,
    kind: "textarea",
  },
  {
    field: "productCategory",
    title: "What category best fits your brand?",
    required: true,
    kind: "category",
  },
  {
    field: "differentiator",
    title: "Why should customers choose you?",
    required: true,
    kind: "textarea",
  },
  {
    field: "idealCustomer",
    title: "Who is your ideal customer?",
    helper: "Describe the people you want Deshly to write and generate campaigns for.",
    required: true,
    kind: "textarea",
  },
  {
    field: "targetMarkets",
    title: "Where do you sell, or want to sell?",
    helper: "Pick any that apply — or add your own. Deshly works for any market.",
    skip: true,
    kind: "markets",
  },
  {
    field: "personalityTraits",
    title: "What should your brand feel like?",
    helper: "Pick a few — this shapes the personality behind every campaign.",
    required: true,
    kind: "personality",
  },
  {
    field: "communicationStyle",
    title: "How should your brand sound?",
    required: true,
    kind: "communication",
  },
  {
    field: "alwaysRules",
    title: "What should Deshly always do when writing for your brand?",
    skip: true,
    kind: "textarea",
  },
  {
    field: "neverRules",
    title: "What should Deshly never do?",
    skip: true,
    kind: "textarea",
  },
  {
    field: "admiredBrandsText",
    title: "Any brands you admire?",
    helper: "Optional. This helps Deshly understand your taste and creative direction.",
    skip: true,
    kind: "textarea",
  },
];

const PLACEHOLDERS: Partial<Record<FieldKey, string>> = {
  brandName: "Your brand name",
  whatYouSell: "Example: premium skincare products, handmade leather bags, fitness coaching, specialty coffee…",
  differentiator: "Example: cleaner ingredients, better design, faster delivery, handmade quality, expert guidance…",
  idealCustomer: "Example: design-conscious professionals who value craft over logos",
  alwaysRules: "Example: keep captions short, sound premium, explain benefits clearly, use simple language…",
  neverRules: "Example: avoid slang, no exaggerated claims, don't use emojis, don't sound too salesy…",
  admiredBrandsText: "List a few brands, separated by commas",
};

const TOTAL_Q = QUESTIONS.length; // 11
const REVIEW_STEP = TOTAL_Q + 1; // 12

const PRIMARY_BTN =
  "inline-flex items-center justify-center gap-2 bg-[#0F0F0F] text-[#F6F3EE] hover:bg-[#D5613E] rounded-lg px-6 py-3.5 text-sm font-medium tracking-[-0.01em] transition-colors disabled:opacity-40 disabled:cursor-not-allowed";
const SECONDARY_BTN =
  "inline-flex items-center justify-center gap-2 border bo-rule-strong text-[#0F0F0F] hover:border-[#0F0F0F] hover:bg-[#FBF9F5] rounded-lg px-5 py-3 text-sm font-medium transition-colors disabled:opacity-30 disabled:cursor-not-allowed";

export default function BrandDNAPage() {
  const [step, setStep] = useState(1); // 1..TOTAL_Q = questions, REVIEW_STEP = review
  const [f, setF] = useState<Form>(EMPTY);
  const [error, setError] = useState<string | null>(null);

  const [generating, setGenerating] = useState(false);
  const [profile, setProfile] = useState<BrandVoiceProfile | null>(null);
  const [brandVoiceId, setBrandVoiceId] = useState<string | null>(null);
  const [brandHandle, setBrandHandle] = useState<string | null>(null);

  function set<K extends keyof Form>(key: K, val: Form[K]) {
    setF((prev) => ({ ...prev, [key]: val }));
  }
  function toggle(key: "targetMarkets" | "personalityTraits" | "communicationStyle", val: string) {
    setF((prev) => {
      const arr = prev[key];
      return { ...prev, [key]: arr.includes(val) ? arr.filter((x) => x !== val) : [...arr, val] };
    });
  }

  // Is a given question (1-indexed) satisfied?
  function questionError(qIndex: number): string | null {
    const q = QUESTIONS[qIndex - 1];
    if (!q || !q.required) return null;
    const val = f[q.field];
    if (Array.isArray(val)) {
      if (val.length === 0) return "Pick at least one to continue.";
    } else if (!String(val).trim()) {
      return "Add an answer to continue.";
    }
    return null;
  }

  function next() {
    if (step <= TOTAL_Q) {
      const err = questionError(step);
      if (err) { setError(err); return; }
    }
    setError(null);
    setStep((s) => Math.min(REVIEW_STEP, s + 1));
  }
  function skip() {
    setError(null);
    setStep((s) => Math.min(REVIEW_STEP, s + 1));
  }
  function back() {
    setError(null);
    setStep((s) => Math.max(1, s - 1));
  }

  function buildInput(): BrandGuidelinesInput {
    return {
      brandName: f.brandName.trim(),
      productCategory: f.productCategory.trim(),
      whatYouSell: f.whatYouSell.trim(),
      differentiator: f.differentiator.trim(),
      idealCustomer: f.idealCustomer.trim(),
      targetMarkets: f.targetMarkets,
      languagePreference: [],
      personalityTraits: f.personalityTraits,
      communicationStyle: f.communicationStyle,
      alwaysRules: f.alwaysRules.trim() || undefined,
      neverRules: f.neverRules.trim() || undefined,
      admiredBrands: f.admiredBrandsText.split(/[,\n]/).map((s) => s.trim()).filter(Boolean),
      captions: f.captions.trim() || undefined,
    };
  }

  async function handleGenerate() {
    // Validate every required question; jump to the first that fails.
    for (let i = 1; i <= TOTAL_Q; i++) {
      const err = questionError(i);
      if (err) { setStep(i); setError(err); return; }
    }
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch("/api/brand-dna/from-guidelines", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildInput()),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to build Brand DNA");

      setProfile(data.profile);
      setBrandVoiceId(data.brandVoiceId);
      setBrandHandle(data.brandHandle || null);

      if (typeof window !== "undefined") {
        localStorage.setItem("currentBrandVoiceId", data.brandVoiceId);
        localStorage.setItem("currentBrandName", data.brandName || f.brandName.trim());
        if (f.productCategory.trim())
          localStorage.setItem("currentProductCategory", f.productCategory.trim());
        if (data.brandHandle) localStorage.setItem("currentBrandHandle", data.brandHandle);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      setError(msg || "We couldn't build your Brand DNA. Please check your answers and try again.");
    } finally {
      setGenerating(false);
    }
  }

  function editAnswers() {
    setProfile(null);
    setBrandVoiceId(null);
    setBrandHandle(null);
    setStep(REVIEW_STEP);
    setError(null);
  }

  // ============================================================ RESULT
  if (profile) {
    return (
      <ProductShell
        stepLabel="STEP 01 — BRAND DNA"
        pageTitle={<>Your Brand DNA is <span className="text-[#D5613E]">ready.</span></>}
        pageSubtitle="Deshly will write, target, and generate every campaign in this style. Refine it anytime."
      >
        <BrandDNAResult
          profile={profile}
          input={buildInput()}
          brandVoiceId={brandVoiceId}
          brandHandle={brandHandle}
          onEdit={editAnswers}
        />
      </ProductShell>
    );
  }

  // ============================================================ INTERVIEW
  const onReview = step === REVIEW_STEP;
  const q = onReview ? null : QUESTIONS[step - 1];

  return (
    <ProductShell
      stepLabel="STEP 01 — BRAND DNA"
      pageTitle={<>Let&apos;s build your <span className="text-[#D5613E]">Brand DNA.</span></>}
      pageSubtitle="A few quick questions — one at a time. Deshly turns your answers into a reusable brand system for every campaign. No captions needed."
    >
      <div className="max-w-2xl mx-auto">
        {/* Progress */}
        <div className="mb-10">
          <div className="flex items-center justify-between mb-3">
            <span className={`${T.monoLabel} text-[#0F0F0F]/55`}>
              {onReview ? "Review your answers" : `Question ${step} of ${TOTAL_Q}`}
            </span>
            <span className={`${T.monoData} text-[#0F0F0F]/35`}>
              {String(Math.min(step, TOTAL_Q)).padStart(2, "0")} / {String(TOTAL_Q).padStart(2, "0")}
            </span>
          </div>
          <div className="h-[3px] bg-[#EDE8DE] rounded-full overflow-hidden">
            <div
              className="h-full bg-[#D5613E] rounded-full transition-all duration-500"
              style={{ width: `${(Math.min(step, REVIEW_STEP) / REVIEW_STEP) * 100}%` }}
            />
          </div>
        </div>

        <div className="rounded-xl border bo-rule bg-[#FBF9F5] p-6 sm:p-10 lg:p-12">
          <div className="min-h-[320px]">
            {/* QUESTION SCREEN */}
            {q && (
              <div className="space-y-8">
                <div>
                  <h2 className="font-display font-semibold text-[1.65rem] sm:text-[2rem] tracking-[-0.025em] text-[#0F0F0F] leading-[1.08]">
                    {q.title}
                  </h2>
                  {q.helper && (
                    <p className="text-[15px] text-[#0F0F0F]/50 mt-3 leading-relaxed">{q.helper}</p>
                  )}
                </div>
                <div>{renderControl(q)}</div>
              </div>
            )}

            {/* REVIEW SCREEN */}
            {onReview && (
              <div className="space-y-8">
                <div>
                  <h2 className="font-display font-semibold text-[1.65rem] sm:text-[2rem] tracking-[-0.025em] text-[#0F0F0F] leading-[1.08]">
                    Looks good?
                  </h2>
                  <p className="text-[15px] text-[#0F0F0F]/50 mt-3 leading-relaxed">
                    A quick check before Deshly builds your Brand DNA.
                  </p>
                </div>
                <ReviewSummary input={buildInput()} onJump={(s) => { setError(null); setStep(s); }} />
                <Disclosure summary="Enrich with existing captions (optional)">
                  <p className="text-[13px] text-[#0F0F0F]/45 mb-2.5 leading-relaxed">
                    Optional — paste a few real captions and Deshly will fold them into your voice.
                  </p>
                  <TextArea value={f.captions} onChange={(v) => set("captions", v)} rows={5} placeholder="One caption per line — or blank lines between" mono />
                </Disclosure>
              </div>
            )}

            {error && (
              <div className="mt-7 p-4 rounded-lg border border-[#D5613E]/40 bg-[#D5613E]/8 flex items-start gap-3">
                <AlertCircle className="w-4 h-4 text-[#D5613E] mt-0.5 flex-shrink-0" />
                <div className="text-sm text-[#0F0F0F]/80">{error}</div>
              </div>
            )}
          </div>

          {/* NAV CONTROLS */}
          <div className="mt-10 pt-6 border-t bo-rule flex items-center justify-between gap-3">
            <button onClick={back} disabled={step === 1} className={SECONDARY_BTN}>
              <ArrowLeft className="w-3.5 h-3.5" /> Back
            </button>

            <div className="flex items-center gap-3">
              {q?.skip && (
                <button onClick={skip} className="text-[13px] text-[#0F0F0F]/45 hover:text-[#0F0F0F] transition-colors">
                  Skip
                </button>
              )}
              {!onReview ? (
                <button onClick={next} className={PRIMARY_BTN}>
                  Continue <ArrowRight className="w-3.5 h-3.5" />
                </button>
              ) : (
                <button onClick={handleGenerate} disabled={generating} className={PRIMARY_BTN}>
                  {generating ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Building your Brand DNA…</>
                  ) : (
                    <><Sparkles className="w-4 h-4" /> Build Brand DNA</>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </ProductShell>
  );

  // ---- per-question control renderer (closure over form state) ----
  function renderControl(qq: Question) {
    switch (qq.kind) {
      case "text":
        return (
          <TextInput
            value={f[qq.field] as string}
            onChange={(v) => set(qq.field as "brandName", v)}
            placeholder={PLACEHOLDERS[qq.field]}
          />
        );
      case "textarea":
        return (
          <TextArea
            value={f[qq.field] as string}
            onChange={(v) => set(qq.field as "whatYouSell", v)}
            rows={qq.field === "admiredBrandsText" ? 3 : 4}
            placeholder={PLACEHOLDERS[qq.field]}
          />
        );
      case "category":
        return (
          <div>
            <div className="flex flex-wrap gap-2">
              {CATEGORY_OPTIONS.map((c) => (
                <Chip key={c} active={f.productCategory === c} onClick={() => set("productCategory", c)}>{c}</Chip>
              ))}
            </div>
            <TextInput
              className="mt-4"
              value={CATEGORY_OPTIONS.includes(f.productCategory) ? "" : f.productCategory}
              onChange={(v) => set("productCategory", v)}
              placeholder="Or type your own category"
            />
          </div>
        );
      case "markets":
        return (
          <AddableChips
            options={MARKET_OPTIONS}
            selected={f.targetMarkets}
            onToggle={(v) => toggle("targetMarkets", v)}
            onAdd={(v) => set("targetMarkets", [...f.targetMarkets, v])}
            placeholder="Add a city, country, or region"
          />
        );
      case "personality":
        return (
          <ChipSelect options={PERSONALITY_OPTIONS} selected={f.personalityTraits} onToggle={(v) => toggle("personalityTraits", v)} />
        );
      case "communication":
        return (
          <ChipSelect options={COMMUNICATION_OPTIONS} selected={f.communicationStyle} onToggle={(v) => toggle("communicationStyle", v)} />
        );
      default:
        return null;
    }
  }
}

// ============================================================ RESULT VIEW
function BrandDNAResult({
  profile, input, brandVoiceId, brandHandle, onEdit,
}: {
  profile: BrandVoiceProfile;
  input: BrandGuidelinesInput;
  brandVoiceId: string | null;
  brandHandle: string | null;
  onEdit: () => void;
}) {
  const dontRules = (profile as { dont_rules?: string[] }).dont_rules;
  const never = [
    ...(Array.isArray(profile.they_never) ? profile.they_never : []),
    ...(Array.isArray(dontRules) ? dontRules : []),
  ];
  const sampleCopy = sampleBrandCopyFromGuidelines(input);
  const audienceBits = [
    input.idealCustomer,
    input.targetMarkets.length ? `Markets: ${input.targetMarkets.join(", ")}` : "",
  ].filter(Boolean);

  return (
    <div className="max-w-3xl space-y-5">
      <div className="flex items-center gap-2 text-[13px] text-[#0F0F0F]/70">
        <CheckCircle2 className="w-4 h-4 text-[#D5613E]" /> Your Brand DNA is ready.
      </div>

      <LabeledCard label="Brand Voice">
        <div className="font-display font-semibold text-xl tracking-[-0.02em] text-[#0F0F0F] leading-snug mb-3">
          {profile.their_brand_vibe?.identity || profile.brand_personality.summary}
        </div>
        <div className="space-y-2 text-[15px] text-[#0F0F0F]/70 leading-relaxed">
          <div>{profile.how_they_talk.style}</div>
          <div className="text-[#0F0F0F]/50 italic">{profile.how_they_talk.feeling}</div>
        </div>
      </LabeledCard>

      <LabeledCard label="Personality">
        <div className="flex flex-wrap gap-2 mb-3">
          {profile.brand_personality.traits.map((t) => <Pill key={t}>{t}</Pill>)}
        </div>
        <div className="text-[#0F0F0F]/65 text-sm italic leading-relaxed">{profile.brand_personality.summary}</div>
      </LabeledCard>

      {audienceBits.length > 0 && (
        <LabeledCard label="Audience Summary">
          <ul className="space-y-2 text-sm text-[#0F0F0F]/70 leading-relaxed">
            {audienceBits.map((b, i) => (
              <li key={i} className="flex gap-2.5"><span className="text-[#D5613E] flex-shrink-0">—</span><span>{b}</span></li>
            ))}
          </ul>
        </LabeledCard>
      )}

      {input.targetMarkets.length > 0 && (
        <LabeledCard label="Market Preferences">
          <div className="flex flex-wrap gap-2">
            {input.targetMarkets.map((m) => <Pill key={m} tone="muted">{m}</Pill>)}
          </div>
        </LabeledCard>
      )}

      {never.length > 0 && (
        <LabeledCard label="Communication Rules">
          <ul className="space-y-2 text-sm text-[#0F0F0F]/65 leading-relaxed">
            {never.slice(0, 6).map((t, i) => (
              <li key={i} className="flex gap-2.5"><span className="text-[#D5613E] flex-shrink-0">—</span><span>{t}</span></li>
            ))}
          </ul>
        </LabeledCard>
      )}

      {sampleCopy.length > 0 && (
        <LabeledCard label="Example Brand Copy">
          <div className="space-y-2.5">
            {sampleCopy.map((line, i) => (
              <div key={i} className="p-3 rounded-lg border bo-rule bg-[#F6F3EE] text-sm text-[#0F0F0F]/75 leading-relaxed">{line}</div>
            ))}
          </div>
        </LabeledCard>
      )}

      {brandHandle && (
        <div className="p-4 rounded-xl border border-[#D5613E]/30 bg-[#D5613E]/5">
          <div className={`${T.monoLabel} text-[#0F0F0F]/55 mb-1.5`}>Your brand handle — save this</div>
          <div className="flex items-center justify-between gap-3">
            <div className="font-mono text-lg text-[#0F0F0F] tracking-wider">{brandHandle}</div>
            <button onClick={() => navigator.clipboard.writeText(brandHandle)} className="text-[11px] text-[#0F0F0F]/55 hover:text-[#D5613E] transition-colors">Copy</button>
          </div>
          <div className="text-[12px] text-[#0F0F0F]/45 mt-2 leading-relaxed">Enter this on the Generator to return to your brand on any device.</div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3 pt-2">
        {brandVoiceId && (
          <Link
            href="/generator"
            className="group flex-1 flex items-center justify-between bg-[#0F0F0F] text-[#F6F3EE] hover:bg-[#D5613E] rounded-lg py-4 px-6 font-medium text-sm transition-colors"
          >
            <span className="flex items-center gap-3"><Wand2 className="w-4 h-4" /> Generate first campaign</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>
        )}
        <button onClick={onEdit} className={SECONDARY_BTN + " py-4"}>
          <Pencil className="w-3.5 h-3.5" /> Edit answers
        </button>
      </div>
    </div>
  );
}

function ReviewSummary({ input, onJump }: { input: BrandGuidelinesInput; onJump: (s: number) => void }) {
  const rows: { label: string; value: string; step: number }[] = [
    { label: "Brand", value: [input.brandName, input.whatYouSell].filter(Boolean).join(" — "), step: 1 },
    { label: "Category", value: input.productCategory, step: 3 },
    { label: "Why choose", value: input.differentiator, step: 4 },
    { label: "Ideal customer", value: input.idealCustomer, step: 5 },
    { label: "Markets", value: input.targetMarkets.join(", "), step: 6 },
    { label: "Personality", value: input.personalityTraits.join(", "), step: 7 },
    { label: "Communication", value: input.communicationStyle.join(", "), step: 8 },
    {
      label: "Brand rules",
      value: [input.alwaysRules && `Always: ${input.alwaysRules}`, input.neverRules && `Never: ${input.neverRules}`].filter(Boolean).join("  ·  "),
      step: 9,
    },
  ].filter((r) => r.value);

  return (
    <div className="divide-y bo-rule border bo-rule rounded-xl overflow-hidden bg-[#F6F3EE]">
      {rows.map((r) => (
        <div key={r.label} className="flex items-start gap-4 p-4">
          <div className={`${T.monoLabel} text-[#0F0F0F]/45 w-28 flex-shrink-0 pt-0.5`}>{r.label}</div>
          <div className="text-sm text-[#0F0F0F]/75 leading-relaxed flex-1 min-w-0">{r.value}</div>
          <button onClick={() => onJump(r.step)} className="text-[11px] text-[#0F0F0F]/40 hover:text-[#D5613E] transition-colors flex-shrink-0">Edit</button>
        </div>
      ))}
    </div>
  );
}

// Multi-select chips + free-text add (markets)
function AddableChips({ options, selected, onToggle, onAdd, placeholder }: {
  options: string[]; selected: string[]; onToggle: (v: string) => void; onAdd: (v: string) => void; placeholder?: string;
}) {
  const [draft, setDraft] = useState("");
  const all = Array.from(new Set([...options, ...selected]));
  function commit() {
    const v = draft.trim();
    if (v && !selected.includes(v)) onAdd(v);
    setDraft("");
  }
  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {all.map((o) => <Chip key={o} active={selected.includes(o)} onClick={() => onToggle(o)}>{o}</Chip>)}
      </div>
      <input
        type="text"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); commit(); } }}
        onBlur={commit}
        placeholder={placeholder}
        className="w-full mt-4 rounded-lg border bo-rule-strong bg-[#FBF9F5] px-4 py-2.5 text-sm text-[#0F0F0F] placeholder:text-[#0F0F0F]/35 outline-none focus:border-[#0F0F0F] transition-colors"
      />
    </div>
  );
}
