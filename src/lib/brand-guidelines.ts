// ============================================================
// DESHLY — Brand Guidelines adapter
//
// Converts structured brand-guideline answers (the new primary Brand DNA
// onboarding) into a synthetic brand corpus that is shape-compatible with
// the EXISTING brand-voice extractor (which reads a block of brand writing).
//
// This is intentionally an ADAPTER, not a new pipeline: the guideline answers
// become the input source, and everything downstream (extraction, embedding,
// RAG, campaign generation) stays exactly as it is.
//
// IMPORTANT: the synthetic corpus is derived from the user's answers. It never
// invents brand FACTS (names, prices, claims). When a structural field is
// missing it generates reasonable VOICE defaults from the fields that ARE
// present — it must never produce a one-paragraph stub. The document is a
// minimum ~400-word structured brand document and is never shown in the UI;
// it is what gets embedded into the RAG pipeline.
// ============================================================

import type { BrandGuidelinesInput, EmojiPreference } from "./types";

const EMOJI_GUIDANCE: Record<EmojiPreference, string> = {
  avoid: "Avoid emojis entirely.",
  light: "Use emojis lightly and intentionally — never decorative.",
  free: "Use emojis freely where they fit the moment.",
  depends: "Vary emoji use depending on the campaign and channel.",
};

function clean(v?: string): string {
  return (v || "").trim();
}

function list(v?: string[]): string[] {
  return (v || []).map((s) => s.trim()).filter(Boolean);
}

function lower(s: string): string {
  return s.toLowerCase();
}

function capFirst(s: string): string {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

// ------------------------------------------------------------
// Resolved context — fills VOICE defaults from present fields so no section
// is ever empty. Brand FACTS (name, what-you-sell) are never fabricated; when
// absent we fall back to neutral phrasing ("This brand", "its products").
// ------------------------------------------------------------
interface Resolved {
  name: string;
  sells: string; // "its products" fallback (neutral, not a fabricated claim)
  category: string;
  diff: string;
  customer: string;
  traits: string[];
  styles: string[];
  always: string[];
  never: string[];
}

function splitRules(v?: string): string[] {
  return clean(v)
    .split(/[\n;]+/)
    .map((s) => s.replace(/^[-•*\d.)\s]+/, "").trim())
    .filter(Boolean);
}

function resolve(input: BrandGuidelinesInput): Resolved {
  const name = clean(input.brandName) || "This brand";
  const category = clean(input.productCategory) || clean(input.whatYouSell) || "its category";
  const sells = clean(input.whatYouSell) || (clean(input.productCategory) ? lower(clean(input.productCategory)) : "its products");

  const traits = list(input.personalityTraits);
  if (clean(input.customPersonality)) traits.push(clean(input.customPersonality));
  // Default traits from styles, else a neutral pair.
  const styles = list(input.communicationStyle);
  const resolvedTraits = traits.length ? traits : styles.length ? styles.slice(0, 2) : ["authentic", "thoughtful"];
  // Default styles from traits, else a neutral pair.
  const resolvedStyles = styles.length ? styles : resolvedTraits.length ? resolvedTraits.slice(0, 2) : ["clear", "direct"];

  const diff =
    clean(input.differentiator) ||
    `a ${resolvedTraits.slice(0, 2).join(", ")} take on ${category}`;

  const customer =
    clean(input.idealCustomer) ||
    (list(input.targetMarkets).length
      ? `people in ${list(input.targetMarkets).join(", ")} who care about ${category}`
      : `people who want a more ${resolvedTraits[0] || "considered"} option in ${category}`);

  return {
    name,
    sells,
    category,
    diff,
    customer,
    traits: resolvedTraits,
    styles: resolvedStyles,
    always: splitRules(input.alwaysRules),
    never: splitRules(input.neverRules),
  };
}

