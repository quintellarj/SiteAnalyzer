import tls from "node:tls";
import * as cheerio from "cheerio/slim";
import { logger } from "./logger";
import type {
  PassiveSecurityAudit,
  SecurityCookieFlagCheck,
  SecurityExposedFileCheck,
  SecurityHeaderItem,
  SecurityMixedContentItem,
  SecuritySslAudit,
} from "../src/types";

const USER_AGENT =
  "Mozilla/5.0 (compatible; SiteAnalyzerBot/2.0; +https://siteanalyzer.s7vendesign.com.br)";

export interface PassiveSecurityNetworkProbes {
  ssl: SecuritySslAudit;
  exposedFiles: SecurityExposedFileCheck[];
}

function getErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;
  return String(err);
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
    });
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Inspeciona o certificado SSL/TLS diretamente via módulo nativo `node:tls`
 * (zero Puppeteer, baixíssimo consumo de RAM para cPanel / Phusion Passenger).
 */
async function inspectTlsCertificate(hostname: string, port = 443): Promise<{
  certificateValid: boolean;
  issuer: string;
  validFrom?: string;
  validTo?: string;
  daysUntilExpiration: number | null;
  protocol?: string;
  error?: string;
}> {
  return new Promise((resolve) => {
    let settled = false;
    const finish = (result: {
      certificateValid: boolean;
      issuer: string;
      validFrom?: string;
      validTo?: string;
      daysUntilExpiration: number | null;
      protocol?: string;
      error?: string;
    }) => {
      if (settled) return;
      settled = true;
      resolve(result);
    };

    try {
      const socket = tls.connect(
        {
          host: hostname,
          port,
          servername: hostname,
          rejectUnauthorized: false,
          timeout: 4500,
        },
        () => {
          try {
            const cert = socket.getPeerCertificate();
            const protocol = socket.getProtocol() || undefined;
            const authorized = socket.authorized;

            if (!cert || Object.keys(cert).length === 0) {
              socket.end();
              finish({
                certificateValid: false,
                issuer: "Não apresentado",
                daysUntilExpiration: null,
                protocol,
                error: "Servidor não apresentou certificado TLS.",
              });
              return;
            }

            const validToDate = cert.valid_to ? new Date(cert.valid_to) : null;
            const validFromDate = cert.valid_from ? new Date(cert.valid_from) : null;
            const nowMs = Date.now();
            const daysUntilExpiration =
              validToDate && !Number.isNaN(validToDate.getTime())
                ? Math.floor((validToDate.getTime() - nowMs) / (1000 * 60 * 60 * 24))
                : null;

            const issuerObj = cert.issuer as Record<string, string | string[]> | undefined;
            const issuerOrg = issuerObj?.O || issuerObj?.CN || "Autoridade Certificadora";
            const issuer = Array.isArray(issuerOrg) ? issuerOrg.join(", ") : String(issuerOrg);

            const isNotExpired = daysUntilExpiration !== null ? daysUntilExpiration > 0 : false;
            const certificateValid = Boolean(authorized && isNotExpired);

            socket.end();
            finish({
              certificateValid,
              issuer,
              validFrom:
                validFromDate && !Number.isNaN(validFromDate.getTime())
                  ? validFromDate.toISOString()
                  : undefined,
              validTo:
                validToDate && !Number.isNaN(validToDate.getTime())
                  ? validToDate.toISOString()
                  : undefined,
              daysUntilExpiration,
              protocol,
              error: authorized ? undefined : String(socket.authorizationError || "Certificado não confiável"),
            });
          } catch (innerErr: unknown) {
            socket.destroy();
            finish({
              certificateValid: false,
              issuer: "Desconhecido",
              daysUntilExpiration: null,
              error: getErrorMessage(innerErr),
            });
          }
        }
      );

      socket.setTimeout(4500, () => {
        socket.destroy();
        finish({
          certificateValid: false,
          issuer: "Timeout TLS",
          daysUntilExpiration: null,
          error: "Tempo limite excedido ao inspecionar certificado TLS.",
        });
      });

      socket.on("error", (err: Error) => {
        socket.destroy();
        finish({
          certificateValid: false,
          issuer: "Indisponível",
          daysUntilExpiration: null,
          error: err.message,
        });
      });
    } catch (err: unknown) {
      finish({
        certificateValid: false,
        issuer: "Indisponível",
        daysUntilExpiration: null,
        error: getErrorMessage(err),
      });
    }
  });
}

