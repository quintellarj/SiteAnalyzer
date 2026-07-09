import React from "react";
import { Sparkles, Trash2, Smartphone, Monitor, Globe } from "lucide-react";
import { motion } from "motion/react";
import { DomainProfile } from "../types";

interface HeaderProps {
  activeDomain: DomainProfile | undefined;
  isMobileMenuOpen: boolean;
  setIsMobileMenuOpen: (val: boolean) => void;
  selectedAuditDevice: "desktop" | "mobile";
  setSelectedAuditDevice: (val: "desktop" | "mobile") => void;
  handleGenerateIAComparison: () => void;
  handleDeleteDomain: (id: string) => void;
}

export default function Header({
  activeDomain,
  isMobileMenuOpen,
  setIsMobileMenuOpen,
  selectedAuditDevice,
  setSelectedAuditDevice,
  handleGenerateIAComparison,
  handleDeleteDomain,
}: HeaderProps) {
  return (
    <header className="border-b-2 border-black bg-white sticky top-0 z-50 py-3 px-6 h-[72px] flex items-center justify-between">
      <div className="flex items-center gap-4">
        {/* Hamburger for mobile */}
        <button
          type="button"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="md:hidden p-2 border-2 border-black bg-white text-black rounded-lg shadow-[2px_2px_0px_#000000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none"
        >
          <Globe className="h-5 w-5" />
        </button>

        {activeDomain ? (
          <div>
            <h2 className="text-xl font-black text-black leading-none">{activeDomain.url}</h2>
            <span className="text-[11px] text-slate-500 font-bold">
              Última auditoria: {activeDomain.latestReport ? new Date(activeDomain.latestReport.analyzedAt).toLocaleString("pt-BR") : "Nunca"}
            </span>
          </div>
        ) : (
          <h2 className="text-xl font-black text-black">Bem-vindo</h2>
        )}
      </div>

      <div className="flex items-center gap-4">
        {/* Dispositivo de Teste Global */}
        <div className="hidden md:flex items-center bg-slate-100 border-2 border-black rounded-xl p-1 shadow-[2px_2px_0px_#000000]">
          <button
            onClick={() => setSelectedAuditDevice("desktop")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              selectedAuditDevice === "desktop"
                ? "bg-white border-2 border-black shadow-[2px_2px_0px_#000000] text-black"
                : "text-slate-500 hover:text-black border-2 border-transparent"
            }`}
          >
            <Monitor className="h-4 w-4" />
            Desktop
          </button>
          <button
            onClick={() => setSelectedAuditDevice("mobile")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              selectedAuditDevice === "mobile"
                ? "bg-white border-2 border-black shadow-[2px_2px_0px_#000000] text-black"
                : "text-slate-500 hover:text-black border-2 border-transparent"
            }`}
          >
            <Smartphone className="h-4 w-4" />
            Mobile
          </button>
        </div>

        <button
          onClick={handleGenerateIAComparison}
          className="flex items-center gap-2 px-4 py-2 bg-[#fbbf24] hover:bg-[#f59e0b] text-black border-2 border-black rounded-xl text-xs font-black transition-all shadow-[3px_3px_0px_#000000] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none cursor-pointer"
          title="Comparar domínios usando inteligência artificial do Gemini"
        >
          <Sparkles className="h-4 w-4" />
          <span className="hidden md:block">Gerar IA</span>
        </button>

        {activeDomain && (
          <button 
            onClick={() => handleDeleteDomain(activeDomain.id)}
            title="Excluir Domínio"
            className="p-2 border-2 border-black bg-white hover:bg-red-50 text-slate-400 hover:text-red-600 rounded-xl shadow-[3px_3px_0px_#000000] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-colors cursor-pointer"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>
    </header>
  );
}
