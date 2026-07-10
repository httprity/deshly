"use client";

import { useEffect } from "react";

const CSS = `
:root{
  --void:#f6f3ee; --void-2:#fbf9f5; --panel:#fbf9f5; --panel-line:rgba(15,15,15,.12);
  --terra:#d5613e; --terra-soft:#b14525; --brass:#6f655a; --brass-soft:#8c6e45;
  --cream:#0f0f0f; --cream-dim:#4a4540; --muted:#8a8178; --ok:#4f7a4a;
  --display:"Instrument Serif",Georgia,serif;
  --body:"Manrope",system-ui,sans-serif;
  --mono:"Spline Sans Mono",monospace;
  --maxw:1180px;
}
.dz *{box-sizing:border-box;margin:0;padding:0}
.dz{background:var(--void);color:var(--cream);font-family:var(--body);line-height:1.6;-webkit-font-smoothing:antialiased;position:relative;min-height:100vh}
.dz::before{content:"";position:fixed;inset:0;pointer-events:none;z-index:0;background:radial-gradient(900px 500px at 78% -5%, rgba(213,97,62,.16), transparent 60%),radial-gradient(700px 500px at 0% 18%, rgba(184,149,106,.10), transparent 55%)}
.dz::after{content:"";position:fixed;inset:0;pointer-events:none;z-index:1;opacity:.05;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='3'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")}
.dz .wrap{position:relative;z-index:2;max-width:var(--maxw);margin:0 auto;padding:0 24px}

.dz nav{position:sticky;top:0;z-index:50;backdrop-filter:blur(14px);background:rgba(246,243,238,.8);border-bottom:1px solid var(--panel-line)}
.dz .nav-inner{max-width:var(--maxw);margin:0 auto;padding:14px 24px;display:flex;align-items:center;justify-content:space-between;gap:20px}
.dz .brand{display:flex;align-items:baseline;gap:10px;font-family:var(--display);font-weight:400;font-size:26px;letter-spacing:0}
.dz .brand .dot{color:var(--terra)}
.dz .brand small{font-family:var(--mono);font-size:11px;color:var(--brass);letter-spacing:.18em;text-transform:uppercase}
.dz .nav-links{display:flex;gap:22px;font-size:13px;font-weight:500}
.dz .nav-links a{color:var(--cream-dim);text-decoration:none;transition:color .2s}
.dz .nav-links a:hover{color:var(--terra-soft)}
.dz .nav-cta{font-family:var(--mono);font-size:11px;letter-spacing:.12em;text-transform:uppercase;border:1px solid var(--terra);color:var(--terra-soft);padding:8px 14px;border-radius:2px;text-decoration:none;transition:.2s}
.dz .nav-cta:hover{background:var(--terra);color:var(--void)}
@media(max-width:760px){.dz .nav-links{display:none}}

.dz header.hero{padding:96px 0 64px;position:relative}
.dz .status-pill{display:inline-flex;align-items:center;gap:8px;font-family:var(--mono);font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:var(--brass);border:1px solid var(--panel-line);border-radius:100px;padding:7px 14px;margin-bottom:28px}
.dz .status-pill .live{width:7px;height:7px;border-radius:50%;background:var(--ok);box-shadow:0 0 0 0 rgba(111,158,106,.6);animation:dzpulse 2s infinite}
@keyframes dzpulse{0%{box-shadow:0 0 0 0 rgba(111,158,106,.5)}70%{box-shadow:0 0 0 8px rgba(111,158,106,0)}100%{box-shadow:0 0 0 0 rgba(111,158,106,0)}}
.dz h1.title{font-family:var(--display);font-weight:400;font-size:clamp(48px,7.5vw,92px);line-height:1.0;letter-spacing:-.015em;margin-bottom:8px}
.dz h1.title .it{font-style:italic;color:var(--terra-soft)}
.dz .lede{font-size:clamp(17px,2vw,21px);color:var(--cream-dim);max-width:680px;line-height:1.5}
.dz .lede strong{color:var(--cream);font-weight:600}
.dz .hero-meta{display:flex;flex-wrap:wrap;gap:10px;margin-top:34px}
.dz .hero-meta span{font-family:var(--mono);font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:var(--cream-dim);border:1px solid var(--panel-line);padding:7px 12px;border-radius:2px}

.dz section{padding:60px 0;border-top:1px solid var(--panel-line)}
.dz .eyebrow{font-family:var(--mono);font-size:11px;letter-spacing:.22em;text-transform:uppercase;color:var(--terra);margin-bottom:14px}
.dz h2{font-family:var(--display);font-weight:400;font-size:clamp(30px,4.2vw,46px);letter-spacing:-.01em;line-height:1.08;margin-bottom:18px}
.dz h2 .it{font-style:italic;color:var(--brass-soft)}
.dz .section-lede{font-size:17px;color:var(--cream-dim);max-width:720px;margin-bottom:38px}
.dz p{margin-bottom:14px}
.dz p.body{color:var(--cream-dim);max-width:760px}
.dz p.body strong{color:var(--cream);font-weight:600}

.dz .stats{display:grid;grid-template-columns:repeat(4,1fr);gap:1px;background:var(--panel-line);border:1px solid var(--panel-line);border-radius:4px;overflow:hidden}
.dz .stat{background:var(--void-2);padding:26px 22px}
.dz .stat .n{font-family:var(--display);font-size:clamp(34px,4.5vw,46px);font-weight:400;color:var(--terra-soft);line-height:1;letter-spacing:-.01em}
.dz .stat .l{font-family:var(--mono);font-size:10.5px;letter-spacing:.08em;text-transform:uppercase;color:var(--cream-dim);margin-top:10px}
@media(max-width:760px){.dz .stats{grid-template-columns:repeat(2,1fr)}}

.dz .grid2{display:grid;grid-template-columns:1fr 1fr;gap:22px}
.dz .grid3{display:grid;grid-template-columns:repeat(3,1fr);gap:18px}
@media(max-width:860px){.dz .grid2,.dz .grid3{grid-template-columns:1fr}}

.dz .card{background:var(--panel);border:1px solid var(--panel-line);border-radius:6px;padding:26px;transition:.25s}
.dz .card:hover{border-color:rgba(15,15,15,.24);transform:translateY(-2px)}
.dz .card h3{font-family:var(--display);font-weight:400;font-size:23px;margin-bottom:10px;letter-spacing:0}
.dz .card h3 .num{font-family:var(--mono);font-size:12px;color:var(--terra);margin-right:8px}
.dz .card p{color:var(--cream-dim);font-size:14.5px;margin-bottom:0}
.dz .card .tag{display:inline-block;font-family:var(--mono);font-size:10px;letter-spacing:.1em;text-transform:uppercase;color:var(--brass);border:1px solid var(--panel-line);padding:4px 9px;border-radius:2px;margin-top:14px;margin-right:6px}
.dz .card ul.bullets{list-style:none;padding:0;margin:0}
.dz .card ul.bullets li{font-size:14.5px;color:var(--cream-dim);padding:10px 0 10px 20px;position:relative;border-bottom:1px solid var(--panel-line)}
.dz .card ul.bullets li:last-child{border-bottom:none;padding-bottom:0}
.dz .card ul.bullets li::before{content:"→";position:absolute;left:0;color:var(--terra);font-family:var(--mono)}
.dz .card ul.bullets li strong{color:var(--cream);font-weight:600;display:block;margin-bottom:2px}

.dz .flow{display:grid;grid-template-columns:repeat(3,1fr);gap:0;border:1px solid var(--panel-line);border-radius:6px;overflow:hidden}
.dz .flow .step{background:var(--void-2);padding:28px 24px;position:relative;border-right:1px solid var(--panel-line)}
.dz .flow .step:last-child{border-right:none}
.dz .flow .step .k{font-family:var(--mono);font-size:11px;color:var(--terra);letter-spacing:.15em;margin-bottom:14px}
.dz .flow .step h4{font-family:var(--display);font-size:22px;font-weight:400;margin-bottom:8px}
.dz .flow .step p{font-size:14px;color:var(--cream-dim);margin:0}
@media(max-width:860px){.dz .flow{grid-template-columns:1fr}.dz .flow .step{border-right:none;border-bottom:1px solid var(--panel-line)}}

.dz table.matrix{width:100%;border-collapse:collapse;font-size:14px}
.dz table.matrix th{text-align:left;font-family:var(--mono);font-size:10.5px;letter-spacing:.1em;text-transform:uppercase;color:var(--brass);padding:14px 16px;border-bottom:1px solid var(--panel-line)}
.dz table.matrix td{padding:14px 16px;border-bottom:1px solid var(--panel-line);color:var(--cream-dim);vertical-align:top}
.dz table.matrix td:first-child{color:var(--cream);font-weight:500}
.dz .badge{font-family:var(--mono);font-size:10px;letter-spacing:.06em;text-transform:uppercase;padding:4px 9px;border-radius:100px;white-space:nowrap}
.dz .badge.live{background:rgba(111,158,106,.14);color:var(--ok);border:1px solid rgba(111,158,106,.3)}
.dz .badge.soon{background:rgba(184,149,106,.12);color:var(--brass-soft);border:1px solid rgba(184,149,106,.3)}
.dz .badge.plan{background:rgba(111,101,90,.12);color:var(--cream-dim);border:1px solid var(--panel-line)}
.dz .scrollx{overflow-x:auto}

.dz .diagram{background:var(--void-2);border:1px solid var(--panel-line);border-radius:6px;padding:30px;font-family:var(--mono);font-size:13px;color:var(--cream-dim);overflow-x:auto}
.dz .diagram pre{white-space:pre;line-height:1.7;margin:0}
.dz .diagram .hl{color:var(--terra-soft)}
.dz .diagram .br{color:var(--brass-soft)}
.dz .diagram .ok{color:var(--ok)}

.dz .stack-row{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:22px}
.dz .chip{font-family:var(--mono);font-size:12px;color:var(--cream);background:var(--panel);border:1px solid var(--panel-line);padding:8px 13px;border-radius:3px}
.dz .stack-label{font-family:var(--mono);font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:var(--terra);margin-bottom:10px}

.dz .endpoint{background:var(--panel);border:1px solid var(--panel-line);border-radius:5px;padding:16px 18px;margin-bottom:10px;font-family:var(--mono);font-size:13px}
.dz .endpoint .method{display:inline-block;font-size:10px;font-weight:600;letter-spacing:.08em;padding:3px 8px;border-radius:3px;margin-right:12px;background:var(--terra);color:var(--void)}
.dz .endpoint .method.get{background:var(--brass)}
.dz .endpoint .path{color:var(--cream)}
.dz .endpoint .desc{display:block;font-family:var(--body);font-size:13px;color:var(--cream-dim);margin-top:8px}

.dz .team{display:grid;grid-template-columns:repeat(3,1fr);gap:18px;max-width:760px}
@media(max-width:900px){.dz .team{grid-template-columns:1fr}}
.dz .member{background:var(--panel);border:1px solid var(--panel-line);border-radius:6px;padding:20px;text-align:center;transition:.25s}
.dz .member:hover{border-color:var(--terra);transform:translateY(-2px)}
.dz .avatar{width:72px;height:72px;border-radius:50%;margin:0 auto 14px;background:linear-gradient(135deg,var(--terra),var(--brass));display:flex;align-items:center;justify-content:center;font-family:var(--display);font-size:30px;color:var(--void);font-weight:400;border:2px solid var(--panel-line)}
.dz .member .nm{font-family:var(--display);font-size:18px;font-weight:400;margin-bottom:3px}
.dz .member .rl{font-size:12px;color:var(--terra-soft);margin-bottom:8px}
.dz .member .em{font-family:var(--mono);font-size:10.5px;color:var(--muted);word-break:break-all}

.dz .road{display:grid;grid-template-columns:repeat(3,1fr);gap:18px}
@media(max-width:860px){.dz .road{grid-template-columns:1fr}}
.dz .road .col{background:var(--panel);border:1px solid var(--panel-line);border-radius:6px;padding:24px}
.dz .road .col .when{font-family:var(--mono);font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:var(--terra);margin-bottom:16px}
.dz .road ul{list-style:none}
.dz .road li{font-size:14px;color:var(--cream-dim);padding:8px 0 8px 20px;position:relative;border-bottom:1px solid var(--panel-line)}
.dz .road li:last-child{border-bottom:none}
.dz .road li::before{content:"→";position:absolute;left:0;color:var(--brass)}

.dz .log{border-left:2px solid var(--panel-line);padding-left:24px;margin-left:6px}
.dz .log .entry{position:relative;padding-bottom:22px}
.dz .log .entry::before{content:"";position:absolute;left:-31px;top:5px;width:10px;height:10px;border-radius:50%;background:var(--terra);border:2px solid var(--void)}
.dz .log .v{font-family:var(--mono);font-size:12px;color:var(--terra-soft);letter-spacing:.06em}
.dz .log .entry p{font-size:14px;color:var(--cream-dim);margin:6px 0 0}

.dz footer{padding:56px 0 80px;border-top:1px solid var(--panel-line);text-align:center}
.dz footer .fw{font-family:var(--display);font-size:38px;font-weight:400}
.dz footer .fw .dot{color:var(--terra)}
.dz footer .meta{font-family:var(--mono);font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:var(--muted);margin-top:14px}
.dz footer a{color:var(--brass-soft);text-decoration:none}

.dz .reveal{opacity:0;transform:translateY(18px);transition:opacity .7s ease,transform .7s ease}
.dz .reveal.in{opacity:1;transform:none}
`;

