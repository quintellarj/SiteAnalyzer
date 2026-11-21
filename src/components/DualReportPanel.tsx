import React, { useMemo, useState } from "react";
import {
  Briefcase,
  Code2,
  FileText,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Zap,
  ChevronDown,
  ChevronRight,
  Copy,
  Check,
  Search,
  Wrench,
  Target,
  Shield,
  Gauge,
  RefreshCw,
  ArrowUpRight,
  Layers,
} from "lucide-react";
import type {
  AuditReport,
  BusinessImpactLevel,
  ClientHealthStatus,
  DevIssueCategory,
  DeveloperActionItem,
  EffortLevel,
} from "../types";
import {
  isQuickWin,
  resolveDualReports,
  sortDeveloperItemsByPriority,
} from "../utils/dualReportFallback";

interface DualReportPanelProps {
  report: AuditReport;
  isExportingPdf: boolean;
  onExportClientPDF: () => void | Promise<void>;
  onExportDeveloperPDF: () => void | Promise<void>;
  onOpenGscExplain?: (payload: {
    issueTitle: string;
    issueCategory: string;
    issueDetails: string;
    domain: string;
  }) => void;
  showToast: (message: string, type?: "success" | "error" | "info") => void;
}

type DiagnosticView = "client" | "developer";
type DevSectionFilter = "all" | "critical" | "improvement" | "good";
type DevCategoryFilter = "Todas" | DevIssueCategory;

const DEV_CATEGORY_OPTIONS: DevCategoryFilter[] = [
  "Todas",
  "Performance",
  "SEO",
  "Segurança",
  "Arquitetura",
  "UX",
];

function getHealthBadgeStyle(status: ClientHealthStatus): {
  pill: string;
  dot: string;
  icon: typeof CheckCircle2;
} {
  if (status === "Saudável") {
    return {
      pill: "bg-emerald-500/10 border-emerald-500/25 text-emerald-400",
      dot: "bg-emerald-400 shadow-[0_0_8px_#10B981]",
      icon: CheckCircle2,
    };
  }
  if (status === "Crítico") {
    return {
      pill: "bg-rose-500/10 border-rose-500/25 text-rose-400",
      dot: "bg-rose-400 shadow-[0_0_8px_#F43F5E]",
      icon: XCircle,
    };
  }
  return {
    pill: "bg-amber-500/10 border-amber-500/25 text-amber-400",
    dot: "bg-amber-400 shadow-[0_0_8px_#F59E0B]",
    icon: AlertTriangle,
  };
}

function getEffortStyle(effort: EffortLevel): string {
  if (effort === "Baixo") {
    return "bg-emerald-500/10 border-emerald-500/25 text-emerald-400";
  }
  if (effort === "Alto") {
    return "bg-rose-500/10 border-rose-500/25 text-rose-400";
  }
  return "bg-amber-500/10 border-amber-500/25 text-amber-400";
}

function getImpactStyle(impact: BusinessImpactLevel): string {
  if (impact === "Alto") {
    return "bg-indigo-500/15 border-indigo-500/35 text-indigo-300";
  }
  if (impact === "Baixo") {
    return "bg-zinc-800 border-zinc-700 text-zinc-400";
  }
  return "bg-sky-500/10 border-sky-500/25 text-sky-300";
}

function getPillarIcon(name: string) {
  const lower = name.toLowerCase();
  if (lower.includes("veloc") || lower.includes("perf")) return Gauge;
  if (lower.includes("google") || lower.includes("seo") || lower.includes("presen")) return Search;
  if (lower.includes("segur")) return Shield;
  return Target;
}

