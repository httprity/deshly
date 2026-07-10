"use client";

/* =========================================================================
   CINEMA — motion primitives for the Brand OS landing page.
   Uses only existing brand tokens (paper / ink / terracotta, Parkinsans,
   JetBrains Mono). No new colors, no new type. Motion only.
   ========================================================================= */

import {
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import {
  motion,
  AnimatePresence,
  useMotionValue,
  useMotionTemplate,
  useSpring,
  useScroll,
  useVelocity,
  useTransform,
  useAnimationFrame,
  useReducedMotion,
} from "framer-motion";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

export const EASE = [0.16, 1, 0.3, 1] as const;

/* =========================================================================
   PRELOADER — 000→100 counter, rotating product words, double-curtain exit.
   ========================================================================= */
const LOAD_WORDS = ["Product", "Audience", "Campaign"];

export function Preloader({ onComplete }: { onComplete: () => void }) {
  const reduce = useReducedMotion();
  const [count, setCount] = useState(0);
  const [word, setWord] = useState(0);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    if (reduce) {
      onComplete();
      return;
    }
    document.body.style.overflow = "hidden";

    const DURATION = 2200;
    const start = performance.now();
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / DURATION);
      setCount(Math.round((1 - Math.pow(1 - p, 3)) * 100));
      if (p < 1) raf = requestAnimationFrame(tick);
      else setTimeout(() => setLeaving(true), 320);
    };
    raf = requestAnimationFrame(tick);
    const words = setInterval(
      () => setWord((w) => (w + 1) % LOAD_WORDS.length),
      680,
    );
    return () => {
      cancelAnimationFrame(raf);
      clearInterval(words);
      document.body.style.overflow = "";
    };
  }, [reduce, onComplete]);

  if (reduce) return null;

  return (
    <>
      {/* terracotta underlay — follows the paper curtain for a two-beat exit */}
      <motion.div
        aria-hidden
        className="fixed inset-0 z-[9998] bg-[#D5613E]"
        initial={false}
        animate={leaving ? { y: "-100%" } : { y: "0%" }}
        transition={{ duration: 0.9, ease: EASE, delay: 0.1 }}
      />
      <motion.div
        className="fixed inset-0 z-[9999] flex flex-col justify-between bg-[#0F0F0F] text-[#F5EFE3] px-6 py-6 sm:px-10 sm:py-8"
        initial={false}
        animate={leaving ? { y: "-100%" } : { y: "0%" }}
        transition={{ duration: 0.9, ease: EASE }}
        onAnimationComplete={() => leaving && onComplete()}
      >
        <div className="flex items-center justify-between">
          <span className="font-mono uppercase tracking-[0.14em] text-[11px] md:text-xs font-medium text-[#F5EFE3]/55">
            Deshly — The AI Campaign Copilot
          </span>
          <span className="w-1.5 h-1.5 rounded-full bg-[#D5613E] bo-pulse" />
        </div>

        <div className="flex-1 flex items-center justify-center">
          <AnimatePresence mode="wait">
            <motion.span
              key={word}
              initial={{ y: 26, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -26, opacity: 0 }}
              transition={{ duration: 0.35, ease: EASE }}
              className="font-display font-semibold tracking-[-0.03em] text-[clamp(2.5rem,7vw,5.5rem)] leading-none"
            >
              {LOAD_WORDS[word]}
              <span className="text-[#E8835C]">.</span>
            </motion.span>
          </AnimatePresence>
        </div>

        <div className="flex items-end justify-between gap-6">
          <span className="font-mono tracking-[0.02em] text-[13px] text-[#F5EFE3]/45 pb-2">
            LOADING / BRAND OS
          </span>
          <span className="font-display font-semibold tabular-nums tracking-[-0.03em] leading-none text-[clamp(4rem,12vw,9rem)]">
            {String(count).padStart(3, "0")}
          </span>
        </div>

        <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-[#F5EFE3]/10">
          <div
            className="h-full bg-[#D5613E] origin-left"
            style={{ transform: `scaleX(${count / 100})` }}
          />
        </div>
      </motion.div>
    </>
  );
}

