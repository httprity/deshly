#!/usr/bin/env node
import ws from "ws";
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

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env.local from project root
dotenv.config({ path: path.resolve(__dirname, "../../.env.local") });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("Missing Supabase credentials in .env.local");
  process.exit(1);
}
globalThis.WebSocket = ws;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    realtime: {
      transport: ws,
    },
  });
// =============================================================================
// SERVER SETUP
// =============================================================================
const server = new Server(
  {
    name: "deshly-diaspora-graph",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// =============================================================================
// TOOL DEFINITIONS
// =============================================================================
const TOOLS = [
  {
    name: "list_clusters",
    description:
      "List all 13 Bangladeshi consumer clusters mapped by Deshly. Returns diaspora clusters (UK, Canada, USA, UAE, Australia, Malaysia, Qatar, Saudi Arabia) and local Bangladesh clusters. Each cluster includes country, city, age band, estimated size, and segment type.",
    inputSchema: {
      type: "object",
      properties: {
        segment: {
          type: "string",
          enum: ["all", "diaspora", "local"],
          description: "Filter by segment type. Default: all",
        },
      },
      required: [],
    },
  },
  {
    name: "get_cluster_intelligence",
    description:
      "Get full intelligence for a specific cluster: occasions, channel preferences, AOV range, peak shopping windows, engagement rates, gift-giving patterns, aesthetic preferences, and cultural notes. Use this when the user wants deep details on one cluster.",
    inputSchema: {
      type: "object",
      properties: {
        cluster_id: {
          type: "string",
          description:
            "The cluster ID, e.g., 'uk_london_professional_25_34' or 'bd_dhaka_professional_25_40'",
        },
      },
      required: ["cluster_id"],
    },
  },
  {
    name: "match_clusters_to_product",
    description:
      "Given a product description, return the top N clusters whose attributes (occasion, AOV range, aesthetic, channel) best match the product. Uses graph traversal over cluster attributes — this is Deshly's Graph RAG.",
    inputSchema: {
      type: "object",
      properties: {
        product_description: {
          type: "string",
          description: "Natural-language description of the product",
        },
        top_n: {
          type: "number",
          description: "Number of top matches to return. Default: 3",
        },
      },
      required: ["product_description"],
    },
  },
  {
    name: "recommend_campaign_strategy",
    description:
      "Given a cluster_id, return a strategic recommendation for marketing to that cluster: best channels, optimal posting time, dominant occasion to lean into, language mix, and cultural cues.",
    inputSchema: {
      type: "object",
      properties: {
        cluster_id: {
          type: "string",
          description: "The cluster to strategize for",
        },
      },
      required: ["cluster_id"],
    },
  },
];

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: TOOLS,
}));

