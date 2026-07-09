import React from "react";
import { AuditReport } from "../types";

interface ScoreCardsProps {
  report: AuditReport;
}

export default function ScoreCards({ report }: ScoreCardsProps) {
  const metrics = [
    { 
      name: "Desempenho", 
      score: report.scores.performance,
      desc: "Avalia a velocidade, tamanho de página e eficiência de renderização estática.",
      sub: `LCP: ${report.performance.metrics.lcp} | FID: ${report.performance.metrics.fid}`
    },
    { 
      name: "Acessibilidade", 
      score: report.scores.accessibility,
      desc: "Verifica compatibilidade com leitores de tela, contrastes WCAG e navegação.",
      sub: `${report.accessibility.issues.length} problemas identificados`
    },
    { 
      name: "Boas Práticas SEO", 
      score: report.scores.seo,
      desc: "Analisa meta tags, indexabilidade, sitemaps e cabeçalhos semânticos.",
      sub: `${report.seo.issues.length} pontos de atenção`
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-fade-in">
      {metrics.map((metric, i) => {
        const radius = 38;
        const circumference = 2 * Math.PI * radius;
        const strokeDashoffset = circumference - (metric.score / 100) * circumference;
        
        let strokeColor = "#D11A2A"; // Red
        if (metric.score >= 90) strokeColor = "#10b981"; // Green
        else if (metric.score >= 50) strokeColor = "#f59e0b"; // Orange

        return (
          <div key={i} className="bg-white border-2 border-black shadow-[4px_4px_0px_#000000] rounded-xl p-6 flex items-center gap-6">
            {/* SVG Circle Gauge */}
            <div className="relative flex-shrink-0">
              <svg className="w-24 h-24 transform -rotate-90">
                <circle cx="48" cy="48" r={radius} stroke="#e2e8f0" strokeWidth="12" fill="transparent" />
                <circle 
                  cx="48" 
                  cy="48" 
                  r={radius} 
                  stroke={strokeColor} 
                  strokeWidth="12" 
                  fill="transparent" 
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  className="transition-all duration-1000 ease-out"
                />
              </svg>
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center">
                <span className="text-2xl font-black text-black leading-none">{metric.score}</span>
              </div>
            </div>

            {/* Details Text */}
            <div>
              <h3 className="font-black text-black text-base uppercase tracking-tight">{metric.name}</h3>
              <p className="text-[11px] text-slate-600 font-semibold mt-1 leading-relaxed">{metric.desc}</p>
              <div className="inline-block mt-2.5 px-2 py-1 bg-slate-100 border border-slate-300 rounded text-[10px] font-mono text-black font-bold">
                {metric.sub}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
