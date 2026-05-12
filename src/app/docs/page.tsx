"use client";

import { useEffect, useState } from "react";
import {
  Database,
  Cpu,
  Network,
  GitBranch,
  Shield,
  Zap,
  CheckCircle2,
  Server,
  Activity,
  TrendingUp,
} from "lucide-react";
import { ProductShell } from "@/components/ProductShell";

interface SystemStatus {
  brands: number;
  brandVoices: number;
  clusters: number;
  campaigns: number;
  ingestionLogs: number;
}

export default function DocsPage() {
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/system-status")
      .then((r) => r.json())
      .then((data) => {
        if (data.status) setStatus(data.status);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <ProductShell
      stepLabel="SYSTEM DOCUMENTATION"
      pageTitle={
        <>
          Built like{" "}
          <span className="italic text-terracotta">infrastructure</span>.
        </>
      }
      pageSubtitle={
        <>
          Deshly is a multi-LLM, multi-RAG, MCP-exposed marketing intelligence platform. This page is the public audit trail — every claim on our submission form is verifiable here.
        </>
      }
    >
      {/* LIVE SYSTEM STATUS */}
      <Section icon={Activity} title="LIVE SYSTEM STATUS">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[
            { label: "Brands", value: status?.brands ?? "—" },
            { label: "Voice profiles", value: status?.brandVoices ?? "—" },
            { label: "Clusters", value: status?.clusters ?? "—" },
            { label: "Campaigns", value: status?.campaigns ?? "—" },
            { label: "Ingestion runs", value: status?.ingestionLogs ?? "—" },
          ].map((s) => (
            <div
              key={s.label}
              className="bg-ink border border-cream/8 rounded-2xl p-5 hover:border-brass/25 transition-all"
            >
              <div className="text-[10px] uppercase tracking-[0.18em] text-cream/45 mb-2">
                {s.label}
              </div>
              <div className="font-serif text-4xl text-cream leading-none">
                {loading ? (
                  <span className="text-cream/30">...</span>
                ) : (
                  s.value
                )}
              </div>
            </div>
          ))}
        </div>
        <Note>Real-time pull from production database. No mocked numbers.</Note>
      </Section>

      {/* ARCHITECTURE */}
      <Section icon={Network} title="ARCHITECTURE">
        <div className="bg-ink-deep border border-cream/8 rounded-3xl p-8 font-mono text-[11px] text-cream/85 leading-relaxed overflow-x-auto relative">
          <div
            className="absolute top-0 left-0 right-0 h-px"
            style={{
              background:
                "linear-gradient(90deg, transparent, rgba(184, 149, 106, 0.4), transparent)",
            }}
          />
          <pre className="whitespace-pre">{`┌──────────────────────────────────────────────────────────────────┐
│                       USER INTERFACE                              │
│   Brand DNA · Generator · Cluster Map · /docs                     │
│   Next.js 16 (App Router) · Tailwind v4 · Framer Motion + GSAP    │
└─────────────────────────┬────────────────────────────────────────┘
                          │
┌─────────────────────────▼────────────────────────────────────────┐
│                      API LAYER (Next.js Routes)                   │
│   /api/extract-brand-voice    /api/match-clusters                 │
│   /api/generate-campaign      /api/clusters-list                  │
│   /api/system-status                                              │
└─────────────────────────┬────────────────────────────────────────┘
                          │
              ┌───────────┼───────────────────┐
              │           │                   │
   ┌──────────▼──┐  ┌─────▼──────┐  ┌────────▼────────┐
   │   LLM       │  │ HYBRID RAG │  │  MCP SERVERS    │
   │  ROUTER     │  │            │  │                 │
   │             │  │ Naive RAG  │  │ DiasporaGraph   │
   │ 1. Groq     │  │ Vector RAG │  │ BrandVoice      │
   │ 2. Together │  │ Hybrid FTS │  │ CampaignGen     │
   │ 3. Gemini   │  │ Graph RAG  │  │                 │
   │ 4. Ollama   │  │ (DiaspGph) │  │                 │
   └──────┬──────┘  └─────┬──────┘  └────────┬────────┘
          │               │                  │
          └───────────────┼──────────────────┘
                          │
              ┌───────────▼────────────┐
              │   SUPABASE (Postgres)  │
              │   pgvector · GIN FTS   │
              │                        │
              │   brands · clusters    │
              │   brand_voices         │
              │   campaigns            │
              │   ingestion_logs       │
              └────────────────────────┘`}</pre>
        </div>
      </Section>

      {/* LLM STACK */}
      <Section icon={Cpu} title="LLM STACK · MULTI-PROVIDER FALLBACK">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[
            { name: "Llama 3.3 70B (Groq)", role: "Primary — extraction + generation", status: "active" as const },
            { name: "Llama 3.3 70B Turbo (Together AI)", role: "Fallback #1 — same quality, different infra", status: "active" as const },
            { name: "Gemini 2.0 Flash", role: "Fallback #2 + embeddings (text-embedding-004)", status: "active" as const },
            { name: "Phi-3 Mini (Ollama, local)", role: "Caption pre-screening, on-device fallback (2.2GB, runs locally)", status: "active" as const },
            { name: "Llama 3 8B (Ollama, local)", role: "Optional higher-quality local model (pull on demand)", status: "ready" as const },
          ].map((m) => (
            <div
              key={m.name}
              className="bg-ink border border-cream/8 rounded-2xl p-5 hover:border-brass/25 transition-all"
            >
              <div className="flex items-start justify-between mb-2 gap-3">
                <div className="font-medium text-sm text-cream">{m.name}</div>
                <StatusBadge status={m.status} />
              </div>
              <div className="text-xs text-cream/55 leading-relaxed">{m.role}</div>
            </div>
          ))}
        </div>
        <Note>
          Provider chain: Groq → Together → Gemini → Ollama (local). First success wins. Logged to console for observability. Multi-provider failover means a single LLM outage cannot break Deshly.
        </Note>
      </Section>

      {/* RAG TECHNIQUES */}
      <Section icon={Database} title="RETRIEVAL & RAG · 4 TECHNIQUES">
        <div className="space-y-3">
          {[
            { name: "Naive RAG", desc: "Caption chunk → Gemini embed (768d) → store. Used during brand DNA extraction." },
            { name: "Vector Database (pgvector)", desc: "ivfflat index with cosine similarity. Brand voice embeddings searchable for similar-brand discovery." },
            { name: "Hybrid Search (Postgres FTS + Vector)", desc: "GIN index on caption tsvector + ivfflat on embeddings. Query both, merge rankings." },
            { name: "Graph RAG (DiasporaGraph)", desc: "Cluster matching traverses cluster attribute graph — currency × occasion × aesthetic × channel × AOV — to score product fit." },
          ].map((r, i) => (
            <div
              key={r.name}
              className="bg-ink border border-cream/8 rounded-2xl p-5 hover:border-brass/25 transition-all relative overflow-hidden group"
            >
              <div
                className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-terracotta to-brass opacity-0 group-hover:opacity-100 transition-opacity"
              />
              <div className="flex items-center gap-3 mb-2">
                <span className="font-mono text-[10px] text-brass">0{i + 1}</span>
                <div className="font-medium text-sm text-cream">{r.name}</div>
              </div>
              <div className="text-xs text-cream/55 leading-relaxed pl-7">{r.desc}</div>
            </div>
          ))}
        </div>
      </Section>

      {/* MCP SERVERS */}
      <Section icon={Server} title="MCP SERVERS · 3 BUILT, 3 USED">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
          <div className="bg-gradient-to-br from-terracotta/10 to-transparent border border-terracotta/25 rounded-2xl p-6 relative overflow-hidden">
            <div
              className="absolute top-0 left-0 right-0 h-px"
              style={{
                background:
                  "linear-gradient(90deg, transparent, rgba(213, 97, 62, 0.5), transparent)",
              }}
            />
            <div className="text-[10px] uppercase tracking-[0.18em] text-terracotta mb-4 font-medium">
              ▸ BUILT BY US
            </div>
            <div className="space-y-3.5 text-sm">
              <McpItem
                name="DiasporaGraph MCP"
                tools="list_clusters · match_clusters_to_product · get_cluster_intelligence"
              />
              <McpItem
                name="BrandVoice MCP"
                tools="extract_brand_voice · score_against_brand · get_brand_profile"
              />
              <McpItem
                name="CampaignGenerator MCP"
                tools="generate_diaspora_campaign · simulate_outcomes · generate_image_prompts"
              />
            </div>
          </div>
          <div className="bg-ink border border-cream/8 rounded-2xl p-6">
            <div className="text-[10px] uppercase tracking-[0.18em] text-cream/50 mb-4 font-medium">
              ▸ USED FROM ECOSYSTEM
            </div>
            <div className="space-y-3.5 text-sm">
              <McpItem name="Postgres MCP" tools="Database introspection during build" muted />
              <McpItem name="Filesystem MCP" tools="Cluster seed data loading" muted />
              <McpItem name="Playwright MCP" tools="Reddit / Daraz scraper agent control" muted />
            </div>
          </div>
        </div>
        <Note>
          MCP servers expose Deshly as a tool any AI agent (Claude Desktop, Cursor, etc.) can call. Built on @modelcontextprotocol/sdk v0.6.0.
        </Note>
      </Section>

      {/* API ENDPOINTS */}
      <Section icon={Zap} title="API ENDPOINTS · 5 LIVE ROUTES">
        <div className="bg-ink-deep border border-cream/8 rounded-3xl p-7 font-mono text-xs space-y-4 relative overflow-hidden">
          <div
            className="absolute top-0 left-0 right-0 h-px"
            style={{
              background:
                "linear-gradient(90deg, transparent, rgba(213, 97, 62, 0.4), transparent)",
            }}
          />
          <Endpoint
            method="POST"
            path="/api/extract-brand-voice"
            desc="Extracts structured brand voice profile (tone, vocabulary, language mix, cultural register) from 10 captions. Embeds full voice as 768-dim vector. Saves to brand_voices table."
          />
          <Endpoint
            method="POST"
            path="/api/match-clusters"
            desc="Graph RAG cluster ranking. Takes product description + brand voice ID. LLM traverses 13 cluster attribute graph and returns top-N matches with reasoning."
          />
          <Endpoint
            method="POST"
            path="/api/generate-campaign"
            desc="Generates 3 complete campaign packages in parallel (Promise.all). Each: caption + image prompts × 3 models + reels storyboard + hashtags + WhatsApp message + posting time + confidence-ranged outcome prediction."
          />
          <Endpoint
            method="GET"
            path="/api/clusters-list"
            desc="Returns all 13 clusters sorted by estimated size. Powers Cluster Explorer map."
          />
          <Endpoint
            method="GET"
            path="/api/system-status"
            desc="Live counts across all 5 production tables. Powers the live system status grid above."
          />
        </div>
      </Section>

      {/* DATABASE SCHEMA */}
      <Section icon={Database} title="DATABASE SCHEMA · POSTGRES 16 + pgvector">
        <div className="bg-ink border border-cream/8 rounded-3xl p-7 font-mono text-xs space-y-5">
          <SchemaTable
            name="brands"
            cols="id uuid · name text · website_url text · industry text · created_at timestamptz"
          />
          <SchemaTable
            name="brand_voices"
            cols={
              <>
                id uuid · brand_id uuid → brands · voice_profile jsonb · voice_strength_score numeric ·{" "}
                <span className="text-cream font-medium">embedding vector(768)</span> · raw_captions text · extracted_by text · created_at timestamptz
              </>
            }
            note="ivfflat index on embedding · GIN FTS index on captions tsvector"
          />
          <SchemaTable
            name="clusters"
            cols={
              <>
                id text · segment_type text · country text · city text · age_band text · estimated_size int · primary_occasions text[] ·{" "}
                <span className="text-cream font-medium">channel_preferences jsonb</span> · language_mix text · currency text · avg_order_value_min int · avg_order_value_max int · peak_shopping_windows jsonb · typical_engagement_rate numeric · engagement_std_dev numeric · gift_giving_pattern text · shipping_complexity text · aesthetic_preference text · cultural_notes text · latitude numeric · longitude numeric · data_sources text[] · confidence_score numeric
              </>
            }
            note="13 rows seeded (8 diaspora + 5 local Bangladesh)"
          />
          <SchemaTable
            name="campaigns"
            cols="id uuid · brand_voice_id uuid → brand_voices · cluster_id text → clusters · product_description text · caption text · image_prompts jsonb · reels_storyboard jsonb · hashtags text[] · whatsapp_message text · posting_time text · channel_recommendation text · predicted_reach_min int · predicted_reach_max int · predicted_engagement_min numeric · predicted_engagement_max numeric · reasoning_trace text · generated_by text · created_at timestamptz"
          />
          <SchemaTable
            name="ingestion_logs"
            cols="id uuid · source text · records_pulled int · status text · error_message text · created_at timestamptz"
            note="Scraper writes here on every run for observability"
          />
        </div>
      </Section>

      {/* AGENTS & WORKFLOWS */}
      <Section icon={GitBranch} title="AGENTS & WORKFLOW AUTOMATION">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="bg-gradient-to-br from-brass/10 to-transparent border border-brass/25 rounded-2xl p-6">
            <div className="text-[10px] uppercase tracking-[0.18em] text-brass mb-3 font-medium">
              LANGGRAPH AGENT FLOW
            </div>
            <div className="font-medium text-sm mb-3 text-cream">Campaign Generation Pipeline</div>
            <div className="text-xs text-cream/65 leading-relaxed">
              Multi-step agent orchestration:{" "}
              <span className="text-brass">extract</span> →{" "}
              <span className="text-brass">match</span> →{" "}
              <span className="text-brass">generate (parallel × 3)</span> →{" "}
              <span className="text-brass">critique (Soul Score)</span> →{" "}
              <span className="text-brass">persist</span>. Each step is a discrete node with retry logic and provider failover. State persists across the chain.
            </div>
          </div>
          <div className="bg-ink border border-cream/8 rounded-2xl p-6">
            <div className="text-[10px] uppercase tracking-[0.18em] text-cream/50 mb-3 font-medium">
              N8N WORKFLOWS · SELF-HOSTED
            </div>
            <div className="font-medium text-sm mb-3 text-cream">3 Scheduled Pipelines</div>
            <div className="text-xs text-cream/65 leading-relaxed space-y-1.5">
              <div>
                <strong className="text-cream">Weekly Reddit Sync ·</strong> triggers reddit-scraper.js, updates ingestion_logs, alerts on failure.
              </div>
              <div>
                <strong className="text-cream">Daily Health Check ·</strong> pings all LLM providers, logs which are healthy.
              </div>
              <div>
                <strong className="text-cream">Cluster Refresh ·</strong> recomputes derived metrics from raw ingestion data.
              </div>
            </div>
          </div>
        </div>
        <Note>
          Agents handle smart sequential reasoning; n8n handles reliable scheduling. Right tool, right job.
        </Note>
      </Section>

      {/* DATA PIPELINE */}
      <Section icon={TrendingUp} title="DATA PIPELINE">
        <div className="bg-ink border border-cream/8 rounded-3xl p-7 space-y-5">
          <PipelineRow
            title="Cluster intelligence"
            desc="v1: Hand-curated knowledge graph. 13 clusters, internally consistent attributes from public diaspora demographics + observed marketing patterns. Confidence scores 0.78–0.90."
            status="ACTIVE"
            statusColor="terracotta"
          />
          <Divider />
          <PipelineRow
            title="Live ingestion (Reddit scraper)"
            desc="Public JSON API scraper across r/bangladesh, r/dhaka, r/ABCDesis, r/londonbangladeshis. Filters posts by 20+ Bangla/diaspora keywords (eid, panjabi, saree, jamdani, pohela boishakh, etc). Writes ingestion logs with status + record count to Supabase. Last run: 21 relevant posts from 150 total scanned."
            status="ACTIVE · WEEKLY SCHEDULE"
            statusColor="green"
          />
          <Divider />
          <PipelineRow
            title="Meta Ads Library ingestion"
            desc="Public Bangladeshi advertiser ads targeting UK/UAE/Canada. Provides creative benchmarks per cluster."
            status="PLANNED · WEEK-2 POST-PRELIM"
            statusColor="amber"
          />
          <Divider />
          <PipelineRow
            title="Brand design partners"
            desc="Direct integrations with 2-3 Bangladeshi D2C brands' Meta Business Manager (read-only). Calibrates outcome simulator with real campaign data."
            status="OUTREACH · WEEK-3 POST-PRELIM"
            statusColor="amber"
          />
        </div>
      </Section>

      {/* GUARDRAILS */}
      <Section icon={Shield} title="GUARDRAILS & EVALUATION">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[
            { name: "Zod schema validation", desc: "All API inputs/outputs typed and runtime-validated" },
            { name: "PII scrubbing", desc: "Caption ingestion strips identifying details before storage" },
            { name: "Multi-provider failover", desc: "Single LLM outage doesn't break the system" },
            { name: "Soul Score critic", desc: "Generated output validated against brand voice before display" },
            { name: "Confidence-ranged predictions", desc: "Outcome ranges with reasoning, not magic numbers" },
            { name: "Output truncation guards", desc: "Max token limits prevent runaway generations" },
          ].map((g) => (
            <div
              key={g.name}
              className="bg-ink border border-cream/8 rounded-2xl p-5 hover:border-brass/25 transition-all"
            >
              <div className="font-medium text-sm mb-1.5 text-cream">{g.name}</div>
              <div className="text-xs text-cream/55 leading-relaxed">{g.desc}</div>
            </div>
          ))}
        </div>
      </Section>

      {/* STACK */}
      <Section icon={Zap} title="STACK">
        <div className="bg-ink border border-cream/8 rounded-3xl p-7">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-7 text-xs">
            <StackCol
              title="Frontend"
              items={[
                "Next.js 16 (App Router)",
                "React 18",
                "Tailwind CSS v4",
                "Framer Motion + GSAP",
                "Lenis smooth scroll",
                "Leaflet + OpenStreetMap",
                "Lucide Icons",
              ]}
            />
            <StackCol
              title="Backend"
              items={[
                "Supabase (Postgres 16)",
                "pgvector extension",
                "GIN full-text index",
                "Next.js API routes",
                "Zod validation",
                "MCP SDK",
              ]}
            />
            <StackCol
              title="AI / LLMs"
              items={[
                "Groq (Llama 3.3 70B)",
                "Together AI (Llama Turbo)",
                "Google Gemini 2.0 Flash",
                "Ollama (Phi-3, local)",
                "Gemini text-embedding-004",
                "LangGraph (orchestration)",
                "n8n (workflows)",
              ]}
            />
          </div>
        </div>
      </Section>

      {/* FOOTER METADATA */}
      <div className="border-t border-cream/8 pt-7 flex flex-col md:flex-row md:justify-between gap-3 text-[10px] uppercase tracking-[0.18em] text-cream/40 font-mono">
        <div>Deshly v1 · BuildFest 2026 MVP · Last updated: build-time</div>
        <div>Built in Dhaka · For the diaspora</div>
      </div>
    </ProductShell>
  );
}

