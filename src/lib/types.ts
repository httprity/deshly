// Brand Voice Profile — the structured DNA extracted from captions
export interface BrandVoiceProfile {
    voice: {
      tone: string[];
      formality_level: number; // 1-5
      tone_descriptors: string;
    };
    vocabulary: {
      signature_words: string[];
      avoided_words: string[];
      preferred_phrases: string[];
    };
    linguistic_patterns: {
      avg_sentence_length: "short" | "short-medium" | "medium" | "medium-long" | "long";
      uses_questions: boolean;
      uses_exclamations: "low" | "moderate" | "high";
      emoji_density: "none" | "low" | "low-medium" | "medium" | "high";
      preferred_emojis: string[];
    };
    language_mix: {
      bangla_english_ratio: string;
      code_switching_pattern: string;
    };
    cultural_register: {
      religious_references: string;
      regional_identity: string;
      formality_with_audience: string;
    };
    brand_themes: string[];
    things_brand_never_does: string[];
    voice_strength_score: number; // 0-1
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