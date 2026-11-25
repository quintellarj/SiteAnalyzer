import express from "express";
import path from "path";
import dotenv from "dotenv";
import { GoogleGenAI, Type, type GenerateContentConfig, type Schema } from "@google/genai";
import fs from "fs";
import crypto from "crypto";
import {
  logger,
  logContextStorage,
  writeAuditLog,
  LOG_FILE_PATH,
} from "./server/logger";
import {
  LRUCache,
  AUDIT_CACHE_TTL_MS,
  QUICK_TIPS_CACHE_TTL_MS,
  buildAuditCacheKey,
} from "./server/cache";
import { runRealSiteAudit, isSafeUrl } from "./server/auditService";
import type {
  AuditReport,
  DomainProfile,
  QuickTipsResponse,
  SecurityScanHeaderCheck,
  SecurityScanXssCheck,
} from "./src/types";

interface GoogleTokenApiResponse {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  error?: string;
  error_description?: string;
}

interface SearchConsoleApiResponse {
  rows?: Array<{
    keys: string[];
    clicks: number;
    impressions: number;
    ctr: number;
    position: number;
  }>;
}

interface ApiErrorLike {
  status?: string;
  statusCode?: number;
  message?: string;
}

function getErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;
  return String(err);
}

const QUICK_TIPS_SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: {
    suggestedMeta: {
      type: Type.OBJECT,
      properties: {
        title: { type: Type.STRING },
        description: { type: Type.STRING },
        reason: { type: Type.STRING },
      },
      required: ["title", "description", "reason"],
    },
    contentStructure: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          section: { type: Type.STRING },
          suggestion: { type: Type.STRING },
          example: { type: Type.STRING },
        },
        required: ["section", "suggestion", "example"],
      },
    },
    trendingKeywords: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
    },
    searchTrendsContext: { type: Type.STRING },
  },
  required: ["suggestedMeta", "contentStructure", "trendingKeywords", "searchTrendsContext"],
};

// Load environment variables (.env na raiz do projeto)
dotenv.config();

export { logger, logContextStorage };

logger.info("Servidor SiteAnalyzer inicializando (arquitetura cPanel / Phusion Passenger)...", {
  nodeEnv: process.env.NODE_ENV || "development",
  logFilePath: LOG_FILE_PATH,
});

// Cache LRU em memória (TTL 30 min) — aproveita processo Node persistente no cPanel
export const auditCache = new LRUCache<AuditReport>({
  maxEntries: 80,
  ttlMs: AUDIT_CACHE_TTL_MS,
});

const quickTipsCache = new LRUCache<QuickTipsResponse>({
  maxEntries: 80,
  ttlMs: QUICK_TIPS_CACHE_TTL_MS,
});

// Fail-closed API key validation
function validateApiKey(key: string | undefined): asserts key is string {
  if (!key) {
    logger.securityAlert("Erro Fatal [Fail-Closed]: GEMINI_API_KEY não definida.", { ip: "127.0.0.1" });
    throw new Error("FATAL [Fail-Closed]: A variável de ambiente GEMINI_API_KEY não está definida.");
  }
  const trimmed = key.trim();
  if (!trimmed || trimmed === "MY_GEMINI_API_KEY" || trimmed.length < 30) {
    logger.fatal("Erro Fatal: GEMINI_API_KEY inválida ou insegura.");
    process.exit(1);
  }
  if (trimmed.length < 10) {
    logger.securityAlert("Erro Fatal [Fail-Closed]: GEMINI_API_KEY muito curta.", {
      ip: "127.0.0.1",
      length: trimmed.length,
    });
    throw new Error("FATAL [Fail-Closed]: A variável de ambiente GEMINI_API_KEY possui comprimento inválido.");
  }
}

export const app = express();

// Confia no proxy reverso do Apache/cPanel/Cloudflare para req.ip e protocolo HTTPS
app.set("trust proxy", 1);
app.disable("x-powered-by");

// Helper to generate unique request ID
function generateRequestId(): string {
  return "req_" + Math.random().toString(36).substring(2, 11) + "_" + Date.now().toString(36);
}

app.use(express.json({ limit: "10mb" }));

// Request Observability Context & Security Headers Middleware
app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader(
    "Content-Security-Policy",
    "default-src 'self' 'unsafe-inline' 'unsafe-eval' https://apis.google.com https://fonts.googleapis.com https://fonts.gstatic.com; img-src 'self' data: https:; connect-src 'self' https:;"
  );

  const requestId = (req.headers["x-request-id"] as string) || generateRequestId();

  let userId = (req.headers["x-user-id"] as string) || "anonymous";
  if (req.body && typeof req.body === "object") {
    if (req.body.userId) {
      userId = String(req.body.userId);
    } else if (req.body.userEmail) {
      userId = String(req.body.userEmail);
    } else if (req.body.email) {
      userId = String(req.body.email);
    }
  }

  const action = `${req.method} ${req.path}`;
  res.setHeader("X-Request-Id", requestId);

  logContextStorage.run({ requestId, userId, action }, () => {
    next();
  });
});

// Global Maintenance and Simulation variables
let globalMaintenanceMode = false;
let globalSimulateAiFailures = false;

// Lazy initialization of Gemini client server-side
let _ai: GoogleGenAI | null = null;
function getAi(): GoogleGenAI {
  if (!_ai) {
    validateApiKey(process.env.GEMINI_API_KEY);
    _ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          "User-Agent": "siteanalyzer-s7ven-cpanel",
        },
      },
    });
  }
  return _ai;
}

// Middleware for DoS Protection / Rate Limiting
const geminiRequestLimits: Record<string, number[]> = {};
const MAX_REQUESTS_PER_MINUTE = 20;

