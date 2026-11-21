import React from "react";
import { Gauge, Eye, SearchCheck, ShieldCheck } from "lucide-react";
import type { AuditReport } from "../types";

interface ScoreCardsProps {
  report: AuditReport;
}

function getTelemetryTone(score: number) {
  if (score >= 90) {
    return {
      stroke: "#00E599",
      glow: "drop-shadow(0 0 10px rgba(0, 229, 153, 0.65))",
      textClass: "text-emerald-300",
      badgeClass: "bg-emerald-500/15 border-emerald-400/35 text-emerald-300",
      label: "Ideal",
    };
  }
  if (score >= 50) {
    return {
      stroke: "#FFB020",
      glow: "drop-shadow(0 0 10px rgba(255, 176, 32, 0.6))",
      textClass: "text-amber-300",
      badgeClass: "bg-amber-500/15 border-amber-400/35 text-amber-300",
      label: "Atenção",
    };
  }
  return {
    stroke: "#FF3B6B",
    glow: "drop-shadow(0 0 10px rgba(255, 59, 107, 0.65))",
    textClass: "text-rose-300",
    badgeClass: "bg-rose-500/15 border-rose-400/35 text-rose-300",
    label: "Crítico",
  };
}

export default function ScoreCards({ report }: ScoreCardsProps) {
  const interactionMetric = report.performance.metrics.inp
    ? `INP ${report.performance.metrics.inp}`
    : `FID ${report.performance.metrics.fid}`;

  const securityScore =
    report.scores.security ??
    report.security?.score ??
    report.architecture?.securityScore ??
    75;

  const activeSecHeaders = report.security
    ? `${report.security.headers.filter((h) => h.present).length}/${report.security.headers.length} headers`
    : report.architecture
      ? `${report.architecture.securityHeaders.filter((h) => h.present).length}/${report.architecture.securityHeaders.length} headers`
      : "AppSec Passivo";

  const securitySub = report.security?.ssl.certificateValid
    ? report.security.ssl.daysUntilExpiration !== null
      ? `SSL ${report.security.ssl.daysUntilExpiration}d · ${activeSecHeaders}`
      : `SSL Ativo · ${activeSecHeaders}`
    : report.security
      ? `SSL Alerta · ${activeSecHeaders}`
      : activeSecHeaders;

  const metrics = [
    {
      name: "Performance",
      score: report.scores.performance,
      desc: "Core Web Vitals reais, velocidade de renderização e rede.",
      sub: `LCP ${report.performance.metrics.lcp} · ${interactionMetric}`,
      icon: Gauge,
    },
    {
      name: "Acessibilidade",
      score: report.scores.accessibility,
      desc: "Conformidade WCAG, leitores de tela, contraste e semântica.",
      sub: `${report.accessibility.issues.length} alerta(s) técnico(s)`,
      icon: Eye,
    },
    {
      name: "SEO Técnico",
      score: report.scores.seo,
      desc: "Indexabilidade, meta tags, canonical, Schema JSON-LD e sitemaps.",
      sub: `${report.seo.issues.length} ponto(s) de otimização`,
      icon: SearchCheck,
    },
    {
      name: "Segurança",
      score: securityScore,
      desc: "Certificado SSL/TLS, headers HTTP, Mixed Content e cookies.",
      sub: securitySub,
      icon: ShieldCheck,
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-12 gap-4 animate-fade-in">
      {metrics.map((metric, i) => {
        const Icon = metric.icon;
        const tone = getTelemetryTone(metric.score);
        const radius = 38;
        const circumference = 2 * Math.PI * radius;
        const strokeDashoffset = circumference - (metric.score / 100) * circumference;

        return (
          <div
            key={i}
            className="xl:col-span-3 bento-card p-4.5 flex items-center gap-4 relative overflow-hidden group"
          >
            {/* Subtle top hairline glow */}
            <div
              className="absolute inset-x-0 top-0 h-px opacity-50 transition-opacity group-hover:opacity-100"
              style={{
                background: `linear-gradient(90deg, transparent, ${tone.stroke}, transparent)`,
              }}
            />

            {/* Animated Neon Radial Gauge SVG */}
            <div className="relative shrink-0 w-20 h-20 flex items-center justify-center">
              <svg className="w-20 h-20 -rotate-90" viewBox="0 0 100 100">
                <circle
                  cx="50"
                  cy="50"
                  r={radius}
                  stroke="#27272A"
                  strokeWidth="7"
                  fill="transparent"
                />
                <circle
                  cx="50"
                  cy="50"
                  r={radius}
                  stroke={tone.stroke}
                  strokeWidth="7"
                  strokeLinecap="round"
                  fill="transparent"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  style={{ filter: tone.glow }}
                  className="transition-all duration-1000 ease-out"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className={`font-mono tabular-nums text-xl font-bold leading-none ${tone.textClass}`}>
                  {metric.score}
                </span>
                <span className="font-mono text-[8.5px] text-zinc-500 uppercase tracking-widest mt-0.5">
                  /100
                </span>
              </div>
            </div>

            {/* Metric Details */}
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-1.5">
                <div className="flex items-center gap-1.5 min-w-0">
                  <Icon className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
                  <h3 className="font-display font-semibold text-zinc-100 text-xs sm:text-sm tracking-tight truncate">
                    {metric.name}
                  </h3>
                </div>
                <span
                  className={`font-mono text-[9.5px] font-semibold px-1.5 py-0.5 rounded-full border shrink-0 ${tone.badgeClass}`}
                >
                  {tone.label}
                </span>
              </div>

              <p className="text-[11px] text-zinc-400 mt-1 leading-relaxed line-clamp-2">
                {metric.desc}
              </p>

              <div
                className="inline-flex items-center mt-2.5 px-2 py-0.5 bg-zinc-950/80 border border-zinc-800 rounded-md text-[10px] font-mono tabular-nums text-zinc-300 max-w-full truncate"
                title={metric.sub}
              >
                <span className="truncate">{metric.sub}</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
