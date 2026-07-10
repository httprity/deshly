"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import {
  motion,
  useReducedMotion,
  useMotionValue,
  useSpring,
  useInView,
  type Variants,
} from "framer-motion";
import {
  useRef,
  useState,
  useEffect,
  type ReactNode,
  type MouseEvent as ReactMouseEvent,
} from "react";

/* Premium settle — no bounce */
const EASE_SYSTEM = [0.16, 1, 0.3, 1] as const;

/* =========================================================================
   TYPE TOKENS — single source of truth for the modular scale.
   Grotesque is tight at display sizes; mono is wide + uppercase.
   ========================================================================= */
export const T = {
  displayXl:
    "font-display font-semibold tracking-[-0.03em] leading-[0.92] text-[clamp(3.1rem,8.5vw,7.5rem)]",
  displayL:
    "font-display font-semibold tracking-[-0.025em] leading-[0.96] text-[clamp(2.5rem,6vw,5.25rem)]",
  displayM:
    "font-display font-medium tracking-[-0.02em] leading-[1.0] text-[clamp(2rem,4vw,3.5rem)]",
  heading:
    "font-display font-medium tracking-[-0.015em] leading-[1.1] text-[clamp(1.5rem,2.4vw,2rem)]",
  subhead:
    "tracking-[-0.01em] leading-[1.3] text-[clamp(1.18rem,1.8vw,1.4rem)] text-[#0F0F0F]/70",
  body: "text-[1.0625rem] leading-[1.55] text-[#0F0F0F]/70",
  bodyS: "text-sm leading-[1.5] text-[#0F0F0F]/70",
  monoLabel:
    "font-mono uppercase tracking-[0.14em] text-[11px] md:text-xs font-medium",
  monoData: "font-mono tracking-[0.02em] text-[13px]",
} as const;

/* =========================================================================
   REVEAL — tight 16px rise + fade. The only entrance motion in the system.
   ========================================================================= */
export function Reveal({
  children,
  className = "",
  delay = 0,
  as = "div",
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  as?: "div" | "span" | "li";
}) {
  const reduce = useReducedMotion();
  const MotionTag = motion[as];
  return (
    <MotionTag
      className={className}
      initial={reduce ? { opacity: 0 } : { opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-10% 0px -10% 0px" }}
      transition={{ duration: 0.6, ease: EASE_SYSTEM, delay }}
    >
      {children}
    </MotionTag>
  );
}

/* =========================================================================
   MONO LABEL — section/field tag with index + hairline + optional status dot
   ========================================================================= */
export function Tag({
  index,
  children,
  dot = false,
  className = "",
}: {
  index?: string;
  children: ReactNode;
  dot?: boolean;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-3 ${T.monoLabel} text-[#0F0F0F]/55 ${className}`}
    >
      {index && <span className="text-[#D5613E]">{index}</span>}
      {index && <span className="w-8 h-px bg-[#0F0F0F]/25" />}
      <span>{children}</span>
      {dot && <span className="w-1.5 h-1.5 rounded-full bg-[#D5613E] bo-pulse" />}
    </span>
  );
}

/* =========================================================================
   MAGNETIC BUTTON — primary (ink→signal), secondary (border), link (mono).
   8px radius. Pointer-gravity disabled under reduced motion.
   ========================================================================= */
export function Button({
  href,
  onClick,
  children,
  variant = "primary",
  arrow = true,
  magnetic = false,
  full = false,
  className = "",
}: {
  href?: string;
  onClick?: () => void;
  children: ReactNode;
  variant?: "primary" | "secondary" | "link";
  arrow?: boolean;
  magnetic?: boolean;
  full?: boolean;
  className?: string;
}) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLSpanElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 220, damping: 20, mass: 0.2 });
  const sy = useSpring(y, { stiffness: 220, damping: 20, mass: 0.2 });

  const onMove = (e: ReactMouseEvent) => {
    if (!magnetic || reduce) return;
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    x.set((e.clientX - (r.left + r.width / 2)) * 0.18);
    y.set((e.clientY - (r.top + r.height / 2)) * 0.18);
  };
  const onLeave = () => {
    x.set(0);
    y.set(0);
  };

  const variants: Record<string, string> = {
    primary:
      "bg-[#0F0F0F] text-[#F6F3EE] hover:bg-[#D5613E] px-7 py-3.5 rounded-lg",
    secondary:
      "border bo-rule-strong text-[#0F0F0F] hover:border-[#0F0F0F] hover:bg-[#FBF9F5] px-7 py-3.5 rounded-lg",
    link: "text-[#0F0F0F] decoration-[#D5613E] underline-offset-[6px] hover:underline",
  };

  const inner = (
    <motion.span
      ref={ref}
      style={magnetic ? { x: sx, y: sy } : undefined}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      className={`group ${full ? "flex w-full justify-center" : "inline-flex"} items-center gap-2 ${T.monoLabel} transition-colors duration-200 ${variants[variant]} ${className}`}
    >
      <span>{children}</span>
      {arrow && (
        <ArrowRight
          className="w-3.5 h-3.5 transition-transform duration-200 group-hover:translate-x-0.5"
          strokeWidth={2}
        />
      )}
    </motion.span>
  );

  const wrap = full ? "block w-full" : "inline-block";
  if (href)
    return (
      <Link href={href} className={wrap}>
        {inner}
      </Link>
    );
  return (
    <button type="button" onClick={onClick} className={wrap}>
      {inner}
    </button>
  );
}