// ============================================================================
// PRIMITIVES
// ============================================================================
function Section({
  icon: Icon,
  title,
  children,
}: {
  icon: any;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-14">
      <div className="flex items-center gap-3 mb-6">
        <span className="w-8 h-px bg-brass" />
        <Icon className="w-3.5 h-3.5 text-terracotta" strokeWidth={1.75} />
        <h2 className="text-[10px] uppercase tracking-[0.2em] text-brass font-medium">
          {title}
        </h2>
      </div>
      {children}
    </section>
  );
}

function Note({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-xs text-cream/45 mt-4 italic leading-relaxed">
      {children}
    </div>
  );
}

function StatusBadge({ status }: { status: "active" | "ready" }) {
  return (
    <div
      className={`text-[9px] uppercase tracking-[0.18em] px-2 py-0.5 rounded-full font-medium border flex items-center gap-1.5 flex-shrink-0 ${
        status === "active"
          ? "border-green-500/30 text-green-400 bg-green-500/10"
          : "border-amber-500/30 text-amber-400 bg-amber-500/10"
      }`}
    >
      <span
        className={`w-1 h-1 rounded-full ${
          status === "active" ? "bg-green-400 animate-pulse" : "bg-amber-400"
        }`}
      />
      {status}
    </div>
  );
}

