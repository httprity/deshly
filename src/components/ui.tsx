"use client";

// ============================================================
// DESHLY — Product UI kit (light "Brand OS")
//
// Shared primitives so internal app pages match the landing page's visual
// system (paper surfaces, ink text, terracotta signal, Parkinsans display,
// hairline rules, neobrutalist edges). These are meant to render INSIDE the
// `.brandos` scope that ProductShell provides.
//
// Tokens (from globals.css .brandos):
//   paper        #F6F3EE   · page background
//   paper-raised #FBF9F5   · cards / inputs
//   paper-sunken #EDE8DE   · nested wells
//   ink          #0F0F0F   · text / primary fills
//   signal       #D5613E   · accent (terracotta)
//   rule         rgba(15,15,15,.12) → `bo-rule`
//   rule-strong  rgba(15,15,15,.24) → `bo-rule-strong`
// ============================================================

import { ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { T } from "./system";

export { Button } from "./system";

/* ---------- Typography helpers ---------- */
export function Eyebrow({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-3 ${T.monoLabel} text-[#0F0F0F]/55 ${className}`}>
      <span className="w-6 h-px bg-[#D5613E]" />
      {children}
    </span>
  );
}

export function SectionHeader({
  title,
  hint,
  className = "",
}: {
  title: ReactNode;
  hint?: ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <h2 className="font-display font-semibold tracking-[-0.02em] leading-[1.05] text-[clamp(1.6rem,3vw,2.4rem)] text-[#0F0F0F]">
        {title}
      </h2>
      {hint && <p className={`mt-2 ${T.bodyS} max-w-xl`}>{hint}</p>}
    </div>
  );
}

/* ---------- Form primitives ---------- */
export function Field({
  label,
  optional,
  hint,
  children,
}: {
  label: string;
  optional?: boolean;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <div className={`${T.monoLabel} text-[#0F0F0F]/55 mb-2.5 flex items-baseline gap-2`}>
        <span>{label}</span>
        {optional && <span className="normal-case tracking-normal text-[11px] text-[#0F0F0F]/35">optional</span>}
      </div>
      {hint && <p className="text-[13px] text-[#0F0F0F]/45 mb-2.5 leading-relaxed">{hint}</p>}
      {children}
    </label>
  );
}

const INPUT_BASE =
  "w-full rounded-lg border bo-rule-strong bg-[#FBF9F5] text-[#0F0F0F] placeholder:text-[#0F0F0F]/35 outline-none focus:border-[#0F0F0F] transition-colors";

export function TextInput({
  value,
  onChange,
  placeholder,
  className = "",
  type = "text",
  id,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
  type?: string;
  id?: string;
}) {
  return (
    <input
      id={id}
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={`${INPUT_BASE} px-5 py-3.5 text-[1.0625rem] ${className}`}
    />
  );
}

export function TextArea({
  value,
  onChange,
  placeholder,
  rows = 3,
  mono = false,
  className = "",
  id,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
  mono?: boolean;
  className?: string;
  id?: string;
}) {
  return (
    <textarea
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      rows={rows}
      placeholder={placeholder}
      className={`${INPUT_BASE} px-5 py-3.5 text-[15px] leading-relaxed resize-none ${mono ? "font-mono text-sm" : ""} ${className}`}
    />
  );
}

/* ---------- Chips ---------- */
export function Chip({
  active,
  onClick,
  children,
}: {
  active?: boolean;
  onClick?: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`text-[13px] px-4 py-2 rounded-full border transition-colors duration-150 ${
        active
          ? "border-[#D5613E] bg-[#D5613E]/10 text-[#0F0F0F] font-medium"
          : "bo-rule-strong text-[#0F0F0F]/60 hover:border-[#0F0F0F]/50 hover:text-[#0F0F0F]"
      }`}
    >
      {children}
    </button>
  );
}

/** Static accent pill (non-interactive) — e.g. trait/hashtag tags. */
export function Pill({ children, tone = "signal" }: { children: ReactNode; tone?: "signal" | "muted" }) {
  return (
    <span
      className={`inline-block px-3 py-1.5 rounded-full text-xs border ${
        tone === "signal"
          ? "bg-[#D5613E]/10 text-[#D5613E] border-[#D5613E]/25"
          : "bg-[#EDE8DE] text-[#0F0F0F]/70 bo-rule"
      }`}
    >
      {children}
    </span>
  );
}

export function ChipSelect({
  options,
  selected,
  onToggle,
}: {
  options: string[];
  selected: string[];
  onToggle: (v: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => (
        <Chip key={o} active={selected.includes(o)} onClick={() => onToggle(o)}>
          {o}
        </Chip>
      ))}
    </div>
  );
}