function rateLimiter(req: express.Request, res: express.Response, next: express.NextFunction) {
  const ip = req.ip ? crypto.createHash("sha256").update(req.ip).digest("hex") : "0.0.0.0";
  const now = Date.now();

  if (!geminiRequestLimits[ip]) {
    geminiRequestLimits[ip] = [];
  }

  geminiRequestLimits[ip] = geminiRequestLimits[ip].filter((ts) => now - ts < 60000);

  if (geminiRequestLimits[ip].length >= MAX_REQUESTS_PER_MINUTE) {
    writeAuditLog(
      "SECURITY_ALERT",
      "backend",
      `Estouro de limite de requisições (Rate Limit Exceeded) para rota ${req.path}`,
      req.ip,
      { count: geminiRequestLimits[ip].length }
    );
    return res.status(429).json({
      error:
        "Muitas requisições. Por favor, aguarde um instante antes de tentar novamente para evitar estouro de cota.",
    });
  }

  geminiRequestLimits[ip].push(now);
  next();
}

// Prompt Injection and malformed parameter protector
const SUSPICIOUS_PATTERNS = [
  /ignore\s+previous\s+instruction/i,
  /ignore\s+above/i,
  /forget\s+what\s+was\s+said/i,
  /esqueça\s+as\s+instruções/i,
  /ignore\s+as\s+instruções/i,
  /ignore\s+tudo/i,
  /you\s+are\s+now/i,
  /agora\s+você\s+é/i,
  /system\s+instruction/i,
  /override\s+system/i,
  /<script>/i,
  /javascript:/i,
  /onload/i,
  /onerror/i,
];

function sanitizeAndValidateInputs(req: express.Request, res: express.Response, next: express.NextFunction) {
  const { domain, url, issueTitle, issueCategory, issueDetails, domains, activeDomainUrl } = req.body;

  const stringInputs: string[] = [];
  if (typeof domain === "string") stringInputs.push(domain);
  if (typeof url === "string") stringInputs.push(url);
  if (typeof issueTitle === "string") stringInputs.push(issueTitle);
  if (typeof issueCategory === "string") stringInputs.push(issueCategory);
  if (typeof issueDetails === "string") stringInputs.push(issueDetails);
  if (typeof activeDomainUrl === "string") stringInputs.push(activeDomainUrl);

  if (Array.isArray(domains)) {
    for (const d of domains) {
      if (d && typeof d.url === "string") stringInputs.push(d.url);
    }
  }

  for (const input of stringInputs) {
    if (input.length > 3000) {
      writeAuditLog(
        "SECURITY_ALERT",
        "backend",
        "Rejeitado: Entrada de dados excessivamente longa (potencial DoS/Injeção)",
        req.ip,
        { length: input.length }
      );
      return res.status(400).json({ error: "Entrada de dados inválida ou excessivamente longa." });
    }
  }

  for (const input of stringInputs) {
    for (const pattern of SUSPICIOUS_PATTERNS) {
      if (pattern.test(input)) {
        writeAuditLog(
          "SECURITY_ALERT",
          "backend",
          "Rejeitado: Suspeita de Injeção de Prompt detectada no parâmetro",
          req.ip,
          { inputSnippet: input.substring(0, 100), patternMatched: pattern.toString() }
        );
        return res
          .status(400)
          .json({ error: "Entrada inválida. Caracteres ou padrões de comando não são permitidos." });
      }
    }
  }

  const candidateDomain = typeof domain === "string" ? domain : typeof url === "string" ? url : "";
  if (candidateDomain) {
    const domainRegex = /^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,24}(:\d+)?(\/.*)?$/;
    const cleanDomain = candidateDomain.trim().replace(/^(https?:\/\/)?(www\.)?/, "");
    if (!domainRegex.test(cleanDomain)) {
      writeAuditLog(
        "SECURITY_ALERT",
        "backend",
        "Rejeitado: Formato de domínio inválido ou malformado",
        req.ip,
        { domain: candidateDomain }
      );
      return res.status(400).json({ error: "Formato de domínio inválido. Informe um domínio público válido." });
    }
  }

  next();
}

// Helper: Call Gemini with automatic retry and model fallback
async function generateContentWithRetryAndFallback(options: {
  contents: string;
  config: GenerateContentConfig;
  preferredModel?: string;
}): Promise<{ text?: string }> {
  if (globalSimulateAiFailures) {
    throw new Error("Quota Exceeded (Simulado via Painel de Manutenção)");
  }
  const preferred = options.preferredModel || process.env.GEMINI_MODEL || "gemini-2.5-flash";
  const modelsToTry = Array.from(new Set([preferred, "gemini-2.5-flash", "gemini-2.0-flash"]));
  let lastError: unknown = null;

  for (let idx = 0; idx < modelsToTry.length; idx++) {
    const model = modelsToTry[idx];
    let retries = idx === 0 ? 1 : 0;
    while (retries >= 0) {
      try {
        logger.info(`Tentando gerar conteúdo usando o modelo: ${model}`, { model, retriesLeft: retries });
        const ai = getAi();
        const response = await ai.models.generateContent({
          model,
          contents: options.contents,
          config: options.config,
        });
        logger.info(`Conteúdo gerado com sucesso via Gemini (${model}).`, { model });
        return response;
      } catch (err: unknown) {
        lastError = err;
        const apiErr = (typeof err === "object" && err !== null ? err : {}) as ApiErrorLike;
        const msg = getErrorMessage(err);
        const isQuotaOrRateLimitError =
          apiErr.status === "RESOURCE_EXHAUSTED" ||
          apiErr.statusCode === 429 ||
          msg.includes("429") ||
          msg.includes("RESOURCE_EXHAUSTED") ||
          msg.toLowerCase().includes("quota") ||
          msg.toLowerCase().includes("exceeded") ||
          msg.includes("404") ||
          msg.includes("NOT_FOUND");

        if (isQuotaOrRateLimitError) {
          logger.warn(`Modelo ${model} indisponível ou sem cota. Tentando próximo fallback.`, {
            model,
            error: msg,
          });
          retries = -1;
        } else {
          logger.warn(`Erro temporário no modelo ${model}`, { model, retriesLeft: retries, error: msg });
          if (retries > 0) {
            await new Promise((resolve) => setTimeout(resolve, 300));
          }
          retries--;
        }
      }
    }
  }

  logger.error("Falha total na geração de conteúdo de IA com todos os modelos de fallback.", { error: lastError });
  throw lastError instanceof Error
    ? lastError
    : new Error("Falha ao gerar conteúdo com todos os modelos disponíveis.");
}

