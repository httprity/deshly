"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  TrendingUp,
  Users,
  Calendar,
  ShoppingBag,
  MapPin,
} from "lucide-react";
import type { Cluster } from "@/lib/types";
import { ProductShell } from "@/components/ProductShell";

// Leaflet — client-only
const MapContainer = dynamic(() => import("react-leaflet").then((m) => m.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import("react-leaflet").then((m) => m.TileLayer), { ssr: false });
const CircleMarker = dynamic(() => import("react-leaflet").then((m) => m.CircleMarker), { ssr: false });
const Tooltip = dynamic(() => import("react-leaflet").then((m) => m.Tooltip), { ssr: false });

const FLAGS: Record<string, string> = {
  "United Kingdom": "🇬🇧",
  Canada: "🇨🇦",
  "United States": "🇺🇸",
  "United Arab Emirates": "🇦🇪",
  Australia: "🇦🇺",
  Malaysia: "🇲🇾",
  Qatar: "🇶🇦",
  "Saudi Arabia": "🇸🇦",
  Bangladesh: "🇧🇩",
};

export default function ClustersPage() {
  const [clusters, setClusters] = useState<Cluster[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Cluster | null>(null);
  const [filter, setFilter] = useState<"all" | "diaspora" | "local">("all");

  useEffect(() => {
    async function loadClusters() {
      try {
        const res = await fetch("/api/clusters-list");
        const data = await res.json();
        if (res.ok && data.clusters) setClusters(data.clusters);
      } catch (e) {
        console.error("Failed to load clusters", e);
      } finally {
        setLoading(false);
      }
    }
    loadClusters();
  }, []);

  const filteredClusters = clusters.filter((c) =>
    filter === "all" ? true : c.segment_type === filter
  );

  const totalSize = clusters.reduce((acc, c) => acc + (c.estimated_size || 0), 0);
  const diasporaSize = clusters
    .filter((c) => c.segment_type === "diaspora")
    .reduce((acc, c) => acc + (c.estimated_size || 0), 0);
  const countries = new Set(clusters.map((c) => c.country)).size;

  return (
    <ProductShell
      stepLabel="THE AUDIENCE GRAPH"
      pageTitle={
        <>
          13 clusters.{" "}
          <span className="italic text-terracotta">One graph.</span>
        </>
      }
      pageSubtitle={
        <>
          Every Bangladeshi consumer cluster Deshly maps — across 8 countries plus local Bangladesh. Click any node to see its intelligence: occasions, channels, AOV, peak windows, cultural notes.
        </>
      }
    >
      {/* STATS STRIP */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <StatCard label="Total clusters" value={clusters.length.toString()} />
        <StatCard label="Countries mapped" value={countries.toString()} />
        <StatCard
          label="Diaspora reach"
          value={`${(diasporaSize / 1000).toFixed(0)}k`}
          accent
        />
        <StatCard
          label="Total mapped"
          value={`${(totalSize / 1000).toFixed(0)}k`}
        />
      </div>

      {/* FILTERS */}
      <div className="flex gap-2 mb-6">
        {(["all", "diaspora", "local"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-5 py-2.5 rounded-full text-[11px] uppercase tracking-[0.15em] font-medium transition-all ${
              filter === f
                ? "bg-gradient-to-r from-terracotta to-terracotta-deep text-[#F6F3EE] shadow-[0_0_20px_rgba(213,97,62,0.25)]"
                : "bg-[#0F0F0F]/[0.04] border border-[#0F0F0F]/10 text-[#0F0F0F]/60 hover:border-[#6F655A]/30 hover:text-[#0F0F0F]"
            }`}
          >
            {f === "all" ? "All clusters" : f}
          </button>
        ))}
        <div className="ml-auto flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-[#0F0F0F]/40 font-mono">
          <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
          {filteredClusters.length} active nodes
        </div>
      </div>

      {/* MAP + LIST */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        {/* MAP */}
        <div className="lg:col-span-2 bg-[#FBF9F5] rounded-2xl sm:rounded-3xl overflow-hidden h-[400px] sm:h-[500px] lg:h-[600px] relative border border-[#0F0F0F]/8">
          {/* Top accent */}
          <div
            className="absolute top-0 left-0 right-0 h-px z-10"
            style={{
              background:
                "linear-gradient(90deg, transparent, rgba(213, 97, 62, 0.4), transparent)",
            }}
          />

          {loading ? (
            <div className="flex flex-col items-center justify-center h-full">
              <div className="w-12 h-12 rounded-full border-2 border-terracotta/30 border-t-terracotta animate-spin mb-4" />
              <div className="text-[#0F0F0F]/50 text-sm font-mono">Loading cluster graph...</div>
            </div>
          ) : (
            <MapContainer
              center={[25, 60]}
              zoom={2}
              style={{ height: "100%", width: "100%", background: "#0A0908" }}
              scrollWheelZoom={true}
              worldCopyJump={true}
            >
              <TileLayer
                url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
                subdomains="abcd"
                maxZoom={19}
              />
              {filteredClusters.map((c) => {
                const radius = Math.max(8, Math.min(28, Math.sqrt(c.estimated_size) / 25));
                const color = c.segment_type === "diaspora" ? "#D5613E" : "#B8956A";
                return (
                  <CircleMarker
                    key={c.id}
                    center={[c.latitude, c.longitude]}
                    radius={radius}
                    pathOptions={{
                      fillColor: color,
                      fillOpacity: 0.65,
                      color: color,
                      weight: 2,
                    }}
                    eventHandlers={{
                      click: () => setSelected(c),
                    }}
                  >
                    <Tooltip direction="top" offset={[0, -8]}>
                      <div className="text-sm font-medium">
                        {FLAGS[c.country]} {c.city} — {(c.estimated_size / 1000).toFixed(1)}k
                      </div>
                    </Tooltip>
                  </CircleMarker>
                );
              })}
            </MapContainer>
          )}

          {/* Legend overlay */}
          <div className="absolute bottom-4 left-4 bg-[#EDE8DE]/90 backdrop-blur-xl rounded-2xl p-4 border border-[#0F0F0F]/10 z-10">
            <div className="text-[10px] uppercase tracking-[0.18em] text-[#6F655A] mb-3 font-medium">
              Legend
            </div>
            <div className="space-y-2 text-xs text-[#0F0F0F]">
              <div className="flex items-center gap-2.5">
                <span className="w-3 h-3 rounded-full bg-terracotta shadow-[0_0_8px_rgba(213,97,62,0.6)]" />
                <span>Diaspora cluster</span>
              </div>
              <div className="flex items-center gap-2.5">
                <span className="w-3 h-3 rounded-full bg-[#6F655A] shadow-[0_0_8px_rgba(184,149,106,0.5)]" />
                <span>Local Bangladesh</span>
              </div>
            </div>
          </div>

          {/* Compass overlay */}
          <div className="absolute top-4 right-4 bg-[#EDE8DE]/90 backdrop-blur-xl rounded-xl px-3 py-2 border border-[#0F0F0F]/10 z-10 flex items-center gap-2">
            <MapPin className="w-3 h-3 text-[#6F655A]" />
            <span className="text-[10px] uppercase tracking-[0.18em] text-[#0F0F0F]/60 font-mono">
              Dhaka 23.81° N
            </span>
          </div>
        </div>

        {/* CLUSTER LIST */}
        <div className="bg-[#FBF9F5] rounded-2xl sm:rounded-3xl p-5 max-h-[500px] lg:max-h-[600px] overflow-y-auto border border-[#0F0F0F]/8 relative">
          <div className="text-[10px] uppercase tracking-[0.18em] text-[#6F655A] font-medium mb-4 px-2 sticky top-0 bg-[#FBF9F5] z-10 pb-2 border-b border-[#0F0F0F]/5">
            {filteredClusters.length} CLUSTERS
          </div>
          <div className="space-y-2">
            {filteredClusters.map((c, i) => {
              const isSelected = selected?.id === c.id;
              return (
                <motion.button
                  key={c.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.03 }}
                  onClick={() => setSelected(c)}
                  className={`w-full text-left p-4 rounded-2xl transition-all relative overflow-hidden ${
                    isSelected
                      ? "bg-gradient-to-br from-terracotta/15 to-transparent border border-terracotta/40"
                      : "bg-[#0F0F0F]/[0.02] border border-[#0F0F0F]/8 hover:border-[#6F655A]/30 hover:bg-[#0F0F0F]/[0.05]"
                  }`}
                >
                  {isSelected && (
                    <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-terracotta" />
                  )}
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="text-2xl">{FLAGS[c.country]}</div>
                    <div className={`text-[9px] uppercase tracking-[0.18em] font-medium ${
                      isSelected ? "text-terracotta" : "text-[#0F0F0F]/40"
                    }`}>
                      {c.segment_type}
                    </div>
                  </div>
                  <div className="font-display font-semibold text-lg leading-tight text-[#0F0F0F]">
                    {c.city}
                  </div>
                  <div className="text-[10px] mt-1.5 text-[#0F0F0F]/45 font-mono">
                    {c.age_band} · {(c.estimated_size / 1000).toFixed(1)}k
                  </div>
                </motion.button>
              );
            })}
          </div>
        </div>
      </div>

      {/* DETAIL PANEL */}
      <AnimatePresence>
        {selected && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-gradient-to-br from-[#FBF9F5] to-[#FBF9F5] rounded-2xl sm:rounded-3xl p-5 sm:p-8 lg:p-10 border border-[#0F0F0F]/8 relative overflow-hidden"
          >
            <div
              className="absolute top-0 left-0 right-0 h-px"
              style={{
                background:
                  "linear-gradient(90deg, transparent, rgba(184, 149, 106, 0.4), transparent)",
              }}
            />
            <div
              className="absolute pointer-events-none"
              style={{
                top: "0%",
                right: "0%",
                width: "50%",
                height: "50%",
                background:
                  "radial-gradient(circle at center, rgba(213, 97, 62, 0.06), transparent 60%)",
                filter: "blur(60px)",
              }}
            />

            <div className="relative">
              {/* Header */}
              <div className="flex items-start justify-between mb-6 sm:mb-8 gap-3">
                <div className="flex items-start gap-3 sm:gap-5 min-w-0">
                  <div className="text-4xl sm:text-6xl flex-shrink-0">{FLAGS[selected.country]}</div>
                  <div className="min-w-0">
                    <div className="text-[10px] uppercase tracking-[0.2em] text-[#6F655A] mb-2">
                      CLUSTER · {selected.segment_type.toUpperCase()}
                    </div>
                    <h2 className="font-display font-semibold text-3xl sm:text-4xl lg:text-5xl leading-[0.95] tracking-tight break-words">
                      {selected.city}
                    </h2>
                    <div className="text-sm text-[#0F0F0F]/50 mt-2 font-mono">
                      {selected.country} · {selected.age_band}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setSelected(null)}
                  className="text-[#0F0F0F]/40 hover:text-[#0F0F0F] w-10 h-10 rounded-full border border-[#0F0F0F]/10 hover:border-terracotta/40 flex items-center justify-center transition-all"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Hero Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
                <DetailStat
                  icon={Users}
                  label="Estimated size"
                  value={
                    <>
                      {(selected.estimated_size / 1000).toFixed(1)}
                      <span className="text-base text-[#0F0F0F]/40">k</span>
                    </>
                  }
                />
                <DetailStat
                  icon={ShoppingBag}
                  label="AOV range"
                  value={
                    <span className="text-xl">
                      {selected.currency} {selected.avg_order_value_min}–{selected.avg_order_value_max}
                    </span>
                  }
                />
                <DetailStat
                  icon={TrendingUp}
                  label="Engagement"
                  value={
                    <>
                      {(selected.typical_engagement_rate * 100).toFixed(1)}
                      <span className="text-base text-[#0F0F0F]/40">%</span>
                    </>
                  }
                />
                <DetailStat
                  icon={Calendar}
                  label="Peak window"
                  value={
                    Array.isArray(selected.peak_shopping_windows) &&
                    selected.peak_shopping_windows[0]
                      ? (
                        <span className="text-base leading-tight block pt-1">
                          {selected.peak_shopping_windows[0].day} {selected.peak_shopping_windows[0].hours.split(" ")[0]}
                        </span>
                      )
                      : "—"
                  }
                />
              </div>

              {/* Two-column detail grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Left column — Occasions + Channels */}
                <div>
                  <DetailSection title="Primary occasions">
                    <div className="flex flex-wrap gap-2">
                      {selected.primary_occasions.map((o) => (
                        <span
                          key={o}
                          className="px-3 py-1.5 bg-terracotta/15 text-terracotta border border-terracotta/25 rounded-full text-xs"
                        >
                          {o}
                        </span>
                      ))}
                    </div>
                  </DetailSection>

                  <DetailSection title="Channel preferences">
                    <div className="space-y-2.5">
                      {Object.entries(selected.channel_preferences || {})
                        .sort(([, a]: any, [, b]: any) => b - a)
                        .map(([channel, weight]) => (
                          <div key={channel} className="flex items-center gap-3 text-xs">
                            <div className="w-24 capitalize text-[#0F0F0F]/65 font-medium">
                              {channel}
                            </div>
                            <div className="flex-1 bg-[#0F0F0F]/5 rounded-full h-1.5 overflow-hidden">
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${(weight as number) * 100}%` }}
                                transition={{ duration: 0.8, ease: "easeOut" }}
                                className="bg-gradient-to-r from-[#6F655A] to-terracotta h-full"
                              />
                            </div>
                            <div className="text-[#0F0F0F]/50 text-[10px] w-10 text-right font-mono">
                              {((weight as number) * 100).toFixed(0)}%
                            </div>
                          </div>
                        ))}
                    </div>
                  </DetailSection>
                </div>

                {/* Right column — Language, Aesthetic, Gift, Cultural */}
                <div className="space-y-6">
                  <DetailSection title="Language mix">
                    <div className="text-sm text-[#0F0F0F]/80 leading-relaxed">
                      {selected.language_mix}
                    </div>
                  </DetailSection>

                  <DetailSection title="Aesthetic">
                    <div className="text-sm text-[#0F0F0F]/80 leading-relaxed">
                      {selected.aesthetic_preference}
                    </div>
                  </DetailSection>

                  <DetailSection title="Gift-giving pattern">
                    <div className="text-sm text-[#0F0F0F]/80 leading-relaxed">
                      {selected.gift_giving_pattern}
                    </div>
                  </DetailSection>

                  <DetailSection title="Cultural notes">
                    <div className="text-xs text-[#0F0F0F]/55 leading-relaxed italic">
                      {selected.cultural_notes}
                    </div>
                  </DetailSection>
                </div>
              </div>

              {/* Footer — Confidence */}
              <div className="mt-8 pt-6 border-t border-[#0F0F0F]/8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-[10px] uppercase tracking-[0.15em] text-[#0F0F0F]/40 font-mono">
                <div className="flex items-center gap-2">
                  <span>Confidence</span>
                  <span className="text-[#6F655A]">{(selected.confidence_score * 100).toFixed(0)}%</span>
                </div>
                <div>
                  Source: {selected.data_sources?.join(" · ") || "curated"}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </ProductShell>
  );
}

// ============================================================================
// PRIMITIVES
// ============================================================================
function StatCard({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return (
    <div
      className={`rounded-2xl p-5 border transition-all hover:border-[#6F655A]/30 ${
        accent
          ? "bg-gradient-to-br from-terracotta/10 to-transparent border-terracotta/25"
          : "bg-[#FBF9F5] border-[#0F0F0F]/8"
      }`}
    >
      <div
        className={`text-[10px] uppercase tracking-[0.18em] mb-2 ${
          accent ? "text-terracotta" : "text-[#0F0F0F]/45"
        }`}
      >
        {label}
      </div>
      <div className="font-display font-semibold text-4xl text-[#0F0F0F] leading-none">{value}</div>
    </div>
  );
}

function DetailStat({
  icon: Icon,
  label,
  value,
}: {
  icon: any;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="bg-[#EDE8DE] border border-[#0F0F0F]/8 rounded-2xl p-4">
      <Icon className="w-3.5 h-3.5 text-[#6F655A] mb-2.5" strokeWidth={1.75} />
      <div className="text-[9px] uppercase tracking-[0.18em] text-[#0F0F0F]/45 mb-1.5">
        {label}
      </div>
      <div className="font-display font-semibold text-2xl text-[#0F0F0F] leading-tight">
        {value}
      </div>
    </div>
  );
}

function DetailSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-4">
      <div className="text-[10px] uppercase tracking-[0.18em] text-[#6F655A] mb-2.5 font-medium">
        {title}
      </div>
      {children}
    </div>
  );
}