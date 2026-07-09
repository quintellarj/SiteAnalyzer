import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import * as XLSX from "xlsx";
import {
  Search, Globe, Shield, RefreshCw, AlertTriangle, CheckCircle2, Info, Download,
  TrendingUp, BarChart3, Mail, Settings, ArrowRightLeft,
  ChevronDown, ChevronRight, Share2, FileText, Send, Check, Play, LogIn, ExternalLink, HelpCircle, Trash2,
  Sparkles, Lightbulb, Target, Copy, Smartphone, Monitor, CheckSquare, Plus, Sun, Moon,
  Lock, Unlock, ShieldCheck, ShieldAlert, AlertCircle, Menu, X
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, BarChart, Bar, Legend, ScatterChart, Scatter, ZAxis
} from "recharts";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { jsPDF } from "jspdf";
import { mockDomains } from "./mockData";
import { AuditReport, DomainProfile, AuditIssue, AnalyticsDataPoint, SearchQueryRow, ManualSEOTask } from "./types";
import LoginScreen from "./components/LoginScreen";
import ScoreCards from "./components/ScoreCards";
import CoreWebVitals from "./components/CoreWebVitals";

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
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem("site_analyzer_theme");
      return saved ? saved === "dark" : false;
    } catch {
      return false;
    }
  });

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [isDarkMode]);

  // Silent error monitoring & telemetria de segurança
  useEffect(() => {
    const reportSilentError = async (message: string, context: any) => {
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
        } catch (e) {}
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
  const [activeTab, setActiveTab] = useState<"audit" | "history" | "compare" | "integrations" | "email" | "maintenance" | "checklist">("audit");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isPickerHovered, setIsPickerHovered] = useState(false);

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
  
  // Issue accordion state: Record<issueTitle, boolean>
  const [expandedIssues, setExpandedIssues] = useState<Record<string, boolean>>({});

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
  const [securityScanResult, setSecurityScanResult] = useState<any | null>(null);
  const [remediationTab, setRemediationTab] = useState<"express" | "nginx" | "apache">("express");

  // Checklist UI filter & form states
  const [chkNewTitle, setChkNewTitle] = useState("");
  const [chkNewCategory, setChkNewCategory] = useState("SEO On-Page");
  const [chkNewPriority, setChkNewPriority] = useState<"high" | "medium" | "low">("medium");
  const [chkNewNotes, setChkNewNotes] = useState("");
  const [chkFilterCategory, setChkFilterCategory] = useState("all");
  const [chkFilterStatus, setChkFilterStatus] = useState<"all" | "pending" | "completed">("all");
  const [chkSearchQuery, setChkSearchQuery] = useState("");

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
      } catch (err: any) {
        console.error(err);
        setGscExplainContent("### Erro ao carregar diagnóstico por IA\n\nNão foi possível obter a resposta do Google Search Console.");
      } finally {
        setIsGscExplaining(false);
      }
    };

    fetchGscExplain();
  }, [selectedGSCExplain]);

  // Quick SEO Tips state
  const [quickTips, setQuickTips] = useState<any>(null);
  const [isLoadingQuickTips, setIsLoadingQuickTips] = useState(false);
  const [quickTipsError, setQuickTipsError] = useState<string | null>(null);
  const [copiedType, setCopiedType] = useState<'title' | 'desc' | null>(null);

  // Audit device preference states
  const [selectedAuditDevice, setSelectedAuditDevice] = useState<"mobile" | "desktop">("desktop");
  const [isAuditDevicePopoverOpen, setIsAuditDevicePopoverOpen] = useState(false);

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
  const [monitorThreshold, setMonitorThreshold] = useState<number>(() => {
    const saved = localStorage.getItem("monitor_threshold");
    return saved ? parseInt(saved, 10) : 80;
  });
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
    localStorage.setItem("monitor_threshold", monitorThreshold.toString());
  }, [monitorThreshold]);

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
    } catch (err: any) {
      console.error("Error fetching quick tips:", err);
      setQuickTipsError(err.message || "Erro desconhecido");
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

  // Handle URL analyze submission
  const steps = [
    "Iniciando conexão...",
    "Requisitando HTML bruto do site...",
    "Extraindo cabeçalhos e metadados estruturais...",
    "Avaliando critérios de acessibilidade (WCAG)...",
    "Analisando métricas de performance (Lighthouse)...",
    "Compilando relatório otimizado com IA Gemini..."
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
    setAnalysisStep(0);

    // Simulate progress bar through the analysis steps
    const interval = setInterval(() => {
      setAnalysisStep(prev => {
        if (prev < steps.length - 1) return prev + 1;
        clearInterval(interval);
        return prev;
      });
    }, 1300);

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
        console.error("Resposta não-JSON recebida:", textResponse);
        throw new Error(
          "O servidor não retornou um JSON válido. Isso geralmente ocorre se a aplicação foi implantada " +
          "no Vercel apenas como frontend estático, sem o backend em Express ativo.\n\n" +
          "Como resolver:\n" +
          "1. Use o botão oficial de implantação para o Cloud Run no Google AI Studio (recomendado, " +
          "pois suporta aplicações Full-Stack out-of-the-box com containers).\n" +
          "2. Configure o Vercel Serverless Functions ou um arquivo vercel.json para mapear as rotas '/api/*' para o backend."
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
      showToast(`Auditoria concluída com sucesso para o domínio "${cleanDomain}"!`, "success");
    } catch (error: any) {
      showToast(`Falha na auditoria de "${cleanDomain}": ${error.message}`, "error");
      alert("Falha na auditoria: " + error.message);
    } finally {
      setIsAnalyzing(false);
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
        // Simple security validation
        if (!event.origin.endsWith(".run.app") && !event.origin.includes("localhost")) {
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
    } catch (err: any) {
      showToast("Falha na integração com o Google: " + err.message, "error");
      alert("Erro ao iniciar fluxo OAuth: " + err.message);
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

  // Toggle issue expanded
  const toggleIssue = (title: string) => {
    setExpandedIssues(prev => ({ ...prev, [title]: !prev[title] }));
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
    } catch (error) {
      alert("Erro ao configurar relatório por e-mail");
    } finally {
      setIsSendingEmail(false);
    }
  };

  // Generate and Export PDF report via jsPDF
  const handleExportPDF = () => {
    if (!activeDomain || !activeDomain.latestReport) return;
    const report = activeDomain.latestReport;

    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4"
    });

    // Color definitions
    const primaryColor = [15, 23, 42]; // Slate 900
    const accentColor = [37, 99, 235]; // Blue 600
    const textGray = [71, 85, 105]; // Slate 600

    // Title / Cover Section
    doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.rect(0, 0, 210, 40, "F");
    
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.text("Relatório de Auditoria Web Completo", 15, 18);
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(`Domínio Analisado: ${report.url}   |   Gerado em: ${new Date(report.analyzedAt).toLocaleDateString("pt-BR")}`, 15, 28);

    // Score Dashboard Layout
    doc.setTextColor(15, 23, 42);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text("Pontuações de Saúde do Site (0 - 100)", 15, 55);

    // Draw Score Boxes
    const metrics = [
      { name: "Desempenho", score: report.scores.performance, x: 15 },
      { name: "Acessibilidade", score: report.scores.accessibility, x: 80 },
      { name: "Boas Práticas SEO", score: report.scores.seo, x: 145 }
    ];

    metrics.forEach(m => {
      // Background card
      doc.setFillColor(248, 250, 252);
      doc.rect(m.x, 62, 50, 30, "F");
      
      // Border color based on score
      if (m.score >= 90) doc.setDrawColor(16, 185, 129); // Green
      else if (m.score >= 50) doc.setDrawColor(245, 158, 11); // Orange
      else doc.setDrawColor(239, 68, 68); // Red
      doc.setLineWidth(1);
      doc.rect(m.x, 62, 50, 30, "S");

      // Score Text
      doc.setFont("helvetica", "bold");
      doc.setFontSize(22);
      doc.setTextColor(15, 23, 42);
      doc.text(`${m.score}`, m.x + 18, 78);

      // Label Text
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(100, 116, 139);
      doc.text(m.name, m.x + 12, 87);
    });

    // Core Performance metrics
    doc.setTextColor(15, 23, 42);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("Métricas Core Web Vitals & Carregamento:", 15, 105);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(71, 85, 105);
    doc.text(`• Tempo Estimado de Carregamento: ${report.performance.loadTimeSeconds} segundos`, 18, 113);
    doc.text(`• Tamanho Total da Página: ${report.performance.pageSizeKb} KB`, 18, 120);
    doc.text(`• Total de Requisições HTTP: ${report.performance.requestCount}`, 18, 127);
    doc.text(`• Largest Contentful Paint (LCP): ${report.performance.metrics.lcp}`, 115, 113);
    doc.text(`• First Input Delay (FID): ${report.performance.metrics.fid}`, 115, 120);
    doc.text(`• Cumulative Layout Shift (CLS): ${report.performance.metrics.cls}`, 115, 127);

    // Divider
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.5);
    doc.line(15, 135, 195, 135);

    // Section: Issues and Corrections
    doc.setTextColor(15, 23, 42);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.text("Problemas Identificados & Sugestões de Melhoria", 15, 144);

    let yPosition = 152;
    const allIssues = [
      ...report.performance.issues.map(i => ({ ...i, category: "Performance" })),
      ...report.accessibility.issues.map(i => ({ ...i, category: "Acessibilidade" })),
      ...report.seo.issues.map(i => ({ ...i, category: "SEO" }))
    ];

    allIssues.forEach((issue, index) => {
      if (yPosition > 260) {
        doc.addPage();
        yPosition = 20;
      }

      // Draw issue tag
      const sevColor = issue.severity === "critical" ? [239, 68, 68] : issue.severity === "warning" ? [245, 158, 11] : [59, 130, 246];
      doc.setFillColor(sevColor[0], sevColor[1], sevColor[2]);
      doc.rect(15, yPosition, 25, 5, "F");
      
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.text(issue.severity.toUpperCase(), 17, yPosition + 3.8);

      // Category indicator
      doc.setTextColor(100, 116, 139);
      doc.setFont("helvetica", "bold");
      doc.text(`[${issue.category}]`, 43, yPosition + 3.8);

      // Title
      doc.setTextColor(15, 23, 42);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.text(issue.title, 75, yPosition + 3.8);

      yPosition += 8;

      // Details
      doc.setTextColor(71, 85, 105);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      const splitDetails = doc.splitTextToSize(`Problema: ${issue.details}`, 175);
      doc.text(splitDetails, 15, yPosition);
      yPosition += splitDetails.length * 4.5;

      // Suggestion
      doc.setTextColor(37, 99, 235);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      const splitSuggestion = doc.splitTextToSize(`Sugestão técnica: ${issue.suggestion}`, 175);
      doc.text(splitSuggestion, 15, yPosition);
      yPosition += splitSuggestion.length * 4.5 + 4; // Spacing to next
    });

    // Save File
    doc.save(`auditoria-${report.url}-${new Date().toISOString().split('T')[0]}.pdf`);
  };

  // Generate and Export Comparison PDF report via jsPDF
  const handleExportComparePDF = () => {
    const source = domains.find(d => d.id === compareSourceId);
    const target = domains.find(d => d.id === compareTargetId);

    if (!source || !target || !source.latestReport || !target.latestReport) {
      showToast("Ambos os domínios precisam ter relatórios gerados para exportar o comparativo.", "error");
      return;
    }

    const sReport = source.latestReport;
    const tReport = target.latestReport;

    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4"
    });

    const primaryColor = [15, 23, 42]; // Slate 900
    const sourceColor = [37, 99, 235]; // Blue 600
    const targetColor = [147, 51, 234]; // Purple 600

    // Title / Cover Section
    doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.rect(0, 0, 210, 40, "F");
    
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text("Relatório Comparativo de Performance & SEO", 15, 16);
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(`Comparação: ${source.url} vs ${target.url}   |   Data: ${new Date().toLocaleDateString("pt-BR")}`, 15, 28);

    // Comparativo de Pontuações de Saúde
    doc.setTextColor(15, 23, 42);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.text("1. Painel Comparativo de Pontuações de Saúde (0 - 100)", 15, 55);

    // Draw table of scores
    // Table headers
    doc.setFillColor(241, 245, 249);
    doc.rect(15, 62, 180, 8, "F");
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(51, 65, 85);
    doc.text("Categoria", 18, 67);
    doc.text(source.url, 75, 67);
    doc.text(target.url, 130, 67);
    doc.text("Diferença", 175, 67);

    // Rows
    const scoreRows = [
      { name: "Desempenho (Performance)", sScore: sReport.scores.performance, tScore: tReport.scores.performance },
      { name: "Acessibilidade", sScore: sReport.scores.accessibility, tScore: tReport.scores.accessibility },
      { name: "Boas Práticas SEO", sScore: sReport.scores.seo, tScore: tReport.scores.seo }
    ];

    let rowY = 75;
    scoreRows.forEach((row, index) => {
      // Row bg for zebra stripe
      if (index % 2 === 1) {
        doc.setFillColor(248, 250, 252);
        doc.rect(15, rowY - 5, 180, 8, "F");
      }
      
      doc.setFont("helvetica", "normal");
      doc.setTextColor(15, 23, 42);
      doc.text(row.name, 18, rowY);
      
      doc.setFont("helvetica", "bold");
      doc.setTextColor(sourceColor[0], sourceColor[1], sourceColor[2]);
      doc.text(`${row.sScore} pts`, 75, rowY);
      
      doc.setTextColor(targetColor[0], targetColor[1], targetColor[2]);
      doc.text(`${row.tScore} pts`, 130, rowY);
      
      const diff = row.tScore - row.sScore;
      if (diff > 0) {
        doc.setTextColor(16, 185, 129); // Green
        doc.text(`+${diff}`, 175, rowY);
      } else if (diff < 0) {
        doc.setTextColor(239, 68, 68); // Red
        doc.text(`${diff}`, 175, rowY);
      } else {
        doc.setTextColor(100, 116, 139); // Slate
        doc.text(`=`, 175, rowY);
      }
      
      rowY += 10;
    });

    // Core Web Vitals
    doc.setTextColor(15, 23, 42);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.text("2. Métricas de Carregamento & Core Web Vitals", 15, 115);

    // Web Vitals Headers
    doc.setFillColor(241, 245, 249);
    doc.rect(15, 122, 180, 8, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(51, 65, 85);
    doc.text("Métrica Web Vital", 18, 127);
    doc.text(source.url, 75, 127);
    doc.text(target.url, 130, 127);

    const sCrit = [...sReport.performance.issues, ...sReport.accessibility.issues, ...sReport.seo.issues].filter(i => i.severity === "critical").length;
    const tCrit = [...tReport.performance.issues, ...tReport.accessibility.issues, ...tReport.seo.issues].filter(i => i.severity === "critical").length;

    const vitalsRows = [
      { name: "Tempo de Carregamento (LCP)", sVal: `${sReport.performance.loadTimeSeconds}s (${sReport.performance.metrics.lcp})`, tVal: `${tReport.performance.loadTimeSeconds}s (${tReport.performance.metrics.lcp})` },
      { name: "Interatividade (FID)", sVal: sReport.performance.metrics.fid, tVal: tReport.performance.metrics.fid },
      { name: "Tamanho Total da Página", sVal: `${sReport.performance.pageSizeKb} KB`, tVal: `${tReport.performance.pageSizeKb} KB` },
      { name: "Quantidade de Requisições", sVal: `${sReport.performance.requestCount}`, tVal: `${tReport.performance.requestCount}` },
      { name: "Problemas Críticos Totais", sVal: `${sCrit} críticos`, tVal: `${tCrit} críticos` }
    ];

    let vitalY = 135;
    vitalsRows.forEach((row, index) => {
      if (index % 2 === 1) {
        doc.setFillColor(248, 250, 252);
        doc.rect(15, vitalY - 5, 180, 8, "F");
      }
      doc.setFont("helvetica", "normal");
      doc.setTextColor(15, 23, 42);
      doc.text(row.name, 18, vitalY);

      doc.setFont("helvetica", "bold");
      doc.text(row.sVal, 75, vitalY);
      doc.text(row.tVal, 130, vitalY);

      vitalY += 10;
    });

    // Divider
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.5);
    doc.line(15, vitalY + 2, 195, vitalY + 2);

    let y = vitalY + 12;

    // AI Analysis Title & Content
    let finalMarkdown = compareIAMarkdown;
    if (!finalMarkdown) {
      const sP = sReport.scores.performance;
      const sA = sReport.scores.accessibility;
      const sS = sReport.scores.seo;
      const tP = tReport.scores.performance;
      const tA = tReport.scores.accessibility;
      const tS = tReport.scores.seo;
      
      const sAvg = Math.round((sP + sA + sS) / 3);
      const tAvg = Math.round((tP + tA + tS) / 3);
      
      const winner = tAvg > sAvg ? target.url : source.url;
      const diffAvg = Math.abs(tAvg - sAvg);
      
      finalMarkdown = `## 📊 Análise Comparativa Consolidada por IA
  
Análise técnica gerada comparando os perfis de otimização de **${source.url}** e **${target.url}**.

### 🏆 Diagnóstico de Liderança
O domínio **${winner}** apresenta melhor desempenho global e maturidade técnica estrutural, com uma vantagem de **${diffAvg} pontos** na média consolidada de auditoria.

### ⚖️ Comparação Direta de Desempenho
- **Performance**: ${source.url} obteve **${sP} pontos** vs **${tP} pontos** de ${target.url}.
- **Acessibilidade**: ${source.url} obteve **${sA} pontos** vs **${tA} pontos** de ${target.url}.
- **SEO**: ${source.url} obteve **${sS} pontos** vs **${tS} pontos** de ${target.url}.

### 🔍 Métricas Core Web Vitals
- **Tamanho de Página**: ${source.url} possui **${sReport.performance.pageSizeKb} KB** enquanto ${target.url} possui **${tReport.performance.pageSizeKb} KB**.
- **Requisições HTTP**: ${source.url} realiza **${sReport.performance.requestCount} requisições** vs **${tReport.performance.requestCount}** de ${target.url}.
- **Tempo de Carregamento**: ${source.url} carrega em **${sReport.performance.loadTimeSeconds}s** vs **${tReport.performance.loadTimeSeconds}s** de ${target.url}.

### 🎯 Plano de Ação Recomendado
1. Para o site menos performante, priorizar a minificação de bundles e otimização de imagens para formato WebP.
2. Garantir conformidade com as diretrizes de acessibilidade WCAG AA em ambos os domínios.
`;
    }

    const lines = finalMarkdown.split("\n");
    if (lines.length > 0) {
      if (y > 255) {
        doc.addPage();
        y = 20;
      }
      doc.setFont("helvetica", "bold");
      doc.setFontSize(13);
      doc.setTextColor(15, 23, 42);
      doc.text("3. Observações & Diagnóstico de Inteligência Artificial", 15, y);
      y += 8;
      
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9.5);
      doc.setTextColor(51, 65, 85);
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) {
          y += 3.5;
          continue;
        }
        if (y > 275) {
          doc.addPage();
          y = 20;
        }
        
        if (line.startsWith("###")) {
          y += 4;
          doc.setFont("helvetica", "bold");
          doc.setFontSize(10.5);
          doc.setTextColor(15, 23, 42);
          const cleanLine = line.replace("###", "").trim();
          doc.text(cleanLine, 15, y);
          y += 6;
          doc.setFont("helvetica", "normal");
          doc.setFontSize(9.5);
          doc.setTextColor(51, 65, 85);
        } else if (line.startsWith("##")) {
          y += 5;
          doc.setFont("helvetica", "bold");
          doc.setFontSize(11.5);
          doc.setTextColor(37, 99, 235);
          const cleanLine = line.replace("##", "").trim();
          doc.text(cleanLine, 15, y);
          y += 7;
          doc.setFont("helvetica", "normal");
          doc.setFontSize(9.5);
          doc.setTextColor(51, 65, 85);
        } else if (line.startsWith("-") || line.startsWith("*")) {
          doc.setFont("helvetica", "normal");
          const cleanLine = "• " + line.substring(1).replace(/\*\*/g, "").trim();
          const splitText = doc.splitTextToSize(cleanLine, 175);
          doc.text(splitText, 18, y);
          y += splitText.length * 4.5 + 1;
        } else {
          doc.setFont("helvetica", "normal");
          const cleanLine = line.replace(/\*\*/g, "");
          if (cleanLine.startsWith("|")) {
            if (cleanLine.includes("---")) continue;
            const parts = cleanLine.split("|").map(p => p.trim()).filter(p => p);
            const tableLine = parts.join("  |  ");
            doc.setFont("helvetica", "bold");
            doc.text(tableLine, 15, y);
            y += 5;
            doc.setFont("helvetica", "normal");
          } else {
            const splitText = doc.splitTextToSize(cleanLine, 175);
            doc.text(splitText, 15, y);
            y += splitText.length * 4.5 + 1.5;
          }
        }
      }
    }

    doc.save(`comparativo-${source.url}-vs-${target.url}.pdf`);
    showToast("PDF Comparativo exportado com sucesso!", "success");
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

  // Helper to calculate consecutive averages and improvement trend
  const getConsecutiveStats = (history: Array<{ performance: number; accessibility: number; seo: number }> | undefined) => {
    if (!history || history.length === 0) return { avg: 0, trend: "none" as const, diff: 0, count: 0 };
    
    // Get up to 3 consecutive audits (most recent)
    const last3 = history.slice(-3);
    const scores = last3.map(h => Math.round((h.performance + h.accessibility + h.seo) / 3));
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
    } catch (err: any) {
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

      const data = await res.json();
      setSecurityScanResult(data);
      showToast(`Varredura de segurança concluída! Nota: ${data.score}/100`, "success");
    } catch (err: any) {
      console.error("Scanner error:", err);
      showToast(err.message || "Erro de rede ao conectar com o scanner de segurança.", "error");
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

  const getSeverityBadge = (severity: "critical" | "warning" | "info") => {
    switch (severity) {
      case "critical":
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-red-100 text-red-800 border border-red-200">Crítico</span>;
      case "warning":
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">Aviso</span>;
      default:
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-200">Info</span>;
    }
  };

  if (!sessionUser) {
    return <LoginScreen onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div id="app_root" className="min-h-screen bg-white flex text-black font-sans antialiased">
      
      {/* Mobile Sidebar / Drawer (Neo-Brutalist Slide-out Panel) */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="fixed inset-0 bg-black/60 z-50 md:hidden"
            />
            {/* Sliding Drawer */}
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 220 }}
              className={`fixed top-0 left-0 bottom-0 w-80 max-w-[85vw] z-50 md:hidden flex flex-col border-r-3 border-black dark:border-white shadow-[6px_0px_0px_#000000] transition-colors duration-200 ${
                isDarkMode ? "bg-[#222222] text-white animate-fade-in" : "bg-white text-black animate-fade-in"
              }`}
            >
              {/* Drawer Header */}
              <div className="p-5 flex items-center justify-between border-b-3 border-black dark:border-white">
                <div className="flex items-center gap-2.5">
                  <div className="bg-[#D11A2A] text-white p-2 rounded-xl border-2 border-black flex items-center justify-center">
                    <Globe className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold tracking-tight text-black dark:text-white flex items-center gap-1.5">
                      SiteAnalyzer <span className="text-[9px] bg-black text-concrete-grey px-1 py-0.2 rounded font-mono">v1.2</span>
                    </h2>
                    <p className="text-[9px] text-slate-500 font-bold">Auditoria IA de SEO & CWV</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-1.5 border-2 border-black dark:border-white bg-white dark:bg-slate-900 text-black dark:text-white rounded-lg shadow-[2.5px_2.5px_0px_#000000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-[1px_1px_0px_#000000]"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Logged in User widget */}
              {sessionUser && (
                <div className="px-5 py-4 border-b-2 border-black dark:border-white bg-slate-950/5 flex flex-col gap-2.5">
                  <div className="flex items-center gap-2">
                    <div className={`p-1.5 rounded-lg text-white ${sessionUser.role === 'admin' ? 'bg-[#184A90]' : 'bg-black border border-slate-700'}`}>
                      {sessionUser.role === 'admin' ? <Shield className="h-3.5 w-3.5" /> : <Mail className="h-3.5 w-3.5 text-concrete-grey" />}
                    </div>
                    <div className="min-w-0">
                      <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block leading-none mb-1">
                        {sessionUser.role === 'admin' ? "Administrador" : "Acesso Google"}
                      </span>
                      <span className="text-xs font-semibold text-concrete-grey block truncate" title={sessionUser.email}>
                        {sessionUser.email}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      handleLogout();
                      setIsMobileMenuOpen(false);
                    }}
                    className="w-full flex items-center justify-center gap-1.5 py-1.5 bg-black text-white hover:bg-slate-900 rounded-lg text-[11px] font-bold text-concrete-grey transition-all cursor-pointer border-2 border-black shadow-[2.5px_2.5px_0px_#000000]"
                  >
                    <LogIn className="h-3 w-3 rotate-180 text-concrete-grey" />
                    Sair da Conta
                  </button>
                </div>
              )}

              {/* Sidebar Nav Items */}
              <nav className="flex-1 px-4 py-5 space-y-2 overflow-y-auto">
                {[
                  { id: "audit", label: "Relatório Auditoria", icon: Globe },
                  { id: "history", label: "Histórico Domínio", icon: TrendingUp },
                  { id: "compare", label: "Comparar Domínios", icon: ArrowRightLeft },
                  { id: "integrations", label: "Google Integrations", icon: BarChart3 },
                  { id: "email", label: "Relatórios Mensais", icon: Mail },
                  { id: "checklist", label: "Checklist SEO", icon: CheckSquare },
                  ...(sessionUser?.role === "admin" 
                    ? [{ id: "maintenance", label: "Painel Manutenção", icon: Shield }] 
                    : [])
                ].map(tab => {
                  const Icon = tab.icon;
                  const isSelected = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => {
                        setActiveTab(tab.id as any);
                        setIsMobileMenuOpen(false);
                      }}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer select-none text-left border-2 ${
                        isSelected 
                          ? "bg-[#184A90] text-white border-black shadow-[3px_3px_0px_#000000]" 
                          : "text-black dark:text-white border-transparent hover:bg-slate-100 dark:hover:bg-slate-800"
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      <span>{tab.label}</span>
                    </button>
                  );
                })}
              </nav>

              {/* Connection Widget in bottom */}
              <div className="p-4 border-t-2 border-black dark:border-white bg-slate-950/5">
                <div className="bg-white dark:bg-slate-900 border-2 border-black dark:border-white rounded-xl p-3 text-[11px] shadow-[3.5px_3.5px_0px_#000000]">
                  <span className="text-[9px] text-slate-500 uppercase tracking-wider block font-mono font-bold mb-2">Conectividade Google</span>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-black dark:text-white font-semibold">Google Analytics</span>
                    <span className={`w-2.5 h-2.5 rounded-full border border-black ${googleAccessToken ? 'bg-[#184A90]' : 'bg-slate-400'}`}></span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-black dark:text-white font-semibold">Search Console</span>
                    <span className={`w-2.5 h-2.5 rounded-full border border-black ${googleAccessToken ? 'bg-[#184A90]' : 'bg-slate-400'}`}></span>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Left Sidebar - Professional Polish Style */}
      <aside className="w-64 bg-white text-black flex flex-col border-r-2 border-black hidden md:flex shrink-0">
        <div className="p-6 flex items-center gap-3 border-b-2 border-black">
          <div className="bg-blue-600 text-white p-2 rounded-xl shadow-lg shadow-blue-500/10 flex items-center justify-center">
            <Globe className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-base font-bold tracking-tight text-white flex items-center gap-1.5">
              SiteAnalyzer <span className="text-[10px] bg-slate-800 text-concrete-grey px-1.5 py-0.2 rounded font-mono">v1.2</span>
            </h1>
            <p className="text-[10px] text-slate-500">Auditoria IA de SEO & CWV</p>
          </div>
        </div>

        {/* Logged in User widget */}
        {sessionUser && (
          <div className="px-6 py-4.5 border-b border-slate-800/80 bg-slate-950/20 flex flex-col gap-2.5">
            <div className="flex items-center gap-2">
              <div className={`p-1.5 rounded-lg text-white ${sessionUser.role === 'admin' ? 'bg-indigo-600' : 'bg-slate-800 border border-slate-700'}`}>
                {sessionUser.role === 'admin' ? <Shield className="h-3.5 w-3.5" /> : <Mail className="h-3.5 w-3.5 text-concrete-grey" />}
              </div>
              <div className="min-w-0">
                <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block leading-none mb-1">
                  {sessionUser.role === 'admin' ? "Administrador" : "Acesso Google"}
                </span>
                <span className="text-xs font-semibold text-concrete-grey block truncate animate-fade-in" title={sessionUser.email}>
                  {sessionUser.email}
                </span>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-1.5 py-1.5 bg-slate-800 hover:bg-slate-700 hover:text-white rounded-lg text-[11px] font-bold text-concrete-grey transition-all cursor-pointer border border-slate-700/50"
            >
              <LogIn className="h-3 w-3 rotate-180 text-concrete-grey" />
              Sair da Conta
            </button>
          </div>
        )}

        {/* Sidebar Nav Items */}
        <nav className="flex-1 px-4 py-6 space-y-1">
          {[
            { id: "audit", label: "Relatório Auditoria", icon: Globe },
            { id: "history", label: "Histórico Domínio", icon: TrendingUp },
            { id: "compare", label: "Comparar Domínios", icon: ArrowRightLeft },
            { id: "integrations", label: "Google Integrations", icon: BarChart3 },
            { id: "email", label: "Relatórios Mensais", icon: Mail },
            { id: "checklist", label: "Checklist SEO", icon: CheckSquare },
            ...(sessionUser?.role === "admin" 
              ? [{ id: "maintenance", label: "Painel Manutenção", icon: Shield }] 
              : [])
          ].map(tab => {
            const Icon = tab.icon;
            const isSelected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold transition-all cursor-pointer select-none text-left ${
                  isSelected 
                    ? "bg-blue-600/15 text-blue-400 font-bold border-l-2 border-blue-500 rounded-l-none pl-2.5" 
                    : "text-slate-400 hover:bg-slate-800/50 hover:text-slate-200"
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Connection Widget in Sidebar bottom */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/20">
          <div className="bg-slate-800/30 border border-slate-800/60 rounded-xl p-3 text-[11px]">
            <span className="text-[9px] text-slate-500 uppercase tracking-wider block font-mono font-bold mb-2">Conectividade Google</span>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-slate-400">Google Analytics</span>
              <span className={`w-2 h-2 rounded-full ${googleAccessToken ? 'bg-emerald-500 shadow shadow-emerald-500/50' : 'bg-slate-600'}`}></span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Search Console</span>
              <span className={`w-2 h-2 rounded-full ${googleAccessToken ? 'bg-emerald-500 shadow shadow-emerald-500/50' : 'bg-slate-600'}`}></span>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Right Area */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* Header - Professional Polish Style */}
        <header className={`border-b-2 border-black sticky top-0 z-50 py-4 px-6 bg-white text-black transition-colors duration-200`}>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            
            {/* Branding fallback for mobile */}
            <div className="flex items-center justify-between w-full md:hidden mb-1">
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                  className="p-1.5 border-2 border-black dark:border-white bg-white dark:bg-slate-900 text-black dark:text-white rounded-lg shadow-[2px_2px_0px_#000000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-[1px_1px_0px_#000000]"
                  aria-label="Abrir menu"
                >
                  {isMobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
                </button>
                <div className="bg-[#D11A2A] text-white p-1.5 rounded-lg border-2 border-black">
                  <Globe className="h-4 w-4" />
                </div>
                <span className={`text-sm font-bold tracking-tight text-black dark:text-white`}>SiteAnalyzer</span>
              </div>
              
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setIsDarkMode(!isDarkMode)}
                  className="p-1.5 border-2 border-black dark:border-white bg-white dark:bg-slate-900 text-black dark:text-white rounded-lg shadow-[2px_2px_0px_#000000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-[1px_1px_0px_#000000]"
                >
                  {isDarkMode ? <Sun className="h-3.5 w-3.5 text-white" /> : <Moon className="h-3.5 w-3.5 text-black" />}
                </button>
              </div>
            </div>

            {/* Quick URL Auditor Bar */}
            <form onSubmit={handleAnalyze} className="flex flex-col sm:flex-row flex-1 max-w-xl gap-2.5 w-full relative">
              <div className="relative flex-1 min-w-0">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Inserir domínio para auditoria (ex: google.com)"
                  value={analyzingUrl}
                  onChange={(e) => setAnalyzingUrl(e.target.value)}
                  disabled={isAnalyzing}
                  required
                  id="auditor_input"
                  className={`w-full border rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent font-medium transition-all ${
                    isDarkMode 
                      ? "bg-slate-800 border-slate-700 text-white placeholder:text-slate-500" 
                      : "bg-slate-50 border-slate-300 text-slate-950 placeholder:text-slate-400"
                  }`}
                />
              </div>
              <div className="flex items-center gap-1.5 shrink-0 self-stretch sm:self-auto justify-end">
                <button
                  type="button"
                  onClick={() => setIsAuditDevicePopoverOpen(!isAuditDevicePopoverOpen)}
                  className={`px-3 py-2.5 rounded-lg border flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
                    isDarkMode 
                      ? "bg-slate-800 border-slate-700 text-white" 
                      : "bg-white border-slate-200 text-slate-700"
                  }`}
                  title="Alterar tipo de auditoria (Mobile ou Desktop)"
                >
                  {selectedAuditDevice === "mobile" ? (
                    <Smartphone className="h-4 w-4" />
                  ) : (
                    <Monitor className="h-4 w-4" />
                  )}
                  <span className="text-xs font-bold">{selectedAuditDevice === "mobile" ? "Móvel" : "Desktop"}</span>
                  <ChevronDown className="h-3.5 w-3.5" />
                </button>
                <button
                  type="submit"
                  disabled={isAnalyzing}
                  id="analyze_button"
                  className="bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 text-white px-4 py-2.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm border-0"
                  title={`Disparar auditoria em modo ${selectedAuditDevice === "mobile" ? "Mobile" : "Desktop"}`}
                >
                  {isAnalyzing ? (
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Play className="h-3.5 w-3.5 fill-white" />
                  )}
                  <span>{isAnalyzing ? "Analisando" : "Analisar"}</span>
                </button>
              </div>

              {isAuditDevicePopoverOpen && (
                <div className="absolute right-0 top-full mt-2 z-50 w-64 bg-white border border-slate-200 rounded-xl shadow-lg p-3 animate-fade-in text-slate-800">
                  <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-slate-100">
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Tipo de Auditoria</span>
                    <button
                      type="button"
                      onClick={() => setIsAuditDevicePopoverOpen(false)}
                      className="text-slate-400 hover:text-slate-600 text-[10px] font-bold uppercase"
                    >
                      fechar
                    </button>
                  </div>
                  
                  <div className="flex flex-col gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        handleSaveAuditDevice("mobile");
                        setIsAuditDevicePopoverOpen(false);
                      }}
                      className={`flex items-center gap-3 w-full px-2.5 py-2 rounded-lg text-left text-xs transition-colors cursor-pointer border ${
                        selectedAuditDevice === "mobile"
                          ? "bg-blue-50 text-blue-700 font-bold border-blue-100"
                          : "hover:bg-slate-50 text-slate-600 border-transparent"
                      }`}
                    >
                      <Smartphone className={`h-4 w-4 ${selectedAuditDevice === "mobile" ? "text-blue-600" : "text-slate-400"}`} />
                      <div className="flex-1">
                        <div className="font-semibold">Auditoria Móvel (Mobile)</div>
                        <div className="text-[9px] text-slate-400 font-normal">Simula redes 3G/4G e CPU móvel lenta</div>
                      </div>
                      {selectedAuditDevice === "mobile" && <Check className="h-3.5 w-3.5 text-blue-600" />}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        handleSaveAuditDevice("desktop");
                        setIsAuditDevicePopoverOpen(false);
                      }}
                      className={`flex items-center gap-3 w-full px-2.5 py-2 rounded-lg text-left text-xs transition-colors cursor-pointer border ${
                        selectedAuditDevice === "desktop"
                          ? "bg-blue-50 text-blue-700 font-bold border-blue-100"
                          : "hover:bg-slate-50 text-slate-600 border-transparent"
                      }`}
                    >
                      <Monitor className={`h-4 w-4 ${selectedAuditDevice === "desktop" ? "text-blue-600" : "text-slate-400"}`} />
                      <div className="flex-1">
                        <div className="font-semibold">Auditoria Desktop</div>
                        <div className="text-[9px] text-slate-400 font-normal">Foco em banda larga e telas grandes</div>
                      </div>
                      {selectedAuditDevice === "desktop" && <Check className="h-3.5 w-3.5 text-blue-600" />}
                    </button>
                  </div>

                  {activeDomain && (
                    <div className="mt-2 pt-2 border-t border-slate-100 text-[9px] text-slate-400 italic">
                      * Preferência salva para o domínio atual: <strong className="text-slate-600">{activeDomain.url}</strong>
                    </div>
                  )}

                  <div className="mt-2.5 flex flex-col gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        setIsAuditDevicePopoverOpen(false);
                        handleAnalyze();
                      }}
                      className="w-full bg-blue-600 hover:bg-blue-500 text-white py-1.5 rounded-lg text-xs font-bold text-center transition-all cursor-pointer flex items-center justify-center gap-1 shadow-sm border-0"
                    >
                      <Play className="h-3 w-3 fill-white" />
                      Disparar Auditoria
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsAuditDevicePopoverOpen(false);
                        setIsMonitorModalOpen(true);
                      }}
                      className="w-full bg-slate-50 hover:bg-slate-100 text-slate-700 py-1.5 rounded-lg text-xs font-semibold text-center transition-all cursor-pointer flex items-center justify-center gap-1.5 border border-slate-200"
                    >
                      <Settings className="h-3.5 w-3.5 text-slate-500" />
                      Configurar Limites de Alerta
                    </button>
                  </div>
                </div>
              )}
            </form>

            {/* User Profile Info & CTA */}
            {sessionUser && (
              <div className="hidden md:flex items-center gap-3">
                {/* Theme Toggle Button */}
                <button
                  onClick={() => {
                    const nextMode = !isDarkMode;
                    setIsDarkMode(nextMode);
                    localStorage.setItem("site_analyzer_theme", nextMode ? "dark" : "light");
                  }}
                  className={`p-2 rounded-xl border transition-all cursor-pointer flex items-center justify-center shadow-sm ${
                    isDarkMode 
                      ? "bg-slate-800 border-slate-700 text-yellow-400 hover:bg-slate-700 hover:text-yellow-300" 
                      : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  }`}
                  title={isDarkMode ? "Mudar para Modo Claro" : "Mudar para Modo Escuro"}
                >
                  {isDarkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                </button>

                <div className={`flex items-center gap-3 border rounded-xl px-3.5 py-1.5 shadow-sm transition-colors duration-200 ${
                  isDarkMode ? "bg-slate-800 border-slate-700 text-slate-100" : "bg-slate-50 border-slate-200 text-slate-700"
                }`}>
                  <div className={`w-7 h-7 rounded-lg text-white flex items-center justify-center font-bold text-xs ${sessionUser.role === 'admin' ? 'bg-indigo-600' : 'bg-blue-600'}`}>
                    {sessionUser.role === 'admin' ? <Shield className="h-3.5 w-3.5" /> : <Mail className="h-3.5 w-3.5" />}
                  </div>
                  <div className="text-left hidden sm:block">
                    <span className="text-[10px] text-slate-400 block font-bold uppercase tracking-wider leading-none mb-0.5">{sessionUser.role === 'admin' ? 'Admin' : 'Usuário'}</span>
                    <span className={`text-xs font-bold block leading-none ${isDarkMode ? "text-slate-100" : "text-slate-700"}`}>{sessionUser.email}</span>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="p-1.5 hover:bg-slate-200/60 rounded-lg text-slate-400 hover:text-slate-700 md:hidden flex items-center cursor-pointer ml-1"
                    title="Sair da Conta"
                  >
                    <LogIn className="h-4 w-4 rotate-180" />
                  </button>
                </div>
              </div>
            )}

          </div>
        </header>

        {/* Main Workspace content */}
        <main className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">

        {isMaintenanceMode && (
          <div className="bg-[#222222] border-2.5 border-black dark:border-white rounded-xl p-4.5 text-concrete-grey text-xs flex items-center justify-between gap-4 animate-fade-in shadow-[4px_4px_0px_#000000]">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-[#D11A2A] text-white rounded-xl border border-black shadow">
                <AlertTriangle className="h-4 w-4 text-white" />
              </div>
              <div>
                <h4 className="font-bold text-concrete-grey leading-tight">Sistema em Modo de Manutenção Programada</h4>
                <p className="text-concrete-grey/95 mt-0.5 leading-relaxed">Novas auditorias e geração de relatórios estão suspensas temporariamente para otimização de infraestrutura.</p>
              </div>
            </div>
            {sessionUser?.role === 'admin' && (
              <span className="text-[10px] bg-[#D11A2A] text-concrete-grey border border-black px-2.5 py-1 rounded-lg font-mono font-bold uppercase tracking-wider shadow-[2px_2px_0px_#000000]">Modo Admin Ativo</span>
            )}
          </div>
        )}

        {/* Loading overlay during Analysis */}
        {isAnalyzing && (
          <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center flex flex-col items-center justify-center gap-4 py-16 animate-fade-in shadow-sm">
            <div className="relative">
              <div className="h-16 w-16 rounded-full border-4 border-blue-600/10 border-t-blue-500 animate-spin"></div>
              <Globe className="h-6 w-6 text-blue-500 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
            </div>
            <div className="max-w-md">
              <h3 className="text-lg font-bold text-slate-900 mb-2">Auditoria Ativa por Inteligência Artificial</h3>
              <p className="text-sm text-slate-500 mb-6 h-10">{steps[analysisStep]}</p>
              
              {/* Fake progress bar */}
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div 
                  className="bg-blue-600 h-full transition-all duration-1000 rounded-full"
                  style={{ width: `${((analysisStep + 1) / steps.length) * 100}%` }}
                ></div>
              </div>
              <span className="text-xs text-slate-400 mt-2 block font-medium">Etapa {analysisStep + 1} de {steps.length}</span>
            </div>
          </div>
        )}

        {!isAnalyzing && (
          <>
            {/* Mobile-only Top Tabs Navigation */}
            <div className="flex md:hidden border-b border-slate-200 gap-1 overflow-x-auto pb-px mb-2 scrollbar-none bg-white p-2 rounded-xl border">
              {[
                { id: "audit", label: "Auditoria", icon: Globe },
                { id: "history", label: "Histórico", icon: TrendingUp },
                { id: "compare", label: "Comparar", icon: ArrowRightLeft },
                { id: "integrations", label: "Google", icon: BarChart3 },
                { id: "email", label: "E-mail", icon: Mail },
                { id: "checklist", label: "Checklist", icon: CheckSquare },
                ...(sessionUser?.role === "admin" 
                  ? [{ id: "maintenance", label: "Manutenção", icon: Shield }] 
                  : [])
              ].map(tab => {
                const Icon = tab.icon;
                const isSelected = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold border-b-2 transition-all whitespace-nowrap cursor-pointer select-none ${
                      isSelected 
                        ? "border-blue-600 text-blue-600 bg-blue-50" 
                        : "border-transparent text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {/* Top Toolbar: Active Domain profile picker and Core Actions */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 border border-slate-200 rounded-2xl shadow-sm">
              
              {/* Domain Switcher */}
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-xs text-slate-500 uppercase tracking-wider font-bold">Analisando:</span>
                <div 
                  className="relative inline-block"
                  onMouseEnter={() => setIsPickerHovered(true)}
                  onMouseLeave={() => setIsPickerHovered(false)}
                >
                  <motion.select
                    key={activeDomainId}
                    initial={{ scale: 0.95, opacity: 0.9 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: "spring", stiffness: 400, damping: 15 }}
                    value={activeDomainId}
                    onChange={(e) => setActiveDomainId(e.target.value)}
                    id="domain_picker"
                    className={`appearance-none bg-slate-50 border rounded-xl px-4 py-1.5 pr-10 text-xs text-slate-800 font-semibold focus:outline-none focus:ring-2 focus:border-transparent cursor-pointer transition-all duration-200 hover:scale-[1.02] focus:scale-[1.02] select-none ${
                      !activeDomain?.latestReport
                        ? "border-red-500 ring-2 ring-red-500/20 hover:border-red-600 focus:ring-red-500/40 shadow-[2px_2px_0px_0px_rgba(239,68,68,1)]"
                        : "border-slate-300 hover:border-slate-400 focus:ring-blue-500/40 focus:shadow-[0_0_0_4px_rgba(59,130,246,0.25)]"
                    }`}
                  >
                    {domains.map(d => {
                      const latest = d.latestReport;
                      const score = latest ? Math.round((latest.scores.performance + latest.scores.accessibility + latest.scores.seo) / 3) : 0;
                      let statusBadge = "";
                      if (latest) {
                        if (score >= 85) statusBadge = " 🟢 [Top Performante]";
                        else statusBadge = " 🟡 [Precisa Atenção]";
                      } else {
                        statusBadge = " ⚪ [Sem Auditoria]";
                      }
                      return (
                        <option key={d.id} value={d.id}>
                          {d.url}{statusBadge}
                        </option>
                      );
                    })}
                  </motion.select>
                  <ChevronDown className="h-4 w-4 text-slate-500 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  
                  {/* Custom Elegant Neo-Brutalist Tooltip with framer-motion */}
                  <AnimatePresence>
                    {isPickerHovered && (
                      <motion.div
                        initial={{ opacity: 0, y: 8, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 8, scale: 0.95 }}
                        transition={{ type: "spring", stiffness: 350, damping: 20 }}
                        className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3.5 z-50 bg-white dark:bg-[#151d30] text-slate-950 dark:text-slate-100 text-[11px] font-extrabold px-3 py-2 rounded-xl whitespace-nowrap shadow-[4px_4px_0px_0px_#0f172a] dark:shadow-[4px_4px_0px_0px_#000000] border-2 border-[#0f172a] dark:border-white pointer-events-none flex items-center gap-1.5"
                      >
                        <Globe className="h-3.5 w-3.5 text-blue-500 animate-pulse" />
                        <span>{activeDomain?.url || "Selecione um domínio"}</span>
                        <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-x-8 border-t-8 border-x-transparent border-t-[#0f172a] dark:border-t-white"></div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Validator Warning Indicator if report is empty */}
                {!activeDomain?.latestReport && (
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="flex items-center gap-1.5 px-2.5 py-1 bg-[#D11A2A] text-concrete-grey border-2 border-black rounded-xl text-[10px] font-bold tracking-wide uppercase whitespace-nowrap animate-pulse shadow-[2px_2px_0px_#000000]">
                      <AlertTriangle className="h-3.5 w-3.5 text-concrete-grey" />
                      <span className="text-concrete-grey">Precisa de Análise</span>
                    </div>

                    <motion.button
                      initial={{ scale: 0.9, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.9, opacity: 0 }}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => {
                        if (activeDomain) {
                          handleAnalyze(undefined, activeDomain.url);
                        }
                      }}
                      className="flex items-center gap-1.5 px-3 py-1 bg-[#fbbf24] hover:bg-[#f59e0b] dark:bg-[#fbbf24] dark:hover:bg-[#fbbf24] text-[#0f172a] font-extrabold text-[10px] uppercase tracking-wider border-2 border-[#0f172a] dark:border-white rounded-xl shadow-[2.5px_2.5px_0px_0px_#0f172a] dark:shadow-[2.5px_2.5px_0px_0px_#000000] cursor-pointer select-none transition-all duration-100"
                    >
                      <Play className="h-3 w-3 fill-current" />
                      <span>Analisar Agora</span>
                    </motion.button>
                  </div>
                )}

                {activeDomain && (
                  (() => {
                    const latest = activeDomain.latestReport;
                    const score = latest ? Math.round((latest.scores.performance + latest.scores.accessibility + latest.scores.seo) / 3) : 0;
                    let badgeBg = "bg-slate-100 text-slate-600 border-slate-200";
                    let statusText = "Sem Auditoria";
                    if (latest) {
                      if (score >= 85) {
                        badgeBg = "bg-emerald-500/10 text-emerald-500 border-emerald-500/20";
                        statusText = "Top Performante";
                      } else {
                        badgeBg = "bg-amber-500/10 text-amber-500 border-amber-500/20";
                        statusText = "Precisa Atenção";
                      }
                    }
                    return (
                      <span className={`px-2.5 py-1 rounded-full border text-[10px] font-bold tracking-wide uppercase whitespace-nowrap ${badgeBg}`}>
                        {statusText}
                      </span>
                    );
                  })()
                )}

                <button
                  onClick={handleGenerateIAComparison}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold transition-all hover:scale-[1.02] active:scale-95 shadow-md shadow-blue-500/10 cursor-pointer whitespace-nowrap"
                  title="Comparar domínios usando inteligência artificial do Gemini"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>Gerar Análise Comparativa IA</span>
                </button>

                {activeDomain && (
                  <button 
                    onClick={() => handleDeleteDomain(activeDomain.id)}
                    title="Excluir Domínio"
                    className="p-1.5 hover:bg-red-50 text-slate-400 hover:text-red-600 rounded-lg transition-colors cursor-pointer"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>

              {/* PDF and CSV Exporters */}
              <div className="flex items-center gap-2">
                <button
                  onClick={handleExportPDF}
                  disabled={!activeDomain?.latestReport}
                  className="bg-white hover:bg-slate-50 disabled:opacity-40 text-slate-700 border border-slate-300 px-4 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer select-none"
                >
                  <FileText className="h-3.5 w-3.5 text-red-500" />
                  Exportar PDF
                </button>
                <button
                  onClick={handleExportCSV}
                  disabled={searchQueries.length === 0}
                  className="bg-white hover:bg-slate-50 disabled:opacity-40 text-slate-700 border border-slate-300 px-4 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer select-none"
                >
                  <Download className="h-3.5 w-3.5 text-emerald-600" />
                  Exportar CSV SEO
                </button>
                <button
                  onClick={handleExportXLSX}
                  disabled={searchQueries.length === 0}
                  className="bg-white hover:bg-slate-50 disabled:opacity-40 text-slate-700 border border-slate-300 px-4 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer select-none"
                >
                  <FileText className="h-3.5 w-3.5 text-emerald-600" />
                  Exportar Excel (.xlsx)
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

                    {/* Painel de Monitoramento Preventivo de Limiar de Métrica */}
                    <div className="bg-white border border-slate-200 shadow-sm rounded-2xl p-6 flex flex-col gap-4 animate-fade-in">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                        <div className="flex items-center gap-3">
                          <div className="bg-blue-50 text-blue-600 p-2.5 rounded-xl flex items-center justify-center border border-blue-100">
                            <Settings className="h-5 w-5" />
                          </div>
                          <div>
                            <h3 className="font-bold text-slate-900 text-base">Monitoramento Preventivo de Métricas</h3>
                            <p className="text-xs text-slate-500">Configure limites mínimos para as pontuações e receba alertas preventivos via notificação flutuante.</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-slate-600">Monitoramento:</span>
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
                              monitorEnabled ? "bg-blue-600" : "bg-slate-200"
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

                      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                        {/* Left column: threshold adjust */}
                        <div className="md:col-span-5 bg-slate-50 border border-slate-150 rounded-xl p-4.5 flex flex-col gap-4">
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs font-bold text-slate-700 flex items-center gap-1">
                                <Smartphone className="h-3.5 w-3.5 text-slate-500" />
                                Limite Móvel (Mobile):
                              </span>
                              <span className="text-xs font-extrabold text-blue-600 font-mono bg-blue-50 px-2.5 py-0.5 border border-blue-100 rounded-full">
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
                              className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600 disabled:opacity-50"
                            />
                          </div>

                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs font-bold text-slate-700 flex items-center gap-1">
                                <Monitor className="h-3.5 w-3.5 text-slate-500" />
                                Limite Desktop:
                              </span>
                              <span className="text-xs font-extrabold text-indigo-600 font-mono bg-indigo-50 px-2.5 py-0.5 border border-indigo-100 rounded-full">
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
                              className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600 disabled:opacity-50"
                            />
                          </div>
                        </div>

                        {/* Middle column: choose metrics to monitor */}
                        <div className="md:col-span-4 flex flex-col gap-2 bg-slate-50 border border-slate-150 rounded-xl p-4.5">
                          <span className="text-xs font-bold text-slate-700 mb-1">Métricas a Monitorar:</span>
                          <div className="flex flex-wrap gap-3">
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
                                      ? "opacity-50 pointer-events-none bg-slate-100 border-slate-200 text-slate-400" 
                                      : isChecked
                                        ? "bg-blue-50 border-blue-200 text-blue-700"
                                        : "bg-white border-slate-200 text-slate-600 hover:border-slate-300"
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
                                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-3.5 w-3.5 cursor-pointer"
                                  />
                                  {met.label}
                                </label>
                              );
                            })}
                          </div>
                        </div>

                        {/* Right column: Current Status */}
                        <div className="md:col-span-3 flex flex-col justify-center h-full border border-slate-200 bg-white rounded-xl p-4.5">
                          <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Status de Conformidade</span>
                          {(() => {
                            if (!monitorEnabled) {
                              return (
                                <div className="mt-2 flex items-center gap-2 text-slate-500 font-semibold text-xs">
                                  <span className="h-2 w-2 rounded-full bg-slate-300"></span>
                                  Inativo
                                </div>
                              );
                            }
                            
                            const report = activeDomain.latestReport;
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
                                <div className="mt-2.5 bg-[#D11A2A] border-2 border-black p-3 rounded-lg shadow-[3px_3px_0px_#000000]">
                                  <div className="flex items-center gap-1.5 text-concrete-grey font-bold text-xs">
                                    <AlertTriangle className="h-4 w-4 text-concrete-grey animate-pulse shrink-0" />
                                    Atenção Requerida ({deviceType === "mobile" ? "Mobile" : "Desktop"})
                                  </div>
                                  <p className="text-[10px] text-concrete-grey font-semibold mt-1 leading-normal">
                                    {alerts.join(", ")} abaixo do limite ({currentThreshold}).
                                  </p>
                                </div>
                              );
                            }

                            return (
                              <div className="mt-2">
                                <div className="flex items-center gap-1.5 text-emerald-600 font-bold text-xs">
                                  <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                                  Conforme ({deviceType === "mobile" ? "Mobile" : "Desktop"})
                                </div>
                                <p className="text-[10px] text-slate-500 mt-1 leading-normal">
                                  Todas as métricas monitoradas estão acima de {currentThreshold}.
                                </p>
                              </div>
                            );
                          })()}
                        </div>
                      </div>
                    </div>

                    {/* Google Search Console - Vínculo Automatizado de Domínios */}
                    <div className="bg-white border border-slate-200 shadow-sm rounded-2xl p-6 flex flex-col gap-4 animate-fade-in">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                        <div className="flex items-center gap-3">
                          <div className="bg-blue-50 text-blue-600 p-2.5 rounded-xl flex items-center justify-center border border-blue-100">
                            <Globe className="h-5 w-5" />
                          </div>
                          <div>
                            <h3 className="font-bold text-slate-900 text-base">Google Search Console - Vínculo Automatizado</h3>
                            <p className="text-xs text-slate-500">Vincule seus domínios à conta ativa do GSC para habilitar auditorias automáticas periódicas de desempenho.</p>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 max-w-full">
                          <span className="text-xs font-semibold text-slate-500">Conta GSC Ativa:</span>
                          <div className="flex flex-wrap items-center gap-2 bg-slate-50 px-3 py-1.5 border border-slate-200 rounded-xl max-w-full">
                            <span className={`h-2 w-2 rounded-full shrink-0 ${googleAccessToken ? "bg-emerald-500" : "bg-amber-500"}`}></span>
                            <span className="text-xs font-bold text-slate-700 truncate max-w-[150px] sm:max-w-xs">{googleEmail || "demonstracao@gmail.com"}</span>
                            {googleAccessToken ? (
                              <button
                                onClick={handleDisconnectGoogle}
                                className="text-[10px] text-red-600 hover:text-red-700 font-bold ml-1 border-l border-slate-200 pl-2 cursor-pointer shrink-0"
                              >
                                Desconectar
                              </button>
                            ) : (
                              <button
                                onClick={handleConnectGoogle}
                                className="text-[10px] text-blue-600 hover:text-blue-700 font-bold ml-1 border-l border-slate-200 pl-2 cursor-pointer flex items-center gap-0.5 shrink-0"
                              >
                                <Sparkles className="h-2.5 w-2.5" />
                                Integrar Conta
                              </button>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Domain Grid for GSC Binding */}
                      <div className="space-y-3">
                        <span className="text-xs font-bold text-slate-700 block">Gerenciar Vínculos de Domínio:</span>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {domains.map((dom) => {
                            const isLinked = dom.googleConnected;
                            return (
                              <div
                                key={dom.id}
                                className={`p-4 border rounded-xl flex flex-col xl:flex-row justify-between xl:items-center gap-4 transition-all ${
                                  isLinked 
                                    ? "bg-gradient-to-r from-blue-50/40 to-indigo-50/40 border-blue-200 shadow-sm" 
                                    : "bg-slate-50/50 border-slate-200 hover:border-slate-300"
                                }`}
                              >
                                <div className="space-y-2 flex-1 min-w-0 w-full">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span className="text-xs font-bold text-slate-800 truncate block max-w-full">{dom.url}</span>
                                    {isLinked ? (
                                      <span className="px-2 py-0.5 rounded text-[9px] font-extrabold uppercase bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-0.5 shrink-0">
                                        <Check className="h-2.5 w-2.5" /> Ativo GSC
                                      </span>
                                    ) : (
                                      <span className="px-2 py-0.5 rounded text-[9px] font-extrabold uppercase bg-slate-100 text-slate-500 border border-slate-200 shrink-0">
                                        Inativo
                                      </span>
                                    )}
                                  </div>

                                  {/* Automated test configurations for this domain */}
                                  <div className="flex flex-wrap items-center gap-3">
                                    <div className="flex items-center gap-1.5">
                                      <span className="text-[10px] text-slate-400 font-semibold shrink-0">Testar em:</span>
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
                                        className="bg-white border border-slate-200 rounded px-1.5 py-0.5 text-[10px] text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50 cursor-pointer"
                                      >
                                        <option value="desktop">Desktop</option>
                                        <option value="mobile">Mobile</option>
                                      </select>
                                    </div>

                                    <div className="flex items-center gap-1.5">
                                      <span className="text-[10px] text-slate-400 font-semibold shrink-0">Verificação:</span>
                                      <span className={`text-[10px] font-bold shrink-0 ${isLinked ? "text-blue-600" : "text-slate-400"}`}>
                                        {isLinked ? "Automatizada" : "Manual"}
                                      </span>
                                    </div>
                                  </div>
                                </div>

                                {/* Actions container: Binding Switch & Excluir Button */}
                                <div className="flex items-center gap-2 self-end xl:self-auto shrink-0">
                                  <button
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
                                    className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all border cursor-pointer shrink-0 ${
                                      isLinked
                                        ? "bg-red-50 hover:bg-red-100 text-red-700 border-red-200"
                                        : "bg-blue-600 hover:bg-blue-500 text-white border-blue-700 shadow-sm"
                                    }`}
                                  >
                                    {isLinked ? "Desvincular" : "Vincular"}
                                  </button>

                                  <button
                                    onClick={() => {
                                      handleDeleteDomain(dom.id);
                                    }}
                                    title="Excluir Domínio e Vínculo"
                                    className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 border border-slate-200 hover:border-red-200 rounded-lg transition-all cursor-pointer flex items-center justify-center bg-white shadow-sm shrink-0"
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
                    <div className="bg-white border border-slate-200 shadow-sm rounded-2xl p-6 flex flex-col gap-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-4">
                        <div className="flex items-center gap-2.5">
                          <div className="bg-gradient-to-tr from-purple-500 to-indigo-600 text-white p-2 rounded-xl flex items-center justify-center shadow-md shadow-indigo-500/10">
                            <Sparkles className="h-4.5 w-4.5" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-bold text-slate-900 text-base">Dicas Rápidas de SEO</h3>
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-100 uppercase tracking-wide font-mono">IA Gemini 2026</span>
                            </div>
                            <p className="text-xs text-slate-500">Sugestões cirúrgicas de meta tags e estrutura baseadas nas últimas tendências de busca do Google</p>
                          </div>
                        </div>
                        <button
                          onClick={() => fetchQuickTips(activeDomain.url, activeDomain.latestReport?.title, activeDomain.latestReport?.description)}
                          disabled={isLoadingQuickTips}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 border border-slate-200 hover:bg-slate-100 disabled:opacity-50 rounded-xl text-xs font-semibold text-slate-700 cursor-pointer transition-all self-start sm:self-center"
                        >
                          <RefreshCw className={`h-3.5 w-3.5 ${isLoadingQuickTips ? 'animate-spin text-indigo-600' : 'text-slate-500'}`} />
                          Atualizar Dicas
                        </button>
                      </div>

                      {/* Error or Loading or Content State */}
                      {isLoadingQuickTips ? (
                        <div className="space-y-4 py-3 animate-pulse">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <div className="h-4 bg-slate-100 rounded w-1/3"></div>
                              <div className="h-10 bg-slate-100/70 rounded w-full"></div>
                              <div className="h-14 bg-slate-100/70 rounded w-full"></div>
                            </div>
                            <div className="space-y-3">
                              <div className="h-4 bg-slate-100 rounded w-1/4"></div>
                              <div className="flex gap-2">
                                <div className="h-7 bg-slate-100 rounded-full w-20"></div>
                                <div className="h-7 bg-slate-100 rounded-full w-24"></div>
                                <div className="h-7 bg-slate-100 rounded-full w-28"></div>
                              </div>
                              <div className="h-16 bg-slate-100/70 rounded w-full"></div>
                            </div>
                          </div>
                          <div className="h-16 bg-slate-100/50 rounded w-full"></div>
                        </div>
                      ) : quickTipsError ? (
                        <div className="bg-[#D11A2A] border-2 border-black text-concrete-grey rounded-xl p-4 flex items-start gap-3 shadow-[4px_4px_0px_#000000]">
                          <AlertTriangle className="h-5 w-5 text-concrete-grey flex-shrink-0 mt-0.5 animate-bounce" />
                          <div className="flex-1">
                            <p className="text-xs font-bold text-concrete-grey">Falha ao obter dicas de SEO da IA Gemini</p>
                            <p className="text-xs text-concrete-grey/95 mt-1 leading-relaxed">{quickTipsError}</p>
                            <button
                              onClick={() => fetchQuickTips(activeDomain.url, activeDomain.latestReport?.title, activeDomain.latestReport?.description)}
                              className="mt-3 px-3 py-1.5 bg-[#184A90] hover:bg-[#184A90]/90 text-concrete-grey font-bold text-[11px] rounded-lg transition-all border-2 border-black shadow-[2px_2px_0px_#000000] active:translate-x-[0.5px] active:translate-y-[0.5px] active:shadow-[1px_1px_0px_#000000]"
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
                            <div className="lg:col-span-7 flex flex-col gap-4 bg-slate-50/50 border border-slate-150 rounded-2xl p-5">
                              <div className="flex items-center gap-2">
                                <Lightbulb className="h-4.5 w-4.5 text-amber-500" />
                                <h4 className="text-xs uppercase tracking-wider font-bold text-slate-700">Meta Tags Propostas</h4>
                              </div>

                              <div className="space-y-4">
                                {/* Title Tag */}
                                <div className="space-y-1">
                                  <div className="flex items-center justify-between">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Título de SEO Sugerido</label>
                                    <span className={`text-[10px] font-mono font-bold ${quickTips.suggestedMeta?.title?.length <= 60 ? 'text-emerald-600' : 'text-amber-500'}`}>
                                      {quickTips.suggestedMeta?.title?.length || 0} / 60 caracteres
                                    </span>
                                  </div>
                                  <div className="flex gap-2">
                                    <div className="flex-1 bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 leading-snug select-all">
                                      {quickTips.suggestedMeta?.title}
                                    </div>
                                    <button
                                      onClick={() => handleCopy(quickTips.suggestedMeta?.title, 'title')}
                                      className="p-2.5 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl text-slate-500 hover:text-slate-800 cursor-pointer transition-colors shrink-0 flex items-center justify-center self-start"
                                      title="Copiar Título"
                                    >
                                      {copiedType === 'title' ? (
                                        <Check className="h-4 w-4 text-emerald-500" />
                                      ) : (
                                        <Copy className="h-4 w-4" />
                                      )}
                                    </button>
                                  </div>
                                </div>

                                {/* Meta Description */}
                                <div className="space-y-1">
                                  <div className="flex items-center justify-between">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Meta Description Sugerida</label>
                                    <span className={`text-[10px] font-mono font-bold ${quickTips.suggestedMeta?.description?.length <= 160 ? 'text-emerald-600' : 'text-amber-500'}`}>
                                      {quickTips.suggestedMeta?.description?.length || 0} / 160 caracteres
                                    </span>
                                  </div>
                                  <div className="flex gap-2">
                                    <div className="flex-1 bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-700 leading-relaxed select-all">
                                      {quickTips.suggestedMeta?.description}
                                    </div>
                                    <button
                                      onClick={() => handleCopy(quickTips.suggestedMeta?.description, 'desc')}
                                      className="p-2.5 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl text-slate-500 hover:text-slate-800 cursor-pointer transition-colors shrink-0 flex items-center justify-center self-start"
                                      title="Copiar Descrição"
                                    >
                                      {copiedType === 'desc' ? (
                                        <Check className="h-4 w-4 text-emerald-500" />
                                      ) : (
                                        <Copy className="h-4 w-4" />
                                      )}
                                    </button>
                                  </div>
                                </div>

                                {/* Reasoning box */}
                                <div className="bg-indigo-50/50 border border-indigo-100/50 rounded-xl p-3.5 text-xs text-indigo-950 font-medium leading-relaxed">
                                  <span className="font-bold text-indigo-800 block text-[10px] uppercase tracking-wider mb-1 font-mono">Por que estas Meta Tags?</span>
                                  {quickTips.suggestedMeta?.reason}
                                </div>
                              </div>
                            </div>

                            {/* Right: Keywords & Google Algorithm trends context */}
                            <div className="lg:col-span-5 flex flex-col gap-4 bg-slate-50/50 border border-slate-150 rounded-2xl p-5 justify-between">
                              <div className="space-y-4">
                                <div className="flex items-center gap-2">
                                  <Target className="h-4.5 w-4.5 text-indigo-500" />
                                  <h4 className="text-xs uppercase tracking-wider font-bold text-slate-700">Palavras-chave em Alta (2026)</h4>
                                </div>
                                <div className="flex flex-wrap gap-1.5">
                                  {quickTips.trendingKeywords?.map((keyword: string, idx: number) => (
                                    <span key={idx} className="inline-flex items-center gap-1 px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700">
                                      <TrendingUp className="h-3 w-3 text-emerald-500" />
                                      {keyword}
                                    </span>
                                  ))}
                                </div>
                              </div>

                              <div className="border-t border-slate-200 pt-4 space-y-2">
                                <div className="flex items-center gap-2">
                                  <Globe className="h-4 w-4 text-blue-500" />
                                  <h4 className="text-xs uppercase tracking-wider font-bold text-slate-700">Tendências do Algoritmo</h4>
                                </div>
                                <p className="text-xs text-slate-600 font-medium leading-relaxed">
                                  {quickTips.searchTrendsContext}
                                </p>
                              </div>
                            </div>

                          </div>

                          {/* Content structure suggestions */}
                          <div className="bg-slate-50/50 border border-slate-150 rounded-2xl p-5 flex flex-col gap-4">
                            <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2">
                              <div className="flex items-center gap-2">
                                <Globe className="h-4.5 w-4.5 text-emerald-500" />
                                <h4 className="text-xs uppercase tracking-wider font-bold text-slate-700">Estrutura de Conteúdo Recomendada para Indexação</h4>
                              </div>
                              {(() => {
                                const total = quickTips.contentStructure?.length || 0;
                                const done = (quickTips.contentStructure || []).filter((item: any) => {
                                  const key = `${activeDomainId}-${item.section}-${item.suggestion}`;
                                  return !!implementedTips[key];
                                }).length;
                                if (total > 0) {
                                  return (
                                    <span className="text-[10px] bg-slate-100 text-slate-600 font-bold px-2 py-0.5 rounded-full font-mono">
                                      {done}/{total} Concluídos
                                    </span>
                                  );
                                }
                                return null;
                              })()}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                              {(() => {
                                const sortedStructure = [...(quickTips.contentStructure || [])].sort((a, b) => {
                                  const keyA = `${activeDomainId}-${a.section}-${a.suggestion}`;
                                  const keyB = `${activeDomainId}-${b.section}-${b.suggestion}`;
                                  const isAImplemented = !!implementedTips[keyA];
                                  const isBImplemented = !!implementedTips[keyB];
                                  if (isAImplemented && !isBImplemented) return 1;
                                  if (!isAImplemented && isBImplemented) return -1;
                                  return 0;
                                });

                                return sortedStructure.map((item: any, idx: number) => {
                                  const key = `${activeDomainId}-${item.section}-${item.suggestion}`;
                                  const isImplemented = !!implementedTips[key];

                                  return (
                                    <div
                                      key={idx}
                                      className={`border rounded-xl p-4 flex flex-col justify-between gap-3 transition-all duration-300 ${
                                        isImplemented
                                          ? "bg-emerald-50/40 border-emerald-200/50 opacity-75 shadow-sm"
                                          : "bg-white border-slate-200 hover:border-slate-300 shadow-sm"
                                      }`}
                                    >
                                      <div>
                                        <div className="flex items-start justify-between gap-2">
                                          <span className={`text-[10px] font-bold uppercase tracking-wider font-mono ${isImplemented ? 'text-emerald-700' : 'text-indigo-600'}`}>
                                            {item.section}
                                          </span>
                                          <label className="flex items-center gap-1 cursor-pointer select-none">
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
                                              className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 h-3.5 w-3.5 cursor-pointer"
                                            />
                                            <span className="text-[10px] font-bold text-slate-500 font-mono">Feito</span>
                                          </label>
                                        </div>
                                        <h5 className={`text-xs font-bold mt-1 leading-snug ${isImplemented ? 'text-slate-400 line-through' : 'text-slate-800'}`}>
                                          {item.suggestion}
                                        </h5>
                                      </div>
                                      <div className={`rounded-lg p-2.5 text-[11px] font-mono transition-all ${
                                        isImplemented
                                          ? "bg-emerald-100/10 border border-emerald-100/50 text-slate-500"
                                          : "bg-slate-50 border border-slate-100 text-slate-600"
                                      }`}>
                                        <span className="text-[9px] font-bold text-slate-400 block uppercase mb-1 font-sans">
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
                        <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                          <p className="text-sm text-slate-500">Nenhum dado de otimização disponível.</p>
                          <button
                            onClick={() => fetchQuickTips(activeDomain.url, activeDomain.latestReport?.title, activeDomain.latestReport?.description)}
                            className="mt-3 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer transition-all"
                          >
                            Gerar Dicas com Gemini
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Meta Header Information */}
                    <div className="bg-white border border-slate-200 shadow-sm rounded-2xl p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <h4 className="text-xs uppercase tracking-wider font-bold text-blue-600 mb-2">Informações Metadados</h4>
                        <div className="space-y-3">
                          <div>
                            <span className="text-xs text-slate-400 block font-semibold">Título do Site (&lt;title&gt;)</span>
                            <span className="text-sm text-slate-800 font-semibold">{activeDomain.latestReport.title || "Não identificado"}</span>
                          </div>
                          <div>
                            <span className="text-xs text-slate-400 block font-semibold">Descrição Meta (meta description)</span>
                            <span className="text-sm text-slate-600 font-medium line-clamp-2 leading-relaxed">{activeDomain.latestReport.description || "Nenhuma meta descrição cadastrada!"}</span>
                          </div>
                        </div>
                      </div>

                      <div>
                        <h4 className="text-xs uppercase tracking-wider font-bold text-blue-600 mb-2">Métricas de Tamanho & Rede</h4>
                        
                        <div className="space-y-3.5">
                          {/* Tamanho da Página */}
                          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                            <div className="flex items-center justify-between mb-1.5">
                              <span className="text-xs font-bold text-slate-700">Tamanho da Página</span>
                              <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-lg uppercase ${
                                activeDomain.latestReport.performance.pageSizeKb <= 1500
                                  ? "bg-emerald-100 text-emerald-800"
                                  : activeDomain.latestReport.performance.pageSizeKb <= 3500
                                  ? "bg-amber-100 text-amber-800"
                                  : "bg-red-100 text-red-800"
                              }`}>
                                {activeDomain.latestReport.performance.pageSizeKb <= 1500 ? "Ideal" : activeDomain.latestReport.performance.pageSizeKb <= 3500 ? "Aceitável" : "Crítico"}
                              </span>
                            </div>
                            <div className="grid grid-cols-3 gap-2 text-center mt-2 pt-2 border-t border-slate-200/50">
                              <div>
                                <span className="text-[9px] text-slate-400 block uppercase font-mono font-bold">Atual</span>
                                <span className="text-sm font-extrabold text-slate-900">{activeDomain.latestReport.performance.pageSizeKb} KB</span>
                              </div>
                              <div>
                                <span className="text-[9px] text-slate-400 block uppercase font-mono font-bold">Ideal</span>
                                <span className="text-xs font-semibold text-emerald-600">&lt; 1500 KB</span>
                              </div>
                              <div>
                                <span className="text-[9px] text-slate-400 block uppercase font-mono font-bold">Limite Aceitável</span>
                                <span className="text-xs font-semibold text-amber-600">&lt; 3500 KB</span>
                              </div>
                            </div>
                          </div>

                          {/* Requisições HTTP */}
                          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                            <div className="flex items-center justify-between mb-1.5">
                              <span className="text-xs font-bold text-slate-700">Requisições HTTP</span>
                              <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-lg uppercase ${
                                activeDomain.latestReport.performance.requestCount <= 40
                                  ? "bg-emerald-100 text-emerald-800"
                                  : activeDomain.latestReport.performance.requestCount <= 80
                                  ? "bg-amber-100 text-amber-800"
                                  : "bg-red-100 text-red-800"
                              }`}>
                                {activeDomain.latestReport.performance.requestCount <= 40 ? "Ideal" : activeDomain.latestReport.performance.requestCount <= 80 ? "Aceitável" : "Crítico"}
                              </span>
                            </div>
                            <div className="grid grid-cols-3 gap-2 text-center mt-2 pt-2 border-t border-slate-200/50">
                              <div>
                                <span className="text-[9px] text-slate-400 block uppercase font-mono font-bold">Atual</span>
                                <span className="text-sm font-extrabold text-slate-900">{activeDomain.latestReport.performance.requestCount}</span>
                              </div>
                              <div>
                                <span className="text-[9px] text-slate-400 block uppercase font-mono font-bold">Ideal</span>
                                <span className="text-xs font-semibold text-emerald-600">&lt; 40</span>
                              </div>
                              <div>
                                <span className="text-[9px] text-slate-400 block uppercase font-mono font-bold">Limite Aceitável</span>
                                <span className="text-xs font-semibold text-amber-600">&lt; 80</span>
                              </div>
                            </div>
                          </div>

                          {/* Tempo de Carregamento */}
                          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                            <div className="flex items-center justify-between mb-1.5">
                              <span className="text-xs font-bold text-slate-700">Tempo de Carregamento</span>
                              <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-lg uppercase ${
                                activeDomain.latestReport.performance.loadTimeSeconds <= 2.0
                                  ? "bg-emerald-100 text-emerald-800"
                                  : activeDomain.latestReport.performance.loadTimeSeconds <= 4.5
                                  ? "bg-amber-100 text-amber-800"
                                  : "bg-red-100 text-red-800"
                              }`}>
                                {activeDomain.latestReport.performance.loadTimeSeconds <= 2.0 ? "Ideal" : activeDomain.latestReport.performance.loadTimeSeconds <= 4.5 ? "Aceitável" : "Crítico"}
                              </span>
                            </div>
                            <div className="grid grid-cols-3 gap-2 text-center mt-2 pt-2 border-t border-slate-200/50">
                              <div>
                                <span className="text-[9px] text-slate-400 block uppercase font-mono font-bold">Atual</span>
                                <span className="text-sm font-extrabold text-slate-900">{activeDomain.latestReport.performance.loadTimeSeconds}s</span>
                              </div>
                              <div>
                                <span className="text-[9px] text-slate-400 block uppercase font-mono font-bold">Ideal</span>
                                <span className="text-xs font-semibold text-emerald-600">&lt; 2.0s</span>
                              </div>
                              <div>
                                <span className="text-[9px] text-slate-400 block uppercase font-mono font-bold">Limite Aceitável</span>
                                <span className="text-xs font-semibold text-amber-600">&lt; 4.5s</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="mt-3 flex items-center gap-2 text-xs text-slate-500 font-mono bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100">
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 flex-shrink-0" />
                          Metodologia: {activeDomain.latestReport.method}
                        </div>
                      </div>
                    </div>

                    {/* Detailed Recommendations with Accordion issues */}
                    <div className="bg-white border border-slate-200 shadow-sm rounded-2xl p-6">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-bold text-slate-900">Problemas Encontrados & Correções de Código</h3>
                        <span className="text-xs text-slate-400 font-medium">Clique para abrir soluções técnicas</span>
                      </div>

                      <div className="space-y-4">
                        {[
                          { category: "Performance", issues: activeDomain.latestReport.performance.issues },
                          { category: "Acessibilidade", issues: activeDomain.latestReport.accessibility.issues },
                          { category: "SEO", issues: activeDomain.latestReport.seo.issues }
                        ].map((catGroup, idx) => (
                          <div key={idx} className="border-b border-slate-100 last:border-0 pb-4 last:pb-0">
                            <h4 className="text-sm font-bold text-slate-700 uppercase tracking-wide mb-3 flex items-center gap-2">
                              <span className="h-2 w-2 rounded-full bg-blue-600"></span>
                              {catGroup.category} ({catGroup.issues.length})
                            </h4>

                            {catGroup.issues.length === 0 ? (
                              <p className="text-xs text-slate-400 italic pl-3">Nenhum problema encontrado nesta categoria. Excelente trabalho!</p>
                            ) : (
                              <div className="space-y-2.5">
                                {catGroup.issues.map((issue, issueIdx) => {
                                  const isExpanded = !!expandedIssues[issue.title];
                                  
                                  // Determine visual styles for severity
                                  let detailsBg = "bg-blue-50/70 border-l-4 border-blue-500 text-blue-950";
                                  if (issue.severity === "critical") {
                                    detailsBg = "bg-red-50/80 border-l-4 border-red-500 text-red-950";
                                  } else if (issue.severity === "warning") {
                                    detailsBg = "bg-amber-50/80 border-l-4 border-amber-500 text-amber-950";
                                  }

                                  return (
                                    <div 
                                      key={issueIdx} 
                                      className="bg-slate-50/40 border border-slate-200 hover:border-slate-300 rounded-xl overflow-hidden transition-all"
                                    >
                                      {/* Header trigger */}
                                      <button
                                        onClick={() => toggleIssue(issue.title)}
                                        className="w-full text-left px-4 py-3 flex items-start justify-between gap-3 cursor-pointer select-none"
                                      >
                                        <div className="flex items-center gap-3 flex-wrap">
                                          {getSeverityBadge(issue.severity)}
                                          <span className="text-sm font-bold text-slate-800">{issue.title}</span>
                                          {issue.severity === "critical" && (
                                            <span
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                setSelectedGSCExplain({
                                                  issueTitle: issue.title,
                                                  issueCategory: catGroup.category,
                                                  issueDetails: issue.details,
                                                  domain: activeDomain.url
                                                });
                                              }}
                                              className="inline-flex items-center gap-1 px-2.5 py-0.5 text-[10px] font-extrabold bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white rounded-md transition-all hover:scale-105 active:scale-95 shadow-sm shadow-indigo-500/10 cursor-pointer select-none"
                                              title="Verificar interpretação do Google Search Console"
                                            >
                                              <Sparkles className="h-2.5 w-2.5 text-white animate-pulse" />
                                              <span>IA / GSC</span>
                                            </span>
                                          )}
                                        </div>
                                        {isExpanded ? (
                                          <ChevronDown className="h-4 w-4 text-slate-400 mt-0.5 flex-shrink-0" />
                                        ) : (
                                          <ChevronRight className="h-4 w-4 text-slate-400 mt-0.5 flex-shrink-0" />
                                        )}
                                      </button>

                                      {/* Expandable details and code */}
                                      {isExpanded && (
                                        <div className={`px-4 pb-4 border-t border-slate-200 bg-white text-xs space-y-4 pt-3 animate-slide-down`}>
                                          <div className={`p-4 rounded-xl ${detailsBg}`}>
                                            <span className="uppercase tracking-wider font-mono block text-[10px] font-bold mb-1 opacity-70">O que está acontecendo:</span>
                                            <p className="leading-relaxed font-sans font-medium">{issue.details}</p>
                                          </div>

                                          <div className="p-4 bg-emerald-50 border-l-4 border-emerald-500 rounded-xl text-emerald-950">
                                            <span className="uppercase tracking-wider font-mono block text-[10px] font-bold mb-1 text-emerald-800">Sugestão Técnica de Correção:</span>
                                            <p className="leading-relaxed font-sans font-semibold">{issue.suggestion}</p>
                                          </div>

                                          {issue.codeSnippet && (
                                            <div>
                                              <span className="text-slate-400 uppercase tracking-wider font-mono block text-[10px] font-bold mb-1.5 pl-1">Exemplo de Código Corretivo:</span>
                                              <pre className="p-4 bg-slate-900 text-emerald-400 font-mono text-[11px] overflow-x-auto border border-slate-800 rounded-xl">
                                                <code>{issue.codeSnippet}</code>
                                              </pre>
                                            </div>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* General Summary / Tips */}
                    <div className="bg-white border border-slate-200 shadow-sm rounded-2xl p-6">
                      <h3 className="text-base font-bold text-slate-900 mb-3 flex items-center gap-2">
                        <Info className="h-4 w-4 text-blue-600" />
                        Próximos Passos Recomendados
                      </h3>
                      <ul className="space-y-2 text-xs text-slate-600 pl-6 list-decimal leading-relaxed font-medium">
                        {activeDomain.latestReport.generalSuggestions.map((tip, i) => (
                          <li key={i}>{tip}</li>
                        ))}
                      </ul>
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
                  (() => {
                    const filteredHistory = activeDomain.reportsHistory.filter(historyPoint => {
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
                                  Mostrando <strong>{filteredHistory.length}</strong> de <strong>{activeDomain.reportsHistory.length}</strong>
                                </span>
                              ) : (
                                <span>
                                  Total: <strong>{activeDomain.reportsHistory.length}</strong> auditorias
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
                                            <div className="w-14 h-10 rounded border border-slate-700 bg-slate-950 overflow-hidden relative shadow-sm flex-shrink-0">
                                              {/* Fake browser bar */}
                                              <div className="bg-slate-900 h-2.5 w-full flex items-center px-1 gap-0.5 border-b border-slate-800">
                                                <span className="w-1 h-1 rounded-full bg-red-500 block"></span>
                                                <span className="w-1 h-1 rounded-full bg-yellow-500 block"></span>
                                                <span className="w-1 h-1 rounded-full bg-green-500 block"></span>
                                                <div className="bg-slate-950 rounded-sm h-1.5 flex-1 mx-1 flex items-center px-1">
                                                  <span className="text-[3.5px] text-slate-600 truncate font-mono scale-[0.8] block origin-left">{activeDomain.url}</span>
                                                </div>
                                              </div>
                                              {/* CSS Site Mock layout */}
                                              <div className="p-1 h-full flex flex-col gap-0.5 bg-slate-950">
                                                <div className="flex justify-between items-center">
                                                  <div className="h-1 w-3 bg-blue-500/80 rounded-[1px]"></div>
                                                  <div className="h-0.5 w-1 bg-slate-700 rounded-[1px]"></div>
                                                </div>
                                                {/* Hero banner representing screenshot style */}
                                                <div className="h-2.5 w-full bg-gradient-to-r from-blue-900/40 via-purple-900/40 to-slate-900/40 rounded-[1px] flex items-center justify-center p-0.5 border border-slate-800/30">
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
                                            <span className="text-amber-500 text-xs font-semibold font-bold">Otimizável</span>
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
                  })()
                ) : (
                  <p className="text-slate-400">Nenhum domínio cadastrado para histórico.</p>
                )}
              </div>
            )}

            {/* TAB 3: COMPARISON DASHBOARD */}
            {activeTab === "compare" && (
              <div className="flex flex-col gap-6 animate-fade-in">
                {domains.length < 2 ? (
                  <div className="bg-slate-950/40 p-12 text-center rounded-2xl border border-slate-800">
                    <HelpCircle className="h-12 w-12 text-slate-500 mx-auto mb-4" />
                    <p className="text-slate-300 font-medium">É necessário ter pelo menos 2 domínios cadastrados para realizar comparações.</p>
                    <p className="text-slate-500 text-xs mt-1">Use a barra de pesquisa acima para auditar outro site (ex: google.com) e depois retorne a este painel!</p>
                  </div>
                ) : (
                  <>
                    {/* Domain Selectors */}
                    <div className="flex flex-col gap-4 bg-slate-950/50 p-6 border border-slate-800 rounded-2xl">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-2">Domínio de Referência</label>
                          <select
                            value={compareSourceId}
                            onChange={(e) => setCompareSourceId(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
                          >
                            {domains.map(d => (
                              <option key={d.id} value={d.id}>{d.url}</option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-2">Domínio Comparador</label>
                          <select
                            value={compareTargetId}
                            onChange={(e) => setCompareTargetId(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
                          >
                            {domains.map(d => (
                              <option key={d.id} value={d.id}>{d.url}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {compareSourceId && compareTargetId && (
                        <div className="flex justify-end pt-3 border-t border-slate-800/60 mt-1">
                          <button
                            onClick={handleExportComparePDF}
                            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold transition-all hover:scale-[1.02] active:scale-95 shadow-md shadow-blue-500/15 cursor-pointer"
                          >
                            <FileText className="h-4 w-4" />
                            <span>Exportar Análise Comparativa (PDF)</span>
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Correlação de Performance vs SEO (Scatter Plot) */}
                    <div className={`border rounded-2xl p-6 shadow-sm transition-colors duration-200 ${
                      isDarkMode ? "bg-slate-900 border-slate-800 text-white" : "bg-white border-slate-200 text-slate-900"
                    }`}>
                      <div className="flex items-center gap-2 mb-2">
                        <TrendingUp className="h-5 w-5 text-blue-500" />
                        <h3 className="text-base font-bold">Matriz de Correlação: Performance vs. SEO</h3>
                      </div>
                      <p className={`text-xs ${isDarkMode ? "text-slate-400" : "text-slate-500"} mb-6 font-medium`}>
                        Gráfico de dispersão mostrando o posicionamento de cada domínio em relação às suas notas de Performance (Eixo X) e SEO (Eixo Y). Quanto mais próximo do canto superior direito (100, 100), melhor otimizado está o domínio.
                      </p>

                      <div className="h-[320px] w-full font-mono text-xs">
                        <ResponsiveContainer width="100%" height="100%">
                          <ScatterChart margin={{ top: 20, right: 30, bottom: 20, left: 10 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke={isDarkMode ? "#334155" : "#e2e8f0"} />
                            <XAxis
                              type="number"
                              dataKey="performance"
                              name="Performance"
                              unit=""
                              domain={[0, 100]}
                              stroke={isDarkMode ? "#94a3b8" : "#64748b"}
                              label={{ value: 'Nota de Performance', position: 'insideBottom', offset: -5, fill: isDarkMode ? "#94a3b8" : "#64748b" }}
                            />
                            <YAxis
                              type="number"
                              dataKey="seo"
                              name="SEO"
                              unit=""
                              domain={[0, 100]}
                              stroke={isDarkMode ? "#94a3b8" : "#64748b"}
                              label={{ value: 'Nota de SEO', angle: -90, position: 'insideLeft', offset: 0, fill: isDarkMode ? "#94a3b8" : "#64748b" }}
                            />
                            <ZAxis type="number" range={[100, 100]} />
                            <Tooltip
                              cursor={{ strokeDasharray: '3 3' }}
                              content={({ active, payload }) => {
                                if (active && payload && payload.length) {
                                  const data = payload[0].payload;
                                  return (
                                    <div className={`p-3 rounded-xl border shadow-xl ${isDarkMode ? "bg-slate-950 border-slate-800 text-slate-100" : "bg-white border-slate-200 text-slate-900"}`}>
                                      <p className="font-bold text-xs mb-1.5 border-b pb-1 font-sans border-slate-800/20">{data.name}</p>
                                      <p className="text-[11px] font-mono">⚡ Performance: <span className="font-bold text-blue-500">{data.performance}</span></p>
                                      <p className="text-[11px] font-mono">🔍 SEO: <span className="font-bold text-emerald-500">{data.seo}</span></p>
                                    </div>
                                  );
                                }
                                return null;
                              }}
                            />
                            <Scatter
                              name="Domínios"
                              data={domains
                                .filter(d => d.latestReport)
                                .map(d => ({
                                  name: d.url,
                                  performance: d.latestReport!.scores.performance,
                                  seo: d.latestReport!.scores.seo,
                                }))}
                              fill="#3b82f6"
                            />
                          </ScatterChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    {/* Side by side comparison cards */}
                    {compareSourceId && compareTargetId && (
                      (() => {
                        const source = domains.find(d => d.id === compareSourceId);
                        const target = domains.find(d => d.id === compareTargetId);

                        if (!source?.latestReport || !target?.latestReport) {
                          return (
                            <p className="text-slate-400 text-center py-6">Certifique-se de que ambos os domínios possuem relatórios gerados.</p>
                          );
                        }

                        const sReport = source.latestReport;
                        const tReport = target.latestReport;

                        const sStats = getConsecutiveStats(source?.reportsHistory);
                        const tStats = getConsecutiveStats(target?.reportsHistory);

                        return (
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            
                            {/* Trend and Consecutive Audits Average Section */}
                            <div className="md:col-span-3 bg-slate-950/60 border border-slate-800 rounded-2xl p-6">
                              <h3 className="text-base font-bold text-white mb-1">Tendência Histórica & Médias de Auditoria</h3>
                              <p className="text-xs text-slate-400 mb-4 font-medium">Média das notas gerais de até 3 auditorias consecutivas e indicador de tendência de melhoria</p>
                              
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {/* Source Domain */}
                                <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-xl flex items-center justify-between font-sans">
                                  <div>
                                    <span className="text-[10px] text-slate-500 uppercase tracking-wide font-mono block">Média de 3 Auditorias ({source?.url})</span>
                                    <span className="text-xl font-bold text-white mt-1 block font-mono">{sStats.avg} <span className="text-xs text-slate-500 font-sans">/ 100</span></span>
                                  </div>
                                  
                                  <div className="text-right">
                                    <span className="text-[10px] text-slate-500 uppercase tracking-wide font-mono block">Tendência</span>
                                    {sStats.trend === "up" && (
                                      <span className="inline-flex items-center gap-1 text-emerald-500 text-xs font-bold font-mono mt-1 px-2.5 py-1 bg-emerald-500/10 rounded-full border border-emerald-500/20">
                                        ↑ Melhoria (+{sStats.diff})
                                      </span>
                                    )}
                                    {sStats.trend === "down" && (
                                      <span className="inline-flex items-center gap-1 text-red-400 text-xs font-bold font-mono mt-1 px-2.5 py-1 bg-red-400/10 rounded-full border border-red-400/20">
                                        ↓ Queda ({sStats.diff})
                                      </span>
                                    )}
                                    {sStats.trend === "stable" && (
                                      <span className="inline-flex items-center gap-1 text-slate-400 text-xs font-bold font-mono mt-1 px-2.5 py-1 bg-slate-400/10 rounded-full border border-slate-400/20">
                                        → Estável (0)
                                      </span>
                                    )}
                                    {sStats.trend === "none" && (
                                      <span className="text-xs text-slate-500 font-mono mt-1 block">Insuficiente</span>
                                    )}
                                  </div>
                                </div>

                                {/* Target Domain */}
                                <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-xl flex items-center justify-between font-sans">
                                  <div>
                                    <span className="text-[10px] text-slate-500 uppercase tracking-wide font-mono block">Média de 3 Auditorias ({target?.url})</span>
                                    <span className="text-xl font-bold text-purple-400 mt-1 block font-mono">{tStats.avg} <span className="text-xs text-slate-500 font-sans">/ 100</span></span>
                                  </div>
                                  
                                  <div className="text-right">
                                    <span className="text-[10px] text-slate-500 uppercase tracking-wide font-mono block">Tendência</span>
                                    {tStats.trend === "up" && (
                                      <span className="inline-flex items-center gap-1 text-emerald-500 text-xs font-bold font-mono mt-1 px-2.5 py-1 bg-emerald-500/10 rounded-full border border-emerald-500/20">
                                        ↑ Melhoria (+{tStats.diff})
                                      </span>
                                    )}
                                    {tStats.trend === "down" && (
                                      <span className="inline-flex items-center gap-1 text-red-400 text-xs font-bold font-mono mt-1 px-2.5 py-1 bg-red-400/10 rounded-full border border-red-400/20">
                                        ↓ Queda ({tStats.diff})
                                      </span>
                                    )}
                                    {tStats.trend === "stable" && (
                                      <span className="inline-flex items-center gap-1 text-slate-400 text-xs font-bold font-mono mt-1 px-2.5 py-1 bg-slate-400/10 rounded-full border border-slate-400/20">
                                        → Estável (0)
                                      </span>
                                    )}
                                    {tStats.trend === "none" && (
                                      <span className="text-xs text-slate-500 font-mono mt-1 block">Insuficiente</span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                            
                            {/* Score comparison block */}
                            <div className="md:col-span-2 bg-slate-950/60 border border-slate-800 rounded-2xl p-6 flex flex-col gap-6">
                              <h3 className="text-base font-bold text-white">Diferença de Pontuações</h3>
                              
                              {[
                                { name: "Desempenho", sScore: sReport.scores.performance, tScore: tReport.scores.performance },
                                { name: "Acessibilidade", sScore: sReport.scores.accessibility, tScore: tReport.scores.accessibility },
                                { name: "SEO", sScore: sReport.scores.seo, tScore: tReport.scores.seo }
                              ].map((item, idx) => {
                                const diff = item.tScore - item.sScore;
                                return (
                                  <div key={idx} className="space-y-2">
                                    <div className="flex justify-between text-xs font-semibold text-slate-300">
                                      <span>{item.name}</span>
                                      <span className={diff > 0 ? "text-emerald-500" : diff < 0 ? "text-red-500" : "text-slate-400"}>
                                        {diff > 0 ? `+${diff}` : diff === 0 ? "=" : diff}
                                      </span>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4 items-center">
                                      <div className="flex items-center gap-2">
                                        <span className="text-[10px] text-slate-400 font-mono w-24 truncate">{source.url}</span>
                                        <div className="flex-1 bg-slate-800 h-2.5 rounded-full overflow-hidden">
                                          <div className="bg-blue-500 h-full rounded-full" style={{ width: `${item.sScore}%` }}></div>
                                        </div>
                                        <span className="text-xs font-bold text-white font-mono w-6 text-right">{item.sScore}</span>
                                      </div>

                                      <div className="flex items-center gap-2">
                                        <span className="text-[10px] text-slate-400 font-mono w-24 truncate">{target.url}</span>
                                        <div className="flex-1 bg-slate-800 h-2.5 rounded-full overflow-hidden">
                                          <div className="bg-purple-500 h-full rounded-full" style={{ width: `${item.tScore}%` }}></div>
                                        </div>
                                        <span className="text-xs font-bold text-white font-mono w-6 text-right">{item.tScore}</span>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>

                            {/* Core Web Vitals scoreboard comparisons */}
                            <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-6 flex flex-col gap-4">
                              <h3 className="text-base font-bold text-white">Core Web Vitals</h3>
                              
                              <div className="space-y-3 text-xs">
                                <div className="border-b border-slate-800 pb-2.5">
                                  <span className="text-slate-500 block uppercase font-mono text-[10px] mb-1">Tempo Carregamento (LCP)</span>
                                  <div className="flex justify-between font-mono font-bold text-slate-200 mt-1">
                                    <span className="text-blue-400">{sReport.performance.loadTimeSeconds}s ({sReport.performance.metrics.lcp})</span>
                                    <span className="text-purple-400">{tReport.performance.loadTimeSeconds}s ({tReport.performance.metrics.lcp})</span>
                                  </div>
                                </div>

                                <div className="border-b border-slate-800 pb-2.5">
                                  <span className="text-slate-500 block uppercase font-mono text-[10px] mb-1">FID (Interatividade)</span>
                                  <div className="flex justify-between font-mono font-bold text-slate-200 mt-1">
                                    <span className="text-blue-400">{sReport.performance.metrics.fid}</span>
                                    <span className="text-purple-400">{tReport.performance.metrics.fid}</span>
                                  </div>
                                </div>

                                <div className="border-b border-slate-800 pb-2.5">
                                  <span className="text-slate-500 block uppercase font-mono text-[10px] mb-1">Tamanho da Página</span>
                                  <div className="flex justify-between font-mono font-bold text-slate-200 mt-1">
                                    <span className="text-blue-400">{sReport.performance.pageSizeKb} KB</span>
                                    <span className="text-purple-400">{tReport.performance.pageSizeKb} KB</span>
                                  </div>
                                </div>

                                <div>
                                  <span className="text-slate-500 block uppercase font-mono text-[10px] mb-1">Total de Problemas Críticos</span>
                                  <div className="flex justify-between font-mono font-bold text-slate-200 mt-1">
                                    <span className="text-red-400">
                                      {[...sReport.performance.issues, ...sReport.accessibility.issues, ...sReport.seo.issues].filter(i => i.severity === "critical").length}
                                    </span>
                                    <span className="text-red-400">
                                      {[...tReport.performance.issues, ...tReport.accessibility.issues, ...tReport.seo.issues].filter(i => i.severity === "critical").length}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>

                          </div>
                        );
                      })()
                    )}
                  </>
                )}
              </div>
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
                    <Info className="h-4 w-4 text-blue-500 flex-shrink-0 mt-0.5" />
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
                            <span className="text-xs text-emerald-500 font-semibold font-mono font-bold">+18.4%</span>
                          </div>

                          <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-xl flex items-center justify-between">
                            <div>
                              <span className="text-[10px] text-slate-500 uppercase tracking-wide font-mono block">Duração da Sessão</span>
                              <span className="text-xl font-bold text-white mt-0.5 block">2m 45s</span>
                            </div>
                            <span className="text-xs text-emerald-500 font-semibold font-mono font-bold">+4.1%</span>
                          </div>

                          <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-xl flex items-center justify-between">
                            <div>
                              <span className="text-[10px] text-slate-500 uppercase tracking-wide font-mono block">Taxa de Rejeição</span>
                              <span className="text-xl font-bold text-white mt-0.5 block">33.4%</span>
                            </div>
                            <span className="text-xs text-emerald-500 font-semibold font-mono font-bold">-2.5%</span>
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
                          : "bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white shadow-amber-900/10"
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
                            {securityScanResult.headers.map((check: any, idx: number) => (
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
                            {securityScanResult.xssChecks.map((check: any, idx: number) => (
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
                          <pre className="bg-slate-950 p-4 rounded-xl border border-slate-850 font-mono text-[10.5px] text-slate-300 overflow-x-auto max-h-[280px] leading-relaxed">
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
                      <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
                      <span>Agendamento ativo! Disparamos um e-mail de simulação para visualização ao lado.</span>
                    </div>
                  )}
                </div>

                {/* Live Responsive Email Preview Box */}
                <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-6 flex flex-col h-[520px]">
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
              <div className="flex flex-col gap-8 animate-fade-in">
                
                {/* 1. Metric Cards Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                  <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex items-center gap-4">
                    <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
                      <Shield className="h-5 w-5" />
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider block">Status do App</span>
                      <span className="text-sm font-bold text-slate-900 block mt-0.5">
                        {isMaintenanceMode ? "Em Manutenção" : "100% Operacional"}
                      </span>
                    </div>
                  </div>

                  <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex items-center gap-4">
                    <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
                      <Globe className="h-5 w-5" />
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider block">Domínios</span>
                      <span className="text-lg font-bold text-slate-900 block mt-0.5">
                        {domains.length} Cadastrados
                      </span>
                    </div>
                  </div>

                  <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex items-center gap-4">
                    <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                      <TrendingUp className="h-5 w-5" />
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider block">Média SEO Global</span>
                      <span className="text-lg font-bold text-slate-900 block mt-0.5">
                        {(() => {
                          const validReports = domains.map(d => d.latestReport?.scores?.seo).filter(s => s !== undefined) as number[];
                          if (validReports.length === 0) return "N/A";
                          const avg = validReports.reduce((acc, curr) => acc + curr, 0) / validReports.length;
                          return `${Math.round(avg)} pts`;
                        })()}
                      </span>
                    </div>
                  </div>

                  <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex items-center gap-4">
                    <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
                      <FileText className="h-5 w-5" />
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider block">Histórico Total</span>
                      <span className="text-lg font-bold text-slate-900 block mt-0.5">
                        {domains.reduce((acc, d) => acc + (d.reportsHistory?.length || 0), 0)} Registros
                      </span>
                    </div>
                  </div>
                </div>

                {/* 2. Simulator & Globals Controls card */}
                <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-4 border-b border-slate-100 pb-2">
                    Controles de Simulação & Parâmetros do Sistema
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <div className="flex items-start justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
                      <div className="max-w-[75%]">
                        <span className="text-xs font-bold text-slate-800 block">Modo de Manutenção</span>
                        <span className="text-[10px] text-slate-500 block mt-1 leading-relaxed">
                          Ativa um banner global avisando os usuários sobre otimizações no sistema.
                        </span>
                      </div>
                      <button
                        onClick={() => {
                          handleUpdateAdminConfig(!isMaintenanceMode, simulateAiFailures);
                          showToast(`Modo Manutenção ${!isMaintenanceMode ? "Ativado" : "Desativado"}!`, "info");
                        }}
                        className={`px-3 py-1.5 text-[10px] font-bold rounded-lg cursor-pointer transition-colors ${
                          isMaintenanceMode
                            ? "bg-indigo-600 text-white hover:bg-indigo-500"
                            : "bg-slate-200 text-slate-700 hover:bg-slate-300"
                        }`}
                      >
                        {isMaintenanceMode ? "Desativar" : "Ativar"}
                      </button>
                    </div>

                    <div className="flex items-start justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
                      <div className="max-w-[75%]">
                        <span className="text-xs font-bold text-slate-800 block">Simular Falhas Gemini AI</span>
                        <span className="text-[10px] text-slate-500 block mt-1 leading-relaxed">
                          Força erros de cota do Gemini para testar a robustez do fallback local.
                        </span>
                      </div>
                      <button
                        onClick={() => {
                          handleUpdateAdminConfig(isMaintenanceMode, !simulateAiFailures);
                          showToast(`Simulador de falhas Gemini ${!simulateAiFailures ? "Ativado" : "Desativado"}!`, "info");
                        }}
                        className={`px-3 py-1.5 text-[10px] font-bold rounded-lg cursor-pointer transition-colors ${
                          simulateAiFailures
                            ? "bg-red-600 text-white hover:bg-red-500"
                            : "bg-slate-200 text-slate-700 hover:bg-slate-300"
                        }`}
                      >
                        {simulateAiFailures ? "Desativar" : "Ativar"}
                      </button>
                    </div>

                    <div className="flex items-start justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
                      <div className="max-w-[75%]">
                        <span className="text-xs font-bold text-slate-800 block">Redefinição Geral de Fábrica</span>
                        <span className="text-[10px] text-slate-500 block mt-1 leading-relaxed">
                          Restaura a lista de domínios originais e limpa todos os caches modificados.
                        </span>
                      </div>
                      <button
                        onClick={() => {
                          if (window.confirm("Deseja realmente redefinir todos os dados para o padrão de fábrica? Isso limpará todas as suas customizações.")) {
                            setDomains(mockDomains);
                            setActiveDomainId(mockDomains[0].id);
                            localStorage.removeItem("web_analyzer_domains");
                            localStorage.removeItem("web_analyzer_active_id");
                            showToast("Banco de dados restaurado com sucesso!", "success");
                          }
                        }}
                        className="px-3 py-1.5 text-[10px] font-bold bg-slate-900 text-white hover:bg-slate-800 rounded-lg cursor-pointer transition-colors"
                      >
                        Restaurar
                      </button>
                    </div>
                  </div>
                </div>

                {/* 3. Domain registry Table and Registry addition form */}
                <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 border-b border-slate-100 pb-4">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                        Gerenciamento de Domínios Cadastrados
                      </h3>
                      <p className="text-[11px] text-slate-500 mt-0.5">Remova, configure e adicione domínios à frota global de monitoramento do sistema.</p>
                    </div>

                    {/* Quick Inline Domain Addition Form for Admin */}
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        const target = e.currentTarget;
                        const urlInput = target.elements.namedItem("new_url") as HTMLInputElement;
                        const deviceSelect = target.elements.namedItem("new_device") as HTMLSelectElement;
                        
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
                      className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl p-1.5"
                    >
                      <input
                        type="text"
                        name="new_url"
                        required
                        placeholder="Novo domínio (ex: uol.com.br)"
                        className="bg-transparent text-xs text-slate-800 font-medium px-2 py-1 outline-none w-44 font-sans border-0 focus:ring-0 focus:outline-none"
                      />
                      <select
                        name="new_device"
                        className="bg-white border border-slate-200 text-[10px] font-bold rounded-lg px-2 py-1 outline-none text-slate-700 cursor-pointer"
                      >
                        <option value="desktop">Desktop</option>
                        <option value="mobile">Mobile</option>
                      </select>
                      <button
                        type="submit"
                        className="bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-bold px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                      >
                        Adicionar
                      </button>
                    </form>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs text-slate-600">
                      <thead className="bg-slate-50 text-slate-700 uppercase tracking-wider text-[9px] font-extrabold border-b border-slate-100">
                        <tr>
                          <th className="py-3 px-4">Domínio</th>
                          <th className="py-3 px-4">Dispositivo</th>
                          <th className="py-3 px-4">Conta Google</th>
                          <th className="py-3 px-4">Média Consolidada</th>
                          <th className="py-3 px-4 text-right">Ações</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {domains.map((d) => {
                          const latest = d.latestReport;
                          const avgScore = latest
                            ? Math.round((latest.scores.performance + latest.scores.accessibility + latest.scores.seo) / 3)
                            : 50; // default simulation

                          return (
                            <tr key={d.id} className="hover:bg-slate-50/50 transition-colors">
                              <td className="py-3.5 px-4 font-semibold text-slate-900">{d.url}</td>
                              <td className="py-3.5 px-4 font-mono text-[11px]">
                                {d.auditDevice === "mobile" ? "Mobile" : "Desktop"}
                              </td>
                              <td className="py-3.5 px-4">
                                <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
                                  d.googleConnected 
                                    ? "bg-emerald-50 text-emerald-700 border border-emerald-100" 
                                    : "bg-slate-100 text-slate-500"
                                }`}>
                                  {d.googleConnected ? d.googleEmail || "Conectado" : "Desconectado"}
                                </span>
                              </td>
                              <td className="py-3.5 px-4">
                                <div className="flex items-center gap-2">
                                  <span className={`font-mono font-bold ${
                                    avgScore >= 85 ? "text-emerald-600" : avgScore >= 50 ? "text-amber-600" : "text-red-600"
                                  }`}>
                                    {latest ? `${avgScore} pts` : "N/A"}
                                  </span>
                                  {latest && (
                                    <span className={`text-[9px] font-extrabold px-1.5 py-0.2 rounded uppercase ${
                                      avgScore >= 85 
                                        ? "bg-emerald-100/60 text-emerald-800" 
                                        : "bg-amber-100/60 text-amber-800"
                                    }`}>
                                      {avgScore >= 85 ? "Top" : "Atenção"}
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="py-3.5 px-4 text-right space-x-2">
                                <button
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
                                  className="text-[10px] font-bold text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 px-2 py-1 rounded transition-colors cursor-pointer border-0"
                                >
                                  Zerar Histórico
                                </button>
                                <button
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
                                  className="text-[10px] font-bold text-red-600 hover:text-white hover:bg-red-600 bg-red-50 px-2 py-1 rounded transition-colors cursor-pointer border-0"
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

            {/* TAB 7: CHECKLIST SEO */}
            {activeTab === "checklist" && (
              <div className="flex flex-col gap-8 animate-fade-in">
                
                {/* Header info */}
                <div className="bg-gradient-to-r from-slate-900 to-slate-800 border border-slate-800 rounded-2xl p-6 shadow-sm text-white">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <h2 className="text-xl font-bold tracking-tight">Checklist de Implementação SEO</h2>
                      <p className="text-sm text-slate-400 mt-1">Gerencie suas tarefas manuais de SEO on-page, técnico, conteúdo e link building para garantir a otimização perfeita do seu site.</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => {
                          if (window.confirm("Deseja desmarcar todas as tarefas e redefinir o checklist para o padrão de fábrica?")) {
                            setSeoChecklist(DEFAULT_SEO_CHECKLIST);
                            showToast("Checklist redefinido com sucesso!", "info");
                          }
                        }}
                        className="px-3.5 py-2 rounded-xl text-xs font-bold border border-slate-700 hover:border-slate-600 bg-slate-950/40 text-slate-300 hover:text-white transition-all cursor-pointer"
                      >
                        Restaurar Padrões
                      </button>
                      <button
                        onClick={() => {
                          const hasCompleted = seoChecklist.some(t => t.completed);
                          if (!hasCompleted) {
                            showToast("Nenhuma tarefa concluída para desmarcar.", "info");
                            return;
                          }
                          setSeoChecklist(prev => prev.map(t => ({ ...t, completed: false })));
                          showToast("Todas as tarefas foram desmarcadas!", "success");
                        }}
                        className="px-3.5 py-2 rounded-xl text-xs font-bold border border-slate-700 hover:border-slate-600 bg-slate-950/40 text-slate-300 hover:text-white transition-all cursor-pointer"
                      >
                        Desmarcar Todas
                      </button>
                    </div>
                  </div>

                  {/* Progress Stats bar */}
                  <div className="mt-6 pt-6 border-t border-slate-800/60 grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="bg-slate-950/30 p-4 rounded-xl border border-slate-800/40 flex items-center gap-4">
                      <div className="p-2.5 bg-blue-500/10 text-blue-400 rounded-lg">
                        <CheckSquare className="h-5 w-5" />
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-mono font-bold">Tarefas Ativas</span>
                        <span className="text-lg font-bold font-mono">{seoChecklist.length}</span>
                      </div>
                    </div>

                    <div className="bg-slate-950/30 p-4 rounded-xl border border-slate-800/40 flex items-center gap-4">
                      <div className="p-2.5 bg-emerald-500/10 text-emerald-400 rounded-lg">
                        <CheckCircle2 className="h-5 w-5" />
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-mono font-bold">Concluídas</span>
                        <span className="text-lg font-bold font-mono text-emerald-400">
                          {seoChecklist.filter(t => t.completed).length}
                        </span>
                      </div>
                    </div>

                    <div className="bg-slate-950/30 p-4 rounded-xl border border-slate-800/40 flex flex-col justify-center">
                      <div className="flex justify-between text-[10px] text-slate-500 uppercase font-mono font-bold mb-1">
                        <span>Progresso Geral</span>
                        <span className="text-slate-300 font-mono">
                          {seoChecklist.length > 0 
                            ? Math.round((seoChecklist.filter(t => t.completed).length / seoChecklist.length) * 100) 
                            : 0}%
                        </span>
                      </div>
                      <div className="w-full bg-slate-800 rounded-full h-2">
                        <div 
                          className="bg-emerald-500 h-2 rounded-full transition-all duration-500" 
                          style={{ 
                            width: `${seoChecklist.length > 0 
                              ? (seoChecklist.filter(t => t.completed).length / seoChecklist.length) * 100 
                              : 0}%` 
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Main section: Left Form / Filters, Right Checklist Items list */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  
                  {/* Left Column: Form & Filters (span 4) */}
                  <div className="lg:col-span-4 space-y-6">
                    
                    {/* Filter Card */}
                    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
                      <h3 className="text-sm font-bold text-slate-900 border-b pb-2">Filtros & Busca</h3>
                      
                      {/* Search */}
                      <div>
                        <label className="text-[10px] text-slate-500 uppercase font-bold block mb-1">Buscar tarefa</label>
                        <div className="relative">
                          <input
                            type="text"
                            placeholder="Buscar por termo..."
                            value={chkSearchQuery}
                            onChange={(e) => setChkSearchQuery(e.target.value)}
                            className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500"
                          />
                          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                        </div>
                      </div>

                      {/* Category Filter */}
                      <div>
                        <label className="text-[10px] text-slate-500 uppercase font-bold block mb-1">Filtrar Categoria</label>
                        <select
                          value={chkFilterCategory}
                          onChange={(e) => setChkFilterCategory(e.target.value)}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-blue-500"
                        >
                          <option value="all">Todas as Categorias</option>
                          <option value="SEO On-Page">SEO On-Page</option>
                          <option value="SEO Técnico">SEO Técnico</option>
                          <option value="Conteúdo">Conteúdo</option>
                          <option value="Link Building">Link Building</option>
                          <option value="SEO Local">SEO Local</option>
                          <option value="Personalizado">Personalizado</option>
                        </select>
                      </div>

                      {/* Status Filter */}
                      <div>
                        <label className="text-[10px] text-slate-500 uppercase font-bold block mb-1">Filtrar Status</label>
                        <div className="grid grid-cols-3 gap-1 bg-slate-100 p-1 rounded-xl">
                          {(["all", "pending", "completed"] as const).map((status) => (
                            <button
                              key={status}
                              onClick={() => setChkFilterStatus(status)}
                              className={`py-1 px-1.5 rounded-lg text-[10px] font-bold transition-all text-center cursor-pointer capitalize ${
                                chkFilterStatus === status
                                  ? "bg-white text-slate-800 shadow-sm"
                                  : "text-slate-500 hover:text-slate-800"
                              }`}
                            >
                              {status === "all" ? "Todos" : status === "pending" ? "Pendentes" : "Feitos"}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* New Task Form Card */}
                    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
                      <h3 className="text-sm font-bold text-slate-900 border-b pb-2 flex items-center gap-2">
                        <Plus className="h-4 w-4 text-blue-600" />
                        <span>Nova Tarefa Manual</span>
                      </h3>

                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          if (!chkNewTitle.trim()) {
                            showToast("Por favor, digite o título da tarefa.", "error");
                            return;
                          }
                          const newTask: ManualSEOTask = {
                            id: Date.now().toString(),
                            title: chkNewTitle.trim(),
                            category: chkNewCategory,
                            completed: false,
                            priority: chkNewPriority,
                            notes: chkNewNotes.trim() || undefined
                          };
                          setSeoChecklist(prev => [newTask, ...prev]);
                          setChkNewTitle("");
                          setChkNewNotes("");
                          showToast("Tarefa de SEO adicionada!", "success");
                        }}
                        className="space-y-3.5"
                      >
                        <div>
                          <label className="text-[10px] text-slate-500 uppercase font-bold block mb-1">Título da Tarefa *</label>
                          <input
                            type="text"
                            placeholder="Ex: Otimizar velocidade do site"
                            value={chkNewTitle}
                            onChange={(e) => setChkNewTitle(e.target.value)}
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-950 placeholder-slate-400 focus:outline-none focus:border-blue-500"
                            required
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-[10px] text-slate-500 uppercase font-bold block mb-1">Categoria</label>
                            <select
                              value={chkNewCategory}
                              onChange={(e) => setChkNewCategory(e.target.value)}
                              className="w-full px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-blue-500"
                            >
                              <option value="SEO On-Page">SEO On-Page</option>
                              <option value="SEO Técnico">SEO Técnico</option>
                              <option value="Conteúdo">Conteúdo</option>
                              <option value="Link Building">Link Building</option>
                              <option value="SEO Local">SEO Local</option>
                              <option value="Personalizado">Personalizado</option>
                            </select>
                          </div>

                          <div>
                            <label className="text-[10px] text-slate-500 uppercase font-bold block mb-1">Prioridade</label>
                            <select
                              value={chkNewPriority}
                              onChange={(e) => setChkNewPriority(e.target.value as any)}
                              className="w-full px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-blue-500"
                            >
                              <option value="high">Alta</option>
                              <option value="medium">Média</option>
                              <option value="low">Baixa</option>
                            </select>
                          </div>
                        </div>

                        <div>
                          <label className="text-[10px] text-slate-500 uppercase font-bold block mb-1">Notas / Instruções (Opcional)</label>
                          <textarea
                            rows={2}
                            placeholder="Notas adicionais ou links úteis para a equipe..."
                            value={chkNewNotes}
                            onChange={(e) => setChkNewNotes(e.target.value)}
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-950 placeholder-slate-400 focus:outline-none focus:border-blue-500 resize-none"
                          />
                        </div>

                        <button
                          type="submit"
                          className="w-full flex items-center justify-center gap-2 py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer border-0 shadow-sm"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          <span>Adicionar à Lista</span>
                        </button>
                      </form>
                    </div>
                  </div>

                  {/* Right Column: Checklist tasks items list (span 8) */}
                  <div className="lg:col-span-8 bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col min-h-[400px]">
                    <div className="flex items-center justify-between border-b pb-3 mb-4">
                      <h3 className="text-sm font-bold text-slate-900">Listagem de Otimizações</h3>
                      <span className="text-xs text-slate-500 font-medium font-mono">
                        Exibindo {
                          seoChecklist.filter(t => {
                            const matchCategory = chkFilterCategory === "all" || t.category === chkFilterCategory;
                            const matchStatus = chkFilterStatus === "all" || 
                              (chkFilterStatus === "completed" && t.completed) || 
                              (chkFilterStatus === "pending" && !t.completed);
                            const matchSearch = !chkSearchQuery.trim() || 
                              t.title.toLowerCase().includes(chkSearchQuery.toLowerCase()) ||
                              (t.notes && t.notes.toLowerCase().includes(chkSearchQuery.toLowerCase()));
                            return matchCategory && matchStatus && matchSearch;
                          }).length
                        } de {seoChecklist.length} tarefas
                      </span>
                    </div>

                    {/* Checklist Loop */}
                    <div className="flex-1 space-y-2.5 overflow-y-auto max-h-[600px] pr-1">
                      {(() => {
                        const filtered = seoChecklist.filter(t => {
                          const matchCategory = chkFilterCategory === "all" || t.category === chkFilterCategory;
                          const matchStatus = chkFilterStatus === "all" || 
                            (chkFilterStatus === "completed" && t.completed) || 
                            (chkFilterStatus === "pending" && !t.completed);
                          const matchSearch = !chkSearchQuery.trim() || 
                            t.title.toLowerCase().includes(chkSearchQuery.toLowerCase()) ||
                            (t.notes && t.notes.toLowerCase().includes(chkSearchQuery.toLowerCase()));
                          return matchCategory && matchStatus && matchSearch;
                        });

                        if (filtered.length === 0) {
                          return (
                            <div className="flex flex-col items-center justify-center py-16 text-center text-slate-400">
                              <CheckSquare className="h-10 w-10 text-slate-300 stroke-1 mb-2.5" />
                              <p className="text-xs font-semibold">Nenhuma tarefa encontrada com os filtros ativos.</p>
                              <p className="text-[11px] text-slate-400 mt-0.5">Experimente limpar a busca ou mudar os filtros de categoria.</p>
                            </div>
                          );
                        }

                        return filtered.map((task) => {
                          // Category badge coloring helper
                          let categoryColor = "bg-blue-50 text-blue-700 border-blue-100";
                          if (task.category === "SEO Técnico") {
                            categoryColor = "bg-purple-50 text-purple-700 border-purple-100";
                          } else if (task.category === "Conteúdo") {
                            categoryColor = "bg-amber-50 text-amber-700 border-amber-100";
                          } else if (task.category === "Link Building") {
                            categoryColor = "bg-pink-50 text-pink-700 border-pink-100";
                          } else if (task.category === "SEO Local") {
                            categoryColor = "bg-teal-50 text-teal-700 border-teal-100";
                          } else if (task.category === "Personalizado") {
                            categoryColor = "bg-slate-100 text-slate-700 border-slate-200";
                          }

                          // Priority badge coloring helper
                          let priorityColor = "bg-slate-100 text-slate-600";
                          let priorityLabel = "Baixa";
                          if (task.priority === "high") {
                            priorityColor = "bg-rose-50 text-rose-700 border-rose-100";
                            priorityLabel = "Alta";
                          } else if (task.priority === "medium") {
                            priorityColor = "bg-amber-50 text-amber-700 border-amber-100";
                            priorityLabel = "Média";
                          }

                          return (
                            <div
                              key={task.id}
                              className={`flex items-start justify-between gap-4 p-4 border rounded-xl transition-all ${
                                task.completed
                                  ? "bg-slate-50/75 border-slate-200 opacity-75"
                                  : "bg-white border-slate-200 hover:border-slate-300 shadow-sm"
                              }`}
                            >
                              <div className="flex items-start gap-3 flex-1">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSeoChecklist(prev =>
                                      prev.map(t => (t.id === task.id ? { ...t, completed: !t.completed } : t))
                                    );
                                  }}
                                  className={`mt-0.5 h-4.5 w-4.5 rounded flex items-center justify-center border transition-colors cursor-pointer ${
                                    task.completed
                                      ? "bg-emerald-500 border-emerald-600 text-white"
                                      : "border-slate-300 hover:border-slate-400 bg-white text-transparent"
                                  }`}
                                >
                                  <Check className="h-3 w-3 stroke-[3]" />
                                </button>

                                <div className="space-y-1 flex-1">
                                  <p
                                    onClick={() => {
                                      setSeoChecklist(prev =>
                                        prev.map(t => (t.id === task.id ? { ...t, completed: !t.completed } : t))
                                      );
                                    }}
                                    className={`text-xs font-semibold cursor-pointer ${
                                      task.completed ? "text-slate-400 line-through" : "text-slate-800 hover:text-slate-950"
                                    }`}
                                  >
                                    {task.title}
                                  </p>

                                  {task.notes && (
                                    <p className={`text-[11px] ${task.completed ? "text-slate-400" : "text-slate-500"}`}>
                                      {task.notes}
                                    </p>
                                  )}

                                  <div className="flex flex-wrap gap-1.5 pt-1">
                                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[9px] font-bold border ${categoryColor}`}>
                                      {task.category}
                                    </span>
                                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[9px] font-bold border ${priorityColor}`}>
                                      Pri: {priorityLabel}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              <button
                                onClick={() => {
                                  setSeoChecklist(prev => prev.filter(t => t.id !== task.id));
                                  showToast("Tarefa removida com sucesso.", "info");
                                }}
                                className="text-slate-400 hover:text-red-500 p-1 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer border-0 mt-0.5"
                                title="Excluir tarefa"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          );
                        });
                      })()}
                    </div>
                  </div>

                </div>

              </div>
            )}
              </motion.div>
            </AnimatePresence>

          </>
        )}

      </main>

      {/* Footer information bar */}
      <footer className="border-t border-slate-700 bg-slate-900 py-6 mt-12 text-slate-300 text-xs text-center">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-2">
          <p className="text-slate-200 font-medium">SiteAnalyzer © {new Date().getFullYear()} - Auditoria Inteligente e Otimização Avançada.</p>
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-slate-400">
            <span>Powered by Gemini 3.5 Flash</span>
            <span className="hidden sm:inline">•</span>
            <span>PDF & CSV Exporter</span>
            <span className="hidden sm:inline">•</span>
            <span>Google Workspace integration</span>
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
                      h1: ({node, ...props}) => <div className="text-lg font-bold text-white border-b border-slate-800 pb-1.5 mt-5 mb-2.5 first:mt-0" {...props} />,
                      h2: ({node, ...props}) => <div className="text-base font-bold text-blue-400 mt-4 mb-2" {...props} />,
                      h3: ({node, ...props}) => <div className="text-sm font-bold text-slate-200 mt-3.5 mb-1.5" {...props} />,
                      p: ({node, ...props}) => <div className="text-xs text-slate-300 leading-relaxed mb-3.5" {...props} />,
                      ul: ({node, ...props}) => <ul className="list-disc pl-5 space-y-1.5 text-xs text-slate-300 mb-4" {...props} />,
                      ol: ({node, ...props}) => <ol className="list-decimal pl-5 space-y-1.5 text-xs text-slate-300 mb-4" {...props} />,
                      li: ({node, ...props}) => <li className="text-xs text-slate-300" {...props} />,
                      strong: ({node, ...props}) => <strong className="font-bold text-white" {...props} />,
                      code: ({node, ...props}) => <code className="bg-slate-950 px-1.5 py-0.5 rounded text-[11px] font-mono text-purple-300 border border-slate-800" {...props} />,
                      blockquote: ({node, ...props}) => <blockquote className="border-l-4 border-blue-500/50 bg-slate-950/40 pl-3 py-1 my-3 text-xs italic text-slate-400" {...props} />,
                      table: ({node, ...props}) => <div className="overflow-x-auto my-4 rounded-lg border border-slate-800"><table className="w-full text-left border-collapse text-xs" {...props} /></div>,
                      thead: ({node, ...props}) => <thead className="bg-slate-900/80 text-slate-300 font-bold border-b border-slate-800" {...props} />,
                      tbody: ({node, ...props}) => <tbody className="text-slate-300" {...props} />,
                      tr: ({node, ...props}) => <tr className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors" {...props} />,
                      th: ({node, ...props}) => <th className="px-4 py-2.5 whitespace-nowrap" {...props} />,
                      td: ({node, ...props}) => <td className="px-4 py-2.5" {...props} />,
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
                      h1: ({node, ...props}) => <div className="text-lg font-bold text-white border-b border-slate-800 pb-1.5 mt-5 mb-2.5 first:mt-0" {...props} />,
                      h2: ({node, ...props}) => <div className="text-base font-bold text-indigo-400 mt-4 mb-2" {...props} />,
                      h3: ({node, ...props}) => <div className="text-sm font-bold text-slate-200 mt-3.5 mb-1.5" {...props} />,
                      p: ({node, ...props}) => <div className="text-xs text-slate-300 leading-relaxed mb-3.5" {...props} />,
                      ul: ({node, ...props}) => <ul className="list-disc pl-5 space-y-1.5 text-xs text-slate-300 mb-4" {...props} />,
                      ol: ({node, ...props}) => <ol className="list-decimal pl-5 space-y-1.5 text-xs text-slate-300 mb-4" {...props} />,
                      li: ({node, ...props}) => <li className="text-xs text-slate-300" {...props} />,
                      strong: ({node, ...props}) => <strong className="font-bold text-white" {...props} />,
                      code: ({node, ...props}) => <code className="bg-slate-950 px-1.5 py-0.5 rounded text-[11px] font-mono text-indigo-300 border border-slate-800" {...props} />,
                      blockquote: ({node, ...props}) => <blockquote className="border-l-4 border-indigo-500/50 bg-slate-950/40 pl-3 py-1 my-3 text-xs italic text-slate-400" {...props} />,
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
                className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-blue-500/10 cursor-pointer"
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

      {/* Toast Notifications Container */}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none">
        {toasts.map(toast => {
          let borderStyle = "border-slate-800 bg-slate-900 text-slate-100 shadow-xl shadow-black/40";
          let Icon = Info;
          let iconColor = "text-blue-400";
          
          if (toast.type === "success") {
            borderStyle = "border-emerald-800/80 bg-slate-950/95 text-emerald-100 shadow-xl shadow-emerald-950/20";
            Icon = CheckCircle2;
            iconColor = "text-emerald-400 animate-pulse";
          } else if (toast.type === "error") {
            borderStyle = "border-red-800/80 bg-slate-950/95 text-red-100 shadow-xl shadow-red-950/20";
            Icon = AlertTriangle;
            iconColor = "text-red-400 animate-bounce";
          } else if (toast.type === "info") {
            borderStyle = "border-blue-800/60 bg-slate-950/95 text-blue-100 shadow-xl shadow-blue-950/10";
            Icon = Info;
            iconColor = "text-blue-400";
          }

          return (
            <div
              key={toast.id}
              className={`flex items-start gap-3 p-4 rounded-xl border ${borderStyle} pointer-events-auto shadow-md transform translate-y-0 transition-all duration-300 animate-fade-in`}
              style={{ contentVisibility: 'auto' }}
            >
              <Icon className={`h-5 w-5 shrink-0 mt-0.5 ${iconColor}`} />
              <div className="flex-1">
                <p className="text-xs font-semibold leading-relaxed text-concrete-grey">{toast.message}</p>
              </div>
              <button
                onClick={() => setToasts(prev => prev.filter(t => t.id !== toast.id))}
                className="text-slate-400 hover:text-white text-base font-bold leading-none ml-2 cursor-pointer bg-transparent border-0 outline-none p-0"
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
