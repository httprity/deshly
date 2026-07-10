"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Sparkles,
  Wand2,
  Globe,
  FileText,
  ArrowUpRight,
  Menu,
  X,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { ReactNode, useState, useEffect } from "react";
import { useLenis } from "@/lib/hooks";
import { T } from "./system";

// ============================================================
// ProductShell — shared chrome for all internal app pages.
// Light "Brand OS" system (matches the landing page): paper surfaces,
// ink text, terracotta signal, Parkinsans display, hairline rules.
// Scoped under `.brandos` so the design tokens + display font apply.
// ============================================================

interface ProductShellProps {
  children: ReactNode;
  stepLabel?: string;
  pageTitle?: ReactNode;
  pageSubtitle?: ReactNode;
  /** Optional element rendered at the right of the page header (e.g. a brand chip). */
  headerAside?: ReactNode;
}

const NAV_ITEMS = [
  { href: "/brand-dna", label: "Brand DNA", icon: Sparkles, step: "01" },
  { href: "/generator", label: "Generator", icon: Wand2, step: "02" },
  { href: "/clusters", label: "Clusters", icon: Globe, step: "03" },
  { href: "/docs", label: "Documentation", icon: FileText, step: "—" },
];

export function ProductShell({
  children,
  stepLabel,
  pageTitle,
  pageSubtitle,
  headerAside,
}: ProductShellProps) {
  useLenis();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = localStorage.getItem("deshlySidebarCollapsed");
    if (saved === "true") setCollapsed(true);
    else if (saved === "false") setCollapsed(false);
    else if (window.innerWidth < 1280) setCollapsed(true);
  }, []);

  function toggleCollapsed() {
    setCollapsed((prev) => {
      const next = !prev;
      if (typeof window !== "undefined") {
        localStorage.setItem("deshlySidebarCollapsed", String(next));
      }
      return next;
    });
  }

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  const navLink = (item: (typeof NAV_ITEMS)[number], active: boolean, mobile: boolean) => (
    <Link
      key={item.href}
      href={item.href}
      title={collapsed && !mobile ? item.label : undefined}
      onClick={() => mobile && setMobileOpen(false)}
      className={`group flex items-center rounded-lg transition-colors duration-200 relative ${
        collapsed && !mobile ? "justify-center px-0 py-3" : "gap-3 px-3 py-2.5"
      } ${
        active
          ? "bg-[#0F0F0F] text-[#F6F3EE]"
          : "text-[#0F0F0F]/60 hover:text-[#0F0F0F] hover:bg-[#EDE8DE]"
      }`}
    >
      {(!collapsed || mobile) && (
        <span className={`${T.monoData} w-5 ${active ? "text-[#F6F3EE]/60" : "text-[#D5613E]"}`}>
          {item.step}
        </span>
      )}
      <item.icon className="w-4 h-4 flex-shrink-0" strokeWidth={1.85} />
      {(!collapsed || mobile) && (
        <span className="flex-1 text-sm font-medium tracking-[-0.01em]">{item.label}</span>
      )}
      {collapsed && !mobile && active && (
        <span className="absolute right-1.5 top-1.5 w-1.5 h-1.5 rounded-full bg-[#D5613E]" />
      )}
    </Link>
  );

  return (
    <div className="brandos bo-grain min-h-screen bg-[#F6F3EE] text-[#0F0F0F] lg:flex relative antialiased">
      {/* MOBILE TOP BAR */}
      <div className="lg:hidden sticky top-0 z-30 bg-[#F6F3EE]/85 backdrop-blur-xl border-b bo-rule px-5 py-4 flex items-center justify-between">
        <Link href="/" className="font-display text-xl font-semibold tracking-[-0.03em]">
          Deshly<span className="text-[#D5613E]">.</span>
        </Link>
        <button
          onClick={() => setMobileOpen(true)}
          aria-label="Open menu"
          className="w-11 h-11 rounded-lg border bo-rule-strong flex items-center justify-center hover:bg-[#EDE8DE] transition-colors"
        >
          <Menu className="w-5 h-5" strokeWidth={1.85} />
        </button>
      </div>

      {/* MOBILE DRAWER OVERLAY */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          className="lg:hidden fixed inset-0 bg-[#0F0F0F]/30 backdrop-blur-sm z-40"
        />
      )}

      {/* MOBILE DRAWER */}
      <aside
        className={`lg:hidden fixed top-0 right-0 bottom-0 w-[85%] max-w-sm bg-[#FBF9F5] border-l bo-rule flex flex-col p-7 z-50 transition-transform duration-300 ${
          mobileOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between mb-12">
          <Link href="/" className="font-display text-2xl font-semibold tracking-[-0.03em]">
            Deshly<span className="text-[#D5613E]">.</span>
          </Link>
          <button
            onClick={() => setMobileOpen(false)}
            aria-label="Close menu"
            className="w-11 h-11 rounded-lg border bo-rule-strong flex items-center justify-center hover:bg-[#EDE8DE] transition-colors"
          >
            <X className="w-5 h-5" strokeWidth={1.85} />
          </button>
        </div>
        <nav className="flex flex-col gap-1 flex-1">
          <div className={`${T.monoLabel} text-[#0F0F0F]/40 mb-3 px-2`}>Workspace</div>
          {NAV_ITEMS.map((item) => navLink(item, pathname === item.href, true))}
        </nav>
        <ShellFooter />
      </aside>

      {/* DESKTOP SIDEBAR */}
      <aside
        className={`hidden lg:flex bg-[#FBF9F5] border-r bo-rule flex-col sticky top-0 h-screen flex-shrink-0 relative z-10 transition-[width] duration-300 ease-in-out ${
          collapsed ? "w-20 px-3 py-7" : "w-64 px-6 py-7"
        }`}
      >
        <div className={`flex items-center ${collapsed ? "justify-center" : "justify-between"}`}>
          <Link href="/" className="group" aria-label="Deshly home">
            <div className="font-display text-2xl font-semibold tracking-[-0.03em] leading-none">
              {collapsed ? "D" : "Deshly"}
              <span className="text-[#D5613E]">.</span>
            </div>
          </Link>
          {!collapsed && (
            <button
              onClick={toggleCollapsed}
              aria-label="Collapse sidebar"
              title="Collapse sidebar"
              className="w-8 h-8 rounded-lg border bo-rule-strong flex items-center justify-center text-[#0F0F0F]/50 hover:text-[#0F0F0F] hover:bg-[#EDE8DE] transition-colors flex-shrink-0"
            >
              <PanelLeftClose className="w-4 h-4" strokeWidth={1.85} />
            </button>
          )}
        </div>

        {collapsed && (
          <button
            onClick={toggleCollapsed}
            aria-label="Expand sidebar"
            title="Expand sidebar"
            className="w-10 h-10 mx-auto mt-4 rounded-lg border bo-rule-strong flex items-center justify-center text-[#0F0F0F]/50 hover:text-[#0F0F0F] hover:bg-[#EDE8DE] transition-colors"
          >
            <PanelLeftOpen className="w-4 h-4" strokeWidth={1.85} />
          </button>
        )}

        <nav className={`flex flex-col gap-1 flex-1 ${collapsed ? "mt-6" : "mt-12"}`}>
          {!collapsed && <div className={`${T.monoLabel} text-[#0F0F0F]/40 mb-3 px-2`}>Workspace</div>}
          {NAV_ITEMS.map((item) => navLink(item, pathname === item.href, false))}
        </nav>

        {collapsed ? (
          <div className="border-t bo-rule pt-5 mt-6 flex flex-col items-center gap-3">
            <span className="w-2 h-2 rounded-full bg-[#D5613E] bo-pulse" title="Live" />
            <Link href="/" title="Back to home" className="text-[#0F0F0F]/45 hover:text-[#0F0F0F] transition-colors">
              <ArrowUpRight className="w-4 h-4" />
            </Link>
          </div>
        ) : (
          <ShellFooter />
        )}
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 overflow-x-hidden relative z-10 min-w-0">
        <div className="px-5 sm:px-8 lg:px-14 py-8 sm:py-12 lg:py-14 max-w-[1320px] mx-auto">
          {(stepLabel || pageTitle || pageSubtitle) && (
            <header className="mb-10 sm:mb-12 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
              <div className="min-w-0">
                {stepLabel && (
                  <div className={`flex items-center gap-3 mb-5 ${T.monoLabel} text-[#0F0F0F]/55`}>
                    <span className="w-8 h-px bg-[#D5613E]" />
                    <span>{stepLabel}</span>
                  </div>
                )}
                {pageTitle && (
                  <h1 className="font-display font-semibold tracking-[-0.03em] leading-[0.98] text-[clamp(2rem,5vw,3.75rem)] text-[#0F0F0F]">
                    {pageTitle}
                  </h1>
                )}
                {pageSubtitle && (
                  <p className={`mt-4 ${T.subhead} max-w-2xl`}>{pageSubtitle}</p>
                )}
              </div>
              {headerAside && <div className="flex-shrink-0">{headerAside}</div>}
            </header>
          )}
          {children}
        </div>
      </main>
    </div>
  );
}

function ShellFooter() {
  return (
    <div className="border-t bo-rule pt-5 mt-6 space-y-3">
      <div className={`flex items-center justify-between ${T.monoLabel}`}>
        <span className="text-[#0F0F0F]/45">BuildFest 2026</span>
        <span className="flex items-center gap-1.5 text-[#D5613E]">
          <span className="w-1.5 h-1.5 rounded-full bg-[#D5613E] bo-pulse" />
          Live
        </span>
      </div>
      <Link
        href="/"
        className="flex items-center justify-between text-[13px] text-[#0F0F0F]/50 hover:text-[#0F0F0F] transition-colors group"
      >
        <span>Back to home</span>
        <ArrowUpRight className="w-3.5 h-3.5 group-hover:rotate-12 transition-transform" />
      </Link>
    </div>
  );
}
