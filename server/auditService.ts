import * as cheerio from "cheerio/slim";
import { Type, type GenerateContentConfig, type Schema } from "@google/genai";
import { logger } from "./logger";
import {
  buildPassiveSecurityAudit,
  runPassiveSecurityProbes,
} from "./securityAuditService";
import type {
  ArchitectureAudit,
  AuditIssue,
  AuditReport,
  BusinessImpactLevel,
  BusinessUxAnalysis,
  ClientExecutiveReport,
  ClientHealthStatus,
  DevIssueCategory,
  DeveloperActionItem,
  DeveloperGoodItem,
  DeveloperTechnicalReport,
  EffortLevel,
  PassiveSecurityAudit,
  PerformanceOpportunity,
  SecurityHeaderItem,
  SeoOnPageAudit,
} from "../src/types";

export interface GeminiGeneratorFn {
  (options: { contents: string; config: GenerateContentConfig; preferredModel?: string }): Promise<{
    text?: string;
  }>;
}

// Tipagem estrita do payload da API Google PageSpeed Insights v5
interface PsiAuditDetailsItem {
  numRequests?: number;
}

interface PsiAuditDetails {
  items?: PsiAuditDetailsItem[];
  overallSavingsMs?: number;
  overallSavingsBytes?: number;
}

interface PsiAuditEntry {
  id?: string;
  title?: string;
  description?: string;
  score?: number | null;
  scoreDisplayMode?: string;
  numericValue?: number;
  displayValue?: string;
  details?: PsiAuditDetails;
}

interface PsiAuditRef {
  id: string;
}

interface PsiCategoryEntry {
  score?: number | null;
  auditRefs?: PsiAuditRef[];
}

interface PsiLighthouseResult {
  categories?: {
    performance?: PsiCategoryEntry;
    accessibility?: PsiCategoryEntry;
    seo?: PsiCategoryEntry;
    "best-practices"?: PsiCategoryEntry;
    [key: string]: PsiCategoryEntry | undefined;
  };
  audits?: Record<string, PsiAuditEntry | undefined>;
}

interface PsiCruxMetric {
  percentile?: number;
}

interface PsiApiResponse {
  lighthouseResult?: PsiLighthouseResult;
  loadingExperience?: {
    metrics?: {
      INTERACTION_TO_NEXT_PAINT?: PsiCruxMetric;
      [key: string]: PsiCruxMetric | undefined;
    };
  };
}

// Tipagem estrita da resposta JSON estruturada do Gemini
interface GeminiRawIssue {
  title?: unknown;
  severity?: unknown;
  details?: unknown;
  suggestion?: unknown;
  codeSnippet?: unknown;
}

interface GeminiRawGscImpact {
  indexingRisk?: unknown;
  affectedReports?: unknown;
  summary?: unknown;
  actionPlan?: unknown;
}

interface GeminiRawBusinessAnalysis {
  score?: unknown;
  niche?: unknown;
  valueProposition?: {
    clarityScore?: unknown;
    summary?: unknown;
    assessment?: unknown;
  };
  ctaAnalysis?: {
    presence?: unknown;
    detectedCtas?: unknown;
    assessment?: unknown;
    recommendations?: unknown;
  };
  trustSignals?: {
    score?: unknown;
    found?: unknown;
    missing?: unknown;
    assessment?: unknown;
  };
  nicheFit?: {
    score?: unknown;
    assessment?: unknown;
    uxRecommendations?: unknown;
  };
  gscImpact?: GeminiRawGscImpact;
}

interface GeminiRawClientPillar {
  name?: unknown;
  status?: unknown;
  businessImpactExplanation?: unknown;
}

interface GeminiRawClientReport {
  overallHealthStatus?: unknown;
  executiveSummary?: unknown;
  pillars?: GeminiRawClientPillar[];
  topBusinessPriorities?: unknown[];
}

interface GeminiRawDevGoodItem {
  title?: unknown;
  category?: unknown;
  metricValue?: unknown;
  description?: unknown;
}

interface GeminiRawDevActionItem {
  title?: unknown;
  category?: unknown;
  effortLevel?: unknown;
  businessImpact?: unknown;
  affectedElement?: unknown;
  rootCause?: unknown;
  howToFix?: unknown;
  codeSnippet?: unknown;
  gscValidationStep?: unknown;
}

interface GeminiRawDeveloperReport {
  goodItems?: GeminiRawDevGoodItem[];
  improvementItems?: GeminiRawDevActionItem[];
  criticalItems?: GeminiRawDevActionItem[];
}

interface GeminiAuditRawResponse {
  performanceIssues?: GeminiRawIssue[];
  accessibilityIssues?: GeminiRawIssue[];
  seoIssues?: GeminiRawIssue[];
  generalSuggestions?: unknown[];
  businessAnalysis?: GeminiRawBusinessAnalysis;
  clientReport?: GeminiRawClientReport;
  developerReport?: GeminiRawDeveloperReport;
}

function getErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;
  return String(err);
}

interface PageFetchResult {
  requestedUrl: string;
  finalUrl: string;
  httpStatus: number;
  responseTimeMs: number;
  html: string;
  htmlByteLength: number;
  headers: Record<string, string>;
  setCookies: string[];
}

interface ExtractedPageContent {
  h1Texts: string[];
  h2Texts: string[];
  heroSnippet: string;
  ctas: string[];
  navLinks: string[];
  formCount: number;
  detectedTrustIndicators: string[];
  scriptCount: number;
  stylesheetCount: number;
  inlineScriptHints: string;
}

interface PageSpeedResult {
  scores: {
    performance: number;
    accessibility: number;
    seo: number;
    bestPractices: number;
  };
  loadTimeSeconds: number;
  pageSizeKb: number;
  requestCount: number;
  metrics: {
    lcp: string;
    inp: string;
    fid: string;
    cls: string;
    fcp: string;
    ttfb: string;
  };
  opportunities: PerformanceOpportunity[];
  rawIssues: {
    performance: AuditIssue[];
    accessibility: AuditIssue[];
    seo: AuditIssue[];
  };
}

const MAX_HTML_BYTES = 2 * 1024 * 1024; // 2 MB máx. para manter baixo consumo de RAM no cPanel
const USER_AGENT =
  "Mozilla/5.0 (compatible; SiteAnalyzerBot/2.0; +https://siteanalyzer.s7vendesign.com.br)";

/**
 * Proteção contra SSRF: bloqueia endereços locais, privados ou protocolos não-HTTP(S).
 */
export function isSafeUrl(urlStr: string): boolean {
  try {
    const parsed = new URL(urlStr);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return false;
    }
    const hostname = parsed.hostname.toLowerCase();
    if (
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname === "0.0.0.0" ||
      hostname === "::1" ||
      hostname === "[::1]"
    ) {
      return false;
    }
    if (
      hostname.startsWith("10.") ||
      hostname.startsWith("192.168.") ||
      /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(hostname) ||
      hostname.startsWith("169.254.") ||
      hostname.startsWith("127.")
    ) {
      return false;
    }
    if (hostname.endsWith(".local") || hostname.endsWith(".internal") || hostname.endsWith(".localhost")) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

export function normalizeTargetUrl(rawUrl: string): string {
  const trimmed = rawUrl.trim();
  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  const parsed = new URL(withProtocol);
  return parsed.toString();
}

async function fetchWithTimeout(
  url: string,
  timeoutMs: number,
  init: RequestInit = {}
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      ...init,
      signal: controller.signal,
      redirect: "follow",
    });
  } finally {
    clearTimeout(timeoutId);
  }
}

async function readLimitedText(response: Response, maxBytes: number): Promise<{ text: string; byteLength: number }> {
  const body = response.body;
  if (!body || typeof body.getReader !== "function") {
    const text = await response.text();
    const sliced = text.slice(0, maxBytes);
    return { text: sliced, byteLength: Buffer.byteLength(sliced, "utf8") };
  }

  const reader = body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) {
        totalBytes += value.byteLength;
        if (totalBytes > maxBytes) {
          const allowed = value.byteLength - (totalBytes - maxBytes);
          if (allowed > 0) {
            chunks.push(value.subarray(0, allowed));
          }
          await reader.cancel().catch(() => undefined);
          break;
        }
        chunks.push(value);
      }
    }
  } finally {
    reader.releaseLock();
  }

  const merged = Buffer.concat(chunks.map((c) => Buffer.from(c)));
  return { text: merged.toString("utf8"), byteLength: merged.byteLength };
}

// ============================================================================
// CAMADA A: Performance & Core Web Vitals Reais (Google PageSpeed Insights v5)
// ============================================================================

function formatMsOrSec(numericValue: number | undefined, preferMs = false): string {
  if (typeof numericValue !== "number" || Number.isNaN(numericValue)) return "N/A";
  if (preferMs || numericValue < 1000) {
    return `${Math.round(numericValue)}ms`;
  }
  return `${(numericValue / 1000).toFixed(2)}s`;
}