/* =========================================================================
   MASKED LINES — line-by-line rise out of an overflow mask.
   `play` controls it manually (hero, gated on preloader); otherwise inView.
   ========================================================================= */
export function MaskedLines({
  lines,
  play,
  delay = 0,
  className = "",
  lineClassName = "",
}: {
  lines: ReactNode[];
  play?: boolean;
  delay?: number;
  className?: string;
  lineClassName?: string;
}) {
  const reduce = useReducedMotion();
  return (
    <span className={`block ${className}`}>
      {lines.map((line, i) => {
        const target = { y: "0%" };
        const hidden = { y: "112%" };
        return (
          <span key={i} className={`block overflow-hidden ${lineClassName}`}>
            <motion.span
              className="block will-change-transform"
              initial={reduce ? target : hidden}
              {...(play === undefined
                ? {
                    whileInView: target,
                    viewport: { once: true, margin: "-10% 0px" },
                  }
                : { animate: play || reduce ? target : hidden })}
              transition={{
                duration: 1,
                ease: EASE,
                delay: delay + i * 0.1,
              }}
            >
              {line}
            </motion.span>
          </span>
        );
      })}
    </span>
  );
}

/* =========================================================================
   MASKED WORDS — word-by-word cascade out of overflow masks with a skew
   that settles. Each line is an array of segments; accent segments render
   in the color passed via accentClassName.
   ========================================================================= */
export function MaskedWords({
  lines,
  play,
  delay = 0,
  stagger = 0.055,
  className = "",
  accentClassName = "text-[#D5613E]",
}: {
  lines: { t: string; accent?: boolean }[][];
  play?: boolean;
  delay?: number;
  stagger?: number;
  className?: string;
  accentClassName?: string;
}) {
  const reduce = useReducedMotion();
  let wordIndex = 0;

  return (
    <span className={`block ${className}`}>
      {lines.map((segments, li) => (
        <span key={li} className="block">
          {segments.map((seg, si) =>
            seg.t.split(" ").map((word, wi) => {
              const i = wordIndex++;
              const target = { y: "0%", skewY: 0 };
              const hidden = { y: "115%", skewY: 6 };
              return (
                <span
                  key={`${si}-${wi}`}
                  className="inline-block overflow-hidden align-top pb-[0.08em] -mb-[0.08em]"
                >
                  <motion.span
                    className={`inline-block will-change-transform ${seg.accent ? accentClassName : ""}`}
                    initial={reduce ? target : hidden}
                    {...(play === undefined
                      ? {
                          whileInView: target,
                          viewport: { once: true, margin: "-10% 0px" },
                        }
                      : { animate: play || reduce ? target : hidden })}
                    transition={{
                      duration: 0.9,
                      ease: EASE,
                      delay: delay + i * stagger,
                    }}
                  >
                    {word}
                  </motion.span>
                  {" "}
                </span>
              );
            }),
          )}
        </span>
      ))}
    </span>
  );
}

/* =========================================================================
   VELOCITY MARQUEE — drifts on its own, accelerates and reverses with
   scroll velocity. The classic editorial band.
   ========================================================================= */
const wrap = (min: number, max: number, v: number) => {
  const range = max - min;
  return min + ((((v - min) % range) + range) % range);
};