/* =========================================================================
   SPEC CARD — the core unit. Every card reads like a database record:
   mono-label header + index + status dot, a value, a data readout footer.
   ========================================================================= */
export function SpecCard({
  label,
  index,
  children,
  readout,
  className = "",
  delay = 0,
}: {
  label: string;
  index: string;
  children: ReactNode;
  readout?: ReactNode;
  className?: string;
  delay?: number;
}) {
  return (
    <Reveal delay={delay} className={className}>
      <motion.div
        whileHover={{ y: -4 }}
        transition={{ duration: 0.28, ease: EASE_SYSTEM }}
        className="group relative h-full flex flex-col rounded-lg border bo-rule bg-[#FBF9F5] p-7 md:p-8 hover:border-[rgba(15,15,15,0.24)] transition-colors duration-200"
      >
        <div className="flex items-center justify-between mb-7">
          <span className={`${T.monoLabel} text-[#0F0F0F]/55`}>{label}</span>
          <div className="flex items-center gap-3">
            <span className={`${T.monoData} text-[#0F0F0F]/35`}>{index}</span>
            <span className="w-1.5 h-1.5 rounded-full bg-[#0F0F0F]/20 group-hover:bg-[#D5613E] transition-colors duration-200" />
          </div>
        </div>

        <div className="flex-1 text-[#0F0F0F]/80">{children}</div>

        {readout && (
          <div className="mt-7 pt-5 border-t bo-rule">{readout}</div>
        )}
      </motion.div>
    </Reveal>
  );
}

/* Horizontal meter for spec readouts (track + signal fill + mono value) */
export function Meter({ value, label }: { value: number; label: string }) {
  const pct = Math.round(value * 100);
  return (
    <div className="flex items-center gap-3">
      <span className={`${T.monoData} text-[#0F0F0F]/45 w-20 shrink-0`}>{label}</span>
      <span className="relative h-1 flex-1 rounded-full bg-[#EDE8DE] overflow-hidden">
        <span
          className="absolute inset-y-0 left-0 rounded-full bg-[#D5613E]"
          style={{ width: `${pct}%` }}
        />
      </span>
      <span className={`${T.monoData} text-[#0F0F0F]/55 w-9 text-right`}>
        {(value).toFixed(2)}
      </span>
    </div>
  );
}

/* =========================================================================
   COUNTER — tally once in view (annual-report figures). Real values only.
   ========================================================================= */
export function Counter({
  to,
  prefix = "",
  suffix = "",
  duration = 1.6,
}: {
  to: number;
  prefix?: string;
  suffix?: string;
  duration?: number;
}) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-20%" });
  const [val, setVal] = useState(0);

  useEffect(() => {
    if (!inView) return;
    if (reduce) {
      setVal(to);
      return;
    }
    let raf = 0;
    const start = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / (duration * 1000));
      setVal(Math.round((1 - Math.pow(1 - p, 4)) * to));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, to, duration, reduce]);

  return (
    <span ref={ref}>
      {prefix}
      {val}
      {suffix}
    </span>
  );
}

/* =========================================================================
   TILT — subtle pointer-driven 3D tilt for cards (Webflow-style).
   Reduced-motion safe (becomes inert).
   ========================================================================= */
export function Tilt({
  children,
  className = "",
  max = 5,
}: {
  children: ReactNode;
  className?: string;
  max?: number;
}) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const rx = useMotionValue(0);
  const ry = useMotionValue(0);
  const srx = useSpring(rx, { stiffness: 200, damping: 18 });
  const sry = useSpring(ry, { stiffness: 200, damping: 18 });

  const onMove = (e: ReactMouseEvent) => {
    if (reduce) return;
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    ry.set(px * max * 2);
    rx.set(-py * max * 2);
  };
  const onLeave = () => {
    rx.set(0);
    ry.set(0);
  };

  return (
    <motion.div
      ref={ref}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      style={{ rotateX: srx, rotateY: sry, transformPerspective: 900 }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/* Shared stagger for grids that want a sequential reveal */
export const gridStagger: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
};
