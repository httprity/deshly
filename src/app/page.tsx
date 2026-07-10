"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  motion,
  AnimatePresence,
  useScroll,
  useTransform,
  useMotionValue,
  useSpring,
  useMotionValueEvent,
  useReducedMotion,
  useInView,
  type MotionValue,
} from "framer-motion";
import { Check } from "lucide-react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useLenis } from "@/lib/hooks";
import { T, Reveal, Tag, Button, Tilt } from "@/components/system";
import {
  EASE,
  Preloader,
  MaskedWords,
  VelocityMarquee,
  CursorDot,
  ScrollProgress,
  GlowOrbs,
  ImageTrail,
  DepthWords,
  Parallax,
  Spotlight,
  ScaleIn,
} from "@/components/cinema";

gsap.registerPlugin(ScrollTrigger);

const SHELL = "mx-auto w-full max-w-[1440px] px-5 sm:px-8 lg:px-16";

/* =========================================================================
   PAGE — cinematic cut: preloader → hero → marquee → assembly (pinned)
   → editorial showcase → pricing → word-scrub CTA → footer wordmark.
   ========================================================================= */
export default function Home() {
  useLenis();
  const [ready, setReady] = useState(false);

  return (
    <main className="brandos bo-grain relative min-h-screen overflow-x-hidden antialiased">
      {!ready && <Preloader onComplete={() => setReady(true)} />}
      <CursorDot />
      <ScrollProgress />
      <GridOverlay />

      <InkDip />

      <div className="relative z-10">
        <Nav />
        <Hero ready={ready} />
        <div id="band1" className="bo-hero-ink">
          <MarqueeBand
            dark
            words={["Audience", "Angle", "Campaign", "Deshly"]}
            className="border-y border-[#F5EFE3]/12 py-6 md:py-8"
          />
        </div>
        <Assembly />
        <Showcase />
        <Pricing />
        <MarqueeBand
          words={["Generate", "Publish", "Grow", "Repeat"]}
          baseVelocity={-2.2}
          className="border-y bo-rule py-6 md:py-8"
        />
        <FinalCTA />
        <Footer />
      </div>
    </main>
  );
}

/* =========================================================================
   INK DIP — one long dark act. The page opens on ink and stays there
   through the hero, the marquee, and the assembly. On desktop the
   assembly's own pinned timeline floods the light back in as the campaign
   locks (see Assembly); on mobile (no pin) a simple scrub handles it here.
   ========================================================================= */
function InkDip() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const mainEl = document.querySelector("main.brandos");
    if (!mainEl) return;

    const mm = gsap.matchMedia();
    const ctx = gsap.context(() => {
      /* the page opens dark — the preloader covers this being applied */
      gsap.set(mainEl, { backgroundColor: "#0F0F0F" });

      mm.add("(max-width: 1023px)", () => {
        gsap.fromTo(
          mainEl,
          { backgroundColor: "#0F0F0F" },
          {
            backgroundColor: "#F6F3EE",
            ease: "none",
            immediateRender: false,
            scrollTrigger: {
              trigger: "#example",
              start: "top 95%",
              end: "top 55%",
              scrub: true,
            },
          },
        );
      });
    });
    return () => {
      mm.revert();
      ctx.revert();
    };
  }, []);
  return null;
}

/* =========================================================================
   STATIC GRID OVERLAY
   ========================================================================= */
function GridOverlay() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-0 hidden lg:block opacity-60"
    >
      <div className="mx-auto h-full max-w-[1440px] px-16">
        <div className="grid h-full grid-cols-12 border-r bo-rule">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="border-l bo-rule" />
          ))}
        </div>
      </div>
    </div>
  );
}

/* =========================================================================
   NAV — hides on scroll down, returns on scroll up. Blur once moving.
   Live clock: the "system is running" editorial detail.
   ========================================================================= */
