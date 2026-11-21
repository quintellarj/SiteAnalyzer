import React from "react";
import { Cpu, Globe, Shield, Sparkles } from "lucide-react";

interface AuditSkeletonLoaderProps {
  steps: string[];
  currentStep: number;
  targetUrl?: string;
  device?: "mobile" | "desktop";
}

/**
 * Skeleton Loader Dark Telemetry & Bento Grid.
 * Mantém a proporção exata do Bento Grid durante a auditoria real (~5 a 10s),
 * evitando Cumulative Layout Shift (CLS) e exibindo o progresso das 3 camadas.
 */
export function AuditSkeletonLoader({
  steps,
  currentStep,
  targetUrl,
  device = "desktop",
}: AuditSkeletonLoaderProps) {
  const progressPct = Math.min(100, Math.round(((currentStep + 1) / steps.length) * 100));

  const layers = [
    { label: "Camada A · PSI v5", icon: Cpu, active: currentStep >= 1 },
    { label: "Camada B · Cheerio SEO", icon: Globe, active: currentStep >= 2 },
    { label: "Camada C · Headers & Stack", icon: Shield, active: currentStep >= 3 },
    { label: "Camada IA · Negócio & GSC", icon: Sparkles, active: currentStep >= 4 },
  ];

  return (
    <div className="flex flex-col gap-5 animate-fade-in" role="status" aria-live="polite">
      {/* Telemetry Progress Header */}
      <div className="bento-card p-6 relative overflow-hidden">
        <div className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-cyan-400 to-transparent" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800/80">
          <div className="flex items-center gap-3.5">
            <div className="h-10 w-10 rounded-xl bg-linear-to-br from-cyan-400 via-blue-500 to-violet-600 shadow-[0_0_24px_rgba(6,182,212,0.45)] flex items-center justify-center shrink-0">
              <Globe className="h-5 w-5 text-white animate-spin" />
            </div>
            <div>
              <h3 className="font-display font-semibold text-zinc-100 text-base tracking-tight">
                Coletando Telemetria Real em Paralelo
              </h3>
              <p className="text-xs font-mono text-zinc-400 mt-0.5">
                {targetUrl ? targetUrl : "Pipeline 3 Camadas"} ·{" "}
                {device === "mobile" ? "Mobile" : "Desktop"}
              </p>
            </div>
          </div>

          <div className="px-3 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/30 font-mono tabular-nums text-xs font-semibold text-indigo-300">
            Etapa {currentStep + 1}/{steps.length} · {progressPct}%
          </div>
        </div>

        {/* Progress Track */}
        <div className="mt-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-mono text-zinc-300">{steps[currentStep]}</span>
            <span className="text-[11px] font-mono text-zinc-500">~5 a 10s</span>
          </div>
          <div className="w-full h-2 bg-zinc-900 border border-zinc-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-linear-to-r from-cyan-400 via-blue-500 to-fuchsia-500 shadow-[0_0_16px_rgba(6,182,212,0.65)] rounded-full transition-all duration-700 ease-out"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>

        {/* Layer pills */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 mt-4">
          {layers.map((layer, idx) => {
            const Icon = layer.icon;
            return (
              <div
                key={idx}
                className={`px-3 py-2 rounded-xl border font-mono text-[11px] flex items-center gap-2 transition-all ${
                  layer.active
                    ? "bg-indigo-500/10 border-indigo-500/30 text-indigo-200"
                    : "bg-zinc-950/60 border-zinc-800/80 text-zinc-500"
                }`}
              >
                <Icon className={`h-3.5 w-3.5 shrink-0 ${layer.active ? "text-indigo-400 animate-pulse" : ""}`} />
                <span className="truncate">{layer.label}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Skeleton Row 1: 4 Radial Gauges (12 cols: Performance, A11y, SEO, Segurança) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-12 gap-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="xl:col-span-3 bento-card p-4.5 flex items-center gap-4">
            <div className="w-20 h-20 rounded-full bg-zinc-800/60 border border-zinc-700/50 animate-pulse shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-3.5 w-3/4 rounded-md bg-zinc-800/70 animate-pulse" />
              <div className="h-3 w-full rounded bg-zinc-800/50 animate-pulse" />
              <div className="h-5 w-2/3 rounded-md bg-zinc-800/60 animate-pulse mt-2" />
            </div>
          </div>
        ))}
      </div>

      {/* Skeleton Row 2: Core Web Vitals (6 cards) */}
      <div className="bento-card p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="h-5 w-48 rounded-md bg-zinc-800/70 animate-pulse" />
          <div className="h-6 w-32 rounded-full bg-zinc-800/60 animate-pulse" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {[0, 1, 2, 3, 4, 5].map((idx) => (
            <div
              key={idx}
              className="p-4 rounded-xl bg-zinc-950/60 border border-zinc-800/70 space-y-3"
            >
              <div className="flex justify-between">
                <div className="h-3.5 w-28 rounded bg-zinc-800/60 animate-pulse" />
                <div className="h-4 w-14 rounded-full bg-zinc-800/60 animate-pulse" />
              </div>
              <div className="h-6 w-24 rounded bg-zinc-800/70 animate-pulse" />
              <div className="h-1.5 w-full rounded-full bg-zinc-800/60 animate-pulse" />
            </div>
          ))}
        </div>
      </div>

      {/* Skeleton Row 3: Bento 7/5 (SEO + Architecture) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-7 bento-card p-5 space-y-4">
          <div className="h-5 w-44 rounded bg-zinc-800/70 animate-pulse" />
          <div className="grid grid-cols-2 gap-3">
            <div className="h-16 rounded-xl bg-zinc-800/50 animate-pulse" />
            <div className="h-16 rounded-xl bg-zinc-800/50 animate-pulse" />
          </div>
          <div className="h-24 rounded-xl bg-zinc-800/40 animate-pulse" />
        </div>
        <div className="lg:col-span-5 bento-card p-5 space-y-4">
          <div className="h-5 w-40 rounded bg-zinc-800/70 animate-pulse" />
          <div className="grid grid-cols-3 gap-2">
            <div className="h-12 rounded-xl bg-zinc-800/50 animate-pulse" />
            <div className="h-12 rounded-xl bg-zinc-800/50 animate-pulse" />
            <div className="h-12 rounded-xl bg-zinc-800/50 animate-pulse" />
          </div>
          <div className="h-28 rounded-xl bg-zinc-800/40 animate-pulse" />
        </div>
      </div>
    </div>
  );
}

/**
 * Fallback Dark Telemetry para React.Suspense nas abas lazy-loaded
 */
export function TabSkeletonLoader({ label = "Carregando módulo..." }: { label?: string }) {
  return (
    <div className="flex flex-col gap-4 animate-fade-in">
      <div className="bento-card p-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-indigo-500/20 border border-indigo-500/30 animate-pulse" />
          <span className="font-mono text-xs text-zinc-300">{label}</span>
        </div>
        <div className="h-5 w-24 rounded-full bg-zinc-800/60 animate-pulse" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="h-52 bento-card p-5 space-y-3">
          <div className="h-4 w-1/2 rounded bg-zinc-800/70 animate-pulse" />
          <div className="h-32 w-full rounded-xl bg-zinc-800/40 animate-pulse" />
        </div>
        <div className="h-52 bento-card p-5 space-y-3">
          <div className="h-4 w-1/2 rounded bg-zinc-800/70 animate-pulse" />
          <div className="h-32 w-full rounded-xl bg-zinc-800/40 animate-pulse" />
        </div>
      </div>
    </div>
  );
}