export default function DocsPage() {
  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("in");
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.12 }
    );
    document.querySelectorAll(".dz .reveal").forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  return (
    <div className="dz">
      {/* eslint-disable-next-line @next/next/no-page-custom-font */}
      <link
        href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Spline+Sans+Mono:wght@400;500&family=Manrope:wght@400;500;600;700&display=swap"
        rel="stylesheet"
      />
      <style dangerouslySetInnerHTML={{ __html: CSS }} />

      {/* NAV */}
      <nav>
        <div className="nav-inner">
          <div className="brand">
            Deshly<span className="dot">.</span> <small>Docs</small>
          </div>
          <div className="nav-links">
            <a href="#pitch">Pitch</a>
            <a href="#product">Product</a>
            <a href="#architecture">Architecture</a>
            <a href="#ai">AI Layer</a>
            <a href="#roadmap">Roadmap</a>
            <a href="#team">Team</a>
          </div>
          <a href="/" className="nav-cta">
            ← Back to App
          </a>
        </div>
      </nav>

      {/* HERO */}
      <header className="hero">
        <div className="wrap">
          <span className="status-pill">
            <span className="live"></span> System Live · Documentation v1.0
          </span>
          <h1 className="title">
            Diaspora commerce,
            <br />
            <span className="it">spoken like a local.</span>
          </h1>
          <p className="lede" style={{ marginTop: 24 }}>
            Deshly is an AI intelligence layer for{" "}
            <strong>emerging-market D2C brands</strong> selling to their global
            diaspora. It learns a brand&apos;s voice from its own captions,
            finds the audiences most likely to buy each product, and generates{" "}
            <strong>complete localized campaigns</strong> — captions, visuals,
            reels, WhatsApp copy, and timing — for every community, in their
            language and timezone.
          </p>
          <p
            className="lede"
            style={{ marginTop: 20, color: "var(--cream)", fontSize: 18 }}
          >
            <strong>
              Every product, not just the brand, matched to the audience most
              likely to buy it — a market Shopify forgot and foundation models
              can&apos;t serve.
            </strong>
          </p>
          <div className="hero-meta">
            <span>Multimodal Content Engine</span>
            <span>The Infinity AI BuildFest 2026</span>
            <span>Team Vengeance</span>
            <span>Bangladesh-seeded · Country-agnostic</span>
          </div>
        </div>
      </header>

      {/* PROBLEM / WHY NOW */}
      <section id="pitch">
        <div className="wrap">
          <div className="eyebrow">01 — The Problem &amp; Why Now</div>
          <h2>
            A global customer base, <span className="it">barely reached.</span>
          </h2>
          <p className="section-lede">
            Bangladeshi D2C brands aren&apos;t just competing for local buyers
            anymore — they&apos;re sitting on a global customer base they barely
            touch.
          </p>

          <div className="stats reveal">
            <div className="stat">
              <div className="n">13M+</div>
              <div className="l">Bangladeshis abroad</div>
            </div>
            <div className="stat">
              <div className="n">3–10×</div>
              <div className="l">Higher diaspora order value</div>
            </div>
            <div className="stat">
              <div className="n">2,400+</div>
              <div className="l">Bangladeshi D2C brands</div>
            </div>
            <div className="stat">
              <div className="n">0</div>
              <div className="l">Culturally-aware tools</div>
            </div>
          </div>

          <p className="body" style={{ marginTop: 34 }}>
            Over <strong>13 million Bangladeshis live abroad</strong>, and
            diaspora communities across emerging markets keep spending on products
            that connect them back to home. These customers carry stronger
            emotional buying intent and average order values{" "}
            <strong>3–10× higher</strong> than local buyers — yet most home-country
            brands miss them completely. Today, <strong>2,400+ Bangladeshi
            fashion, food and lifestyle brands</strong> still market as if their
            only audience lives in Bangladesh: local content, Bangladesh hours,
            local assumptions. A brand may have 24,000 followers but reach only{" "}
            <strong>312 engaged users in London or 89 in New York per week.</strong>
          </p>

          <p className="body">
            The problem isn&apos;t demand — it&apos;s that brands have{" "}
            <strong>no system to identify, understand and convert their diaspora
            customers.</strong> A Bangladeshi mother in Toronto, a Gen-Z student in
            Dhaka, and an expat professional in Dubai may all love the same brand,
            but they don&apos;t respond to the same message, timing, language or
            emotional trigger. A Pohela Boishakh campaign for someone in Sylhet
            can&apos;t be copy-pasted for someone in Sydney.
          </p>

          <p className="body">
            Generic AI tools can&apos;t close this gap. They generate captions, but
            they don&apos;t understand a brand&apos;s real voice, Bangla-English
            code-switching, diaspora shopping behavior, timezone-based peak buying
            windows, or the emotional pull of home. There is still no
            culturally-aware marketing intelligence tool built for this category —{" "}
            <strong>and that&apos;s the gap Deshly is solving.</strong>
          </p>

          <p className="body" style={{ marginTop: 24, color: "var(--cream)" }}>
            <strong>Why now —</strong> open-weight LLMs made high-quality generation
            cheap, vector databases made brand memory trivial, and the Model Context
            Protocol made AI capabilities composable across every agent. The
            infrastructure for culturally-intelligent commerce tooling only became
            affordable in the last 18 months. Deshly is built natively on it.
          </p>
        </div>
      </section>

      {/* SOLUTION / PRODUCT */}
      <section id="product">
        <div className="wrap">
          <div className="eyebrow">02 — Solution &amp; Product</div>
          <h2>
            Three steps from captions to{" "}
            <span className="it">culture-fit campaigns.</span>
          </h2>
          <p className="section-lede">
            A brand owner needs no marketing team and no data science. Paste,
            describe, generate.
          </p>
          <div className="flow reveal">
            <div className="step">
              <div className="k">STEP 01</div>
              <h4>Brand DNA</h4>
              <p>
                Paste 10 existing captions. Deshly extracts a structured voice
                profile — tone, signature words, even Bangla-English
                code-switching — and stores it as a vector embedding.
              </p>
            </div>
            <div className="step">
              <div className="k">STEP 02</div>
              <h4>Audience Match</h4>
              <p>
                Describe a product. The engine ranks local and diaspora clusters
                across four dimensions and explains, in plain language, why each
                audience will connect.
              </p>
            </div>
            <div className="step">
              <div className="k">STEP 03</div>
              <h4>Generate</h4>
              <p>
                One click produces a full campaign per audience: caption, image
                prompts, reels storyboard, WhatsApp broadcast, hashtags and
                posting time — in the right language and timezone.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* PRODUCT OVERVIEW */}
      <section>
        <div className="wrap">
          <div className="eyebrow">03 — Product Overview</div>
          <h2>
            What it does, <span className="it">for whom.</span>
          </h2>
          <div className="grid3" style={{ marginTop: 8 }}>
            <div className="card reveal">
              <h3>Target users</h3>
              <p>
                Founders and marketers at emerging-market D2C brands — fashion,
                food, lifestyle — who sell at home and want to reach their
                diaspora without losing cultural authenticity.
              </p>
              <span className="tag">Primary</span>
              <span className="tag">Agencies (Phase 2)</span>
            </div>
            <div className="card reveal">
              <h3>Core use case</h3>
              <p>
                Turn one product into several culturally-tuned, multi-channel
                campaigns — each aimed at a specific community, written in their
                language mix, scheduled for their timezone.
              </p>
              <span className="tag">Multimodal output</span>
            </div>
            <div className="card reveal">
              <h3>The surfaces</h3>
              <p>
                Four product pages: <b>/brand-dna</b> voice extraction,{" "}
                <b>/generator</b> matching + generation, <b>/clusters</b>{" "}
                interactive diaspora map, <b>/docs</b> this living whitepaper.
              </p>
              <span className="tag">Live</span>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURE MATRIX */}
      <section>
        <div className="wrap">
          <div className="eyebrow">04 — Feature Matrix</div>
          <h2>
            Built, building, <span className="it">planned.</span>
          </h2>
          <div className="scrollx">
            <table className="matrix reveal">
              <thead>
                <tr>
                  <th>Capability</th>
                  <th>Description</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Brand voice extraction</td>
                  <td>
                    7-field structured profile + 768-dim embedding from raw
                    captions
                  </td>
                  <td>
                    <span className="badge live">Live</span>
                  </td>
                </tr>
                <tr>
                  <td>Cluster matching</td>
                  <td>13 clusters scored across 4 dimensions with emotional insight</td>
                  <td>
                    <span className="badge live">Live</span>
                  </td>
                </tr>
                <tr>
                  <td>Multimodal generation</td>
                  <td>Caption, image prompts, reels, WhatsApp, hashtags, timing</td>
                  <td>
                    <span className="badge live">Live</span>
                  </td>
                </tr>
                <tr>
                  <td>Multi-LLM fallback</td>
                  <td>Groq → Together → Gemini → local Ollama</td>
                  <td>
                    <span className="badge live">Live</span>
                  </td>
                </tr>
                <tr>
                  <td>3 MCP servers</td>
                  <td>DiasporaGraph, BrandVoice, CampaignGenerator</td>
                  <td>
                    <span className="badge live">Live</span>
                  </td>
                </tr>
                <tr>
                  <td>Graph RAG reasoning</td>
                  <td>
                    Relationship-based reasoning over Postgres relationship tables
                    and MCP tools (brand → product → occasion → audience → channel)
                  </td>
                  <td>
                    <span className="badge live">Live</span>
                  </td>
                </tr>
                <tr>
                  <td>Interactive diaspora map</td>
                  <td>Leaflet cluster explorer with cultural detail panels</td>
                  <td>
                    <span className="badge live">Live</span>
                  </td>
                </tr>
                <tr>
                  <td>Onboarding &amp; auth</td>
                  <td>
                    Email + OAuth sign-up, brand workspaces (disabled for judging,
                    shipping in production)
                  </td>
                  <td>
                    <span className="badge soon">Phase 2</span>
                  </td>
                </tr>
                <tr>
                  <td>Native image generation</td>
                  <td>Replicate / Fal.ai → rendered images, not prompts</td>
                  <td>
                    <span className="badge soon">Phase 2</span>
                  </td>
                </tr>
                <tr>
                  <td>Direct publishing</td>
                  <td>Buffer / Hootsuite / Meta Business scheduling</td>
                  <td>
                    <span className="badge soon">Phase 2</span>
                  </td>
                </tr>
                <tr>
                  <td>Closed-loop learning</td>
                  <td>Reconcile predicted vs actual engagement, retrain</td>
                  <td>
                    <span className="badge plan">Phase 3</span>
                  </td>
                </tr>
                <tr>
                  <td>Automated cluster discovery</td>
                  <td>Signal scraping → embedding → unsupervised clustering (augments the curated set)</td>
                  <td>
                    <span className="badge plan">Phase 3</span>
                  </td>
                </tr>
               
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ARCHITECTURE */}
      <section id="architecture">
        <div className="wrap">
          <div className="eyebrow">05 — System Architecture</div>
          <h2>
            UI → API → Services → <span className="it">Data.</span>
          </h2>
          <p className="section-lede">
            Synchronous where the user waits; resilient at every external
            dependency. Graph-shaped relationships today; graph-stored when
            scale demands it.
          </p>
          <div className="diagram reveal">
          <pre>{`┌─────────────────────────── CLIENT (Next.js 16 App Router) ──────────────────────────┐
│   /brand-dna        /generator         /clusters          /docs                     │
└──────────────────────────────────────┬───────────────────────────────────────────────┘
                                       │  fetch (REST)
┌──────────────────────────────────────▼───────────────────────────────────────────────┐
│   API ROUTES                                                                        │
│   /api/extract-brand-voice   /api/match-clusters   /api/generate-campaign          │
│   /api/log-signal            /api/feedback         /api/clusters-list              │
└──────────────────────────────────────┬───────────────────────────────────────────────┘
                                       │
┌──────────────────────────────────────▼───────────────────────────────────────────────┐
│   RETRIEVAL + REASONING PIPELINE                                                     │
│   live ▸ Naive RAG retrieval — brand voice by id / similarity                        │
│   live ▸ Vector search — pgvector cosine, IVFFlat index                              │
│   live ▸ Structured-context payload builder — typed cluster profiles, no chunking    │
│   live ▸ Relational filters — country · segment · occasion · fulfillment             │
│   live ▸ Hybrid search — keyword + vector + structured filters                       │
│   live ▸ Query rewriting / HyDE                                                      │
│   live ▸ Graph RAG — multi-hop relationship traversal via Graph DB                   │
│   live ▸ Learning loop injection — prior copy/select/edit/reject signals             │
└───────────┬───────────────────────────────────────────────────────┬───────────────────┘
            │                                                       │
    ┌───────▼───────────────┐                              ┌────────▼──────────────────────┐
    │  LLM ORCHESTRATOR     │                              │  MCP SERVERS / RAG TOOL LAYER │
    │  Groq → Together →    │                              │  DiasporaGraph — graph +      │
    │  Gemini → Ollama      │                              │     audience reasoning        │
    │  retry + backoff      │                              │  BrandVoice — brand DNA       │
    │  embeddings +         │                              │     retrieval                 │
    │  inference            │                              │  CampaignGenerator — campaign │
    └───────┬───────────────┘                              │     context assembly          │
            │                                              │  SignalMemory — feedback loop │
            │                                              └────────┬──────────────────────┘
            │                                                       │ stdio / HTTP
┌───────────▼──────────────────────────────┐          ┌─────────────▼─────────────────────┐
│   SUPABASE — PostgreSQL + pgvector        │          │   GRAPH DB — Neo4j / Apache AGE   │
│   brands · brand_voices(embedding)        │          │   product → category → occasion   │
│   clusters · campaigns · user_signals     │          │   → audience → channel → campaign │
│   feedback_events · ingestion_logs        │          │   → outcome                       │
│   structured app data + vector memory     │          │   multi-hop traversal for Graph RAG│
└───────────┬──────────────────────────────┘          └─────────────┬─────────────────────┘
            │                                                       │
            └───────────────────────┬───────────────────────────────┘
                                    │
┌───────────────────────────────────▼──────────────────────────────────────────────────┐
│   LIVE LEARNING LOOP                                                                 │
│   user actions: copy · select · edit · regenerate · reject · publish                 │
│   stored as user_signals + feedback_events                                           │
│   retrieved in future generations to adapt audience ranking, tone, and campaign type │
└───────────────────────────────────┬──────────────────────────────────────────────────┘
                                    │
                                    ▼
┌──────────────────────────────────────────────────────────────────────────────────────┐
│   OUTPUT                                                                             │
│   ranked audiences · fit scores · reasoning path · caption · image prompts           │
│   reels storyboard · WhatsApp copy · hashtags · best time · channel recommendation   │
└──────────────────────────────────────────────────────────────────────────────────────┘

                         ▲
┌────────────────────────┴────────────────┐
│   Reddit scraper / community signals     │
│   public signals → cluster confidence     │
│   Phase 3 → automated cluster discovery, │
│   performance reconciliation, deeper      │
│   campaign-outcome graph expansion        │
└──────────────────────────────────────────┘`}</pre>
          </div>
        </div>
      </section>

      {/* DATA FLOW */}
      <section>
        <div className="wrap">
          <div className="eyebrow">06 — Data Flow</div>
          <h2>
            Input → Processing → AI → Output →{" "}
            <span className="it">Feedback.</span>
          </h2>
          <div className="grid3" style={{ marginTop: 8 }}>
  <div className="card reveal">
    <h3>
      <span className="num">→</span>Input
    </h3>
    <p>
      Brand captions and a product description. Validated and sanitized
      server-side (100–20,000 chars, ≥10 caption blocks).
    </p>
  </div>

  <div className="card reveal">
    <h3>
      <span className="num">→</span>Processing
    </h3>
    <p>
      Captions are compacted into a structured voice payload; clusters are
      trimmed into high-signal fields. Context is built for the LLM as
      structured knowledge — combining brand voice, product traits,
      audience clusters, graph relationships, and prior user signals.
    </p>
  </div>

  <div className="card reveal">
    <h3>
      <span className="num">→</span>AI
    </h3>
    <p>
      Multi-LLM inference + pgvector retrieval + Graph RAG. Deshly uses
      structured contextual RAG, hybrid search, query rewriting / HyDE, and
      MCP tools to retrieve the right brand, product, audience, and campaign
      context. Graph RAG performs multi-hop relationship traversal through
      the Graph DB, while pgvector handles semantic brand and campaign memory.
      Outputs are strict JSON, schema-validated, and banned-phrase enforced.
    </p>
  </div>

  <div className="card reveal">
    <h3>
      <span className="num">→</span>Output
    </h3>
    <p>
      Ranked audiences and multimodal campaign packages rendered in-app:
      fit scores, reasoning, captions, image prompts, reels storyboard,
      WhatsApp copy, hashtags, best time, and channel recommendation.
    </p>
  </div>

  <div className="card reveal">
    <h3>
      <span className="num">→</span>Feedback <span className="tag">Live</span>
    </h3>
    <p>
      User actions — copy, select, edit, regenerate, reject, and publish —
      are stored as user_signals and feedback_events.
    </p>
  </div>

  <div className="card reveal">
    <h3>
      <span className="num">→</span>Learning <span className="tag">Live</span>
    </h3>
    <p>
      Deshly retrieves prior user signals in future generations to adapt
      audience ranking, tone, campaign format, and recommendations for
      that brand.
    </p>
  </div>
