"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Sparkles, Wand2, Globe, FileText, ArrowUpRight } from "lucide-react";
import { ReactNode } from "react";
import { useLenis } from "@/lib/hooks";

interface ProductShellProps {
  children: ReactNode;
  stepLabel?: string;
  pageTitle?: ReactNode;
  pageSubtitle?: ReactNode;
}

const NAV_ITEMS = [
  { href: "/brand-dna", label: "Brand DNA", icon: Sparkles, step: "01" },
  { href: "/generator", label: "Generator", icon: Wand2, step: "02" },
  { href: "/clusters", label: "Clusters", icon: Globe, step: "03" },
  { href: "/docs", label: "Documentation", icon: FileText, step: "—" },
];

export function ProductShell({ children, stepLabel, pageTitle, pageSubtitle }: ProductShellProps) {
  useLenis();
  const pathname = usePathname();

  return (
    <div className="grain min-h-screen bg-void text-cream flex relative">
      {/* Ambient gradient — bottom-left of viewport */}
      <div
        className="fixed pointer-events-none"
        style={{
          bottom: "-30%",
          left: "-20%",
          width: "70vw",
          height: "70vw",
          background:
            "radial-gradient(circle at center, rgba(213, 97, 62, 0.08), transparent 60%)",
          filter: "blur(100px)",
          zIndex: 0,
        }}
      />
      <div
        className="fixed pointer-events-none"
        style={{
          top: "-30%",
          right: "-20%",
          width: "60vw",
          height: "60vw",
          background:
            "radial-gradient(circle at center, rgba(184, 149, 106, 0.06), transparent 60%)",
          filter: "blur(120px)",
          zIndex: 0,
        }}
      />

      {/* SIDEBAR */}
      <aside className="w-72 bg-ink-deep border-r border-cream/5 flex flex-col p-7 sticky top-0 h-screen flex-shrink-0 relative z-10">
        {/* Top — Brand mark */}
        <Link href="/" className="group">
          <div className="font-serif italic text-3xl tracking-tight mb-1">
            Deshly<span className="text-terracotta">.</span>
          </div>
         
        </Link>

        {/* Nav */}
        <nav className="flex flex-col gap-1 mt-14 flex-1">
          <div className="text-[10px] uppercase tracking-[0.2em] text-cream/40 mb-3 px-2">
            Workspace
          </div>
          {NAV_ITEMS.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-300 relative overflow-hidden ${
                  active
                    ? "bg-gradient-to-r from-terracotta/20 to-transparent text-cream border border-terracotta/30"
                    : "text-cream/55 hover:text-cream hover:bg-cream/[0.03] border border-transparent"
                }`}
              >
                {active && (
                  <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-terracotta" />
                )}
                <div className="font-mono text-[10px] text-brass w-5">{item.step}</div>
                <item.icon className="w-3.5 h-3.5" strokeWidth={1.75} />
                <span className="flex-1 font-medium tracking-tight">{item.label}</span>
                {active && <span className="w-1.5 h-1.5 rounded-full bg-terracotta animate-pulse" />}
              </Link>
            );
          })}
        </nav>

        {/* Bottom — System status */}
        <div className="border-t border-cream/5 pt-5 mt-6 space-y-3">
          <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.18em]">
            <span className="text-brass">BuildFest 2026</span>
            <span className="flex items-center gap-1.5 text-green-400">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              LIVE
            </span>
          </div>
          <Link
            href="/"
            className="flex items-center justify-between text-xs text-cream/45 hover:text-cream transition-colors group"
          >
            <span>Back to home</span>
            <ArrowUpRight className="w-3 h-3 group-hover:rotate-12 transition-transform" />
          </Link>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 overflow-x-hidden relative z-10">
        <div className="px-10 lg:px-16 py-14 max-w-[1500px] mx-auto">
          {/* Page header */}
          {(stepLabel || pageTitle || pageSubtitle) && (
            <header className="mb-14">
              {stepLabel && (
                <div className="flex items-center gap-3 mb-6 text-[10px] uppercase tracking-[0.25em] text-brass">
                  <span className="w-8 h-px bg-brass" />
                  <span>{stepLabel}</span>
                </div>
              )}
              {pageTitle && (
                <h1 className="font-serif text-[clamp(2.5rem,5.5vw,5rem)] leading-[0.95] tracking-tight mb-5">
                  {pageTitle}
                </h1>
              )}
              {pageSubtitle && (
                <p className="text-lg text-cream/55 leading-relaxed max-w-2xl">
                  {pageSubtitle}
                </p>
              )}
            </header>
          )}

          {children}
        </div>
      </main>
    </div>
  );
}