export function VelocityMarquee({
  children,
  baseVelocity = 2.5,
  className = "",
}: {
  children: ReactNode;
  baseVelocity?: number;
  className?: string;
}) {
  const reduce = useReducedMotion();
  const baseX = useMotionValue(0);
  const { scrollY } = useScroll();
  const scrollVelocity = useVelocity(scrollY);
  const smoothVelocity = useSpring(scrollVelocity, {
    damping: 50,
    stiffness: 400,
  });
  const velocityFactor = useTransform(smoothVelocity, [0, 1000], [0, 4], {
    clamp: false,
  });
  const directionFactor = useRef(1);
  const x = useTransform(baseX, (v) => `${wrap(-25, 0, v)}%`);
  /* fast scroll leans the whole band over — italic under momentum */
  const skewX = useTransform(smoothVelocity, [-1200, 1200], [3.5, -3.5]);

  useAnimationFrame((_, delta) => {
    if (reduce) return;
    let moveBy = directionFactor.current * baseVelocity * (delta / 1000);
    const vf = velocityFactor.get();
    if (vf < 0) directionFactor.current = -1;
    else if (vf > 0) directionFactor.current = 1;
    moveBy += directionFactor.current * moveBy * vf;
    baseX.set(baseX.get() + moveBy);
  });

  return (
    <div className={`overflow-hidden whitespace-nowrap ${className}`}>
      <motion.div
        className="flex w-max flex-nowrap will-change-transform"
        style={reduce ? { x } : { x, skewX }}
      >
        {[0, 1, 2, 3].map((i) => (
          <span key={i} className="flex shrink-0 items-center">
            {children}
          </span>
        ))}
      </motion.div>
    </div>
  );
}

/* =========================================================================
   CURSOR DOT — small terracotta dot trailing the pointer; grows into an
   ink disc with a mono label over any [data-cursor="Label"] target.
   Desktop (fine pointer) only. Native cursor stays visible.
   ========================================================================= */
const subscribeFinePointer = (cb: () => void) => {
  const mq = window.matchMedia("(pointer: fine)");
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
};

export function CursorDot() {
  const reduce = useReducedMotion();
  /* SSR-safe: false on the server, live matchMedia on the client */
  const finePointer = useSyncExternalStore(
    subscribeFinePointer,
    () => window.matchMedia("(pointer: fine)").matches,
    () => false,
  );
  const enabled = finePointer && !reduce;
  const [label, setLabel] = useState<string | null>(null);
  const x = useMotionValue(-100);
  const y = useMotionValue(-100);
  const sx = useSpring(x, { stiffness: 500, damping: 40, mass: 0.4 });
  const sy = useSpring(y, { stiffness: 500, damping: 40, mass: 0.4 });

  useEffect(() => {
    if (!enabled) return;

    const onMove = (e: MouseEvent) => {
      x.set(e.clientX);
      y.set(e.clientY);
    };
    const onOver = (e: MouseEvent) => {
      const t = (e.target as HTMLElement).closest?.("[data-cursor]");
      setLabel(t ? t.getAttribute("data-cursor") || "" : null);
    };
    window.addEventListener("mousemove", onMove, { passive: true });
    window.addEventListener("mouseover", onOver, { passive: true });
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseover", onOver);
    };
  }, [enabled, x, y]);

  if (!enabled) return null;

  const active = label !== null;
  return (
    <motion.div
      aria-hidden
      className="pointer-events-none fixed left-0 top-0 z-[9990] flex items-center justify-center rounded-full"
      style={{ x: sx, y: sy, translateX: "-50%", translateY: "-50%" }}
      animate={{
        width: active ? 76 : 10,
        height: active ? 76 : 10,
        backgroundColor: active ? "#0F0F0F" : "#D5613E",
      }}
      transition={{ duration: 0.35, ease: EASE }}
    >
      <AnimatePresence>
        {active && label && (
          <motion.span
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.6 }}
            transition={{ duration: 0.2 }}
            className="font-mono uppercase tracking-[0.14em] text-[10px] font-medium text-[#F6F3EE]"
          >
            {label}
          </motion.span>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/* =========================================================================
   SCROLL PROGRESS — 2px terracotta hairline pinned to the top edge.
   ========================================================================= */
export function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 140,
    damping: 30,
    restDelta: 0.001,
  });
  return (
    <motion.div
      aria-hidden
      className="fixed inset-x-0 top-0 z-[60] h-[2px] origin-left bg-[#D5613E]"
      style={{ scaleX }}
    />
  );
}