/**
 * Verifica se http://<hostname> redireciona automaticamente para https://
 */
async function checkHttpToHttpsRedirect(hostname: string): Promise<{
  httpRedirectsToHttps: boolean;
  httpRedirectStatus: number | null;
}> {
  try {
    const res = await fetchWithTimeout(`http://${hostname}/`, 4000, {
      method: "HEAD",
      redirect: "manual",
      headers: { "User-Agent": USER_AGENT },
    });
    const status = res.status;
    const location = (res.headers.get("location") || "").toLowerCase();
    const isRedirectStatus = status >= 300 && status < 400;
    const redirectsToHttps = isRedirectStatus && location.startsWith("https://");
    return {
      httpRedirectsToHttps: redirectsToHttps,
      httpRedirectStatus: status,
    };
  } catch {
    return {
      httpRedirectsToHttps: false,
      httpRedirectStatus: null,
    };
  }
}

/**
 * Checagem passiva e segura de exposição acidental de arquivos críticos (`/.env`, `/.git/HEAD`).
 * Nunca armazena, registra em log ou retorna qualquer conteúdo de arquivo — apenas avalia
 * status HTTP e Content-Type para evitar falsos positivos em SPAs (que retornam 200 HTML).
 */
async function checkSensitiveFileExposure(
  origin: string,
  filePath: "/.env" | "/.git/HEAD"
): Promise<SecurityExposedFileCheck> {
  const probeUrl = `${origin}${filePath}`;
  try {
    const res = await fetchWithTimeout(probeUrl, 3500, {
      method: "HEAD",
      redirect: "manual",
      headers: { "User-Agent": USER_AGENT },
    });

    const status = res.status;
    const contentType = (res.headers.get("content-type") || "").toLowerCase();

    if (status === 404 || status === 403 || status === 401 || status === 410 || status >= 400) {
      return {
        path: filePath,
        status,
        exposed: false,
        note: `Protegido (HTTP ${status})`,
      };
    }

    if (status >= 300 && status < 400) {
      return {
        path: filePath,
        status,
        exposed: false,
        note: `Redirecionado (HTTP ${status})`,
      };
    }

    // Se retornou 200 com text/html, normalmente é fallback SPA ou página customizada de erro
    if (status === 200 && contentType.includes("text/html")) {
      return {
        path: filePath,
        status,
        exposed: false,
        note: "Fallback HTML (não exposto como arquivo bruto)",
      };
    }

    // Status 200 não-HTML (ex: text/plain, application/octet-stream) indica provável exposição real
    if (status === 200) {
      return {
        path: filePath,
        status,
        exposed: true,
        note: `Possível exposição pública (HTTP 200 · ${contentType || "sem Content-Type HTML"})`,
      };
    }

    return {
      path: filePath,
      status,
      exposed: false,
      note: `HTTP ${status}`,
    };
  } catch {
    return {
      path: filePath,
      status: null,
      exposed: false,
      note: "Inacessível / Bloqueado",
    };
  }
}

/**
 * Executa as sondagens de rede passivas de segurança em paralelo (TLS + Redirect HTTP->HTTPS + arquivos críticos).
 */
export async function runPassiveSecurityProbes(targetUrl: string): Promise<PassiveSecurityNetworkProbes> {
  const parsed = new URL(targetUrl);
  const hostname = parsed.hostname;
  const origin = parsed.origin;
  const isHttps = parsed.protocol === "https:";
  const port = parsed.port ? Number(parsed.port) : 443;

  const [tlsSettled, redirectSettled, envSettled, gitSettled] = await Promise.allSettled([
    inspectTlsCertificate(hostname, Number.isNaN(port) ? 443 : port),
    checkHttpToHttpsRedirect(hostname),
    checkSensitiveFileExposure(origin, "/.env"),
    checkSensitiveFileExposure(origin, "/.git/HEAD"),
  ]);

  const tlsInfo =
    tlsSettled.status === "fulfilled"
      ? tlsSettled.value
      : {
          certificateValid: false,
          issuer: "Indisponível",
          daysUntilExpiration: null,
          error: "Falha na inspeção TLS",
        };

  const redirectInfo =
    redirectSettled.status === "fulfilled"
      ? redirectSettled.value
      : { httpRedirectsToHttps: false, httpRedirectStatus: null };

  const exposedFiles: SecurityExposedFileCheck[] = [
    envSettled.status === "fulfilled"
      ? envSettled.value
      : { path: "/.env", status: null, exposed: false, note: "Não verificado" },
    gitSettled.status === "fulfilled"
      ? gitSettled.value
      : { path: "/.git/HEAD", status: null, exposed: false, note: "Não verificado" },
  ];

  return {
    ssl: {
      isHttps,
      httpRedirectsToHttps: redirectInfo.httpRedirectsToHttps,
      httpRedirectStatus: redirectInfo.httpRedirectStatus,
      certificateValid: tlsInfo.certificateValid,
      issuer: tlsInfo.issuer,
      validFrom: tlsInfo.validFrom,
      validTo: tlsInfo.validTo,
      daysUntilExpiration: tlsInfo.daysUntilExpiration,
      protocol: tlsInfo.protocol,
      error: tlsInfo.error,
    },
    exposedFiles,
  };
}