async function fetchPageSpeedInsights(
  targetUrl: string,
  device: "mobile" | "desktop"
): Promise<PageSpeedResult | null> {
  const apiKey = process.env.PAGESPEED_API_KEY || process.env.GOOGLE_PAGESPEED_API_KEY || "";
  const params = new URLSearchParams({
    url: targetUrl,
    strategy: device,
    locale: "pt_BR",
  });
  params.append("category", "performance");
  params.append("category", "accessibility");
  params.append("category", "seo");
  params.append("category", "best-practices");
  if (apiKey) {
    params.set("key", apiKey);
  }

  const endpoint = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?${params.toString()}`;
  logger.info("[Camada A - PSI v5] Consultando Google PageSpeed Insights...", {
    targetUrl,
    device,
    hasApiKey: Boolean(apiKey),
  });

  try {
    const response = await fetchWithTimeout(endpoint, 11000, {
      headers: { Accept: "application/json" },
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => "");
      logger.warn("[Camada A - PSI v5] API retornou erro HTTP. Acionando fallback estático.", {
        targetUrl,
        status: response.status,
        bodySnippet: errText.slice(0, 200),
      });
      return null;
    }

    const data = (await response.json()) as PsiApiResponse;
    const lhr = data.lighthouseResult;
    if (!lhr || !lhr.categories || !lhr.audits) {
      logger.warn("[Camada A - PSI v5] Payload sem lighthouseResult válido.", { targetUrl });
      return null;
    }

    const audits = lhr.audits;
    const categories = lhr.categories;
    const cruxMetrics = data.loadingExperience?.metrics;

    const toScore = (cat: PsiCategoryEntry | undefined): number =>
      typeof cat?.score === "number" ? Math.round(cat.score * 100) : 0;

    const scores = {
      performance: toScore(categories.performance),
      accessibility: toScore(categories.accessibility),
      seo: toScore(categories.seo),
      bestPractices: toScore(categories["best-practices"]),
    };

    const lcpMs: number | undefined = audits["largest-contentful-paint"]?.numericValue;
    const fcpMs: number | undefined = audits["first-contentful-paint"]?.numericValue;
    const ttfbMs: number | undefined = audits["server-response-time"]?.numericValue;
    const clsNum: number | undefined = audits["cumulative-layout-shift"]?.numericValue;
    const speedIndexMs: number | undefined = audits["speed-index"]?.numericValue;
    const interactiveMs: number | undefined = audits["interactive"]?.numericValue;

    // INP real do CrUX (field data) ou fallback para TBT / max-potential-fid do lab data
    const cruxInpMs: number | undefined = cruxMetrics?.INTERACTION_TO_NEXT_PAINT?.percentile;
    const labInpMs: number | undefined =
      audits["experimental-interaction-to-next-paint"]?.numericValue ??
      audits["total-blocking-time"]?.numericValue ??
      audits["max-potential-fid"]?.numericValue;
    const effectiveInpMs = typeof cruxInpMs === "number" ? cruxInpMs : labInpMs;

    const totalBytes: number = audits["total-byte-weight"]?.numericValue ?? 0;
    const pageSizeKb = Math.max(1, Math.round(totalBytes / 1024));

    const diagnosticsItem = audits["diagnostics"]?.details?.items?.[0];
    const networkItems = audits["network-requests"]?.details?.items;
    const requestCount: number =
      typeof diagnosticsItem?.numRequests === "number"
        ? diagnosticsItem.numRequests
        : Array.isArray(networkItems)
          ? networkItems.length
          : 0;

    const loadTimeSeconds = Number(
      (((speedIndexMs ?? lcpMs ?? interactiveMs ?? 2000) / 1000)).toFixed(2)
    );

    const metrics = {
      lcp: audits["largest-contentful-paint"]?.displayValue || formatMsOrSec(lcpMs),
      inp: formatMsOrSec(effectiveInpMs, true),
      fid: formatMsOrSec(audits["max-potential-fid"]?.numericValue ?? effectiveInpMs, true),
      cls:
        audits["cumulative-layout-shift"]?.displayValue ||
        (typeof clsNum === "number" ? clsNum.toFixed(3) : "0.00"),
      fcp: audits["first-contentful-paint"]?.displayValue || formatMsOrSec(fcpMs),
      ttfb: formatMsOrSec(ttfbMs, true),
    };

    // Oportunidades reais de otimização do PSI
    const opportunityIds = [
      "render-blocking-resources",
      "unused-javascript",
      "unused-css-rules",
      "uses-optimized-images",
      "modern-image-formats",
      "uses-responsive-images",
      "uses-text-compression",
      "uses-long-cache-ttl",
      "offscreen-images",
      "unminified-javascript",
      "unminified-css",
      "server-response-time",
      "bootup-time",
      "mainthread-work-breakdown",
      "third-party-summary",
    ];

    const opportunities: PerformanceOpportunity[] = [];
    for (const id of opportunityIds) {
      const a = audits[id];
      if (a && typeof a.score === "number" && a.score < 0.9) {
        opportunities.push({
          id,
          title: a.title || id,
          displayValue: a.displayValue,
          savingsMs: a.details?.overallSavingsMs ? Math.round(a.details.overallSavingsMs) : undefined,
          savingsBytes: a.details?.overallSavingsBytes
            ? Math.round(a.details.overallSavingsBytes)
            : undefined,
          score: a.score,
        });
      }
    }

    const extractCategoryIssues = (catKey: string): AuditIssue[] => {
      const refs = categories[catKey]?.auditRefs || [];
      const found: AuditIssue[] = [];
      for (const ref of refs) {
        const a = audits[ref.id];
        if (!a || typeof a.score !== "number" || a.score >= 0.9) continue;
        if (a.scoreDisplayMode === "notApplicable" || a.scoreDisplayMode === "informative") continue;
        const severity: AuditIssue["severity"] =
          a.score < 0.5 ? "critical" : a.score < 0.8 ? "warning" : "info";
        found.push({
          title: a.title || ref.id,
          severity,
          details: [a.displayValue, (a.description || "").replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")]
            .filter(Boolean)
            .join(" — ")
            .slice(0, 360),
          suggestion: `Priorize a correção da auditoria "${a.title || ref.id}" reportada pelo Lighthouse/PSI v5.`,
        });
        if (found.length >= 6) break;
      }
      return found;
    };

    logger.info("[Camada A - PSI v5] Métricas reais coletadas com sucesso.", {
      targetUrl,
      device,
      scores,
      pageSizeKb,
      requestCount,
    });

    return {
      scores,
      loadTimeSeconds,
      pageSizeKb,
      requestCount,
      metrics,
      opportunities: opportunities.slice(0, 8),
      rawIssues: {
        performance: extractCategoryIssues("performance"),
        accessibility: extractCategoryIssues("accessibility"),
        seo: extractCategoryIssues("seo"),
      },
    };
  } catch (err: unknown) {
    logger.warn("[Camada A - PSI v5] Exceção/timeout ao consultar PSI. Usando fallback estático.", {
      targetUrl,
      error: getErrorMessage(err),
    });
    return null;
  }
}

// ============================================================================
// CAMADA B: Crawler Leve & SEO On-Page Profundo (Cheerio + robots/sitemap)
// ============================================================================

async function fetchPageWithHeaders(targetUrl: string): Promise<PageFetchResult> {
  if (!isSafeUrl(targetUrl)) {
    throw new Error("SSRF Prevention: URL local ou privada bloqueada.");
  }

  const startedAt = Date.now();
  const response = await fetchWithTimeout(targetUrl, 6500, {
    headers: {
      "User-Agent": USER_AGENT,
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7",
      "Accept-Encoding": "gzip, deflate, br",
    },
  });
  const responseTimeMs = Date.now() - startedAt;

  const headers: Record<string, string> = {};
  response.headers.forEach((value, key) => {
    headers[key.toLowerCase()] = value;
  });

  const headersWithGetSetCookie = response.headers as Headers & {
    getSetCookie?: () => string[];
  };
  const setCookies: string[] =
    typeof headersWithGetSetCookie.getSetCookie === "function"
      ? headersWithGetSetCookie.getSetCookie()
      : headers["set-cookie"]
        ? [headers["set-cookie"]]
        : [];

  const { text: html, byteLength } = await readLimitedText(response, MAX_HTML_BYTES);

  return {
    requestedUrl: targetUrl,
    finalUrl: response.url || targetUrl,
    httpStatus: response.status,
    responseTimeMs,
    html,
    htmlByteLength: byteLength,
    headers,
    setCookies,
  };
}

async function checkRobotsTxt(origin: string): Promise<SeoOnPageAudit["robotsTxt"]> {
  const robotsUrl = `${origin}/robots.txt`;
  try {
    const res = await fetchWithTimeout(robotsUrl, 3000, {
      headers: { "User-Agent": USER_AGENT },
    });
    if (!res.ok) {
      return { exists: false, status: res.status, hasSitemapDirective: false, sitemapUrls: [] };
    }
    const { text } = await readLimitedText(res, 128 * 1024);
    const sitemapUrls: string[] = [];
    const lines = text.split(/\r?\n/);
    for (const line of lines) {
      const match = line.match(/^\s*sitemap\s*:\s*(.+)$/i);
      if (match && match[1]) {
        sitemapUrls.push(match[1].trim());
      }
    }
    return {
      exists: true,
      status: res.status,
      hasSitemapDirective: sitemapUrls.length > 0,
      sitemapUrls: sitemapUrls.slice(0, 5),
    };
  } catch {
    return { exists: false, status: null, hasSitemapDirective: false, sitemapUrls: [] };
  }
}

async function checkSitemapXml(origin: string, candidateUrl?: string): Promise<SeoOnPageAudit["sitemapXml"]> {
  const sitemapUrl = candidateUrl && isSafeUrl(candidateUrl) ? candidateUrl : `${origin}/sitemap.xml`;
  try {
    const res = await fetchWithTimeout(sitemapUrl, 3500, {
      headers: { "User-Agent": USER_AGENT, Accept: "application/xml,text/xml,*/*" },
    });
    if (!res.ok) {
      return { exists: false, status: res.status, url: sitemapUrl, estimatedUrls: 0 };
    }
    const { text } = await readLimitedText(res, 512 * 1024);
    const isXmlLike = text.includes("<urlset") || text.includes("<sitemapindex") || text.includes("<loc>");
    const locMatches = text.match(/<loc>/gi) || [];
    return {
      exists: isXmlLike,
      status: res.status,
      url: sitemapUrl,
      estimatedUrls: locMatches.length,
    };
  } catch {
    return { exists: false, status: null, url: sitemapUrl, estimatedUrls: 0 };
  }
}

function analyzeHtmlWithCheerio(
  page: PageFetchResult,
  robotsTxt: SeoOnPageAudit["robotsTxt"],
  sitemapXml: SeoOnPageAudit["sitemapXml"]
): { seoOnPage: SeoOnPageAudit; extractedContent: ExtractedPageContent } {
  const $ = cheerio.load(page.html);

  const title = $("title").first().text().replace(/\s+/g, " ").trim();
  const description = (
    $('meta[name="description"]').attr("content") ||
    $('meta[name="Description"]').attr("content") ||
    ""
  )
    .replace(/\s+/g, " ")
    .trim();

  const canonicalHref = ($('link[rel="canonical"]').attr("href") || "").trim();
  let matchesFinalUrl = false;
  if (canonicalHref) {
    try {
      const resolvedCanonical = new URL(canonicalHref, page.finalUrl).toString().replace(/\/+$/, "");
      const resolvedFinal = new URL(page.finalUrl).toString().replace(/\/+$/, "");
      matchesFinalUrl = resolvedCanonical.toLowerCase() === resolvedFinal.toLowerCase();
    } catch {
      matchesFinalUrl = false;
    }
  }

  const robotsContent = ($('meta[name="robots"]').attr("content") || "").trim();
  const isIndexable = !/noindex/i.test(robotsContent);

  const viewportContent = ($('meta[name="viewport"]').attr("content") || "").trim();

  const ogTitle = $('meta[property="og:title"]').attr("content")?.trim();
  const ogDescription = $('meta[property="og:description"]').attr("content")?.trim();
  const ogImage = $('meta[property="og:image"]').attr("content")?.trim();
  const ogType = $('meta[property="og:type"]').attr("content")?.trim();

  // Hierarquia semântica de cabeçalhos (H1-H6)
  const h1Els = $("h1");
  const h2Els = $("h2");
  const h3Els = $("h3");
  const h4Els = $("h4");
  const h5Els = $("h5");
  const h6Els = $("h6");

  const h1Texts = h1Els
    .map((_, el) => $(el).text().replace(/\s+/g, " ").trim())
    .get()
    .filter(Boolean)
    .slice(0, 5);

  const h2Texts = h2Els
    .map((_, el) => $(el).text().replace(/\s+/g, " ").trim())
    .get()
    .filter(Boolean)
    .slice(0, 10);

  const headingLevelsOrder: number[] = [];
  $("h1, h2, h3, h4, h5, h6").each((_, el) => {
    const tag = "tagName" in el && typeof el.tagName === "string" ? el.tagName.toLowerCase() : "";
    const level = parseInt(tag.replace("h", ""), 10);
    if (!Number.isNaN(level)) headingLevelsOrder.push(level);
  });

  const hierarchyIssues: string[] = [];
  if (h1Els.length === 0) {
    hierarchyIssues.push("Nenhuma tag <h1> encontrada na página.");
  } else if (h1Els.length > 1) {
    hierarchyIssues.push(`Múltiplas tags <h1> detectadas (${h1Els.length}). Recomenda-se apenas um H1 principal.`);
  }
  for (let i = 1; i < headingLevelsOrder.length; i++) {
    if (headingLevelsOrder[i] - headingLevelsOrder[i - 1] > 1) {
      hierarchyIssues.push(
        `Salto semântico detectado: H${headingLevelsOrder[i - 1]} seguido diretamente por H${headingLevelsOrder[i]}.`
      );
      break;
    }
  }

  // Imagens e atributo alt
  let totalImgs = 0;
  let missingAlt = 0;
  let withLazyLoading = 0;
  let modernFormatCount = 0;

  $("img").each((_, el) => {
    totalImgs++;
    const alt = $(el).attr("alt");
    if (alt === undefined || alt.trim() === "") {
      missingAlt++;
    }
    const loading = ($(el).attr("loading") || "").toLowerCase();
    if (loading === "lazy") {
      withLazyLoading++;
    }
    const src = ($(el).attr("src") || $(el).attr("data-src") || "").toLowerCase();
    if (src.includes(".webp") || src.includes(".avif") || src.includes(".svg")) {
      modernFormatCount++;
    }
  });

  // Dados estruturados JSON-LD (Schema.org)
  let validJsonLd = 0;
  let invalidJsonLd = 0;
  const schemaTypes = new Set<string>();
  const schemaErrors: string[] = [];

  const collectSchemaTypes = (node: unknown) => {
    if (!node || typeof node !== "object") return;
    if (Array.isArray(node)) {
      node.forEach(collectSchemaTypes);
      return;
    }
    const obj = node as Record<string, unknown>;
    if (typeof obj["@type"] === "string") {
      schemaTypes.add(obj["@type"]);
    } else if (Array.isArray(obj["@type"])) {
      obj["@type"].forEach((t) => {
        if (typeof t === "string") schemaTypes.add(t);
      });
    }
    if (Array.isArray(obj["@graph"])) {
      obj["@graph"].forEach(collectSchemaTypes);
    }
  };

  $('script[type="application/ld+json"]').each((idx, el) => {
    const raw = $(el).contents().text().trim();
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw);
      validJsonLd++;
      collectSchemaTypes(parsed);
    } catch (err: unknown) {
      invalidJsonLd++;
      schemaErrors.push(`Bloco JSON-LD #${idx + 1} inválido: ${getErrorMessage(err)}`);
    }
  });

  // Contagem de scripts e CSS
  const scriptCount = $("script").length;
  const stylesheetCount = $('link[rel="stylesheet"]').length + $("style").length;

  // Extração de CTAs, links e sinais de confiança para Análise de Regras de Negócio (Gemini)
  const ctaSet = new Set<string>();
  $('button, a[class*="btn"], a[class*="cta"], a[class*="button"], input[type="submit"], a[href*="wa.me"], a[href*="whatsapp"], a[href*="contato"], a[href*="orcamento"], a[href*="comprar"], a[href*="agendar"]').each(
    (_, el) => {
      const label = ($(el).text() || $(el).attr("value") || $(el).attr("aria-label") || "")
        .replace(/\s+/g, " ")
        .trim();
      if (label.length >= 2 && label.length <= 65) {
        ctaSet.add(label);
      }
    }
  );

  const navLinkSet = new Set<string>();
  $("header a, nav a").each((_, el) => {
    const txt = $(el).text().replace(/\s+/g, " ").trim();
    if (txt.length >= 2 && txt.length <= 45) {
      navLinkSet.add(txt);
    }
  });

  const formCount = $("form").length;

  // Texto principal limpo (sem scripts/styles) para contexto de negócio
  const $clone = cheerio.load(page.html);
  $clone("script, style, noscript, svg, iframe").remove();
  const bodyText = $clone("body").text().replace(/\s+/g, " ").trim();
  const heroSnippet = bodyText.slice(0, 1800);

  // Sinais de confiança observáveis no HTML
  const trustIndicators: string[] = [];
  if (page.finalUrl.startsWith("https://")) trustIndicators.push("Conexão segura HTTPS");
  if (/cnpj/i.test(bodyText)) trustIndicators.push("CNPJ exibido na página");
  if (/(pol[íi]tica de privacidade|lgpd|termos de uso)/i.test(bodyText)) {
    trustIndicators.push("Política de Privacidade / Termos de Uso");
  }
  if (/(whatsapp|\(\d{2}\)\s?\d{4,5}-?\d{4}|tel:)/i.test(page.html)) {
    trustIndicators.push("Telefone ou WhatsApp de atendimento");
  }
  if (/(depoimento|avalia[çc][ãa]o|clientes|estrelas|google reviews|trustpilot)/i.test(bodyText)) {
    trustIndicators.push("Prova social / Depoimentos");
  }
  if (/(instagram\.com|linkedin\.com|facebook\.com|youtube\.com)/i.test(page.html)) {
    trustIndicators.push("Links para redes sociais oficiais");
  }
  if (formCount > 0) {
    trustIndicators.push(`Formulário(s) de captura/contato (${formCount})`);
  }

  const inlineScriptHints = $("script[src], link[href], meta[name='generator']")
    .map((_, el) => $(el).attr("src") || $(el).attr("href") || $(el).attr("content") || "")
    .get()
    .join(" ")
    .slice(0, 12000);

  const seoOnPage: SeoOnPageAudit = {
    fetchedUrl: page.requestedUrl,
    finalUrl: page.finalUrl,
    httpStatus: page.httpStatus,
    title,
    titleLength: title.length,
    description,
    descriptionLength: description.length,
    canonical: {
      present: Boolean(canonicalHref),
      href: canonicalHref,
      matchesFinalUrl,
    },
    robotsMeta: {
      present: Boolean(robotsContent),
      content: robotsContent || "Não declarada (padrão: index, follow)",
      isIndexable,
    },
    viewport: {
      present: Boolean(viewportContent),
      content: viewportContent,
    },
    openGraph: {
      hasTitle: Boolean(ogTitle),
      hasDescription: Boolean(ogDescription),
      hasImage: Boolean(ogImage),
      title: ogTitle,
      description: ogDescription,
      image: ogImage,
      type: ogType,
    },
    headings: {
      h1: h1Els.length,
      h2: h2Els.length,
      h3: h3Els.length,
      h4: h4Els.length,
      h5: h5Els.length,
      h6: h6Els.length,
      h1Texts,
      hierarchyValid: hierarchyIssues.length === 0,
      hierarchyIssues,
    },
    images: {
      total: totalImgs,
      missingAlt,
      withLazyLoading,
      modernFormatCount,
    },
    structuredData: {
      present: validJsonLd + invalidJsonLd > 0,
      validCount: validJsonLd,
      invalidCount: invalidJsonLd,
      types: Array.from(schemaTypes).slice(0, 12),
      errors: schemaErrors.slice(0, 5),
    },
    robotsTxt,
    sitemapXml,
  };

  return {
    seoOnPage,
    extractedContent: {
      h1Texts,
      h2Texts,
      heroSnippet,
      ctas: Array.from(ctaSet).slice(0, 15),
      navLinks: Array.from(navLinkSet).slice(0, 15),
      formCount,
      detectedTrustIndicators: trustIndicators,
      scriptCount,
      stylesheetCount,
      inlineScriptHints,
    },
  };
}

