"use client";

import { useNumberCount } from "@/lib/hooks";

interface NumberCounterProps {
  value: number;
  suffix?: string;
  prefix?: string;
  duration?: number;
}

export function NumberCounter({ value, suffix = "", prefix = "", duration = 2 }: NumberCounterProps) {
  const { ref, current } = useNumberCount(value, duration);

  return (
    <span ref={ref}>
      {prefix}
      {current.toLocaleString()}
      {suffix}
    </span>
  );
}