function useClock() {
  const [t, setT] = useState("");
  useEffect(() => {
    const tick = () =>
      setT(new Date().toLocaleTimeString("en-GB", { hour12: false }));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);
  return t;
}

function Nav() {
  const { scrollY } = useScroll();
  const [scrolled, setScrolled] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [dark, setDark] = useState(true);
  const reduce = useReducedMotion();
  const clock = useClock();

  useMotionValueEvent(scrollY, "change", (v) => {
    const prev = scrollY.getPrevious() ?? 0;
    setScrolled(v > 24);
    setHidden(v > prev && v > 180);

    /* the bar is glass, so the text must follow whatever surface sits
       behind it. GSAP animates the page surface ink → paper (Assembly's
       light flood / InkDip on mobile), so read the live color instead of
       guessing from the scroll offset. */
    if (reduce) {
      /* reduced motion: the dark act is painted by CSS, not GSAP — it
         spans the hero through the assembly section (#how) */
      const how = document.getElementById("how");
      setDark(how ? how.getBoundingClientRect().bottom > 68 : false);
      return;
    }
    const mainEl = document.querySelector("main.brandos");
    if (!mainEl) return;
    const rgb = getComputedStyle(mainEl).backgroundColor.match(/\d+(\.\d+)?/g);
    if (rgb) {
      const [r, g, b] = rgb.map(Number);
      setDark(0.299 * r + 0.587 * g + 0.114 * b < 128);
    }
  });

  return (
    <motion.nav
      initial={false}
      animate={{ y: hidden ? "-110%" : "0%" }}
      transition={{ duration: 0.55, ease: EASE }}
      className={`fixed inset-x-0 top-0 z-50 transition-colors duration-500 ${
        scrolled
          ? `backdrop-blur-xl backdrop-saturate-150 border-b ${
              dark
                ? "bg-white/[0.06] border-white/10"
                : "bg-white/[0.35] border-black/10"
            }`
          : "border-b border-transparent"
      }`}
    >
      {/* neutral glass — the ink/cream text flips with the surface behind */}
      <div className={`${SHELL} h-[68px] flex items-center justify-between`}>
        <Link
          href="/"
          className={`font-display text-xl font-semibold tracking-[-0.03em] transition-colors duration-500 ${
            dark ? "text-[#F5EFE3]" : "text-[#0F0F0F]"
          }`}
        >
          Deshly<span className="text-[#D5613E]">.</span>
        </Link>

        <div
          className={`hidden md:flex items-center gap-8 ${T.monoLabel} transition-colors duration-500 ${
            dark ? "text-[#F5EFE3]/60" : "text-[#0F0F0F]/60"
          }`}
        >
          <a
            href="#how"
            className={`transition-colors ${dark ? "hover:text-[#F5EFE3]" : "hover:text-[#0F0F0F]"}`}
          >
            How it works
          </a>
          <a
            href="#example"
            className={`transition-colors ${dark ? "hover:text-[#F5EFE3]" : "hover:text-[#0F0F0F]"}`}
          >
            Showcase
          </a>
          <a
            href="#pricing"
            className={`transition-colors ${dark ? "hover:text-[#F5EFE3]" : "hover:text-[#0F0F0F]"}`}
          >
            Pricing
          </a>
          <Link
            href="/docs"
            className={`transition-colors ${dark ? "hover:text-[#F5EFE3]" : "hover:text-[#0F0F0F]"}`}
          >
            Docs
          </Link>
        </div>

        <div className="flex items-center gap-6">
          <span
            aria-hidden
            className={`hidden lg:block ${T.monoData} tabular-nums transition-colors duration-500 ${
              dark ? "text-[#F5EFE3]/40" : "text-[#0F0F0F]/40"
            }`}
          >
            {clock && `Local ${clock}`}
          </span>
          <Button
            href="/brand-dna"
            arrow={false}
            className={`!px-5 !py-2.5 transition-colors duration-500 ${
              dark
                ? "!bg-[#F5EFE3] !text-[#0F0F0F] hover:!bg-[#D5613E] hover:!text-[#F6F3EE]"
                : ""
            }`}
          >
            Get Access
          </Button>
        </div>
      </div>
    </motion.nav>
  );
}

/* =========================================================================
   §01 — HERO : masked-line headline gated on the preloader, typewriter
   placeholder, content parallaxes away as you leave.
   ========================================================================= */
const IDEAS = [
  "Monsoon kurta for Eid",
  "Vitamin-C glow serum",
  "Retro runner sneakers",
  "Handloom saree drop",
];

function useTypewriter(phrases: string[]) {
  const [text, setText] = useState("");
  useEffect(() => {
    let phrase = 0;
    let char = 0;
    let deleting = false;
    let timer: ReturnType<typeof setTimeout>;

    const step = () => {
      const full = phrases[phrase];
      if (!deleting) {
        char++;
        setText(full.slice(0, char));
        if (char === full.length) {
          deleting = true;
          timer = setTimeout(step, 1700);
          return;
        }
        timer = setTimeout(step, 55);
      } else {
        char--;
        setText(full.slice(0, char));
        if (char === 0) {
          deleting = false;
          phrase = (phrase + 1) % phrases.length;
        }
        timer = setTimeout(step, 26);
      }
    };
    timer = setTimeout(step, 900);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return text;
}

/* floating product card — mouse parallax (depth) + idle drift + scroll
   scatter: each card leaves the hero at its own speed (`drift` px by 900px
   of scroll), so the composition pulls apart in layers instead of as one.
   Cards sit fully inside the viewport (xl+ only — narrower screens have no
   flank room) and the headline is sized so the two never overlap, even with
   the mouse-parallax push and the card rotation figured in. */
function FloatCard({
  mx,
  my,
  depth,
  drift = 0,
  pos,
  rot,
  float,
  ready,
  delay,
  children,
}: {
  mx: MotionValue<number>;
  my: MotionValue<number>;
  depth: number;
  drift?: number;
  pos: string;
  rot: string;
  float: string;
  ready: boolean;
  delay: number;
  children: React.ReactNode;
}) {
  const reduce = useReducedMotion();
  const { scrollY } = useScroll();
  const x = useTransform(mx, (v) => v * depth);
  const sy = useTransform(scrollY, [0, 900], [0, reduce ? 0 : drift]);
  const y = useTransform(() => my.get() * depth * 0.75 + sy.get());
  return (
    <motion.div
      aria-hidden
      style={{ x, y }}
      initial={{ opacity: 0, scale: 0.8, filter: "blur(10px)" }}
      animate={
        ready
          ? { opacity: 1, scale: 1, filter: "blur(0px)" }
          : { opacity: 0, scale: 0.8, filter: "blur(10px)" }
      }
      transition={{ duration: 1, ease: EASE, delay }}
      className={`pointer-events-none absolute hidden xl:block ${pos}`}
    >
      <div className={rot}>
        <div className={float}>{children}</div>
      </div>
    </motion.div>
  );
}

function Hero({ ready }: { ready: boolean }) {
  const [product, setProduct] = useState("");
  const placeholder = useTypewriter(IDEAS);
  const reduce = useReducedMotion();

  const { scrollY } = useScroll();
  const away = useTransform(scrollY, [0, 700], [0, 110]);
  const opacity = useTransform(scrollY, [0, 600], [1, 0.15]);

  /* mouse parallax — normalized -0.5..0.5, spring-smoothed */
  const mxRaw = useMotionValue(0);
  const myRaw = useMotionValue(0);
  const mx = useSpring(mxRaw, { stiffness: 60, damping: 20, mass: 0.6 });
  const my = useSpring(myRaw, { stiffness: 60, damping: 20, mass: 0.6 });
  const onMouse = (e: React.MouseEvent) => {
    if (reduce) return;
    mxRaw.set(e.clientX / window.innerWidth - 0.5);
    myRaw.set(e.clientY / window.innerHeight - 0.5);
  };

  const fade = (delay: number) => ({
    initial: { opacity: 0, y: 16 },
    animate: ready ? { opacity: 1, y: 0 } : { opacity: 0, y: 16 },
    transition: { duration: 0.7, ease: EASE, delay },
  });

  const imgCard =
    "overflow-hidden rounded-2xl border border-[#F5EFE3]/12 bg-[#181614] shadow-[0_30px_70px_-20px_rgba(0,0,0,0.75)]";

  return (
    <header
      onMouseMove={onMouse}
      className="bo-hero-ink relative min-h-screen flex flex-col justify-center overflow-hidden text-[#F5EFE3]"
    >
      {/* animated background — brand glow orbs + cursor spotlight */}
      <GlowOrbs />
      <Spotlight />

      {/* floating product cards — drift with the mouse at different depths */}
      <FloatCard
        mx={mx}
        my={my}
        depth={-26}
        drift={150}
        ready={ready}
        delay={0.9}
        pos="left-[5%] top-[16%]"
        rot="-rotate-6"
        float="bo-float"
      >
        <div className={`${imgCard} w-36 2xl:w-44 aspect-[4/5]`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/assets/sneakers.png"
            alt=""
            className="h-full w-full object-cover"
          />
        </div>
      </FloatCard>

      <FloatCard
        mx={mx}
        my={my}
        depth={38}
        drift={-190}
        ready={ready}
        delay={1.05}
        pos="right-[5%] top-[13%]"
        rot="rotate-[5deg]"
        float="bo-float-slow"
      >
        <div className={`${imgCard} w-32 2xl:w-40 aspect-[4/5]`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/assets/skincare.jpg"
            alt=""
            className="h-full w-full object-cover"
          />
        </div>
      </FloatCard>

      <FloatCard
        mx={mx}
        my={my}
        depth={46}
        drift={-120}
        ready={ready}
        delay={1.2}
        pos="left-[6%] bottom-[13%]"
        rot="rotate-[4deg]"
        float="bo-float-slower"
      >
        <div className={`${imgCard} w-32 2xl:w-40 aspect-[4/5]`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/assets/sunglass.jpg"
            alt=""
            className="h-full w-full object-cover"
          />
        </div>
      </FloatCard>

      <FloatCard
        mx={mx}
        my={my}
        depth={-34}
        drift={210}
        ready={ready}
        delay={1.35}
        pos="right-[5%] bottom-[19%]"
        rot="-rotate-3"
        float="bo-float"
      >
        <div className="rounded-2xl border border-[#F5EFE3]/12 bg-[#181614] px-5 py-4 shadow-[0_30px_70px_-20px_rgba(0,0,0,0.75)]">
          <span
            className={`${T.monoLabel} text-[#F5EFE3]/50 flex items-center gap-2 mb-1.5`}
          >
            Matched audience
            <span className="w-1.5 h-1.5 rounded-full bg-[#E8835C] bo-pulse" />
          </span>
          <span className="font-display text-lg font-medium tracking-[-0.01em]">
            Urban Style Buyers
          </span>
        </div>
      </FloatCard>

      {/* centered monolith — the camera dollies in as the curtain lifts */}
      <motion.div
        style={{ y: away, opacity }}
        className={`${SHELL} relative z-10 pt-24 pb-16 text-center`}
      >
        <motion.div
          initial={false}
          animate={{ scale: ready || reduce ? 1 : 1.045 }}
          transition={{ duration: 2.6, ease: EASE }}
        >
          <motion.div {...fade(0.1)} className="flex justify-center">
            <span
              className={`inline-flex items-center gap-3 ${T.monoLabel} text-[#F5EFE3]/55`}
            >
              <span>The AI Campaign Copilot</span>
              <span className="w-1.5 h-1.5 rounded-full bg-[#D5613E] bo-pulse" />
            </span>
          </motion.div>

          <h1 className="mt-8 font-display font-semibold tracking-[-0.03em] leading-[0.96] text-[clamp(2.75rem,6vw,5.5rem)] mx-auto max-w-5xl">
            <MaskedWords
              play={ready}
              delay={0.2}
              accentClassName="text-[#E8835C]"
              lines={[
                [{ t: "Find the right" }],
                [{ t: "audience. Generate" }],
                [{ t: "the" }, { t: "campaign.", accent: true }],
              ]}
            />
          </h1>

          <motion.p
            {...fade(0.75)}
            className="mx-auto max-w-2xl mt-7 tracking-[-0.01em] leading-[1.3] text-[clamp(1.18rem,1.8vw,1.4rem)] text-[#F5EFE3]/60"
          >
            Tell Deshly what you&apos;re marketing. It recommends who to target,
            what angle to use, and what to publish.
          </motion.p>

          <motion.div
            {...fade(0.9)}
            className="mt-10 mx-auto max-w-xl text-left"
          >
            <label
              htmlFor="product"
              className={`${T.monoLabel} text-[#F5EFE3]/50 block mb-2.5 text-center`}
            >
              What are you marketing today?
            </label>
            <input
              id="product"
              type="text"
              value={product}
              onChange={(e) => setProduct(e.target.value)}
              placeholder={placeholder || " "}
              className={`w-full rounded-lg border border-[#F5EFE3]/15 bg-[#181614] px-5 py-4 ${T.body} !text-[#F5EFE3] placeholder:text-[#F5EFE3]/35 outline-none transition-all duration-300 focus:border-[#E8835C] focus:shadow-[0_0_44px_rgba(213,97,62,0.25)]`}
            />
            <div className="mt-4">
              <Button
                href="/brand-dna"
                full
                magnetic
                arrow={false}
                className="!bg-[#F5EFE3] !text-[#0F0F0F] hover:!bg-[#D5613E] hover:!text-[#F6F3EE]"
              >
                Generate campaign
              </Button>
            </div>
          </motion.div>

          <motion.div {...fade(1.05)} className="mt-5">
            <span className={`${T.monoData} text-[#F5EFE3]/40`}>
              No dashboard. No research report. Just campaign direction.
            </span>
          </motion.div>
        </motion.div>
      </motion.div>

      {/* scroll indicator */}
      <motion.div
        {...fade(1.3)}
        className="absolute bottom-6 left-1/2 -translate-x-1/2 hidden md:flex flex-col items-center gap-3"
      >
        <span className={`${T.monoLabel} text-[#F5EFE3]/40`}>Scroll</span>
        <span className="relative block h-10 w-px overflow-hidden bg-[#F5EFE3]/15">
          <span className="absolute inset-x-0 h-1/2 bg-[#D5613E] bo-scroll-line" />
        </span>
      </motion.div>
    </header>
  );
}

/* =========================================================================
   MARQUEE BAND — giant display type, scroll-velocity reactive.
   ========================================================================= */
function MarqueeBand({
  words,
  className = "",
  baseVelocity = 2.2,
  dark = false,
}: {
  words: string[];
  className?: string;
  baseVelocity?: number;
  dark?: boolean;
}) {
  return (
    <VelocityMarquee baseVelocity={baseVelocity} className={className}>
      {words.map((w, i) => (
        <span key={w} className="flex items-center">
          <span
            className={`font-display font-semibold tracking-[-0.03em] leading-none text-[clamp(2.5rem,6vw,5rem)] px-6 md:px-10 ${
              i % 2 === 1
                ? dark
                  ? "bo-outline-text-dark"
                  : "bo-outline-text"
                : dark
                  ? "text-[#F5EFE3]"
                  : "text-[#0F0F0F]"
            }`}
          >
            {w}
          </span>
          <span className="text-[#D5613E] text-[clamp(1.2rem,2.5vw,2rem)]">
            ✺
          </span>
        </span>
      ))}
    </VelocityMarquee>
  );
}

/* =========================================================================
   SECTION SHELL
   ========================================================================= */
function Section({
  id,
  index,
  label,
  children,
}: {
  id?: string;
  index: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <section
      id={id}
      className="relative scroll-mt-24 border-t bo-rule overflow-hidden"
    >
      {/* the section rule draws itself across as the section arrives */}
      <motion.span
        aria-hidden
        initial={{ scaleX: 0 }}
        whileInView={{ scaleX: 1 }}
        viewport={{ once: true, margin: "-6% 0px" }}
        transition={{ duration: 1.4, ease: EASE }}
        className="absolute -top-px left-0 z-10 h-px w-full origin-left bg-[#0F0F0F]/25"
      />

      {/* ghost numeral — drifts slower than the page for a depth layer */}
      <Parallax
        speed={-70}
        className="pointer-events-none absolute top-10 right-1 lg:right-12 z-0"
      >
        <span
          aria-hidden
          className="block select-none font-display font-semibold leading-none tracking-[-0.05em] text-[clamp(8rem,20vw,17rem)] text-[#0F0F0F]/[0.045]"
        >
          {index}
        </span>
      </Parallax>

      <div className={`${SHELL} py-20 md:py-28 relative`}>
        <span className="absolute top-0 left-5 sm:left-8 lg:left-16 w-6 h-px bg-[#D5613E]" />
        <Reveal className="mb-12">
          <Tag index={index}>{label}</Tag>
        </Reveal>
        {children}
      </div>
    </section>
  );
}

/* =========================================================================
   §02 — ASSEMBLY : the pinned "exploded view". One product goes in; as you
   scroll, the campaign package flies together piece by piece and locks.
   Desktop = scrubbed GSAP timeline with pin. Mobile = staggered reveals.
   ========================================================================= */
const STEPS = ["Product", "Audience", "Campaign"];
const ASSEMBLY_LOG = [
  "Reading product context…",
  "Matching audience clusters…",
  "Campaign assembled — ready to publish",
];

function Assembly() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [step, setStep] = useState(0);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;

    const mm = gsap.matchMedia();
    mm.add(
      "(min-width: 1024px) and (prefers-reduced-motion: no-preference)",
      () => {
        const q = gsap.utils.selector(el);
        const mainEl = document.querySelector("main.brandos");
        const tl = gsap.timeline({
          defaults: { ease: "none" },
          scrollTrigger: {
            trigger: el,
            start: "top top",
            end: "+=170%",
            scrub: 0.5,
            pin: true,
            anticipatePin: 1,
            onUpdate: (self) => {
              setStep(self.progress < 0.28 ? 0 : self.progress < 0.6 ? 1 : 2);
            },
          },
        });

        /* camera settle — the whole composition tilts up into place while
           the pieces fly in */
        tl.from(
          q("[data-comp]"),
          {
            rotateX: 9,
            y: 60,
            transformPerspective: 1100,
            transformOrigin: "center top",
            duration: 0.3,
          },
          0,
        );

        tl.from(
          q('[data-piece="image"]'),
          {
            x: -320,
            y: 140,
            rotate: -12,
            scale: 0.85,
            opacity: 0,
            duration: 0.3,
          },
          0.02,
        )
          .from(
            q('[data-piece="persona"]'),
            { x: 360, y: -170, rotate: 10, opacity: 0, duration: 0.28 },
            0.16,
          )
          .from(
            q('[data-piece="caption"]'),
            { x: 430, y: 90, rotate: -8, opacity: 0, duration: 0.28 },
            0.32,
          )
          .from(
            q('[data-piece="hashtags"]'),
            { y: 260, rotate: 6, opacity: 0, duration: 0.26 },
            0.48,
          )
          .from(
            q('[data-piece="whatsapp"]'),
            { x: 340, y: 230, rotate: 12, opacity: 0, duration: 0.26 },
            0.62,
          )
          .from(
            q('[data-piece="stamp"]'),
            {
              scale: 2.6,
              rotate: -26,
              opacity: 0,
              duration: 0.12,
              ease: "power3.in",
            },
            0.86,
          );

        /* scan beam — the product is "read" before anything matches */
        tl.fromTo(
          q("[data-scan]"),
          { top: "-25%", autoAlpha: 1 },
          { top: "108%", duration: 0.34 },
          0.04,
        ).to(q("[data-scan]"), { autoAlpha: 0, duration: 0.04 }, 0.4);

        /* the match score ticks 0.00 → 0.92 as the audience locks */
        const numEl = q("[data-match-num]")[0] as HTMLElement | undefined;
        const score = { v: 0 };
        if (numEl) numEl.textContent = "0.00";
        tl.fromTo(
          q("[data-match-fill]"),
          { width: "0%" },
          { width: "92%", duration: 0.16 },
          0.46,
        ).to(
          score,
          {
            v: 0.92,
            duration: 0.16,
            onUpdate: () => {
              if (numEl) numEl.textContent = score.v.toFixed(2);
            },
          },
          0.46,
        );

        /* the campaign locks → the light floods back in for the next act.
           Living inside this scrubbed timeline means it can never fire early.
           The section's cream type crossfades to ink in the same beat. */
        if (mainEl) {
          tl.to(mainEl, { backgroundColor: "#F6F3EE", duration: 0.1 }, 0.9);
        }
        tl.to(
          q("[data-ink-flip-strong]"),
          { color: "#0F0F0F", duration: 0.1 },
          0.9,
        )
          .to(
            q("[data-ink-flip]"),
            { color: "rgba(15,15,15,0.55)", duration: 0.1 },
            0.9,
          )
          .to({}, { duration: 0.04 });

        /* mm cleanup — restore the static score for the no-timeline state */
        return () => {
          if (numEl) numEl.textContent = "0.92";
        };
      },
    );
    return () => mm.revert();
  }, []);

  /* dark act — existing brand darks (ink surface, cream, terracotta glow) */
  const card =
    "rounded-2xl border border-[#F5EFE3]/12 bg-[#181614] shadow-[0_18px_44px_-24px_rgba(0,0,0,0.6)]";

  return (
    <section
      id="how"
      ref={wrapRef}
      className="bo-hero-ink relative text-[#F5EFE3]"
    >
      {/* dimmer orbs behind the assembly so the cards stay legible */}
      <GlowOrbs opacity={0.55} />
      <Spotlight />

      <div
        className={`${SHELL} relative z-10 min-h-screen flex flex-col justify-center py-16 md:py-20`}
      >
        <div className="flex flex-wrap items-end justify-between gap-6 mb-10 md:mb-12">
          <div>
            <Reveal>
              <span
                data-ink-flip
                className={`inline-flex items-center gap-3 ${T.monoLabel} text-[#F5EFE3]/55`}
              >
                <span className="text-[#E8835C]">02</span>
                <span className="w-8 h-px bg-[#F5EFE3]/25" />
                <span>How it works</span>
              </span>
            </Reveal>
            <Reveal delay={0.06} className="mt-6">
              <h2 data-ink-flip-strong className={T.displayM}>
                One input. A campaign{" "}
                <span className="text-[#E8835C]">assembles itself.</span>
              </h2>
            </Reveal>

            {/* live status line — swaps with the scrub-driven step */}
            <div
              aria-hidden
              className="hidden lg:block mt-5 h-5 overflow-hidden"
            >
              <AnimatePresence mode="wait">
                <motion.div
                  key={step}
                  initial={{ y: 16, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: -16, opacity: 0 }}
                  transition={{ duration: 0.3, ease: EASE }}
                  className={`${T.monoData} text-[#E8835C]/85`}
                >
                  ▸ {ASSEMBLY_LOG[step]}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>

          {/* step rail — driven by scroll progress on desktop */}
          <div className="hidden lg:flex items-center gap-8">
            {STEPS.map((s, i) => (
              <span
                key={s}
                className={`flex items-center gap-2.5 ${T.monoLabel} transition-colors duration-300 ${
                  step >= i ? "text-[#E8835C]" : "text-[#F5EFE3]/35"
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full transition-colors duration-300 ${
                    step >= i ? "bg-[#E8835C]" : "bg-[#F5EFE3]/20"
                  }`}
                />
                0{i + 1} — {s}
              </span>
            ))}
          </div>
        </div>

        {/* the composition — final locked layout; GSAP explodes FROM offsets */}
        <div data-comp className="relative mx-auto w-full max-w-5xl">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
            {/* product input card */}
            <Reveal className="lg:col-span-4" as="div">
              <figure
                data-piece="image"
                className={`${card} overflow-hidden m-0 h-full flex flex-col`}
              >
                <div
                  className={`flex items-center justify-between px-5 py-3.5 border-b border-[#F5EFE3]/12 ${T.monoLabel} text-[#F5EFE3]/50`}
                >
                  <span>Input — Product</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-[#E8835C] bo-pulse" />
                </div>
                <div className="relative flex-1 min-h-[280px] overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/assets/skincare.jpg"
                    alt="Skincare product used as the campaign input"
                    className="h-full w-full object-cover"
                  />
                  {/* scan beam — sweeps the image during the read phase */}
                  <div
                    data-scan
                    aria-hidden
                    className="pointer-events-none absolute inset-x-0 hidden lg:block"
                    style={{ top: "-25%", opacity: 0 }}
                  >
                    <div className="h-px bg-[#E8835C] shadow-[0_0_18px_rgba(232,131,92,0.9)]" />
                    <div className="h-16 bg-gradient-to-b from-[#E8835C]/25 to-transparent" />
                  </div>
                </div>
                <div
                  className={`px-5 py-3 border-t border-[#F5EFE3]/12 ${T.monoData} text-[#F5EFE3]/40`}
                >
                  hydration-serum.jpg
                </div>
              </figure>
            </Reveal>

            <div className="lg:col-span-8 grid gap-5">
              {/* matched audience */}
              <Reveal delay={0.05}>
                <div data-piece="persona" className={`${card} p-6`}>
                  <div className={`${T.monoLabel} text-[#F5EFE3]/50 mb-3`}>
                    Matched audience
                  </div>
                  <div className={`${T.heading} mb-4`}>
                    Skincare Routine Shoppers
                  </div>
                  {/* dark meter */}
                  <div className="flex items-center gap-3">
                    <span
                      className={`${T.monoData} text-[#F5EFE3]/45 w-20 shrink-0`}
                    >
                      Match
                    </span>
                    <span className="relative h-1 flex-1 rounded-full bg-[#F5EFE3]/12 overflow-hidden">
                      <span
                        data-match-fill
                        className="absolute inset-y-0 left-0 rounded-full bg-[#E8835C]"
                        style={{ width: "92%" }}
                      />
                    </span>
                    <span
                      data-match-num
                      className={`${T.monoData} text-[#F5EFE3]/55 w-9 text-right tabular-nums`}
                    >
                      0.92
                    </span>
                  </div>
                </div>
              </Reveal>

              {/* caption */}
              <Reveal delay={0.1}>
                <div data-piece="caption" className={`${card} p-6`}>
                  <div className={`${T.monoLabel} text-[#F5EFE3]/50 mb-3`}>
                    Caption
                  </div>
                  <p className="font-display text-xl md:text-2xl leading-snug tracking-[-0.01em]">
                    &ldquo;Give your skin the fresh, hydrated reset it deserves
                    every day.&rdquo;
                  </p>
                </div>
              </Reveal>

              <div className="grid sm:grid-cols-2 gap-5">
                {/* hashtags */}
                <Reveal delay={0.15}>
                  <div data-piece="hashtags" className={`${card} p-6 h-full`}>
                    <div className={`${T.monoLabel} text-[#F5EFE3]/50 mb-4`}>
                      Hashtags
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {["#dailyglow", "#skincareroutine", "#hydration"].map(
                        (h) => (
                          <span
                            key={h}
                            className={`${T.monoData} rounded-full border border-[#F5EFE3]/25 px-3 py-1.5 text-[#F5EFE3]/70`}
                          >
                            {h}
                          </span>
                        ),
                      )}
                    </div>
                  </div>
                </Reveal>

                {/* whatsapp copy */}
                <Reveal delay={0.2}>
                  <div data-piece="whatsapp" className={`${card} p-6 h-full`}>
                    <div className={`${T.monoLabel} text-[#F5EFE3]/50 mb-4`}>
                      WhatsApp
                    </div>
                    <div className="rounded-2xl rounded-tl-sm bg-[#F5EFE3]/10 px-4 py-3">
                      <p className={`${T.bodyS} !text-[#F5EFE3]/80`}>
                        The hydration serum is back in stock — want the link
                        before it goes again?
                      </p>
                    </div>
                  </div>
                </Reveal>
              </div>
            </div>
          </div>

          {/* stamp — slams in at the end, glows on ink */}
          <div
            data-piece="stamp"
            className="absolute -top-5 -right-2 md:-right-5 rotate-[7deg] rounded-lg border-2 border-[#D5613E] bg-[#0F0F0F] px-4 py-2 shadow-[0_0_36px_rgba(213,97,62,0.45)]"
          >
            <span className={`${T.monoLabel} text-[#E8835C]`}>
              Ready to publish ✺
            </span>
          </div>
        </div>

        <div className="mt-8 text-center">
          <span data-ink-flip className={`${T.monoData} text-[#F5EFE3]/35`}>
            Illustrative example — generate your own in minutes.
          </span>
        </div>
      </div>
    </section>
  );
}

/* =========================================================================
   §03 — SHOWCASE : pinned horizontal filmstrip. The page scrolls sideways
   through campaign frames; each image counter-drifts for depth. Vertical
   stack on mobile / reduced motion.
   ========================================================================= */
const SHOWCASE = [
  {
    src: "/assets/sneakers.png",
    alt: "Sneakers styled for an everyday city look",
    persona: "Urban Style Buyers",
    caption:
      "Built for city walks, coffee runs, and everything your day turns into.",
  },
  {
    src: "/assets/skincare.jpg",
    alt: "Skincare product for a daily hydration routine",
    persona: "Skincare Routine Shoppers",
    caption: "Give your skin the fresh, hydrated reset it deserves every day.",
  },
  {
    src: "/assets/sunglass.jpg",
    alt: "Sunglasses for a relaxed weekend lifestyle",
    persona: "Weekend Lifestyle Shoppers",
    caption:
      "For slow mornings, sunny plans, and that effortless off-duty look.",
  },
];

function Showcase() {
  const sectionRef = useRef<HTMLElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const section = sectionRef.current;
    const track = trackRef.current;
    if (!section || !track) return;

    const mm = gsap.matchMedia();
    mm.add(
      "(min-width: 1024px) and (prefers-reduced-motion: no-preference)",
      () => {
        const amount = () => track.scrollWidth - window.innerWidth;
        const tween = gsap.to(track, {
          x: () => -amount(),
          ease: "none",
          scrollTrigger: {
            trigger: section,
            start: "top top",
            end: () => "+=" + amount(),
            scrub: 0.6,
            pin: true,
            anticipatePin: 1,
            invalidateOnRefresh: true,
            onUpdate: (self) => {
              if (progressRef.current)
                progressRef.current.style.transform = `scaleX(${self.progress})`;
            },
          },
        });

        /* giant outline phrase drifts behind the strip at half speed */
        gsap.to(section.querySelectorAll("[data-showcase-ghost]"), {
          xPercent: -42,
          ease: "none",
          scrollTrigger: {
            trigger: section,
            start: "top top",
            end: () => "+=" + amount(),
            scrub: 0.6,
            invalidateOnRefresh: true,
          },
        });

        /* each frame unmasks as it enters from the right */
        track
          .querySelectorAll<HTMLElement>("[data-strip-frame]")
          .forEach((el) => {
            gsap.fromTo(
              el,
              { clipPath: "inset(0% 52% 0% 0% round 28px)" },
              {
                clipPath: "inset(0% 0% 0% 0% round 28px)",
                ease: "none",
                scrollTrigger: {
                  trigger: el.closest("figure"),
                  containerAnimation: tween,
                  start: "left 100%",
                  end: "left 52%",
                  scrub: true,
                },
              },
            );
          });

        /* depth: each image counter-drifts inside its mask as it crosses */
        track
          .querySelectorAll<HTMLElement>("[data-strip-img]")
          .forEach((img) => {
            gsap.fromTo(
              img,
              { xPercent: -6, scale: 1.15 },
              {
                xPercent: 6,
                scale: 1.15,
                ease: "none",
                scrollTrigger: {
                  trigger: img.closest("figure"),
                  containerAnimation: tween,
                  start: "left right",
                  end: "right left",
                  scrub: true,
                },
              },
            );
          });

        /* the ghost indices lag the strip — a slower background plane */
        track
          .querySelectorAll<HTMLElement>("[data-ghost-num]")
          .forEach((el) => {
            gsap.fromTo(
              el,
              { x: -80 },
              {
                x: 80,
                ease: "none",
                scrollTrigger: {
                  trigger: el.closest("figure"),
                  containerAnimation: tween,
                  start: "left right",
                  end: "right left",
                  scrub: true,
                },
              },
            );
          });

        /* alternate frames drift vertically in opposite directions while the
           captions hold still — the strip reads as layered, not flat */
        track
          .querySelectorAll<HTMLElement>("[data-strip-frame]")
          .forEach((el, i) => {
            const dir = i % 2 === 0 ? 1 : -1;
            gsap.fromTo(
              el,
              { y: 34 * dir },
              {
                y: -34 * dir,
                ease: "none",
                scrollTrigger: {
                  trigger: el.closest("figure"),
                  containerAnimation: tween,
                  start: "left right",
                  end: "right left",
                  scrub: true,
                },
              },
            );
          });
      },
    );
    return () => mm.revert();
  }, []);

  return (
    <section
      id="example"
      ref={sectionRef}
      className="relative scroll-mt-24 border-t bo-rule"
    >
      <div className="relative lg:h-screen lg:overflow-hidden flex lg:items-center py-20 lg:py-0">
        {/* background plane — giant outline phrase, drifting slower than
            the strip for depth */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-y-0 left-0 hidden lg:flex items-center select-none"
        >
          <span
            data-showcase-ghost
            className="bo-outline-text font-display font-semibold tracking-[-0.03em] leading-none whitespace-nowrap text-[13vw] opacity-40 will-change-transform"
          >
            Audience ✺ Angle ✺ Campaign ✺ Audience ✺ Angle ✺ Campaign
          </span>
        </div>
        <div
          ref={trackRef}
          className="flex flex-col lg:flex-row items-center lg:items-center lg:w-max gap-16 lg:gap-[6vw] px-5 sm:px-8 lg:px-[7vw] w-full lg:will-change-transform"
        >
          {/* intro frame */}
          <div className="w-full lg:w-[36vw] shrink-0">
            <Reveal>
              <Tag index="03">Campaign showcase</Tag>
            </Reveal>
            <Reveal delay={0.06} className="mt-6">
              <h2 className={T.displayL}>
                Campaigns that feel{" "}
                <span className="text-[#D5613E]">ready to publish.</span>
              </h2>
            </Reveal>
            <Reveal delay={0.12} className="mt-6 max-w-md">
              <p className={T.body}>
                Deshly turns product context into audience-ready creative — the
                who, the angle, and the words, in one pass.
              </p>
            </Reveal>
            <Reveal
              delay={0.18}
              className="mt-10 hidden lg:flex items-center gap-4"
            >
              <span className={`${T.monoLabel} text-[#0F0F0F]/40`}>Scroll</span>
              <span className="w-10 h-px bg-[#0F0F0F]/25" />
              <span className="text-[#D5613E]">→</span>
            </Reveal>
          </div>

          {/* frames */}
          {SHOWCASE.map((item, i) => (
            <figure
              key={item.src}
              className="group relative m-0 w-full max-w-[440px] lg:max-w-none lg:w-[30vw] xl:w-[27vw] shrink-0"
              data-cursor="View"
            >
              {/* ghost index behind the frame */}
              <span
                aria-hidden
                data-ghost-num
                className="pointer-events-none absolute -top-14 -left-3 lg:-top-20 lg:-left-6 font-display font-semibold leading-none tracking-[-0.04em] text-[clamp(5rem,10vw,9rem)] text-[#0F0F0F]/[0.07] select-none will-change-transform"
              >
                0{i + 1}
              </span>

              <div
                data-strip-frame
                className="relative overflow-hidden rounded-[28px] bg-[#EDE8DE] aspect-[3/4] shadow-[0_24px_60px_-18px_rgba(15,15,15,0.28)] will-change-transform"
              >
                <div className="h-full w-full transition-transform duration-700 ease-out group-hover:scale-[1.04]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    data-strip-img
                    src={item.src}
                    alt={item.alt}
                    loading="lazy"
                    className="h-full w-full object-cover will-change-transform"
                    style={{ transform: "scale(1.15)" }}
                  />
                </div>

                {/* hover caption capsule */}
                <div className="pointer-events-none absolute inset-x-4 bottom-4 translate-y-3 opacity-0 transition-all duration-500 ease-out group-hover:translate-y-0 group-hover:opacity-100">
                  <div className="rounded-[20px] border border-white/50 bg-[#F6F3EE]/90 px-5 py-4 shadow-[0_12px_32px_rgba(15,15,15,0.18)] backdrop-blur-md">
                    <span
                      className={`${T.monoLabel} text-[#D5613E] block mb-1`}
                    >
                      {item.persona}
                    </span>
                    <p className="text-[15px] leading-snug text-[#0F0F0F]">
                      {item.caption}
                    </p>
                  </div>
                </div>
              </div>

              <figcaption className="mt-4 flex items-center justify-between">
                <span className={`${T.monoLabel} text-[#0F0F0F]/45`}>
                  0{i + 1} — {item.persona}
                </span>
                <span className={`${T.monoData} text-[#0F0F0F]/30`}>
                  0{i + 1} / 0{SHOWCASE.length}
                </span>
              </figcaption>
            </figure>
          ))}

          {/* end frame — CTA */}
          <div className="w-full lg:w-[30vw] shrink-0 text-center lg:text-left">
            <Reveal>
              <h3 className={T.displayM}>
                See yours <span className="text-[#D5613E]">next.</span>
              </h3>
            </Reveal>
            <Reveal delay={0.08} className="mt-8">
              <Button href="/brand-dna" magnetic arrow={false}>
                Generate campaign
              </Button>
            </Reveal>
          </div>
        </div>
      </div>

      {/* strip progress — desktop only */}
      <div className="pointer-events-none absolute bottom-8 left-1/2 hidden lg:block w-44 -translate-x-1/2 h-px bg-[#0F0F0F]/15">
        <div
          ref={progressRef}
          className="h-full origin-left bg-[#D5613E]"
          style={{ transform: "scaleX(0)" }}
        />
      </div>
    </section>
  );
}

/* =========================================================================
   §04 — PRICING : glow-card hovers, staggered entrance.
   ========================================================================= */
const TIERS = [
  {
    name: "Free",
    price: "$0",
    unit: "forever",
    features: ["3 campaigns / month", "Audience + campaign assets", "1 image"],
    cta: "Generate campaign",
    href: "/brand-dna",
    featured: false,
  },
  {
    name: "Pro",
    price: "$29",
    unit: "per month",
    features: [
      "100 campaigns / month",
      "More images + variations",
      "Remove watermark",
    ],
    cta: "Generate campaign",
    href: "/brand-dna",
    featured: true,
  },
  {
    name: "Enterprise",
    price: "Custom",
    unit: "tailored to your team",
    features: ["Team workspace", "Multiple brands", "Dedicated support"],
    cta: "Contact us",
    href: "/",
    featured: false,
  },
];

function Pricing() {
  const gridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const grid = gridRef.current;
    if (!grid) return;
    const cards = grid.querySelectorAll<HTMLElement>("[data-price-card]");
    if (!cards.length) return;

    const mm = gsap.matchMedia();

    /* the deal — all three cards arrive as one stacked deck in the center
       (fanned, reclined, featured card on top) and deal out to their grid
       slots in 3D as the section scrolls in. Scrubbed, so the deck follows
       the scroll in both directions. */
    mm.add(
      "(min-width: 768px) and (prefers-reduced-motion: no-preference)",
      () => {
        const tl = gsap.timeline({
          defaults: { ease: "none" },
          scrollTrigger: {
            trigger: grid,
            start: "top 85%",
            end: "top 25%",
            scrub: 0.5,
          },
        });
        tl.fromTo(
          cards,
          {
            xPercent: (i: number) => (1 - i) * 104,
            y: 120,
            rotate: (i: number) => (i - 1) * 9,
            rotateY: (i: number) => (1 - i) * 24,
            scale: 0.94,
            zIndex: (i: number) => (i === 1 ? 3 : 1),
            transformPerspective: 1100,
            transformOrigin: "center bottom",
          },
          {
            xPercent: 0,
            y: 0,
            rotate: 0,
            rotateY: 0,
            scale: 1,
            duration: 1,
            stagger: 0.07,
          },
        ).fromTo(
          cards,
          { opacity: 0 },
          { opacity: 1, duration: 0.22, stagger: 0.07 },
          0,
        );
      },
    );

    /* single column — no deck to deal; a simple rise per card */
    mm.add(
      "(max-width: 767px) and (prefers-reduced-motion: no-preference)",
      () => {
        cards.forEach((card) => {
          gsap.fromTo(
            card,
            { opacity: 0, y: 40 },
            {
              opacity: 1,
              y: 0,
              duration: 0.85,
              ease: "power3.out",
              scrollTrigger: { trigger: card, start: "top 88%", once: true },
            },
          );
        });
      },
    );

    return () => mm.revert();
  }, []);

  return (
    <Section id="pricing" index="04" label="Pricing">
      <Reveal className="max-w-2xl mb-12">
        <h2 className={T.displayL}>
          Start free. Scale when it{" "}
          <span className="text-[#D5613E]">earns it.</span>
        </h2>
      </Reveal>

      <div
        ref={gridRef}
        className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch"
      >
        {TIERS.map((tier) => (
          <div
            key={tier.name}
            data-price-card
            className="h-full will-change-transform"
          >
            <Tilt className="h-full">
              <div
                className={`glow-card relative h-full flex flex-col rounded-xl p-8 ${
                  tier.featured
                    ? "glow-card-live border border-[#D5613E]/45 bg-[#FBF9F5]"
                    : "border bo-rule bg-[#FBF9F5]"
                }`}
              >
                {tier.featured && (
                  <span
                    className={`absolute -top-3 left-8 ${T.monoLabel} bg-[#D5613E] text-[#F6F3EE] px-3 py-1 rounded-full`}
                  >
                    Most popular
                  </span>
                )}

                <div className={`${T.monoLabel} text-[#0F0F0F]/55 mb-6`}>
                  {tier.name}
                </div>

                <div className={`${T.displayM} text-[#0F0F0F]`}>
                  {tier.price}
                </div>
                <div className={`${T.monoData} text-[#0F0F0F]/45 mb-8`}>
                  {tier.unit}
                </div>

                <ul className="flex flex-col gap-3 flex-1 mb-8">
                  {tier.features.map((f) => (
                    <li
                      key={f}
                      className={`flex items-start gap-3 ${T.bodyS} !text-[#0F0F0F]/75`}
                    >
                      <Check
                        className="w-4 h-4 mt-0.5 shrink-0 text-[#D5613E]"
                        strokeWidth={2.2}
                      />
                      {f}
                    </li>
                  ))}
                </ul>

                <Button
                  href={tier.href}
                  variant={tier.featured ? "primary" : "secondary"}
                  arrow={false}
                  full
                >
                  {tier.cta}
                </Button>
              </div>
            </Tilt>
          </div>
        ))}
      </div>
    </Section>
  );
}

/* =========================================================================
   §05 — FINAL CTA : 3D depth-word manifesto + magnetic button.
   ========================================================================= */
function FinalCTA() {
  return (
    <Section index="05" label="Get Access">
      {/* move the mouse: product shots trail the cursor behind the copy */}
      <ImageTrail
        images={[
          "/assets/sneakers.png",
          "/assets/skincare.jpg",
          "/assets/sunglass.jpg",
        ]}
        className="-mx-5 sm:-mx-8 lg:-mx-16 px-5 sm:px-8 lg:px-16 py-10 md:py-16"
      >
        <Parallax
          speed={44}
          className="relative z-10 mx-auto max-w-4xl text-center"
        >
          <ScaleIn>
            <DepthWords
              text="Your product already has an audience. Deshly helps you find it."
              accent={[6, 7, 8, 9, 10]}
              className={`${T.displayL} text-balance`}
            />
            <Reveal delay={0.1} className="mt-10 max-w-xl mx-auto">
              <p className={T.subhead}>
                Start with one product. Get the audience, angle, and campaign in
                minutes.
              </p>
            </Reveal>
            <Reveal delay={0.18} className="mt-12 flex justify-center">
              <Button href="/brand-dna" magnetic arrow={false}>
                Generate campaign
              </Button>
            </Reveal>
          </ScaleIn>
        </Parallax>
      </ImageTrail>
    </Section>
  );
}

/* =========================================================================
   FOOTER — curtain reveal: the content sits a layer deeper and slides down
   into place as the page "lifts off" it (scrubbed to the footer's entrance).
   Giant wordmark letters flip up from flat in 3D, igniting on hover.
   ========================================================================= */
function Footer() {
  const reduce = useReducedMotion();
  /* observe a container, not the letters — an element transformed away at
     the very bottom of the page sits outside the viewport and its own
     whileInView would never fire */
  const markRef = useRef<HTMLDivElement>(null);
  const markInView = useInView(markRef, { once: true, amount: 0.3 });

  /* curtain reveal — the footer box scrolls up as usual, but its content
     counter-slides down from -40% of its own height to 0, so it reads as a
     fixed layer behind the page being uncovered */
  const footRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: footRef,
    offset: ["start end", "end end"],
  });
  const curtainY = useTransform(scrollYProgress, [0, 1], ["-40%", "0%"]);

  return (
    <footer ref={footRef} className="border-t bo-rule overflow-hidden">
      <motion.div
        style={reduce ? undefined : { y: curtainY }}
        className="will-change-transform"
      >
        <div className={`${SHELL} pt-14`}>
          <div className="grid grid-cols-1 md:grid-cols-12 gap-10">
            <div className="md:col-span-5">
              <Link
                href="/"
                className="font-display text-2xl font-semibold tracking-[-0.03em]"
              >
                Deshly<span className="text-[#D5613E]">.</span>
              </Link>
              <p className={`mt-5 max-w-sm ${T.bodyS}`}>
                Type a product. Get the audience, angle, and campaign — ready to
                publish.
              </p>
            </div>

            <div className="md:col-span-3 md:col-start-7">
              <div className={`${T.monoLabel} text-[#0F0F0F]/45 mb-4`}>
                Product
              </div>
              <div className="space-y-2.5">
                {[
                  ["Generate a campaign", "/brand-dna"],
                  ["Campaign Generator", "/generator"],
                  ["Documentation", "/docs"],
                ].map(([t, h]) => (
                  <Link
                    key={h}
                    href={h}
                    className={`block ${T.bodyS} hover:text-[#0F0F0F] transition-colors`}
                  >
                    {t}
                  </Link>
                ))}
              </div>
            </div>

            <div className="md:col-span-3">
              <div className={`${T.monoLabel} text-[#0F0F0F]/45 mb-4`}>
                Team
              </div>
              <div className={`space-y-2.5 ${T.bodyS}`}>
                <div>Samprity Haque — Lead</div>
                <div>Sirajus Salikin Siddique — Backend</div>
                <div>Meher Nigar — Frontend</div>
              </div>
            </div>
          </div>

          <div className="mt-12 pt-6 border-t bo-rule flex items-center justify-between gap-4">
            <span className={`${T.monoData} text-[#0F0F0F]/40`}>
              © 2026 Deshly · Built in Dhaka, for the world
            </span>
            <span className={`${T.monoData} text-[#0F0F0F]/40 hidden sm:block`}>
              Audience ✺ Angle ✺ Campaign
            </span>
          </div>
        </div>

        {/* giant wordmark — letters lie flat (rotated away from camera) and
          flip up into place one by one, still igniting terracotta on hover */}
        <div
          ref={markRef}
          aria-hidden
          style={{ perspective: "900px" }}
          className="mt-4 -mb-[0.22em] select-none text-center font-display font-semibold tracking-[-0.04em] leading-[0.8] text-[clamp(5rem,18vw,17rem)]"
        >
          {"Deshly.".split("").map((c, i) => (
            <motion.span
              key={i}
              initial={false}
              animate={
                reduce || markInView
                  ? { rotateX: 0, opacity: 1 }
                  : { rotateX: -92, opacity: 0 }
              }
              transition={{ duration: 1, ease: EASE, delay: i * 0.06 }}
              style={{ transformOrigin: "50% 100%" }}
              className="inline-block align-top will-change-transform text-[#0F0F0F]/[0.08] transition-colors duration-300 hover:text-[#D5613E]"
            >
              {c}
            </motion.span>
          ))}
        </div>
      </motion.div>
    </footer>
  );
}