// ============================================================================
// HEALTH CHECK & CACHE TELEMETRY (cPanel / Passenger)
// ============================================================================
app.get("/api/health", (_req, res) => {
  const mem = process.memoryUsage();
  res.json({
    status: "ok",
    environment: process.env.NODE_ENV || "development",
    uptimeSeconds: Math.round(process.uptime()),
    memoryMb: {
      rss: Math.round(mem.rss / 1024 / 1024),
      heapUsed: Math.round(mem.heapUsed / 1024 / 1024),
    },
    cache: {
      audit: auditCache.stats(),
      quickTips: quickTipsCache.stats(),
    },
    timestamp: new Date().toISOString(),
  });
});

// ============================================================================
// REST API ENDPOINT: REAL 3-LAYER WEBSITE AUDIT + LRU CACHE (30 MIN TTL)
// ============================================================================
app.post("/api/analyze", rateLimiter, sanitizeAndValidateInputs, async (req, res) => {
  if (globalMaintenanceMode) {
    return res.status(503).json({
      error:
        "O sistema de auditoria está atualmente em manutenção programada pela administração. Por favor, tente novamente mais tarde.",
    });
  }

  const { url, device = "desktop", forceRefresh = false } = req.body;
  if (!url || typeof url !== "string") {
    return res.status(400).json({ error: "URL é obrigatória" });
  }

  const normalizedDevice: "mobile" | "desktop" = device === "mobile" ? "mobile" : "desktop";
  const cacheKey = buildAuditCacheKey(url, normalizedDevice);

  // 1. Consulta Cache LRU em Memória (TTL 30 min) para respostas instantâneas
  if (!forceRefresh) {
    const cached = auditCache.get(cacheKey);
    if (cached) {
      logger.info("[Cache HIT] Retornando auditoria em cache LRU instantaneamente.", {
        cacheKey,
        url,
        device: normalizedDevice,
      });
      res.setHeader("X-Cache", "HIT");
      return res.json({
        ...cached.value,
        cacheInfo: {
          hit: true,
          cachedAt: new Date(cached.createdAt).toISOString(),
          ttlMinutes: Math.round(AUDIT_CACHE_TTL_MS / 60000),
        },
      });
    }
  }

  // 2. Executa Motor de Auditoria Real em 3 Camadas (PSI v5 + Cheerio + Stack/Headers + Gemini)
  try {
    const report = await runRealSiteAudit({
      rawUrl: url,
      device: normalizedDevice,
      generateGeminiContent: generateContentWithRetryAndFallback,
    });

    const cachedAt = new Date().toISOString();
    auditCache.set(cacheKey, report, AUDIT_CACHE_TTL_MS);

    res.setHeader("X-Cache", "MISS");
    return res.json({
      ...report,
      cacheInfo: {
        hit: false,
        cachedAt,
        ttlMinutes: Math.round(AUDIT_CACHE_TTL_MS / 60000),
      },
    });
  } catch (err: unknown) {
    logger.error("Erro fatal na rota /api/analyze.", { url, device: normalizedDevice, error: err });
    return res.status(400).json({
      error: getErrorMessage(err) || "Falha ao executar auditoria real para o domínio informado.",
    });
  }
});

// ============================================================================
// GOOGLE OAUTH, ANALYTICS & SEARCH CONSOLE ROUTES
// ============================================================================
function getBaseAppUrl(req: express.Request): string {
  if (process.env.APP_URL) return process.env.APP_URL.replace(/\/+$/, "");
  const proto = (req.headers["x-forwarded-proto"] as string) || req.protocol || "https";
  const host = req.get("host") || "siteanalyzer.s7vendesign.com.br";
  return `${proto}://${host}`;
}

app.get("/api/auth/google/url", (req, res) => {
  const clientId = process.env.GOOGLE_CLIENT_ID || "MOCK_CLIENT_ID";
  const redirectUri = `${getBaseAppUrl(req)}/auth/callback`;

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope:
      "https://www.googleapis.com/auth/analytics.readonly https://www.googleapis.com/auth/webmasters.readonly",
    access_type: "offline",
    prompt: "consent",
  });

  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  res.json({ url: authUrl, isMock: !process.env.GOOGLE_CLIENT_ID });
});

app.get(["/auth/callback", "/auth/callback/"], (req, res) => {
  const code = typeof req.query.code === "string" ? req.query.code.replace(/[^a-zA-Z0-9/_-]/g, "") : "";
  res.send(`
    <html>
      <body style="font-family: 'Inter', sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background-color: #09090B; background-image: radial-gradient(#18181B 1px, transparent 1px); background-size: 24px 24px; color: #F4F4F5;">
        <div style="text-align: center; padding: 32px; border-radius: 16px; background: #121215; border: 1px solid #27272A; box-shadow: 0 24px 48px -12px rgba(0,0,0,0.75); max-width: 380px;">
          <div style="width: 48px; height: 48px; margin: 0 auto 16px; border-radius: 9999px; background: rgba(16,185,129,0.12); border: 1px solid rgba(16,185,129,0.3); color: #10B981; font-size: 24px; display: flex; align-items: center; justify-content: center; font-weight: 700;">✓</div>
          <h2 style="margin: 0 0 8px 0; font-weight: 700; color: #FFFFFF; font-size: 18px;">Conexão Concluída</h2>
          <p style="color: #A1A1AA; font-size: 13px; margin: 0 0 18px 0; line-height: 1.5;">Credenciais Google autenticadas com sucesso no SiteAnalyzer.</p>
          <p style="color: #71717A; font-size: 11px; font-family: monospace; margin: 0;">Fechando janela automaticamente...</p>
        </div>
        <script>
          if (window.opener) {
            window.opener.postMessage({ type: 'OAUTH_AUTH_SUCCESS', code: '${code}' }, window.location.origin);
            setTimeout(() => { window.close(); }, 1200);
          } else {
            window.location.href = '/';
          }
        </script>
      </body>
    </html>
  `);
});

