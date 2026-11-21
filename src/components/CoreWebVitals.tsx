import React from "react";
import {
  Activity,
  Clock,
  Target,
  HardDrive,
  Gauge,
  Server,
  Layers,
  Zap,
  Database,
  AlertTriangle,
  ArrowDownRight,
} from "lucide-react";
import type { AuditReport } from "../types";

interface CoreWebVitalsProps {
  report: AuditReport;
}

function parseMetricToMs(val: string | undefined): number {
  if (!val) return 0;
  const cleaned = val.replace(",", ".").trim().toLowerCase();
  const num = parseFloat(cleaned);
  if (Number.isNaN(num)) return 0;
  if (cleaned.endsWith("ms")) return num;
  if (cleaned.endsWith("s")) return num * 1000;
  return num;
}

export default function CoreWebVitals({ report }: CoreWebVitalsProps) {
  const m = report.performance.metrics;
  const inpVal = m.inp || m.fid;

  const lcpMs = parseMetricToMs(m.lcp);
  const inpMs = parseMetricToMs(inpVal);
  const clsNum = parseFloat(String(m.cls || "0").replace(",", ".")) || 0;
  const fcpMs = parseMetricToMs(m.fcp);
  const ttfbMs = parseMetricToMs(m.ttfb);

  const cards = [
    {
      code: "LCP",
      label: "Largest Contentful Paint",
      value: m.lcp,
      ideal: "≤ 2.5s",
      pct: Math.min(100, Math.max(8, (lcpMs / 4500) * 100)),
      status: lcpMs <= 2500 ? "good" : lcpMs <= 4000 ? "warn" : "bad",
      icon: Activity,
    },
    {
      code: m.inp ? "INP" : "FID",
      label: m.inp ? "Interaction to Next Paint" : "First Input Delay",
      value: inpVal,
      ideal: "≤ 200ms",
      pct: Math.min(100, Math.max(8, (inpMs / 500) * 100)),
      status: inpMs <= 200 ? "good" : inpMs <= 500 ? "warn" : "bad",
      icon: Target,
    },
    {
      code: "CLS",
      label: "Cumulative Layout Shift",
      value: m.cls,
      ideal: "≤ 0.10",
      pct: Math.min(100, Math.max(8, (clsNum / 0.3) * 100)),
      status: clsNum <= 0.1 ? "good" : clsNum <= 0.25 ? "warn" : "bad",
      icon: Layers,
    },
    {
      code: "FCP",
      label: "First Contentful Paint",
      value: m.fcp || `${report.performance.loadTimeSeconds}s`,
      ideal: "≤ 1.8s",
      pct: Math.min(100, Math.max(8, ((fcpMs || report.performance.loadTimeSeconds * 1000) / 3500) * 100)),
      status: (fcpMs || report.performance.loadTimeSeconds * 1000) <= 1800 ? "good" : "warn",
      icon: Clock,
    },
    {
      code: "TTFB",
      label: "Time to First Byte",
      value: m.ttfb || (report.architecture ? `${report.architecture.responseTimeMs}ms` : "N/A"),
      ideal: "≤ 800ms",
      pct: Math.min(
        100,
        Math.max(8, ((ttfbMs || report.architecture?.responseTimeMs || 400) / 1800) * 100)
      ),
      status:
        (ttfbMs || report.architecture?.responseTimeMs || 400) <= 800
          ? "good"
          : (ttfbMs || report.architecture?.responseTimeMs || 400) <= 1500
            ? "warn"
            : "bad",
      icon: Server,
    },
    {
      code: "NET",
      label: "Payload & Requisições",
      value: `${report.performance.pageSizeKb} KB`,
      subValue: `${report.performance.requestCount} reqs`,
      ideal: "≤ 1500 KB",
      pct: Math.min(100, Math.max(8, (report.performance.pageSizeKb / 3500) * 100)),
      status:
        report.performance.pageSizeKb <= 1500
          ? "good"
          : report.performance.pageSizeKb <= 3000
            ? "warn"
            : "bad",
      icon: HardDrive,
    },
  ];

  const isRealPsi = report.performance.source === "psi-v5";

  const statusStyles = {
    good: {
      text: "text-emerald-400",
      bar: "bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]",
      pill: "bg-emerald-500/10 border-emerald-500/20 text-emerald-400",
      label: "Ideal",
    },
    warn: {
      text: "text-amber-400",
      bar: "bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.45)]",
      pill: "bg-amber-500/10 border-amber-500/20 text-amber-400",
      label: "Atenção",
    },
    bad: {
      text: "text-rose-400",
      bar: "bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.5)]",
      pill: "bg-rose-500/10 border-rose-500/20 text-rose-400",
      label: "Crítico",
    },
  } as const;

  return (
    <div className="bento-card overflow-hidden animate-fade-in">
      {/* Header */}
      <div className="px-6 py-4 border-b border-zinc-800/80 flex flex-wrap items-center justify-between gap-3 bg-zinc-950/40">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-linear-to-br from-cyan-400/20 to-blue-500/20 border border-cyan-400/35 text-cyan-300 shadow-[0_0_16px_rgba(6,182,212,0.2)]">
            <Gauge className="h-4 w-4" />
          </div>
          <div>
            <h3 className="font-display font-semibold text-zinc-100 text-sm tracking-tight">
              Telemetria Core Web Vitals
            </h3>
            <p className="text-[11px] font-mono text-zinc-400 mt-0.5">
              Camada A · Perfil {report.device === "mobile" ? "Mobile (4G Throttled)" : "Desktop"}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {report.cacheInfo?.hit && (
            <span
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono font-semibold bg-indigo-500/10 border border-indigo-500/25 text-indigo-300"
              title={`Resposta instantânea do Cache LRU (${report.cacheInfo.ttlMinutes} min TTL)`}
            >
              <Database className="h-3 w-3" />
              CACHE HIT · {report.cacheInfo.ttlMinutes}m
            </span>
          )}

          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono font-semibold border ${
              isRealPsi
                ? "bg-emerald-500/10 border-emerald-500/25 text-emerald-400"
                : "bg-amber-500/10 border-amber-500/25 text-amber-400"
            }`}
          >
            {isRealPsi ? <Zap className="h-3 w-3" /> : <AlertTriangle className="h-3 w-3" />}
            {isRealPsi ? "Google PSI v5 Real" : "Fallback Estático"}
          </span>
        </div>
      </div>

      {/* Metrics Bento Subgrid */}
      <div className="p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
        {cards.map((item, idx) => {
          const Icon = item.icon;
          const st = statusStyles[item.status as keyof typeof statusStyles];

          return (
            <div
              key={idx}
              className="p-4 rounded-xl bg-zinc-950/65 border border-zinc-800/80 hover:border-zinc-700 transition-colors flex flex-col gap-3"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <Icon className="h-3.5 w-3.5 text-zinc-500 shrink-0" />
                  <span className="font-mono text-xs font-semibold text-zinc-200">{item.code}</span>
                  <span className="text-[11px] text-zinc-500 truncate hidden sm:inline">
                    {item.label}
                  </span>
                </div>
                <span className={`font-mono text-[10px] font-medium px-2 py-0.5 rounded-full border ${st.pill}`}>
                  {st.label}
                </span>
              </div>

              <div className="flex items-baseline justify-between gap-2">
                <div className="flex items-baseline gap-2">
                  <span className={`font-mono tabular-nums text-xl font-bold tracking-tight ${st.text}`}>
                    {item.value}
                  </span>
                  {"subValue" in item && item.subValue && (
                    <span className="font-mono tabular-nums text-xs text-zinc-400">
                      · {item.subValue}
                    </span>
                  )}
                </div>
                <span className="font-mono text-[10px] text-zinc-500">Meta {item.ideal}</span>
              </div>

              <div className="h-1.5 w-full bg-zinc-800/90 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${st.bar}`}
                  style={{ width: `${item.pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Oportunidades Reais de Otimização do PSI v5 */}
      {report.performance.opportunities && report.performance.opportunities.length > 0 && (
        <div className="px-5 pb-5 pt-1">
          <div className="p-4 rounded-xl bg-zinc-950/50 border border-zinc-800/80">
            <div className="flex items-center justify-between mb-3">
              <span className="font-mono text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                Oportunidades Reais (PageSpeed Insights v5)
              </span>
              <span className="font-mono text-[10px] text-zinc-500">
                {report.performance.opportunities.length} itens
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              {report.performance.opportunities.map((opp) => (
                <div
                  key={opp.id}
                  className="flex items-center justify-between gap-3 px-3 py-2 rounded-lg bg-bento border border-zinc-800/80 text-xs"
                >
                  <span className="text-zinc-200 font-medium truncate">{opp.title}</span>
                  <div className="flex items-center gap-1.5 shrink-0 font-mono tabular-nums text-[10px] font-semibold">
                    {opp.savingsMs && opp.savingsMs > 0 && (
                      <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md bg-rose-500/10 border border-rose-500/20 text-rose-400">
                        <ArrowDownRight className="h-3 w-3" />
                        {opp.savingsMs}ms
                      </span>
                    )}
                    {opp.savingsBytes && opp.savingsBytes > 1024 && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-indigo-500/10 border border-indigo-500/20 text-indigo-300">
                        -{Math.round(opp.savingsBytes / 1024)} KB
                      </span>
                    )}
                    {!opp.savingsMs && !opp.savingsBytes && opp.displayValue && (
                      <span className="px-2 py-0.5 rounded-md bg-zinc-800 text-zinc-300">
                        {opp.displayValue}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