// ============================================================================
// CAMADA C: Arquitetura, Infraestrutura, Segurança & Detector de Stack
// ============================================================================

function inspectArchitectureAndSecurity(
  page: PageFetchResult,
  extracted: ExtractedPageContent
): ArchitectureAudit {
  const headers = page.headers;
  const htmlLower = page.html.toLowerCase();
  const hintsLower = extracted.inlineScriptHints.toLowerCase();

  const server = headers["server"] || "Não exposto";
  const poweredBy = headers["x-powered-by"] || "Não exposto";
  const cacheControl = headers["cache-control"] || "Ausente";
  const compression = headers["content-encoding"] || "Não detectada / Sem compressão";
  const protocol: "HTTPS" | "HTTP" = page.finalUrl.startsWith("https://") ? "HTTPS" : "HTTP";

  // Detecção de CDN / Hospedagem
  const cdn = new Set<string>();
  if (headers["cf-ray"] || server.toLowerCase().includes("cloudflare")) cdn.add("Cloudflare");
  if (headers["x-vercel-id"] || server.toLowerCase().includes("vercel")) cdn.add("Vercel Edge");
  if (headers["x-nf-request-id"] || server.toLowerCase().includes("netlify")) cdn.add("Netlify");
  if (headers["x-amz-cf-id"] || headers["x-amz-cf-pop"]) cdn.add("Amazon CloudFront");
  if (headers["x-served-by"]?.includes("cache-") || headers["fastly-restarts"]) cdn.add("Fastly");
  if (headers["x-akamai-transformed"] || headers["akamai-grn"]) cdn.add("Akamai");
  if (server.toLowerCase().includes("litespeed")) cdn.add("LiteSpeed");
  if (headers["x-sucuri-id"]) cdn.add("Sucuri WAF");

  // Detecção de CMS / E-commerce
  const cms = new Set<string>();
  if (htmlLower.includes("wp-content") || htmlLower.includes("wp-includes") || hintsLower.includes("wordpress")) {
    cms.add("WordPress");
  }
  if (htmlLower.includes("woocommerce")) cms.add("WooCommerce");
  if (htmlLower.includes("cdn.shopify.com") || headers["x-shopid"]) cms.add("Shopify");
  if (htmlLower.includes("wix.com") || htmlLower.includes("wixstatic.com")) cms.add("Wix");
  if (htmlLower.includes("webflow") || hintsLower.includes("website-files.com")) cms.add("Webflow");
  if (htmlLower.includes("vtex") || headers["x-vtex-janus-router-backend-app"]) cms.add("VTEX");
  if (htmlLower.includes("nuvemshop") || htmlLower.includes("tiendanube")) cms.add("Nuvemshop");
  if (htmlLower.includes("squarespace")) cms.add("Squarespace");
  if (htmlLower.includes("drupal")) cms.add("Drupal");
  if (htmlLower.includes("magento") || htmlLower.includes("mage/cookies")) cms.add("Magento");
  if (hintsLower.includes("elementor")) cms.add("Elementor");

  // Detecção de Frameworks Frontend / Runtime
  const frameworks = new Set<string>();
  if (htmlLower.includes("__next_data__") || htmlLower.includes("/_next/static")) frameworks.add("Next.js");
  if (htmlLower.includes("__nuxt__") || htmlLower.includes("/_nuxt/")) frameworks.add("Nuxt.js");
  if (htmlLower.includes("data-reactroot") || htmlLower.includes("__react") || hintsLower.includes("react")) {
    frameworks.add("React");
  }
  if (htmlLower.includes("data-v-") || hintsLower.includes("vue")) frameworks.add("Vue.js");
  if (htmlLower.includes("ng-version") || htmlLower.includes("ng-app")) frameworks.add("Angular");
  if (htmlLower.includes("__sveltekit")) frameworks.add("SvelteKit");
  if (htmlLower.includes("astro-island")) frameworks.add("Astro");
  if (hintsLower.includes("tailwind") || /class="[^"]*\b(flex|grid|bg-\[|text-slate-|px-\d)\b/.test(page.html)) {
    frameworks.add("Tailwind CSS");
  }
  if (hintsLower.includes("bootstrap")) frameworks.add("Bootstrap");
  if (hintsLower.includes("jquery")) frameworks.add("jQuery");
  if (poweredBy.toLowerCase().includes("express")) frameworks.add("Express (Node.js)");
  if (poweredBy.toLowerCase().includes("php")) frameworks.add("PHP");

  // Detecção de Analytics & Marketing
  const analytics = new Set<string>();
  if (htmlLower.includes("googletagmanager.com/gtm.js")) analytics.add("Google Tag Manager");
  if (htmlLower.includes("googletagmanager.com/gtag/js") || htmlLower.includes("google-analytics.com")) {
    analytics.add("Google Analytics (GA4)");
  }
  if (htmlLower.includes("connect.facebook.net") || htmlLower.includes("fbq(")) analytics.add("Meta Pixel");
  if (htmlLower.includes("static.hotjar.com")) analytics.add("Hotjar");
  if (htmlLower.includes("clarity.ms")) analytics.add("Microsoft Clarity");
  if (htmlLower.includes("rdstation")) analytics.add("RD Station");

  // Inspeção de cabeçalhos de segurança
  const headerSpecs: Array<{
    name: string;
    key: string;
    missingSeverity: "high" | "medium" | "low";
    penalty: number;
    recommendation: string;
  }> = [
      {
        name: "Strict-Transport-Security (HSTS)",
        key: "strict-transport-security",
        missingSeverity: "high",
        penalty: 20,
        recommendation: "Configure HSTS: Strict-Transport-Security: max-age=63072000; includeSubDomains; preload",
      },
      {
        name: "Content-Security-Policy (CSP)",
        key: "content-security-policy",
        missingSeverity: "high",
        penalty: 25,
        recommendation: "Defina uma política CSP restritiva para mitigar ataques XSS e injeção de scripts.",
      },
      {
        name: "X-Frame-Options",
        key: "x-frame-options",
        missingSeverity: "medium",
        penalty: 15,
        recommendation: "Adicione X-Frame-Options: SAMEORIGIN (ou DENY) para bloquear clickjacking.",
      },
      {
        name: "X-Content-Type-Options",
        key: "x-content-type-options",
        missingSeverity: "medium",
        penalty: 15,
        recommendation: "Configure X-Content-Type-Options: nosniff para impedir MIME sniffing.",
      },
      {
        name: "Referrer-Policy",
        key: "referrer-policy",
        missingSeverity: "low",
        penalty: 10,
        recommendation: "Defina Referrer-Policy: strict-origin-when-cross-origin.",
      },
      {
        name: "Cache-Control",
        key: "cache-control",
        missingSeverity: "low",
        penalty: 10,
        recommendation: "Configure Cache-Control adequado para otimizar TTFB e revalidação de assets.",
      },
    ];

  let securityScore = protocol === "HTTPS" ? 100 : 75;
  const securityHeaders: SecurityHeaderItem[] = headerSpecs.map((spec) => {
    const val = headers[spec.key];
    const present = Boolean(val);
    if (!present) {
      securityScore -= spec.penalty;
    }
    return {
      name: spec.name,
      key: spec.key,
      present,
      value: val || "Ausente",
      severity: present ? "ok" : spec.missingSeverity,
      recommendation: spec.recommendation,
    };
  });

  if (poweredBy !== "Não exposto") {
    securityScore -= 5; // Exposição desnecessária de X-Powered-By
  }

  securityScore = Math.max(0, Math.min(100, securityScore));

  return {
    protocol,
    httpStatus: page.httpStatus,
    responseTimeMs: page.responseTimeMs,
    server,
    poweredBy,
    compression,
    cacheControl,
    cdn: Array.from(cdn),
    cms: Array.from(cms),
    frameworks: Array.from(frameworks),
    analytics: Array.from(analytics),
    securityScore,
    securityHeaders,
  };
}

// ============================================================================
// FALLBACK ESTÁTICO DE EMERGÊNCIA (quando PSI v5 falha/cota ou Gemini falha)
// ============================================================================

function buildStaticPerformanceFallback(
  device: "mobile" | "desktop",
  page: PageFetchResult | null,
  extracted: ExtractedPageContent | null
): PageSpeedResult {
  const htmlSizeKb = page ? Math.max(12, Math.round(page.htmlByteLength / 1024)) : 320;
  const scriptCount = extracted?.scriptCount ?? 10;
  const stylesheetCount = extracted?.stylesheetCount ?? 4;
  const estimatedPageSizeKb = Math.round(htmlSizeKb + scriptCount * 38 + stylesheetCount * 18);
  const estimatedRequests = scriptCount + stylesheetCount + 14;
  const responseTimeMs = page?.responseTimeMs ?? 450;

  let perfScore = 92;
  if (estimatedPageSizeKb > 1000) perfScore -= Math.min(25, Math.round((estimatedPageSizeKb - 1000) / 150));
  if (scriptCount > 8) perfScore -= Math.min(18, (scriptCount - 8) * 2);
  if (responseTimeMs > 600) perfScore -= Math.min(15, Math.round((responseTimeMs - 600) / 150));
  if (device === "mobile") perfScore -= 10;
  perfScore = Math.max(35, Math.min(96, perfScore));

  const loadSec = Number(
    Math.max(0.8, responseTimeMs / 1000 + estimatedPageSizeKb / 900 + (device === "mobile" ? 0.9 : 0.2)).toFixed(2)
  );

  return {
    scores: {
      performance: perfScore,
      accessibility: 82,
      seo: 84,
      bestPractices: 80,
    },
    loadTimeSeconds: loadSec,
    pageSizeKb: estimatedPageSizeKb,
    requestCount: estimatedRequests,
    metrics: {
      lcp: `${(loadSec + 0.3).toFixed(2)}s`,
      inp: `${Math.min(350, 60 + scriptCount * 9)}ms`,
      fid: `${Math.min(250, 30 + scriptCount * 6)}ms`,
      cls: "0.06",
      fcp: `${Math.max(0.5, loadSec * 0.6).toFixed(2)}s`,
      ttfb: `${responseTimeMs}ms`,
    },
    opportunities: [],
    rawIssues: {
      performance: [
        {
          title: "Métricas estimadas por motor estático (Fallback PSI v5)",
          severity: "info",
          details:
            "A API Google PageSpeed Insights v5 não respondeu dentro do tempo limite ou atingiu cota. As métricas de performance foram calculadas com base no HTML real e TTFB medido.",
          suggestion:
            "Configure a variável PAGESPEED_API_KEY no ambiente cPanel para garantir cota dedicada e dados reais do Lighthouse v5.",
        },
      ],
      accessibility: [],
      seo: [],
    },
  };
}