app.post("/api/auth/google/token", async (req, res) => {
  const { code } = req.body;

  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    return res.json({
      success: true,
      accessToken: "mock_access_token_12345",
      refreshToken: "mock_refresh_token_12345",
      isSandbox: true,
      email: "demo-user@gmail.com",
    });
  }

  try {
    const redirectUri = `${getBaseAppUrl(req)}/auth/callback`;
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });

    const tokens = (await tokenResponse.json()) as GoogleTokenApiResponse;
    if (tokens.error) {
      throw new Error(tokens.error_description || tokens.error);
    }

    res.json({
      success: true,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresIn: tokens.expires_in,
      isSandbox: false,
    });
  } catch (error: unknown) {
    logger.error("Falha ao trocar código de autorização Google", { error });
    res.status(500).json({ error: "Falha ao trocar código de autorização Google: " + getErrorMessage(error) });
  }
});

app.get("/api/analytics/report", async (req, res) => {
  const token = req.headers.authorization?.split(" ")[1];
  const isMock = !token || token.startsWith("mock_");

  if (isMock) {
    const monthlyTraffic = [
      { date: "Jan", pageviews: 12400, sessions: 8900, users: 6200, bounceRate: 42.1 },
      { date: "Fev", pageviews: 14200, sessions: 10100, users: 7100, bounceRate: 40.5 },
      { date: "Mar", pageviews: 18100, sessions: 12900, users: 9200, bounceRate: 38.2 },
      { date: "Abr", pageviews: 16500, sessions: 11800, users: 8400, bounceRate: 39.0 },
      { date: "Mai", pageviews: 22400, sessions: 16200, users: 11500, bounceRate: 35.8 },
      { date: "Jun", pageviews: 28900, sessions: 21100, users: 14800, bounceRate: 33.4 },
      { date: "Jul", pageviews: 34500, sessions: 25400, users: 18200, bounceRate: 31.9 },
    ];
    return res.json({ isSandbox: true, report: monthlyTraffic });
  }

  try {
    const propertyId = req.query.propertyId || "properties/demo";
    const googleRes = await fetch(`https://analyticsdata.googleapis.com/v1beta/${propertyId}:runReport`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        dateRanges: [{ startDate: "30daysAgo", endDate: "today" }],
        dimensions: [{ name: "date" }],
        metrics: [
          { name: "activeUsers" },
          { name: "sessions" },
          { name: "screenPageViews" },
          { name: "bounceRate" },
        ],
      }),
    });

    if (!googleRes.ok) {
      const errorText = await googleRes.text();
      throw new Error(`Google API returned ${googleRes.status}: ${errorText}`);
    }

    const data = await googleRes.json();
    res.json({ isSandbox: false, report: data });
  } catch (err: unknown) {
    logger.error("Erro ao ler dados reais do Google Analytics", { error: err });
    res.status(500).json({ error: "Erro ao ler Google Analytics real: " + getErrorMessage(err), isSandboxFallback: true });
  }
});

app.get("/api/searchconsole/queries", async (req, res) => {
  const token = req.headers.authorization?.split(" ")[1];
  const isMock = !token || token.startsWith("mock_");

  if (isMock) {
    const siteUrl = (req.query.siteUrl as string) || "exemplo.com";
    const cleanDomain = siteUrl.replace(/^(https?:\/\/)?(www\.)?/, "").split("/")[0];
    const siteName = cleanDomain.split(".")[0];

    const mockQueries = [
      { keys: [`${siteName}`], clicks: 1245, impressions: 8900, ctr: 13.9, position: 1.1 },
      { keys: [`${siteName} login`], clicks: 822, impressions: 4500, ctr: 18.2, position: 1.3 },
      { keys: [`como usar ${cleanDomain}`], clicks: 430, impressions: 3200, ctr: 13.4, position: 3.4 },
      { keys: [`consultoria seo para ${cleanDomain}`], clicks: 312, impressions: 5100, ctr: 6.1, position: 2.5 },
      { keys: [`otimizacao de desempenho ${siteName}`], clicks: 195, impressions: 2100, ctr: 9.2, position: 4.1 },
      { keys: [`acessibilidade em ${cleanDomain}`], clicks: 154, impressions: 1800, ctr: 8.5, position: 5.0 },
      { keys: [`${siteName} auditoria gratis`], clicks: 94, impressions: 950, ctr: 9.8, position: 2.2 },
    ];
    return res.json({ isSandbox: true, queries: mockQueries });
  }

  try {
    const siteUrl = encodeURIComponent((req.query.siteUrl as string) || "https://example.com");
    const googleRes = await fetch(
      `https://www.googleapis.com/webmasters/v3/sites/${siteUrl}/searchAnalytics/query`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          startDate: "30daysAgo",
          endDate: "today",
          dimensions: ["query"],
          rowLimit: 15,
        }),
      }
    );

    if (!googleRes.ok) {
      const errorText = await googleRes.text();
      throw new Error(`Google API Search Console returned ${googleRes.status}: ${errorText}`);
    }

    const data = (await googleRes.json()) as SearchConsoleApiResponse;
    res.json({ isSandbox: false, queries: data.rows || [] });
  } catch (err: unknown) {
    logger.error("Erro ao ler dados reais do Google Search Console", { error: err, siteUrl: req.query.siteUrl });
    res.status(500).json({ error: "Erro ao ler Google Search Console: " + getErrorMessage(err), isSandboxFallback: true });
  }
});

