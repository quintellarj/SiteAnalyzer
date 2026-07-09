import React from "react";
import { AlertTriangle, Clock, Activity, Target, HardDrive } from "lucide-react";
import { AuditReport } from "../types";

interface CoreWebVitalsProps {
  report: AuditReport;
}

export default function CoreWebVitals({ report }: CoreWebVitalsProps) {
  const metrics = [
    { label: "Tempo de Carregamento", value: report.performance.loadTimeSeconds, unit: "s", icon: Clock },
    { label: "LCP (Largest Contentful Paint)", value: report.performance.metrics.lcp, unit: "", icon: Activity },
    { label: "FID (First Input Delay)", value: report.performance.metrics.fid, unit: "", icon: Target },
    { label: "Tamanho Total", value: report.performance.pageSizeKb, unit: "KB", icon: HardDrive }
  ];

  return (
    <div className="bg-white border-2 border-black shadow-[4px_4px_0px_#000000] rounded-xl overflow-hidden mt-6 animate-fade-in">
      <div className="bg-[#f8f9fa] border-b-2 border-black p-4 flex items-center justify-between">
        <h3 className="font-black text-black text-lg uppercase tracking-tight">Core Web Vitals</h3>
        <div className="flex items-center gap-2 bg-[#D11A2A] text-white px-3 py-1 rounded border-2 border-black shadow-[2px_2px_0px_#000000]">
          <AlertTriangle className="h-4 w-4" />
          <span className="text-[10px] font-bold uppercase tracking-wider">Atenção</span>
        </div>
      </div>
      <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
        {metrics.map((m, i) => {
          const Icon = m.icon;
          const valNum = parseFloat(m.value.toString());
          const maxVal = m.label.includes("Tamanho") ? 5000 : 5; // Fake max to calculate percentage
          let pct = (valNum / maxVal) * 100;
          if (pct > 100) pct = 100;
          if (pct < 5) pct = 5;
          
          let barColor = "bg-emerald-500";
          if (pct > 40) barColor = "bg-amber-400";
          if (pct > 80) barColor = "bg-[#D11A2A]";
          
          return (
            <div key={i} className="flex flex-col gap-2">
              <div className="flex justify-between items-end">
                <span className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                  <Icon className="h-4 w-4 text-black" />
                  {m.label}
                </span>
                <span className="font-mono text-sm font-black text-black">
                  {m.value}{m.unit}
                </span>
              </div>
              <div className="h-4 w-full bg-slate-100 border-2 border-black rounded-full overflow-hidden">
                <div 
                  className={`h-full border-r-2 border-black ${barColor}`} 
                  style={{ width: `${pct}%` }} 
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