function buildDeterministicIssuesFromOnPage(
  seoOnPage: SeoOnPageAudit | null,
  arch: ArchitectureAudit | null
): { perf: AuditIssue[]; acc: AuditIssue[]; seo: AuditIssue[] } {
  const perf: AuditIssue[] = [];
  const acc: AuditIssue[] = [];
  const seo: AuditIssue[] = [];

  if (arch) {
    if (arch.compression.includes("Não detectada")) {
      perf.push({
        title: "Compressão HTTP (GZIP / Brotli) não detectada",
        severity: "warning",
        details: "A resposta principal não retornou o cabeçalho Content-Encoding com gzip ou br.",
        suggestion: "Habilite mod_deflate ou Brotli no Apache/cPanel ou ative a compressão na CDN Cloudflare.",
        codeSnippet: `<IfModule mod_deflate.c>\n  AddOutputFilterByType DEFLATE text/html text/css application/javascript application/json\n</IfModule>`,
      });
    }
    if (arch.cacheControl === "Ausente") {
      perf.push({
        title: "Cabeçalho Cache-Control ausente na resposta principal",
        severity: "info",
        details: "O servidor não informou diretivas de cache para navegadores e proxies intermediários.",
        suggestion: "Defina política de Cache-Control para ativos estáticos e revalidação de documentos HTML.",
        codeSnippet: `Cache-Control: public, max-age=31536000, immutable`,
      });
    }
  }

  if (seoOnPage) {
    if (seoOnPage.images.missingAlt > 0) {
      acc.push({
        title: `${seoOnPage.images.missingAlt} imagem(ns) sem atributo alt descritivo`,
        severity: seoOnPage.images.missingAlt >= 3 ? "critical" : "warning",
        details: `De ${seoOnPage.images.total} imagens analisadas via Cheerio, ${seoOnPage.images.missingAlt} não possuem texto alternativo (alt), prejudicando leitores de tela e SEO de imagens.`,
        suggestion: "Adicione descrições claras e objetivas no atributo alt de todas as imagens informativas.",
        codeSnippet: `<img src="/produto.webp" alt="Descrição objetiva do produto exibido" loading="lazy" />`,
      });
    }

    if (!seoOnPage.viewport.present) {
      acc.push({
        title: "Meta tag viewport ausente",
        severity: "critical",
        details: "Sem a meta tag viewport, navegadores móveis renderizam a página com zoom reduzido, quebrando a experiência mobile.",
        suggestion: "Insira a meta tag viewport padrão no <head> do documento.",
        codeSnippet: `<meta name="viewport" content="width=device-width, initial-scale=1.0" />`,
      });
    }

    if (!seoOnPage.title || seoOnPage.titleLength < 20 || seoOnPage.titleLength > 65) {
      seo.push({
        title: !seoOnPage.title
          ? "Tag <title> ausente"
          : `Comprimento da tag <title> fora da faixa ideal (${seoOnPage.titleLength} caracteres)`,
        severity: !seoOnPage.title ? "critical" : "warning",
        details: `Título atual: "${seoOnPage.title || "vazio"}". O Google exibe idealmente entre 30 e 60 caracteres.`,
        suggestion: "Escreva um título único com a palavra-chave principal e nome da marca entre 35 e 60 caracteres.",
        codeSnippet: `<title>Solução Principal | Nome da Marca</title>`,
      });
    }

    if (!seoOnPage.description || seoOnPage.descriptionLength < 70 || seoOnPage.descriptionLength > 165) {
      seo.push({
        title: !seoOnPage.description
          ? "Meta Description ausente"
          : `Meta Description fora do tamanho recomendado (${seoOnPage.descriptionLength} caracteres)`,
        severity: "warning",
        details: "A meta description influencia diretamente o CTR orgânico nos resultados de busca.",
        suggestion: "Crie uma descrição persuasiva entre 120 e 155 caracteres incluindo uma chamada para ação.",
        codeSnippet: `<meta name="description" content="Resumo claro da oferta com benefícios diretos e CTA para gerar cliques qualificados." />`,
      });
    }

    if (!seoOnPage.canonical.present) {
      seo.push({
        title: "Link rel='canonical' não declarado",
        severity: "warning",
        details: "A ausência de tag canônica pode gerar indexação duplicada (www vs não-www ou parâmetros UTM).",
        suggestion: "Declare a URL canônica absoluta no <head> da página.",
        codeSnippet: `<link rel="canonical" href="${seoOnPage.finalUrl}" />`,
      });
    }

    if (!seoOnPage.headings.hierarchyValid) {
      seo.push({
        title: "Falha na hierarquia semântica de cabeçalhos (H1-H6)",
        severity: seoOnPage.headings.h1 === 0 ? "critical" : "warning",
        details: seoOnPage.headings.hierarchyIssues.join(" "),
        suggestion: "Mantenha exatamente uma tag <h1> principal e organize subseções sequencialmente em <h2> e <h3>.",
        codeSnippet: `<h1>Proposta de Valor Principal</h1>\n<h2>Benefícios da Solução</h2>\n<h3>Detalhe Técnico</h3>`,
      });
    }

    if (!seoOnPage.structuredData.present || seoOnPage.structuredData.invalidCount > 0) {
      seo.push({
        title:
          seoOnPage.structuredData.invalidCount > 0
            ? `Dados Estruturados JSON-LD com erro de sintaxe (${seoOnPage.structuredData.invalidCount})`
            : "Ausência de Dados Estruturados (Schema.org JSON-LD)",
        severity: seoOnPage.structuredData.invalidCount > 0 ? "critical" : "info",
        details:
          seoOnPage.structuredData.invalidCount > 0
            ? seoOnPage.structuredData.errors.join(" | ")
            : "Nenhum bloco <script type='application/ld+json'> foi encontrado para enriquecer snippets no Google.",
        suggestion: "Implemente marcação Schema.org válida (Organization, WebSite, LocalBusiness ou Product).",
        codeSnippet: `<script type="application/ld+json">\n{\n  "@context": "https://schema.org",\n  "@type": "Organization",\n  "name": "Sua Empresa",\n  "url": "${seoOnPage.finalUrl}"\n}\n</script>`,
      });
    }

    if (!seoOnPage.robotsTxt.exists) {
      seo.push({
        title: "Arquivo /robots.txt ausente ou inacessível",
        severity: "info",
        details: `Requisição a /robots.txt retornou status ${seoOnPage.robotsTxt.status ?? "sem resposta"}.`,
        suggestion: "Publique um arquivo robots.txt na raiz do domínio indicando a localização do Sitemap XML.",
        codeSnippet: `User-agent: *\nAllow: /\nSitemap: ${new URL(seoOnPage.finalUrl).origin}/sitemap.xml`,
      });
    }

    if (!seoOnPage.sitemapXml.exists) {
      seo.push({
        title: "Arquivo /sitemap.xml não encontrado",
        severity: "warning",
        details: `Verificação em ${seoOnPage.sitemapXml.url} retornou status ${seoOnPage.sitemapXml.status ?? "sem resposta"}.`,
        suggestion: "Gere um Sitemap XML atualizado e submeta-o no Google Search Console.",
      });
    }
  }

  return { perf, acc, seo };
}

function buildFallbackBusinessAnalysis(
  url: string,
  seoOnPage: SeoOnPageAudit | null,
  extracted: ExtractedPageContent | null
): BusinessUxAnalysis {
  const ctas = extracted?.ctas ?? [];
  const trustFound = extracted?.detectedTrustIndicators ?? [];
  const h1 = seoOnPage?.headings.h1Texts[0] || seoOnPage?.title || url;

  const ctaPresence: BusinessUxAnalysis["ctaAnalysis"]["presence"] =
    ctas.length >= 4 ? "forte" : ctas.length >= 2 ? "moderada" : ctas.length === 1 ? "fraca" : "ausente";

  const clarityScore = seoOnPage?.headings.h1 === 1 && seoOnPage.descriptionLength >= 60 ? 78 : 58;
  const trustScore = Math.min(95, 35 + trustFound.length * 12);
  const overall = Math.round((clarityScore + trustScore + (ctas.length > 0 ? 75 : 40)) / 3);

  const missingTrust: string[] = [];
  if (!trustFound.some((t) => t.includes("CNPJ"))) missingTrust.push("CNPJ ou identificação legal no rodapé");
  if (!trustFound.some((t) => t.includes("Privacidade"))) missingTrust.push("Política de Privacidade / LGPD visível");
  if (!trustFound.some((t) => t.includes("Prova social"))) missingTrust.push("Depoimentos ou avaliações de clientes");
  if (!trustFound.some((t) => t.includes("Telefone"))) missingTrust.push("Canal de atendimento direto (WhatsApp/Telefone)");

  return {
    score: overall,
    niche: "Serviços Digitais / Presença Web Corporativa",
    valueProposition: {
      clarityScore,
      summary: `Headline principal identificada: "${h1}".`,
      assessment:
        seoOnPage?.headings.h1 === 1
          ? "A página apresenta um H1 único que ajuda a comunicar o foco principal, podendo ser reforçado com subheadline orientada a benefício mensurável."
          : "A proposta de valor acima da dobra precisa de um H1 único e objetivo destacando qual problema o negócio resolve e para quem.",
    },
    ctaAnalysis: {
      presence: ctaPresence,
      detectedCtas: ctas.slice(0, 8),
      assessment:
        ctas.length > 0
          ? `Foram detectados ${ctas.length} elementos acionáveis/CTAs na página.`
          : "Não foram identificados botões de CTA claros no HTML estático inicial.",
      recommendations: [
        "Posicione um CTA primário de alto contraste acima da dobra com verbo de ação orientado a resultado.",
        "Reduza a fricção de conversão oferecendo contato rápido via formulário enxuto ou WhatsApp.",
      ],
    },
    trustSignals: {
      score: trustScore,
      found: trustFound.length > 0 ? trustFound : ["Domínio acessível publicamente"],
      missing: missingTrust.length > 0 ? missingTrust : ["Certificações/selos do segmento para reforço extra"],
      assessment:
        trustFound.length >= 3
          ? "Boa base de sinais de credibilidade identificados no HTML da página."
          : "Reforçar sinais de confiança (prova social, identificação legal e canais de contato) aumentará a taxa de conversão.",
    },
    nicheFit: {
      score: Math.max(50, overall - 2),
      assessment:
        "Avaliação gerada pelo motor local determinístico a partir da estrutura real do DOM (fallback de IA).",
      uxRecommendations: [
        "Garanta escaneabilidade com blocos curtos, hierarquia visual clara e contraste mínimo WCAG AA.",
        "Adicione uma seção de Prova Social e FAQ diretamente antes do CTA final para eliminar objeções.",
      ],
    },
    gscImpact: {
      indexingRisk:
        !seoOnPage?.robotsMeta.isIndexable || !seoOnPage?.sitemapXml.exists ? "alto" : seoOnPage?.canonical.present ? "baixo" : "medio",
      affectedReports: [
        "Core Web Vitals (Experiência na Página)",
        "Indexação de Páginas / Sitemaps",
        "Dados Estruturados (Rich Results)",
      ],
      summary:
        "A combinação de Core Web Vitals, canonicalização, sitemap XML e Schema.org determina diretamente a saúde de rastreamento no Google Search Console.",
      actionPlan: [
        "Inspecione a URL principal no GSC e valide a renderização mobile ao vivo.",
        "Submeta ou atualize o /sitemap.xml e valide eventuais erros de dados estruturados.",
      ],
    },
  };
}

// ============================================================================
// CAMADA IA: Regras de Negócio, UX e Enriquecimento via Gemini (Structured JSON)
// ============================================================================

const DEV_ACTION_ITEM_SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING },
    category: { type: Type.STRING, description: "Performance, SEO, Arquitetura, Segurança ou UX" },
    effortLevel: { type: Type.STRING, description: "Baixo, Médio ou Alto" },
    businessImpact: { type: Type.STRING, description: "Alto, Médio ou Baixo" },
    affectedElement: { type: Type.STRING, description: "URL, seletor HTML ou header HTTP afetado" },
    rootCause: { type: Type.STRING, description: "Explicação técnica objetiva da causa raiz" },
    howToFix: { type: Type.STRING, description: "Roteiro passo a passo de resolução técnica" },
    codeSnippet: { type: Type.STRING, description: "Código ou configuração pronta para aplicar" },
    gscValidationStep: { type: Type.STRING, description: "Como validar a correção no Google Search Console" },
  },
  required: [
    "title",
    "category",
    "effortLevel",
    "businessImpact",
    "affectedElement",
    "rootCause",
    "howToFix",
    "codeSnippet",
    "gscValidationStep",
  ],
};

