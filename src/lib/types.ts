// Brand Voice Profile — the structured DNA extracted from captions
export interface BrandVoiceProfile {
  voice_strength: {
    score: number; // 0-100
    explanation: string;
  };
  brand_personality: {
    traits: string[];
    summary: string;
  };
  how_they_talk: {
    style: string;
    feeling: string;
  };
  words_they_repeat: string[];
  what_they_care_about: string[];
  their_brand_vibe: {
    identity: string;
    audience_relationship: string;
  };
  they_never: string[];
}

// ============================================================
// BRAND GUIDELINES — structured onboarding input (the NEW primary
// Brand DNA source). These answers are converted into a synthetic
// brand corpus and fed into the EXISTING brand-voice extractor, so
// no separate model is needed. See src/lib/brand-guidelines.ts.
// ============================================================
export type EmojiPreference = "avoid" | "light" | "free" | "depends";

export interface BrandGuidelinesInput {
  // Step 1 — Brand basics
  brandName: string;
  websiteOrSocial?: string;
  productCategory: string;
  whatYouSell: string;
  differentiator: string;
  // Step 2 — Audience & market
  idealCustomer: string;
  targetMarkets: string[];
  languagePreference: string[];
  avoidAudiences?: string;
  // Step 3 — Personality
  personalityTraits: string[];
  customPersonality?: string;
  // Step 4 — Voice & rules
  communicationStyle: string[];
  alwaysRules?: string;
  neverRules?: string;
  bannedWordsOrTone?: string;
  emojiPreference?: EmojiPreference;
  // Step 5 — Admired brands (optional)
  admiredBrands?: string[];
  // Optional enrichment — existing captions (NOT required)
  captions?: string;
}

// A clean, presentation-ready Brand DNA summary. The pipeline returns
// a BrandVoiceProfile (above); this is the friendly shape we can derive
// for display/persistence when a structured summary is wanted.
export interface BrandDNAProfile {
  brandName: string;
  positioning: string;
  voiceSummary: string;
  personalityTraits: string[];
  communicationStyle: string[];
  targetAudienceSummary: string;
  marketPreferences: string[];
  languageRules: string[];
  brandRules: {
    always: string[];
    never: string[];
  };
  sampleCopy: string[];
  generatedAt: string;
}

// Cluster — a diaspora or local consumer segment
export interface Cluster {
  id: string;
  segment_type: "diaspora" | "local";
  country: string;
  city: string;
  age_band: string;
  estimated_size: number;
  primary_occasions: string[];
  channel_preferences: Record<string, number>;
  language_mix: string;
  currency: string;
  avg_order_value_min: number;
  avg_order_value_max: number;
  peak_shopping_windows: Array<{ day: string; hours: string }>;
  typical_engagement_rate: number;
  engagement_std_dev: number;
  gift_giving_pattern: string;
  shipping_tolerance_days: number;
  aesthetic_preference: string;
  cultural_notes: string;
  latitude: number;
  longitude: number;
  data_sources: string[];
  confidence_score: number;
}

// Campaign — generated output for a brand × cluster pair
export interface Campaign {
  id?: string;
  brand_voice_id: string;
  cluster_id: string;
  product_description: string;
  caption: string;
  image_prompts: {
    gemini: string;
    midjourney: string;
    dalle: string;
  };
  reels_storyboard: Array<{
    frame: number;
    visual: string;
    caption_overlay: string;
    duration_seconds: number;
  }>;
  hashtags: string[];
  whatsapp_message: string;
  posting_time: string;
  channel_recommendation: string;
  predicted_reach_min: number;
  predicted_reach_max: number;
  predicted_engagement_min: number;
  predicted_engagement_max: number;
  reasoning_trace: string;
  soul_score: number;
}
export interface ProductAttributes {
  category: string;
  product_type: "self_wear" | "gift" | "both" | "display" | "consumable";
  price_tier: "budget" | "mid" | "premium" | "luxury";
  price_value?: number;
  price_currency?: string;
  cultural_coding: "heritage" | "western" | "neutral" | "fusion";
  occasion_bound: "everyday" | "festival_gated" | "occasion_flexible";
  relevant_occasions: string[];
  gender_skew: "men" | "women" | "unisex";
  age_skew: "youth" | "adult" | "broad";
  essence: string;
}

export interface RankedAudience {
  cluster_id: string;
  fit_tier: "Strong fit" | "Moderate fit" | "Exploratory";
  why_this_fits: string;
  affordability_read: string;
  buying_motivation: string;
  best_channel: string;
  best_timing_note: string;
}