/* =========================================================================
   PARALLAX IMAGE — image drifts inside an overflow mask as it crosses the
   viewport. Constant overscale so no edges ever show.
   ========================================================================= */
export function ParallaxImage({
  src,
  alt,
  className = "",
}: {
  src: string;
  alt: string;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    const img = el?.querySelector("img");
    if (!el || !img) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const ctx = gsap.context(() => {
      gsap.fromTo(
        img,
        { yPercent: -7, scale: 1.16 },
        {
          yPercent: 7,
          scale: 1.16,
          ease: "none",
          scrollTrigger: {
            trigger: el,
            start: "top bottom",
            end: "bottom top",
            scrub: true,
          },
        },
      );
    }, el);
    return () => ctx.revert();
  }, []);

  return (
    <div ref={ref} className={`overflow-hidden ${className}`}>
      <div className="h-full w-full transition-transform duration-700 ease-out group-hover:scale-[1.04]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={alt}
          loading="lazy"
          className="h-full w-full object-cover will-change-transform"
          style={{ transform: "scale(1.16)" }}
        />
      </div>
    </div>
  );
}

/* =========================================================================
   SPOTLIGHT — a soft terracotta pool of light follows the cursor across the
   parent section. Dark-act only; fine pointers only; inert under reduced
   motion. Mount it as a direct child of a `relative` section.
   ========================================================================= */
export function Spotlight({ className = "" }: { className?: string }) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const x = useMotionValue(-9999);
  const y = useMotionValue(-9999);
  const sx = useSpring(x, { stiffness: 90, damping: 28, mass: 0.8 });
  const sy = useSpring(y, { stiffness: 90, damping: 28, mass: 0.8 });
  const bg = useMotionTemplate`radial-gradient(620px circle at ${sx}px ${sy}px, rgba(232,131,92,0.08), transparent 68%)`;

  useEffect(() => {
    if (reduce) return;
    if (!window.matchMedia("(pointer: fine)").matches) return;
    const el = ref.current?.parentElement;
    if (!el) return;
    const onMove = (e: MouseEvent) => {
      const r = ref.current!.getBoundingClientRect();
      x.set(e.clientX - r.left);
      y.set(e.clientY - r.top);
    };
    el.addEventListener("mousemove", onMove, { passive: true });
    return () => el.removeEventListener("mousemove", onMove);
  }, [reduce, x, y]);

  return (
    <motion.div
      ref={ref}
      aria-hidden
      className={`pointer-events-none absolute inset-0 ${className}`}
      style={reduce ? undefined : { background: bg }}
    />
  );
}

/* =========================================================================
   SCALE IN — dolly-in: the block eases from slightly small + dim to full
   presence, scrubbed to its approach through the viewport.
   ========================================================================= */
