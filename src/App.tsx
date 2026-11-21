import React, { useState, useEffect, lazy, Suspense } from "react";
import { motion, AnimatePresence } from "motion/react";
import * as XLSX from "xlsx";
import {
  Search, Globe, Shield, RefreshCw, AlertTriangle, CheckCircle2, Info, Download,
  TrendingUp, BarChart3, Mail, Settings, ArrowRightLeft,
  ChevronDown, FileText, Send, Check, Play, LogIn, Trash2,
  Sparkles, Lightbulb, Target, Copy, Smartphone, Monitor, CheckSquare,
  Lock, ShieldAlert, Menu, X, Zap, Code2
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line
} from "recharts";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { mockDomains } from "./mockData";
import type {
  AuditReport,
  DomainProfile,
  AnalyticsDataPoint,
  SearchQueryRow,
  ManualSEOTask,
  QuickTipsResponse,
  SecurityScanResult,
} from "./types";
import LoginScreen from "./components/LoginScreen";
import ScoreCards from "./components/ScoreCards";
import CoreWebVitals from "./components/CoreWebVitals";
import ArchitectureAndSeoPanel from "./components/ArchitectureAndSeoPanel";
import BusinessUxPanel from "./components/BusinessUxPanel";
import DualReportPanel from "./components/DualReportPanel";
import SecurityAuditPanel from "./components/SecurityAuditPanel";
import { AuditSkeletonLoader, TabSkeletonLoader } from "./components/AuditSkeletonLoader";

type AppTab = "audit" | "history" | "compare" | "integrations" | "email" | "maintenance" | "checklist";

function getErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;
  return "Erro desconhecido";
}

// Lazy Loading das abas secundárias (reduz o bundle inicial carregado no navegador)
const CompareDomainsTab = lazy(() => import("./components/CompareDomainsTab"));
const SeoChecklistTab = lazy(() => import("./components/SeoChecklistTab"));

const DEFAULT_SEO_CHECKLIST: ManualSEOTask[] = [
  { id: "1", title: "Otimizar Title Tag principal com a palavra-chave foco", category: "SEO On-Page", completed: false, priority: "high", notes: "Manter abaixo de 60 caracteres." },
  { id: "2", title: "Escrever Meta Description atraente e com Call to Action", category: "SEO On-Page", completed: false, priority: "high", notes: "Manter abaixo de 155 caracteres para evitar truncamento." },
  { id: "3", title: "Garantir cabeçalhos hierárquicos corretos (apenas uma tag H1)", category: "SEO On-Page", completed: false, priority: "medium", notes: "Use H2 e H3 de forma lógica e evite pular níveis hierárquicos." },
  { id: "4", title: "Adicionar tags ALT descritivas em todas as imagens relevantes", category: "SEO On-Page", completed: false, priority: "medium", notes: "Melhora acessibilidade e relevância no Google Imagens." },
  { id: "5", title: "Configurar arquivo robots.txt para evitar indexação de painéis admin", category: "SEO Técnico", completed: false, priority: "high", notes: "Evita que robôs do Google indexem páginas privadas do site." },
  { id: "6", title: "Criar e submeter o Sitemap XML no Google Search Console", category: "SEO Técnico", completed: false, priority: "high", notes: "Acelera a descoberta e indexação de novas páginas." },
  { id: "7", title: "Configurar URLs canônicas em todas as páginas para evitar duplicidade", category: "SEO Técnico", completed: false, priority: "high", notes: "Indica ao Google qual é a versão oficial da página." },
  { id: "8", title: "Otimizar velocidade de carregamento de imagens (WebP/compressão)", category: "SEO Técnico", completed: false, priority: "medium", notes: "Reduz o peso total da página para melhorar o Core Web Vitals (LCP)." },
  { id: "9", title: "Garantir responsividade móvel de todos os blocos interativos", category: "SEO Técnico", completed: false, priority: "high", notes: "Crucial para a indexação Mobile-First do Google." },
  { id: "10", title: "Identificar palavras-chave de cauda longa com volume de busca", category: "Conteúdo", completed: false, priority: "high", notes: "Foco em responder dúvidas reais da audiência." },
  { id: "11", title: "Produzir conteúdo aprofundado e relevante cobrindo a intenção de busca", category: "Conteúdo", completed: false, priority: "high", notes: "Atender aos critérios E-E-A-T do Google." },
  { id: "12", title: "Inserir links internos ricos apontando para páginas-pilar", category: "Conteúdo", completed: false, priority: "medium", notes: "Distribui a autoridade interna do domínio pelas páginas." },
  { id: "13", title: "Mapear backlinks de concorrentes para prospecção de link building", category: "Link Building", completed: false, priority: "low", notes: "Utilizar ferramentas de SEO para identificar menções e links." },
  { id: "14", title: "Reivindicar perfil no Perfil da Empresa no Google (Google My Business)", category: "SEO Local", completed: false, priority: "medium", notes: "Essencial para visibilidade física e buscas regionais." }
];

