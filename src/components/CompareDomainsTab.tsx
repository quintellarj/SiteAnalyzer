import React from "react";
import { HelpCircle, FileText, TrendingUp, ArrowRightLeft } from "lucide-react";
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  ZAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { DomainProfile } from "../types";

interface CompareDomainsTabProps {
  domains: DomainProfile[];
  compareSourceId: string;
  compareTargetId: string;
  setCompareSourceId: (id: string) => void;
  setCompareTargetId: (id: string) => void;
  handleExportComparePDF: () => void | Promise<void>;
  isDarkMode?: boolean;
}

function getConsecutiveStats(
  history: Array<{ performance: number; accessibility: number; seo: number }> | undefined
) {
  if (!history || history.length === 0) {
    return { avg: 0, trend: "none" as const, diff: 0, count: 0 };
  }
  const last3 = history.slice(-3);
  const scores = last3.map((h) => Math.round((h.performance + h.accessibility + h.seo) / 3));
  const avg = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);

  let trend: "up" | "down" | "stable" | "none" = "none";
  let diff = 0;

  if (scores.length >= 2) {
    const latest = scores[scores.length - 1];
    const previous = scores[0];
    diff = latest - previous;
    if (diff > 0) trend = "up";
    else if (diff < 0) trend = "down";
    else trend = "stable";
  }

  return { avg, trend, diff, count: scores.length };
}