const GEMINI_AUDIT_SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: {
    performanceIssues: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          severity: { type: Type.STRING, description: "critical, warning ou info" },
          details: { type: Type.STRING },
          suggestion: { type: Type.STRING },
          codeSnippet: { type: Type.STRING },
        },
        required: ["title", "severity", "details", "suggestion"],
      },
    },
    accessibilityIssues: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          severity: { type: Type.STRING, description: "critical, warning ou info" },
          details: { type: Type.STRING },
          suggestion: { type: Type.STRING },
          codeSnippet: { type: Type.STRING },
        },
        required: ["title", "severity", "details", "suggestion"],
      },
    },
    seoIssues: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          severity: { type: Type.STRING, description: "critical, warning ou info" },
          details: { type: Type.STRING },
          suggestion: { type: Type.STRING },
          codeSnippet: { type: Type.STRING },
        },
        required: ["title", "severity", "details", "suggestion"],
      },
    },
    generalSuggestions: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
    },
    businessAnalysis: {
      type: Type.OBJECT,
      properties: {
        score: { type: Type.INTEGER, description: "Nota de 0 a 100 para clareza de negócio, UX e conversão" },
        niche: { type: Type.STRING, description: "Nicho/segmento de mercado identificado para o site" },
        valueProposition: {
          type: Type.OBJECT,
          properties: {
            clarityScore: { type: Type.INTEGER },
            summary: { type: Type.STRING },
            assessment: { type: Type.STRING },
          },
          required: ["clarityScore", "summary", "assessment"],
        },
        ctaAnalysis: {
          type: Type.OBJECT,
          properties: {
            presence: { type: Type.STRING, description: "forte, moderada, fraca ou ausente" },
            detectedCtas: { type: Type.ARRAY, items: { type: Type.STRING } },
            assessment: { type: Type.STRING },
            recommendations: { type: Type.ARRAY, items: { type: Type.STRING } },
          },
          required: ["presence", "detectedCtas", "assessment", "recommendations"],
        },
        trustSignals: {
          type: Type.OBJECT,
          properties: {
            score: { type: Type.INTEGER },
            found: { type: Type.ARRAY, items: { type: Type.STRING } },
            missing: { type: Type.ARRAY, items: { type: Type.STRING } },
            assessment: { type: Type.STRING },
          },
          required: ["score", "found", "missing", "assessment"],
        },
        nicheFit: {
          type: Type.OBJECT,
          properties: {
            score: { type: Type.INTEGER },
            assessment: { type: Type.STRING },
            uxRecommendations: { type: Type.ARRAY, items: { type: Type.STRING } },
          },
          required: ["score", "assessment", "uxRecommendations"],
        },
        gscImpact: {
          type: Type.OBJECT,
          properties: {
            indexingRisk: { type: Type.STRING, description: "baixo, medio ou alto" },
            affectedReports: { type: Type.ARRAY, items: { type: Type.STRING } },
            summary: { type: Type.STRING },
            actionPlan: { type: Type.ARRAY, items: { type: Type.STRING } },
          },
          required: ["indexingRisk", "affectedReports", "summary", "actionPlan"],
        },
      },
      required: ["score", "niche", "valueProposition", "ctaAnalysis", "trustSignals", "nicheFit", "gscImpact"],
    },
    clientReport: {
      type: Type.OBJECT,
      description: "Relatório executivo em linguagem de negócios clara, sem jargões técnicos, voltado ao cliente final",
      properties: {
        overallHealthStatus: { type: Type.STRING, description: "Saudável, Atenção Necessária ou Crítico" },
        executiveSummary: { type: Type.STRING, description: "Parágrafo direto sobre saúde comercial e digital do site" },
        pillars: {
          type: Type.ARRAY,
          description: "4 pilares: Velocidade, Presença no Google, Segurança e Clareza de Conversão (CTAs)",
          items: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              status: { type: Type.STRING, description: "Saudável, Atenção Necessária ou Crítico" },
              businessImpactExplanation: { type: Type.STRING },
            },
            required: ["name", "status", "businessImpactExplanation"],
          },
        },
        topBusinessPriorities: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: "Ações práticas priorizadas com foco em vendas, leads e retorno comercial",
        },
      },
      required: ["overallHealthStatus", "executiveSummary", "pillars", "topBusinessPriorities"],
    },
    developerReport: {
      type: Type.OBJECT,
      description: "Caderno técnico estruturado em Verde (goodItems), Amarelo (improvementItems) e Vermelho (criticalItems) com matriz Esforço x Impacto",
      properties: {
        goodItems: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              category: { type: Type.STRING, description: "Performance, SEO, Arquitetura, Segurança ou UX" },
              metricValue: { type: Type.STRING },
              description: { type: Type.STRING },
            },
            required: ["title", "category", "metricValue", "description"],
          },
        },
        improvementItems: {
          type: Type.ARRAY,
          items: DEV_ACTION_ITEM_SCHEMA,
        },
        criticalItems: {
          type: Type.ARRAY,
          items: DEV_ACTION_ITEM_SCHEMA,
        },
      },
      required: ["goodItems", "improvementItems", "criticalItems"],
    },
  },
  required: [
    "performanceIssues",
    "accessibilityIssues",
    "seoIssues",
    "generalSuggestions",
    "businessAnalysis",
    "clientReport",
    "developerReport",
  ],
};

function sanitizeSeverity(raw: unknown): AuditIssue["severity"] {
  const normalized = typeof raw === "string" ? raw.toLowerCase().trim() : "";
  if (normalized === "critical" || normalized === "warning" || normalized === "info") {
    return normalized;
  }
  return "info";
}

function sanitizeCtaPresence(raw: unknown): BusinessUxAnalysis["ctaAnalysis"]["presence"] {
  const normalized = typeof raw === "string" ? raw.toLowerCase().trim() : "";
  if (
    normalized === "forte" ||
    normalized === "moderada" ||
    normalized === "fraca" ||
    normalized === "ausente"
  ) {
    return normalized;
  }
  return "moderada";
}

function sanitizeHealthStatus(raw: unknown): ClientHealthStatus {
  const normalized = typeof raw === "string" ? raw.toLowerCase().trim() : "";
  if (normalized.includes("saud") || normalized === "bom" || normalized === "ideal") {
    return "Saudável";
  }
  if (normalized.includes("crít") || normalized.includes("crit")) {
    return "Crítico";
  }
  return "Atenção Necessária";
}

function sanitizeEffortLevel(raw: unknown): EffortLevel {
  const normalized = typeof raw === "string" ? raw.toLowerCase().trim() : "";
  if (normalized.includes("baix") || normalized === "low") return "Baixo";
  if (normalized.includes("alt") || normalized === "high") return "Alto";
  return "Médio";
}

function sanitizeBusinessImpact(raw: unknown): BusinessImpactLevel {
  const normalized = typeof raw === "string" ? raw.toLowerCase().trim() : "";
  if (normalized.includes("alt") || normalized === "high") return "Alto";
  if (normalized.includes("baix") || normalized === "low") return "Baixo";
  return "Médio";
}

function sanitizeDevCategory(raw: unknown): DevIssueCategory {
  const normalized = typeof raw === "string" ? raw.toLowerCase().trim() : "";
  if (normalized.includes("perf")) return "Performance";
  if (normalized.includes("seo")) return "SEO";
  if (normalized.includes("arq") || normalized.includes("arch")) return "Arquitetura";
  if (normalized.includes("seg") || normalized.includes("sec")) return "Segurança";
  return "UX";
}

