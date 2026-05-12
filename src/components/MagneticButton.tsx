"use client";

import Link from "next/link";
import { useMagnetic } from "@/lib/hooks";
import { ArrowUpRight } from "lucide-react";
import { ReactNode } from "react";

interface MagneticButtonProps {
  href?: string;
  children: ReactNode;
  variant?: "primary" | "ghost" | "outline";
  size?: "sm" | "md" | "lg";
  showArrow?: boolean;
  onClick?: () => void;
}

export function MagneticButton({
  href,
  children,
  variant = "primary",
  size = "md",
  showArrow = true,
  onClick,
}: MagneticButtonProps) {
  const outerRef = useMagnetic(0.25);
  const innerRef = useMagnetic(0.55);

  const sizeClasses = {
    sm: "px-5 py-2.5 text-xs",
    md: "px-7 py-3.5 text-sm",
    lg: "px-9 py-5 text-base",
  };

  const variantClasses = {
    primary:
      "bg-gradient-to-br from-terracotta to-terracotta-deep text-cream border border-terracotta-glow/40 hover:border-terracotta-glow",
    ghost:
      "bg-cream/5 text-cream border border-cream/15 hover:bg-cream/10 hover:border-cream/30",
    outline:
      "bg-transparent text-cream border border-cream/25 hover:border-brass",
  };

  const content = (
    <div ref={outerRef} className="magnetic inline-block">
      <div
        ref={innerRef}
        className={`magnetic inline-flex items-center gap-2 rounded-full font-medium tracking-tight transition-all duration-300 ${sizeClasses[size]} ${variantClasses[variant]}`}
      >
        <span>{children}</span>
        {showArrow && (
          <ArrowUpRight className={size === "sm" ? "w-3.5 h-3.5" : size === "lg" ? "w-5 h-5" : "w-4 h-4"} strokeWidth={1.75} />
        )}
      </div>
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="inline-block">
        {content}
      </Link>
    );
  }

  return (
    <button onClick={onClick} className="inline-block">
      {content}
    </button>
  );
}