"use client";

import Link from "next/link";
import Image from "next/image";
import {
  ArrowDown,
  Sparkles,
  Wand2,
  Globe,
  FileText,
} from "lucide-react";
import { MagneticButton } from "@/components/MagneticButton";
import { NumberCounter } from "@/components/NumberCounter";
import { GradientOrbs } from "@/components/GradientOrbs";
import {
  useLenis,
  useGsap,
  useRevealUp,
  useParallax,
  useTextReveal,
} from "@/lib/hooks";

export default function Home() {
  useLenis();
  useGsap();

  const heroRef = useTextReveal(0.2);
  const heroSubRef = useRevealUp(false, 1.2);
  const heroCtaRef = useRevealUp(false, 1.5);
  const banglaParallax = useParallax(0.5);

  const problemSectionRef = useRevealUp(true);

  const marqueeRef = useRevealUp();
  const statsRef = useRevealUp(true);
  const banglaRef = useRevealUp(false, 0.2);
  const featuresHeaderRef = useRevealUp();
  const featuresGridRef = useRevealUp(true);
  const stackRef = useRevealUp(true);
  const ctaRef = useRevealUp();

  return (
    <main className="grain bg-void text-cream relative overflow-x-hidden">
      {/* NAV */}
      <nav className="fixed top-0 left-0 right-0 z-50 px-6 md:px-10 py-5 backdrop-blur-xl bg-void/30 border-b border-cream/5">
        <div className="max-w-[1400px] mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group">
            <span className="font-serif italic text-2xl tracking-tight">
              Deshly<span className="text-terracotta">.</span>
            </span>
          </Link>

          <div className="hidden md:flex items-center gap-8 text-sm">
            <Link href="/brand-dna" className="text-cream/60 hover:text-cream transition-colors">Brand DNA</Link>
            <Link href="/generator" className="text-cream/60 hover:text-cream transition-colors">Generator</Link>
            <Link href="/clusters" className="text-cream/60 hover:text-cream transition-colors">Clusters</Link>
            <Link href="/docs" className="text-cream/60 hover:text-cream transition-colors">Docs</Link>
          </div>

          <MagneticButton href="/brand-dna" size="sm">Get Started</MagneticButton>
        </div>
      </nav>

      {/* HERO */}
      <section className="relative min-h-[100vh] flex items-center justify-center px-6 md:px-10 pt-32 pb-20">
        <GradientOrbs intensity="medium" />

        <div className="relative max-w-[1400px] mx-auto w-full">
          <div className="flex items-center gap-3 mb-8 text-[10px] uppercase tracking-[0.25em] text-brass">
            <span className="w-8 h-px bg-brass" />
            <span>The Audience Intelligence Platform · v1</span>
          </div>

          {/* H1 - Changed mb-6 to mb-0 */}
<h1 ref={heroRef} className="font-serif text-[clamp(3rem,9vw,9rem)] leading-[0.95] tracking-[-0.02em] mb-0">
  <div className="overflow-hidden">
    <span data-word className="inline-block mr-4">Your</span>
    <span data-word className="inline-block mr-4">all-in-one</span>
  </div>
  <div className="overflow-hidden">
    <span data-word className="inline-block mr-4 italic text-terracotta">brand</span>
    <span data-word className="inline-block">intelligence.</span>
  </div>
</h1>

{/* Content Grid - Changed mt-1 to mt-4 and items-end to items-start */}
<div className="grid grid-cols-12 gap-6 mt-4 items-start">
  <div ref={heroSubRef} className="col-span-12 md:col-span-7">
    <p className="text-lg md:text-xl text-cream/65 leading-relaxed max-w-2xl">
      Built in Dhaka. Speaks every diaspora. Deshly turns your brand voice into culturally-fluent campaigns for 8 countries — automatically.
    </p>

    <div ref={heroCtaRef} className="mt-10 flex flex-wrap gap-4 items-center">
      <MagneticButton href="/brand-dna" size="lg" variant="primary">Capture Your Brand DNA</MagneticButton>
      <MagneticButton href="/docs" size="lg" variant="ghost" showArrow={false}>Read the Docs</MagneticButton>
    </div>
  </div>

  {/* This empty div was also taking up space in the grid */}
  <div className="hidden md:block col-span-12 md:col-span-5 relative h-0"></div>
</div>

          <div className="absolute bottom-0 left-1/2 -translate-x-0 flex flex-col items-center gap-2 text-cream/30 text-[16px] uppercase tracking-[0.2em]">
            <span>Scroll</span>
            <ArrowDown className="w-4 h-4 animate-bounce" />
          </div>
        </div>
      </section>

      {/* MARQUEE */}
      <section ref={marqueeRef} className="py-12 border-y border-cream/5 bg-ink-deep overflow-hidden">
        <div className="flex whitespace-nowrap marquee-track">
          {[...Array(2)].map((_, idx) => (
            <div key={idx} className="flex items-center gap-12 px-6">
              {[
                { city: "London", currency: "GBP" },
                { city: "Toronto", currency: "CAD" },
                { city: "New York", currency: "USD" },
                { city: "Dubai", currency: "AED" },
                { city: "Sydney", currency: "AUD" },
                { city: "Kuala Lumpur", currency: "MYR" },
                { city: "Doha", currency: "QAR" },
                { city: "Riyadh", currency: "SAR" },
                { city: "Dhaka", currency: "BDT" },
              ].map((item, i) => (
                <div key={`${idx}-${i}`} className="flex items-center gap-12">
                  <div className="flex items-baseline gap-3">
                    <span className="font-serif italic text-3xl md:text-5xl text-cream/85">{item.city}</span>
                    <span className="font-mono text-xs text-brass">{item.currency}</span>
                  </div>
                  <span className="text-brass/40 text-2xl">✦</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </section>

      {/* STATS */}
      <section className="py-32 px-6 md:px-10 relative">
        <GradientOrbs intensity="subtle" />
        <div ref={statsRef} className="relative max-w-[1400px] mx-auto">
          <div className="flex items-center gap-3 mb-12 text-[10px] uppercase tracking-[0.25em] text-brass" data-reveal-child>
            <span className="w-8 h-px bg-brass" />
            <span>The Numbers</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-10 md:gap-6">
            {[
              { value: 13, suffix: "", label: "Consumer clusters mapped" },
              { value: 8, suffix: "", label: "Countries with active intelligence" },
              { value: 90, suffix: "k+", label: "Diaspora reach indexed" },
              { value: 4, suffix: "", label: "LLM providers in failover chain" },
            ].map((stat, i) => (
              <div key={i} data-reveal-child className="border-l border-cream/10 pl-6 md:pl-8">
                <div className="font-serif text-[clamp(3rem,6vw,5.5rem)] leading-none tracking-tight text-cream mb-3">
                  <NumberCounter value={stat.value} suffix={stat.suffix} />
                </div>
                <div className="text-xs md:text-sm text-cream/55 leading-relaxed">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PROBLEM — vertical reveal stack */}
      <section ref={problemSectionRef} className="relative py-32 md:py-48 px-6 md:px-10 overflow-hidden">
        <GradientOrbs intensity="subtle" />

        <div className="relative max-w-[1400px] mx-auto">
          <div data-reveal-child className="flex items-center gap-3 mb-20 text-[10px] uppercase tracking-[0.25em] text-brass">
            <span className="w-8 h-px bg-brass" />
            <span>The Problem</span>
          </div>

          <div className="space-y-10 md:space-y-16">
            <h2 data-reveal-child className="font-serif text-[clamp(2.5rem,8vw,8rem)] leading-[0.95] tracking-tight text-cream">
              One <span className="italic">brand.</span>
            </h2>

            <h2 data-reveal-child className="font-serif text-[clamp(2.5rem,8vw,8rem)] leading-[0.95] tracking-tight text-cream/40 pl-0 md:pl-12">
              Eight cities. <span className="italic text-brass">Eight cultures.</span>
            </h2>

            <h2 data-reveal-child className="font-serif text-[clamp(2.5rem,8vw,8rem)] leading-[0.95] tracking-tight text-cream/40 pl-0 md:pl-24">
              One voice that fits <span className="italic text-terracotta">all of them.</span>
            </h2>

            <div data-reveal-child className="pt-12 md:pt-20 border-t border-cream/10 pl-0 md:pl-36 max-w-3xl">
              <h3 className="font-serif text-[clamp(2rem,5vw,4rem)] leading-[1] tracking-tight text-cream mb-6">
                Manually <span className="italic text-terracotta">impossible.</span>
              </h3>
              <p className="text-lg md:text-xl text-cream/55 leading-relaxed">
                Bangladeshi D2C brands serve a global diaspora — but write campaigns for one. Deshly closes that gap with a multi-LLM, culture-aware engine.
              </p>
            </div>
          </div>
        </div>
      </section>

{/* BANGLA CALLIGRAPHY MOMENT */}
<section className="relative py-24 md:py-32 overflow-hidden border-y border-cream/5">
  <GradientOrbs intensity="intense" />

  <div ref={banglaParallax} className="relative">
    <div ref={banglaRef} className="text-center px-6 flex flex-col items-center">
      <div className="text-[10px] uppercase tracking-[0.25em] text-brass mb-4">✦ The Name ✦</div>
      
      <div className="relative">
        <Image
          src="/assets/deshly-bangla.png"
          alt="বেশলি — Deshly"
          width={1800} // Reduced from 1200
          height={500} // Reduced from 800
          priority
          /* Updated clamp values: Min 250px, Preferred 50vw, Max 700px */
          className="w-[clamp(250px,50vw,700px)] h-auto select-none drop-shadow-[0_0_60px_rgba(213,97,62,0.15)]"
        />
      </div>

      {/* Adjusting the margin-top of the text below since the image is smaller */}
      <div className="-mt-8 md:-mt-0 max-w-xl mx-auto relative z-10">
        <p className="text-cream/55 text-base md:text-lg leading-snug tracking-tight">
          <span className="italic font-serif text-brass">Deshly</span> — from <span className="italic">desh</span>, the Bangla word for homeland. A platform for brands whose roots are here, whose customers are everywhere.
        </p>
      </div>
    </div>
  </div>
</section>

      {/* FEATURES */}
      <section className="py-32 px-6 md:px-10 relative">
        <GradientOrbs intensity="subtle" />
        <div className="relative max-w-[1400px] mx-auto">
          <div ref={featuresHeaderRef} className="mb-20 max-w-3xl">
            <div className="flex items-center gap-3 mb-6 text-[10px] uppercase tracking-[0.25em] text-brass">
              <span className="w-8 h-px bg-brass" />
              <span>The Product</span>
            </div>
            <h2 className="font-serif text-[clamp(2.5rem,6vw,5.5rem)] leading-[1] tracking-tight mb-6">
              Four <span className="italic text-terracotta">surfaces.</span>
              <br />One brain.
            </h2>
            <p className="text-lg text-cream/55 leading-relaxed max-w-xl">
              Every Deshly surface shares the same underlying intelligence — your brand voice, the cluster graph, the multi-LLM stack. Each surface is a different way to use it.
            </p>
          </div>

          <div ref={featuresGridRef} className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              { href: "/brand-dna", step: "01", title: "Brand DNA", desc: "Paste 10 captions. Deshly extracts your voice — tone, vocabulary, language mix, cultural register — as a structured profile.", icon: Sparkles, tag: "EXTRACTION" },
              { href: "/generator", step: "02", title: "Campaign Generator", desc: "One product description. Three full campaigns for three clusters — caption, image prompts, hashtags, predicted reach. Parallel generation in under 30 seconds.", icon: Wand2, tag: "GENERATION" },
              { href: "/clusters", step: "03", title: "Cluster Explorer", desc: "An interactive map of 13 Bangladeshi diaspora clusters across 8 countries. Click any node to see its occasions, channels, AOV, peak times, cultural notes.", icon: Globe, tag: "INTELLIGENCE" },
              { href: "/docs", step: "04", title: "Live Documentation", desc: "The full system audit trail — architecture, LLM stack, MCP servers, RAG techniques, database schema, real-time system status. Built in public.", icon: FileText, tag: "TRANSPARENCY" },
            ].map((feature) => (
              <Link key={feature.href} href={feature.href} data-reveal-child className="group relative bg-ink rounded-3xl p-8 md:p-10 border border-cream/8 hover:border-terracotta/40 transition-all duration-500 overflow-hidden">
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700">
                  <div className="absolute inset-0" style={{ background: "radial-gradient(circle at 50% 0%, rgba(213, 97, 62, 0.12), transparent 70%)" }} />
                </div>

                <div className="relative">
                  <div className="flex items-start justify-between mb-12">
                    <div className="flex items-center gap-4">
                      <span className="font-mono text-xs text-brass">{feature.step}</span>
                      <span className="text-[10px] uppercase tracking-[0.2em] text-cream/40">{feature.tag}</span>
                    </div>
                    <div className="w-12 h-12 rounded-full border border-cream/10 group-hover:border-terracotta/60 flex items-center justify-center transition-all duration-500 group-hover:rotate-45">
                      <feature.icon className="w-4 h-4 text-cream/60 group-hover:text-terracotta transition-colors" strokeWidth={1.5} />
                    </div>
                  </div>

                  <h3 className="font-serif text-3xl md:text-5xl tracking-tight leading-none mb-5">{feature.title}</h3>
                  <p className="text-cream/55 leading-relaxed text-sm md:text-base max-w-md">{feature.desc}</p>

                  <div className="mt-10 inline-flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-brass group-hover:text-terracotta transition-colors">
                    <span>Open Surface</span>
                    <span className="text-base">→</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* THE STACK */}
      <section className="py-32 px-6 md:px-10 relative border-t border-cream/5">
        <div ref={stackRef} className="max-w-[1400px] mx-auto">
          <div className="flex items-center gap-3 mb-12 text-[10px] uppercase tracking-[0.25em] text-brass" data-reveal-child>
            <span className="w-8 h-px bg-brass" />
            <span>The Stack</span>
          </div>

          <div data-reveal-child className="mb-16 max-w-3xl">
            <h2 className="font-serif text-[clamp(2.5rem,6vw,5rem)] leading-[1] tracking-tight mb-6">
              Built like <span className="italic text-terracotta">infrastructure.</span>
            </h2>
            <p className="text-lg text-cream/55 leading-relaxed max-w-xl">
              Multi-LLM failover. Graph RAG. MCP-exposed tools. Vector embeddings. Real ingestion pipelines. No wrappers.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { tag: "LLMs", title: "4-provider chain", body: "Groq Llama 3.3 70B → Together AI Llama Turbo → Gemini 2.0 Flash → Ollama (local). First success wins. Single outages cannot break the system." },
              { tag: "RAG", title: "4 retrieval techniques", body: "Naive RAG, vector search (pgvector ivfflat), hybrid FTS+vector, and Graph RAG over the cluster attribute graph for product-cluster matching." },
              { tag: "MCP", title: "3 servers, 9 tools", body: "DiasporaGraph, BrandVoice, CampaignGenerator — all expose Deshly as MCP-callable tools any AI agent can use. Postgres / Filesystem / Playwright MCP used internally." },
            ].map((card, i) => (
              <div key={i} data-reveal-child className="bg-ink rounded-3xl p-8 border border-cream/8">
                <div className="text-[10px] uppercase tracking-[0.2em] text-brass mb-6">{card.tag}</div>
                <h3 className="font-serif text-2xl md:text-3xl tracking-tight leading-tight mb-4">{card.title}</h3>
                <p className="text-cream/55 text-sm leading-relaxed">{card.body}</p>
              </div>
            ))}
          </div>

          <div data-reveal-child className="mt-12 text-center">
            <MagneticButton href="/docs" variant="outline" size="md">See the full audit trail</MagneticButton>
          </div>
        </div>
      </section>

      {/* BIG CTA */}
      <section className="relative py-40 md:py-56 overflow-hidden">
        <GradientOrbs intensity="intense" />

        <div ref={ctaRef} className="relative max-w-[1400px] mx-auto px-6 md:px-10 text-center">
          <div className="text-[10px] uppercase tracking-[0.25em] text-brass mb-8">
            ✦ Start with Brand DNA ✦
          </div>
          <h2 className="font-serif text-[clamp(3rem,9vw,9rem)] leading-[0.95] tracking-[-0.02em] mb-10 max-w-5xl mx-auto">
            Ready to speak <span className="italic text-terracotta">every diaspora?</span>
          </h2>
          <p className="text-lg md:text-xl text-cream/55 max-w-2xl mx-auto mb-12 leading-relaxed">
            Paste 10 captions. Get three campaigns. See what Deshly can do in 90 seconds.
          </p>
          <div className="flex flex-wrap gap-4 items-center justify-center">
            <MagneticButton href="/brand-dna" size="lg" variant="primary">Capture Your Brand DNA</MagneticButton>
            <MagneticButton href="/clusters" size="lg" variant="ghost" showArrow={false}>Explore the Map</MagneticButton>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-cream/5 py-16 px-6 md:px-10">
        <div className="max-w-[1400px] mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-12">
            <div className="md:col-span-2">
              <Link href="/" className="font-serif italic text-3xl tracking-tight">
                Deshly<span className="text-terracotta">.</span>
              </Link>
              <div className="font-bangla text-2xl text-brass/60 mt-3 italic">বেশলি</div>
              <p className="text-cream/45 text-sm max-w-md mt-6 leading-relaxed">
                Marketing intelligence for the Bangladeshi diaspora. Built in Dhaka. Speaks every culture.
              </p>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-[0.2em] text-brass mb-4">Product</div>
              <div className="space-y-2 text-sm">
                <Link href="/brand-dna" className="block text-cream/60 hover:text-cream transition-colors">Brand DNA</Link>
                <Link href="/generator" className="block text-cream/60 hover:text-cream transition-colors">Campaign Generator</Link>
                <Link href="/clusters" className="block text-cream/60 hover:text-cream transition-colors">Cluster Explorer</Link>
                <Link href="/docs" className="block text-cream/60 hover:text-cream transition-colors">Documentation</Link>
              </div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-[0.2em] text-brass mb-4">BuildFest 2026</div>
              <div className="space-y-2 text-sm text-cream/45 leading-relaxed">
                <div>Team Vengeance</div>
                <div>The Infinity AI BuildFest</div>
                <div>BRAC University · June 12</div>
                <div>Track: MarTech · Multimodal Content Engine</div>
              </div>
            </div>
          </div>

          <div className="border-t border-cream/5 pt-8 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-cream/40">
            <div>© 2026 Deshly · Built in Dhaka, for the diaspora</div>
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              <span>All systems operational</span>
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}