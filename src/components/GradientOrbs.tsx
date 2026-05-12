"use client";

interface GradientOrbsProps {
  intensity?: "subtle" | "medium" | "intense";
}

export function GradientOrbs({ intensity = "medium" }: GradientOrbsProps) {
  const opacities = {
    subtle: { o1: 0.08, o2: 0.05, o3: 0.06 },
    medium: { o1: 0.15, o2: 0.1, o3: 0.12 },
    intense: { o1: 0.28, o2: 0.18, o3: 0.22 },
  };
  const o = opacities[intensity];

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Orb 1 — terracotta, top-left */}
      <div
        className="absolute orb-1"
        style={{
          top: "-20%",
          left: "-10%",
          width: "60vw",
          height: "60vw",
          background: `radial-gradient(circle at center, rgba(213, 97, 62, ${o.o1}), transparent 60%)`,
          filter: "blur(80px)",
        }}
      />
      {/* Orb 2 — brass, center-right */}
      <div
        className="absolute orb-2"
        style={{
          top: "30%",
          right: "-15%",
          width: "55vw",
          height: "55vw",
          background: `radial-gradient(circle at center, rgba(184, 149, 106, ${o.o2}), transparent 60%)`,
          filter: "blur(100px)",
        }}
      />
      {/* Orb 3 — deep terracotta, bottom */}
      <div
        className="absolute orb-3"
        style={{
          bottom: "-15%",
          left: "20%",
          width: "50vw",
          height: "50vw",
          background: `radial-gradient(circle at center, rgba(177, 69, 37, ${o.o3}), transparent 60%)`,
          filter: "blur(90px)",
        }}
      />
    </div>
  );
}