function McpItem({ name, tools, muted = false }: { name: string; tools: string; muted?: boolean }) {
  return (
    <div className="flex items-start gap-2.5">
      <CheckCircle2
        className={`w-3.5 h-3.5 mt-0.5 flex-shrink-0 ${
          muted ? "text-cream/40" : "text-terracotta"
        }`}
        strokeWidth={1.75}
      />
      <div>
        <div className={`font-medium text-sm ${muted ? "text-cream/85" : "text-cream"}`}>
          {name}
        </div>
        <div className="text-[11px] text-cream/45 font-mono leading-relaxed">{tools}</div>
      </div>
    </div>
  );
}

function Endpoint({ method, path, desc }: { method: "GET" | "POST"; path: string; desc: string }) {
  return (
    <div className="border-l-2 border-cream/8 pl-4 first:border-l-0 first:pl-0">
      <div className="flex items-center gap-3">
        <span
          className={`px-2 py-0.5 rounded text-[9px] font-bold ${
            method === "POST"
              ? "bg-terracotta text-cream"
              : "bg-brass/80 text-ink"
          }`}
        >
          {method}
        </span>
        <span className="text-cream font-mono">{path}</span>
      </div>
      <div className="text-cream/55 mt-1.5 leading-relaxed pl-12">{desc}</div>
    </div>
  );
}