/* ---------- Surfaces ---------- */
export function SurfaceCard({
  children,
  className = "",
  raised = true,
  as: Tag = "div",
}: {
  children: ReactNode;
  className?: string;
  raised?: boolean;
  as?: "div" | "section";
}) {
  return (
    <Tag
      className={`rounded-xl border bo-rule ${raised ? "bg-[#FBF9F5]" : "bg-[#F6F3EE]"} ${className}`}
    >
      {children}
    </Tag>
  );
}

/** Card with a mono label header — the standard internal content block. */
export function LabeledCard({
  label,
  action,
  children,
  className = "",
}: {
  label: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <SurfaceCard className={`p-5 sm:p-7 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <span className={`${T.monoLabel} text-[#0F0F0F]/55`}>{label}</span>
        {action}
      </div>
      {children}
    </SurfaceCard>
  );
}

/* ---------- Stepper ---------- */
export function Stepper({ step, total, label }: { step: number; total: number; label: string }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <span className={`${T.monoLabel} text-[#0F0F0F]/55`}>
          Step {step} of {total} — {label}
        </span>
        <span className={`${T.monoData} text-[#0F0F0F]/35`}>
          {String(step).padStart(2, "0")} / {String(total).padStart(2, "0")}
        </span>
      </div>
      <div className="h-[3px] bg-[#EDE8DE] rounded-full overflow-hidden">
        <div
          className="h-full bg-[#D5613E] rounded-full transition-all duration-500"
          style={{ width: `${(step / total) * 100}%` }}
        />
      </div>
    </div>
  );
}

/* ---------- States ---------- */
export function EmptyState({
  icon,
  title,
  hint,
}: {
  icon?: ReactNode;
  title: string;
  hint?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-16 px-6">
      {icon && (
        <div className="w-16 h-16 rounded-full border bo-rule-strong flex items-center justify-center mb-6 text-[#0F0F0F]/40">
          {icon}
        </div>
      )}
      <div className="font-display font-semibold text-2xl tracking-[-0.02em] text-[#0F0F0F]/70">{title}</div>
      {hint && <p className={`mt-2 ${T.bodyS} max-w-xs`}>{hint}</p>}
    </div>
  );
}

export function LoadingState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-16 px-6">
      <Loader2 className="w-9 h-9 animate-spin text-[#D5613E] mb-5" strokeWidth={1.75} />
      <div className="font-display font-semibold text-xl tracking-[-0.02em] text-[#0F0F0F]">{title}</div>
      {hint && <p className={`mt-1.5 ${T.monoData} text-[#0F0F0F]/45`}>{hint}</p>}
    </div>
  );
}

/* ---------- Disclosure (Advanced / Details) ---------- */
export function Disclosure({ summary, children }: { summary: string; children: ReactNode }) {
  return (
    <details className="group rounded-xl border bo-rule bg-[#FBF9F5]">
      <summary className={`p-4 cursor-pointer ${T.monoLabel} text-[#0F0F0F]/55 flex items-center justify-between list-none hover:text-[#0F0F0F] transition-colors`}>
        <span>{summary}</span>
        <span className="text-[#D5613E] group-open:rotate-180 transition-transform inline-block text-[10px]">▼</span>
      </summary>
      <div className="px-4 pb-4 pt-1">{children}</div>
    </details>
  );
}