function buildFallbackDualReports(params: {
  cleanDomain: string;
  targetUrl: string;
  scores: { performance: number; accessibility: number; seo: number; security: number };
  perf: PageSpeedResult;
  seoOnPage: SeoOnPageAudit | null;
  architecture: ArchitectureAudit | null;
  security: PassiveSecurityAudit | null;
  businessAnalysis: BusinessUxAnalysis;
  perfIssues: AuditIssue[];
  accIssues: AuditIssue[];
  seoIssues: AuditIssue[];
}): { clientReport: ClientExecutiveReport; developerReport: DeveloperTechnicalReport } {
  const {
    cleanDomain,
    targetUrl,
    scores,
    perf,
    seoOnPage,
    architecture,
    security,
    businessAnalysis,
    perfIssues,
    accIssues,
    seoIssues,
  } = params;

  const avg = Math.round((scores.performance + scores.accessibility + scores.seo + scores.security) / 4);
  const toStatus = (n: number): ClientHealthStatus =>
    n >= 85 ? "Saudável" : n >= 55 ? "Atenção Necessária" : "Crítico";

  const secScore = security?.score ?? architecture?.securityScore ?? scores.security;
  const sslDaysText =
    security?.ssl.certificateValid && security.ssl.daysUntilExpiration !== null
      ? `Selo SSL válido (expira em ${security.ssl.daysUntilExpiration} dias).`
      : security && !security.ssl.certificateValid
        ? "Certificado SSL/HTTPS exige verificação urgente para evitar alertas de 'Site Não Seguro' aos visitantes."
        : "";

  const clientReport: ClientExecutiveReport = {
    overallHealthStatus: toStatus(avg),
    executiveSummary:
      avg >= 85
        ? `O site ${cleanDomain} possui saúde digital sólida (${avg}/100), com navegação confiável, proteção SSL adequada e boa visibilidade no Google. As melhorias recomendadas focam em maximizar conversão e blindagem da marca.`
        : avg >= 55
          ? `O site ${cleanDomain} opera em nível intermediário (${avg}/100). Otimizar velocidade, apresentação no Google e camadas de proteção contra golpes/redirecionamentos trará ganho direto em confiança do consumidor e vendas.`
          : `O site ${cleanDomain} apresenta pontos críticos (${avg}/100) que afetam tanto a confiança dos visitantes quanto a visibilidade orgânica. Priorizar as correções rápidas (Quick Wins) gera melhora imediata de segurança e conversão.`,
    pillars: [
      {
        name: "Velocidade",
        status: toStatus(scores.performance),
        businessImpactExplanation:
          scores.performance >= 85
            ? `As páginas abrem de forma ágil (${perf.loadTimeSeconds}s), evitando desistências antes do cliente ver a oferta.`
            : `O tempo de carregamento (${perf.loadTimeSeconds}s) faz parte dos visitantes abandonar a página antes de interagir, especialmente no celular.`,
      },
      {
        name: "Presença no Google",
        status: toStatus(scores.seo),
        businessImpactExplanation:
          scores.seo >= 85
            ? "O site está bem estruturado para ser encontrado no Google, favorecendo tráfego orgânico qualificado."
            : "Existem ajustes em títulos, descrições e estrutura de leitura que ampliam a chance do seu negócio aparecer na primeira página do Google.",
      },
      {
        name: "Segurança & Proteção de Dados",
        status: toStatus(secScore),
        businessImpactExplanation:
          secScore >= 80
            ? `${sslDaysText} Conexão criptografada e cabeçalhos de blindagem ativos protegem seus clientes contra golpes de redirecionamento e clonagem de página.`
            : `${sslDaysText} Reforçar a blindagem contra invasões, cliques ocultos e vazamento de dados protege a reputação da marca e aumenta a confiança do consumidor em formulários.`,
      },
      {
        name: "Clareza de Conversão (CTAs)",
        status: toStatus(businessAnalysis.score),
        businessImpactExplanation: businessAnalysis.valueProposition.assessment,
      },
    ],
    topBusinessPriorities: [
      "Aplicar primeiro as correções de baixo esforço e alto impacto (Quick Wins) para ganhar velocidade e cliques no Google rapidamente.",
      "Destacar uma chamada para ação clara e visível na primeira dobra (WhatsApp, orçamento ou compra) para elevar conversões.",
      "Corrigir os pontos críticos de experiência móvel para não perder visitantes que chegam via smartphone.",
      "Reforçar sinais de credibilidade (depoimentos, dados institucionais e política de privacidade) próximos aos formulários.",
    ],
  };

  const goodItems: DeveloperGoodItem[] = [];
  if (architecture?.protocol === "HTTPS") {
    goodItems.push({
      title: "Protocolo HTTPS ativo com redirecionamento seguro",
      category: "Segurança",
      metricValue: `HTTPS · HTTP ${architecture.httpStatus}`,
      description: "O domínio responde sobre TLS/HTTPS, garantindo criptografia em trânsito e requisito base para Core Web Vitals.",
    });
  }
  if (seoOnPage?.robotsMeta.isIndexable) {
    goodItems.push({
      title: "Página liberada para indexação pelos buscadores",
      category: "SEO",
      metricValue: "index, follow",
      description: "Nenhuma diretiva noindex bloqueia o rastreamento da URL principal pelo Googlebot.",
    });
  }
  if (seoOnPage?.robotsTxt.exists) {
    goodItems.push({
      title: "Arquivo /robots.txt acessível na raiz",
      category: "SEO",
      metricValue: `HTTP ${seoOnPage.robotsTxt.status ?? 200}`,
      description: "Diretrizes de rastreamento publicadas corretamente para bots de busca.",
    });
  }
  if (seoOnPage?.sitemapXml.exists) {
    goodItems.push({
      title: "Sitemap XML detectado e válido",
      category: "SEO",
      metricValue: `${seoOnPage.sitemapXml.estimatedUrls} URLs`,
      description: "Facilita descoberta rápida de páginas novas e atualizadas no Google Search Console.",
    });
  }
  if (scores.performance >= 85) {
    goodItems.push({
      title: "Boa pontuação de Performance",
      category: "Performance",
      metricValue: `${scores.performance}/100 · LCP ${perf.metrics.lcp}`,
      description: "Renderização acima da dobra e tamanho de rede dentro dos padrões modernos.",
    });
  }
  if (architecture && !architecture.compression.includes("Não detectada")) {
    goodItems.push({
      title: "Compressão HTTP habilitada no servidor",
      category: "Arquitetura",
      metricValue: architecture.compression,
      description: "Reduz significativamente o payload trafegado em HTML, CSS e JavaScript.",
    });
  }
  if (goodItems.length === 0) {
    goodItems.push({
      title: "Endpoint principal respondendo normalmente",
      category: "Arquitetura",
      metricValue: `${architecture?.responseTimeMs ?? 300}ms TTFB`,
      description: "Servidor respondeu com sucesso à requisição HTTP inicial.",
    });
  }

  const criticalItems: DeveloperActionItem[] = [];
  const improvementItems: DeveloperActionItem[] = [];

  const convertIssue = (issue: AuditIssue, category: DevIssueCategory): DeveloperActionItem => {
    const low = `${issue.title} ${issue.details}`.toLowerCase();
    const isLowEffort =
      low.includes("title") ||
      low.includes("meta") ||
      low.includes("alt") ||
      low.includes("canonical") ||
      low.includes("robots") ||
      low.includes("sitemap") ||
      low.includes("viewport") ||
      low.includes("h1") ||
      low.includes("cache") ||
      low.includes("compressão") ||
      low.includes("header");

    return {
      title: issue.title,
      category,
      effortLevel: isLowEffort ? "Baixo" : issue.severity === "critical" ? "Médio" : "Médio",
      businessImpact: issue.severity === "critical" || category === "SEO" || category === "Performance" ? "Alto" : "Médio",
      affectedElement: targetUrl,
      rootCause: issue.details,
      howToFix: issue.suggestion,
      codeSnippet:
        issue.codeSnippet ||
        `<!-- Aplique a correção técnica para: ${issue.title} -->\n<!-- Alvo: ${targetUrl} -->`,
      gscValidationStep:
        category === "Performance"
          ? "No Google Search Console, abra Experiência > Core Web Vitals, confirme a melhoria no PageSpeed Insights e clique em 'Validar correção'."
          : "No Google Search Console, utilize 'Inspeção de URL' > 'Testar URL publicada' e clique em 'Solicitar indexação' para reprocessamento imediato.",
    };
  };

  for (const issue of perfIssues) {
    const item = convertIssue(issue, "Performance");
    if (issue.severity === "critical") criticalItems.push(item);
    else improvementItems.push(item);
  }
  for (const issue of seoIssues) {
    const item = convertIssue(issue, "SEO");
    if (issue.severity === "critical") criticalItems.push(item);
    else improvementItems.push(item);
  }
  for (const issue of accIssues) {
    const item = convertIssue(issue, "UX");
    if (issue.severity === "critical") criticalItems.push(item);
    else improvementItems.push(item);
  }

  // Achados determinísticos da Auditoria de Segurança Passiva (SSL, Arquivos Críticos, Mixed Content, Headers, Cookies)
  if (security) {
    if (security.ssl.certificateValid && security.ssl.daysUntilExpiration !== null && security.ssl.daysUntilExpiration > 30) {
      goodItems.unshift({
        title: "Certificado SSL/TLS válido e confiável",
        category: "Segurança",
        metricValue: `Expira em ${security.ssl.daysUntilExpiration}d · ${security.ssl.protocol || "TLS"}`,
        description: `Certificado emitido por ${security.ssl.issuer} operando corretamente sobre HTTPS.`,
      });
    }

    if (security.ssl.httpRedirectsToHttps) {
      goodItems.push({
        title: "Redirecionamento automático HTTP para HTTPS",
        category: "Segurança",
        metricValue: `HTTP ${security.ssl.httpRedirectStatus ?? 301} → HTTPS`,
        description: "Requisições inseguras na porta 80 são redirecionadas automaticamente para HTTPS.",
      });
    }

    const noExposedFiles = security.informationDisclosure.exposedFiles.every((f) => !f.exposed);
    if (noExposedFiles) {
      goodItems.push({
        title: "Arquivos sensíveis (/.env e /.git/HEAD) protegidos",
        category: "Segurança",
        metricValue: "Bloqueado",
        description: "Nenhuma exposição acidental detectada na raiz pública do servidor web.",
      });
    }

    // Crítico 1: Sem HTTPS ou Certificado inválido/expirando (< 15 dias)
    if (!security.ssl.isHttps || !security.ssl.certificateValid || (security.ssl.daysUntilExpiration !== null && security.ssl.daysUntilExpiration <= 15)) {
      criticalItems.unshift({
        title: !security.ssl.isHttps
          ? "Site operando sem HTTPS ativo"
          : !security.ssl.certificateValid
            ? "Certificado SSL/TLS inválido ou expirado"
            : `Certificado SSL expira em ${security.ssl.daysUntilExpiration} dia(s)`,
        category: "Segurança",
        effortLevel: "Baixo",
        businessImpact: "Alto",
        affectedElement: `TLS / Porta 443 (${targetUrl})`,
        rootCause:
          security.ssl.error ||
          "Sem certificado SSL válido e renovado, navegadores exibem bloqueio de segurança e o Google penaliza o ranqueamento.",
        howToFix:
          "1. No cPanel (SuperDomínios), acesse Segurança > SSL/TLS Status e execute AutoSSL (Let's Encrypt).\n2. Force o redirecionamento 301 de HTTP para HTTPS no .htaccess.",
        codeSnippet: `# .htaccess (Apache / cPanel)\nRewriteEngine On\nRewriteCond %{HTTPS} !=on\nRewriteRule ^ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]`,
        gscValidationStep:
          "No Google Search Console, verifique Experiência > HTTPS e confirme que a propriedade HTTPS está indexada sem alertas.",
      });
    }

    // Crítico 2: Exposição de arquivos críticos (/.env ou /.git/HEAD)
    const exposedFiles = security.informationDisclosure.exposedFiles.filter((f) => f.exposed);
    if (exposedFiles.length > 0) {
      criticalItems.unshift({
        title: `Possível exposição pública de arquivos críticos (${exposedFiles.map((f) => f.path).join(", ")})`,
        category: "Segurança",
        effortLevel: "Baixo",
        businessImpact: "Alto",
        affectedElement: exposedFiles.map((f) => f.path).join(", "),
        rootCause:
          "O servidor retornou HTTP 200 sem Content-Type HTML para arquivos de configuração/repositório, podendo expor credenciais de banco ou APIs.",
        howToFix:
          "Bloqueie imediatamente o acesso público a arquivos ocultos (.env, .git) no Apache (.htaccess) ou Nginx e rotacione credenciais expostas.",
        codeSnippet: `# .htaccess (Apache / cPanel)\n<FilesMatch "^\\.(env|git|htaccess|htpasswd)">\n  Require all denied\n</FilesMatch>\nRedirectMatch 404 /\\.git`,
        gscValidationStep:
          "Confirme retorno HTTP 403/404 via curl -I e valide no Google Search Console > Problemas de segurança.",
      });
    }

    // Crítico 3: Mixed Content ativo (scripts/iframes/CSS http:// em página https://)
    if (security.mixedContent.hasActiveMixedContent) {
      criticalItems.unshift({
        title: `Mixed Content ativo detectado (${security.mixedContent.count} recurso(s) HTTP em página HTTPS)`,
        category: "Segurança",
        effortLevel: "Baixo",
        businessImpact: "Alto",
        affectedElement: security.mixedContent.items.slice(0, 3).map((i) => `<${i.tag}> ${i.url}`).join(" | "),
        rootCause:
          "Scripts, iframes ou folhas de estilo carregados via http:// em página https:// são bloqueados pelos navegadores e quebram o cadeado SSL.",
        howToFix:
          "Atualize todas as URLs de assets para https:// e adicione a diretiva `upgrade-insecure-requests` no Content-Security-Policy.",
        codeSnippet: `# .htaccess (Apache / cPanel)\n<IfModule mod_headers.c>\n  Header always set Content-Security-Policy "upgrade-insecure-requests"\n</IfModule>`,
        gscValidationStep:
          "Abra o DevTools (Console/Security) confirmando zero alertas de Mixed Content e reteste a URL no GSC.",
      });
    } else if (security.mixedContent.count > 0) {
      improvementItems.unshift({
        title: `Mixed Content passivo em imagens (${security.mixedContent.count} ocorrência(s))`,
        category: "Segurança",
        effortLevel: "Baixo",
        businessImpact: "Médio",
        affectedElement: security.mixedContent.items[0]?.url || targetUrl,
        rootCause: "Imagens referenciadas via http:// em páginas https:// geram alertas de conteúdo misto no navegador.",
        howToFix: "Converta os atributos src das imagens para https:// ou caminhos relativos.",
        codeSnippet: `Header always set Content-Security-Policy "upgrade-insecure-requests"`,
        gscValidationStep: "Valide via Inspeção de URL no Google Search Console.",
      });
    }

    // Melhoria: Headers de segurança ausentes (Quick Win)
    const missingHeaders = security.headers.filter((h) => !h.present);
    if (missingHeaders.length > 0) {
      improvementItems.unshift({
        title: `Cabeçalhos HTTP de segurança ausentes (${missingHeaders.map((h) => h.key).join(", ")})`,
        category: "Segurança",
        effortLevel: "Baixo",
        businessImpact: "Alto",
        affectedElement: `HTTP Response Headers (${targetUrl})`,
        rootCause: `Faltam ${missingHeaders.length} de 6 cabeçalhos de blindagem (${missingHeaders.map((h) => h.name).join(", ")}), elevando risco de XSS, clickjacking e MIME sniffing.`,
        howToFix:
          "Adicione os cabeçalhos no `.htaccess` (Apache/cPanel), `nginx.conf` ou usando o middleware `helmet` no Express.",
        codeSnippet: `# Apache / cPanel (.htaccess)\n<IfModule mod_headers.c>\n  Header always set Strict-Transport-Security "max-age=63072000; includeSubDomains; preload"\n  Header always set Content-Security-Policy "default-src 'self' https: data:; frame-ancestors 'self'"\n  Header always set X-Frame-Options "SAMEORIGIN"\n  Header always set X-Content-Type-Options "nosniff"\n  Header always set Referrer-Policy "strict-origin-when-cross-origin"\n  Header always set Permissions-Policy "camera=(), microphone=(), geolocation=()"\n</IfModule>\n\n// Alternativa Express (Node.js)\nimport helmet from "helmet";\napp.use(helmet());`,
        gscValidationStep:
          "Após aplicar, valide os headers com `curl -I` e confirme ausência de alertas no Google Search Console > Problemas de segurança.",
      });
    }

    // Melhoria: Vazamento de assinatura (X-Powered-By ou versão em Server)
    if (security.informationDisclosure.poweredByExposed || security.informationDisclosure.serverExposesVersion) {
      improvementItems.push({
        title: "Vazamento de versão do servidor / runtime nos headers HTTP",
        category: "Segurança",
        effortLevel: "Baixo",
        businessImpact: "Médio",
        affectedElement: `Server: ${security.informationDisclosure.serverHeader} | X-Powered-By: ${security.informationDisclosure.poweredByHeader}`,
        rootCause:
          "Expor a versão exata do servidor/linguagem facilita reconhecimento automatizado de vulnerabilidades conhecidas (CVEs).",
        howToFix:
          "Desative `X-Powered-By` no Express/PHP e oculte tokens de versão no Apache (`ServerTokens Prod`) ou Nginx (`server_tokens off;`).",
        codeSnippet: `// Express\napp.disable("x-powered-by");\n\n# Apache (.htaccess)\nHeader always unset X-Powered-By\n\n# Nginx (nginx.conf)\nserver_tokens off;`,
        gscValidationStep: "Verifique a remoção dos headers de versão com `curl -I` na URL principal.",
      });
    }

    // Melhoria: Cookies sem flags de segurança
    if (security.cookies.insecureCount > 0) {
      improvementItems.push({
        title: `Cookies de resposta sem flags de segurança (${security.cookies.insecureCount}/${security.cookies.total})`,
        category: "Segurança",
        effortLevel: "Baixo",
        businessImpact: "Médio",
        affectedElement: security.cookies.items.filter((c) => c.issues.length > 0).map((c) => c.name).join(", "),
        rootCause:
          "Cookies sem `Secure`, `HttpOnly` ou `SameSite` ficam vulneráveis a interceptação em rede insegura, leitura via XSS ou CSRF.",
        howToFix:
          "Configure todas as emissões de cookies de sessão/autenticação com `Secure; HttpOnly; SameSite=Lax` (ou `Strict`).",
        codeSnippet: `res.cookie("session_id", token, {\n  httpOnly: true,\n  secure: true,\n  sameSite: "lax",\n});`,
        gscValidationStep: "Inspecione a aba Application > Cookies no Chrome DevTools confirmando as 3 flags ativas.",
      });
    }
  } else if (architecture) {
    const missingHighHeaders = architecture.securityHeaders.filter((h) => !h.present && h.severity === "high");
    if (missingHighHeaders.length > 0) {
      improvementItems.unshift({
        title: `Cabeçalhos HTTP de segurança ausentes (${missingHighHeaders.map((h) => h.key).join(", ")})`,
        category: "Segurança",
        effortLevel: "Baixo",
        businessImpact: "Alto",
        affectedElement: `HTTP Response Headers (${targetUrl})`,
        rootCause: `O servidor não enviou ${missingHighHeaders.map((h) => h.name).join(" e ")}, expondo o navegador a ataques de downgrade HTTPS e XSS.`,
        howToFix: "Adicione os cabeçalhos de segurança no .htaccess (Apache/cPanel), Nginx ou middleware Express.",
        codeSnippet: `<IfModule mod_headers.c>\n  Header always set Strict-Transport-Security "max-age=63072000; includeSubDomains; preload"\n  Header always set X-Content-Type-Options "nosniff"\n  Header always set X-Frame-Options "SAMEORIGIN"\n  Header always set Referrer-Policy "strict-origin-when-cross-origin"\n</IfModule>`,
        gscValidationStep:
          "Verifique no Google Search Console > Segurança e ações manuais > Problemas de segurança se não há alertas ativos após o deploy.",
      });
    }
  }

  return {
    clientReport,
    developerReport: {
      goodItems,
      improvementItems,
      criticalItems,
    },
  };
}