// ============================================================================
// QUICK SEO TIPS (COM CACHE LRU 30 MIN)
// ============================================================================
function generateFallbackQuickTips(url: string, title?: string, description?: string) {
  const cleanUrl = url.replace(/^(https?:\/\/)?(www\.)?/, "");
  return {
    suggestedMeta: {
      title: title ? `${title.slice(0, 45)} | Otimizado` : `Consultoria & Soluções em ${cleanUrl}`,
      description:
        description ||
        `Acesse ${cleanUrl} para conferir serviços especializados, performance superior e atendimento consultivo.`,
      reason:
        "O título e a descrição sugeridos respeitam o limite de pixel do Google (< 60 e < 155 caracteres) com foco em CTR orgânico.",
    },
    contentStructure: [
      {
        section: "Seção Hero Principal (Acima da Dobra)",
        suggestion: "Adicione um H1 único orientado a proposta de valor acompanhado de um CTA primário visível.",
        example: `<h1>Soluções de Alto Impacto em ${cleanUrl}</h1>`,
      },
      {
        section: "Diferenciais & Prova Social (Grid H2)",
        suggestion: "Estruture benefícios e casos reais em subtítulos H2 escaneáveis.",
        example: `<h2>Por que clientes escolhem ${cleanUrl}</h2>`,
      },
      {
        section: "Perguntas Frequentes / FAQ (Schema FAQPage)",
        suggestion: "Responda objeções comerciais com marcação JSON-LD para ampliar visibilidade na SERP.",
        example: `<h2>Dúvidas Frequentes sobre ${cleanUrl}</h2>`,
      },
    ],
    trendingKeywords: [
      `${cleanUrl} serviços`,
      `melhor solução ${cleanUrl}`,
      `avaliação ${cleanUrl}`,
      `core web vitals mobile`,
      `seo técnico 2026`,
    ],
    searchTrendsContext:
      "Em 2026, o Google prioriza Core Web Vitals reais (LCP, INP e CLS), marcação semântica Schema.org válida e clareza na proposta de valor para sistemas de busca generativa (AI Overviews).",
  };
}

app.post("/api/seo/quick-tips", rateLimiter, sanitizeAndValidateInputs, async (req, res) => {
  const { url, title, description } = req.body;
  if (!url) {
    return res.status(400).json({ error: "O domínio/URL é obrigatório" });
  }

  const tipKey = `tips:${String(url).trim().toLowerCase()}`;
  const cachedTips = quickTipsCache.get(tipKey);
  if (cachedTips) {
    res.setHeader("X-Cache", "HIT");
    return res.json(cachedTips.value);
  }

  const prompt = `Gere sugestões e dicas rápidas de SEO sob medida para o domínio: ${url}.
  ${title ? `Título atual do site: "${title}"` : ""}
  ${description ? `Descrição meta atual: "${description}"` : ""}

  Baseie-se nas melhores práticas de SEO técnico em 2026 (intenção de busca, Core Web Vitals INP/LCP, E-E-A-T e AI Overviews).
  Retorne em Português do Brasil estritamente no esquema JSON especificado.`;

  try {
    const response = await generateContentWithRetryAndFallback({
      contents: prompt,
      config: {
        systemInstruction:
          "Você é um Engenheiro de SEO Sênior. Retorne sempre JSON estrito seguindo o responseSchema em pt-BR.",
        responseMimeType: "application/json",
        responseSchema: QUICK_TIPS_SCHEMA,
      },
    });

    const textResult = response.text;
    if (!textResult) {
      throw new Error("Resposta vazia da IA Gemini");
    }
    const parsedData = JSON.parse(textResult.trim()) as QuickTipsResponse;
    quickTipsCache.set(tipKey, parsedData, QUICK_TIPS_CACHE_TTL_MS);
    res.setHeader("X-Cache", "MISS");
    res.json(parsedData);
  } catch (err: unknown) {
    logger.warn("Erro na geração de dicas rápidas SEO pelo Gemini, executando fallback local.", {
      url,
      error: getErrorMessage(err),
    });
    res.json(generateFallbackQuickTips(url, title, description));
  }
});