</div>
        </div>
      </section>

      {/* TECH STACK */}
      <section>
        <div className="wrap">
          <div className="eyebrow">07 — Technology Stack</div>
          <h2>
            Open-source first, <span className="it">no lock-in.</span>
          </h2>
          <div style={{ marginTop: 8 }}>
            <div className="stack-label">Frontend</div>
            <div className="stack-row">
              <span className="chip">Next.js 16.2.4</span>
              <span className="chip">React 19</span>
              <span className="chip">Tailwind v4</span>
              <span className="chip">Framer Motion</span>
              <span className="chip">GSAP</span>
              <span className="chip">Lenis</span>
              <span className="chip">Leaflet</span>
              <span className="chip">Lucide</span>
            </div>
            <div className="stack-label">Backend &amp; Data</div>
            <div className="stack-row">
              <span className="chip">Supabase</span>
              <span className="chip">PostgreSQL</span>
              <span className="chip">pgvector</span>
              <span className="chip">supabase-js</span>
            </div>
            <div className="stack-label">AI &amp; Protocol</div>
            <div className="stack-row">
              <span className="chip">Groq · Llama 3.3 70B</span>
              <span className="chip">Together AI</span>
              <span className="chip">Gemini 2.0 Flash</span>
              <span className="chip">Ollama</span>
              <span className="chip">@modelcontextprotocol/sdk</span>
            </div>
            <div className="stack-label">Ingestion &amp; Infra</div>
            <div className="stack-row">
              <span className="chip">Snoowrap</span>
              <span className="chip">Vercel</span>
              <span className="chip">GitHub CI</span>
              <span className="chip">TypeScript</span>
            </div>
          </div>
        </div>
      </section>

      {/* API DOCS */}
      <section>
        <div className="wrap">
          <div className="eyebrow">08 — API Documentation</div>
          <h2>
            Endpoints <span className="it">exposed.</span>
          </h2>
          <p className="section-lede">
            REST routes consumed by the UI; the same logic is exposed as MCP tools
            for any agent.
          </p>
          <div className="reveal">
            <div className="endpoint">
              <span className="method">POST</span>
              <span className="path">/api/extract-brand-voice</span>
              <span className="desc">
                Input: captions, brandName → structured BrandVoiceProfile +
                brandVoiceId + embedding.
              </span>
            </div>
            <div className="endpoint">
              <span className="method">POST</span>
              <span className="path">/api/match-clusters</span>
              <span className="desc">
                Input: productDescription, brandVoiceId → ranked clusters with
                score breakdown, tier labels and insights.
              </span>
            </div>
            <div className="endpoint">
              <span className="method">POST</span>
              <span className="path">/api/generate-campaign</span>
              <span className="desc">
                Input: brandVoiceId, productDescription, clusterIds → complete
                multimodal campaign packages.
              </span>
            </div>
            <div className="endpoint">
              <span className="method get">GET</span>
              <span className="path">/api/clusters-list</span>
              <span className="desc">All 13 cluster profiles for the diaspora map.</span>
            </div>
            <div className="endpoint">
              <span className="method get">GET</span>
              <span className="path">/api/system-status</span>
              <span className="desc">Health across LLM providers and Supabase.</span>
            </div>
          </div>
        </div>
      </section>

      {/* AI LAYER */}
      <section id="ai">
        <div className="wrap">
          <div className="eyebrow">09 — AI Layer</div>
          <h2>
            Not a wrapper. <span className="it">Infrastructure.</span>
          </h2>
          <div className="grid2" style={{ marginTop: 8 }}>
            <div className="card reveal">
              <h3>Multi-LLM resilience</h3>
              <p>
                A four-provider fallback chain — Groq Llama 3.3 70B, Together,
                Gemini, local Ollama — with retry and backoff. No single point of
                failure; works even offline.
              </p>
            </div>
            <div className="card reveal">
              <h3>RAG + Structured Context</h3>
              <ul className="bullets">
                <li>
                  <strong>Brand voice — retrieved</strong>
                  Embedded in pgvector (768-dim, IVFFlat) and pulled by similarity.
                </li>
                <li>
                  <strong>Cluster knowledge — structured</strong>
                  Already typed profiles, fed to the model directly — reasoning over
                  brand, audience, occasion and channel, not chunked documents.
                </li>
                <li>
                  <strong>Retrieve where it helps</strong>
                  Similarity search where it adds value; skipped where structure
                  already does the job.
                </li>
                <li>
                  <strong>Exposed via MCP</strong>
                  The whole knowledge layer sits behind our DiasporaGraph MCP server,
                  so a future storage change never breaks the tools.
                </li>
              </ul>
            </div>
            <div className="card reveal">
              <h3>Prompt engineering</h3>
              <p>
                Contrast-aware voice analysis, strategist-framed matching, a 28-term
                banned-phrase blocklist, forced score spread and self-check rubrics.
                ~48% token reduction vs naive prompts.
              </p>
            </div>
            <div className="card reveal">
              <h3>MCP-first composability</h3>
              <p>
                Three custom MCP servers expose every capability as agent-callable
                tools (stdio + Streamable HTTP). Deshly runs inside Claude Desktop,
                Cursor, or any MCP host.
              </p>
            </div>
            <div className="card reveal">
              <h3>Explainability</h3>
              <p>
                Every match returns a plain-language &quot;why this works.&quot;
                Predictions are anchored to curated cluster baselines today, with Meta performance reconciliation planned for Phase 3. —
                and surfaced as qualitative labels, not raw noise.
              </p>
            </div>
            <div className="card reveal">
              <h3>Personalization</h3>
              <p>
                Output is conditioned on the brand&apos;s own voice profile + the
                audience cluster&apos;s culture, language mix and timezone — so one
                product becomes several distinct, on-brand campaigns.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* MARKET / BUSINESS / EDGE */}
      {/* MARKET / BUSINESS / EDGE */}
      <section>
        <div className="wrap">
          <div className="eyebrow">10 — Market, Model &amp; Edge</div>
          <h2>
            Where the value <span className="it">compounds.</span>
          </h2>

          {/* TAM / SAM / expansion / margin */}
          <div className="stats reveal" style={{ marginBottom: 22 }}>
            <div className="stat">
              <div className="n">$7B</div>
              <div className="l">TAM · emerging-market D2C w/ diaspora</div>
            </div>
            <div className="stat">
              <div className="n">$1.4B</div>
              <div className="l">SAM · social-native D2C brands</div>
            </div>
            <div className="stat">
              <div className="n">50K+</div>
              <div className="l">India brands · first expansion</div>
            </div>
            <div className="stat">
              <div className="n">70%+</div>
              <div className="l">Target gross margin</div>
            </div>
          </div>

          {/* proven-today KPIs */}
          <div
            className="stats reveal"
            style={{ marginBottom: 38, gridTemplateColumns: "repeat(3,1fr)" }}
          >
            <div className="stat">
              <div className="n">~60s</div>
              <div className="l">Product → 3 full campaigns (today)</div>
            </div>
            <div className="stat">
              <div className="n">~48%</div>
              <div className="l">Token cost cut vs naive (today)</div>
            </div>
            <div className="stat">
              <div className="n">~$0</div>
              <div className="l">Marginal cost / free-tier user (today)</div>
            </div>
          </div>

          <div className="grid2" style={{ marginTop: 8 }}>
            <div className="card reveal">
              <h3>Value proposition</h3>
              <ul className="bullets">
                <li>
                  <strong>One product → many campaigns</strong>
                  Several culture-fit campaigns in ~60 seconds — work that costs a
                  brand an agency retainer or a hire they can&apos;t afford.
                </li>
                <li>
                  <strong>Product-level, not brand-level</strong>
                  Per-product, per-diaspora targeting no generic AI tool offers.
                </li>
                <li>
                  <strong>Replaces &quot;post the same to everyone&quot;</strong>
                  Right message, right audience, right language, right timezone.
                </li>
              </ul>
            </div>

            <div className="card reveal">
              <h3>Monetization</h3>
              <ul className="bullets">
                <li>
                  <strong>Free — the demand engine</strong>
                  5 campaigns/mo at ~$0 marginal cost (Groq free tier).
                </li>
                <li>
                  <strong>Pro · ~$29/mo</strong>
                  100 campaigns, ~80% margin — the SMB brand owner.
                </li>
                <li>
                  <strong>Enterprise · $299+/mo</strong>
                  Unlimited + self-host + MCP access, ~70% margin.
                </li>
                <li>
                  <strong>Platform line</strong>
                  Usage-billed intelligence-as-a-tool API. <b>Target 70%+ margin.</b>
                </li>
              </ul>
            </div>

            <div className="card reveal">
              <h3>Adoption pathway</h3>
              <ul className="bullets">
                <li>
                  <strong>Land: BD fashion D2C</strong>
                  A tight community where word travels fast.
                </li>
                <li>
                  <strong>Zero-setup onboarding</strong>
                  Brands start in minutes with their own captions.
                </li>
                <li>
                  <strong>Agencies = multi-account wedge</strong>
                  One account, many brands. MCP registry = developer-led growth.
                </li>
              </ul>
            </div>

            <div className="card reveal">
              <h3>Cross-border readiness</h3>
              <ul className="bullets">
                <li>
                  <strong>Country-agnostic by design</strong>
                  Zero Bangladesh-specific code in the schema.
                </li>
                <li>
                  <strong>Each market = a data operation</strong>
                  India, Pakistan, Nigeria, Vietnam, Mexico — <b>not a rebuild.</b>
                </li>
                <li>
                  <strong>Built for the global NRB economy</strong>
                  And the emerging-market brands serving every diaspora.
                </li>
              </ul>
            </div>

            <div className="card reveal">
              <h3>Market validation</h3>
              <ul className="bullets">
                <li>
                  <strong>Demand is structural</strong>
                  13M+ abroad · 3–10× higher order value · 2,400+ brands marketing
                  blind.
                </li>
                <li>
                  <strong>Founder interviews</strong>
                  5 Dhaka D2C founders — all confirmed
                  diaspora orders, none had a tool to target them.
                </li>
                <li>
                  <strong>Next 90 days</strong>
                  Design-partner brands + Meta-connect for the live data loop.
                </li>
              </ul>
            </div>

            <div className="card reveal">
              <h3>The compounding moat</h3>
              <ul className="bullets">
                <li>
                  <strong>Outcome loop</strong>
                  Once a brand connects Meta, every campaign is reconciled against
                  real engagement.
                </li>
                <li>
                  <strong>A dataset no one else has</strong>
                  Per-product, per-diaspora conversion data OpenAI &amp; Meta
                  can&apos;t replicate — they lack the loop.
                </li>
                <li>
                  <strong>It compounds</strong>
                  More brands → sharper data → better results → more brands.
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ROADMAP */}
      <section id="roadmap">
        <div className="wrap">
          <div className="eyebrow">11 — Product Roadmap</div>
          <h2>
            Short, mid, <span className="it">long.</span>
          </h2>
          <div className="road reveal">
            <div className="col">
              <div className="when">Now — MVP</div>
              <ul>
                <li>Brand DNA extraction</li>
                <li>13-cluster matching</li>
                <li>Multimodal generation</li>
                <li>3 MCP servers</li>
                <li>Diaspora map</li>
              </ul>
            </div>
            <div className="col">
              <div className="when">3–6 Months</div>
              <ul>
                <li>5 countries, 80+ clusters</li>
                <li>Native image generation</li>
                <li>Direct publishing integrations</li>
                <li>Email + OAuth onboarding</li>
                <li>RLS multi-tenant workspaces</li>
                <li>Performance reconciliation</li>
              </ul>
            </div>
            <div className="col">
              <div className="when">12 Months</div>
              <ul>
                <li>20+ markets</li>
                <li>Closed-loop learning model</li>
                <li>Automated cluster discovery</li>
                <li>Marketplace integrations</li>
                <li>Enterprise self-host + RBAC</li>
          
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* PERFORMANCE & SECURITY */}
      <section>
  <div className="wrap">
    <div className="eyebrow">12 — Performance &amp; Security</div>
    <h2>
      Fast, frugal, <span className="it">guarded.</span>
    </h2>

    <div className="grid2" style={{ marginTop: 8 }}>
      <div className="card reveal">
        <h3>Performance &amp; scalability</h3>
        <ul className="bullets">
          <li>
            <strong>~48% token reduction</strong>
            Context trimming, compact structured payloads, JSON mode, and tight
            max_tokens caps reduce cost versus naive prompt construction.
          </li>

          <li>
            <strong>Rate-limit aware</strong>
            Sequential generation, inter-call staggering, retry/backoff, and
            multi-provider fallback reduce dependency on any single LLM provider.
          </li>

          <li>
            <strong>Live graph reasoning</strong>
            Graph RAG uses the Graph DB and MCP tool layer for multi-hop
            product → occasion → audience → channel reasoning before generation.
          </li>

          <li>
            <strong>Live learning loop</strong>
            Copy, select, edit, regenerate, reject, and publish actions are stored
            as feedback signals and reused in future recommendations.
          </li>

          <li>
            <strong>Phase 2 — speed upgrades</strong>
            Prompt caching, result caching, parallel generation on paid tiers, and
            multi-region replicas improve latency as usage grows.
          </li>

          <li>
            <strong>Phase 3 — outcome expansion</strong>
            Meta performance reconciliation, campaign-outcome graph expansion, and
            automated cluster discovery deepen the learning layer over time.
          </li>
        </ul>
      </div>

      <div className="card reveal">
        <h3>Security &amp; access</h3>
        <ul className="bullets">
          <li>
            <strong>Auth disabled for judging</strong>
            Evaluators can test every surface instantly with no sign-up friction.
            Full email + OAuth onboarding ships in the production build.
          </li>

          <li>
            <strong>Multi-tenant ready</strong>
            Supabase Row-Level Security for brand workspaces and OAuth-scoped MCP
            endpoints is prepared for the Phase 2 production rollout.
          </li>

          <li>
            <strong>Server-side only DB access</strong>
            Service-role keys live in environment variables and are never exposed
            to the client. The browser calls API routes, not the database directly.
          </li>

          <li>
            <strong>Schema-validated outputs</strong>
            Every LLM response is parsed and validated against typed contracts
            before persistence or display.
          </li>

          <li>
            <strong>PII-aware processing</strong>
            Deshly is designed around brand-owned content and aggregated market
            signals. Personal identifiers can be masked before model processing.
          </li>

          <li>
            <strong>No consumer surveillance</strong>
            Reddit and community signals are aggregated to cluster level. Deshly
            does not require individual consumer profiles for its core workflow.
          </li>

          <li>
            <strong>Compliance &amp; audit roadmap</strong>
            GDPR / DPDP controls, audit logging, and enterprise governance are on
            the Phase 2 roadmap for production and self-hosted deployments.
          </li>
        </ul>
      </div>
    </div>
  </div>