/**
 * Inspeciona flags de segurança nos cabeçalhos Set-Cookie (armazenando apenas o nome do cookie,
 * nunca o valor, para preservação de privacidade e segurança).
 */
function inspectSetCookieHeaders(setCookies: string[]): SecurityCookieFlagCheck[] {
  const items: SecurityCookieFlagCheck[] = [];

  for (const rawHeader of setCookies.slice(0, 12)) {
    const parts = rawHeader.split(";").map((p) => p.trim());
    const nameValue = parts[0] || "";
    const eqIdx = nameValue.indexOf("=");
    const name = (eqIdx > 0 ? nameValue.slice(0, eqIdx) : nameValue).trim() || "cookie";

    const attrLower = parts.slice(1).map((a) => a.toLowerCase());
    const secure = attrLower.includes("secure");
    const httpOnly = attrLower.includes("httponly");
    const sameSitePart = parts.slice(1).find((a) => a.toLowerCase().startsWith("samesite="));
    const sameSite = sameSitePart ? sameSitePart.split("=")[1]?.trim() || null : null;

    const issues: string[] = [];
    if (!secure) issues.push("Sem flag Secure");
    if (!httpOnly) issues.push("Sem flag HttpOnly");
    if (!sameSite) {
      issues.push("Sem atributo SameSite");
    } else if (sameSite.toLowerCase() === "none" && !secure) {
      issues.push("SameSite=None exige flag Secure");
    }

    items.push({ name, secure, httpOnly, sameSite, issues });
  }

  return items;
}

/**
 * Detecta Mixed Content (recursos http:// carregados dentro de página https://) via Cheerio.
 */
function inspectMixedContent(html: string, finalUrl: string): {
  count: number;
  hasActiveMixedContent: boolean;
  items: SecurityMixedContentItem[];
} {
  if (!finalUrl.toLowerCase().startsWith("https://") || !html) {
    return { count: 0, hasActiveMixedContent: false, items: [] };
  }

  const $ = cheerio.load(html);
  const found: SecurityMixedContentItem[] = [];
  const seen = new Set<string>();

  const pushItem = (tag: SecurityMixedContentItem["tag"], rawUrl: string | undefined, severity: "critical" | "warning") => {
    const cleaned = (rawUrl || "").trim();
    if (!cleaned.toLowerCase().startsWith("http://")) return;
    const key = `${tag}:${cleaned}`;
    if (seen.has(key)) return;
    seen.add(key);
    found.push({ tag, url: cleaned.slice(0, 180), severity });
  };

  $("script[src]").each((_, el) => pushItem("script", $(el).attr("src"), "critical"));
  $("iframe[src]").each((_, el) => pushItem("iframe", $(el).attr("src"), "critical"));
  $('link[rel="stylesheet"][href]').each((_, el) => pushItem("link", $(el).attr("href"), "critical"));
  $("img[src]").each((_, el) => pushItem("img", $(el).attr("src"), "warning"));

  const hasActiveMixedContent = found.some((i) => i.severity === "critical");

  return {
    count: found.length,
    hasActiveMixedContent,
    items: found.slice(0, 12),
  };
}

function scoreToGrade(score: number): PassiveSecurityAudit["grade"] {
  if (score >= 95) return "A+";
  if (score >= 85) return "A";
  if (score >= 70) return "B";
  if (score >= 55) return "C";
  if (score >= 40) return "D";
  return "F";
}

/**
 * Consolida todas as verificações de segurança passiva em um Security Score (0 a 100).
 */
