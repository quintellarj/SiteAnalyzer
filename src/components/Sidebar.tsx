import React from "react";
import { Globe, TrendingUp, ArrowRightLeft, BarChart3, Mail, CheckSquare, Shield } from "lucide-react";

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  sessionUser: { role: "admin" | "user" } | null;
}

export default function Sidebar({ activeTab, setActiveTab, sessionUser }: SidebarProps) {
  const tabs = [
    { id: "audit", label: "Relatório Auditoria", icon: Globe },
    { id: "history", label: "Histórico", icon: TrendingUp },
    { id: "compare", label: "Comparar", icon: ArrowRightLeft },
    { id: "integrations", label: "Integrações", icon: BarChart3 },
    { id: "email", label: "Relatórios Mensais", icon: Mail },
    { id: "checklist", label: "Checklist SEO", icon: CheckSquare },
    ...(sessionUser?.role === "admin"
      ? [{ id: "maintenance", label: "Manutenção", icon: Shield }]
      : [])
  ];

  return (
    <aside className="w-20 md:w-64 bg-white flex flex-col border-r-2 border-black shrink-0 transition-all">
      <div className="p-4 flex items-center justify-center md:justify-start gap-3 border-b-2 border-black h-[72px]">
        <div className="bg-[#184A90] text-white p-2 rounded-lg border-2 border-black flex items-center justify-center shrink-0">
          <Globe className="h-5 w-5" />
        </div>
        <div className="hidden md:block">
          <h1 className="text-base font-black tracking-tight text-black leading-none">
            SiteAnalyzer
          </h1>
          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">v1.2</span>
        </div>
      </div>

      <nav className="flex-1 px-2 py-6 flex flex-col gap-2">
        {tabs.map(tab => {
          const Icon = tab.icon;
          const isSelected = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              title={tab.label}
              className={`w-full flex items-center justify-center md:justify-start gap-3 px-3 py-3 md:py-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer select-none text-left border-2 ${
                isSelected 
                  ? "bg-[#184A90] text-white border-black shadow-[3px_3px_0px_#000000]" 
                  : "text-black border-transparent hover:border-slate-300"
              }`}
            >
              <Icon className="h-5 w-5 md:h-4 md:w-4 shrink-0" />
              <span className="hidden md:block">{tab.label}</span>
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