// ------------------------------------------------------------
// Section 4 — voice trait → a sentence DEMONSTRATING that trait in copy.
// Anchored to what the brand sells so the example is concrete, never generic.
// ------------------------------------------------------------
function traitExample(style: string, r: Resolved): string {
  const s = lower(style);
  const sells = r.sells;
  const cat = lower(r.category);
  const map: Array<[RegExp, string]> = [
    [/convers|casual|friendly|approachable/, `"Honestly? ${capFirst(sells)} shouldn't be complicated — here's the one we'd actually pick."`],
    [/playful|fun|witty|cheeky|humor/, `"Warning: you may get attached to your ${cat}. We did."`],
    [/bold|confident|punchy|direct/, `"${capFirst(sells)}, done right. No fluff, no filler."`],
    [/professional|formal|polished/, `"Considered ${cat}, made to a standard we won't compromise on."`],
    [/minimal|clean|simple|understated/, `"Less, but better. ${capFirst(sells)} — that's it."`],
    [/warm|caring|empathetic|kind/, `"We made this ${cat} for the days you need something that just works for you."`],
    [/educational|informative|helpful|expert/, `"Here's what actually matters when you choose ${cat} — and why ours is built this way."`],
    [/luxur|premium|elegant|sophisticat/, `"Quietly exceptional ${cat}, for people who notice the details."`],
    [/inspir|aspiration|uplift/, `"This is ${cat} for the version of you that's already on the way."`],
    [/energetic|hype|excit/, `"New ${cat} just dropped — and it's the good kind of obsession."`],
  ];
  for (const [re, ex] of map) if (re.test(s)) return ex;
  // Generic fallback still anchored to the product and the trait word.
  return `"${capFirst(sells)} that feels ${s} — exactly how it should."`;
}

// ------------------------------------------------------------
// Section 5 — exactly 5 "We write like this" / "We never write like this"
// pairs, drawn from rules first, then style/personality-derived defaults.
// ------------------------------------------------------------
function doDontPairs(r: Resolved): Array<{ good: string; bad: string }> {
  const cat = lower(r.category);
  const sells = r.sells;
  const pairs: Array<{ good: string; bad: string }> = [];

  // From explicit "always" rules.
  for (const rule of r.always.slice(0, 2)) {
    pairs.push({
      good: `${capFirst(rule)}.`,
      bad: `Ignoring that — generic copy that could belong to any ${cat} brand.`,
    });
  }
  // From explicit "never" rules (the rule itself IS the wrong way).
  for (const rule of r.never.slice(0, 2)) {
    pairs.push({
      good: `Copy that stays true to our voice and skips this entirely.`,
      bad: `${capFirst(rule)}.`,
    });
  }
  // Style-derived defaults to top up to 5.
  const styleDefaults: Array<{ good: string; bad: string }> = [
    { good: `"${capFirst(sells)}, made the way it should be."`, bad: `"Elevate your lifestyle with premium quality you deserve."` },
    { good: `"Here's the ${cat} we'd genuinely recommend."`, bad: `"The ultimate game-changing must-have of the year!!!"` },
    { good: `"Built for everyday, not for a billboard."`, bad: `"Redefining excellence, one product at a time."` },
    { good: `"Straight talk about what this ${cat} does well."`, bad: `"Unparalleled, world-class, best-in-class solutions."` },
    { good: `"A ${r.traits[0] || "considered"} ${cat} for people who care."`, bad: `"Perfect for everyone, everywhere, all the time."` },
  ];
  for (const d of styleDefaults) {
    if (pairs.length >= 5) break;
    pairs.push(d);
  }
  return pairs.slice(0, 5);
}

// ------------------------------------------------------------
// Section 6 — exactly 3 sample captions in the brand's voice. Category-
// anchored (NEVER placeholder product names). Shared with the result view so
// the "Example copy" the user sees matches what fed the pipeline.
// ------------------------------------------------------------
export function sampleBrandCopyFromGuidelines(input: BrandGuidelinesInput): string[] {
  const r = resolve(input);
  const cat = lower(r.category);
  const trait = lower(r.traits[0] || "considered");
  const customerShort = clean(input.idealCustomer) ? lower(clean(input.idealCustomer)) : "people who want better";

  const caption1 = clean(input.differentiator)
    ? `${capFirst(cat)}, but ${lower(clean(input.differentiator))}.`
    : `${capFirst(cat)} that actually earns its place in your routine.`;
  const caption2 = `Made for ${customerShort}. A ${trait} take on ${cat} — nothing you don't need.`;
  const caption3 = `If you've been waiting for ${cat} that feels like ${r.name}, this is it.`;

  return [caption1, caption2, caption3];
}

function wordCount(s: string): number {
  return s.split(/\s+/).filter(Boolean).length;
}

/**
 * Build the synthetic brand corpus. Output is a structured, ~400+ word brand
 * document the existing extractor reads as authentic brand material. Sections
 * always render (defaults fill gaps) so the extractor never sees a thin stub.
 */