export function buildPassiveSecurityAudit(params: {
  finalUrl: string;
  headers: Record<string, string>;
  setCookies: string[];
  html: string;
  probes: PassiveSecurityNetworkProbes;
}): PassiveSecurityAudit {
  const { finalUrl, headers, setCookies, html, probes } = params;
  const finalIsHttps = finalUrl.toLowerCase().startsWith("https://");

  const ssl: SecuritySslAudit = {
    ...probes.ssl,
    isHttps: finalIsHttps || probes.ssl.isHttps,
  };

  // 1. Headers de Segurança HTTP (6 cabeçalhos essenciais)
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
      penalty: 12,
      recommendation: "Strict-Transport-Security: max-age=63072000; includeSubDomains; preload",
    },
    {
      name: "Content-Security-Policy (CSP)",
      key: "content-security-policy",
      missingSeverity: "high",
      penalty: 14,
      recommendation: "Defina diretivas CSP restritivas (ex: default-src 'self'; object-src 'none'; frame-ancestors 'self')",
    },
    {
      name: "X-Frame-Options",
      key: "x-frame-options",
      missingSeverity: "medium",
      penalty: 8,
      recommendation: "X-Frame-Options: SAMEORIGIN (ou DENY)",
    },
    {
      name: "X-Content-Type-Options",
      key: "x-content-type-options",
      missingSeverity: "medium",
      penalty: 8,
      recommendation: "X-Content-Type-Options: nosniff",
    },
    {
      name: "Referrer-Policy",
      key: "referrer-policy",
      missingSeverity: "low",
      penalty: 6,
      recommendation: "Referrer-Policy: strict-origin-when-cross-origin",
    },
    {
      name: "Permissions-Policy",
      key: "permissions-policy",
      missingSeverity: "low",
      penalty: 6,
      recommendation: "Permissions-Policy: camera=(), microphone=(), geolocation=()",
    },
  ];

  let score = 100;

  const securityHeaders: SecurityHeaderItem[] = headerSpecs.map((spec) => {
    const val = headers[spec.key];
    const present = Boolean(val);
    if (!present) {
      score -= spec.penalty;
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

  // 2. HTTPS & TLS
  if (!ssl.isHttps) {
    score -= 30;
  } else {
    if (!ssl.certificateValid) {
      score -= 22;
    } else if (ssl.daysUntilExpiration !== null && ssl.daysUntilExpiration <= 15) {
      score -= 12;
    } else if (ssl.daysUntilExpiration !== null && ssl.daysUntilExpiration <= 30) {
      score -= 5;
    }
    if (!ssl.httpRedirectsToHttps) {
      score -= 6;
    }
  }

  // 3. Information Disclosure (Server / X-Powered-By / arquivos críticos)
  const serverHeader = headers["server"] || "Não exposto";
  const poweredByHeader = headers["x-powered-by"] || "Não exposto";
  const serverExposesVersion = /\/\d+(\.\d+)*/.test(serverHeader);
  const poweredByExposed = poweredByHeader !== "Não exposto";

  if (poweredByExposed) score -= 5;
  if (serverExposesVersion) score -= 4;

  const exposedCount = probes.exposedFiles.filter((f) => f.exposed).length;
  if (exposedCount > 0) {
    score -= exposedCount * 22;
  }

  // 4. Higiene de Conteúdo (Mixed Content) & Cookies
  const mixedContent = inspectMixedContent(html, finalUrl);
  if (mixedContent.hasActiveMixedContent) {
    score -= 18;
  } else if (mixedContent.count > 0) {
    score -= 8;
  }

  const cookieItems = inspectSetCookieHeaders(setCookies);
  const insecureCookies = cookieItems.filter((c) => c.issues.length > 0).length;
  if (insecureCookies > 0) {
    score -= Math.min(10, insecureCookies * 4);
  }

  score = Math.max(0, Math.min(100, Math.round(score)));
  const grade = scoreToGrade(score);

  logger.info("[Camada Segurança Passiva] Auditoria concluída.", {
    finalUrl,
    securityScore: score,
    grade,
    sslValid: ssl.certificateValid,
    daysUntilExpiration: ssl.daysUntilExpiration,
    mixedContentCount: mixedContent.count,
    exposedFiles: exposedCount,
  });

  return {
    score,
    grade,
    checkedAt: new Date().toISOString(),
    ssl,
    headers: securityHeaders,
    informationDisclosure: {
      serverHeader,
      serverExposesVersion,
      poweredByHeader,
      poweredByExposed,
      exposedFiles: probes.exposedFiles,
    },
    mixedContent,
    cookies: {
      total: cookieItems.length,
      insecureCount: insecureCookies,
      items: cookieItems,
    },
  };
}
