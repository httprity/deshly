"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Sparkles, Wand2, Globe, FileText, ArrowUpRight, Menu, X } from "lucide-react";
import { ReactNode, useState, useEffect } from "react";
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
  const [mobileOpen, setMobileOpen] = useState(false);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  return (
    <div className="grain min-h-screen bg-void text-cream lg:flex relative">
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

      {/* MOBILE TOP BAR — only visible below lg */}
      <div className="lg:hidden sticky top-0 z-30 bg-ink-deep/95 backdrop-blur-xl border-b border-cream/5 px-5 py-4 flex items-center justify-between">
        <Link href="/" className="font-serif italic text-2xl tracking-tight">
          Deshly<span className="text-terracotta">.</span>
        </Link>
        <button
          onClick={() => setMobileOpen(true)}
          aria-label="Open menu"
          className="w-11 h-11 rounded-xl border border-cream/10 flex items-center justify-center text-cream hover:bg-cream/5 active:bg-cream/10 transition-colors"
        >
          <Menu className="w-5 h-5" strokeWidth={1.75} />
        </button>
      </div>

      {/* MOBILE DRAWER OVERLAY */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          className="lg:hidden fixed inset-0 bg-void/70 backdrop-blur-sm z-40"
        />
      )}

      {/* MOBILE DRAWER */}
      <aside
        className={`lg:hidden fixed top-0 right-0 bottom-0 w-[85%] max-w-sm bg-ink-deep border-l border-cream/5 flex flex-col p-7 z-50 transition-transform duration-300 ${
          mobileOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between mb-12">
          <Link href="/" className="font-serif italic text-3xl tracking-tight">
            Deshly<span className="text-terracotta">.</span>
          </Link>
          <button
            onClick={() => setMobileOpen(false)}
            aria-label="Close menu"
            className="w-11 h-11 rounded-xl border border-cream/10 flex items-center justify-center text-cream hover:bg-cream/5 active:bg-cream/10 transition-colors"
          >
            <X className="w-5 h-5" strokeWidth={1.75} />
          </button>
        </div>

        <nav className="flex flex-col gap-1 flex-1">
          <div className="text-[10px] uppercase tracking-[0.2em] text-cream/40 mb-3 px-2">
            Workspace
          </div>
          {NAV_ITEMS.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`group flex items-center gap-3 px-3 py-3.5 rounded-xl text-base transition-all duration-300 relative overflow-hidden ${
                  active
                    ? "bg-gradient-to-r from-terracotta/20 to-transparent text-cream border border-terracotta/30"
                    : "text-cream/65 hover:text-cream hover:bg-cream/[0.03] border border-transparent"
                }`}
              >
                {active && (
                  <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-terracotta" />
                )}
                <div className="font-mono text-[11px] text-brass w-5">{item.step}</div>
                <item.icon className="w-4 h-4" strokeWidth={1.75} />
                <span className="flex-1 font-medium tracking-tight">{item.label}</span>
                {active && <span className="w-1.5 h-1.5 rounded-full bg-terracotta animate-pulse" />}
              </Link>
            );
          })}
        </nav>

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
            className="flex items-center justify-between text-sm text-cream/45 hover:text-cream transition-colors group"
          >
            <span>Back to home</span>
            <ArrowUpRight className="w-3.5 h-3.5 group-hover:rotate-12 transition-transform" />
          </Link>
        </div>
      </aside>

      {/* DESKTOP SIDEBAR — only visible at lg+ */}
      <aside className="hidden lg:flex w-72 bg-ink-deep border-r border-cream/5 flex-col p-7 sticky top-0 h-screen flex-shrink-0 relative z-10">
        <Link href="/" className="group">
          <div className="font-serif italic text-3xl tracking-tight mb-1">
            Deshly<span className="text-terracotta">.</span>
          </div>
        </Link>

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
      <main className="flex-1 overflow-x-hidden relative z-10 min-w-0">
        <div className="px-5 sm:px-8 lg:px-16 py-8 sm:py-12 lg:py-14 max-w-[1500px] mx-auto">
          {(stepLabel || pageTitle || pageSubtitle) && (
            <header className="mb-10 sm:mb-12 lg:mb-14">
              {stepLabel && (
                <div className="flex items-center gap-3 mb-5 sm:mb-6 text-[10px] uppercase tracking-[0.25em] text-brass">
                  <span className="w-8 h-px bg-brass" />
                  <span>{stepLabel}</span>
                </div>
              )}
              {pageTitle && (
                <h1 className="font-serif text-[clamp(2rem,7vw,5rem)] leading-[1] tracking-tight mb-4 sm:mb-5">
                  {pageTitle}
                </h1>
              )}
              {pageSubtitle && (
                <p className="text-base sm:text-lg text-cream/55 leading-relaxed max-w-2xl">
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