</section>

      {/* TEAM */}
      <section id="team">
        <div className="wrap">
          <div className="eyebrow">13 — Team</div>
          <h2>
            Team <span className="it">Vengeance.</span>
          </h2>
          <p className="section-lede">
            Three builders behind Deshly — shipping a culturally-intelligent
            commerce engine from Dhaka to the world. We&apos;re building for a
            market we live inside: we understand the code-switching, the occasions,
            and the pull of home a foreign team can&apos;t replicate.
          </p>
          <div className="team reveal">
            <div className="member">
              <div className="avatar">S</div>
              <div className="nm">Samprity Haque</div>
              <div className="rl">Lead · Full-Stack &amp; AI</div>
              <div className="em">haquesamprity4@gmail.com</div>
            </div>
            <div className="member">
              <div className="avatar">S</div>
              <div className="nm">Sirajus Salikin Siddique</div>
              <div className="rl">Backend Engineer</div>
              <div className="em">sirajus.cse.20230204119@aust.edu</div>
            </div>
            <div className="member">
              <div className="avatar">M</div>
              <div className="nm">Meher Nigar</div>
              <div className="rl">Frontend Engineer</div>
              <div className="em">meher.cse.00724105101133@aust.edu</div>
            </div>
          </div>
        </div>
      </section>

      {/* CHANGELOG */}
      <section>
        <div className="wrap">
          <div className="eyebrow">14 — Changelog</div>
          <h2>
            Version <span className="it">history.</span>
          </h2>
          <div className="log reveal">
            <div className="entry">
              <span className="v">v1.0 — Prelim submission</span>
              <p>
                Four product surfaces live. Token optimization (~48%). Caption
                counter fix. Three MCP servers are implemented & documented. Live /docs whitepaper
                shipped.
              </p>
            </div>
            <div className="entry">
              <span className="v">v0.9 — Generation polish</span>
              <p>
                Campaign cards redesigned with Performance Snapshot, collapsible
                drawers, Copy Full Package action.
              </p>
            </div>
            <div className="entry">
              <span className="v">v0.8 — Matching engine</span>
              <p>
                Strategist-framed cluster matcher: tier labels, forced score spread,
                emotional &quot;why this works&quot; insights.
              </p>
            </div>
            <div className="entry">
              <span className="v">v0.7 — Brand DNA</span>
              <p>
                Contrast-aware voice extraction with banned-phrase enforcement and
                pgvector embeddings.
              </p>
            </div>
          </div>
        </div>
      </section>

      <footer>
        <div className="wrap">
          <div className="fw">
            Deshly<span className="dot">.</span>
          </div>
          <div className="meta">
            Culture, scaled · The Infinity AI BuildFest 2026 ·{" "}
            <a href="https://deshly.vercel.app">deshly.vercel.app</a> ·{" "}
            <a href="https://github.com/httprity/deshly">GitHub</a>
          </div>
        </div>
      </footer>
    </div>
  );
}