export function ScaleIn({
  children,
  className = "",
  from = 0.93,
}: {
  children: ReactNode;
  className?: string;
  from?: number;
}) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start 95%", "start 40%"],
  });
  const scale = useTransform(scrollYProgress, [0, 1], [from, 1]);
  const opacity = useTransform(scrollYProgress, [0, 1], [0.5, 1]);
  return (
    <motion.div
      ref={ref}
      style={reduce ? undefined : { scale, opacity }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/* =========================================================================
   PARALLAX — block drifts vertically at its own speed while it crosses the
   viewport. `speed` is total px of travel; positive lags the scroll
   (reads "behind" the page), negative leads it. Inert under reduced motion.
   ========================================================================= */
export function Parallax({
  children,
  speed = 60,
  className = "",
}: {
  children: ReactNode;
  speed?: number;
  className?: string;
}) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  const y = useTransform(scrollYProgress, [0, 1], [speed, -speed]);
  return (
    <motion.div
      ref={ref}
      style={reduce ? undefined : { y }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/* =========================================================================
   GLOW ORBS — terracotta/brass gradient orbs drifting in the dark act.
   Ambient orbit (CSS keyframes) + mouse lean + scroll drift. Colors are the
   existing brand gradient tokens (--color-grad-1/2/3).
   ========================================================================= */
export function GlowOrbs({
  className = "",
  opacity = 1,
}: {
  className?: string;
  opacity?: number;
}) {
  const reduce = useReducedMotion();
  const mxRaw = useMotionValue(0);
  const myRaw = useMotionValue(0);
  const mx = useSpring(mxRaw, { stiffness: 40, damping: 26, mass: 1 });
  const my = useSpring(myRaw, { stiffness: 40, damping: 26, mass: 1 });
  const { scrollY } = useScroll();

  useEffect(() => {
    if (reduce) return;
    if (!window.matchMedia("(pointer: fine)").matches) return;
    const onMove = (e: MouseEvent) => {
      mxRaw.set(e.clientX / window.innerWidth - 0.5);
      myRaw.set(e.clientY / window.innerHeight - 0.5);
    };
    window.addEventListener("mousemove", onMove, { passive: true });
    return () => window.removeEventListener("mousemove", onMove);
  }, [reduce, mxRaw, myRaw]);

  /* each orb leans toward the mouse and drifts with scroll at its own depth */
  const x1 = useTransform(mx, (v) => v * 70);
  const x2 = useTransform(mx, (v) => v * -90);
  const x3 = useTransform(mx, (v) => v * 50);
  const my1 = useTransform(my, (v) => v * 50);
  const my2 = useTransform(my, (v) => v * -60);
  const my3 = useTransform(my, (v) => v * 70);
  const sy1 = useTransform(scrollY, [0, 1800], [0, -110]);
  const sy2 = useTransform(scrollY, [0, 1800], [0, 80]);
  const sy3 = useTransform(scrollY, [0, 1800], [0, -60]);
  const y1 = useTransform(() => my1.get() + sy1.get());
  const y2 = useTransform(() => my2.get() + sy2.get());
  const y3 = useTransform(() => my3.get() + sy3.get());

  return (
    <div
      aria-hidden
      className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}
      style={{ opacity }}
    >
      <motion.div
        style={{ x: x1, y: y1 }}
        className="absolute -left-[8%] -top-[14%] w-[46vw] min-w-[340px] aspect-square"
      >
        <div className="orb-1 h-full w-full rounded-full bg-[radial-gradient(circle_at_center,rgba(213,97,62,0.4),transparent_62%)] blur-[70px]" />
      </motion.div>
      <motion.div
        style={{ x: x2, y: y2 }}
        className="absolute -right-[12%] top-[16%] w-[40vw] min-w-[300px] aspect-square"
      >
        <div className="orb-2 h-full w-full rounded-full bg-[radial-gradient(circle_at_center,rgba(184,149,106,0.32),transparent_62%)] blur-[80px]" />
      </motion.div>
      <motion.div
        style={{ x: x3, y: y3 }}
        className="absolute left-[14%] -bottom-[24%] w-[50vw] min-w-[360px] aspect-square"
      >
        <div className="orb-3 h-full w-full rounded-full bg-[radial-gradient(circle_at_center,rgba(106,70,40,0.5),transparent_62%)] blur-[90px]" />
      </motion.div>
    </div>
  );
}

/* =========================================================================
   IMAGE TRAIL — product shots spawn under the cursor with random rotation,
   pop in, then fall away. Fine-pointer devices only; capped by throttle.
   ========================================================================= */
export function ImageTrail({
  images,
  children,
  className = "",
  throttleMs = 100,
}: {
  images: string[];
  children: ReactNode;
  className?: string;
  throttleMs?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const lastSpawn = useRef(0);
  const imgIndex = useRef(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (!window.matchMedia("(pointer: fine)").matches) return;

    const onMove = (e: MouseEvent) => {
      const now = performance.now();
      if (now - lastSpawn.current < throttleMs) return;
      lastSpawn.current = now;

      const r = el.getBoundingClientRect();
      const img = document.createElement("img");
      img.src = images[imgIndex.current++ % images.length];
      img.alt = "";
      img.className =
        "pointer-events-none absolute z-0 w-32 h-40 md:w-40 md:h-52 object-cover rounded-2xl shadow-[0_20px_50px_-16px_rgba(15,15,15,0.4)] will-change-transform";
      img.style.left = `${e.clientX - r.left}px`;
      img.style.top = `${e.clientY - r.top}px`;
      el.appendChild(img);

      const rot = gsap.utils.random(-14, 14);
      gsap.fromTo(
        img,
        {
          xPercent: -50,
          yPercent: -50,
          scale: 0.3,
          opacity: 0,
          rotation: rot * 1.6,
        },
        {
          scale: 1,
          opacity: 1,
          rotation: rot,
          duration: 0.35,
          ease: "power3.out",
        },
      );
      gsap.to(img, {
        yPercent: 60,
        opacity: 0,
        scale: 0.85,
        rotation: rot * 1.4,
        delay: 0.4,
        duration: 0.7,
        ease: "power2.in",
        onComplete: () => img.remove(),
      });
    };

    el.addEventListener("mousemove", onMove, { passive: true });
    return () => {
      el.removeEventListener("mousemove", onMove);
      el.querySelectorAll("img[alt='']").forEach((n) => n.remove());
    };
  }, [images, throttleMs]);

  return (
    <div ref={ref} className={`relative overflow-hidden ${className}`}>
      {children}
    </div>
  );
}

/* =========================================================================
   DEPTH WORDS — 3D word cascade: each word lies flat below the baseline
   (rotated away from camera, pushed back in z) and swings up into place,
   scrubbed to scroll. The Depth & 3D sibling of WordScrub.
   ========================================================================= */
export function DepthWords({
  text,
  className = "",
  accent = [],
}: {
  text: string;
  className?: string;
  accent?: number[]; // word indices rendered in terracotta
}) {
  const ref = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const ctx = gsap.context(() => {
      gsap.set(el, { perspective: 700 });
      gsap.fromTo(
        el.querySelectorAll("[data-w]"),
        {
          opacity: 0,
          rotateX: -78,
          yPercent: 55,
          z: -90,
          transformOrigin: "50% 100%",
        },
        {
          opacity: 1,
          rotateX: 0,
          yPercent: 0,
          z: 0,
          stagger: 0.35,
          ease: "none",
          scrollTrigger: {
            trigger: el,
            start: "top 86%",
            end: "top 30%",
            scrub: 0.4,
          },
        },
      );
    }, el);
    return () => ctx.revert();
  }, []);

  return (
    <p ref={ref} className={className}>
      {text.split(" ").map((w, i) => (
        <span key={i} className="inline-block [transform-style:preserve-3d]">
          <span
            data-w
            className={`inline-block will-change-transform ${accent.includes(i) ? "text-[#D5613E]" : ""}`}
          >
            {w}
          </span>{" "}
        </span>
      ))}
    </p>
  );
}

/* =========================================================================
   WORD SCRUB — every word fades from ghost to ink as the block crosses
   the viewport, tied directly to scroll position.
   ========================================================================= */
export function WordScrub({
  text,
  className = "",
  accent = [],
}: {
  text: string;
  className?: string;
  accent?: number[]; // word indices rendered in terracotta
}) {
  const ref = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const ctx = gsap.context(() => {
      gsap.fromTo(
        el.querySelectorAll("[data-w]"),
        { opacity: 0.12 },
        {
          opacity: 1,
          stagger: 0.4,
          ease: "none",
          scrollTrigger: {
            trigger: el,
            start: "top 82%",
            end: "top 28%",
            scrub: 0.4,
          },
        },
      );
    }, el);
    return () => ctx.revert();
  }, []);

  return (
    <p ref={ref} className={className}>
      {text.split(" ").map((w, i) => (
        <span key={i}>
          <span
            data-w
            className={`inline-block ${accent.includes(i) ? "text-[#D5613E]" : ""}`}
          >
            {w}
          </span>{" "}
        </span>
      ))}
    </p>
  );
}
