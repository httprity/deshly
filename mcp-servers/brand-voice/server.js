#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import ws from "ws"; 

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, "../../.env.local") });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { fetch: fetch },
    realtime: {
      transport: ws
    }
  }
);

const server = new Server(
  { name: "deshly-brand-voice", version: "1.0.0" },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "get_brand_profile",
      description: "Retrieve a stored brand voice profile by brand name or ID. Returns tone, vocabulary, language mix, cultural register, and voice strength score.",
      inputSchema: {
        type: "object",
        properties: {
          brand_name: { type: "string", description: "Name of the brand to retrieve" },
        },
        required: ["brand_name"],
      },
    },
    {
      name: "list_brands",
      description: "List all brands that have been onboarded to Deshly with their brand voice profiles.",
      inputSchema: { type: "object", properties: {}, required: [] },
    },
    {
      name: "score_against_brand",
      description: "Given a piece of copy and a brand_id, score how well the copy matches the brand's voice. Returns a score 0-100 and reasoning.",
      inputSchema: {
        type: "object",
        properties: {
          brand_id: { type: "string", description: "UUID of the brand" },
          copy: { type: "string", description: "The marketing copy to evaluate" },
        },
        required: ["brand_id", "copy"],
      },
    },
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    if (name === "list_brands") {
      const { data, error } = await supabase
        .from("brands")
        .select("id, name, created_at");
      if (error) throw new Error(error.message);
      return {
        content: [{
          type: "text",
          text: `# Brands on Deshly\n\n${data.map((b) => `- **${b.name}** (id: ${b.id})`).join("\n")}`,
        }],
      };
    }

    if (name === "get_brand_profile") {
      const { data: brand, error: brandError } = await supabase
        .from("brands")
        .select("id, name")
        .ilike("name", `%${args.brand_name}%`)
        .single();

      if (brandError || !brand) throw new Error(`Brand not found: ${args.brand_name}`);

      const { data: voice, error: voiceError } = await supabase
        .from("brand_voices")
        .select("voice_profile, voice_strength_score, extracted_by, created_at")
        .eq("brand_id", brand.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (voiceError || !voice) throw new Error("No brand voice found for this brand");

      const p = voice.voice_profile;
      return {
        content: [{
          type: "text",
          text: `# Brand Voice Profile: ${brand.name}\n\n` +
            `**Voice strength:** ${(voice.voice_strength_score * 100).toFixed(0)}/100\n` +
            `**Extracted by:** ${voice.extracted_by}\n\n` +
            `## Tone\n${p.voice.tone.join(", ")}\n"${p.voice.tone_descriptors}"\n\n` +
            `## Signature Words\n${p.vocabulary.signature_words.join(", ")}\n\n` +
            `## Language Mix\n${p.language_mix.bangla_english_ratio} Bangla-English\n${p.language_mix.code_switching_pattern}\n\n` +
            `## Brand Themes\n${p.brand_themes.join(", ")}\n\n` +
            `## Never Does\n${p.things_brand_never_does.map((t) => `- ${t}`).join("\n")}`,
        }],
      };
    }

    if (name === "score_against_brand") {
      const { data: voice, error } = await supabase
        .from("brand_voices")
        .select("voice_profile, voice_strength_score")
        .eq("brand_id", args.brand_id)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (error || !voice) throw new Error("Brand voice not found");

      const p = voice.voice_profile;
      const copyLower = args.copy.toLowerCase();

      let score = 50;
      let signals = [];

      // Tone matching
      const toneMatches = p.voice.tone.filter((t) =>
        copyLower.includes(t.toLowerCase())
      );
      if (toneMatches.length > 0) {
        score += toneMatches.length * 8;
        signals.push(`Tone match: ${toneMatches.join(", ")}`);
      }

      // Signature word presence
      const sigMatches = p.vocabulary.signature_words.filter((w) =>
        copyLower.includes(w.toLowerCase())
      );
      if (sigMatches.length > 0) {
        score += sigMatches.length * 10;
        signals.push(`Signature words found: ${sigMatches.join(", ")}`);
      }

      // Avoided words check
      const avoidedMatches = p.vocabulary.avoided_words.filter((w) =>
        copyLower.includes(w.toLowerCase())
      );
      if (avoidedMatches.length > 0) {
        score -= avoidedMatches.length * 15;
        signals.push(`⚠️ Avoided words found: ${avoidedMatches.join(", ")}`);
      }

      score = Math.max(0, Math.min(100, score));

      return {
        content: [{
          type: "text",
          text: `# Brand Voice Score: ${score}/100\n\n` +
            `## Signals\n${signals.map((s) => `- ${s}`).join("\n") || "- No direct matches found"}\n\n` +
            `## Verdict\n${score >= 75 ? "✅ Sounds like the brand" : score >= 50 ? "⚠️ Partially on-brand" : "❌ Off-brand — needs revision"}`,
        }],
      };
    }

    throw new Error(`Unknown tool: ${name}`);
  } catch (err) {
    return {
      content: [{ type: "text", text: `Error: ${err.message}` }],
      isError: true,
    };
  }
});

const transport = new StdioServerTransport();
await server.connect(transport);
console.error("Deshly BrandVoice MCP server running on stdio");