export default function CompareDomainsTab({
  domains,
  compareSourceId,
  compareTargetId,
  setCompareSourceId,
  setCompareTargetId,
  handleExportComparePDF,
}: CompareDomainsTabProps) {
  if (domains.length < 2) {
    return (
      <div className="bento-card p-12 text-center animate-fade-in">
        <HelpCircle className="h-10 w-10 text-zinc-500 mx-auto mb-3" />
        <p className="text-zinc-200 font-semibold text-sm">
          É necessário ter pelo menos 2 domínios cadastrados para comparar telemetrias.
        </p>
        <p className="text-zinc-400 text-xs mt-1">
          Audite um segundo domínio na barra superior e retorne a este painel.
        </p>
      </div>
    );
  }

  const source = domains.find((d) => d.id === compareSourceId);
  const target = domains.find((d) => d.id === compareTargetId);
  const sReport = source?.latestReport;
  const tReport = target?.latestReport;
  const sStats = getConsecutiveStats(source?.reportsHistory);
  const tStats = getConsecutiveStats(target?.reportsHistory);

  return (
    <div className="flex flex-col gap-5 animate-fade-in">
      {/* Domain Selectors Bento Bar */}
      <div className="bento-card p-5 flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-zinc-800/80">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/25 text-indigo-400">
              <ArrowRightLeft className="h-4 w-4" />
            </div>
            <div>
              <h3 className="font-display font-semibold text-zinc-100 text-sm">
                Comparador de Domínios
              </h3>
              <p className="text-[11px] text-zinc-400">
                Benchmark lado a lado de Core Web Vitals, SEO e evolução histórica
              </p>
            </div>
          </div>

          {compareSourceId && compareTargetId && (
            <button
              onClick={handleExportComparePDF}
              className="btn-indigo-glow px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 cursor-pointer"
            >
              <FileText className="h-3.5 w-3.5" />
              <span>Exportar Comparativo (PDF)</span>
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-[11px] font-mono uppercase tracking-wider text-zinc-400 block mb-1.5">
              Domínio de Referência (A)
            </label>
            <select
              value={compareSourceId}
              onChange={(e) => setCompareSourceId(e.target.value)}
              className="w-full rounded-xl px-3.5 py-2.5 text-sm cursor-pointer"
            >
              {domains.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.url}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[11px] font-mono uppercase tracking-wider text-zinc-400 block mb-1.5">
              Domínio Comparador (B)
            </label>
            <select
              value={compareTargetId}
              onChange={(e) => setCompareTargetId(e.target.value)}
              className="w-full rounded-xl px-3.5 py-2.5 text-sm cursor-pointer"
            >
              {domains.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.url}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Scatter Plot Matrix */}
      <div className="bento-card p-5">
        <div className="flex items-center gap-2 mb-1.5">
          <TrendingUp className="h-4 w-4 text-indigo-400" />
          <h3 className="font-display font-semibold text-sm text-zinc-100">
            Matriz de Correlação · Performance vs. SEO
          </h3>
        </div>
        <p className="text-xs text-zinc-400 mb-5">
          Quanto mais próximo do quadrante superior direito (100, 100), maior a maturidade técnica.
        </p>

        <div className="h-75 w-full font-mono text-xs">
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 16, right: 24, bottom: 20, left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272A" />
              <XAxis
                type="number"
                dataKey="performance"
                name="Performance"
                domain={[0, 100]}
                stroke="#71717A"
                tick={{ fill: "#A1A1AA", fontSize: 11 }}
                label={{
                  value: "Performance",
                  position: "insideBottom",
                  offset: -8,
                  fill: "#71717A",
                  fontSize: 11,
                }}
              />
              <YAxis
                type="number"
                dataKey="seo"
                name="SEO"
                domain={[0, 100]}
                stroke="#71717A"
                tick={{ fill: "#A1A1AA", fontSize: 11 }}
                label={{
                  value: "SEO",
                  angle: -90,
                  position: "insideLeft",
                  fill: "#71717A",
                  fontSize: 11,
                }}
              />
              <ZAxis type="number" range={[110, 110]} />
              <Tooltip
                cursor={{ strokeDasharray: "3 3", stroke: "#6366F1" }}
                content={({ active, payload }) => {
                  if (active && payload && payload.length > 0) {
                    const data = payload[0]?.payload as
                      | { name: string; performance: number; seo: number }
                      | undefined;
                    if (!data) return null;
                    return (
                      <div className="p-3 rounded-xl bg-bento border border-zinc-700 shadow-2xl text-zinc-100">
                        <p className="font-display font-semibold text-xs mb-1.5 pb-1 border-b border-zinc-800">
                          {data.name}
                        </p>
                        <p className="text-[11px] font-mono tabular-nums text-zinc-300">
                          Performance: <span className="font-bold text-indigo-400">{data.performance}</span>
                        </p>
                        <p className="text-[11px] font-mono tabular-nums text-zinc-300">
                          SEO: <span className="font-bold text-emerald-400">{data.seo}</span>
                        </p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Scatter
                name="Domínios"
                data={domains
                  .filter((d) => d.latestReport)
                  .map((d) => ({
                    name: d.url,
                    performance: d.latestReport!.scores.performance,
                    seo: d.latestReport!.scores.seo,
                  }))}
                fill="#6366F1"
              />
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Side by Side Comparison */}
      {source && target && sReport && tReport ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
              {/* Historical Trends */}
              <div className="lg:col-span-12 bento-card p-5">
                <h3 className="font-display font-semibold text-sm text-zinc-100 mb-3">
                  Tendência Histórica & Média (3 últimas auditorias)
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {[
                    { dom: source, stats: sStats, color: "text-indigo-400" },
                    { dom: target, stats: tStats, color: "text-violet-400" },
                  ].map(({ dom, stats, color }) => (
                    <div
                      key={dom.id}
                      className="p-4 rounded-xl bg-zinc-950/65 border border-zinc-800/80 flex items-center justify-between"
                    >
                      <div>
                        <span className="font-mono text-[10px] uppercase tracking-wider text-zinc-500 block">
                          {dom.url}
                        </span>
                        <span className={`font-mono tabular-nums text-2xl font-bold mt-1 block ${color}`}>
                          {stats.avg}
                          <span className="text-xs text-zinc-500 font-normal"> / 100</span>
                        </span>
                      </div>
                      <div className="font-mono text-xs font-semibold">
                        {stats.trend === "up" && (
                          <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                            ↑ +{stats.diff}
                          </span>
                        )}
                        {stats.trend === "down" && (
                          <span className="px-2.5 py-1 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400">
                            ↓ {stats.diff}
                          </span>
                        )}
                        {stats.trend === "stable" && (
                          <span className="px-2.5 py-1 rounded-full bg-zinc-800 border border-zinc-700 text-zinc-300">
                            → Estável
                          </span>
                        )}
                        {stats.trend === "none" && <span className="text-zinc-500">Insuficiente</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Score Bars (8 cols) */}
              <div className="lg:col-span-8 bento-card p-5 flex flex-col gap-5">
                <h3 className="font-display font-semibold text-sm text-zinc-100">
                  Diferença de Pontuações
                </h3>
                {[
                  {
                    name: "Performance",
                    sScore: sReport.scores.performance,
                    tScore: tReport.scores.performance,
                  },
                  {
                    name: "Acessibilidade",
                    sScore: sReport.scores.accessibility,
                    tScore: tReport.scores.accessibility,
                  },
                  { name: "SEO Técnico", sScore: sReport.scores.seo, tScore: tReport.scores.seo },
                ].map((item, idx) => {
                  const diff = item.tScore - item.sScore;
                  return (
                    <div key={idx} className="space-y-2">
                      <div className="flex justify-between text-xs">
                        <span className="font-medium text-zinc-200">{item.name}</span>
                        <span
                          className={`font-mono tabular-nums font-bold ${
                            diff > 0
                              ? "text-emerald-400"
                              : diff < 0
                                ? "text-rose-400"
                                : "text-zinc-400"
                          }`}
                        >
                          {diff > 0 ? `+${diff} pts` : diff === 0 ? "Empate" : `${diff} pts`}
                        </span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="flex items-center gap-2.5">
                          <span className="text-[11px] font-mono text-zinc-400 w-24 truncate">
                            {source.url}
                          </span>
                          <div className="flex-1 bg-zinc-800 h-2 rounded-full overflow-hidden">
                            <div
                              className="bg-indigo-500 h-full rounded-full"
                              style={{ width: `${item.sScore}%` }}
                            />
                          </div>
                          <span className="text-xs font-mono tabular-nums font-bold text-indigo-400 w-7 text-right">
                            {item.sScore}
                          </span>
                        </div>

                        <div className="flex items-center gap-2.5">
                          <span className="text-[11px] font-mono text-zinc-400 w-24 truncate">
                            {target.url}
                          </span>
                          <div className="flex-1 bg-zinc-800 h-2 rounded-full overflow-hidden">
                            <div
                              className="bg-violet-500 h-full rounded-full"
                              style={{ width: `${item.tScore}%` }}
                            />
                          </div>
                          <span className="text-xs font-mono tabular-nums font-bold text-violet-400 w-7 text-right">
                            {item.tScore}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Core Web Vitals Comparison (4 cols) */}
              <div className="lg:col-span-4 bento-card p-5 flex flex-col gap-3">
                <h3 className="font-display font-semibold text-sm text-zinc-100">Core Web Vitals</h3>
                {[
                  {
                    label: "LCP",
                    a: sReport.performance.metrics.lcp,
                    b: tReport.performance.metrics.lcp,
                  },
                  {
                    label: "INP / FID",
                    a: sReport.performance.metrics.inp || sReport.performance.metrics.fid,
                    b: tReport.performance.metrics.inp || tReport.performance.metrics.fid,
                  },
                  {
                    label: "CLS",
                    a: sReport.performance.metrics.cls,
                    b: tReport.performance.metrics.cls,
                  },
                  {
                    label: "Payload",
                    a: `${sReport.performance.pageSizeKb} KB`,
                    b: `${tReport.performance.pageSizeKb} KB`,
                  },
                  {
                    label: "Críticos",
                    a: `${[...sReport.performance.issues, ...sReport.accessibility.issues, ...sReport.seo.issues].filter((i) => i.severity === "critical").length}`,
                    b: `${[...tReport.performance.issues, ...tReport.accessibility.issues, ...tReport.seo.issues].filter((i) => i.severity === "critical").length}`,
                  },
                ].map((row) => (
                  <div
                    key={row.label}
                    className="flex items-center justify-between py-2 border-b border-zinc-800/80 last:border-0 text-xs"
                  >
                    <span className="font-mono text-[11px] text-zinc-400">{row.label}</span>
                    <div className="flex items-center gap-3 font-mono tabular-nums font-semibold">
                      <span className="text-indigo-400">{row.a}</span>
                      <span className="text-zinc-600">vs</span>
                      <span className="text-violet-400">{row.b}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
      ) : (
        <div className="bento-card p-6 text-center text-xs text-zinc-400">
          Certifique-se de que ambos os domínios possuem relatórios de auditoria gerados.
        </div>
      )}
    </div>
  );
}
