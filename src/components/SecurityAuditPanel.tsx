import React from "react";
import {
  ShieldCheck,
  ShieldAlert,
  Lock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  FileWarning,
  Cookie,
  GlobeLock,
} from "lucide-react";
import type { PassiveSecurityAudit } from "../types";

interface SecurityAuditPanelProps {
  security?: PassiveSecurityAudit;
}

export default function SecurityAuditPanel({ security }: SecurityAuditPanelProps) {
  if (!security) return null;

  const gradeTone =
    security.score >= 85
      ? "bg-emerald-500/10 border-emerald-500/25 text-emerald-400"
      : security.score >= 55
        ? "bg-amber-500/10 border-amber-500/25 text-amber-400"
        : "bg-rose-500/10 border-rose-500/25 text-rose-400";

  const sslDays = security.ssl.daysUntilExpiration;
  const sslStatusBadge = !security.ssl.isHttps
    ? {
        label: "Ausente (HTTP)",
        cls: "bg-rose-500/10 border-rose-500/25 text-rose-400",
      }
    : !security.ssl.certificateValid
      ? {
          label: "Inválido / Expirado",
          cls: "bg-rose-500/10 border-rose-500/25 text-rose-400",
        }
      : sslDays !== null && sslDays <= 30
        ? {
            label: `Expira em ${sslDays} dias`,
            cls: "bg-amber-500/10 border-amber-500/25 text-amber-400",
          }
        : {
            label: sslDays !== null ? `Ativo · Expira em ${sslDays} dias` : "Ativo",
            cls: "bg-emerald-500/10 border-emerald-500/25 text-emerald-400",
          };

  const activeHeaderCount = security.headers.filter((h) => h.present).length;

  return (
    <section className="bento-card overflow-hidden animate-fade-in relative">
      <div className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-emerald-500/60 to-transparent" />

      {/* Header */}
      <div className="px-6 py-4 border-b border-zinc-800/80 bg-zinc-950/45 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 shrink-0">
            {security.score >= 70 ? (
              <ShieldCheck className="h-4 w-4" />
            ) : (
              <ShieldAlert className="h-4 w-4 text-rose-400" />
            )}
          </div>
          <div>
            <h3 className="font-display font-semibold text-zinc-100 text-sm tracking-tight">
              Checklist de Segurança Passiva · Headers, SSL & Higiene AppSec
            </h3>
            <p className="text-[11px] font-mono tabular-nums text-zinc-400 mt-0.5">
              TLS/HTTPS · {activeHeaderCount}/{security.headers.length} Headers HTTP · Mixed Content · Cookies · Arquivos Sensíveis
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 font-mono tabular-nums">
          <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold border ${gradeTone}`}>
            Nota {security.grade} · {security.score}/100
          </span>
        </div>
      </div>

      {/* Bento Content */}
      <div className="p-5 grid grid-cols-1 lg:grid-cols-12 gap-4 text-xs">
        {/* Left Column (5 cols): SSL/TLS + Disclosure + Mixed Content + Cookies */}
        <div className="lg:col-span-5 flex flex-col gap-3.5">
          {/* Card 1: SSL / TLS & Redirecionamento HTTPS */}
          <div className="p-4 rounded-xl bg-zinc-950/70 border border-zinc-800/80 space-y-3">
            <div className="flex items-center justify-between gap-2 pb-2 border-b border-zinc-800/80">
              <span className="font-display font-semibold text-zinc-200 text-xs flex items-center gap-1.5">
                <Lock className="h-3.5 w-3.5 text-emerald-400" />
                Certificado SSL & Transporte HTTPS
              </span>
              <span className={`px-2 py-0.5 rounded-full border font-mono tabular-nums text-[10px] font-semibold ${sslStatusBadge.cls}`}>
                {sslStatusBadge.label}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2.5 font-mono text-[11px]">
              <div className="p-2.5 rounded-lg bg-bento border border-zinc-800">
                <span className="text-[9.5px] uppercase text-zinc-500 block">Emissor / CA</span>
                <span className="text-zinc-200 font-medium truncate block mt-0.5" title={security.ssl.issuer}>
                  {security.ssl.issuer}
                </span>
              </div>
              <div className="p-2.5 rounded-lg bg-bento border border-zinc-800">
                <span className="text-[9.5px] uppercase text-zinc-500 block">Protocolo TLS</span>
                <span className="text-zinc-200 font-medium block mt-0.5">
                  {security.ssl.protocol || (security.ssl.isHttps ? "TLS/HTTPS" : "HTTP")}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-bento border border-zinc-800 font-mono text-[11px]">
              <span className="text-zinc-400">Redirect HTTP → HTTPS</span>
              <span
                className={`px-2 py-0.5 rounded-full border text-[10px] font-semibold ${
                  security.ssl.httpRedirectsToHttps
                    ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                    : "bg-amber-500/10 border-amber-500/20 text-amber-400"
                }`}
              >
                {security.ssl.httpRedirectsToHttps
                  ? `Ativo (${security.ssl.httpRedirectStatus ?? 301})`
                  : "Ausente"}
              </span>
            </div>
          </div>

          {/* Card 2: Vazamento de Assinatura & Arquivos Críticos */}
          <div className="p-4 rounded-xl bg-zinc-950/70 border border-zinc-800/80 space-y-2.5">
            <div className="flex items-center gap-1.5 font-display font-semibold text-zinc-200 text-xs pb-2 border-b border-zinc-800/80">
              <FileWarning className="h-3.5 w-3.5 text-amber-400" />
              <span>Information Disclosure & Arquivos Críticos</span>
            </div>

            <div className="space-y-1.5 font-mono text-[11px]">
              <div className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-bento border border-zinc-800">
                <span className="text-zinc-400 truncate">Server: {security.informationDisclosure.serverHeader}</span>
                <span
                  className={`px-2 py-0.5 rounded-full border text-[10px] font-semibold shrink-0 ${
                    security.informationDisclosure.serverExposesVersion
                      ? "bg-amber-500/10 border-amber-500/20 text-amber-400"
                      : "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                  }`}
                >
                  {security.informationDisclosure.serverExposesVersion ? "Versão Exposta" : "OK"}
                </span>
              </div>

              <div className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-bento border border-zinc-800">
                <span className="text-zinc-400 truncate">
                  X-Powered-By: {security.informationDisclosure.poweredByHeader}
                </span>
                <span
                  className={`px-2 py-0.5 rounded-full border text-[10px] font-semibold shrink-0 ${
                    security.informationDisclosure.poweredByExposed
                      ? "bg-amber-500/10 border-amber-500/20 text-amber-400"
                      : "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                  }`}
                >
                  {security.informationDisclosure.poweredByExposed ? "Exposto" : "Oculto"}
                </span>
              </div>

              {security.informationDisclosure.exposedFiles.map((file) => (
                <div
                  key={file.path}
                  className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-bento border border-zinc-800"
                >
                  <span className="text-zinc-300">{file.path}</span>
                  <span
                    className={`px-2 py-0.5 rounded-full border text-[10px] font-semibold ${
                      file.exposed
                        ? "bg-rose-500/10 border-rose-500/25 text-rose-400"
                        : "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                    }`}
                  >
                    {file.exposed ? `Exposto (HTTP ${file.status})` : file.note}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Card 3: Mixed Content & Cookies */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3.5 rounded-xl bg-zinc-950/70 border border-zinc-800/80 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] uppercase text-zinc-400 flex items-center gap-1">
                  <GlobeLock className="h-3 w-3 text-indigo-400" />
                  Mixed Content
                </span>
                <span
                  className={`px-2 py-0.5 rounded-full border font-mono tabular-nums text-[10px] font-semibold ${
                    security.mixedContent.hasActiveMixedContent
                      ? "bg-rose-500/10 border-rose-500/25 text-rose-400"
                      : security.mixedContent.count > 0
                        ? "bg-amber-500/10 border-amber-500/25 text-amber-400"
                        : "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                  }`}
                >
                  {security.mixedContent.count === 0
                    ? "Limpo (0)"
                    : `${security.mixedContent.count} alerta(s)`}
                </span>
              </div>
              <p className="text-[11px] text-zinc-400 leading-relaxed">
                {security.mixedContent.count === 0
                  ? "Nenhum recurso http:// carregado dentro de página https://."
                  : security.mixedContent.hasActiveMixedContent
                    ? "Scripts ou iframes HTTP bloqueiam o cadeado SSL."
                    : "Imagens HTTP detectadas em página HTTPS."}
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-zinc-950/70 border border-zinc-800/80 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] uppercase text-zinc-400 flex items-center gap-1">
                  <Cookie className="h-3 w-3 text-indigo-400" />
                  Set-Cookie Flags
                </span>
                <span
                  className={`px-2 py-0.5 rounded-full border font-mono tabular-nums text-[10px] font-semibold ${
                    security.cookies.insecureCount > 0
                      ? "bg-amber-500/10 border-amber-500/25 text-amber-400"
                      : "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                  }`}
                >
                  {security.cookies.total === 0
                    ? "Sem cookies"
                    : security.cookies.insecureCount === 0
                      ? `${security.cookies.total} seguro(s)`
                      : `${security.cookies.insecureCount}/${security.cookies.total} sem flags`}
                </span>
              </div>
              <p className="text-[11px] text-zinc-400 leading-relaxed">
                {security.cookies.total === 0
                  ? "A resposta inicial não emitiu cabeçalhos Set-Cookie."
                  : security.cookies.insecureCount === 0
                    ? "Todos os cookies possuem Secure, HttpOnly e SameSite."
                    : "Faltam flags Secure, HttpOnly ou SameSite em cookies."}
              </p>
            </div>
          </div>
        </div>

        {/* Right Column (7 cols): Checklist Completo dos 6 Headers de Segurança HTTP */}
        <div className="lg:col-span-7 p-4 rounded-xl bg-zinc-950/70 border border-zinc-800/80 flex flex-col gap-3">
          <div className="flex items-center justify-between pb-2 border-b border-zinc-800/80">
            <span className="font-display font-semibold text-zinc-200 text-xs flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4 text-indigo-400" />
              Checklist de Cabeçalhos HTTP de Segurança
            </span>
            <span className="font-mono tabular-nums text-[10px] text-zinc-400">
              {activeHeaderCount} de {security.headers.length} ativos
            </span>
          </div>

          <div className="grid grid-cols-1 gap-2.5 flex-1">
            {security.headers.map((header) => (
              <div
                key={header.key}
                className="p-3 rounded-xl bg-bento border border-zinc-800/90 hover:border-zinc-700 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-2.5"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    {header.present ? (
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                    ) : header.severity === "high" ? (
                      <XCircle className="h-3.5 w-3.5 text-rose-400 shrink-0" />
                    ) : (
                      <AlertTriangle className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                    )}
                    <span className="font-mono text-xs font-semibold text-zinc-100 truncate">
                      {header.name}
                    </span>
                  </div>
                  <p className="font-mono text-[10.5px] text-zinc-500 mt-1 truncate" title={header.present ? header.value : header.recommendation}>
                    {header.present ? header.value : header.recommendation}
                  </p>
                </div>

                <span
                  className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full border font-mono text-[10px] font-semibold shrink-0 self-start sm:self-center ${
                    header.present
                      ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                      : header.severity === "high"
                        ? "bg-rose-500/10 border-rose-500/25 text-rose-400"
                        : "bg-amber-500/10 border-amber-500/25 text-amber-400"
                  }`}
                >
                  {header.present ? "Ativo" : "Ausente"}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