// ============================================================================
// BASIC SECURITY SCANNER (HEADERS & XSS CHECK)
// ============================================================================
app.post("/api/security/scan", rateLimiter, sanitizeAndValidateInputs, async (req, res) => {
  const { url } = req.body;
  if (!url) {
    return res.status(400).json({ error: "O domínio/URL é obrigatório" });
  }

  const cleanDomain = url.replace(/^(https?:\/\/)?(www\.)?/, "").split("/")[0];
  const formattedUrl = url.startsWith("http://") || url.startsWith("https://") ? url : `https://${url}`;

  try {
    const headersObj: Record<string, string> = {};
    let htmlContent = "";
    let fetchedSuccessfully = false;

    try {
      if (!isSafeUrl(formattedUrl)) {
        throw new Error("SSRF Prevention: URL local ou privada bloqueada.");
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      const response = await fetch(formattedUrl, {
        signal: controller.signal,
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; SiteAnalyzer-Security-Scanner/2.0)",
        },
      });
      clearTimeout(timeoutId);
      fetchedSuccessfully = true;

      response.headers.forEach((val, key) => {
        headersObj[key.toLowerCase()] = val;
      });
      htmlContent = (await response.text()).slice(0, 512 * 1024);
    } catch (fetchErr: unknown) {
      logger.warn(`Security scanner fetch falhou para ${formattedUrl}`, { error: getErrorMessage(fetchErr) });
    }

    const headerChecks = [
      {
        name: "Content-Security-Policy",
        key: "content-security-policy",
        description:
          "Controla os recursos (scripts, imagens, estilos) que o navegador tem permissão para carregar, reduzindo drasticamente riscos de XSS.",
        recommendation:
          "Adicione o cabeçalho 'Content-Security-Policy' definindo diretivas restritas como: default-src 'self';",
      },
      {
        name: "Strict-Transport-Security",
        key: "strict-transport-security",
        description: "Força conexões HTTPS seguras prevenindo ataques man-in-the-middle.",
        recommendation: "Strict-Transport-Security: max-age=63072000; includeSubDomains; preload",
      },
      {
        name: "X-Frame-Options",
        key: "x-frame-options",
        description: "Evita ataques de clickjacking bloqueando incorporação em iFrames não autorizados.",
        recommendation: "X-Frame-Options: SAMEORIGIN ou DENY",
      },
      {
        name: "X-Content-Type-Options",
        key: "x-content-type-options",
        description: "Impede MIME sniffing pelo navegador.",
        recommendation: "X-Content-Type-Options: nosniff",
      },
      {
        name: "Referrer-Policy",
        key: "referrer-policy",
        description: "Controla informações de referência enviadas para domínios externos.",
        recommendation: "Referrer-Policy: strict-origin-when-cross-origin",
      },
      {
        name: "Permissions-Policy",
        key: "permissions-policy",
        description: "Restringe uso de APIs sensíveis do navegador (câmera, microfone, geolocalização).",
        recommendation: "Permissions-Policy: camera=(), microphone=(), geolocation=(self)",
      },
    ];

    let headerScore = 100;
    const headerResults: SecurityScanHeaderCheck[] = headerChecks.map((check) => {
      const val = headersObj[check.key];
      if (fetchedSuccessfully && val) {
        return {
          ...check,
          status: "present" as const,
          value: val,
          severity: "none" as const,
        };
      }
      let severity: "high" | "medium" | "low" = "low";
      if (check.key === "content-security-policy") {
        severity = "high";
        headerScore -= 25;
      } else if (check.key === "strict-transport-security" || check.key === "x-frame-options") {
        severity = "medium";
        headerScore -= 15;
      } else {
        headerScore -= 10;
      }
      return {
        ...check,
        status: "missing" as const,
        value: "",
        severity,
      };
    });

    if (headerScore < 10) headerScore = 10;

    const xssChecks: SecurityScanXssCheck[] = [];
    let xssScore = 100;
    const urlParams = url.includes("?") ? url.split("?")[1] : "";

    if (urlParams.length > 0) {
      xssChecks.push({
        name: "Parâmetros Ativos de Entrada na URL",
        status: "warning",
        detail: `Parâmetros detectados na URL: ${urlParams}.`,
        description: "Parâmetros dinâmicos devem ser sanitizados no backend para evitar Reflected XSS.",
        evidence: "URL possui query string ativa.",
      });
      xssScore -= 15;
    } else {
      xssChecks.push({
        name: "Parâmetros Ativos de Entrada na URL",
        status: "passed",
        detail: "Nenhum parâmetro dinâmico ativo na URL base.",
        description: "Reduz a superfície direta de ataque por XSS refletido.",
        evidence: "URL limpa.",
      });
    }

    const sinks = ["innerHTML", "document.write", "eval(", "dangerouslySetInnerHTML"];
    const unsafeSinksFound = fetchedSuccessfully ? sinks.filter((s) => htmlContent.includes(s)) : [];

    if (unsafeSinksFound.length > 0) {
      xssChecks.push({
        name: "Segurança de DOM Sinks (XSS Baseado em DOM)",
        status: "warning",
        detail: `Métodos potencialmente inseguros detectados no HTML/JS: ${unsafeSinksFound.join(", ")}.`,
        description: "Sinks de DOM sem sanitização podem permitir execução de scripts maliciosos.",
        evidence: unsafeSinksFound.join(", "),
      });
      xssScore -= 20;
    } else {
      xssChecks.push({
        name: "Segurança de DOM Sinks (XSS Baseado em DOM)",
        status: "passed",
        detail: "Nenhum sink perigoso evidente detectado no HTML inicial.",
        description: "Uso seguro de APIs de DOM previne DOM-based XSS.",
        evidence: "Aprovado na inspeção estática.",
      });
    }

    const overallScore = Math.round((headerScore + xssScore) / 2);

    const remediation = {
      express: `app.use((req, res, next) => {\n  res.setHeader('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');\n  res.setHeader('X-Frame-Options', 'SAMEORIGIN');\n  res.setHeader('X-Content-Type-Options', 'nosniff');\n  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');\n  next();\n});`,
      nginx: `add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;\nadd_header X-Frame-Options "SAMEORIGIN" always;\nadd_header X-Content-Type-Options "nosniff" always;\nadd_header Referrer-Policy "strict-origin-when-cross-origin" always;`,
      apache: `<IfModule mod_headers.c>\n  Header always set Strict-Transport-Security "max-age=63072000; includeSubDomains; preload"\n  Header always set X-Frame-Options "SAMEORIGIN"\n  Header always set X-Content-Type-Options "nosniff"\n  Header always set Referrer-Policy "strict-origin-when-cross-origin"\n</IfModule>`,
    };

    res.json({
      url: cleanDomain,
      scannedAt: new Date().toISOString(),
      score: overallScore,
      headersScore: headerScore,
      xssScore,
      headers: headerResults,
      xssChecks,
      remediation,
      fetchedSuccessfully,
    });
  } catch (error) {
    logger.error("Erro no scanner de segurança", { error });
    res.status(500).json({ error: "Erro interno ao executar a auditoria de segurança." });
  }
});

// ============================================================================
// EMAIL SCHEDULE, ADMIN CONFIG, COMPARE IA, EXPLAIN GSC, LOGS
// ============================================================================
app.post("/api/reports/schedule-email", (req, res) => {
  const { email, domain, options } = req.body;
  if (!email || !domain) {
    return res.status(400).json({ error: "Email e Domínio são obrigatórios" });
  }

  const customSubject = options?.subject || "Relatório Mensal de Auditoria SEO & Performance";
  const customNote = options?.customNote || "";
  const reportDay = options?.reportDay || 5;

  const emailHtml = `
    <div style="font-family: 'Inter', sans-serif; max-width: 600px; margin: 0 auto; padding: 28px; border: 1px solid #e4e4e7; border-radius: 12px; background-color: #ffffff;">
      <div style="text-align: center; margin-bottom: 24px; border-bottom: 2px solid #4f46e5; padding-bottom: 16px;">
        <h2 style="color: #09090b; margin: 0; font-size: 20px;">${customSubject}</h2>
        <p style="color: #52525b; margin: 6px 0 0 0; font-size: 13px;">Domínio: <strong>${domain}</strong> · Todo dia ${reportDay}</p>
      </div>
      <p style="color: #27272a; font-size: 14px; line-height: 1.6;">Relatório mensal agendado com sucesso para o domínio <strong>${domain}</strong>.</p>
      ${
        customNote
          ? `<div style="background-color: #f4f4f5; border-left: 4px solid #4f46e5; padding: 12px 16px; margin: 16px 0; border-radius: 6px;"><p style="margin: 0; font-size: 13px; color: #27272a;">"${customNote}"</p></div>`
          : ""
      }
      <div style="text-align: center; margin-top: 24px;">
        <a href="${getBaseAppUrl(req)}" style="background-color: #4f46e5; color: #ffffff; padding: 11px 22px; text-decoration: none; font-weight: 600; font-size: 13px; display: inline-block; border-radius: 8px;">Abrir SiteAnalyzer</a>
      </div>
    </div>
  `;

  res.json({
    success: true,
    message: `E-mail mensal agendado com sucesso para ${email}!`,
    sentAt: new Date().toISOString(),
    previewHtml: emailHtml,
  });
});

