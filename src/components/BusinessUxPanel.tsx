import React from "react";
import {
  Sparkles,
  Target,
  ShieldCheck,
  MousePointerClick,
  CheckCircle2,
  AlertTriangle,
  Search,
  Compass,
} from "lucide-react";
import type { BusinessUxAnalysis } from "../types";

interface BusinessUxPanelProps {
  analysis?: BusinessUxAnalysis;
}

export default function BusinessUxPanel({ analysis }: BusinessUxPanelProps) {
  if (!analysis) return null;

  const scoreTone =
    analysis.score >= 80
      ? "bg-emerald-500/10 border-emerald-500/25 text-emerald-400"
      : analysis.score >= 55
        ? "bg-amber-500/10 border-amber-500/25 text-amber-400"
        : "bg-rose-500/10 border-rose-500/25 text-rose-400";

  const ctaTone =
    analysis.ctaAnalysis.presence === "forte"
      ? "bg-emerald-500/10 border-emerald-500/25 text-emerald-400"
      : analysis.ctaAnalysis.presence === "moderada"
        ? "bg-amber-500/10 border-amber-500/25 text-amber-400"
        : "bg-rose-500/10 border-rose-500/25 text-rose-400";

  const gscTone =
    analysis.gscImpact?.indexingRisk === "baixo"
      ? "bg-emerald-500/10 border-emerald-500/25 text-emerald-400"
      : analysis.gscImpact?.indexingRisk === "medio"
        ? "bg-amber-500/10 border-amber-500/25 text-amber-400"
        : "bg-rose-500/10 border-rose-500/25 text-rose-400";

  return (
    <div className="bento-card overflow-hidden animate-fade-in relative">
      {/* Subtle Fuchsia → Violet → Cyan accent top line */}
      <div className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-fuchsia-500/80 to-transparent" />

      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-800/80 bg-obsidian/55 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-linear-to-br from-fuchsia-500 via-violet-600 to-cyan-500 text-white shadow-[0_0_24px_rgba(217,70,239,0.4)]">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-display font-semibold text-zinc-100 text-sm tracking-tight">
                Diagnóstico Estratégico IA · Negócio, UX & GSC
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold badge-ai-gemini">
                Gemini Structured JSON
              </span>
            </div>
            <p className="text-[11px] font-mono text-zinc-400 mt-0.5">
              Nicho detectado: <span className="text-zinc-200">{analysis.niche}</span>
            </p>
          </div>
        </div>

        <div className={`px-3 py-1 rounded-full font-mono tabular-nums text-xs font-bold border ${scoreTone}`}>
          Conversão & UX · {analysis.score}/100
        </div>
      </div>

      {/* Bento Grid Content */}
      <div className="p-5 grid grid-cols-1 lg:grid-cols-12 gap-4 text-xs">
        {/* 1. Proposta de Valor (6 cols) */}
        <div className="lg:col-span-6 p-4 rounded-xl bg-zinc-950/65 border border-zinc-800/80 flex flex-col gap-2.5">
          <div className="flex items-center justify-between gap-2 pb-2 border-b border-zinc-800/80">
            <span className="flex items-center gap-2 font-display font-semibold text-zinc-200 text-xs">
              <Target className="h-4 w-4 text-indigo-400" />
              Clareza da Proposta de Valor
            </span>
            <span className="font-mono tabular-nums text-[11px] font-bold px-2 py-0.5 rounded-md bg-zinc-900 border border-zinc-700 text-indigo-300">
              {analysis.valueProposition.clarityScore}/100
            </span>
          </div>
          <p className="font-medium text-zinc-100 leading-relaxed">{analysis.valueProposition.summary}</p>
          <p className="text-zinc-400 leading-relaxed">{analysis.valueProposition.assessment}</p>
        </div>

        {/* 2. Calls-to-Action (6 cols) */}
        <div className="lg:col-span-6 p-4 rounded-xl bg-zinc-950/65 border border-zinc-800/80 flex flex-col gap-2.5">
          <div className="flex items-center justify-between gap-2 pb-2 border-b border-zinc-800/80">
            <span className="flex items-center gap-2 font-display font-semibold text-zinc-200 text-xs">
              <MousePointerClick className="h-4 w-4 text-violet-400" />
              Presença de Calls-to-Action (CTAs)
            </span>
            <span className={`font-mono text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full border ${ctaTone}`}>
              {analysis.ctaAnalysis.presence}
            </span>
          </div>
          <p className="text-zinc-400 leading-relaxed">{analysis.ctaAnalysis.assessment}</p>

          {analysis.ctaAnalysis.detectedCtas.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-0.5">
              {analysis.ctaAnalysis.detectedCtas.map((cta, idx) => (
                <span
                  key={idx}
                  className="px-2 py-0.5 rounded-md bg-zinc-900 border border-zinc-800 font-mono text-[10px] text-zinc-300"
                >
                  "{cta}"
                </span>
              ))}
            </div>
          )}

          {analysis.ctaAnalysis.recommendations.length > 0 && (
            <ul className="list-disc pl-4 space-y-1 text-[11px] text-zinc-300 pt-1">
              {analysis.ctaAnalysis.recommendations.map((rec, i) => (
                <li key={i}>{rec}</li>
              ))}
            </ul>
          )}
        </div>

        {/* 3. Sinais de Confiança (6 cols) */}
        <div className="lg:col-span-6 p-4 rounded-xl bg-zinc-950/65 border border-zinc-800/80 flex flex-col gap-3">
          <div className="flex items-center justify-between gap-2 pb-2 border-b border-zinc-800/80">
            <span className="flex items-center gap-2 font-display font-semibold text-zinc-200 text-xs">
              <ShieldCheck className="h-4 w-4 text-emerald-400" />
              Sinais de Confiança & Credibilidade
            </span>
            <span className="font-mono tabular-nums text-[11px] font-bold px-2 py-0.5 rounded-md bg-zinc-900 border border-zinc-700 text-emerald-400">
              {analysis.trustSignals.score}/100
            </span>
          </div>
          <p className="text-zinc-400 leading-relaxed">{analysis.trustSignals.assessment}</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div className="p-3 rounded-lg bg-bento border border-zinc-800/80">
              <span className="font-mono text-[10px] font-semibold uppercase text-emerald-400 block mb-1.5">
                Identificados
              </span>
              <ul className="space-y-1.5">
                {analysis.trustSignals.found.map((item, i) => (
                  <li key={i} className="flex items-start gap-1.5 text-[11px] text-zinc-300">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0 mt-0.5" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="p-3 rounded-lg bg-bento border border-zinc-800/80">
              <span className="font-mono text-[10px] font-semibold uppercase text-rose-400 block mb-1.5">
                Oportunidades
              </span>
              <ul className="space-y-1.5">
                {analysis.trustSignals.missing.map((item, i) => (
                  <li key={i} className="flex items-start gap-1.5 text-[11px] text-zinc-300">
                    <AlertTriangle className="h-3.5 w-3.5 text-amber-400 shrink-0 mt-0.5" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* 4. Adequação ao Nicho & UX (6 cols) */}
        <div className="lg:col-span-6 p-4 rounded-xl bg-zinc-950/65 border border-zinc-800/80 flex flex-col gap-3">
          <div className="flex items-center justify-between gap-2 pb-2 border-b border-zinc-800/80">
            <span className="flex items-center gap-2 font-display font-semibold text-zinc-200 text-xs">
              <Compass className="h-4 w-4 text-indigo-400" />
              Adequação ao Nicho & UX
            </span>
            <span className="font-mono tabular-nums text-[11px] font-bold px-2 py-0.5 rounded-md bg-zinc-900 border border-zinc-700 text-indigo-300">
              {analysis.nicheFit.score}/100
            </span>
          </div>
          <p className="text-zinc-400 leading-relaxed">{analysis.nicheFit.assessment}</p>
          {analysis.nicheFit.uxRecommendations.length > 0 && (
            <div className="p-3 rounded-lg bg-bento border border-zinc-800/80 mt-auto">
              <span className="font-mono text-[10px] font-semibold uppercase text-zinc-400 block mb-1.5">
                Ações Práticas de UX / CRO
              </span>
              <ul className="list-decimal pl-4 space-y-1 text-[11px] text-zinc-300">
                {analysis.nicheFit.uxRecommendations.map((ux, i) => (
                  <li key={i}>{ux}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* 5. Impacto no Google Search Console (12 cols) */}
        {analysis.gscImpact && (
          <div className="lg:col-span-12 p-4 rounded-xl bg-indigo-950/20 border border-indigo-500/25 flex flex-col gap-3">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-indigo-500/20">
              <span className="flex items-center gap-2 font-display font-semibold text-zinc-100 text-xs">
                <Search className="h-4 w-4 text-indigo-400" />
                Impacto Projetado no Google Search Console
              </span>
              <span className={`font-mono text-[10px] font-semibold uppercase px-2.5 py-0.5 rounded-full border ${gscTone}`}>
                Risco de Indexação: {analysis.gscImpact.indexingRisk}
              </span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
              <div className="lg:col-span-7 space-y-2.5">
                <p className="text-zinc-300 leading-relaxed">{analysis.gscImpact.summary}</p>
                {analysis.gscImpact.affectedReports.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {analysis.gscImpact.affectedReports.map((rep, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 rounded-md bg-zinc-900/90 border border-zinc-700/80 font-mono text-[10px] text-zinc-300"
                      >
                        {rep}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {analysis.gscImpact.actionPlan.length > 0 && (
                <div className="lg:col-span-5 p-3 rounded-lg bg-zinc-950/70 border border-zinc-800/80">
                  <span className="font-mono text-[10px] font-semibold uppercase text-indigo-300 block mb-1.5">
                    Checklist de Validação no GSC
                  </span>
                  <ul className="list-decimal pl-4 space-y-1 text-[11px] text-zinc-300">
                    {analysis.gscImpact.actionPlan.map((step, i) => (
                      <li key={i}>{step}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