export default function DualReportPanel({
  report,
  isExportingPdf,
  onExportClientPDF,
  onExportDeveloperPDF,
  onOpenGscExplain,
  showToast,
}: DualReportPanelProps) {
  const [activeView, setActiveView] = useState<DiagnosticView>("client");
  const [onlyQuickWins, setOnlyQuickWins] = useState(false);
  const [sectionFilter, setSectionFilter] = useState<DevSectionFilter>("all");
  const [categoryFilter, setCategoryFilter] = useState<DevCategoryFilter>("Todas");
  const [expandedCards, setExpandedCards] = useState<Record<string, boolean>>({});
  const [copiedCardId, setCopiedCardId] = useState<string | null>(null);

  const { clientReport, developerReport } = useMemo(
    () => resolveDualReports(report),
    [report]
  );

  const sortedCriticals = useMemo(
    () => sortDeveloperItemsByPriority(developerReport.criticalItems),
    [developerReport.criticalItems]
  );

  const sortedImprovements = useMemo(
    () => sortDeveloperItemsByPriority(developerReport.improvementItems),
    [developerReport.improvementItems]
  );

  const quickWinsCount = useMemo(
    () =>
      sortedCriticals.filter(isQuickWin).length +
      sortedImprovements.filter(isQuickWin).length,
    [sortedCriticals, sortedImprovements]
  );

  const visibleCriticals = useMemo(
    () =>
      sortedCriticals.filter(
        (item) =>
          (categoryFilter === "Todas" || item.category === categoryFilter) &&
          (!onlyQuickWins || isQuickWin(item))
      ),
    [categoryFilter, onlyQuickWins, sortedCriticals]
  );

  const visibleImprovements = useMemo(
    () =>
      sortedImprovements.filter(
        (item) =>
          (categoryFilter === "Todas" || item.category === categoryFilter) &&
          (!onlyQuickWins || isQuickWin(item))
      ),
    [categoryFilter, onlyQuickWins, sortedImprovements]
  );

  const visibleGoodItems = useMemo(
    () =>
      developerReport.goodItems.filter(
        (item) => categoryFilter === "Todas" || item.category === categoryFilter
      ),
    [categoryFilter, developerReport.goodItems]
  );

  const toggleCard = (key: string) => {
    setExpandedCards((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleCopySnippet = async (code: string, cardId: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCardId(cardId);
      showToast("Código copiado para a área de transferência!", "success");
      setTimeout(() => setCopiedCardId(null), 2000);
    } catch {
      showToast("Não foi possível copiar o código automaticamente.", "error");
    }
  };

  const overallStyle = getHealthBadgeStyle(clientReport.overallHealthStatus);
  const OverallIcon = overallStyle.icon;

  const renderDevActionCard = (
    item: DeveloperActionItem,
    severity: "critical" | "improvement",
    idx: number
  ) => {
    const cardKey = `${severity}-${idx}-${item.title}`;
    const isOpen = Boolean(expandedCards[cardKey]);
    const quickWin = isQuickWin(item);
    const isCritical = severity === "critical";

    return (
      <div
        key={cardKey}
        className={`rounded-xl border transition-all overflow-hidden ${
          isCritical
            ? "bg-zinc-950/75 border-rose-500/25 hover:border-rose-500/45"
            : "bg-zinc-950/75 border-amber-500/20 hover:border-amber-500/40"
        }`}
      >
        <button
          type="button"
          onClick={() => toggleCard(cardKey)}
          className="w-full text-left p-4 flex items-start justify-between gap-3 cursor-pointer select-none"
        >
          <div className="flex-1 min-w-0 space-y-2">
            {/* Top Pills Row */}
            <div className="flex flex-wrap items-center gap-1.5 font-mono tabular-nums text-[10px] font-semibold">
              <span
                className={`px-2 py-0.5 rounded-full border ${
                  isCritical
                    ? "bg-rose-500/10 border-rose-500/25 text-rose-400"
                    : "bg-amber-500/10 border-amber-500/25 text-amber-400"
                }`}
              >
                {isCritical ? "CRÍTICO" : "MELHORIA"}
              </span>

              <span className="px-2 py-0.5 rounded-md bg-zinc-900 border border-zinc-700 text-zinc-300">
                {item.category}
              </span>

              {quickWin && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full badge-ai-gemini font-bold">
                  <Zap className="h-2.5 w-2.5 text-indigo-300" />
                  QUICK WIN
                </span>
              )}

              <span className={`px-2 py-0.5 rounded-md border ${getEffortStyle(item.effortLevel)}`}>
                Esforço: {item.effortLevel}
              </span>

              <span className={`px-2 py-0.5 rounded-md border ${getImpactStyle(item.businessImpact)}`}>
                Impacto: {item.businessImpact}
              </span>

              {isCritical && onOpenGscExplain && (
                <span
                  role="button"
                  tabIndex={0}
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenGscExplain({
                      issueTitle: item.title,
                      issueCategory: item.category,
                      issueDetails: item.rootCause,
                      domain: report.url,
                    });
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      e.stopPropagation();
                      onOpenGscExplain({
                        issueTitle: item.title,
                        issueCategory: item.category,
                        issueDetails: item.rootCause,
                        domain: report.url,
                      });
                    }
                  }}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-linear-to-r from-indigo-500 to-violet-600 text-white hover:brightness-110 transition-all cursor-pointer"
                  title="Abrir análise detalhada do impacto no Google Search Console via IA"
                >
                  <Sparkles className="h-2.5 w-2.5" />
                  IA / GSC
                </span>
              )}
            </div>

            {/* Title & Affected Element */}
            <div>
              <h4 className="font-display font-semibold text-sm text-zinc-100 leading-snug">
                {item.title}
              </h4>
              <p className="font-mono text-[11px] text-zinc-500 mt-1 truncate">
                Alvo: <span className="text-zinc-400">{item.affectedElement}</span>
              </p>
            </div>
          </div>

          <div className="p-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 shrink-0 mt-0.5">
            {isOpen ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </div>
        </button>

        {/* Expandable Technical Details */}
        {isOpen && (
          <div className="px-4 pb-4 pt-3 border-t border-zinc-800/80 bg-obsidian/55 space-y-3.5 text-xs animate-slide-down">
            {/* Causa Raiz */}
            <div
              className={`p-3.5 rounded-xl border ${
                isCritical
                  ? "bg-rose-500/5 border-rose-500/20"
                  : "bg-amber-500/5 border-amber-500/20"
              }`}
            >
              <span
                className={`font-mono text-[10px] font-semibold uppercase tracking-wider block mb-1 ${
                  isCritical ? "text-rose-400" : "text-amber-400"
                }`}
              >
                Causa Raiz Técnica
              </span>
              <p className="text-zinc-200 leading-relaxed">{item.rootCause}</p>
            </div>

            {/* Passo a Passo */}
            <div className="p-3.5 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
              <span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5 mb-1">
                <Wrench className="h-3 w-3" />
                Passo a Passo de Resolução (How to Fix)
              </span>
              <p className="text-zinc-200 leading-relaxed whitespace-pre-line">
                {item.howToFix}
              </p>
            </div>

            {/* Code Snippet + Copy Button */}
            {item.codeSnippet && (
              <div className="rounded-xl border border-zinc-800 bg-obsidian overflow-hidden">
                <div className="px-3.5 py-2 border-b border-zinc-800/90 bg-zinc-900/70 flex items-center justify-between gap-2">
                  <span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                    <Code2 className="h-3.5 w-3.5 text-indigo-400" />
                    Exemplo de Código / Configuração
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopySnippet(item.codeSnippet, cardKey)}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-[11px] font-mono font-semibold text-zinc-200 transition-colors cursor-pointer"
                  >
                    {copiedCardId === cardKey ? (
                      <>
                        <Check className="h-3 w-3 text-emerald-400" />
                        <span className="text-emerald-400">Copiado!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3 w-3 text-indigo-400" />
                        <span>Copiar Código</span>
                      </>
                    )}
                  </button>
                </div>
                <pre className="p-3.5 font-mono text-[11px] text-emerald-300 overflow-x-auto leading-relaxed">
                  <code>{item.codeSnippet}</code>
                </pre>
              </div>
            )}

            {/* Validação GSC */}
            <div className="p-3 rounded-xl bg-indigo-500/5 border border-indigo-500/20 flex items-start gap-2.5">
              <Search className="h-4 w-4 text-indigo-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-indigo-300 block mb-0.5">
                  Validação no Google Search Console
                </span>
                <p className="text-zinc-300 leading-relaxed">{item.gscValidationStep}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <section className="bento-card overflow-hidden animate-fade-in relative">
      {/* Accent Top Hairline */}
      <div className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-cyan-400/90 to-transparent" />

      {/* Header + Segmented View Switcher + Dual PDF Buttons */}
      <div className="p-5 lg:p-6 border-b border-slate-800/80 bg-obsidian/55 flex flex-col gap-4">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-linear-to-br from-cyan-400 via-blue-500 to-violet-600 text-white shadow-[0_0_24px_rgba(6,182,212,0.4)] shrink-0">
              <Layers className="h-4 w-4" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-display font-bold text-zinc-100 text-base tracking-tight">
                  Central de Diagnóstico Dual & Matriz de Prioridade
                </h3>
                <span className="px-2 py-0.5 rounded-full font-mono text-[10px] font-semibold badge-ai-gemini">
                  Esforço × Impacto
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-0.5">
                Alterne entre a leitura executiva para o cliente e o caderno técnico acionável para o desenvolvedor.
              </p>
            </div>
          </div>

          {/* Dual PDF Export Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onExportClientPDF}
              disabled={isExportingPdf}
              className="px-3.5 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 disabled:opacity-45 border border-zinc-700 hover:border-indigo-500/50 text-zinc-100 text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer"
              title="Exportar relatório executivo limpo (fundo branco, sem blocos de código)"
            >
              {isExportingPdf ? (
                <RefreshCw className="h-3.5 w-3.5 animate-spin text-indigo-400" />
              ) : (
                <FileText className="h-3.5 w-3.5 text-emerald-400" />
              )}
              <span>Exportar PDF Cliente</span>
            </button>

            <button
              type="button"
              onClick={onExportDeveloperPDF}
              disabled={isExportingPdf}
              className="btn-indigo-glow disabled:opacity-45 px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 cursor-pointer"
              title="Exportar caderno técnico completo (Quick Wins primeiro, código e validação GSC)"
            >
              {isExportingPdf ? (
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Code2 className="h-3.5 w-3.5" />
              )}
              <span>Exportar PDF Desenvolvedor</span>
            </button>
          </div>
        </div>

        {/* Segmented Control: Visão do Cliente | Visão do Desenvolvedor */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
          <div
            className="inline-flex p-1 rounded-xl bg-obsidian border border-zinc-800 self-start"
            role="tablist"
            aria-label="Modo de visualização do relatório"
          >
            <button
              type="button"
              role="tab"
              aria-selected={activeView === "client"}
              onClick={() => setActiveView("client")}
              className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
                activeView === "client"
                  ? "bg-indigo-500/20 text-indigo-200 border border-indigo-500/35 shadow-[0_0_16px_rgba(99,102,241,0.18)]"
                  : "text-zinc-400 hover:text-zinc-200 border border-transparent"
              }`}
            >
              <Briefcase className="h-3.5 w-3.5" />
              <span>Visão do Cliente (Executivo)</span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={activeView === "developer"}
              onClick={() => setActiveView("developer")}
              className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
                activeView === "developer"
                  ? "bg-indigo-500/20 text-indigo-200 border border-indigo-500/35 shadow-[0_0_16px_rgba(99,102,241,0.18)]"
                  : "text-zinc-400 hover:text-zinc-200 border border-transparent"
              }`}
            >
              <Code2 className="h-3.5 w-3.5" />
              <span>Visão do Desenvolvedor (Técnico)</span>
            </button>
          </div>

          {/* Quick Telemetry Summary Pill */}
          <div className="flex flex-wrap items-center gap-2 font-mono tabular-nums text-[11px]">
            <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              🟢 {developerReport.goodItems.length} Aprovados
            </span>
            <span className="px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400">
              🟡 {developerReport.improvementItems.length} Melhorias
            </span>
            <span className="px-2.5 py-1 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400">
              🔴 {developerReport.criticalItems.length} Críticos
            </span>
          </div>
        </div>
      </div>

      {/* =================================================================== */}
      {/* TAB A: VISÃO DO CLIENTE (EXECUTIVO — LINGUAGEM DE NEGÓCIOS)         */}
      {/* =================================================================== */}
      {activeView === "client" && (
        <div className="p-5 lg:p-6 space-y-5 animate-fade-in">
          {/* Executive Health Banner */}
          <div className="p-5 rounded-2xl bg-zinc-950/70 border border-zinc-800/90 flex flex-col md:flex-row md:items-start justify-between gap-4">
            <div className="space-y-2 flex-1">
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="font-mono text-[10px] uppercase tracking-wider text-zinc-500">
                  Diagnóstico Executivo · {report.url}
                </span>
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border font-mono text-[11px] font-semibold ${overallStyle.pill}`}
                >
                  <OverallIcon className="h-3.5 w-3.5" />
                  {clientReport.overallHealthStatus}
                </span>
              </div>
              <p className="text-sm text-zinc-200 leading-relaxed">
                {clientReport.executiveSummary}
              </p>
            </div>

            <div className="shrink-0 flex md:flex-col items-center justify-center gap-2 px-4 py-3 rounded-xl bg-bento border border-zinc-800">
              <span className="font-mono text-[10px] uppercase tracking-wider text-zinc-500">
                Saúde Geral
              </span>
              <span className="font-mono tabular-nums text-2xl font-bold text-zinc-100">
                {Math.round(
                  (report.scores.performance +
                    report.scores.accessibility +
                    report.scores.seo) /
                    3
                )}
                <span className="text-xs text-zinc-500 font-normal">/100</span>
              </span>
            </div>
          </div>

          {/* 4 Pillars Bento Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {clientReport.pillars.map((pillar, idx) => {
              const st = getHealthBadgeStyle(pillar.status);
              const PillarIcon = getPillarIcon(pillar.name);
              return (
                <div
                  key={idx}
                  className="p-4 rounded-xl bg-zinc-950/65 border border-zinc-800/80 hover:border-zinc-700 transition-colors flex flex-col gap-3"
                >
                  <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-zinc-800/80">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="p-2 rounded-lg bg-zinc-900 border border-zinc-800 text-indigo-400 shrink-0">
                        <PillarIcon className="h-4 w-4" />
                      </div>
                      <h4 className="font-display font-semibold text-sm text-zinc-100 truncate">
                        {pillar.name}
                      </h4>
                    </div>
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border font-mono text-[10px] font-semibold shrink-0 ${st.pill}`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />
                      {pillar.status}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-300 leading-relaxed">
                    {pillar.businessImpactExplanation}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Top Business Priorities */}
          <div className="p-5 rounded-2xl bg-indigo-950/15 border border-indigo-500/25 space-y-3.5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <ArrowUpRight className="h-4 w-4 text-indigo-400" />
                <h4 className="font-display font-semibold text-sm text-zinc-100">
                  Prioridades Comerciais Recomendadas (Foco em Retorno)
                </h4>
              </div>
              <span className="font-mono text-[10px] text-indigo-300 uppercase">
                Plano Executivo
              </span>
            </div>

            <ol className="space-y-2.5">
              {clientReport.topBusinessPriorities.map((priority, i) => (
                <li
                  key={i}
                  className="flex items-start gap-3 p-3 rounded-xl bg-zinc-950/65 border border-zinc-800/80 text-xs text-zinc-200 leading-relaxed"
                >
                  <span className="w-6 h-6 rounded-lg bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 font-mono tabular-nums text-[11px] font-bold flex items-center justify-center shrink-0">
                    {i + 1}
                  </span>
                  <span>{priority}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* TAB B: VISÃO DO DESENVOLVEDOR (TÉCNICO + MATRIZ ESFORÇO × IMPACTO)  */}
      {/* =================================================================== */}
      {activeView === "developer" && (
        <div className="p-5 lg:p-6 space-y-6 animate-fade-in">
          {/* Filter Bar: Category Filter + Section Filter + Quick Wins Toggle */}
          <div className="p-4 rounded-xl bg-zinc-950/70 border border-zinc-800/90 flex flex-col gap-3">
            {/* Row 1: Category Filter */}
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-zinc-800/80">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="font-mono text-[10px] uppercase tracking-wider text-zinc-500 mr-1">
                  Categoria:
                </span>
                {DEV_CATEGORY_OPTIONS.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCategoryFilter(cat)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-mono font-semibold border transition-all cursor-pointer ${
                      categoryFilter === cat
                        ? "bg-indigo-500/20 border-indigo-500/40 text-indigo-200"
                        : "bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* Quick Wins Filter Button */}
              <button
                type="button"
                onClick={() => {
                  setOnlyQuickWins((prev) => !prev);
                  if (!onlyQuickWins && sectionFilter === "good") {
                    setSectionFilter("all");
                  }
                }}
                className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-mono font-semibold border transition-all cursor-pointer self-start lg:self-auto ${
                  onlyQuickWins
                    ? "btn-indigo-glow border-indigo-400/60"
                    : "bg-indigo-500/10 hover:bg-indigo-500/20 border-indigo-500/30 text-indigo-300"
                }`}
                title="Filtrar itens de Esforço Baixo + Impacto Alto"
              >
                <Zap className="h-3.5 w-3.5" />
                <span>Quick Wins (Baixo Esforço + Alto Impacto)</span>
                <span className="px-1.5 py-0.5 rounded-md bg-black/30 text-[10px] tabular-nums">
                  {quickWinsCount}
                </span>
              </button>
            </div>

            {/* Row 2: Severity Filter */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-[10px] uppercase tracking-wider text-zinc-500 mr-1">
                Severidade:
              </span>
              {(
                [
                  { id: "all", label: "Todos" },
                  { id: "critical", label: `🔴 Críticos (${visibleCriticals.length})` },
                  { id: "improvement", label: `🟡 Melhorias (${visibleImprovements.length})` },
                  { id: "good", label: `🟢 Aprovados (${visibleGoodItems.length})` },
                ] as const
              ).map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setSectionFilter(f.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold border transition-all cursor-pointer ${
                    sectionFilter === f.id
                      ? "bg-zinc-800 border-zinc-600 text-zinc-100"
                      : "bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* 1. 🔴 CRÍTICO (VERMELHO) */}
          {(sectionFilter === "all" || sectionFilter === "critical") && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-display font-semibold text-sm text-rose-400 flex items-center gap-2">
                  <XCircle className="h-4 w-4" />
                  <span>Crítico · Ação Imediata ({visibleCriticals.length})</span>
                </h4>
                <span className="font-mono text-[10px] text-zinc-500">
                  Ordenado por Quick Wins e Impacto
                </span>
              </div>

              {visibleCriticals.length === 0 ? (
                <div className="p-4 rounded-xl bg-zinc-950/50 border border-zinc-800/70 text-xs text-zinc-400">
                  {onlyQuickWins
                    ? "Nenhum item crítico classificado como Quick Win (Esforço Baixo + Impacto Alto)."
                    : "Nenhum problema crítico identificado nesta auditoria."}
                </div>
              ) : (
                <div className="space-y-2.5">
                  {visibleCriticals.map((item, idx) =>
                    renderDevActionCard(item, "critical", idx)
                  )}
                </div>
              )}
            </div>
          )}

          {/* 2. 🟡 O QUE PRECISA MELHORAR (AMARELO) */}
          {(sectionFilter === "all" || sectionFilter === "improvement") && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-display font-semibold text-sm text-amber-400 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  <span>O que precisa melhorar ({visibleImprovements.length})</span>
                </h4>
                <span className="font-mono text-[10px] text-zinc-500">
                  Clique no card para ver Causa Raiz, Passo a Passo e Código
                </span>
              </div>

              {visibleImprovements.length === 0 ? (
                <div className="p-4 rounded-xl bg-zinc-950/50 border border-zinc-800/70 text-xs text-zinc-400">
                  {onlyQuickWins
                    ? "Nenhuma melhoria classificada como Quick Win neste domínio."
                    : "Nenhum ponto de melhoria adicional listado."}
                </div>
              ) : (
                <div className="space-y-2.5">
                  {visibleImprovements.map((item, idx) =>
                    renderDevActionCard(item, "improvement", idx)
                  )}
                </div>
              )}
            </div>
          )}

          {/* 3. 🟢 O QUE ESTÁ BOM (VERDE) */}
          {!onlyQuickWins && (sectionFilter === "all" || sectionFilter === "good") && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-display font-semibold text-sm text-emerald-400 flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>O que está bom · Aprovados ({visibleGoodItems.length})</span>
                </h4>
                <span className="font-mono text-[10px] text-zinc-500">
                  Validado na telemetria
                </span>
              </div>

              {visibleGoodItems.length === 0 ? (
                <div className="p-4 rounded-xl bg-zinc-950/50 border border-zinc-800/70 text-xs text-zinc-400">
                  Nenhum item aprovado encontrado para a categoria selecionada.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {visibleGoodItems.map((good, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20 flex flex-col gap-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-[10px] font-semibold px-2 py-0.5 rounded-md bg-zinc-900 border border-zinc-700 text-zinc-300">
                        {good.category}
                      </span>
                      <span className="font-mono tabular-nums text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300">
                        {good.metricValue}
                      </span>
                    </div>
                    <h5 className="font-display font-semibold text-xs text-zinc-100 leading-snug">
                      {good.title}
                    </h5>
                    <p className="text-[11px] text-zinc-400 leading-relaxed">
                      {good.description}
                    </p>
                  </div>
                ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