app.get("/api/admin/config", (_req, res) => {
  res.json({
    isMaintenanceMode: globalMaintenanceMode,
    simulateAiFailures: globalSimulateAiFailures,
    cacheStats: auditCache.stats(),
  });
});

app.post("/api/admin/config", (req, res) => {
  const { isMaintenanceMode, simulateAiFailures } = req.body;
  if (typeof isMaintenanceMode === "boolean") {
    globalMaintenanceMode = isMaintenanceMode;
  }
  if (typeof simulateAiFailures === "boolean") {
    globalSimulateAiFailures = simulateAiFailures;
  }
  res.json({
    success: true,
    isMaintenanceMode: globalMaintenanceMode,
    simulateAiFailures: globalSimulateAiFailures,
  });
});

app.post("/api/admin/cache/clear", (_req, res) => {
  auditCache.clear();
  quickTipsCache.clear();
  res.json({ success: true, message: "Cache LRU em memória limpo com sucesso." });
});

function generateFallbackCompareMarkdown(domains: DomainProfile[], activeDomainUrl: string): string {
  const activeDomain = domains.find((d) => d.url === activeDomainUrl) || domains[0];
  if (!activeDomain) return "### Domínio não encontrado";
  const latest = activeDomain.latestReport;
  const pageSize = latest?.performance?.pageSizeKb || 1500;
  const requests = latest?.performance?.requestCount || 40;
  const loadTime = latest?.performance?.loadTimeSeconds || 2.0;

  return `## Análise Comparativa: **${activeDomain.url}**

| Métrica | Atual | Ideal | Limite |
| :--- | :---: | :---: | :---: |
| **Tamanho da Página** | \`${pageSize} KB\` | \`< 1500 KB\` | \`< 3500 KB\` |
| **Requisições HTTP** | \`${requests}\` | \`< 40\` | \`< 80\` |
| **Tempo de Carregamento** | \`${loadTime}s\` | \`< 2.0s\` | \`< 4.5s\` |

### Plano de Otimização
1. Reduza o peso de imagens adotando WebP/AVIF e \`loading="lazy"\`.
2. Minimize scripts de terceiros para melhorar INP e LCP.
3. Configure cabeçalhos \`Cache-Control\` e compressão Brotli/GZIP.`;
}

app.post("/api/compare-ia", rateLimiter, sanitizeAndValidateInputs, async (req, res) => {
  const { domains, activeDomainUrl } = req.body as {
    domains?: DomainProfile[];
    activeDomainUrl?: string;
  };
  if (!domains || !Array.isArray(domains) || domains.length === 0) {
    return res.status(400).json({ error: "Lista de domínios vazia ou inválida" });
  }

  const activeDomain = domains.find((d) => d.url === activeDomainUrl) || domains[0];
  const latest = activeDomain.latestReport;
  const pageSize = latest?.performance?.pageSizeKb || 1500;
  const requests = latest?.performance?.requestCount || 40;
  const loadTime = latest?.performance?.loadTimeSeconds || 2.0;

  const prompt = `Realize uma análise comparativa técnica em Português do Brasil (Markdown) para o domínio **${activeDomain.url}**:
- Tamanho da página: ${pageSize} KB (Ideal < 1500 KB)
- Requisições HTTP: ${requests} (Ideal < 40)
- Tempo de carregamento: ${loadTime}s (Ideal < 2.0s)
- Scores: Performance ${latest?.scores?.performance ?? 50}, Acessibilidade ${latest?.scores?.accessibility ?? 50}, SEO ${latest?.scores?.seo ?? 50}
Inclua tabela comparativa com status, diagnóstico técnico e plano de ação priorizado.`;

  try {
    const response = await generateContentWithRetryAndFallback({
      contents: prompt,
      config: {
        systemInstruction:
          "Você é um consultor técnico sênior de SEO e Web Performance. Responda em Markdown limpo em pt-BR.",
      },
    });
    res.json({ markdown: response?.text || "Não foi possível gerar a análise." });
  } catch (err: unknown) {
    logger.warn("Erro em /api/compare-ia, executando fallback local.", {
      error: getErrorMessage(err),
      activeDomainUrl,
    });
    res.json({ markdown: generateFallbackCompareMarkdown(domains, activeDomainUrl || "") });
  }
});

app.post("/api/explain-gsc", rateLimiter, sanitizeAndValidateInputs, async (req, res) => {
  const { domain, issueTitle, issueCategory, issueDetails } = req.body;
  if (!domain || !issueTitle || !issueCategory) {
    return res.status(400).json({ error: "Parâmetros insuficientes" });
  }

  const prompt = `Explique tecnicamente em Markdown (pt-BR) como o Google Search Console interpreta o problema [${issueCategory}] "${issueTitle}" para o domínio ${domain}. Detalhes: ${issueDetails || "N/A"}. Aborde: 1) Relatório afetado no GSC, 2) Impacto no Googlebot/SEO, 3) Como validar a correção.`;

  try {
    const response = await generateContentWithRetryAndFallback({
      contents: prompt,
      config: {
        systemInstruction:
          "Você é um engenheiro sênior de SEO técnico e Google Search Console. Responda em Markdown claro em pt-BR.",
      },
    });
    res.json({ explanation: response?.text || "Não foi possível gerar a explicação." });
  } catch (err: unknown) {
    logger.warn("Erro em /api/explain-gsc, executando fallback local.", {
      error: getErrorMessage(err),
      domain,
    });
    res.json({
      explanation: `## Como o Google Search Console interpreta "${issueTitle}" em **${domain}**\n\n- **Categoria**: ${issueCategory}\n- **Validação**: Acesse o GSC → Inspeção de URL → Testar URL ao Vivo → **Validar Correção**.`,
    });
  }
});