// ============================================================================
// PIPELINE PRINCIPAL EM 3 CAMADAS + GEMINI STRUCTURED OUTPUTS
// ============================================================================

export async function runRealSiteAudit(options: {
  rawUrl: string;
  device: "mobile" | "desktop";
  generateGeminiContent: GeminiGeneratorFn;
}): Promise<AuditReport> {
  const { rawUrl, device, generateGeminiContent } = options;
  const targetUrl = normalizeTargetUrl(rawUrl);

  if (!isSafeUrl(targetUrl)) {
    throw new Error("SSRF Prevention: URL local ou privada não é permitida.");
  }

  const parsedTarget = new URL(targetUrl);
  const origin = parsedTarget.origin;
  const cleanDisplayDomain = parsedTarget.hostname.replace(/^www\./, "");

  logger.info("[AuditService] Iniciando pipeline real em 3 camadas (Promise.allSettled)", {
    targetUrl,
    device,
  });

  // Execução paralela das Camadas A (PSI v5), B (HTML + robots/sitemap) e Segurança Passiva (TLS/SSL + arquivos)
  const [psiSettled, pageSettled, robotsSettled, defaultSitemapSettled, securityProbesSettled] =
    await Promise.allSettled([
      fetchPageSpeedInsights(targetUrl, device),
      fetchPageWithHeaders(targetUrl),
      checkRobotsTxt(origin),
      checkSitemapXml(origin),
      runPassiveSecurityProbes(targetUrl),
    ]);

  const psiResult = psiSettled.status === "fulfilled" ? psiSettled.value : null;
  const pageResult = pageSettled.status === "fulfilled" ? pageSettled.value : null;
  const securityProbes =
    securityProbesSettled.status === "fulfilled"
      ? securityProbesSettled.value
      : {
        ssl: {
          isHttps: targetUrl.startsWith("https://"),
          httpRedirectsToHttps: false,
          httpRedirectStatus: null,
          certificateValid: false,
          issuer: "Indisponível",
          daysUntilExpiration: null,
        },
        exposedFiles: [],
      };
  const robotsTxt =
    robotsSettled.status === "fulfilled"
      ? robotsSettled.value
      : { exists: false, status: null, hasSitemapDirective: false, sitemapUrls: [] };

  let sitemapXml =
    defaultSitemapSettled.status === "fulfilled"
      ? defaultSitemapSettled.value
      : { exists: false, status: null, url: `${origin}/sitemap.xml`, estimatedUrls: 0 };

  // Se /sitemap.xml não existia mas robots.txt declarou outra URL de sitemap, verifica ela rapidamente
  if (!sitemapXml.exists && robotsTxt.sitemapUrls.length > 0) {
    sitemapXml = await checkSitemapXml(origin, robotsTxt.sitemapUrls[0]);
  }

  if (pageSettled.status === "rejected") {
    logger.warn("[Camada B - Crawler] Falha ao buscar HTML direto da página alvo.", {
      targetUrl,
      error: getErrorMessage(pageSettled.reason),
    });
  }

  // Camada B (Cheerio) + Camada C (Arquitetura & Stack) + Segurança Passiva Completa
  let seoOnPage: SeoOnPageAudit | null = null;
  let extractedContent: ExtractedPageContent | null = null;
  let architecture: ArchitectureAudit | null = null;

  if (pageResult) {
    const parsed = analyzeHtmlWithCheerio(pageResult, robotsTxt, sitemapXml);
    seoOnPage = parsed.seoOnPage;
    extractedContent = parsed.extractedContent;
    architecture = inspectArchitectureAndSecurity(pageResult, extractedContent);
  }

  const securityAudit: PassiveSecurityAudit = buildPassiveSecurityAudit({
    finalUrl: pageResult?.finalUrl || targetUrl,
    headers: pageResult?.headers || {},
    setCookies: pageResult?.setCookies || [],
    html: pageResult?.html || "",
    probes: securityProbes,
  });

  if (architecture) {
    architecture.securityScore = securityAudit.score;
    architecture.securityHeaders = securityAudit.headers;
  }

  // Consolidação da Camada A (PSI v5 real ou fallback estático)
  const usedRealPsi = Boolean(psiResult);
  const effectivePerf = psiResult ?? buildStaticPerformanceFallback(device, pageResult, extractedContent);

  // Ajuste de scores de Acessibilidade e SEO se estivermos em modo fallback estático
  let finalPerfScore = effectivePerf.scores.performance;
  let finalAccScore = effectivePerf.scores.accessibility;
  let finalSeoScore = effectivePerf.scores.seo;

  if (!usedRealPsi && seoOnPage) {
    let acc = 96;
    if (seoOnPage.images.missingAlt > 0) acc -= Math.min(28, seoOnPage.images.missingAlt * 4);
    if (!seoOnPage.viewport.present) acc -= 20;
    finalAccScore = Math.max(40, Math.min(99, acc));

    let seo = 100;
    if (!seoOnPage.title) seo -= 18;
    else if (seoOnPage.titleLength < 20 || seoOnPage.titleLength > 65) seo -= 8;
    if (!seoOnPage.description) seo -= 12;
    if (!seoOnPage.canonical.present) seo -= 8;
    if (!seoOnPage.headings.hierarchyValid) seo -= 12;
    if (!seoOnPage.structuredData.present) seo -= 6;
    if (!seoOnPage.robotsTxt.exists) seo -= 5;
    if (!seoOnPage.sitemapXml.exists) seo -= 8;
    if (!seoOnPage.robotsMeta.isIndexable) seo -= 25;
    finalSeoScore = Math.max(35, Math.min(100, seo));
  }

  const deterministicIssues = buildDeterministicIssuesFromOnPage(seoOnPage, architecture);

  // Prompt enriquecido para Análise de Regras de Negócio, UX e Recomendações (Gemini Structured Outputs)
  const technicalSummary = {
    url: targetUrl,
    device,
    performanceSource: usedRealPsi ? "Google PageSpeed Insights v5 (Dados Reais)" : "Motor Estático Fallback",
    scores: {
      performance: finalPerfScore,
      accessibility: finalAccScore,
      seo: finalSeoScore,
      security: securityAudit.score,
      bestPractices: effectivePerf.scores.bestPractices,
    },
    coreWebVitals: effectivePerf.metrics,
    network: {
      loadTimeSeconds: effectivePerf.loadTimeSeconds,
      pageSizeKb: effectivePerf.pageSizeKb,
      requestCount: effectivePerf.requestCount,
    },
    psiOpportunities: effectivePerf.opportunities.map((o) => ({
      title: o.title,
      displayValue: o.displayValue,
      savingsMs: o.savingsMs,
    })),
    seoOnPage: seoOnPage
      ? {
        title: seoOnPage.title,
        titleLength: seoOnPage.titleLength,
        description: seoOnPage.description,
        descriptionLength: seoOnPage.descriptionLength,
        canonical: seoOnPage.canonical,
        robotsMeta: seoOnPage.robotsMeta,
        openGraph: seoOnPage.openGraph,
        headings: {
          h1: seoOnPage.headings.h1,
          h2: seoOnPage.headings.h2,
          h3: seoOnPage.headings.h3,
          hierarchyValid: seoOnPage.headings.hierarchyValid,
          hierarchyIssues: seoOnPage.headings.hierarchyIssues,
        },
        images: seoOnPage.images,
        structuredData: seoOnPage.structuredData,
        robotsTxt: seoOnPage.robotsTxt,
        sitemapXml: seoOnPage.sitemapXml,
      }
      : null,
    architecture: architecture
      ? {
        protocol: architecture.protocol,
        server: architecture.server,
        poweredBy: architecture.poweredBy,
        compression: architecture.compression,
        cacheControl: architecture.cacheControl,
        cdn: architecture.cdn,
        cms: architecture.cms,
        frameworks: architecture.frameworks,
        analytics: architecture.analytics,
        securityScore: architecture.securityScore,
        missingSecurityHeaders: architecture.securityHeaders.filter((h) => !h.present).map((h) => h.name),
      }
      : null,
    passiveSecurity: {
      score: securityAudit.score,
      grade: securityAudit.grade,
      ssl: securityAudit.ssl,
      headers: securityAudit.headers.map((h) => ({
        name: h.name,
        present: h.present,
        severity: h.severity,
      })),
      informationDisclosure: securityAudit.informationDisclosure,
      mixedContent: {
        count: securityAudit.mixedContent.count,
        hasActiveMixedContent: securityAudit.mixedContent.hasActiveMixedContent,
        sampleItems: securityAudit.mixedContent.items.slice(0, 5),
      },
      cookies: securityAudit.cookies,
    },
  };

  const pageBusinessContext = extractedContent
    ? {
      h1Headlines: extractedContent.h1Texts,
      h2Subheadings: extractedContent.h2Texts,
      detectedCtas: extractedContent.ctas,
      navigationLinks: extractedContent.navLinks,
      formCount: extractedContent.formCount,
      detectedTrustIndicators: extractedContent.detectedTrustIndicators,
      pageTextExcerpt: extractedContent.heroSnippet,
    }
    : {
      note: "HTML bruto indisponível por bloqueio do servidor alvo; baseie a análise nos metadados e domínio.",
    };

  const prompt = `Atue como um Arquiteto de Performance Web, Engenheiro de SEO Técnico e Estrategista de CRO/UX Sênior.
Analise os dados REAIS coletados nas 3 camadas de auditoria do site "${targetUrl}" (${device === "mobile" ? "Mobile" : "Desktop"}):

=== RESUMO TÉCNICO REAL (CAMADAS A, B e C) ===
${JSON.stringify(technicalSummary, null, 2)}

=== CONTEÚDO EXTRAÍDO DA PÁGINA PARA ANÁLISE DE NEGÓCIO E UX ===
${JSON.stringify(pageBusinessContext, null, 2)}

SUAS TAREFAS (em Português do Brasil, respostas objetivas, acionáveis e 100% aderentes ao schema JSON):
1. Gere até 5 problemas prioritários de Performance (performanceIssues), 4 de Acessibilidade (accessibilityIssues) e 5 de SEO (seoIssues) baseados ESTRITAMENTE nos achados reais acima, cada um com severidade ('critical', 'warning' ou 'info'), explicação técnica clara, sugestão prática e um codeSnippet corretivo real.
2. Gere 4 a 6 recomendações estratégicas priorizadas em generalSuggestions.
3. Em businessAnalysis (Análise de Regras de Negócio e UX):
   - Identifique o nicho real do site.
   - Avalie a clareza da proposta de valor (valueProposition), Calls-to-Action (ctaAnalysis), sinais de confiança (trustSignals), adequação ao nicho/UX (nicheFit) e impacto no Google Search Console (gscImpact).
4. Em clientReport (Relatório Executivo PARA O CLIENTE FINAL — ZERO jargões técnicos, ZERO código):
   - overallHealthStatus: "Saudável", "Atenção Necessária" ou "Crítico".
   - executiveSummary: 1 parágrafo direto explicando o impacto da saúde atual do site em vendas, experiência do usuário, segurança/confiança e visibilidade no Google.
   - pillars: exatamente 4 pilares ("Velocidade", "Presença no Google", "Segurança & Proteção de Dados" e "Clareza de Conversão (CTAs)"). No pilar "Segurança & Proteção de Dados", traduza o status SSL, redirecionamento HTTPS e cabeçalhos para confiança do consumidor, proteção contra invasões/clonagem e conformidade básica.
   - topBusinessPriorities: 4 a 5 prioridades práticas focadas em retorno comercial e proteção da marca.
5. Em developerReport (Caderno Técnico PARA O DESENVOLVEDOR):
   - goodItems (Verde — O que está bom): 3 a 6 itens aprovados (incluindo achados positivos de Segurança como SSL válido/dias restantes e arquivos /.env protegidos) com category, metricValue real e description.
   - improvementItems (Amarelo — O que precisa melhorar): 3 a 7 itens cobrindo Performance, SEO, Segurança (headers ausentes, vazamento Server/X-Powered-By, cookies sem Secure/HttpOnly/SameSite) e Arquitetura, com effortLevel ("Baixo" | "Médio" | "Alto"), businessImpact ("Alto" | "Médio" | "Baixo"), affectedElement, rootCause, howToFix passo a passo, codeSnippet pronto para aplicar (.htaccess Apache/cPanel, nginx.conf ou Express helmet) e gscValidationStep.
   - criticalItems (Vermelho — Críticos): 2 a 6 problemas críticos (inclua obrigatoriamente qualquer achado crítico de segurança como certificado expirando/inválido, /.env ou /.git/HEAD exposto, ausência de HTTPS ou Mixed Content ativo em scripts), destacando "Quick Wins" (effortLevel: "Baixo" + businessImpact: "Alto") e fornecendo codeSnippet pronto (.htaccess / nginx.conf / Express helmet).`;

  let performanceIssues: AuditIssue[] = [];
  let accessibilityIssues: AuditIssue[] = [];
  let seoIssues: AuditIssue[] = [];
  let generalSuggestions: string[] = [];
  let businessAnalysis: BusinessUxAnalysis;
  let clientReport: ClientExecutiveReport | undefined;
  let developerReport: DeveloperTechnicalReport | undefined;
  let quotaFallback = false;

  try {
    // Hard timeout de 12s no Gemini para evitar 504 Gateway Timeout (limite de 30s no Apache/cPanel/Cloudflare)
    const aiResponse = await Promise.race([
      generateGeminiContent({
        contents: prompt,
        config: {
          systemInstruction:
            "Você é um Arquiteto Sênior de Web Performance, SEO Técnico, Segurança e CRO/UX. " +
            "Baseie-se exclusivamente nas evidências reais coletadas (PSI v5, Cheerio HTML, TLS/SSL e Headers HTTP). " +
            "Retorne SEMPRE JSON estrito seguindo o responseSchema, inteiramente em Português do Brasil (pt-BR).",
          responseMimeType: "application/json",
          responseSchema: GEMINI_AUDIT_SCHEMA,
        },
      }),
      new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error("Tempo limite do Gemini (12s) excedido — usando consolidação local real.")),
          12000
        )
      ),
    ]);

    const rawText = aiResponse.text?.trim();
    if (!rawText) {
      throw new Error("Resposta vazia recebida da API Gemini.");
    }

    const parsedAi = JSON.parse(rawText) as GeminiAuditRawResponse;

    const mapRawIssues = (list: GeminiRawIssue[] | undefined, fallbackTitle: string): AuditIssue[] =>
      Array.isArray(list)
        ? list.map((item: GeminiRawIssue) => ({
          title: String(item.title || fallbackTitle),
          severity: sanitizeSeverity(item.severity),
          details: String(item.details || ""),
          suggestion: String(item.suggestion || ""),
          codeSnippet: item.codeSnippet ? String(item.codeSnippet) : undefined,
        }))
        : [];

    performanceIssues = mapRawIssues(parsedAi.performanceIssues, "Otimização de Performance");
    accessibilityIssues = mapRawIssues(parsedAi.accessibilityIssues, "Melhoria de Acessibilidade");
    seoIssues = mapRawIssues(parsedAi.seoIssues, "Melhoria de SEO");

    generalSuggestions = Array.isArray(parsedAi.generalSuggestions)
      ? parsedAi.generalSuggestions.map(String)
      : [];

    const ba = parsedAi.businessAnalysis;
    businessAnalysis = {
      score: Math.max(0, Math.min(100, Number(ba?.score ?? 70))),
      niche: String(ba?.niche || "Negócio Digital"),
      valueProposition: {
        clarityScore: Math.max(0, Math.min(100, Number(ba?.valueProposition?.clarityScore ?? 70))),
        summary: String(ba?.valueProposition?.summary || ""),
        assessment: String(ba?.valueProposition?.assessment || ""),
      },
      ctaAnalysis: {
        presence: sanitizeCtaPresence(ba?.ctaAnalysis?.presence),
        detectedCtas: Array.isArray(ba?.ctaAnalysis?.detectedCtas)
          ? ba.ctaAnalysis.detectedCtas.map(String).slice(0, 10)
          : extractedContent?.ctas.slice(0, 8) || [],
        assessment: String(ba?.ctaAnalysis?.assessment || ""),
        recommendations: Array.isArray(ba?.ctaAnalysis?.recommendations)
          ? ba.ctaAnalysis.recommendations.map(String).slice(0, 6)
          : [],
      },
      trustSignals: {
        score: Math.max(0, Math.min(100, Number(ba?.trustSignals?.score ?? 65))),
        found: Array.isArray(ba?.trustSignals?.found)
          ? ba.trustSignals.found.map(String).slice(0, 8)
          : extractedContent?.detectedTrustIndicators || [],
        missing: Array.isArray(ba?.trustSignals?.missing)
          ? ba.trustSignals.missing.map(String).slice(0, 8)
          : [],
        assessment: String(ba?.trustSignals?.assessment || ""),
      },
      nicheFit: {
        score: Math.max(0, Math.min(100, Number(ba?.nicheFit?.score ?? 70))),
        assessment: String(ba?.nicheFit?.assessment || ""),
        uxRecommendations: Array.isArray(ba?.nicheFit?.uxRecommendations)
          ? ba.nicheFit.uxRecommendations.map(String).slice(0, 6)
          : [],
      },
      gscImpact: ba?.gscImpact
        ? {
          indexingRisk:
            ba.gscImpact.indexingRisk === "alto" || ba.gscImpact.indexingRisk === "medio"
              ? ba.gscImpact.indexingRisk
              : "baixo",
          affectedReports: Array.isArray(ba.gscImpact.affectedReports)
            ? ba.gscImpact.affectedReports.map(String).slice(0, 5)
            : ["Core Web Vitals", "Indexação de Páginas"],
          summary: String(ba.gscImpact.summary || ""),
          actionPlan: Array.isArray(ba.gscImpact.actionPlan)
            ? ba.gscImpact.actionPlan.map(String).slice(0, 5)
            : [],
        }
        : undefined,
    };

    // Sanitização estrita de clientReport (Visão Executiva)
    const rawClient = parsedAi.clientReport;
    if (rawClient && typeof rawClient === "object") {
      const pillars = Array.isArray(rawClient.pillars)
        ? rawClient.pillars.map((p) => ({
          name: String(p.name || "Pilar Digital"),
          status: sanitizeHealthStatus(p.status),
          businessImpactExplanation: String(p.businessImpactExplanation || ""),
        }))
        : [];
      const priorities = Array.isArray(rawClient.topBusinessPriorities)
        ? rawClient.topBusinessPriorities.map(String).filter(Boolean).slice(0, 6)
        : [];
      if (pillars.length > 0 && rawClient.executiveSummary) {
        clientReport = {
          overallHealthStatus: sanitizeHealthStatus(rawClient.overallHealthStatus),
          executiveSummary: String(rawClient.executiveSummary),
          pillars,
          topBusinessPriorities: priorities.length > 0 ? priorities : generalSuggestions.slice(0, 5),
        };
      }
    }

    // Sanitização estrita de developerReport (Visão Técnica + Matriz Esforço x Impacto)
    const rawDev = parsedAi.developerReport;
    if (rawDev && typeof rawDev === "object") {
      const mapDevAction = (list: GeminiRawDevActionItem[] | undefined): DeveloperActionItem[] =>
        Array.isArray(list)
          ? list.map((item) => ({
            title: String(item.title || "Ajuste Técnico"),
            category: sanitizeDevCategory(item.category),
            effortLevel: sanitizeEffortLevel(item.effortLevel),
            businessImpact: sanitizeBusinessImpact(item.businessImpact),
            affectedElement: String(item.affectedElement || targetUrl),
            rootCause: String(item.rootCause || ""),
            howToFix: String(item.howToFix || ""),
            codeSnippet: String(item.codeSnippet || ""),
            gscValidationStep: String(
              item.gscValidationStep ||
              "Valide via Inspeção de URL no Google Search Console e solicite nova indexação."
            ),
          }))
          : [];

      const goodItems: DeveloperGoodItem[] = Array.isArray(rawDev.goodItems)
        ? rawDev.goodItems.map((g) => ({
          title: String(g.title || "Item Aprovado"),
          category: sanitizeDevCategory(g.category),
          metricValue: String(g.metricValue || "OK"),
          description: String(g.description || ""),
        }))
        : [];

      developerReport = {
        goodItems,
        improvementItems: mapDevAction(rawDev.improvementItems),
        criticalItems: mapDevAction(rawDev.criticalItems),
      };
    }
  } catch (err: unknown) {
    quotaFallback = true;
    logger.warn("[AuditService] Gemini indisponível/cota excedida. Consolidando relatório com dados reais locais.", {
      targetUrl,
      error: getErrorMessage(err),
    });

    performanceIssues = [...effectivePerf.rawIssues.performance, ...deterministicIssues.perf];
    accessibilityIssues = [...effectivePerf.rawIssues.accessibility, ...deterministicIssues.acc];
    seoIssues = [...effectivePerf.rawIssues.seo, ...deterministicIssues.seo];
    generalSuggestions = [
      "Priorize a eliminação de recursos bloqueadores de renderização e otimize o LCP acima da dobra.",
      "Garanta cabeçalhos de segurança HTTP completos (HSTS, CSP, X-Frame-Options, X-Content-Type-Options).",
      "Valide a marcação Schema.org JSON-LD, tag canônica, robots.txt e sitemap.xml no Google Search Console.",
      "Reforce CTAs primários de alto contraste e sinais de credibilidade acima da dobra para elevar conversões.",
    ];
    businessAnalysis = buildFallbackBusinessAnalysis(cleanDisplayDomain, seoOnPage, extractedContent);
  }

  // Garante listas mínimas úteis mesmo se IA retornar array vazio
  if (performanceIssues.length === 0) {
    performanceIssues = [...effectivePerf.rawIssues.performance, ...deterministicIssues.perf];
  }
  if (accessibilityIssues.length === 0) {
    accessibilityIssues = [...effectivePerf.rawIssues.accessibility, ...deterministicIssues.acc];
  }
  if (seoIssues.length === 0) {
    seoIssues = [...effectivePerf.rawIssues.seo, ...deterministicIssues.seo];
  }

  // Fallback determinístico caso a IA falhe ou omita qualquer um dos relatórios duais
  if (!clientReport || !developerReport) {
    const fallbackDual = buildFallbackDualReports({
      cleanDomain: cleanDisplayDomain,
      targetUrl,
      scores: {
        performance: finalPerfScore,
        accessibility: finalAccScore,
        seo: finalSeoScore,
        security: securityAudit.score,
      },
      perf: effectivePerf,
      seoOnPage,
      architecture,
      security: securityAudit,
      businessAnalysis,
      perfIssues: performanceIssues,
      accIssues: accessibilityIssues,
      seoIssues,
    });
    clientReport = clientReport ?? fallbackDual.clientReport;
    developerReport = developerReport ?? fallbackDual.developerReport;
  }

  const methodParts: string[] = [];
  methodParts.push(usedRealPsi ? "PSI v5 Real" : "Fallback Estático");
  if (seoOnPage) methodParts.push("Cheerio Crawler");
  methodParts.push("AppSec Passivo (TLS/Headers)");
  methodParts.push(quotaFallback ? "Negócio Local" : "Gemini Structured");

  const report: AuditReport = {
    url: cleanDisplayDomain,
    title: seoOnPage?.title || `Auditoria - ${cleanDisplayDomain}`,
    description:
      seoOnPage?.description || `Relatório técnico de Performance, SEO, Segurança, Arquitetura e UX para ${cleanDisplayDomain}.`,
    analyzedAt: new Date().toISOString(),
    method: methodParts.join(" + "),
    device,
    quotaFallback: quotaFallback || undefined,
    scores: {
      performance: finalPerfScore,
      accessibility: finalAccScore,
      seo: finalSeoScore,
      security: securityAudit.score,
      bestPractices: effectivePerf.scores.bestPractices,
    },
    performance: {
      source: usedRealPsi ? "psi-v5" : "static-fallback",
      loadTimeSeconds: effectivePerf.loadTimeSeconds,
      pageSizeKb: effectivePerf.pageSizeKb,
      requestCount: effectivePerf.requestCount,
      metrics: effectivePerf.metrics,
      opportunities: effectivePerf.opportunities,
      issues: performanceIssues,
    },
    accessibility: {
      issues: accessibilityIssues,
    },
    seo: {
      issues: seoIssues,
    },
    seoOnPage: seoOnPage || undefined,
    architecture: architecture || undefined,
    security: securityAudit,
    businessAnalysis,
    clientReport,
    developerReport,
    generalSuggestions,
  };

  logger.info("[AuditService] Auditoria real concluída.", {
    targetUrl,
    device,
    method: report.method,
    scores: report.scores,
    businessScore: report.businessAnalysis?.score,
  });

  return report;
}