export default function App() {
  // State Initialization
  const [sessionUser, setSessionUser] = useState<{ email: string; role: "user" | "admin" } | null>(() => {
    try {
      const saved = localStorage.getItem("web_analyzer_session");
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [isMaintenanceMode, setIsMaintenanceMode] = useState<boolean>(false);
  const [simulateAiFailures, setSimulateAiFailures] = useState<boolean>(false);
  const [isDarkMode] = useState<boolean>(true);

  useEffect(() => {
    document.documentElement.classList.add("dark");
  }, []);

  // Silent error monitoring & telemetria de segurança
  useEffect(() => {
    const reportSilentError = async (message: string, context: Record<string, unknown>) => {
      try {
        await fetch("/api/logs/frontend", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            level: "ERROR",
            message,
            context
          })
        });
      } catch (err) {
        // Fallback to avoid infinite loops if telemetry itself fails
        console.warn("Falha ao enviar telemetria de erro silencioso:", err);
      }
    };

    const handleGlobalError = (event: ErrorEvent) => {
      reportSilentError(`Erro de runtime não tratado: ${event.message}`, {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        errorStack: event.error?.stack || ""
      });
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      let errorMsg = "Promessa não tratada (unhandled rejection)";
      let stack = "";
      
      if (reason instanceof Error) {
        errorMsg = `Rejeição não tratada: ${reason.message}`;
        stack = reason.stack || "";
      } else if (typeof reason === "string") {
        errorMsg = `Rejeição não tratada: ${reason}`;
      } else {
        try {
          errorMsg = `Rejeição não tratada: ${JSON.stringify(reason)}`;
        } catch {
          // ignore non-serializable reason
        }
      }

      reportSilentError(errorMsg, {
        stack,
        reasonType: typeof reason
      });
    };

    window.addEventListener("error", handleGlobalError);
    window.addEventListener("unhandledrejection", handleUnhandledRejection);

    return () => {
      window.removeEventListener("error", handleGlobalError);
      window.removeEventListener("unhandledrejection", handleUnhandledRejection);
    };
  }, []);

  // Fetch initial admin config on load
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const res = await fetch("/api/admin/config");
        if (res.ok) {
          const data = await res.json();
          setIsMaintenanceMode(data.isMaintenanceMode);
          setSimulateAiFailures(data.simulateAiFailures);
        }
      } catch (err) {
        console.error("Failed to fetch admin config:", err);
      }
    };
    fetchConfig();
  }, []);

  const handleUpdateAdminConfig = async (maintenance: boolean, aiFailures: boolean) => {
    setIsMaintenanceMode(maintenance);
    setSimulateAiFailures(aiFailures);
    try {
      await fetch("/api/admin/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isMaintenanceMode: maintenance, simulateAiFailures: aiFailures })
      });
    } catch (err) {
      console.error("Failed to update config on server:", err);
    }
  };

  const [domains, setDomains] = useState<DomainProfile[]>(() => {
    const saved = localStorage.getItem("web_analyzer_domains");
    return saved ? JSON.parse(saved) : mockDomains;
  });

  const [activeDomainId, setActiveDomainId] = useState<string>(() => {
    const saved = localStorage.getItem("web_analyzer_active_id");
    return saved || (domains.length > 0 ? domains[0].id : "");
  });

  const [analyzingUrl, setAnalyzingUrl] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisStep, setAnalysisStep] = useState(0);
  const [activeTab, setActiveTab] = useState<AppTab>("audit");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const [seoChecklist, setSeoChecklist] = useState<ManualSEOTask[]>(() => {
    try {
      const saved = localStorage.getItem("seo_manual_checklist");
      return saved ? JSON.parse(saved) : DEFAULT_SEO_CHECKLIST;
    } catch {
      return DEFAULT_SEO_CHECKLIST;
    }
  });

  useEffect(() => {
    localStorage.setItem("seo_manual_checklist", JSON.stringify(seoChecklist));
  }, [seoChecklist]);

  // Comparison State
  const [compareSourceId, setCompareSourceId] = useState("");
  const [compareTargetId, setCompareTargetId] = useState("");

  // Google Integration State
  const [isSandbox, setIsSandbox] = useState(true);
  const [googleAccessToken, setGoogleAccessToken] = useState<string | null>(() => {
    return localStorage.getItem("google_access_token") || null;
  });
  const [googleEmail, setGoogleEmail] = useState<string>(() => {
    return localStorage.getItem("google_email") || "demonstracao@gmail.com";
  });
  const [analyticsData, setAnalyticsData] = useState<AnalyticsDataPoint[]>([]);
  const [searchQueries, setSearchQueries] = useState<SearchQueryRow[]>([]);
  const [isLoadingIntegrations, setIsLoadingIntegrations] = useState(false);

  // Email Config State
  const [emailConfig, setEmailConfig] = useState({
    email: "quintellarj@gmail.com",
    seoEnabled: true,
    performanceEnabled: true,
    accessibilityEnabled: true,
    frequency: "monthly",
    subject: "Relatório Mensal de Auditoria SEO & Performance",
    customNote: "",
    reportDay: 5,
    alertOnDrop: true,
    alertThresholdMobile: 75,
    alertThresholdDesktop: 80
  });
  const [emailPreviewHtml, setEmailPreviewHtml] = useState<string | null>(null);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [emailSentSuccess, setEmailSentSuccess] = useState(false);

  // AI Comparison States
  const [isComparingIA, setIsComparingIA] = useState(false);
  const [compareIAMarkdown, setCompareIAMarkdown] = useState<string | null>(null);
  const [isCompareIAModalOpen, setIsCompareIAModalOpen] = useState(false);

  // GSC Explanation States
  const [selectedGSCExplain, setSelectedGSCExplain] = useState<{
    issueTitle: string;
    issueCategory: string;
    issueDetails: string;
    domain: string;
  } | null>(null);
  const [gscExplainContent, setGscExplainContent] = useState<string | null>(null);
  const [isGscExplaining, setIsGscExplaining] = useState<boolean>(false);

  // Security Scanner States
  const [isScanningSecurity, setIsScanningSecurity] = useState(false);
  const [securityScanResult, setSecurityScanResult] = useState<SecurityScanResult | null>(null);
  const [remediationTab, setRemediationTab] = useState<"express" | "nginx" | "apache">("express");

  // PDF lazy export loading state & active analyzing target
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [analyzingTargetLabel, setAnalyzingTargetLabel] = useState("");

  useEffect(() => {
    if (!selectedGSCExplain) {
      setGscExplainContent(null);
      return;
    }

    const fetchGscExplain = async () => {
      setIsGscExplaining(true);
      setGscExplainContent(null);
      try {
        const res = await fetch("/api/explain-gsc", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            domain: selectedGSCExplain.domain,
            issueTitle: selectedGSCExplain.issueTitle,
            issueCategory: selectedGSCExplain.issueCategory,
            issueDetails: selectedGSCExplain.issueDetails
          })
        });

        if (res.ok) {
          const data = await res.json();
          setGscExplainContent(data.explanation);
        } else {
          throw new Error("Falha na resposta do servidor");
        }
      } catch (err: unknown) {
        console.error(err);
        setGscExplainContent("### Erro ao carregar diagnóstico por IA\n\nNão foi possível obter a resposta do Google Search Console.");
      } finally {
        setIsGscExplaining(false);
      }
    };

    fetchGscExplain();
  }, [selectedGSCExplain]);

  // Quick SEO Tips state
  const [quickTips, setQuickTips] = useState<QuickTipsResponse | null>(null);
  const [isLoadingQuickTips, setIsLoadingQuickTips] = useState(false);
  const [quickTipsError, setQuickTipsError] = useState<string | null>(null);
  const [copiedType, setCopiedType] = useState<'title' | 'desc' | null>(null);

  // Audit device preference states
  const [selectedAuditDevice, setSelectedAuditDevice] = useState<"mobile" | "desktop">("desktop");

  const handleLoginSuccess = (email: string, role: "user" | "admin") => {
    const session = { email, role };
    setSessionUser(session);
    localStorage.setItem("web_analyzer_session", JSON.stringify(session));
    if (role === "admin") {
      setActiveTab("maintenance");
    } else {
      setActiveTab("audit");
    }
    showToast(`Bem-vindo! Logado como ${role === "admin" ? "Administrador" : "Usuário"}.`, "success");
  };

  const handleLogout = () => {
    setSessionUser(null);
    localStorage.removeItem("web_analyzer_session");
    setActiveTab("audit");
    showToast("Você saiu da conta com sucesso.", "info");
  };

  useEffect(() => {
    const currentDomain = domains.find(d => d.id === activeDomainId);
    if (currentDomain) {
      setSelectedAuditDevice(currentDomain.auditDevice || "desktop");
    }
  }, [activeDomainId, domains]);

  const handleSaveAuditDevice = (device: "mobile" | "desktop") => {
    setSelectedAuditDevice(device);
    const currentDomain = domains.find(d => d.id === activeDomainId);
    if (currentDomain) {
      setDomains(prev => prev.map(d => {
        if (d.id === activeDomainId) {
          return { ...d, auditDevice: device };
        }
        return d;
      }));
      showToast(`Preferência salva: Auditoria ${device === "mobile" ? "Móvel" : "Desktop"} para ${currentDomain.url}`, "success");
    }
  };

  // Checkbox de Ação and Toast states
  const [implementedTips, setImplementedTips] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem("implemented_seo_tips");
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const [toasts, setToasts] = useState<Array<{ id: string; message: string; type: 'success' | 'error' | 'info' }>>([]);
  const [historySearchQuery, setHistorySearchQuery] = useState("");

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  };

  // Threshold Monitoring system states
  const [monitorThresholdMobile, setMonitorThresholdMobile] = useState<number>(() => {
    const saved = localStorage.getItem("monitor_threshold_mobile");
    return saved ? parseInt(saved, 10) : 75;
  });
  const [monitorThresholdDesktop, setMonitorThresholdDesktop] = useState<number>(() => {
    const saved = localStorage.getItem("monitor_threshold_desktop");
    return saved ? parseInt(saved, 10) : 80;
  });
  const [isMonitorModalOpen, setIsMonitorModalOpen] = useState(false);
  const [monitorEnabled, setMonitorEnabled] = useState<boolean>(() => {
    const saved = localStorage.getItem("monitor_enabled");
    return saved ? saved === "true" : true;
  });
  const [monitorMetrics, setMonitorMetrics] = useState<Record<string, boolean>>(() => {
    const saved = localStorage.getItem("monitor_metrics");
    return saved ? JSON.parse(saved) : { performance: true, accessibility: true, seo: true };
  });

  const [lastCheckedReportSignature, setLastCheckedReportSignature] = useState("");

  // Persist threshold configuration
  useEffect(() => {
    localStorage.setItem("monitor_threshold_mobile", monitorThresholdMobile.toString());
  }, [monitorThresholdMobile]);

  useEffect(() => {
    localStorage.setItem("monitor_threshold_desktop", monitorThresholdDesktop.toString());
  }, [monitorThresholdDesktop]);

  useEffect(() => {
    localStorage.setItem("monitor_enabled", monitorEnabled.toString());
  }, [monitorEnabled]);

  useEffect(() => {
    localStorage.setItem("monitor_metrics", JSON.stringify(monitorMetrics));
  }, [monitorMetrics]);

  // Helper to persist implemented tips
  useEffect(() => {
    localStorage.setItem("implemented_seo_tips", JSON.stringify(implementedTips));
  }, [implementedTips]);

  // Helper to fetch quick SEO tips using Gemini
  const fetchQuickTips = async (domainUrl: string, title?: string, description?: string) => {
    if (!domainUrl) return;
    setIsLoadingQuickTips(true);
    setQuickTipsError(null);
    try {
      const res = await fetch("/api/seo/quick-tips", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: domainUrl, title, description })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Erro ao obter dicas rápidas");
      }

      const data = await res.json();
      setQuickTips(data);
    } catch (err: unknown) {
      console.error("Error fetching quick tips:", err);
      setQuickTipsError(getErrorMessage(err));
    } finally {
      setIsLoadingQuickTips(false);
    }
  };

  const handleCopy = (text: string, type: 'title' | 'desc') => {
    navigator.clipboard.writeText(text);
    setCopiedType(type);
    setTimeout(() => setCopiedType(null), 2000);
  };

  // Save state to localStorage
  useEffect(() => {
    localStorage.setItem("web_analyzer_domains", JSON.stringify(domains));
  }, [domains]);

  useEffect(() => {
    if (activeDomainId) {
      localStorage.setItem("web_analyzer_active_id", activeDomainId);
    }
  }, [activeDomainId]);

  const activeDomain = domains.find(d => d.id === activeDomainId);

  // Fetch Quick SEO Tips automatically when activeDomain changes
  useEffect(() => {
    if (activeDomain) {
      const report = activeDomain.latestReport;
      fetchQuickTips(activeDomain.url, report?.title, report?.description);
    } else {
      setQuickTips(null);
    }
  }, [activeDomainId, activeDomain?.url, activeDomain?.latestReport?.analyzedAt]);

  // Set default comparison domains when domains change
  useEffect(() => {
    if (domains.length >= 2) {
      if (!compareSourceId) setCompareSourceId(domains[0].id);
      if (!compareTargetId) setCompareTargetId(domains[1].id);
    }
  }, [domains]);

  // Threshold alert check
  useEffect(() => {
    if (!monitorEnabled || !activeDomain || !activeDomain.latestReport) return;

    const report = activeDomain.latestReport;
    const scores = report.scores;
    const analyzedAt = report.analyzedAt || new Date().toISOString();
    const deviceType = activeDomain.auditDevice || "desktop";
    const currentThreshold = deviceType === "mobile" ? monitorThresholdMobile : monitorThresholdDesktop;
    const signature = `${activeDomain.id}-${analyzedAt}-${deviceType}-${monitorThresholdMobile}-${monitorThresholdDesktop}-${monitorMetrics.performance}-${monitorMetrics.accessibility}-${monitorMetrics.seo}`;

    if (signature === lastCheckedReportSignature) return;

    const lowMetrics: string[] = [];
    if (monitorMetrics.performance && scores.performance < currentThreshold) {
      lowMetrics.push(`Desempenho (${scores.performance})`);
    }
    if (monitorMetrics.accessibility && scores.accessibility < currentThreshold) {
      lowMetrics.push(`Acessibilidade (${scores.accessibility})`);
    }
    if (monitorMetrics.seo && scores.seo < currentThreshold) {
      lowMetrics.push(`SEO (${scores.seo})`);
    }

    if (lowMetrics.length > 0) {
      const msg = `Alerta Preventivo [${deviceType === "mobile" ? "Mobile" : "Desktop"}]: O domínio "${activeDomain.url}" está com métricas abaixo do limite configurado (${currentThreshold}): ${lowMetrics.join(", ")}`;
      showToast(msg, "error");
    }

    setLastCheckedReportSignature(signature);
  }, [activeDomainId, activeDomain?.latestReport, activeDomain?.auditDevice, monitorEnabled, monitorThresholdMobile, monitorThresholdDesktop, monitorMetrics, lastCheckedReportSignature]);

  // Fetch Google Analytics and Search Console data (Mock or Real)
  const fetchIntegrationData = async () => {
    if (!activeDomain) return;
    setIsLoadingIntegrations(true);
    try {
      const headers: Record<string, string> = {};
      if (!isSandbox && googleAccessToken) {
        headers["Authorization"] = `Bearer ${googleAccessToken}`;
      }

      // Fetch Analytics
      const analyticsRes = await fetch(`/api/analytics/report`, { headers });
      const analyticsResult = await analyticsRes.json();
      setAnalyticsData(analyticsResult.report || []);

      // Fetch Search Console
      const scRes = await fetch(`/api/searchconsole/queries?siteUrl=${encodeURIComponent(activeDomain.url)}`, { headers });
      const scResult = await scRes.json();
      setSearchQueries(scResult.queries || []);
    } catch (error) {
      console.error("Error fetching integration data:", error);
    } finally {
      setIsLoadingIntegrations(false);
    }
  };

  useEffect(() => {
    fetchIntegrationData();
  }, [activeDomainId, activeDomain?.latestReport?.analyzedAt, isSandbox, googleAccessToken]);

  // Handle URL analyze submission (Real 3-Layer Pipeline)
  const steps = [
    "Conectando ao domínio e validando segurança SSRF...",
    "[Camada A] Consultando Google PageSpeed Insights v5 (LCP, INP, CLS, FCP, TTFB)...",
    "[Camada B] Analisando HTML com Cheerio, Schema JSON-LD, /robots.txt e /sitemap.xml...",
    "[Camada C] Inspecionando cabeçalhos HTTP de segurança e detector de stack tecnológica...",
    "[Camada IA] Avaliando Regras de Negócio, Proposta de Valor, CTAs e UX via Gemini...",
    "Consolidando relatório completo e atualizando cache LRU em memória..."
  ];

  const handleAnalyze = async (e?: React.FormEvent, customUrl?: string) => {
    if (e) e.preventDefault();
    const urlToUse = customUrl || analyzingUrl;
    if (!urlToUse) return;

    // Clean URL
    let targetUrl = urlToUse.trim();
    if (!targetUrl.startsWith("http://") && !targetUrl.startsWith("https://")) {
      targetUrl = "https://" + targetUrl;
    }
    const cleanDomain = targetUrl.replace(/^(https?:\/\/)?(www\.)?/, "").split("/")[0];

    setIsAnalyzing(true);
    setAnalyzingTargetLabel(cleanDomain);
    setAnalysisStep(0);

    // Progresso visual das camadas reais durante o tempo de resposta (~5 a 10s)
    const interval = setInterval(() => {
      setAnalysisStep(prev => {
        if (prev < steps.length - 1) return prev + 1;
        clearInterval(interval);
        return prev;
      });
    }, 1400);

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: cleanDomain, device: selectedAuditDevice })
      });

      clearInterval(interval);

      const contentType = response.headers.get("content-type") || "";
      if (!contentType.includes("application/json")) {
        const textResponse = await response.text();
        console.error("Resposta não-JSON recebida:", response.status, contentType, textResponse);
        const plainSnippet = textResponse
          .replace(/<[^>]*>/g, " ")
          .replace(/\s+/g, " ")
          .trim()
          .slice(0, 140);
        const hint =
          response.status === 504 || response.status === 502 || response.status === 503
            ? "O servidor/proxy atingiu tempo limite (504/503) ou o Passenger estava reiniciando."
            : response.status === 404
              ? "A rota /api/analyze não chegou ao Node.js (verifique o Setup Node.js App e o .htaccess no cPanel)."
              : "Verifique no cPanel (Setup Node.js App / Phusion Passenger) se 'app.js' está ativo, se 'dist/server.cjs' foi gerado via 'npm run build' e reinicie o processo Node.";
        throw new Error(
          `O servidor não retornou JSON na rota /api/analyze (HTTP ${response.status} · ${contentType || "sem content-type"}).\n\n` +
          `${hint}${plainSnippet ? `\n\nTrecho retornado: "${plainSnippet}"` : ""}`
        );
      }

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Erro desconhecido na análise");
      }

      const report: AuditReport = await response.json();

      setDomains(prev => {
        // Check if domain already exists
        const existingIdx = prev.findIndex(d => d.url.toLowerCase() === cleanDomain.toLowerCase());
        
        const newHistoryPoint = {
          date: new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }),
          performance: report.scores.performance,
          accessibility: report.scores.accessibility,
          seo: report.scores.seo
        };

        if (existingIdx >= 0) {
          const updated = [...prev];
          updated[existingIdx] = {
            ...updated[existingIdx],
            latestReport: report,
            auditDevice: selectedAuditDevice,
            googleConnected: true,
            reportsHistory: [...updated[existingIdx].reportsHistory, newHistoryPoint].slice(-6) // keep last 6
          };
          return updated;
        } else {
          const newDomainId = `domain-${Date.now()}`;
          const newProfile: DomainProfile = {
            id: newDomainId,
            url: cleanDomain,
            addedAt: new Date().toISOString(),
            latestReport: report,
            googleConnected: true,
            monthlyReportEnabled: false,
            auditDevice: selectedAuditDevice,
            reportsHistory: [newHistoryPoint]
          };
          // Automatically set as active
          setTimeout(() => setActiveDomainId(newDomainId), 50);
          return [...prev, newProfile];
        }
      });

      setAnalyzingUrl("");
      setActiveTab("audit");
      const cacheBadge = report.cacheInfo?.hit ? " (Resposta instantânea via Cache LRU)" : "";
      showToast(`Auditoria concluída para "${cleanDomain}"${cacheBadge}!`, "success");
    } catch (error: unknown) {
      const msg = getErrorMessage(error);
      showToast(`Falha na auditoria de "${cleanDomain}": ${msg}`, "error");
      alert("Falha na auditoria: " + msg);
    } finally {
      setIsAnalyzing(false);
      setAnalyzingTargetLabel("");
      clearInterval(interval);
    }
  };

  // Google OAuth Popup Handler
  const handleConnectGoogle = async () => {
    try {
      const res = await fetch("/api/auth/google/url");
      const { url } = await res.json();

      const popup = window.open(url, "google_oauth_popup", "width=600,height=700");
      if (!popup) {
        showToast("O bloqueador de popups impediu a janela de autorização Google.", "error");
        alert("O bloqueador de popups impediu a janela de autorização. Por favor, permita popups neste site.");
        return;
      }

      const handleMessage = async (event: MessageEvent) => {
        // Validação de origem compatível com produção (cPanel s7vendesign.com.br) e desenvolvimento local
        if (
          event.origin !== window.location.origin &&
          !event.origin.endsWith(".s7vendesign.com.br") &&
          !event.origin.includes("localhost")
        ) {
          return;
        }

        if (event.data?.type === "OAUTH_AUTH_SUCCESS") {
          window.removeEventListener("message", handleMessage);
          
          // Exchange code for tokens
          const tokenRes = await fetch("/api/auth/google/token", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ code: event.data.code })
          });
          
          const tokenData = await tokenRes.json();
          if (tokenData.success) {
            setGoogleAccessToken(tokenData.accessToken);
            localStorage.setItem("google_access_token", tokenData.accessToken);
            
            const userEmail = tokenData.email || "conectado@google.com";
            setGoogleEmail(userEmail);
            localStorage.setItem("google_email", userEmail);
            
            setIsSandbox(false); // Switch to real API

            // Mark domain as connected
            setDomains(prev => prev.map(d => 
              d.id === activeDomainId ? { ...d, googleConnected: true, googleEmail: userEmail } : d
            ));

            showToast("Sua conta Google foi integrada com sucesso!", "success");
            alert("Sua conta Google foi integrada com sucesso!");
          } else {
            showToast("Falha na integração com o Google: " + (tokenData.error || "Erro de token"), "error");
          }
        }
      };

      window.addEventListener("message", handleMessage);
    } catch (err: unknown) {
      const msg = getErrorMessage(err);
      showToast("Falha na integração com o Google: " + msg, "error");
      alert("Erro ao iniciar fluxo OAuth: " + msg);
    }
  };

  const handleDisconnectGoogle = () => {
    setGoogleAccessToken(null);
    localStorage.removeItem("google_access_token");
    setGoogleEmail("demonstracao@gmail.com");
    setIsSandbox(true);
    
    setDomains(prev => prev.map(d => 
      d.id === activeDomainId ? { ...d, googleConnected: false, googleEmail: undefined } : d
    ));

    showToast("Integração do Google desconectada. Modo demonstração ativo.", "info");
    alert("Integração do Google desconectada. Voltando ao modo demonstração.");
  };

  // Schedule Simulated Monthly Email Report
  const handleScheduleEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeDomain) return;

    setIsSendingEmail(true);
    setEmailSentSuccess(false);

    try {
      const res = await fetch("/api/reports/schedule-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: emailConfig.email,
          domain: activeDomain.url,
          options: emailConfig
        })
      });

      const data = await res.json();
      if (data.success) {
        setEmailPreviewHtml(data.previewHtml);
        setEmailSentSuccess(true);
        
        // Update domain report schedule settings
        setDomains(prev => prev.map(d => 
          d.id === activeDomainId ? { ...d, monthlyReportEnabled: true, monthlyReportEmail: emailConfig.email } : d
        ));
      }
    } catch {
      alert("Erro ao configurar relatório por e-mail");
    } finally {
      setIsSendingEmail(false);
    }
  };

  // Exportar PDF Executivo (Cliente) via Lazy-Loaded jsPDF
  const handleExportClientPDF = async () => {
    if (!activeDomain || !activeDomain.latestReport) return;
    setIsExportingPdf(true);
    try {
      const { exportClientReportPDF } = await import("./utils/pdfExporter");
      await exportClientReportPDF(activeDomain.latestReport);
      showToast("PDF Executivo (Cliente) exportado com sucesso!", "success");
    } catch (error: unknown) {
      console.error("Erro ao gerar PDF Cliente:", error);
      showToast("Falha ao gerar PDF Cliente: " + getErrorMessage(error), "error");
    } finally {
      setIsExportingPdf(false);
    }
  };

  // Exportar PDF Técnico (Desenvolvedor) via Lazy-Loaded jsPDF
  const handleExportDeveloperPDF = async () => {
    if (!activeDomain || !activeDomain.latestReport) return;
    setIsExportingPdf(true);
    try {
      const { exportDeveloperReportPDF } = await import("./utils/pdfExporter");
      await exportDeveloperReportPDF(activeDomain.latestReport);
      showToast("PDF Técnico (Desenvolvedor) exportado com sucesso!", "success");
    } catch (error: unknown) {
      console.error("Erro ao gerar PDF Desenvolvedor:", error);
      showToast("Falha ao gerar PDF Desenvolvedor: " + getErrorMessage(error), "error");
    } finally {
      setIsExportingPdf(false);
    }
  };

  // Generate and Export Comparison PDF report via Lazy-Loaded jsPDF
  const handleExportComparePDF = async () => {
    const source = domains.find(d => d.id === compareSourceId);
    const target = domains.find(d => d.id === compareTargetId);

    if (!source || !target || !source.latestReport || !target.latestReport) {
      showToast("Ambos os domínios precisam ter relatórios gerados para exportar o comparativo.", "error");
      return;
    }

    setIsExportingPdf(true);
    try {
      const { exportCompareDomainsPDF } = await import("./utils/pdfExporter");
      await exportCompareDomainsPDF(source, target, compareIAMarkdown);
      showToast("PDF Comparativo exportado com sucesso!", "success");
    } catch (error: unknown) {
      console.error("Erro ao gerar PDF comparativo:", error);
      showToast("Falha ao gerar PDF comparativo.", "error");
    } finally {
      setIsExportingPdf(false);
    }
  };

  // Export search queries to CSV
  const handleExportCSV = () => {
    if (searchQueries.length === 0) return;
    
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Query,Clicks,Impressoes,CTR (%),Posicao Media\n";
    
    searchQueries.forEach(row => {
      const q = row.keys.join(" ");
      csvContent += `"${q}",${row.clicks},${row.impressions},${row.ctr},${row.position}\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `seo-queries-${activeDomain?.url || "domain"}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export search queries to Excel (.xlsx) with optimized formatting
  const handleExportXLSX = () => {
    if (searchQueries.length === 0) return;

    try {
      // 1. Prepare data with beautiful formatted structure
      const data = searchQueries.map((row) => ({
        "Palavra-Chave (Google Search Console)": row.keys.join(" "),
        "Cliques": row.clicks,
        "Impressões": row.impressions,
        "CTR (%)": row.ctr,
        "Posição Média": row.position,
      }));

      // 2. Create worksheet
      const worksheet = XLSX.utils.json_to_sheet(data);

      // 3. Define professional column widths to fit content nicely
      worksheet["!cols"] = [
        { wch: 45 }, // Palavra-Chave (Google Search Console)
        { wch: 12 }, // Cliques
        { wch: 15 }, // Impressões
        { wch: 12 }, // CTR (%)
        { wch: 15 }, // Posição Média
      ];

      // 4. Create workbook and append sheet
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Palavras-Chave");

      // 5. Generate and download file
      const domainName = activeDomain?.url ? activeDomain.url.replace(/[^a-zA-Z0-9]/g, "-") : "dominio";
      XLSX.writeFile(workbook, `keywords-search-console-${domainName}.xlsx`);

      showToast("Palavras-chave exportadas com sucesso em formato Excel (.xlsx)!", "success");
    } catch (error) {
      console.error("Erro ao exportar Excel:", error);
      showToast("Erro ao exportar dados em formato Excel.", "error");
    }
  };

  // Export active domain history to JSON
  const handleExportHistoryJSON = () => {
    if (!activeDomain) return;
    const historyData = activeDomain.reportsHistory;
    const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
      JSON.stringify(historyData, null, 2)
    )}`;
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", jsonString);
    downloadAnchor.setAttribute("download", `historico-auditoria-${activeDomain.url.replace(/[^a-zA-Z0-9]/g, "-")}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    showToast("Histórico de auditoria exportado com sucesso em JSON!", "success");
  };

  // Helper to calculate the next automated execution date
  const getNextExecutionDate = (day: number) => {
    const now = new Date();
    let year = now.getFullYear();
    let month = now.getMonth();
    
    let execDate = new Date(year, month, day, 9, 0, 0);
    
    if (execDate <= now) {
      month += 1;
      if (month > 11) {
        month = 0;
        year += 1;
      }
      execDate = new Date(year, month, day, 9, 0, 0);
    }
    
    return execDate.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "short",
      year: "numeric"
    }) + " às 09:00";
  };

  // Generate IA Comparative Analysis using Gemini
  const handleGenerateIAComparison = async () => {
    setIsCompareIAModalOpen(true);
    setIsComparingIA(true);
    setCompareIAMarkdown(null);
    
    try {
      const response = await fetch("/api/compare-ia", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          domains: domains,
          activeDomainUrl: activeDomain?.url || "meusite.com.br"
        })
      });
      
      if (!response.ok) {
        throw new Error("Erro na requisição da API de comparação");
      }
      
      const data = await response.json();
      setCompareIAMarkdown(data.markdown);
    } catch (err: unknown) {
      console.error(err);
      setCompareIAMarkdown("### Erro de Conexão\n\nNão foi possível gerar a análise comparativa por IA neste momento. Por favor, tente novamente mais tarde.");
      showToast("Falha ao gerar comparação inteligente por IA", "error");
    } finally {
      setIsComparingIA(false);
    }
  };

  // Run Basic Security Scanner on the Active Domain
  const handleSecurityScan = async () => {
    if (!activeDomain?.url) {
      showToast("Por favor, selecione ou analise um domínio antes.", "error");
      return;
    }

    setIsScanningSecurity(true);
    setSecurityScanResult(null);

    try {
      const res = await fetch("/api/security/scan", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ url: activeDomain.url })
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Erro ao executar scanner de segurança");
      }

      const data: SecurityScanResult = await res.json();
      setSecurityScanResult(data);
      showToast(`Varredura de segurança concluída! Nota: ${data.score}/100`, "success");
    } catch (err: unknown) {
      console.error("Scanner error:", err);
      showToast(getErrorMessage(err), "error");
    } finally {
      setIsScanningSecurity(false);
    }
  };

  // Delete Domain Profile
  const handleDeleteDomain = (idToDelete: string) => {
    if (domains.length <= 1) {
      alert("É necessário manter ao menos um domínio cadastrado para visualizar os painéis.");
      return;
    }
    const confirmed = window.confirm("Deseja realmente remover este domínio de seu histórico?");
    if (confirmed) {
      const remaining = domains.filter(d => d.id !== idToDelete);
      setDomains(remaining);
      if (activeDomainId === idToDelete) {
        setActiveDomainId(remaining[0].id);
      }
    }
  };

  // Score visual helper (renders color based on score level)
  const getScoreColorClass = (score: number) => {
    if (score >= 90) return "text-emerald-500 border-emerald-500 bg-emerald-500/5";
    if (score >= 50) return "text-amber-500 border-amber-500 bg-amber-500/5";
    return "text-red-500 border-red-500 bg-red-500/5";
  };

  if (!sessionUser) {
    return <LoginScreen onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div id="app_root" className="min-h-screen flex text-zinc-100 font-sans antialiased">

      {/* Mobile Sidebar / Drawer (Dark Telemetry Glass) */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 md:hidden"
            />
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 240 }}
              className="fixed top-0 left-0 bottom-0 w-76 max-w-[85vw] z-50 md:hidden flex flex-col bg-[#0C0C0F]/95 backdrop-blur-xl border-r border-zinc-800 shadow-2xl"
            >
              {/* Drawer Header */}
              <div className="p-5 flex items-center justify-between border-b border-slate-800/80">
                <div className="flex items-center gap-2.5">
                  <div className="bg-linear-to-br from-cyan-400 via-blue-500 to-violet-600 text-white p-2 rounded-xl shadow-[0_0_20px_rgba(6,182,212,0.4)]">
                    <Zap className="h-4 w-4" />
                  </div>
                  <div>
                    <h2 className="font-display text-sm font-bold tracking-tight text-zinc-100 flex items-center gap-1.5">
                      SiteAnalyzer
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full badge-ai-gemini">v2.0</span>
                    </h2>
                    <p className="text-[10px] text-zinc-400">Dark Telemetry & IA</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-100 transition-colors cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Logged in User widget */}
              {sessionUser && (
                <div className="px-5 py-4 border-b border-zinc-800/80 bg-zinc-950/40 flex flex-col gap-2.5">
                  <div className="flex items-center gap-2.5">
                    <div className="p-1.5 rounded-lg bg-indigo-500/15 border border-indigo-500/30 text-indigo-400">
                      {sessionUser.role === "admin" ? <Shield className="h-3.5 w-3.5" /> : <Mail className="h-3.5 w-3.5" />}
                    </div>
                    <div className="min-w-0">
                      <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider block leading-none mb-1">
                        {sessionUser.role === "admin" ? "Administrador" : "Conta Conectada"}
                      </span>
                      <span className="text-xs font-medium text-zinc-200 block truncate" title={sessionUser.email}>
                        {sessionUser.email}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      handleLogout();
                      setIsMobileMenuOpen(false);
                    }}
                    className="w-full flex items-center justify-center gap-1.5 py-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-lg text-[11px] font-medium text-zinc-300 hover:text-white transition-colors cursor-pointer"
                  >
                    <LogIn className="h-3 w-3 rotate-180" />
                    Sair da Conta
                  </button>
                </div>
              )}

              {/* Sidebar Nav Items */}
              <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
                {[
                  { id: "audit", label: "Relatório Auditoria", icon: Globe },
                  { id: "history", label: "Histórico Domínio", icon: TrendingUp },
                  { id: "compare", label: "Comparar Domínios", icon: ArrowRightLeft },
                  { id: "integrations", label: "Google Integrations", icon: BarChart3 },
                  { id: "email", label: "Relatórios Mensais", icon: Mail },
                  { id: "checklist", label: "Checklist SEO", icon: CheckSquare },
                  ...(sessionUser?.role === "admin"
                    ? [{ id: "maintenance", label: "Painel Manutenção", icon: Shield }]
                    : []),
                ].map((tab) => {
                  const Icon = tab.icon;
                  const isSelected = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => {
                        setActiveTab(tab.id as AppTab);
                        setIsMobileMenuOpen(false);
                      }}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-all cursor-pointer text-left border ${
                        isSelected
                          ? "bg-indigo-500/15 text-indigo-300 border-indigo-500/30 font-semibold"
                          : "text-zinc-400 border-transparent hover:bg-zinc-900 hover:text-zinc-200"
                      }`}
                    >
                      <Icon className={`h-4 w-4 ${isSelected ? "text-indigo-400" : "text-zinc-500"}`} />
                      <span>{tab.label}</span>
                    </button>
                  );
                })}
              </nav>

              {/* Connection Widget in bottom */}
              <div className="p-4 border-t border-zinc-800/80">
                <div className="bg-zinc-950/70 border border-zinc-800 rounded-xl p-3 text-[11px]">
                  <span className="text-[10px] text-zinc-500 uppercase tracking-wider block font-mono mb-2">
                    Telemetria Google
                  </span>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-zinc-300">Google Analytics</span>
                    <span className={`w-2 h-2 rounded-full ${googleAccessToken ? "bg-emerald-400 shadow-[0_0_8px_#10B981]" : "bg-zinc-600"}`} />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-300">Search Console</span>
                    <span className={`w-2 h-2 rounded-full ${googleAccessToken ? "bg-emerald-400 shadow-[0_0_8px_#10B981]" : "bg-zinc-600"}`} />
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Left Sidebar — Electric Telemetry Style */}
      <aside className="w-64 bg-bento/95 backdrop-blur-xl text-zinc-100 flex-col border-r border-cyan-500/15 hidden md:flex shrink-0">
        <div className="p-5 flex items-center gap-3 border-b border-cyan-500/15">
          <div className="bg-linear-to-br from-cyan-400 via-blue-500 to-violet-600 text-white p-2 rounded-xl shadow-[0_0_24px_rgba(6,182,212,0.45)] flex items-center justify-center">
            <Zap className="h-4 w-4" />
          </div>
          <div>
            <h1 className="font-display text-sm font-bold tracking-tight text-zinc-100 flex items-center gap-1.5">
              SiteAnalyzer
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full badge-ai-gemini">v2.0</span>
            </h1>
            <p className="text-[10px] text-zinc-400">Telemetria Real · SEO & IA</p>
          </div>
        </div>

        {/* Logged in User widget */}
        {sessionUser && (
          <div className="px-4 py-4 border-b border-zinc-800/80 bg-zinc-950/30 flex flex-col gap-2.5">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-indigo-500/15 border border-indigo-500/25 text-indigo-400">
                {sessionUser.role === "admin" ? <Shield className="h-3.5 w-3.5" /> : <Mail className="h-3.5 w-3.5" />}
              </div>
              <div className="min-w-0">
                <span className="text-[10px] text-zinc-500 font-mono uppercase tracking-wider block leading-none mb-1">
                  {sessionUser.role === "admin" ? "Administrador" : "Workspace"}
                </span>
                <span className="text-xs font-medium text-zinc-200 block truncate" title={sessionUser.email}>
                  {sessionUser.email}
                </span>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-1.5 py-1.5 bg-zinc-900 hover:bg-zinc-800 rounded-lg text-[11px] font-medium text-zinc-400 hover:text-zinc-100 transition-colors cursor-pointer border border-zinc-800"
            >
              <LogIn className="h-3 w-3 rotate-180" />
              Sair da Conta
            </button>
          </div>
        )}

        {/* Sidebar Nav Items */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {[
            { id: "audit", label: "Relatório Auditoria", icon: Globe },
            { id: "history", label: "Histórico Domínio", icon: TrendingUp },
            { id: "compare", label: "Comparar Domínios", icon: ArrowRightLeft },
            { id: "integrations", label: "Google Integrations", icon: BarChart3 },
            { id: "email", label: "Relatórios Mensais", icon: Mail },
            { id: "checklist", label: "Checklist SEO", icon: CheckSquare },
            ...(sessionUser?.role === "admin"
              ? [{ id: "maintenance", label: "Painel Manutenção", icon: Shield }]
              : []),
          ].map((tab) => {
            const Icon = tab.icon;
            const isSelected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as AppTab)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition-all cursor-pointer select-none text-left border ${
                  isSelected
                    ? "bg-linear-to-r from-cyan-500/15 to-violet-500/15 text-cyan-200 border-cyan-400/35 font-semibold shadow-[0_0_18px_rgba(6,182,212,0.16)]"
                    : "text-slate-400 border-transparent hover:bg-slate-900/90 hover:text-slate-100"
                }`}
              >
                <Icon className={`h-4 w-4 ${isSelected ? "text-cyan-400" : "text-slate-500"}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Connection Widget in Sidebar bottom */}
        <div className="p-4 border-t border-zinc-800/80">
          <div className="bg-zinc-950/70 border border-zinc-800/90 rounded-xl p-3 text-[11px]">
            <span className="text-[10px] text-zinc-500 uppercase tracking-wider block font-mono mb-2">
              Conectividade Google
            </span>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-zinc-400">Google Analytics</span>
              <span className={`w-2 h-2 rounded-full ${googleAccessToken ? "bg-emerald-400 shadow-[0_0_8px_#10B981]" : "bg-zinc-600"}`} />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-zinc-400">Search Console</span>
              <span className={`w-2 h-2 rounded-full ${googleAccessToken ? "bg-emerald-400 shadow-[0_0_8px_#10B981]" : "bg-zinc-600"}`} />
            </div>
          </div>
        </div>
      </aside>

      {/* Main Right Area */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* Sticky Glassmorphism Header + Barra de Auditoria Hero */}
        <header className="sticky top-0 z-40 py-3.5 px-5 lg:px-7 bg-obsidian/80 backdrop-blur-xl border-b border-zinc-800/80">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3.5 max-w-360 mx-auto w-full">

            {/* Mobile Header Branding */}
            <div className="flex items-center justify-between w-full md:hidden">
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                  className="p-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-200 hover:border-zinc-700 cursor-pointer"
                  aria-label="Abrir menu"
                >
                  {isMobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
                </button>
                <div className="bg-linear-to-br from-indigo-500 to-violet-600 text-white p-1.5 rounded-lg">
                  <Zap className="h-3.5 w-3.5" />
                </div>
                <span className="font-display text-sm font-bold tracking-tight text-zinc-100">
                  SiteAnalyzer
                </span>
              </div>
              <span className="font-mono text-[10px] px-2 py-0.5 rounded-full badge-ai-gemini">
                v2.0
              </span>
            </div>

            {/* BARRA DE AUDITORIA HERO (Glassmorphism + Seletor Segmentado Mobile|Desktop + Electric Indigo Glow) */}
            <form
              onSubmit={handleAnalyze}
              className="flex flex-col sm:flex-row items-stretch sm:items-center flex-1 max-w-2xl mx-auto md:mx-0 gap-2 p-1.5 rounded-2xl glass-surface shadow-[0_8px_30px_rgba(0,0,0,0.45)] focus-within:border-indigo-500/60 transition-all"
            >
              <div className="relative flex-1 min-w-0 flex items-center">
                <Search className="absolute left-3.5 h-4 w-4 text-indigo-400 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Auditar domínio (ex: s7vendesign.com.br)"
                  value={analyzingUrl}
                  onChange={(e) => setAnalyzingUrl(e.target.value)}
                  disabled={isAnalyzing}
                  required
                  id="auditor_input"
                  className="w-full bg-transparent! border-0! shadow-none! pl-10 pr-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:ring-0! focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-2 shrink-0 justify-between sm:justify-end">
                {/* Seletor Segmentado Elegante (Mobile | Desktop) */}
                <div
                  className="inline-flex items-center p-0.5 rounded-xl bg-zinc-950/90 border border-zinc-800"
                  role="group"
                  aria-label="Perfil do dispositivo"
                >
                  <button
                    type="button"
                    onClick={() => handleSaveAuditDevice("mobile")}
                    className={`px-2.5 py-1.5 rounded-lg text-[11px] font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                      selectedAuditDevice === "mobile"
                        ? "bg-zinc-800 text-zinc-100 shadow-sm"
                        : "text-zinc-500 hover:text-zinc-300"
                    }`}
                    title="Auditoria Mobile (redes móveis e viewport smartphone)"
                  >
                    <Smartphone className="h-3.5 w-3.5" />
                    <span>Mobile</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSaveAuditDevice("desktop")}
                    className={`px-2.5 py-1.5 rounded-lg text-[11px] font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                      selectedAuditDevice === "desktop"
                        ? "bg-zinc-800 text-zinc-100 shadow-sm"
                        : "text-zinc-500 hover:text-zinc-300"
                    }`}
                    title="Auditoria Desktop"
                  >
                    <Monitor className="h-3.5 w-3.5" />
                    <span>Desktop</span>
                  </button>
                </div>

                {/* Primary Glow Action Button */}
                <button
                  type="submit"
                  disabled={isAnalyzing}
                  id="analyze_button"
                  className="btn-indigo-glow disabled:opacity-50 px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer shrink-0"
                  title={`Executar auditoria real (${selectedAuditDevice})`}
                >
                  {isAnalyzing ? (
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Zap className="h-3.5 w-3.5" />
                  )}
                  <span>{isAnalyzing ? "Auditando..." : "Analisar"}</span>
                </button>
              </div>
            </form>

            {/* Right User Telemetry Pill */}
            {sessionUser && (
              <div className="hidden lg:flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsMonitorModalOpen(true)}
                  className="p-2 rounded-xl bg-zinc-900/90 border border-zinc-800 hover:border-zinc-700 text-zinc-400 hover:text-zinc-100 transition-colors cursor-pointer"
                  title="Configurar Limites de Alerta"
                >
                  <Settings className="h-4 w-4" />
                </button>
                <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-zinc-900/80 border border-zinc-800">
                  <div className="w-6 h-6 rounded-lg bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 flex items-center justify-center">
                    {sessionUser.role === "admin" ? <Shield className="h-3.5 w-3.5" /> : <Mail className="h-3.5 w-3.5" />}
                  </div>
                  <div className="text-left">
                    <span className="text-[9px] font-mono text-zinc-500 uppercase block leading-none mb-0.5">
                      {sessionUser.role === "admin" ? "Admin" : "Ativo"}
                    </span>
                    <span className="text-xs font-medium text-zinc-200 block leading-none max-w-35 truncate">
                      {sessionUser.email}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </header>

        {/* Main Workspace content */}
        <main className="flex-1 overflow-y-auto p-5 lg:p-7 flex flex-col gap-5 max-w-360 mx-auto w-full">

        {isMaintenanceMode && (
          <div className="bento-card border-amber-500/30 bg-amber-500/10 p-4 text-xs flex items-center justify-between gap-4 animate-fade-in">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-500/20 border border-amber-500/30 text-amber-400 rounded-xl">
                <AlertTriangle className="h-4 w-4" />
              </div>
              <div>
                <h4 className="font-display font-semibold text-amber-200 leading-tight">
                  Sistema em Modo de Manutenção Programada
                </h4>
                <p className="text-amber-300/80 mt-0.5 leading-relaxed">
                  Novas auditorias estão temporariamente pausadas pela administração.
                </p>
              </div>
            </div>
            {sessionUser?.role === "admin" && (
              <span className="text-[10px] font-mono font-semibold px-2.5 py-1 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-300">
                Admin Ativo
              </span>
            )}
          </div>
        )}

        {/* Dark Telemetry Bento Skeleton Loader during Real 3-Layer Analysis */}
        {isAnalyzing && (
          <AuditSkeletonLoader
            steps={steps}
            currentStep={analysisStep}
            targetUrl={analyzingTargetLabel}
            device={selectedAuditDevice}
          />
        )}

        {!isAnalyzing && (
          <>
            {/* Mobile-only Top Tabs Navigation */}
            <div className="flex md:hidden gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              {[
                { id: "audit", label: "Auditoria", icon: Globe },
                { id: "history", label: "Histórico", icon: TrendingUp },
                { id: "compare", label: "Comparar", icon: ArrowRightLeft },
                { id: "integrations", label: "Google", icon: BarChart3 },
                { id: "email", label: "E-mail", icon: Mail },
                { id: "checklist", label: "Checklist", icon: CheckSquare },
                ...(sessionUser?.role === "admin"
                  ? [{ id: "maintenance", label: "Manutenção", icon: Shield }]
                  : []),
              ].map((tab) => {
                const Icon = tab.icon;
                const isSelected = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as AppTab)}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium border transition-all whitespace-nowrap cursor-pointer ${
                      isSelected
                        ? "bg-indigo-500/15 border-indigo-500/30 text-indigo-300"
                        : "bg-zinc-900/80 border-zinc-800 text-zinc-400"
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {/* Top Toolbar: Active Domain Profile Picker & Exporters */}
            <div className="bento-card p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              {/* Domain Switcher */}
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="text-[11px] font-mono text-zinc-500 uppercase tracking-wider">
                  Domínio:
                </span>
                <div className="relative inline-block">
                  <motion.select
                    key={activeDomainId}
                    initial={{ scale: 0.98, opacity: 0.9 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.15 }}
                    value={activeDomainId}
                    onChange={(e) => setActiveDomainId(e.target.value)}
                    id="domain_picker"
                    className="appearance-none rounded-xl px-3.5 py-2 pr-9 text-xs font-mono font-medium cursor-pointer"
                  >
                    {domains.map((d) => {
                      const latest = d.latestReport;
                      const score = latest
                        ? Math.round(
                            (latest.scores.performance +
                              latest.scores.accessibility +
                              latest.scores.seo) /
                              3
                          )
                        : 0;
                      const suffix = latest ? ` (${score}/100)` : " (Sem auditoria)";
                      return (
                        <option key={d.id} value={d.id}>
                          {d.url}
                          {suffix}
                        </option>
                      );
                    })}
                  </motion.select>
                  <ChevronDown className="h-3.5 w-3.5 text-zinc-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>

                {!activeDomain?.latestReport && (
                  <button
                    type="button"
                    onClick={() => activeDomain && handleAnalyze(undefined, activeDomain.url)}
                    className="btn-indigo-glow px-3 py-1.5 rounded-xl text-[11px] font-semibold flex items-center gap-1.5 cursor-pointer"
                  >
                    <Play className="h-3 w-3 fill-current" />
                    <span>Auditar Agora</span>
                  </button>
                )}

                {activeDomain && (() => {
                  const latest = activeDomain?.latestReport;
                  const score = latest
                    ? Math.round(
                        (latest.scores.performance + latest.scores.accessibility + latest.scores.seo) / 3
                      )
                    : 0;
                  let badgeClass = "bg-zinc-900 border-zinc-800 text-zinc-400";
                  let statusText = "Sem Auditoria";
                  if (latest) {
                    if (score >= 90) {
                      badgeClass = "bg-emerald-500/10 border-emerald-500/25 text-emerald-400";
                      statusText = `Ideal · ${score}`;
                    } else if (score >= 50) {
                      badgeClass = "bg-amber-500/10 border-amber-500/25 text-amber-400";
                      statusText = `Atenção · ${score}`;
                    } else {
                      badgeClass = "bg-rose-500/10 border-rose-500/25 text-rose-400";
                      statusText = `Crítico · ${score}`;
                    }
                  }
                  return (
                    <span className={`px-2.5 py-1 rounded-full border font-mono tabular-nums text-[10px] font-semibold ${badgeClass}`}>
                      {statusText}
                    </span>
                  );
                })()}

                <button
                  onClick={handleGenerateIAComparison}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold badge-ai-gemini hover:border-indigo-400/60 transition-all cursor-pointer whitespace-nowrap"
                  title="Gerar análise comparativa estratégica via Gemini"
                >
                  <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
                  <span>Análise Comparativa IA</span>
                </button>

                {activeDomain && (
                  <button
                    onClick={() => handleDeleteDomain(activeDomain.id)}
                    title="Excluir Domínio"
                    className="p-1.5 rounded-lg text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>

              {/* Exporters (PDF Dual Corporativo Claro + CSV + XLSX) */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleExportClientPDF}
                  disabled={!activeDomain?.latestReport || isExportingPdf}
                  className="px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 disabled:opacity-40 text-zinc-200 border border-zinc-800 hover:border-emerald-500/40 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
                  title="Exportar relatório executivo limpo para o cliente"
                >
                  {isExportingPdf ? (
                    <RefreshCw className="h-3.5 w-3.5 animate-spin text-emerald-400" />
                  ) : (
                    <FileText className="h-3.5 w-3.5 text-emerald-400" />
                  )}
                  <span>Exportar PDF Cliente</span>
                </button>
                <button
                  type="button"
                  onClick={handleExportDeveloperPDF}
                  disabled={!activeDomain?.latestReport || isExportingPdf}
                  className="px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 disabled:opacity-40 text-zinc-200 border border-indigo-500/35 hover:border-indigo-400 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
                  title="Exportar caderno técnico completo para o desenvolvedor"
                >
                  {isExportingPdf ? (
                    <RefreshCw className="h-3.5 w-3.5 animate-spin text-indigo-400" />
                  ) : (
                    <Code2 className="h-3.5 w-3.5 text-indigo-400" />
                  )}
                  <span>Exportar PDF Desenvolvedor</span>
                </button>
                <button
                  type="button"
                  onClick={handleExportCSV}
                  disabled={searchQueries.length === 0}
                  className="px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 disabled:opacity-40 text-zinc-300 border border-zinc-800 hover:border-zinc-700 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Download className="h-3.5 w-3.5 text-emerald-400" />
                  CSV
                </button>
                <button
                  type="button"
                  onClick={handleExportXLSX}
                  disabled={searchQueries.length === 0}
                  className="px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 disabled:opacity-40 text-zinc-300 border border-zinc-800 hover:border-zinc-700 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <FileText className="h-3.5 w-3.5 text-emerald-400" />
                  Excel
                </button>
              </div>
            </div>

            {/* TAB CONTENTS WITH MOTION ANIMATIONS */}
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.2 }}
                className="w-full"
              >
                {/* TAB 1: AUDIT REPORT */}
                {activeTab === "audit" && (
              <div className="flex flex-col gap-6 animate-fade-in">
                {activeDomain?.latestReport ? (
                  <>
                    <ScoreCards report={activeDomain.latestReport} />
                    <CoreWebVitals report={activeDomain.latestReport} />
                    <SecurityAuditPanel security={activeDomain.latestReport.security} />
                    <DualReportPanel
                      report={activeDomain.latestReport}
                      isExportingPdf={isExportingPdf}
                      onExportClientPDF={handleExportClientPDF}
                      onExportDeveloperPDF={handleExportDeveloperPDF}
                      onOpenGscExplain={(payload) => setSelectedGSCExplain(payload)}
                      showToast={showToast}
                    />
                    <ArchitectureAndSeoPanel
                      seoOnPage={activeDomain.latestReport.seoOnPage}
                      architecture={activeDomain.latestReport.architecture}
                    />
                    <BusinessUxPanel analysis={activeDomain.latestReport.businessAnalysis} />

                    {/* Painel de Monitoramento Preventivo de Limiar de Métrica */}
                    <div className="bento-card p-6 flex flex-col gap-5 animate-fade-in relative overflow-hidden">
                      <div className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-cyan-400/70 to-transparent" />
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
                        <div className="flex items-center gap-3">
                          <div className="bg-linear-to-br from-cyan-400 to-blue-600 text-white p-2.5 rounded-xl flex items-center justify-center shadow-[0_0_18px_rgba(6,182,212,0.35)] shrink-0">
                            <Settings className="h-4.5 w-4.5" />
                          </div>
                          <div>
                            <h3 className="font-display font-bold text-slate-100 text-base">Monitoramento Preventivo de Métricas</h3>
                            <p className="text-xs text-slate-400">Configure limites mínimos para as pontuações e receba alertas preventivos em tempo real.</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2.5">
                          <span className="text-xs font-mono uppercase tracking-wider text-slate-400">Monitoramento:</span>
                          <button
                            type="button"
                            onClick={() => {
                              setMonitorEnabled(prev => !prev);
                              showToast(
                                !monitorEnabled 
                                  ? "Monitoramento preventivo ativado!" 
                                  : "Monitoramento preventivo desativado.", 
                                !monitorEnabled ? "success" : "info"
                              );
                            }}
                            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border transition-colors duration-200 ease-in-out focus:outline-none ${
                              monitorEnabled
                                ? "bg-linear-to-r from-cyan-500 to-violet-500 border-cyan-400/50 shadow-[0_0_14px_rgba(6,182,212,0.4)]"
                                : "bg-slate-800 border-slate-700"
                            }`}
                          >
                            <span
                              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                                monitorEnabled ? "translate-x-5" : "translate-x-0"
                              }`}
                            />
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-stretch">
                        {/* Left column: threshold adjust */}
                        <div className="md:col-span-5 bg-obsidian/70 border border-slate-800/90 rounded-xl p-4.5 flex flex-col gap-4 justify-center">
                          <div>
                            <div className="flex items-center justify-between mb-1.5">
                              <span className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                                <Smartphone className="h-3.5 w-3.5 text-cyan-400" />
                                Limite Móvel (Mobile)
                              </span>
                              <span className="text-xs font-bold text-cyan-300 font-mono tabular-nums bg-cyan-500/15 px-2.5 py-0.5 border border-cyan-400/35 rounded-full">
                                {monitorThresholdMobile} / 100
                              </span>
                            </div>
                            <input
                              type="range"
                              min="1"
                              max="100"
                              value={monitorThresholdMobile}
                              onChange={(e) => setMonitorThresholdMobile(parseInt(e.target.value, 10))}
                              disabled={!monitorEnabled}
                              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400 disabled:opacity-50"
                            />
                          </div>

                          <div>
                            <div className="flex items-center justify-between mb-1.5">
                              <span className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                                <Monitor className="h-3.5 w-3.5 text-violet-400" />
                                Limite Desktop
                              </span>
                              <span className="text-xs font-bold text-violet-300 font-mono tabular-nums bg-violet-500/15 px-2.5 py-0.5 border border-violet-400/35 rounded-full">
                                {monitorThresholdDesktop} / 100
                              </span>
                            </div>
                            <input
                              type="range"
                              min="1"
                              max="100"
                              value={monitorThresholdDesktop}
                              onChange={(e) => setMonitorThresholdDesktop(parseInt(e.target.value, 10))}
                              disabled={!monitorEnabled}
                              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-violet-400 disabled:opacity-50"
                            />
                          </div>
                        </div>

                        {/* Middle column: choose metrics to monitor */}
                        <div className="md:col-span-4 flex flex-col justify-center gap-2.5 bg-obsidian/70 border border-slate-800/90 rounded-xl p-4.5">
                          <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400">Métricas Monitoradas</span>
                          <div className="flex flex-wrap gap-2">
                            {[
                              { key: "performance", label: "Desempenho" },
                              { key: "accessibility", label: "Acessibilidade" },
                              { key: "seo", label: "SEO" }
                            ].map((met) => {
                              const isChecked = monitorMetrics[met.key];
                              return (
                                <label 
                                  key={met.key} 
                                  className={`flex items-center gap-2 cursor-pointer select-none text-xs font-semibold px-3 py-1.5 rounded-lg border transition-all ${
                                    !monitorEnabled 
                                      ? "opacity-45 pointer-events-none bg-slate-900/50 border-slate-800 text-slate-500" 
                                      : isChecked
                                        ? "bg-cyan-500/15 border-cyan-400/40 text-cyan-200 shadow-[0_0_12px_rgba(6,182,212,0.14)]"
                                        : "bg-bento border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200"
                                  }`}
                                >
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    disabled={!monitorEnabled}
                                    onChange={(e) => {
                                      setMonitorMetrics(prev => ({
                                        ...prev,
                                        [met.key]: e.target.checked
                                      }));
                                      showToast(
                                        e.target.checked
                                          ? `Monitoramento de ${met.label} ativado.`
                                          : `Monitoramento de ${met.label} desativado.`,
                                        "info"
                                      );
                                    }}
                                    className="rounded border-slate-700 bg-obsidian text-cyan-400 focus:ring-cyan-400 h-3.5 w-3.5 cursor-pointer accent-cyan-400"
                                  />
                                  {met.label}
                                </label>
                              );
                            })}
                          </div>
                        </div>

                        {/* Right column: Current Status */}
                        <div className="md:col-span-3 flex flex-col justify-center bg-obsidian/70 border border-slate-800/90 rounded-xl p-4.5">
                          <span className="text-[10px] font-mono uppercase font-semibold text-slate-400 tracking-wider">Status de Conformidade</span>
                          {(() => {
                            if (!monitorEnabled) {
                              return (
                                <div className="mt-2 flex items-center gap-2 text-slate-400 font-semibold text-xs">
                                  <span className="h-2 w-2 rounded-full bg-slate-600"></span>
                                  Inativo
                                </div>
                              );
                            }
                            
                            const report = activeDomain?.latestReport;
                            if (!activeDomain || !report) return null;
                            const deviceType = activeDomain.auditDevice || "desktop";
                            const currentThreshold = deviceType === "mobile" ? monitorThresholdMobile : monitorThresholdDesktop;
                            const scores = report.scores;
                            const alerts: string[] = [];
                            if (monitorMetrics.performance && scores.performance < currentThreshold) {
                              alerts.push("Desempenho");
                            }
                            if (monitorMetrics.accessibility && scores.accessibility < currentThreshold) {
                              alerts.push("Acessibilidade");
                            }
                            if (monitorMetrics.seo && scores.seo < currentThreshold) {
                              alerts.push("SEO");
                            }

                            if (alerts.length > 0) {
                              return (
                                <div className="mt-2.5 bg-rose-500/15 border border-rose-500/35 p-3 rounded-xl">
                                  <div className="flex items-center gap-1.5 text-rose-300 font-semibold text-xs">
                                    <AlertTriangle className="h-4 w-4 text-rose-400 shrink-0" />
                                    Atenção ({deviceType === "mobile" ? "Mobile" : "Desktop"})
                                  </div>
                                  <p className="text-[11px] text-rose-200/85 mt-1 leading-normal">
                                    {alerts.join(", ")} abaixo de {currentThreshold}.
                                  </p>
                                </div>
                              );
                            }

                            return (
                              <div className="mt-2.5 bg-emerald-500/10 border border-emerald-400/30 p-3 rounded-xl">
                                <div className="flex items-center gap-1.5 text-emerald-300 font-semibold text-xs">
                                  <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                                  Conforme ({deviceType === "mobile" ? "Mobile" : "Desktop"})
                                </div>
                                <p className="text-[11px] text-emerald-200/75 mt-1 leading-normal">
                                  Todas as métricas acima de {currentThreshold}.
                                </p>
                              </div>
                            );
                          })()}
                        </div>
                      </div>
                    </div>

                    {/* Google Search Console - Vínculo Automatizado de Domínios */}
                    <div className="bento-card p-6 flex flex-col gap-5 animate-fade-in relative overflow-hidden">
                      <div className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-violet-400/75 to-transparent" />
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
                        <div className="flex items-center gap-3">
                          <div className="bg-linear-to-br from-cyan-400 via-blue-500 to-violet-600 text-white p-2.5 rounded-xl flex items-center justify-center shadow-[0_0_20px_rgba(6,182,212,0.38)] shrink-0">
                            <Globe className="h-5 w-5" />
                          </div>
                          <div>
                            <h3 className="font-display font-bold text-slate-100 text-base">Google Search Console — Vínculo Automatizado</h3>
                            <p className="text-xs text-slate-400">Vincule seus domínios à conta ativa do GSC para habilitar auditorias automáticas periódicas.</p>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 max-w-full">
                          <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400">Conta GSC:</span>
                          <div className="flex flex-wrap items-center gap-2 bg-obsidian/85 px-3 py-1.5 border border-cyan-500/25 rounded-xl max-w-full">
                            <span className={`h-2 w-2 rounded-full shrink-0 ${googleAccessToken ? "bg-emerald-400 shadow-[0_0_8px_#00E599]" : "bg-amber-400 shadow-[0_0_8px_#FFB020]"}`}></span>
                            <span className="text-xs font-mono font-semibold text-slate-100 truncate max-w-37.5 sm:max-w-xs">{googleEmail || "demonstracao@gmail.com"}</span>
                            {googleAccessToken ? (
                              <button
                                type="button"
                                onClick={handleDisconnectGoogle}
                                className="text-[11px] text-rose-400 hover:text-rose-300 font-semibold ml-1 border-l border-slate-800 pl-2 cursor-pointer shrink-0 transition-colors"
                              >
                                Desconectar
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={handleConnectGoogle}
                                className="text-[11px] text-cyan-400 hover:text-cyan-300 font-semibold ml-1 border-l border-slate-800 pl-2 cursor-pointer flex items-center gap-1 shrink-0 transition-colors"
                              >
                                <Sparkles className="h-3 w-3" />
                                Integrar Conta
                              </button>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Domain Grid for GSC Binding */}
                      <div className="space-y-3">
                        <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400 block">Gerenciar Vínculos de Domínio</span>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                          {domains.map((dom) => {
                            const isLinked = dom.googleConnected;
                            return (
                              <div
                                key={dom.id}
                                className={`p-4 border rounded-xl flex flex-col xl:flex-row justify-between xl:items-center gap-4 transition-all ${
                                  isLinked 
                                    ? "bg-linear-to-br from-cyan-500/10 via-bento to-violet-500/10 border-cyan-400/35 hover:border-cyan-400/60 shadow-[0_0_24px_-12px_rgba(6,182,212,0.35)]" 
                                    : "bg-obsidian/70 border-slate-800/90 hover:border-slate-700"
                                }`}
                              >
                                <div className="space-y-2.5 flex-1 min-w-0 w-full">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span className="font-display text-sm font-bold text-slate-100 truncate block max-w-full">{dom.url}</span>
                                    {isLinked ? (
                                      <span className="px-2.5 py-0.5 rounded-full font-mono text-[10px] font-bold uppercase bg-emerald-500/15 text-emerald-300 border border-emerald-400/35 shadow-[0_0_12px_rgba(0,229,153,0.18)] flex items-center gap-1 shrink-0">
                                        <Check className="h-2.5 w-2.5" /> Ativo GSC
                                      </span>
                                    ) : (
                                      <span className="px-2.5 py-0.5 rounded-full font-mono text-[10px] font-semibold uppercase bg-slate-800/90 text-slate-400 border border-slate-700 shrink-0">
                                        Inativo
                                      </span>
                                    )}
                                  </div>

                                  {/* Automated test configurations for this domain */}
                                  <div className="flex flex-wrap items-center gap-3.5">
                                    <div className="flex items-center gap-1.5">
                                      <span className="text-[11px] text-slate-400 shrink-0">Testar em:</span>
                                      <select
                                        value={dom.auditDevice || "desktop"}
                                        onChange={(e) => {
                                          const value = e.target.value as "mobile" | "desktop";
                                          setDomains(prev => prev.map(d => 
                                            d.id === dom.id ? { ...d, auditDevice: value } : d
                                          ));
                                          showToast(`Dispositivo de teste para ${dom.url} alterado para ${value}.`, "info");
                                        }}
                                        disabled={!isLinked}
                                        className="rounded-lg px-2 py-1 text-[11px] font-mono disabled:opacity-45 cursor-pointer"
                                      >
                                        <option value="desktop">Desktop</option>
                                        <option value="mobile">Mobile</option>
                                      </select>
                                    </div>

                                    <div className="flex items-center gap-1.5">
                                      <span className="text-[11px] text-slate-400 shrink-0">Verificação:</span>
                                      <span className={`text-[11px] font-mono font-semibold shrink-0 ${isLinked ? "text-cyan-300" : "text-slate-500"}`}>
                                        {isLinked ? "Automatizada" : "Manual"}
                                      </span>
                                    </div>
                                  </div>
                                </div>

                                {/* Actions container: Binding Switch & Excluir Button */}
                                <div className="flex items-center gap-2 self-end xl:self-auto shrink-0">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const nextState = !dom.googleConnected;
                                      setDomains(prev => prev.map(d => 
                                        d.id === dom.id 
                                          ? { ...d, googleConnected: nextState, googleEmail: nextState ? (googleEmail || "demonstracao@gmail.com") : undefined } 
                                          : d
                                      ));
                                      showToast(
                                        nextState 
                                          ? `Domínio ${dom.url} vinculado com sucesso ao GSC!` 
                                          : `Domínio ${dom.url} desvinculado do GSC.`,
                                        nextState ? "success" : "info"
                                      );
                                    }}
                                    className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all border cursor-pointer shrink-0 ${
                                      isLinked
                                        ? "bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border-rose-500/35 hover:border-rose-400/60"
                                        : "btn-indigo-glow border-cyan-400/40"
                                    }`}
                                  >
                                    {isLinked ? "Desvincular" : "Vincular"}
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => {
                                      handleDeleteDomain(dom.id);
                                    }}
                                    title="Excluir Domínio e Vínculo"
                                    className="p-2 text-slate-400 hover:text-rose-300 hover:bg-rose-500/15 border border-slate-800 hover:border-rose-500/35 rounded-xl transition-all cursor-pointer flex items-center justify-center bg-obsidian/80 shrink-0"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    {/* Dicas Rápidas SEO section */}
                    <div className="bento-card p-6 flex flex-col gap-5 relative overflow-hidden">
                      <div className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-fuchsia-500/75 to-transparent" />
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-4">
                        <div className="flex items-center gap-3">
                          <div className="bg-linear-to-br from-fuchsia-500 via-violet-600 to-cyan-500 text-white p-2.5 rounded-xl flex items-center justify-center shadow-[0_0_22px_rgba(217,70,239,0.4)] shrink-0">
                            <Sparkles className="h-4.5 w-4.5" />
                          </div>
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="font-display font-bold text-slate-100 text-base">Dicas Rápidas de SEO</h3>
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold badge-ai-gemini uppercase tracking-wide font-mono">IA Gemini 2026</span>
                            </div>
                            <p className="text-xs text-slate-400 mt-0.5">Sugestões cirúrgicas de meta tags e estrutura baseadas nas últimas tendências do Google</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => fetchQuickTips(activeDomain.url, activeDomain.latestReport?.title, activeDomain.latestReport?.description)}
                          disabled={isLoadingQuickTips}
                          className="flex items-center gap-1.5 px-3.5 py-2 bg-obsidian/85 border border-cyan-500/25 hover:border-cyan-400/50 hover:bg-slate-900 disabled:opacity-50 rounded-xl text-xs font-semibold text-cyan-200 cursor-pointer transition-all self-start sm:self-center"
                        >
                          <RefreshCw className={`h-3.5 w-3.5 ${isLoadingQuickTips ? 'animate-spin text-fuchsia-400' : 'text-cyan-400'}`} />
                          Atualizar Dicas
                        </button>
                      </div>

                      {/* Error or Loading or Content State */}
                      {isLoadingQuickTips ? (
                        <div className="space-y-4 py-3 animate-pulse">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <div className="h-4 bg-slate-800/80 rounded w-1/3"></div>
                              <div className="h-10 bg-slate-800/60 rounded w-full"></div>
                              <div className="h-14 bg-slate-800/60 rounded w-full"></div>
                            </div>
                            <div className="space-y-3">
                              <div className="h-4 bg-slate-800/80 rounded w-1/4"></div>
                              <div className="flex gap-2">
                                <div className="h-7 bg-slate-800/70 rounded-full w-20"></div>
                                <div className="h-7 bg-slate-800/70 rounded-full w-24"></div>
                                <div className="h-7 bg-slate-800/70 rounded-full w-28"></div>
                              </div>
                              <div className="h-16 bg-slate-800/60 rounded w-full"></div>
                            </div>
                          </div>
                          <div className="h-16 bg-slate-800/50 rounded w-full"></div>
                        </div>
                      ) : quickTipsError ? (
                        <div className="bg-rose-500/15 border border-rose-500/35 text-rose-200 rounded-xl p-4 flex items-start gap-3">
                          <AlertTriangle className="h-5 w-5 text-rose-400 shrink-0 mt-0.5" />
                          <div className="flex-1">
                            <p className="text-xs font-semibold text-rose-200">Falha ao obter dicas de SEO da IA Gemini</p>
                            <p className="text-xs text-rose-300/85 mt-1 leading-relaxed">{quickTipsError}</p>
                            <button
                              type="button"
                              onClick={() => fetchQuickTips(activeDomain.url, activeDomain.latestReport?.title, activeDomain.latestReport?.description)}
                              className="mt-3 px-3.5 py-1.5 btn-indigo-glow font-semibold text-[11px] rounded-lg cursor-pointer"
                            >
                              Tentar Novamente
                            </button>
                          </div>
                        </div>
                      ) : quickTips ? (
                        <div className="flex flex-col gap-5">
                          
                          {/* Layout Grid: Meta Tags and Trending Keywords */}
                          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                            
                            {/* Left: Meta tags proposal */}
                            <div className="lg:col-span-7 flex flex-col gap-4 bg-obsidian/70 border border-slate-800/90 rounded-2xl p-5">
                              <div className="flex items-center gap-2">
                                <Lightbulb className="h-4.5 w-4.5 text-amber-400" />
                                <h4 className="text-xs uppercase tracking-wider font-mono font-bold text-slate-200">Meta Tags Propostas</h4>
                              </div>

                              <div className="space-y-4">
                                {/* Title Tag */}
                                <div className="space-y-1.5">
                                  <div className="flex items-center justify-between">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Título de SEO Sugerido</label>
                                    <span className={`text-[10px] font-mono tabular-nums font-bold ${(quickTips.suggestedMeta?.title ?? "").length <= 60 ? 'text-emerald-400' : 'text-amber-400'}`}>
                                      {(quickTips.suggestedMeta?.title ?? "").length} / 60 caracteres
                                    </span>
                                  </div>
                                  <div className="flex gap-2">
                                    <div className="flex-1 bg-bento border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-100 leading-snug select-all">
                                      {quickTips.suggestedMeta?.title}
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => handleCopy(quickTips.suggestedMeta?.title ?? "", 'title')}
                                      className="p-2.5 bg-bento border border-slate-800 hover:border-cyan-400/50 rounded-xl text-cyan-400 hover:text-cyan-300 cursor-pointer transition-colors shrink-0 flex items-center justify-center self-start"
                                      title="Copiar Título"
                                    >
                                      {copiedType === 'title' ? (
                                        <Check className="h-4 w-4 text-emerald-400" />
                                      ) : (
                                        <Copy className="h-4 w-4" />
                                      )}
                                    </button>
                                  </div>
                                </div>

                                {/* Meta Description */}
                                <div className="space-y-1.5">
                                  <div className="flex items-center justify-between">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Meta Description Sugerida</label>
                                    <span className={`text-[10px] font-mono tabular-nums font-bold ${(quickTips.suggestedMeta?.description ?? "").length <= 160 ? 'text-emerald-400' : 'text-amber-400'}`}>
                                      {(quickTips.suggestedMeta?.description ?? "").length} / 160 caracteres
                                    </span>
                                  </div>
                                  <div className="flex gap-2">
                                    <div className="flex-1 bg-bento border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs font-medium text-slate-200 leading-relaxed select-all">
                                      {quickTips.suggestedMeta?.description}
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => handleCopy(quickTips.suggestedMeta?.description ?? "", 'desc')}
                                      className="p-2.5 bg-bento border border-slate-800 hover:border-cyan-400/50 rounded-xl text-cyan-400 hover:text-cyan-300 cursor-pointer transition-colors shrink-0 flex items-center justify-center self-start"
                                      title="Copiar Descrição"
                                    >
                                      {copiedType === 'desc' ? (
                                        <Check className="h-4 w-4 text-emerald-400" />
                                      ) : (
                                        <Copy className="h-4 w-4" />
                                      )}
                                    </button>
                                  </div>
                                </div>

                                {/* Reasoning box */}
                                <div className="bg-violet-500/10 border border-violet-400/30 rounded-xl p-3.5 text-xs text-violet-100 leading-relaxed">
                                  <span className="font-bold text-fuchsia-300 block text-[10px] uppercase tracking-wider mb-1 font-mono">Por que estas Meta Tags?</span>
                                  {quickTips.suggestedMeta?.reason}
                                </div>
                              </div>
                            </div>

                            {/* Right: Keywords & Google Algorithm trends context */}
                            <div className="lg:col-span-5 flex flex-col gap-4 bg-obsidian/70 border border-slate-800/90 rounded-2xl p-5 justify-between">
                              <div className="space-y-3.5">
                                <div className="flex items-center gap-2">
                                  <Target className="h-4.5 w-4.5 text-cyan-400" />
                                  <h4 className="text-xs uppercase tracking-wider font-mono font-bold text-slate-200">Palavras-chave em Alta (2026)</h4>
                                </div>
                                <div className="flex flex-wrap gap-1.5">
                                  {quickTips.trendingKeywords?.map((keyword: string, idx: number) => (
                                    <span key={idx} className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-cyan-500/10 border border-cyan-400/30 rounded-lg text-xs font-semibold text-cyan-200">
                                      <TrendingUp className="h-3 w-3 text-emerald-400" />
                                      {keyword}
                                    </span>
                                  ))}
                                </div>
                              </div>

                              <div className="border-t border-slate-800 pt-4 space-y-2">
                                <div className="flex items-center gap-2">
                                  <Globe className="h-4 w-4 text-violet-400" />
                                  <h4 className="text-xs uppercase tracking-wider font-mono font-bold text-slate-200">Tendências do Algoritmo</h4>
                                </div>
                                <p className="text-xs text-slate-300 leading-relaxed">
                                  {quickTips.searchTrendsContext}
                                </p>
                              </div>
                            </div>

                          </div>

                          {/* Content structure suggestions */}
                          <div className="bg-obsidian/70 border border-slate-800/90 rounded-2xl p-5 flex flex-col gap-4">
                            <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-2.5">
                              <div className="flex items-center gap-2">
                                <Globe className="h-4.5 w-4.5 text-emerald-400" />
                                <h4 className="text-xs uppercase tracking-wider font-mono font-bold text-slate-200">Estrutura de Conteúdo Recomendada para Indexação</h4>
                              </div>
                              {(() => {
                                const structureItems = quickTips?.contentStructure ?? [];
                                const total = structureItems.length;
                                const done = structureItems.filter((item) => {
                                  const key = `${activeDomainId}-${item.section}-${item.suggestion}`;
                                  return !!implementedTips[key];
                                }).length;
                                if (total > 0) {
                                  return (
                                    <span className="text-[10px] bg-emerald-500/15 text-emerald-300 border border-emerald-400/30 font-bold px-2.5 py-0.5 rounded-full font-mono tabular-nums">
                                      {done}/{total} Concluídos
                                    </span>
                                  );
                                }
                                return null;
                              })()}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                              {(() => {
                                const sortedStructure = [...(quickTips?.contentStructure ?? [])].sort((a, b) => {
                                  const keyA = `${activeDomainId}-${a.section}-${a.suggestion}`;
                                  const keyB = `${activeDomainId}-${b.section}-${b.suggestion}`;
                                  const isAImplemented = !!implementedTips[keyA];
                                  const isBImplemented = !!implementedTips[keyB];
                                  if (isAImplemented && !isBImplemented) return 1;
                                  if (!isAImplemented && isBImplemented) return -1;
                                  return 0;
                                });

                                return sortedStructure.map((item, idx) => {
                                  const key = `${activeDomainId}-${item.section}-${item.suggestion}`;
                                  const isImplemented = !!implementedTips[key];

                                  return (
                                    <div
                                      key={idx}
                                      className={`border rounded-xl p-4 flex flex-col justify-between gap-3 transition-all duration-300 ${
                                        isImplemented
                                          ? "bg-emerald-500/10 border-emerald-400/30 opacity-80"
                                          : "bg-bento border-slate-800 hover:border-cyan-400/40"
                                      }`}
                                    >
                                      <div>
                                        <div className="flex items-start justify-between gap-2">
                                          <span className={`text-[10px] font-bold uppercase tracking-wider font-mono ${isImplemented ? 'text-emerald-300' : 'text-cyan-300'}`}>
                                            {item.section}
                                          </span>
                                          <label className="flex items-center gap-1.5 cursor-pointer select-none">
                                            <input
                                              type="checkbox"
                                              checked={isImplemented}
                                              onChange={(e) => {
                                                const checked = e.target.checked;
                                                setImplementedTips(prev => ({ ...prev, [key]: checked }));
                                                if (checked) {
                                                  showToast(`Dica da seção "${item.section}" marcada como implementada!`, "success");
                                                } else {
                                                  showToast(`Dica da seção "${item.section}" desmarcada.`, "info");
                                                }
                                              }}
                                              className="rounded border-slate-700 bg-obsidian text-emerald-400 accent-emerald-400 h-3.5 w-3.5 cursor-pointer"
                                            />
                                            <span className="text-[10px] font-bold text-slate-400 font-mono">Feito</span>
                                          </label>
                                        </div>
                                        <h5 className={`text-xs font-semibold mt-1.5 leading-snug ${isImplemented ? 'text-slate-500 line-through' : 'text-slate-100'}`}>
                                          {item.suggestion}
                                        </h5>
                                      </div>
                                      <div className={`rounded-lg p-2.5 text-[11px] font-mono transition-all border ${
                                        isImplemented
                                          ? "bg-emerald-500/5 border-emerald-500/20 text-slate-400"
                                          : "bg-obsidian border-slate-800 text-emerald-300"
                                      }`}>
                                        <span className="text-[9px] font-bold text-slate-500 block uppercase mb-1 font-sans">
                                          {isImplemented ? "✓ Exemplo Implementado:" : "Exemplo Prático:"}
                                        </span>
                                        {item.example}
                                      </div>
                                    </div>
                                  );
                                });
                              })()}
                            </div>
                          </div>

                        </div>
                      ) : (
                        <div className="p-8 text-center bg-obsidian/60 rounded-2xl border border-dashed border-slate-800">
                          <p className="text-sm text-slate-400">Nenhum dado de otimização disponível.</p>
                          <button
                            type="button"
                            onClick={() => fetchQuickTips(activeDomain.url, activeDomain.latestReport?.title, activeDomain.latestReport?.description)}
                            className="mt-3 btn-indigo-glow px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer transition-all"
                          >
                            Gerar Dicas com Gemini
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Meta Header Information */}
                    <div className="bento-card p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <h4 className="text-xs font-mono uppercase tracking-wider font-bold text-cyan-400 mb-3">Informações Metadados</h4>
                        <div className="space-y-3.5">
                          <div className="p-3.5 rounded-xl bg-obsidian/70 border border-slate-800/90">
                            <span className="text-[10px] font-mono uppercase text-slate-400 block mb-1">Título do Site (&lt;title&gt;)</span>
                            <span className="text-sm text-slate-100 font-semibold">{activeDomain.latestReport.title || "Não identificado"}</span>
                          </div>
                          <div className="p-3.5 rounded-xl bg-obsidian/70 border border-slate-800/90">
                            <span className="text-[10px] font-mono uppercase text-slate-400 block mb-1">Descrição Meta (meta description)</span>
                            <span className="text-xs text-slate-300 font-medium line-clamp-3 leading-relaxed">{activeDomain.latestReport.description || "Nenhuma meta descrição cadastrada!"}</span>
                          </div>
                        </div>
                      </div>

                      <div>
                        <h4 className="text-xs font-mono uppercase tracking-wider font-bold text-cyan-400 mb-3">Métricas de Tamanho & Rede</h4>
                        
                        <div className="space-y-3">
                          {/* Tamanho da Página */}
                          <div className="bg-obsidian/70 p-3.5 rounded-xl border border-slate-800/90">
                            <div className="flex items-center justify-between mb-1.5">
                              <span className="text-xs font-bold text-slate-200">Tamanho da Página</span>
                              <span className={`font-mono text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase ${
                                activeDomain.latestReport.performance.pageSizeKb <= 1500
                                  ? "bg-emerald-500/15 border-emerald-400/35 text-emerald-300"
                                  : activeDomain.latestReport.performance.pageSizeKb <= 3500
                                  ? "bg-amber-500/15 border-amber-400/35 text-amber-300"
                                  : "bg-rose-500/15 border-rose-500/35 text-rose-300"
                              }`}>
                                {activeDomain.latestReport.performance.pageSizeKb <= 1500 ? "Ideal" : activeDomain.latestReport.performance.pageSizeKb <= 3500 ? "Aceitável" : "Crítico"}
                              </span>
                            </div>
                            <div className="grid grid-cols-3 gap-2 text-center mt-2 pt-2 border-t border-slate-800 font-mono tabular-nums">
                              <div>
                                <span className="text-[9px] text-slate-500 block uppercase">Atual</span>
                                <span className="text-sm font-bold text-slate-100">{activeDomain.latestReport.performance.pageSizeKb} KB</span>
                              </div>
                              <div>
                                <span className="text-[9px] text-slate-500 block uppercase">Ideal</span>
                                <span className="text-xs font-semibold text-emerald-400">&lt; 1500 KB</span>
                              </div>
                              <div>
                                <span className="text-[9px] text-slate-500 block uppercase">Limite</span>
                                <span className="text-xs font-semibold text-amber-400">&lt; 3500 KB</span>
                              </div>
                            </div>
                          </div>

                          {/* Requisições HTTP */}
                          <div className="bg-obsidian/70 p-3.5 rounded-xl border border-slate-800/90">
                            <div className="flex items-center justify-between mb-1.5">
                              <span className="text-xs font-bold text-slate-200">Requisições HTTP</span>
                              <span className={`font-mono text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase ${
                                activeDomain.latestReport.performance.requestCount <= 40
                                  ? "bg-emerald-500/15 border-emerald-400/35 text-emerald-300"
                                  : activeDomain.latestReport.performance.requestCount <= 80
                                  ? "bg-amber-500/15 border-amber-400/35 text-amber-300"
                                  : "bg-rose-500/15 border-rose-500/35 text-rose-300"
                              }`}>
                                {activeDomain.latestReport.performance.requestCount <= 40 ? "Ideal" : activeDomain.latestReport.performance.requestCount <= 80 ? "Aceitável" : "Crítico"}
                              </span>
                            </div>
                            <div className="grid grid-cols-3 gap-2 text-center mt-2 pt-2 border-t border-slate-800 font-mono tabular-nums">
                              <div>
                                <span className="text-[9px] text-slate-500 block uppercase">Atual</span>
                                <span className="text-sm font-bold text-slate-100">{activeDomain.latestReport.performance.requestCount}</span>
                              </div>
                              <div>
                                <span className="text-[9px] text-slate-500 block uppercase">Ideal</span>
                                <span className="text-xs font-semibold text-emerald-400">&lt; 40</span>
                              </div>
                              <div>
                                <span className="text-[9px] text-slate-500 block uppercase">Limite</span>
                                <span className="text-xs font-semibold text-amber-400">&lt; 80</span>
                              </div>
                            </div>
                          </div>

                          {/* Tempo de Carregamento */}
                          <div className="bg-obsidian/70 p-3.5 rounded-xl border border-slate-800/90">
                            <div className="flex items-center justify-between mb-1.5">
                              <span className="text-xs font-bold text-slate-200">Tempo de Carregamento</span>
                              <span className={`font-mono text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase ${
                                activeDomain.latestReport.performance.loadTimeSeconds <= 2.0
                                  ? "bg-emerald-500/15 border-emerald-400/35 text-emerald-300"
                                  : activeDomain.latestReport.performance.loadTimeSeconds <= 4.5
                                  ? "bg-amber-500/15 border-amber-400/35 text-amber-300"
                                  : "bg-rose-500/15 border-rose-500/35 text-rose-300"
                              }`}>
                                {activeDomain.latestReport.performance.loadTimeSeconds <= 2.0 ? "Ideal" : activeDomain.latestReport.performance.loadTimeSeconds <= 4.5 ? "Aceitável" : "Crítico"}
                              </span>
                            </div>
                            <div className="grid grid-cols-3 gap-2 text-center mt-2 pt-2 border-t border-slate-800 font-mono tabular-nums">
                              <div>
                                <span className="text-[9px] text-slate-500 block uppercase">Atual</span>
                                <span className="text-sm font-bold text-slate-100">{activeDomain.latestReport.performance.loadTimeSeconds}s</span>
                              </div>
                              <div>
                                <span className="text-[9px] text-slate-500 block uppercase">Ideal</span>
                                <span className="text-xs font-semibold text-emerald-400">&lt; 2.0s</span>
                              </div>
                              <div>
                                <span className="text-[9px] text-slate-500 block uppercase">Limite</span>
                                <span className="text-xs font-semibold text-amber-400">&lt; 4.5s</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="mt-3 flex items-center gap-2 text-[11px] text-cyan-200 font-mono bg-cyan-500/10 px-3 py-1.5 rounded-lg border border-cyan-500/25">
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                          Metodologia: {activeDomain.latestReport.method}
                        </div>
                      </div>
                    </div>

                    {/* General Summary / Tips */}
                    <div className="bento-card p-6">
                      <h3 className="font-display text-base font-bold text-slate-100 mb-3.5 flex items-center gap-2">
                        <Info className="h-4 w-4 text-cyan-400" />
                        Próximos Passos Recomendados
                      </h3>
                      <ol className="space-y-2 text-xs text-slate-300 leading-relaxed">
                        {activeDomain.latestReport.generalSuggestions.map((tip, i) => (
                          <li key={i} className="flex items-start gap-2.5 p-2.5 rounded-xl bg-obsidian/65 border border-slate-800/80">
                            <span className="w-5 h-5 rounded-md bg-cyan-500/15 border border-cyan-400/30 text-cyan-300 font-mono text-[10px] font-bold flex items-center justify-center shrink-0">
                              {i + 1}
                            </span>
                            <span>{tip}</span>
                          </li>
                        ))}
                      </ol>
                    </div>
                  </>
                ) : (
                  <div className="bg-slate-950/40 p-12 text-center rounded-2xl border border-dashed border-slate-800">
                    <AlertTriangle className="h-12 w-12 text-slate-500 mx-auto mb-4" />
                    <p className="text-slate-300 font-medium">Nenhum relatório de auditoria gerado ainda para {activeDomain?.url}.</p>
                    <p className="text-slate-500 text-xs mt-1">Insira uma URL na barra superior e clique em Analisar para iniciar a primeira varredura.</p>
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: OPTIMIZATION PROGRESS HISTORY */}
            {activeTab === "history" && (
              <div className="flex flex-col gap-6 animate-fade-in">
                {activeDomain ? (
                  ((currentDomain: DomainProfile) => {
                    const filteredHistory = currentDomain.reportsHistory.filter(historyPoint => {
                      if (!historySearchQuery) return true;
                      const q = historySearchQuery.toLowerCase().trim();
                      const dateMatch = historyPoint.date.toLowerCase().includes(q);
                      const perfMatch = historyPoint.performance.toString().includes(q);
                      const accMatch = historyPoint.accessibility.toString().includes(q);
                      const seoMatch = historyPoint.seo.toString().includes(q);
                      const avg = Math.round((historyPoint.performance + historyPoint.accessibility + historyPoint.seo) / 3);
                      let status = "otimizável";
                      if (avg >= 90) status = "excelente";
                      else if (avg >= 70) status = "bom";
                      const statusMatch = status.includes(q) || "otimizavel".includes(q);
                      return dateMatch || perfMatch || accMatch || seoMatch || statusMatch;
                    });

                    return (
                      <>
                        {/* Search and Filter Bar */}
                        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                          <div className="flex-1 w-full relative">
                            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                            <input
                              type="text"
                              value={historySearchQuery}
                              onChange={(e) => setHistorySearchQuery(e.target.value)}
                              placeholder="Buscar por data (ex: 'Jul'), pontuação (ex: '96') ou status (ex: 'Excelente')..."
                              className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl pl-10 pr-10 py-2.5 text-xs text-slate-200 focus:outline-none transition-all placeholder:text-slate-600"
                            />
                            {historySearchQuery && (
                              <button
                                onClick={() => setHistorySearchQuery("")}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 text-xs font-bold font-mono px-1.5 py-0.5 rounded hover:bg-slate-800 cursor-pointer border-0"
                              >
                                ×
                              </button>
                            )}
                          </div>
                          
                          <div className="flex items-center gap-3 w-full sm:w-auto">
                            <button
                              onClick={handleExportHistoryJSON}
                              className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-850 hover:bg-slate-800 text-slate-200 border border-slate-750 rounded-xl text-xs font-semibold cursor-pointer transition-all w-full sm:w-auto justify-center"
                            >
                              <Download className="h-4 w-4 text-blue-400" />
                              Exportar JSON
                            </button>
                            
                            <div className="text-xs text-slate-400 shrink-0 font-medium hidden md:block">
                              {historySearchQuery ? (
                                <span>
                                  Mostrando <strong>{filteredHistory.length}</strong> de <strong>{currentDomain.reportsHistory.length}</strong>
                                </span>
                              ) : (
                                <span>
                                  Total: <strong>{currentDomain.reportsHistory.length}</strong> auditorias
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Historical interactive line chart */}
                        <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-6">
                          <div className="flex items-center justify-between mb-4">
                            <div>
                              <h3 className="text-lg font-bold text-white">Evolução de Pontuação do Domínio</h3>
                              <p className="text-xs text-slate-400">Progresso histórico das métricas de Desempenho, Acessibilidade e SEO</p>
                            </div>
                            <div className="flex items-center gap-4 text-xs font-mono">
                              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-blue-500"></span> Desempenho</span>
                              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-amber-500"></span> Acessibilidade</span>
                              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-emerald-500"></span> SEO</span>
                            </div>
                          </div>

                          <div className="h-80 w-full" id="history_chart_container">
                            {filteredHistory.length === 0 ? (
                              <div className="h-full flex items-center justify-center border border-dashed border-slate-800 rounded-xl text-xs text-slate-500">
                                Nenhum ponto histórico correspondente ao termo pesquisado.
                              </div>
                            ) : (
                              <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={filteredHistory}>
                                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                                  <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} />
                                  <YAxis domain={[0, 100]} stroke="#94a3b8" fontSize={11} />
                                  <Tooltip 
                                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px' }}
                                    labelStyle={{ color: '#94a3b8', fontSize: '11px', fontWeight: 'bold' }}
                                    itemStyle={{ fontSize: '12px' }}
                                  />
                                  <Line type="monotone" dataKey="performance" stroke="#3b82f6" strokeWidth={2.5} name="Desempenho" activeDot={{ r: 6 }} />
                                  <Line type="monotone" dataKey="accessibility" stroke="#f59e0b" strokeWidth={2.5} name="Acessibilidade" activeDot={{ r: 6 }} />
                                  <Line type="monotone" dataKey="seo" stroke="#10b981" strokeWidth={2.5} name="SEO" activeDot={{ r: 6 }} />
                                </LineChart>
                              </ResponsiveContainer>
                            )}
                          </div>
                        </div>

                        {/* Historical reports timeline */}
                        <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-6">
                          <h3 className="text-lg font-bold text-white mb-4">Registro de Histórico de Auditorias</h3>
                          <div className="overflow-x-auto">
                            {filteredHistory.length === 0 ? (
                              <div className="py-8 text-center text-xs text-slate-500 font-medium">
                                Nenhuma auditoria coincide com os filtros da busca.
                              </div>
                            ) : (
                              <table className="w-full text-left text-xs text-slate-300">
                                <thead>
                                  <tr className="border-b border-slate-800 text-slate-500 uppercase tracking-wider">
                                    <th className="py-3 px-4">Data / Hora</th>
                                    <th className="py-3 px-4 text-center">Desempenho</th>
                                    <th className="py-3 px-4 text-center">Acessibilidade</th>
                                    <th className="py-3 px-4 text-center">Boas Práticas SEO</th>
                                    <th className="py-3 px-4 text-center">Status Global</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {filteredHistory.map((historyPoint, index) => {
                                    const avg = Math.round((historyPoint.performance + historyPoint.accessibility + historyPoint.seo) / 3);
                                    return (
                                      <tr key={index} className="border-b border-slate-800/50 hover:bg-slate-900/30 transition-colors">
                                        <td className="py-3 px-4 font-medium text-slate-200">
                                          <div className="flex items-center gap-3">
                                            {/* Beautiful CSS miniature of the page's last audited screenshot */}
                                            <div className="w-14 h-10 rounded border border-slate-700 bg-slate-950 overflow-hidden relative shadow-sm shrink-0">
                                              {/* Fake browser bar */}
                                              <div className="bg-slate-900 h-2.5 w-full flex items-center px-1 gap-0.5 border-b border-slate-800">
                                                <span className="w-1 h-1 rounded-full bg-red-500 block"></span>
                                                <span className="w-1 h-1 rounded-full bg-yellow-500 block"></span>
                                                <span className="w-1 h-1 rounded-full bg-green-500 block"></span>
                                                <div className="bg-slate-950 rounded-sm h-1.5 flex-1 mx-1 flex items-center px-1">
                                                  <span className="text-[3.5px] text-slate-600 truncate font-mono scale-[0.8] block origin-left">{currentDomain.url}</span>
                                                </div>
                                              </div>
                                              {/* CSS Site Mock layout */}
                                              <div className="p-1 h-full flex flex-col gap-0.5 bg-slate-950">
                                                <div className="flex justify-between items-center">
                                                  <div className="h-1 w-3 bg-blue-500/80 rounded-[1px]"></div>
                                                  <div className="h-0.5 w-1 bg-slate-700 rounded-[1px]"></div>
                                                </div>
                                                {/* Hero banner representing screenshot style */}
                                                <div className="h-2.5 w-full bg-linear-to-r from-blue-900/40 via-purple-900/40 to-slate-900/40 rounded-[1px] flex items-center justify-center p-0.5 border border-slate-800/30">
                                                  <span className="text-[4px] font-bold text-slate-400 font-mono scale-[0.7]">{avg}</span>
                                                </div>
                                                <div className="grid grid-cols-3 gap-0.5 mt-auto pb-2">
                                                  <div className="h-0.5 bg-emerald-500/30 rounded-[1px]"></div>
                                                  <div className="h-0.5 bg-blue-500/30 rounded-[1px]"></div>
                                                  <div className="h-0.5 bg-amber-500/30 rounded-[1px]"></div>
                                                </div>
                                              </div>
                                            </div>
                                            <div>
                                              <span className="block text-slate-200 font-semibold">{historyPoint.date}</span>
                                              <span className="block text-[10px] text-slate-500 font-medium">Captura de tela simulada</span>
                                            </div>
                                          </div>
                                        </td>
                                        <td className="py-3.5 px-4 text-center">
                                          <span className={`px-2 py-1 rounded-md text-[11px] font-mono font-bold ${getScoreColorClass(historyPoint.performance)}`}>
                                            {historyPoint.performance}
                                          </span>
                                        </td>
                                        <td className="py-3.5 px-4 text-center">
                                          <span className={`px-2 py-1 rounded-md text-[11px] font-mono font-bold ${getScoreColorClass(historyPoint.accessibility)}`}>
                                            {historyPoint.accessibility}
                                          </span>
                                        </td>
                                        <td className="py-3.5 px-4 text-center">
                                          <span className={`px-2 py-1 rounded-md text-[11px] font-mono font-bold ${getScoreColorClass(historyPoint.seo)}`}>
                                            {historyPoint.seo}
                                          </span>
                                        </td>
                                        <td className="py-3.5 px-4 text-center">
                                          {avg >= 90 ? (
                                            <span className="text-emerald-500 text-xs font-semibold">Excelente</span>
                                          ) : avg >= 70 ? (
                                            <span className="text-blue-400 text-xs font-semibold">Bom</span>
                                          ) : (
                                            <span className="text-amber-500 text-xs font-bold">Otimizável</span>
                                          )}
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            )}
                          </div>
                        </div>
                      </>
                    );
                  })(activeDomain)
                ) : (
                  <p className="text-slate-400">Nenhum domínio cadastrado para histórico.</p>
                )}
              </div>
            )}

            {/* TAB 3: COMPARISON DASHBOARD (Lazy Loaded) */}
            {activeTab === "compare" && (
              <Suspense fallback={<TabSkeletonLoader label="Carregando Comparador de Domínios..." />}>
                <CompareDomainsTab
                  domains={domains}
                  compareSourceId={compareSourceId}
                  compareTargetId={compareTargetId}
                  setCompareSourceId={setCompareSourceId}
                  setCompareTargetId={setCompareTargetId}
                  handleExportComparePDF={handleExportComparePDF}
                  isDarkMode={isDarkMode}
                />
              </Suspense>
            )}

            {/* TAB 4: GOOGLE ANALYTICS & SEARCH CONSOLE INTEGRATIONS */}
            {activeTab === "integrations" && (
              <div className="flex flex-col gap-6 animate-fade-in">
                {/* Integration Credentials Setup Panel */}
                <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h3 className="text-lg font-bold text-white flex items-center gap-2">
                        <BarChart3 className="h-5 w-5 text-blue-500" />
                        Conectar Google APIs
                      </h3>
                      <p className="text-xs text-slate-400 mt-0.5">Vincule o Google Analytics & Google Search Console para monitorar tráfego e palavras-chave orgânicas.</p>
                    </div>

                    {/* Mode Toggle Controls */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setIsSandbox(true)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                          isSandbox 
                            ? "bg-slate-800 text-white border-slate-700" 
                            : "bg-transparent text-slate-400 border-transparent hover:text-slate-200"
                        }`}
                      >
                        Modo Demonstração (Sandbox)
                      </button>
                      <button
                        onClick={() => {
                          if (!googleAccessToken) {
                            handleConnectGoogle();
                          } else {
                            setIsSandbox(false);
                          }
                        }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                          !isSandbox 
                            ? "bg-blue-600 text-white border-blue-500" 
                            : "bg-transparent text-slate-400 border-transparent hover:text-slate-200"
                        }`}
                      >
                        Integração API Real
                      </button>
                    </div>
                  </div>

                  {/* Connection Status Indicator */}
                  <div className="mt-6 p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/60 border-slate-800">
                    <div className="flex items-center gap-3">
                      {googleAccessToken ? (
                        <div className="bg-emerald-500/10 text-emerald-400 p-2 rounded-lg border border-emerald-500/20">
                          <Check className="h-5 w-5" />
                        </div>
                      ) : (
                        <div className="bg-slate-800 text-slate-400 p-2 rounded-lg">
                          <LogIn className="h-5 w-5" />
                        </div>
                      )}
                      <div>
                        <span className="text-xs text-slate-500 block">Status de Conexão</span>
                        <span className="text-sm font-semibold text-slate-200">
                          {googleAccessToken 
                            ? `Conectado como: ${googleEmail}` 
                            : isSandbox 
                              ? "Demonstração (Sandbox Ativa - Exibindo dados de exemplo)" 
                              : "Conta Google não integrada"}
                        </span>
                      </div>
                    </div>

                    <div>
                      {googleAccessToken ? (
                        <button
                          onClick={handleDisconnectGoogle}
                          className="px-4 py-2 bg-red-950/40 text-red-400 border border-red-900/40 rounded-xl text-xs font-semibold hover:bg-red-900/20 transition-all cursor-pointer"
                        >
                          Desconectar APIs Google
                        </button>
                      ) : (
                        <button
                          onClick={handleConnectGoogle}
                          className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer"
                        >
                          <LogIn className="h-4 w-4" />
                          Conectar Conta Google
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Developer Credentials Help box */}
                  <div className="mt-4 p-3 bg-slate-900/30 border border-slate-800 rounded-lg text-[11px] text-slate-400 flex items-start gap-2.5">
                    <Info className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
                    <div>
                      <strong>Nota de Integração Real:</strong> Para utilizar a conexão de produção em seu domínio real, configure as variáveis <code className="bg-slate-800 px-1 py-0.5 rounded text-slate-200">GOOGLE_CLIENT_ID</code> e <code className="bg-slate-800 px-1 py-0.5 rounded text-slate-200">GOOGLE_CLIENT_SECRET</code> no painel de <strong>Settings &gt; Secrets</strong> do AI Studio. O redirecionador de OAuth está configurado automaticamente para o domínio do aplicativo.
                    </div>
                  </div>
                </div>

                {isLoadingIntegrations ? (
                  <div className="text-center py-12">
                    <RefreshCw className="h-8 w-8 text-blue-500 animate-spin mx-auto mb-3" />
                    <p className="text-xs text-slate-400">Buscando relatórios de tráfego orgânico do Google...</p>
                  </div>
                ) : (
                  <>
                    {/* Google Analytics Traffic Trend Area Chart */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                      
                      {/* Left: Interactive GA Traffic Area Chart */}
                      <div className="lg:col-span-2 bg-slate-950/60 border border-slate-800 rounded-2xl p-6">
                        <div className="flex items-center justify-between mb-4">
                          <div>
                            <h3 className="text-base font-bold text-white">Visualizações de Páginas & Sessões</h3>
                            <p className="text-xs text-slate-400">Tráfego geral medido pelo Google Analytics nos últimos 30 dias</p>
                          </div>
                          <div className="flex items-center gap-3 text-[10px] font-mono">
                            <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded bg-blue-500/80"></span> Pageviews</span>
                            <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded bg-emerald-500/80"></span> Sessões</span>
                          </div>
                        </div>

                        <div className="h-64 w-full">
                          <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={analyticsData}>
                              <defs>
                                <linearGradient id="colorPageviews" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                                </linearGradient>
                                <linearGradient id="colorSessions" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                                  <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                                </linearGradient>
                              </defs>
                              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                              <XAxis dataKey="date" stroke="#94a3b8" fontSize={10} />
                              <YAxis stroke="#94a3b8" fontSize={10} />
                              <Tooltip 
                                contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px' }}
                                labelStyle={{ color: '#94a3b8', fontSize: '10px', fontWeight: 'bold' }}
                                itemStyle={{ fontSize: '11px' }}
                              />
                              <Area type="monotone" dataKey="pageviews" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorPageviews)" name="Pageviews" />
                              <Area type="monotone" dataKey="sessions" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorSessions)" name="Sessões" />
                            </AreaChart>
                          </ResponsiveContainer>
                        </div>
                      </div>

                      {/* Right: Traffic Indicators Grid */}
                      <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between gap-4">
                        <h3 className="text-base font-bold text-white">Métricas de Engajamento</h3>
                        
                        <div className="space-y-4 flex-1 flex flex-col justify-center">
                          <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-xl flex items-center justify-between">
                            <div>
                              <span className="text-[10px] text-slate-500 uppercase tracking-wide font-mono block">Usuários Ativos</span>
                              <span className="text-xl font-bold text-white mt-0.5 block">14,800</span>
                            </div>
                            <span className="text-xs text-emerald-500 font-mono font-bold">+18.4%</span>
                          </div>

                          <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-xl flex items-center justify-between">
                            <div>
                              <span className="text-[10px] text-slate-500 uppercase tracking-wide font-mono block">Duração da Sessão</span>
                              <span className="text-xl font-bold text-white mt-0.5 block">2m 45s</span>
                            </div>
                            <span className="text-xs text-emerald-500 font-mono font-bold">+4.1%</span>
                          </div>

                          <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-xl flex items-center justify-between">
                            <div>
                              <span className="text-[10px] text-slate-500 uppercase tracking-wide font-mono block">Taxa de Rejeição</span>
                              <span className="text-xl font-bold text-white mt-0.5 block">33.4%</span>
                            </div>
                            <span className="text-xs text-emerald-500 font-mono font-bold">-2.5%</span>
                          </div>
                        </div>
                        
                        <span className="text-[9px] text-slate-500 text-center font-mono">Última atualização: 30 minutos atrás</span>
                      </div>

                    </div>

                    {/* Google Search Console - Key SEO query terms & ranking */}
                    <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-6">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                        <div>
                          <h3 className="text-base font-bold text-white">Palavras-chave Orgânicas Mais Relevantes</h3>
                          <p className="text-xs text-slate-400">Termos de pesquisa mais clicados no Google que trazem tráfego ao site</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={handleExportCSV}
                            className="bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
                          >
                            <Download className="h-3 w-3" />
                            Baixar CSV
                          </button>
                          <button
                            onClick={handleExportXLSX}
                            className="bg-emerald-600 hover:bg-emerald-500 text-white border border-emerald-500 px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm shadow-emerald-500/10"
                          >
                            <FileText className="h-3 w-3" />
                            Baixar Excel (.xlsx)
                          </button>
                        </div>
                      </div>

                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs text-slate-300">
                          <thead>
                            <tr className="border-b border-slate-800 text-slate-500 uppercase tracking-wider">
                              <th className="py-2.5 px-4">Palavra-Chave (Google)</th>
                              <th className="py-2.5 px-4 text-center">Cliques</th>
                              <th className="py-2.5 px-4 text-center">Impressões</th>
                              <th className="py-2.5 px-4 text-center">CTR (%)</th>
                              <th className="py-2.5 px-4 text-center">Posição Média</th>
                            </tr>
                          </thead>
                          <tbody>
                            {searchQueries.map((row, index) => (
                              <tr key={index} className="border-b border-slate-800/40 hover:bg-slate-900/20 transition-colors">
                                <td className="py-3 px-4 font-semibold text-slate-200">{row.keys.join(" ")}</td>
                                <td className="py-3 px-4 text-center font-mono font-medium text-blue-400">{row.clicks}</td>
                                <td className="py-3 px-4 text-center font-mono text-slate-400">{row.impressions}</td>
                                <td className="py-3 px-4 text-center font-mono font-medium text-emerald-500">{row.ctr}%</td>
                                <td className="py-3 px-4 text-center font-mono text-slate-200">{row.position}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </>
                )}

                {/* DEDICATED BASIC SECURITY SCANNER COMPONENT */}
                <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-6 mt-2">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-slate-800/80">
                    <div>
                      <h3 className="text-lg font-bold text-white flex items-center gap-2">
                        <ShieldAlert className="h-5 w-5 text-amber-500" />
                        Scanner de Segurança Básica & Cabeçalhos
                      </h3>
                      <p className="text-xs text-slate-400 mt-1 font-sans">
                        Analise o domínio ativo para verificar a presença de cabeçalhos de segurança HTTP críticos e potenciais vulnerabilidades de XSS em URLs.
                      </p>
                    </div>
                    <button
                      onClick={handleSecurityScan}
                      disabled={isScanningSecurity || !activeDomain?.url}
                      className={`px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer shadow-md ${
                        isScanningSecurity
                          ? "bg-slate-800 text-slate-400 border border-slate-700 cursor-not-allowed"
                          : "bg-linear-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white shadow-amber-900/10"
                      }`}
                    >
                      {isScanningSecurity ? (
                        <>
                          <RefreshCw className="h-4 w-4 animate-spin" />
                          Varrendo Domínio...
                        </>
                      ) : (
                        <>
                          <Play className="h-3.5 w-3.5" />
                          Executar Scanner de Segurança
                        </>
                      )}
                    </button>
                  </div>

                  {!securityScanResult && !isScanningSecurity && (
                    <div className="text-center py-10 px-4">
                      <Shield className="h-12 w-12 text-slate-600 mx-auto mb-3 opacity-40" />
                      <p className="text-sm font-semibold text-slate-400">Nenhuma varredura de segurança realizada para este domínio ainda.</p>
                      <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                        Clique no botão acima para iniciar uma análise instantânea dos cabeçalhos HTTP e de injeções de script no domínio <span className="text-amber-500 font-mono font-medium">{activeDomain?.url || "carregando..."}</span>.
                      </p>
                    </div>
                  )}

                  {isScanningSecurity && (
                    <div className="text-center py-12 px-4 flex flex-col items-center justify-center">
                      <div className="relative flex items-center justify-center mb-4">
                        <div className="absolute w-16 h-16 rounded-full border-4 border-amber-500/10 animate-ping"></div>
                        <div className="w-12 h-12 rounded-full border-4 border-t-amber-500 border-r-transparent border-slate-800 animate-spin flex items-center justify-center">
                          <Shield className="h-5 w-5 text-amber-500" />
                        </div>
                      </div>
                      <h4 className="text-sm font-bold text-slate-200">Analisando Domínio: {activeDomain?.url}</h4>
                      <p className="text-xs text-slate-400 mt-1 max-w-sm">
                        O backend está realizando requisições HTTP, verificando flags de cabeçalho, analisando sinks de DOM de JavaScript e testando payloads reflexivos na URL...
                      </p>
                    </div>
                  )}

                  {securityScanResult && !isScanningSecurity && (
                    <div className="mt-6 flex flex-col gap-6 animate-fade-in">
                      {/* Metric Scores */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        {/* Overall Score */}
                        <div className="bg-slate-900/40 border border-slate-800/80 rounded-xl p-4 flex items-center gap-4">
                          <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg font-mono border-2 ${
                            securityScanResult.score >= 90
                              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                              : securityScanResult.score >= 70
                                ? "bg-amber-500/10 text-amber-400 border-amber-500/30"
                                : "bg-red-500/10 text-red-400 border-red-500/30"
                          }`}>
                            {securityScanResult.score}
                          </div>
                          <div>
                            <span className="text-[10px] uppercase tracking-wider text-slate-500 block font-semibold">Nota Geral</span>
                            <span className="text-sm font-bold text-slate-200">
                              {securityScanResult.score >= 90
                                ? "A - Excelente"
                                : securityScanResult.score >= 70
                                  ? "B - Moderado"
                                  : "F - Crítico"}
                            </span>
                          </div>
                        </div>

                        {/* Headers Score */}
                        <div className="bg-slate-900/40 border border-slate-800/80 rounded-xl p-4 flex items-center gap-4">
                          <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg font-mono border-2 ${
                            securityScanResult.headersScore >= 80
                              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                              : securityScanResult.headersScore >= 50
                                ? "bg-amber-500/10 text-amber-400 border-amber-500/30"
                                : "bg-red-500/10 text-red-400 border-red-500/30"
                          }`}>
                            {securityScanResult.headersScore}
                          </div>
                          <div>
                            <span className="text-[10px] uppercase tracking-wider text-slate-500 block font-semibold">Cabeçalhos HTTP</span>
                            <span className="text-xs text-slate-400">Proteção de infraestrutura</span>
                          </div>
                        </div>

                        {/* XSS Prevention Score */}
                        <div className="bg-slate-900/40 border border-slate-800/80 rounded-xl p-4 flex items-center gap-4">
                          <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg font-mono border-2 ${
                            securityScanResult.xssScore >= 90
                              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                              : securityScanResult.xssScore >= 70
                                ? "bg-amber-500/10 text-amber-400 border-amber-500/30"
                                : "bg-red-500/10 text-red-400 border-red-500/30"
                          }`}>
                            {securityScanResult.xssScore}
                          </div>
                          <div>
                            <span className="text-[10px] uppercase tracking-wider text-slate-500 block font-semibold">Prevenção de XSS</span>
                            <span className="text-xs text-slate-400">Sanitização de script/URL</span>
                          </div>
                        </div>
                      </div>

                      {/* Header Results & XSS Checks Grid */}
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 font-sans">
                        {/* Security Headers Panel */}
                        <div className="bg-slate-900/20 border border-slate-850 rounded-xl p-4 flex flex-col gap-4">
                          <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-800/50 pb-2.5">
                            <Lock className="h-3.5 w-3.5 text-blue-400" />
                            Status dos Cabeçalhos de Segurança
                          </h4>

                          <div className="flex flex-col gap-3">
                            {securityScanResult.headers.map((check, idx) => (
                              <div key={idx} className="bg-slate-900/50 border border-slate-800/40 rounded-lg p-3 hover:border-slate-800 transition-colors">
                                <div className="flex items-center justify-between gap-2">
                                  <span className="text-xs font-bold font-mono text-slate-200">{check.name}</span>
                                  <span className={`px-2 py-0.5 rounded text-[10px] font-semibold tracking-wide ${
                                    check.status === "present"
                                      ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                      : "bg-red-500/10 text-red-400 border border-red-500/20"
                                  }`}>
                                    {check.status === "present" ? "Presente" : "Ausente"}
                                  </span>
                                </div>
                                
                                {check.status === "present" && (
                                  <div className="mt-1.5 bg-slate-950 px-2 py-1.5 rounded border border-slate-800/50 font-mono text-[10px] text-slate-400 truncate">
                                    {check.value}
                                  </div>
                                )}

                                <p className="text-[11px] text-slate-400 mt-1.5 leading-relaxed">{check.description}</p>
                                
                                {check.status !== "present" && (
                                  <div className="mt-2 text-[10px] bg-amber-950/20 border border-amber-900/30 text-amber-300 p-2 rounded leading-relaxed">
                                    <span className="font-bold text-amber-200">Recomendação:</span> {check.recommendation}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* XSS URL Analysis Panel */}
                        <div className="bg-slate-900/20 border border-slate-850 rounded-xl p-4 flex flex-col gap-4">
                          <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-800/50 pb-2.5">
                            <ShieldAlert className="h-3.5 w-3.5 text-amber-400" />
                            Análise de Vulnerabilidade de XSS na URL
                          </h4>

                          <div className="flex flex-col gap-4">
                            {securityScanResult.xssChecks.map((check, idx) => (
                              <div key={idx} className="bg-slate-900/50 border border-slate-800/40 rounded-lg p-3 hover:border-slate-800 transition-colors">
                                <div className="flex items-center justify-between gap-2">
                                  <span className="text-xs font-bold text-slate-200">{check.name}</span>
                                  <span className={`px-2 py-0.5 rounded text-[10px] font-semibold tracking-wide ${
                                    check.status === "passed"
                                      ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                      : check.status === "warning"
                                        ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                                        : "bg-red-500/10 text-red-400 border-red-500/20"
                                  }`}>
                                    {check.status === "passed" ? "Aprovado" : check.status === "warning" ? "Aviso" : "Falhou"}
                                  </span>
                                </div>

                                <p className="text-[11px] text-slate-400 mt-1.5 leading-relaxed">{check.description}</p>
                                <p className="text-[11px] font-medium text-slate-300 mt-1">{check.detail}</p>
                                
                                <div className="mt-2 bg-slate-950 px-2 py-1.5 rounded border border-slate-850 text-[10px] font-mono text-slate-500">
                                  <span className="text-slate-400 font-semibold font-sans">Evidência:</span> {check.evidence}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Remediation Panel */}
                      <div className="bg-slate-900/30 border border-slate-850 rounded-xl p-5 mt-2 font-sans">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-800/60 mb-4">
                          <div>
                            <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                              <Settings className="h-3.5 w-3.5 text-blue-400" />
                              Guia de Implementação & Correções Rápidas
                            </h4>
                            <p className="text-[11px] text-slate-500 mt-0.5">Adicione as configurações abaixo no seu servidor para sanar as vulnerabilidades encontradas.</p>
                          </div>

                          {/* Remediation Platform Selector Tabs */}
                          <div className="flex bg-slate-900 p-1 rounded-lg border border-slate-800 self-start sm:self-center">
                            {(["express", "nginx", "apache"] as const).map(tab => (
                              <button
                                key={tab}
                                onClick={() => setRemediationTab(tab)}
                                className={`px-2.5 py-1 rounded-md text-[10px] font-semibold uppercase cursor-pointer transition-all ${
                                  remediationTab === tab
                                    ? "bg-blue-600 text-white"
                                    : "text-slate-400 hover:text-slate-200"
                                }`}
                              >
                                {tab}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Code block pre area */}
                        <div className="relative">
                          <pre className="bg-slate-950 p-4 rounded-xl border border-slate-850 font-mono text-[10.5px] text-slate-300 overflow-x-auto max-h-70 leading-relaxed">
                            {securityScanResult.remediation[remediationTab]}
                          </pre>
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(securityScanResult.remediation[remediationTab]);
                              showToast("Código de remediação copiado!", "success");
                            }}
                            className="absolute top-3 right-3 bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-750 hover:border-slate-700 p-1.5 rounded-lg transition-all cursor-pointer"
                            title="Copiar código"
                          >
                            <Copy className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 5: AUTOMATED MONTHLY REPORTS SENT BY EMAIL */}
            {activeTab === "email" && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fade-in">
                
                {/* Email Form Configuration Panel */}
                <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-6 flex flex-col gap-5 justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                      <Mail className="h-5 w-5 text-blue-500" />
                      Relatórios de E-mail Automáticos
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">Configure o agendamento de relatórios de auditoria automatizados mensais enviados diretamente para seu e-mail corporativo.</p>
                  </div>

                  <form onSubmit={handleScheduleEmail} className="space-y-4">
                    <div>
                      <label className="text-xs font-semibold text-slate-400 block mb-1.5">Endereço de E-mail de Destino</label>
                      <input
                        type="email"
                        required
                        value={emailConfig.email}
                        onChange={(e) => setEmailConfig(prev => ({ ...prev, email: e.target.value }))}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent transition-all"
                        placeholder="nome@empresa.com"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-slate-400 block mb-1.5">Assunto Customizado do E-mail</label>
                      <input
                        type="text"
                        value={emailConfig.subject}
                        onChange={(e) => setEmailConfig(prev => ({ ...prev, subject: e.target.value }))}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent transition-all"
                        placeholder="Ex: Acompanhamento de Otimizações de SEO"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-slate-400 block mb-1.5">Nota / Comentário Customizado</label>
                      <textarea
                        value={emailConfig.customNote}
                        onChange={(e) => setEmailConfig(prev => ({ ...prev, customNote: e.target.value }))}
                        rows={2}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent transition-all placeholder:text-slate-600 resize-none"
                        placeholder="Adicione um comentário ou nota técnica para o e-mail..."
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-semibold text-slate-400 block mb-1.5">Dia de Envio Mensal</label>
                        <select
                          value={emailConfig.reportDay}
                          onChange={(e) => setEmailConfig(prev => ({ ...prev, reportDay: parseInt(e.target.value, 10) }))}
                          className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none cursor-pointer"
                        >
                          {Array.from({ length: 28 }, (_, i) => i + 1).map(day => (
                            <option key={day} value={day}>Todo dia {day}</option>
                          ))}
                        </select>
                      </div>
                      
                      <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-2.5 flex flex-col justify-center">
                        <span className="text-[9px] text-slate-500 font-mono uppercase block">Próxima Execução</span>
                        <span className="text-[11px] font-semibold text-emerald-400 mt-1">
                          {getNextExecutionDate(emailConfig.reportDay)}
                        </span>
                        <span className="text-[9px] text-slate-500 mt-0.5">Status: Agendado ✔</span>
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-slate-400 block mb-1.5">Periodicidade de Análise</label>
                      <select
                        value={emailConfig.frequency}
                        onChange={(e) => setEmailConfig(prev => ({ ...prev, frequency: e.target.value }))}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none cursor-pointer"
                      >
                        <option value="monthly">Mensal Automático (Recomendado)</option>
                        <option value="weekly">Semanal de Desempenho</option>
                      </select>
                    </div>

                    <div>
                      <span className="text-xs font-semibold text-slate-400 block mb-2">Módulos para Incluir no Relatório</span>
                      <div className="space-y-2 pl-1">
                        <label className="flex items-center gap-2.5 text-xs text-slate-300 font-medium cursor-pointer">
                          <input
                            type="checkbox"
                            checked={emailConfig.performanceEnabled}
                            onChange={(e) => setEmailConfig(prev => ({ ...prev, performanceEnabled: e.target.checked }))}
                            className="rounded bg-slate-900 border-slate-700 text-blue-600 focus:ring-0 focus:ring-offset-0 h-4 w-4"
                          />
                          Auditoria de Desempenho (Core Web Vitals)
                        </label>
                        <label className="flex items-center gap-2.5 text-xs text-slate-300 font-medium cursor-pointer">
                          <input
                            type="checkbox"
                            checked={emailConfig.accessibilityEnabled}
                            onChange={(e) => setEmailConfig(prev => ({ ...prev, accessibilityEnabled: e.target.checked }))}
                            className="rounded bg-slate-900 border-slate-700 text-blue-600 focus:ring-0 focus:ring-offset-0 h-4 w-4"
                          />
                          Auditoria de Acessibilidade (WCAG)
                        </label>
                        <label className="flex items-center gap-2.5 text-xs text-slate-300 font-medium cursor-pointer">
                          <input
                            type="checkbox"
                            checked={emailConfig.seoEnabled}
                            onChange={(e) => setEmailConfig(prev => ({ ...prev, seoEnabled: e.target.checked }))}
                            className="rounded bg-slate-900 border-slate-700 text-blue-600 focus:ring-0 focus:ring-offset-0 h-4 w-4"
                          />
                          Boas Práticas de SEO & Tags de Busca
                        </label>
                      </div>
                    </div>

                    {/* Alertas de Queda de Pontuação por Dispositivo (GSC) */}
                    <div className="border-t border-slate-800 pt-4 mt-2">
                      <label className="flex items-center gap-2.5 text-xs font-bold text-slate-300 mb-2 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={emailConfig.alertOnDrop}
                          onChange={(e) => setEmailConfig(prev => ({ ...prev, alertOnDrop: e.target.checked }))}
                          className="rounded bg-slate-900 border-slate-700 text-blue-600 focus:ring-0 focus:ring-offset-0 h-4 w-4"
                        />
                        <span className="flex items-center gap-1.5">
                          <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                          Habilitar Alertas de Queda de Pontuação (Google Search Console)
                        </span>
                      </label>
                      
                      {emailConfig.alertOnDrop && (
                        <div className="grid grid-cols-2 gap-4 mt-3 pl-6 animate-fade-in">
                          <div>
                            <label className="text-[11px] font-semibold text-slate-400 block mb-1">Dispositivo Móvel (Mobile)</label>
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] text-slate-500 font-mono">Mínimo:</span>
                              <input
                                type="number"
                                min="0"
                                max="100"
                                value={emailConfig.alertThresholdMobile}
                                onChange={(e) => setEmailConfig(prev => ({ ...prev, alertThresholdMobile: parseInt(e.target.value, 10) || 0 }))}
                                className="w-16 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white text-center font-mono focus:outline-none focus:ring-1 focus:ring-blue-500"
                              />
                              <span className="text-[11px] text-slate-500">pontos</span>
                            </div>
                          </div>
                          <div>
                            <label className="text-[11px] font-semibold text-slate-400 block mb-1">Computador (Desktop)</label>
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] text-slate-500 font-mono">Mínimo:</span>
                              <input
                                type="number"
                                min="0"
                                max="100"
                                value={emailConfig.alertThresholdDesktop}
                                onChange={(e) => setEmailConfig(prev => ({ ...prev, alertThresholdDesktop: parseInt(e.target.value, 10) || 0 }))}
                                className="w-16 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white text-center font-mono focus:outline-none focus:ring-1 focus:ring-blue-500"
                              />
                              <span className="text-[11px] text-slate-500">pontos</span>
                            </div>
                          </div>
                          <p className="col-span-2 text-[10px] text-slate-500 italic leading-relaxed">
                            * O Google Search Console segmenta os dados de experiência de página e Core Web Vitals por tipo de dispositivo. Você receberá um alerta imediato caso os limites definidos sejam violados em novos relatórios consolidados.
                          </p>
                        </div>
                      )}
                    </div>

                    <button
                      type="submit"
                      disabled={isSendingEmail}
                      className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 text-white py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer select-none"
                    >
                      {isSendingEmail ? (
                        <RefreshCw className="h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                      Salvar Agendamento & Disparar Teste
                    </button>
                  </form>

                  {emailSentSuccess && (
                    <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-3 rounded-xl text-xs flex items-center gap-2 animate-fade-in">
                      <CheckCircle2 className="h-4 w-4 shrink-0" />
                      <span>Agendamento ativo! Disparamos um e-mail de simulação para visualização ao lado.</span>
                    </div>
                  )}
                </div>

                {/* Live Responsive Email Preview Box */}
                <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-6 flex flex-col h-130">
                  <div className="mb-4">
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      <Globe className="h-4 w-4 text-purple-500" />
                      Visualização do E-mail Enviado
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">Veja o design e conteúdo exato do relatório HTML compilado recebido pelo usuário.</p>
                  </div>

                  <div className="flex-1 bg-slate-900 border border-slate-800 rounded-xl overflow-hidden flex flex-col">
                    {/* Fake Email client header bar */}
                    <div className="bg-slate-950/50 border-b border-slate-800 p-3 flex flex-col gap-1.5 text-xs">
                      <div className="flex items-center justify-between text-slate-500">
                        <span><strong>De:</strong> relatorios@siteanalyzer.com.br</span>
                        <span className="font-mono text-[10px]">Hoje, 11:05</span>
                      </div>
                      <div className="text-slate-200">
                        <strong>Para:</strong> {emailConfig.email}
                      </div>
                      <div className="text-slate-300 font-semibold truncate mt-0.5">
                        Subject: {emailConfig.subject || `Relatório Mensal de Auditoria SEO & Performance - ${activeDomain?.url || "meusite.com.br"}`}
                      </div>
                    </div>

                    {/* Email preview render frame */}
                    <div className="flex-1 overflow-y-auto p-4 bg-slate-100">
                      {emailPreviewHtml ? (
                        <div dangerouslySetInnerHTML={{ __html: emailPreviewHtml }} />
                      ) : (
                        <div className="h-full flex flex-col items-center justify-center text-center text-slate-500 gap-3 py-12">
                          <Mail className="h-10 w-10 text-slate-600" />
                          <div>
                            <p className="text-xs font-semibold text-slate-600">Nenhum e-mail disparado ainda.</p>
                            <p className="text-[10px] text-slate-400 mt-1">Preencha o formulário ao lado e salve para gerar o preview do relatório HTML.</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

              </div>
            )}

            {/* TAB 6: ADMIN MAINTENANCE PANEL */}
            {activeTab === "maintenance" && sessionUser?.role === "admin" && (
              <div className="flex flex-col gap-6 animate-fade-in">
                
                {/* 1. Metric Cards Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bento-card p-5 flex items-center gap-4">
                    <div className="p-3 bg-cyan-500/15 border border-cyan-400/30 text-cyan-400 rounded-xl">
                      <Shield className="h-5 w-5" />
                    </div>
                    <div>
                      <span className="text-[10px] font-mono text-slate-400 uppercase font-semibold tracking-wider block">Status do App</span>
                      <span className="text-sm font-bold text-slate-100 block mt-0.5">
                        {isMaintenanceMode ? "Em Manutenção" : "100% Operacional"}
                      </span>
                    </div>
                  </div>

                  <div className="bento-card p-5 flex items-center gap-4">
                    <div className="p-3 bg-emerald-500/15 border border-emerald-400/30 text-emerald-400 rounded-xl">
                      <Globe className="h-5 w-5" />
                    </div>
                    <div>
                      <span className="text-[10px] font-mono text-slate-400 uppercase font-semibold tracking-wider block">Domínios</span>
                      <span className="text-lg font-mono tabular-nums font-bold text-slate-100 block mt-0.5">
                        {domains.length} Cadastrados
                      </span>
                    </div>
                  </div>

                  <div className="bento-card p-5 flex items-center gap-4">
                    <div className="p-3 bg-violet-500/15 border border-violet-400/30 text-violet-400 rounded-xl">
                      <TrendingUp className="h-5 w-5" />
                    </div>
                    <div>
                      <span className="text-[10px] font-mono text-slate-400 uppercase font-semibold tracking-wider block">Média SEO Global</span>
                      <span className="text-lg font-mono tabular-nums font-bold text-slate-100 block mt-0.5">
                        {(() => {
                          const validReports = domains.map(d => d.latestReport?.scores?.seo).filter(s => s !== undefined) as number[];
                          if (validReports.length === 0) return "N/A";
                          const avg = validReports.reduce((acc, curr) => acc + curr, 0) / validReports.length;
                          return `${Math.round(avg)} pts`;
                        })()}
                      </span>
                    </div>
                  </div>

                  <div className="bento-card p-5 flex items-center gap-4">
                    <div className="p-3 bg-amber-500/15 border border-amber-400/30 text-amber-400 rounded-xl">
                      <FileText className="h-5 w-5" />
                    </div>
                    <div>
                      <span className="text-[10px] font-mono text-slate-400 uppercase font-semibold tracking-wider block">Histórico Total</span>
                      <span className="text-lg font-mono tabular-nums font-bold text-slate-100 block mt-0.5">
                        {domains.reduce((acc, d) => acc + (d.reportsHistory?.length || 0), 0)} Registros
                      </span>
                    </div>
                  </div>
                </div>

                {/* 2. Simulator & Globals Controls card */}
                <div className="bento-card p-6">
                  <h3 className="text-xs font-mono font-bold text-cyan-400 uppercase tracking-wider mb-4 border-b border-slate-800 pb-2.5">
                    Controles de Simulação & Parâmetros do Sistema
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="flex items-start justify-between gap-3 p-4 bg-obsidian/70 rounded-xl border border-slate-800">
                      <div className="max-w-[72%]">
                        <span className="text-xs font-bold text-slate-100 block">Modo de Manutenção</span>
                        <span className="text-[11px] text-slate-400 block mt-1 leading-relaxed">
                          Ativa um banner global avisando os usuários sobre otimizações no sistema.
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          handleUpdateAdminConfig(!isMaintenanceMode, simulateAiFailures);
                          showToast(`Modo Manutenção ${!isMaintenanceMode ? "Ativado" : "Desativado"}!`, "info");
                        }}
                        className={`px-3 py-1.5 text-[11px] font-semibold rounded-lg cursor-pointer transition-all border shrink-0 ${
                          isMaintenanceMode
                            ? "btn-indigo-glow border-cyan-400/40"
                            : "bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700"
                        }`}
                      >
                        {isMaintenanceMode ? "Desativar" : "Ativar"}
                      </button>
                    </div>

                    <div className="flex items-start justify-between gap-3 p-4 bg-obsidian/70 rounded-xl border border-slate-800">
                      <div className="max-w-[72%]">
                        <span className="text-xs font-bold text-slate-100 block">Simular Falhas Gemini AI</span>
                        <span className="text-[11px] text-slate-400 block mt-1 leading-relaxed">
                          Força erros de cota do Gemini para testar a robustez do fallback local.
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          handleUpdateAdminConfig(isMaintenanceMode, !simulateAiFailures);
                          showToast(`Simulador de falhas Gemini ${!simulateAiFailures ? "Ativado" : "Desativado"}!`, "info");
                        }}
                        className={`px-3 py-1.5 text-[11px] font-semibold rounded-lg cursor-pointer transition-all border shrink-0 ${
                          simulateAiFailures
                            ? "bg-rose-500/20 border-rose-500/45 text-rose-300 hover:bg-rose-500/30"
                            : "bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700"
                        }`}
                      >
                        {simulateAiFailures ? "Desativar" : "Ativar"}
                      </button>
                    </div>

                    <div className="flex items-start justify-between gap-3 p-4 bg-obsidian/70 rounded-xl border border-slate-800">
                      <div className="max-w-[72%]">
                        <span className="text-xs font-bold text-slate-100 block">Redefinição Geral de Fábrica</span>
                        <span className="text-[11px] text-slate-400 block mt-1 leading-relaxed">
                          Restaura a lista de domínios originais e limpa todos os caches modificados.
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          if (window.confirm("Deseja realmente redefinir todos os dados para o padrão de fábrica? Isso limpará todas as suas customizações.")) {
                            setDomains(mockDomains);
                            setActiveDomainId(mockDomains[0].id);
                            localStorage.removeItem("web_analyzer_domains");
                            localStorage.removeItem("web_analyzer_active_id");
                            showToast("Banco de dados restaurado com sucesso!", "success");
                          }
                        }}
                        className="px-3 py-1.5 text-[11px] font-semibold bg-amber-500/15 border border-amber-400/35 text-amber-300 hover:bg-amber-500/25 rounded-lg cursor-pointer transition-colors shrink-0"
                      >
                        Restaurar
                      </button>
                    </div>
                  </div>
                </div>

                {/* 3. Domain registry Table and Registry addition form */}
                <div className="bento-card p-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 border-b border-slate-800 pb-4">
                    <div>
                      <h3 className="text-sm font-display font-bold text-slate-100 uppercase tracking-wider">
                        Gerenciamento de Domínios Cadastrados
                      </h3>
                      <p className="text-xs text-slate-400 mt-0.5">Remova, configure e adicione domínios à frota global de monitoramento.</p>
                    </div>

                    {/* Quick Inline Domain Addition Form for Admin */}
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        const target = e.currentTarget;
                        const urlInput = target.elements.namedItem("new_url") as HTMLInputElement | null;
                        const deviceSelect = target.elements.namedItem("new_device") as HTMLSelectElement | null;
                        if (!urlInput || !deviceSelect) return;
                        
                        let rawUrl = urlInput.value.trim().toLowerCase();
                        if (!rawUrl) return;
                        
                        // Clean domain prefix
                        rawUrl = rawUrl.replace(/^(https?:\/\/)?(www\.)?/, "");
                        
                        // Check duplicates
                        if (domains.some(d => d.url === rawUrl)) {
                          showToast("Este domínio já está cadastrado!", "error");
                          return;
                        }

                        const newDomainId = `domain-${Date.now()}`;
                        const newProfile: DomainProfile = {
                          id: newDomainId,
                          url: rawUrl,
                          addedAt: new Date().toISOString(),
                          googleConnected: false,
                          monthlyReportEnabled: false,
                          auditDevice: deviceSelect.value as "mobile" | "desktop",
                          reportsHistory: [
                            { date: "Hoje", performance: 50, accessibility: 50, seo: 50 }
                          ]
                        };

                        setDomains(prev => [...prev, newProfile]);
                        setActiveDomainId(newDomainId);
                        urlInput.value = "";
                        showToast(`Domínio "${rawUrl}" adicionado com sucesso via Admin!`, "success");
                      }}
                      className="flex items-center gap-2 bg-obsidian/80 border border-cyan-500/25 rounded-xl p-1.5"
                    >
                      <input
                        type="text"
                        name="new_url"
                        required
                        placeholder="Novo domínio (ex: uol.com.br)"
                        className="bg-transparent! border-0! shadow-none! text-xs text-slate-100 font-medium px-2 py-1 w-44 font-sans focus:ring-0!"
                      />
                      <select
                        name="new_device"
                        className="text-[11px] font-mono font-semibold rounded-lg px-2 py-1 cursor-pointer"
                      >
                        <option value="desktop">Desktop</option>
                        <option value="mobile">Mobile</option>
                      </select>
                      <button
                        type="submit"
                        className="btn-indigo-glow text-[11px] font-semibold px-3 py-1.5 rounded-lg cursor-pointer"
                      >
                        Adicionar
                      </button>
                    </form>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs text-slate-300">
                      <thead className="bg-obsidian/80 text-slate-400 uppercase tracking-wider text-[10px] font-mono border-b border-slate-800">
                        <tr>
                          <th className="py-3 px-4">Domínio</th>
                          <th className="py-3 px-4">Dispositivo</th>
                          <th className="py-3 px-4">Conta Google</th>
                          <th className="py-3 px-4">Média Consolidada</th>
                          <th className="py-3 px-4 text-right">Ações</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/70">
                        {domains.map((d) => {
                          const latest = d.latestReport;
                          const avgScore = latest
                            ? Math.round((latest.scores.performance + latest.scores.accessibility + latest.scores.seo) / 3)
                            : 50;

                          return (
                            <tr key={d.id} className="hover:bg-cyan-500/5 transition-colors">
                              <td className="py-3.5 px-4 font-semibold text-slate-100">{d.url}</td>
                              <td className="py-3.5 px-4 font-mono text-[11px] text-slate-300">
                                {d.auditDevice === "mobile" ? "Mobile" : "Desktop"}
                              </td>
                              <td className="py-3.5 px-4">
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full font-mono text-[10px] font-semibold border ${
                                  d.googleConnected 
                                    ? "bg-emerald-500/15 text-emerald-300 border-emerald-400/30" 
                                    : "bg-slate-800 text-slate-400 border-slate-700"
                                }`}>
                                  {d.googleConnected ? d.googleEmail || "Conectado" : "Desconectado"}
                                </span>
                              </td>
                              <td className="py-3.5 px-4">
                                <div className="flex items-center gap-2 font-mono tabular-nums">
                                  <span className={`font-bold ${
                                    avgScore >= 85 ? "text-emerald-400" : avgScore >= 50 ? "text-amber-400" : "text-rose-400"
                                  }`}>
                                    {latest ? `${avgScore} pts` : "N/A"}
                                  </span>
                                  {latest && (
                                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border uppercase ${
                                      avgScore >= 85 
                                        ? "bg-emerald-500/15 border-emerald-400/30 text-emerald-300" 
                                        : "bg-amber-500/15 border-amber-400/30 text-amber-300"
                                    }`}>
                                      {avgScore >= 85 ? "Top" : "Atenção"}
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="py-3.5 px-4 text-right space-x-2">
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (window.confirm(`Deseja zerar o histórico de auditorias e relatórios de "${d.url}"?`)) {
                                      setDomains(prev => prev.map(p => {
                                        if (p.id === d.id) {
                                          return {
                                            ...p,
                                            latestReport: undefined,
                                            reportsHistory: []
                                          };
                                        }
                                        return p;
                                      }));
                                      showToast(`Histórico de "${d.url}" limpo!`, "info");
                                    }
                                  }}
                                  className="text-[11px] font-semibold text-slate-300 hover:text-cyan-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                                >
                                  Zerar Histórico
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (domains.length <= 1) {
                                      alert("Não é possível remover o único domínio do sistema.");
                                      return;
                                    }
                                    if (window.confirm(`Deseja excluir permanentemente o domínio "${d.url}"?`)) {
                                      const remaining = domains.filter(p => p.id !== d.id);
                                      setDomains(remaining);
                                      if (activeDomainId === d.id) {
                                        setActiveDomainId(remaining[0].id);
                                      }
                                      showToast(`Domínio "${d.url}" excluído!`, "success");
                                    }
                                  }}
                                  className="text-[11px] font-semibold text-rose-300 hover:text-white hover:bg-rose-600 bg-rose-500/15 border border-rose-500/35 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                                >
                                  Excluir
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

              </div>
            )}

            {/* TAB 7: CHECKLIST SEO (Lazy Loaded) */}
            {activeTab === "checklist" && (
              <Suspense fallback={<TabSkeletonLoader label="Carregando Checklist SEO..." />}>
                <SeoChecklistTab
                  seoChecklist={seoChecklist}
                  setSeoChecklist={setSeoChecklist}
                  defaultChecklist={DEFAULT_SEO_CHECKLIST}
                  showToast={showToast}
                />
              </Suspense>
            )}
              </motion.div>
            </AnimatePresence>

          </>
        )}

      </main>

      {/* Footer information bar — Dark Telemetry */}
      <footer className="border-t border-zinc-800/80 bg-obsidian/90 py-6 mt-10 text-zinc-400 text-xs text-center">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-2">
          <p className="text-zinc-300 font-medium font-display">
            SiteAnalyzer © {new Date().getFullYear()} · Telemetria Real de Web Performance, SEO & IA.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 text-[11px] font-mono text-zinc-500">
            <span>Google PSI v5 + Cheerio</span>
            <span className="hidden sm:inline">·</span>
            <span>Gemini Structured Outputs</span>
            <span className="hidden sm:inline">·</span>
            <span>siteanalyzer.s7vendesign.com.br</span>
          </div>
        </div>
      </footer>

      {/* AI Comparison Modal */}
      {isCompareIAModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-3xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-scale-up">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 bg-blue-500/10 text-blue-400 rounded-lg border border-blue-500/20">
                  <Sparkles className="h-5 w-5 animate-pulse" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Análise Comparativa Inteligente (Gemini AI)</h3>
                  <p className="text-[10px] text-slate-400 mt-0.5">Comparação consolidada global de todos os domínios cadastrados</p>
                </div>
              </div>
              <button
                onClick={() => setIsCompareIAModalOpen(false)}
                className="text-slate-400 hover:text-white text-lg font-bold leading-none cursor-pointer bg-slate-800 hover:bg-slate-700 p-1.5 rounded-lg transition-colors border-0 outline-none"
              >
                ×
              </button>
            </div>

            {/* Modal Body / Markdown Content */}
            <div className="flex-1 overflow-y-auto p-6 text-slate-300 text-sm">
              {isComparingIA ? (
                <div className="flex flex-col items-center justify-center py-20 gap-4">
                  <div className="relative">
                    <div className="h-12 w-12 rounded-full border-4 border-indigo-600/10 border-t-indigo-500 animate-spin"></div>
                    <Sparkles className="h-5 w-5 text-indigo-400 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" />
                  </div>
                  <div className="text-center max-w-sm">
                    <p className="text-xs font-bold text-slate-200">Gemini está analisando os dados...</p>
                    <p className="text-[10px] text-slate-500 mt-1">Comparando pontuações de desempenho, acessibilidade, SEO e calculando o melhor posicionamento técnico global.</p>
                  </div>
                </div>
              ) : compareIAMarkdown ? (
                <div className="markdown-body leading-relaxed">
                  <Markdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      h1: ({ node: _node, ...props }) => <h1 className="text-lg font-bold text-white border-b border-zinc-800 pb-1.5 mt-5 mb-2.5 first:mt-0" {...props} />,
                      h2: ({ node: _node, ...props }) => <h2 className="text-base font-bold text-indigo-400 mt-4 mb-2" {...props} />,
                      h3: ({ node: _node, ...props }) => <h3 className="text-sm font-bold text-zinc-200 mt-3.5 mb-1.5" {...props} />,
                      p: ({ node: _node, ...props }) => <p className="text-xs text-zinc-300 leading-relaxed mb-3.5" {...props} />,
                      ul: ({ node: _node, ...props }) => <ul className="list-disc pl-5 space-y-1.5 text-xs text-zinc-300 mb-4" {...props} />,
                      ol: ({ node: _node, ...props }) => <ol className="list-decimal pl-5 space-y-1.5 text-xs text-zinc-300 mb-4" {...props} />,
                      li: ({ node: _node, ...props }) => <li className="text-xs text-zinc-300" {...props} />,
                      strong: ({ node: _node, ...props }) => <strong className="font-bold text-white" {...props} />,
                      code: ({ node: _node, ...props }) => <code className="bg-zinc-950 px-1.5 py-0.5 rounded text-[11px] font-mono text-indigo-300 border border-zinc-800" {...props} />,
                      blockquote: ({ node: _node, ...props }) => <blockquote className="border-l-4 border-indigo-500/50 bg-zinc-950/40 pl-3 py-1 my-3 text-xs italic text-zinc-400" {...props} />,
                      table: ({ node: _node, ...props }) => <div className="overflow-x-auto my-4 rounded-lg border border-zinc-800"><table className="w-full text-left border-collapse text-xs" {...props} /></div>,
                      thead: ({ node: _node, ...props }) => <thead className="bg-zinc-900/80 text-zinc-300 font-bold border-b border-zinc-800" {...props} />,
                      tbody: ({ node: _node, ...props }) => <tbody className="text-zinc-300" {...props} />,
                      tr: ({ node: _node, ...props }) => <tr className="border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors" {...props} />,
                      th: ({ node: _node, ...props }) => <th className="px-4 py-2.5 whitespace-nowrap" {...props} />,
                      td: ({ node: _node, ...props }) => <td className="px-4 py-2.5" {...props} />,
                    }}
                  >
                    {compareIAMarkdown}
                  </Markdown>
                </div>
              ) : (
                <div className="text-center py-16 text-slate-500">
                  Não foi possível obter os dados da análise.
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-slate-800 bg-slate-950/40 flex justify-end">
              <button
                onClick={() => setIsCompareIAModalOpen(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl transition-all cursor-pointer"
              >
                Fechar Análise
              </button>
            </div>

          </div>
        </div>
      )}

      {/* GSC Explanation Modal */}
      {selectedGSCExplain && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-scale-up animate-duration-200">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 bg-indigo-500/10 text-indigo-400 rounded-lg border border-indigo-500/20">
                  <Sparkles className="h-5 w-5 animate-pulse" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Análise de Impacto: GSC IA</h3>
                  <p className="text-[10px] text-slate-400 mt-0.5">Como os algoritmos do Google interpretam este problema para <b>{selectedGSCExplain.domain}</b></p>
                </div>
              </div>
              <button
                onClick={() => setSelectedGSCExplain(null)}
                className="text-slate-400 hover:text-white text-lg font-bold leading-none cursor-pointer bg-slate-800 hover:bg-slate-700 p-1.5 rounded-lg transition-colors border-0 outline-none"
              >
                ×
              </button>
            </div>

            {/* Modal Body / Markdown Content */}
            <div className="flex-1 overflow-y-auto p-6 text-slate-300 text-sm">
              <div className="mb-5 bg-slate-950/40 border border-slate-800/80 rounded-xl p-4">
                <span className="text-[10px] uppercase font-bold text-slate-400 font-mono tracking-wider">Problema Selecionado</span>
                <div className="flex items-center gap-2 mt-1.5">
                  <span className="text-[9px] font-extrabold uppercase px-2 py-0.5 bg-red-500/10 text-red-400 border border-red-500/20 rounded">
                    Crítico
                  </span>
                  <span className="text-[9px] font-extrabold uppercase px-2 py-0.5 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded">
                    {selectedGSCExplain.issueCategory}
                  </span>
                </div>
                <h4 className="text-xs font-bold text-white mt-2.5">{selectedGSCExplain.issueTitle}</h4>
                <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">{selectedGSCExplain.issueDetails}</p>
              </div>

              {isGscExplaining ? (
                <div className="flex flex-col items-center justify-center py-16 gap-4">
                  <div className="relative">
                    <div className="h-10 w-10 rounded-full border-4 border-indigo-600/10 border-t-indigo-500 animate-spin"></div>
                    <Sparkles className="h-4.5 w-4.5 text-indigo-400 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" />
                  </div>
                  <div className="text-center">
                    <p className="text-xs font-bold text-slate-200">IA está consultando os algoritmos de busca...</p>
                    <p className="text-[10px] text-slate-500 mt-1">Mapeando o impacto de indexação e sinais vitais GSC.</p>
                  </div>
                </div>
              ) : gscExplainContent ? (
                <div className="markdown-body leading-relaxed">
                  <Markdown
                    components={{
                      h1: ({ node: _node, ...props }) => <h1 className="text-lg font-bold text-white border-b border-zinc-800 pb-1.5 mt-5 mb-2.5 first:mt-0" {...props} />,
                      h2: ({ node: _node, ...props }) => <h2 className="text-base font-bold text-indigo-400 mt-4 mb-2" {...props} />,
                      h3: ({ node: _node, ...props }) => <h3 className="text-sm font-bold text-zinc-200 mt-3.5 mb-1.5" {...props} />,
                      p: ({ node: _node, ...props }) => <p className="text-xs text-zinc-300 leading-relaxed mb-3.5" {...props} />,
                      ul: ({ node: _node, ...props }) => <ul className="list-disc pl-5 space-y-1.5 text-xs text-zinc-300 mb-4" {...props} />,
                      ol: ({ node: _node, ...props }) => <ol className="list-decimal pl-5 space-y-1.5 text-xs text-zinc-300 mb-4" {...props} />,
                      li: ({ node: _node, ...props }) => <li className="text-xs text-zinc-300" {...props} />,
                      strong: ({ node: _node, ...props }) => <strong className="font-bold text-white" {...props} />,
                      code: ({ node: _node, ...props }) => <code className="bg-zinc-950 px-1.5 py-0.5 rounded text-[11px] font-mono text-indigo-300 border border-zinc-800" {...props} />,
                      blockquote: ({ node: _node, ...props }) => <blockquote className="border-l-4 border-indigo-500/50 bg-zinc-950/40 pl-3 py-1 my-3 text-xs italic text-zinc-400" {...props} />,
                    }}
                  >
                    {gscExplainContent}
                  </Markdown>
                </div>
              ) : (
                <div className="text-center py-12 text-slate-500">
                  Não foi possível obter a explicação.
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-slate-800 bg-slate-950/40 flex justify-end">
              <button
                onClick={() => setSelectedGSCExplain(null)}
                className="px-4 py-2 bg-linear-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-blue-500/10 cursor-pointer"
              >
                Entendi, Fechar
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Monitoring Config Modal */}
      {isMonitorModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg flex flex-col shadow-2xl overflow-hidden animate-scale-up">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 bg-blue-500/10 text-blue-400 rounded-lg border border-blue-500/20">
                  <Settings className="h-5 w-5 animate-pulse" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Configurações de Alertas de Monitoramento</h3>
                  <p className="text-[10px] text-slate-400 mt-0.5">Defina os limites de queda de pontuação separados por dispositivo</p>
                </div>
              </div>
              <button
                onClick={() => setIsMonitorModalOpen(false)}
                className="text-slate-400 hover:text-white text-lg font-bold leading-none cursor-pointer bg-slate-800 hover:bg-slate-700 p-1.5 rounded-lg transition-colors border-0 outline-none"
              >
                ×
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 flex flex-col gap-5 text-slate-300 text-xs overflow-y-auto max-h-[70vh]">
              
              {/* Activation Status Toggle */}
              <div className="flex items-center justify-between bg-slate-950/40 border border-slate-800 p-4 rounded-xl">
                <div>
                  <span className="font-bold text-slate-200 block">Monitoramento Preventivo</span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">Se ativo, notificaremos flutuantemente caso as pontuações caiam.</span>
                </div>
                <button
                  onClick={() => {
                    setMonitorEnabled(prev => !prev);
                    showToast(
                      !monitorEnabled 
                        ? "Monitoramento preventivo ativado!" 
                        : "Monitoramento preventivo desativado.", 
                      !monitorEnabled ? "success" : "info"
                    );
                  }}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    monitorEnabled ? "bg-blue-600" : "bg-slate-700"
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      monitorEnabled ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>

              {/* Separated Thresholds */}
              <div className="flex flex-col gap-4 bg-slate-950/20 border border-slate-800/80 rounded-xl p-4.5">
                <span className="font-bold text-slate-200 block text-xs border-b border-slate-800 pb-2">Limiares por Tipo de Dispositivo</span>
                
                {/* Mobile Threshold */}
                <div className="mt-2">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-slate-300 font-semibold flex items-center gap-1.5">
                      <Smartphone className="h-4 w-4 text-slate-400" />
                      Limite Móvel (Mobile)
                    </span>
                    <span className="text-xs font-bold text-blue-400 font-mono bg-blue-950/60 px-2 py-0.5 border border-blue-900 rounded-full">
                      {monitorThresholdMobile} / 100
                    </span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="100"
                    value={monitorThresholdMobile}
                    onChange={(e) => setMonitorThresholdMobile(parseInt(e.target.value, 10))}
                    disabled={!monitorEnabled}
                    className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-600 disabled:opacity-50"
                  />
                  <div className="flex justify-between text-[9px] text-slate-500 font-bold font-mono mt-1">
                    <span>1 (Crítico)</span>
                    <span>50 (Razoável)</span>
                    <span>90 (Excelente)</span>
                  </div>
                </div>

                {/* Desktop Threshold */}
                <div className="mt-2">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-slate-300 font-semibold flex items-center gap-1.5">
                      <Monitor className="h-4 w-4 text-slate-400" />
                      Limite Desktop
                    </span>
                    <span className="text-xs font-bold text-indigo-400 font-mono bg-indigo-950/60 px-2 py-0.5 border border-indigo-900 rounded-full">
                      {monitorThresholdDesktop} / 100
                    </span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="100"
                    value={monitorThresholdDesktop}
                    onChange={(e) => setMonitorThresholdDesktop(parseInt(e.target.value, 10))}
                    disabled={!monitorEnabled}
                    className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-600 disabled:opacity-50"
                  />
                  <div className="flex justify-between text-[9px] text-slate-500 font-bold font-mono mt-1">
                    <span>1 (Crítico)</span>
                    <span>50 (Razoável)</span>
                    <span>90 (Excelente)</span>
                  </div>
                </div>
              </div>

              {/* Metrics checkboxes */}
              <div className="flex flex-col gap-2.5 bg-slate-950/20 border border-slate-800/80 rounded-xl p-4.5">
                <span className="font-bold text-slate-200 block text-xs border-b border-slate-800 pb-2">Métricas a Monitorar</span>
                <div className="flex flex-col gap-2.5 mt-2">
                  {[
                    { key: "performance", label: "Desempenho (Performance)" },
                    { key: "accessibility", label: "Acessibilidade" },
                    { key: "seo", label: "SEO" }
                  ].map((met) => {
                    const isChecked = monitorMetrics[met.key];
                    return (
                      <label 
                        key={met.key} 
                        className={`flex items-center gap-2.5 cursor-pointer select-none text-xs font-semibold p-2.5 rounded-lg border transition-all ${
                          !monitorEnabled 
                            ? "opacity-50 pointer-events-none bg-slate-900/40 border-slate-800/40 text-slate-500" 
                            : isChecked
                              ? "bg-blue-950/40 border-blue-900 text-blue-300"
                              : "bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-300"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          disabled={!monitorEnabled}
                          onChange={(e) => {
                            setMonitorMetrics(prev => ({
                              ...prev,
                              [met.key]: e.target.checked
                            }));
                            showToast(
                              e.target.checked
                                ? `Monitoramento de ${met.label} ativado.`
                                : `Monitoramento de ${met.label} desativado.`,
                              "info"
                            );
                          }}
                          className="rounded border-slate-700 bg-slate-900 text-blue-600 focus:ring-0 focus:ring-offset-0 h-4 w-4 cursor-pointer"
                        />
                        {met.label}
                      </label>
                    );
                  })}
                </div>
              </div>

            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-slate-800 bg-slate-950/40 flex justify-end">
              <button
                onClick={() => setIsMonitorModalOpen(false)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl transition-all cursor-pointer"
              >
                Salvar Configurações
              </button>
            </div>

          </div>
        </div>
      )}

      </div>

      {/* Toast Notifications Container — Dark Telemetry */}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none">
        {toasts.map(toast => {
          let borderStyle = "border-zinc-800 bg-bento/95 text-zinc-100";
          let Icon = Info;
          let iconColor = "text-indigo-400";

          if (toast.type === "success") {
            borderStyle = "border-emerald-500/30 bg-bento/95 text-emerald-100";
            Icon = CheckCircle2;
            iconColor = "text-emerald-400";
          } else if (toast.type === "error") {
            borderStyle = "border-rose-500/30 bg-bento/95 text-rose-100";
            Icon = AlertTriangle;
            iconColor = "text-rose-400";
          } else if (toast.type === "info") {
            borderStyle = "border-indigo-500/30 bg-bento/95 text-indigo-100";
            Icon = Info;
            iconColor = "text-indigo-400";
          }

          return (
            <div
              key={toast.id}
              className={`flex items-start gap-3 p-4 rounded-xl border backdrop-blur-xl ${borderStyle} pointer-events-auto shadow-2xl transition-all duration-200 animate-fade-in`}
              style={{ contentVisibility: "auto" }}
            >
              <Icon className={`h-4 w-4 shrink-0 mt-0.5 ${iconColor}`} />
              <div className="flex-1">
                <p className="text-xs font-medium leading-relaxed text-zinc-200">{toast.message}</p>
              </div>
              <button
                onClick={() => setToasts(prev => prev.filter(t => t.id !== toast.id))}
                className="text-zinc-500 hover:text-zinc-100 text-base font-bold leading-none ml-2 cursor-pointer"
              >
                ×
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