app.get("/api/admin/audit-logs", (req, res) => {
  const token = req.headers["x-admin-token"];
  const expectedToken = process.env.ADMIN_TOKEN;
  if (!expectedToken || !token || token !== expectedToken) {
    writeAuditLog("SECURITY_ALERT", "backend", "Tentativa de acesso não autorizada aos logs de auditoria", req.ip);
    return res.status(403).json({ error: "Acesso não autorizado." });
  }

  try {
    if (!fs.existsSync(LOG_FILE_PATH)) {
      return res.json({ logs: [] });
    }
    const content = fs.readFileSync(LOG_FILE_PATH, "utf8");
    const lines = content
      .trim()
      .split("\n")
      .filter(Boolean)
      .slice(-100)
      .map((line) => {
        try {
          return JSON.parse(line);
        } catch {
          return { raw: line, parseError: true };
        }
      });
    res.json({ logs: lines });
  } catch (err: unknown) {
    logger.error("Falha ao ler logs de auditoria do disco", { error: err });
    res.status(500).json({ error: "Falha ao ler os logs", details: getErrorMessage(err) });
  }
});

app.post("/api/logs/frontend", (req, res) => {
  const { level, message, context } = req.body;
  writeAuditLog(level || "ERROR", "frontend", message || "Erro silenciado no frontend", req.ip, context || {});
  res.json({ success: true });
});

// Qualquer rota /api/* inexistente retorna JSON 404 (nunca cai no index.html da SPA)
app.all("/api/*", (_req, res) => {
  res.status(404).json({ error: "Endpoint da API não encontrado." });
});

// Middleware global de erro para garantir resposta JSON em qualquer exceção nas rotas /api/*
app.use(
  (
    err: unknown,
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    if (res.headersSent) {
      return next(err);
    }
    logger.error("Erro não tratado no Express middleware.", {
      path: req.path,
      error: getErrorMessage(err),
    });
    if (req.path.startsWith("/api/")) {
      return res.status(500).json({
        error: "Erro interno no servidor ao processar a requisição.",
        details: getErrorMessage(err),
      });
    }
    return next(err);
  }
);

// ============================================================================
// ARQUIVOS ESTÁTICOS VITE + SUPORTE COMPLETO A SPA (cPanel / Passenger)
// ============================================================================
function resolveDistPath(): string {
  const cwdDist = path.resolve(process.cwd(), "dist");
  if (fs.existsSync(path.join(cwdDist, "index.html"))) {
    return cwdDist;
  }
  if (typeof __dirname === "string" && fs.existsSync(path.join(__dirname, "index.html"))) {
    return __dirname;
  }
  if (fs.existsSync(path.join(process.cwd(), "index.html"))) {
    return process.cwd();
  }
  return cwdDist;
}

const isProduction = process.env.NODE_ENV === "production";
let staticMounted = false;

function mountProductionStatic() {
  if (staticMounted) return;
  staticMounted = true;

  const distPath = resolveDistPath();
  const indexHtmlPath = path.join(distPath, "index.html");

  // Cache imutável longo para assets com hash gerados pelo Vite (/assets/*)
  app.use(
    "/assets",
    express.static(path.join(distPath, "assets"), {
      maxAge: "1y",
      immutable: true,
    })
  );

  // Demais arquivos estáticos em /dist
  app.use(
    express.static(distPath, {
      index: "index.html",
      maxAge: "1h",
      setHeaders: (res, filePath) => {
        if (filePath.endsWith("index.html")) {
          res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
        }
      },
    })
  );

  // Fallback SPA: redireciona todas as rotas GET não-API para index.html
  app.get("*", (req, res) => {
    if (req.path.startsWith("/api/")) {
      return res.status(404).json({ error: "Endpoint da API não encontrado." });
    }
    if (fs.existsSync(indexHtmlPath)) {
      res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
      return res.sendFile(indexHtmlPath);
    }
    return res.status(503).send("Build frontend (/dist/index.html) não encontrado. Execute `npm run build`.");
  });

  logger.info("Frontend estático Vite montado para produção (cPanel/Passenger).", { distPath });
}

// Em produção, monta os estáticos imediatamente para compatibilidade quando o Passenger importa `app`
if (isProduction) {
  mountProductionStatic();
}

let serverStarted = false;

export async function startServer() {
  if (serverStarted) return app;
  serverStarted = true;

  if (!isProduction) {
    // Carrega Vite dinamicamente apenas em desenvolvimento (0 RAM extra em produção no cPanel)
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    mountProductionStatic();
  }

  const rawPort = process.env.PORT;
  const onListen = () => {
    logger.info("Servidor SiteAnalyzer ativo e escutando requisições.", {
      port: rawPort || 3000,
      nodeEnv: process.env.NODE_ENV || "development",
    });
    console.log(`[SiteAnalyzer] Server running on port/socket: ${rawPort || 3000}`);
  };

  if (rawPort && Number.isNaN(Number(rawPort))) {
    // Named pipe / Unix socket injetado pelo Phusion Passenger
    app.listen(rawPort, onListen);
  } else {
    app.listen(rawPort ? Number(rawPort) : 3000, onListen);
  }

  return app;
}

// Auto-start quando executado diretamente (`tsx server.ts` ou `node dist/server.cjs`)
// Quando carregado via `app.js` no cPanel, o `app.js` chama `startServer()` ou exporta `app`.
const isDirectExecution =
  typeof require !== "undefined" && typeof module !== "undefined" && require.main === module;
const isTsxDev = !isProduction && process.argv[1]?.endsWith("server.ts");

if (isDirectExecution || isTsxDev) {
  startServer().catch((err) => {
    logger.fatal("Falha crítica na inicialização do servidor.", { error: err });
    process.exit(1);
  });
}

export default app;