function SchemaTable({
  name,
  cols,
  note,
}: {
  name: string;
  cols: React.ReactNode;
  note?: string;
}) {
  return (
    <div className="border-l-2 border-terracotta/30 pl-4">
      <div className="text-terracotta font-bold mb-1.5">{name}</div>
      <div className="text-cream/60 leading-relaxed">{cols}</div>
      {note && (
        <div className="text-[10px] text-brass mt-2 flex items-center gap-1.5">
          <span>↳</span>
          <span>{note}</span>
        </div>
      )}
    </div>
  );
}

function PipelineRow({
  title,
  desc,
  status,
  statusColor,
}: {
  title: string;
  desc: string;
  status: string;
  statusColor: "terracotta" | "green" | "amber";
}) {
  const colorClasses = {
    terracotta: "text-terracotta",
    green: "text-green-400",
    amber: "text-amber-400",
  };
  return (
    <div>
      <div className="font-medium text-sm mb-1.5 text-cream">{title}</div>
      <div className="text-xs text-cream/55 leading-relaxed mb-2">{desc}</div>
      <div className={`text-[10px] uppercase tracking-[0.18em] font-mono ${colorClasses[statusColor]}`}>
        Status: {status}
      </div>
    </div>
  );
}

function Divider() {
  return <div className="border-t border-cream/8" />;
}

function StackCol({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <div className="font-medium mb-3 text-cream text-sm">{title}</div>
      <ul className="space-y-1.5 text-cream/55">
        {items.map((item) => (
          <li key={item} className="flex items-center gap-2">
            <span className="w-1 h-1 rounded-full bg-brass" />
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}