export function createSyntheticBrandCorpusFromGuidelines(
  input: BrandGuidelinesInput
): string {
  const r = resolve(input);
  const sections: string[] = [];

  // 1. Brand overview paragraph (third person).
  const websiteBit = clean(input.websiteOrSocial) ? ` Find them at ${clean(input.websiteOrSocial)}.` : "";
  sections.push(
    `BRAND OVERVIEW:\n` +
      `${r.name} sells ${r.sells} in the ${lower(r.category)} space. ` +
      `It serves ${r.customer}. ` +
      `What sets it apart is ${lower(r.diff)}.${websiteBit}`
  );

  // 2. Positioning statement (one sentence).
  sections.push(
    `POSITIONING:\n` +
      `${r.name} is ${lower(r.category)} for ${r.customer} — it matters because ${lower(r.diff)}.`
  );

  // 3. Ideal customer description (2–3 sentences).
  const marketSentence = list(input.targetMarkets).length
    ? `They are concentrated in ${list(input.targetMarkets).join(", ")}. `
    : "";
  sections.push(
    `IDEAL CUSTOMER:\n` +
      `The ideal customer is ${r.customer}. ${marketSentence}` +
      `They respond to a brand that feels ${r.traits.slice(0, 3).join(", ")}, and they want ${lower(r.category)} ` +
      `that respects their time and their taste rather than shouting at them.`
  );

  // 4. Voice traits with examples (one per communication style).
  const traitLines = r.styles.map(
    (style) => `- Trait: ${capFirst(style)}\n  Example: ${traitExample(style, r)}`
  );
  sections.push(`VOICE TRAITS WITH EXAMPLES:\n${traitLines.join("\n")}`);

  // 5. Do / Don't copy pairs (exactly 5).
  const pairLines = doDontPairs(r).map(
    (p, i) => `${i + 1}. We write like this: ${p.good}\n   We never write like this: ${p.bad}`
  );
  sections.push(`DO / DON'T COPY PAIRS:\n${pairLines.join("\n")}`);

  // 6. Sample captions (exactly 3, category-anchored).
  sections.push(`SAMPLE CAPTIONS:\n${sampleBrandCopyFromGuidelines(input).map((c) => `- ${c}`).join("\n")}`);

  // --- Supplementary signal (still answer-derived) ---
  const styleBits = [
    r.styles.length && `Communication style: ${r.styles.join(", ")}.`,
    input.emojiPreference && EMOJI_GUIDANCE[input.emojiPreference],
    list(input.languagePreference).length && `Language: ${list(input.languagePreference).join(", ")}.`,
    clean(input.avoidAudiences) && `Audiences to deprioritize: ${clean(input.avoidAudiences)}.`,
    clean(input.bannedWordsOrTone) && `Avoid these words/tone: ${clean(input.bannedWordsOrTone)}.`,
    list(input.admiredBrands).length && `Creative direction reference: ${list(input.admiredBrands).join(", ")}.`,
  ].filter(Boolean);
  if (styleBits.length) sections.push(`COMMUNICATION STYLE & RULES:\n${styleBits.join(" ")}`);

  // Brand rules — always / never, verbatim where given.
  const ruleLines: string[] = [];
  if (r.always.length) ruleLines.push(`Always:\n${r.always.map((x) => `- ${x}`).join("\n")}`);
  if (r.never.length) ruleLines.push(`Never:\n${r.never.map((x) => `- ${x}`).join("\n")}`);
  if (ruleLines.length) sections.push(`BRAND RULES:\n${ruleLines.join("\n\n")}`);

  // Optional enrichment — real existing captions, appended verbatim.
  if (clean(input.captions)) {
    sections.push(`EXISTING BRAND CAPTIONS:\n${clean(input.captions)}`);
  }

  let doc = sections.join("\n\n");

  // Guard: never emit a thin stub. If somehow under the 400-word floor, append
  // an answer-derived "voice in practice" paragraph (no fabricated facts).
  if (wordCount(doc) < 400) {
    doc +=
      `\n\nHOW THIS BRAND SOUNDS IN PRACTICE:\n` +
      `Every piece of ${r.name} copy should read as ${r.traits.join(", ")} and feel ${r.styles.join(", ")}. ` +
      `When writing about ${lower(r.category)}, lead with ${lower(r.diff)} and speak directly to ${r.customer}. ` +
      `Keep the language ${r.styles[0] || "clear"} — concrete over clever, specific over sweeping. ` +
      `The reader should always be able to tell this is ${r.name} talking, and no one else in ${lower(r.category)}.`;
  }

  return doc;
}