// =============================================================================
// TOOL HANDLERS
// =============================================================================
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    if (name === "list_clusters") {
      const segment = args?.segment || "all";
      let query = supabase
        .from("clusters")
        .select("id, segment_type, country, city, age_band, estimated_size, currency")
        .order("estimated_size", { ascending: false });

      if (segment !== "all") {
        query = query.eq("segment_type", segment);
      }

      const { data, error } = await query;
      if (error) throw new Error(error.message);

      return {
        content: [
          {
            type: "text",
            text: `# Deshly Cluster Map · ${data.length} clusters\n\n` +
              data
                .map(
                  (c) =>
                    `**${c.id}**\n${c.country} · ${c.city} · ${c.age_band} · ${c.segment_type}\n` +
                    `Size: ${c.estimated_size.toLocaleString()} · Currency: ${c.currency}\n`
                )
                .join("\n"),
          },
        ],
      };
    }

    if (name === "get_cluster_intelligence") {
      const { data, error } = await supabase
        .from("clusters")
        .select("*")
        .eq("id", args.cluster_id)
        .single();

      if (error) throw new Error(`Cluster not found: ${args.cluster_id}`);

      return {
        content: [
          {
            type: "text",
            text: `# Cluster Intelligence: ${data.city}, ${data.country}\n\n` +
              `**Segment:** ${data.segment_type}\n` +
              `**Age band:** ${data.age_band}\n` +
              `**Estimated size:** ${data.estimated_size.toLocaleString()}\n` +
              `**Currency:** ${data.currency} · AOV: ${data.avg_order_value_min}-${data.avg_order_value_max}\n` +
              `**Engagement rate:** ${(data.typical_engagement_rate * 100).toFixed(1)}% (±${(data.engagement_std_dev * 100).toFixed(1)}%)\n\n` +
              `## Primary Occasions\n${data.primary_occasions.map((o) => `- ${o}`).join("\n")}\n\n` +
              `## Channel Preferences\n${Object.entries(data.channel_preferences)
                .sort(([, a], [, b]) => b - a)
                .map(([k, v]) => `- ${k}: ${(v * 100).toFixed(0)}%`)
                .join("\n")}\n\n` +
              `## Peak Shopping Windows\n${data.peak_shopping_windows
                .map((w) => `- ${w.day} ${w.hours}`)
                .join("\n")}\n\n` +
              `## Language Mix\n${data.language_mix}\n\n` +
              `## Aesthetic Preference\n${data.aesthetic_preference}\n\n` +
              `## Gift-Giving Pattern\n${data.gift_giving_pattern}\n\n` +
              `## Cultural Notes\n${data.cultural_notes}\n\n` +
              `*Confidence: ${(data.confidence_score * 100).toFixed(0)}% · Source: ${data.data_sources.join(", ")}*`,
          },
        ],
      };
    }

    if (name === "match_clusters_to_product") {
      const { data: clusters, error } = await supabase
        .from("clusters")
        .select("*");

      if (error) throw new Error(error.message);

      // Simple heuristic Graph RAG matching
      const productLower = args.product_description.toLowerCase();
      const scored = clusters.map((c) => {
        let score = 50; // baseline

        // Occasion match
        if (c.primary_occasions.some((o) => productLower.includes(o.toLowerCase()))) {
          score += 20;
        }

        // Eid keyword universally relevant
        if (productLower.includes("eid") && c.primary_occasions.some((o) => o.toLowerCase().includes("eid"))) {
          score += 15;
        }

        // Premium / luxury keywords → higher AOV clusters
        if (
          (productLower.includes("premium") || productLower.includes("luxury") || productLower.includes("hand-stitched")) &&
          c.avg_order_value_max > 200
        ) {
          score += 15;
        }

        // Aesthetic alignment
        if (productLower.includes("traditional") && c.aesthetic_preference?.toLowerCase().includes("traditional")) {
          score += 10;
        }
        if (productLower.includes("modern") && c.aesthetic_preference?.toLowerCase().includes("modern")) {
          score += 10;
        }

        // Gift-giving relevance
        if (
          (productLower.includes("gift") || productLower.includes("ঈদের")) &&
          c.gift_giving_pattern?.toLowerCase().includes("high")
        ) {
          score += 10;
        }

        return { ...c, _matchScore: Math.min(100, score) };
      });

      const topN = args.top_n || 3;
      const top = scored.sort((a, b) => b._matchScore - a._matchScore).slice(0, topN);

      return {
        content: [
          {
            type: "text",
            text: `# Top ${topN} Cluster Matches for: "${args.product_description}"\n\n` +
              top
                .map(
                  (c, i) =>
                    `## ${i + 1}. ${c.city}, ${c.country} — ${c._matchScore}/100\n` +
                    `${c.segment_type} · ${c.age_band} · ${c.estimated_size.toLocaleString()} people\n` +
                    `Currency: ${c.currency} · AOV: ${c.avg_order_value_min}-${c.avg_order_value_max}\n` +
                    `Occasions: ${c.primary_occasions.slice(0, 3).join(", ")}\n` +
                    `Aesthetic: ${c.aesthetic_preference}\n`
                )
                .join("\n"),
          },
        ],
      };
    }

    if (name === "recommend_campaign_strategy") {
      const { data, error } = await supabase
        .from("clusters")
        .select("*")
        .eq("id", args.cluster_id)
        .single();

      if (error) throw new Error(`Cluster not found`);

      const topChannel = Object.entries(data.channel_preferences).sort(
        ([, a], [, b]) => b - a
      )[0];
      const peakWindow = data.peak_shopping_windows[0];

      return {
        content: [
          {
            type: "text",
            text: `# Campaign Strategy: ${data.city}, ${data.country}\n\n` +
              `## Primary Channel\n**${topChannel[0]}** (${(topChannel[1] * 100).toFixed(0)}% engagement weight)\n\n` +
              `## Optimal Posting Time\n${peakWindow.day}, ${peakWindow.hours}\n\n` +
              `## Lead Occasion\nLean into **${data.primary_occasions[0]}** as the campaign hook.\n\n` +
              `## Language Strategy\n${data.language_mix}\n\n` +
              `## Predicted Engagement\n${(data.typical_engagement_rate * 100).toFixed(1)}% (typical, ±${(data.engagement_std_dev * 100).toFixed(1)}%)\n\n` +
              `## Cultural Cue\n${data.cultural_notes.split(".")[0]}.\n\n` +
              `## Currency Display\nUse **${data.currency}** in product pricing. Consider AOV target: ${data.currency} ${data.avg_order_value_min}-${data.avg_order_value_max}\n\n` +
              `## Gift Framing\n${data.gift_giving_pattern}`,
          },
        ],
      };
    }

    throw new Error(`Unknown tool: ${name}`);
  } catch (err) {
    return {
      content: [
        {
          type: "text",
          text: `Error: ${err.message}`,
        },
      ],
      isError: true,
    };
  }
});

// =============================================================================
// START SERVER
// =============================================================================
const transport = new StdioServerTransport();
await server.connect(transport);
console.error("Deshly DiasporaGraph MCP server running on stdio");