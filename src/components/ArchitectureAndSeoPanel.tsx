import React from "react";
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Server,
  ShieldCheck,
  Code2,
  FileCode2,
  Cpu,
  Globe,
} from "lucide-react";
import type { ArchitectureAudit, SeoOnPageAudit } from "../types";

interface ArchitectureAndSeoPanelProps {
  seoOnPage?: SeoOnPageAudit;
  architecture?: ArchitectureAudit;
}

export default function ArchitectureAndSeoPanel({
  seoOnPage,
  architecture,
}: ArchitectureAndSeoPanelProps) {
  if (!seoOnPage && !architecture) return null;

  const StatusBadge = ({ ok, label }: { ok: boolean; label: string }) => (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-mono text-[10px] font-semibold border ${
        ok
          ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
          : "bg-rose-500/10 border-rose-500/20 text-rose-400"
      }`}
    >
      {ok ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
      {label}
    </span>
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 animate-fade-in">
      {/* CAMADA B (7 cols): CRAWLER & SEO ON-PAGE (CHEERIO) */}
      {seoOnPage && (
        <div className="lg:col-span-7 bento-card overflow-hidden flex flex-col">
          <div className="px-5 py-4 border-b border-zinc-800/80 bg-zinc-950/40 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/25 text-indigo-400">
                <FileCode2 className="h-4 w-4" />
              </div>
              <div>
                <h3 className="font-display font-semibold text-zinc-100 text-sm tracking-tight">
                  Crawler & SEO On-Page
                </h3>
                <p className="text-[11px] font-mono tabular-nums text-zinc-400">
                  Camada B · Cheerio · HTTP {seoOnPage.httpStatus}
                </p>
              </div>
            </div>
            <StatusBadge
              ok={seoOnPage.robotsMeta.isIndexable}
              label={seoOnPage.robotsMeta.isIndexable ? "Indexável" : "Noindex"}
            />
          </div>

          <div className="p-5 flex-1 flex flex-col gap-4 text-xs">
            {/* Title & Description */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3.5 rounded-xl bg-zinc-950/65 border border-zinc-800/80">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-mono text-[10px] uppercase tracking-wider text-zinc-500">
                    &lt;title&gt;
                  </span>
                  <span
                    className={`font-mono tabular-nums text-[10px] font-semibold px-1.5 py-0.5 rounded border ${
                      seoOnPage.titleLength >= 25 && seoOnPage.titleLength <= 65
                        ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                        : "bg-amber-500/10 border-amber-500/20 text-amber-400"
                    }`}
                  >
                    {seoOnPage.titleLength} chars
                  </span>
                </div>
                <p className="text-xs font-medium text-zinc-200 line-clamp-2 leading-relaxed">
                  {seoOnPage.title || "Tag <title> ausente"}
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-zinc-950/65 border border-zinc-800/80">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-mono text-[10px] uppercase tracking-wider text-zinc-500">
                    Meta Description
                  </span>
                  <span
                    className={`font-mono tabular-nums text-[10px] font-semibold px-1.5 py-0.5 rounded border ${
                      seoOnPage.descriptionLength >= 80 && seoOnPage.descriptionLength <= 165
                        ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                        : "bg-amber-500/10 border-amber-500/20 text-amber-400"
                    }`}
                  >
                    {seoOnPage.descriptionLength} chars
                  </span>
                </div>
                <p className="text-xs text-zinc-400 line-clamp-2 leading-relaxed">
                  {seoOnPage.description || "Meta description ausente"}
                </p>
              </div>
            </div>

            {/* Technical Checks Matrix */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              <div className="p-3 rounded-xl bg-zinc-950/65 border border-zinc-800/80 flex flex-col gap-1.5">
                <span className="font-mono text-[10px] text-zinc-500 uppercase">Canonical</span>
                <div>
                  <StatusBadge ok={seoOnPage.canonical.present} label={seoOnPage.canonical.present ? "Presente" : "Ausente"} />
                </div>
              </div>

              <div className="p-3 rounded-xl bg-zinc-950/65 border border-zinc-800/80 flex flex-col gap-1.5">
                <span className="font-mono text-[10px] text-zinc-500 uppercase">Open Graph</span>
                <div>
                  <StatusBadge
                    ok={seoOnPage.openGraph.hasTitle && seoOnPage.openGraph.hasImage}
                    label={seoOnPage.openGraph.hasTitle && seoOnPage.openGraph.hasImage ? "Completo" : "Parcial"}
                  />
                </div>
              </div>

              <div className="p-3 rounded-xl bg-zinc-950/65 border border-zinc-800/80 flex flex-col gap-1.5">
                <span className="font-mono text-[10px] text-zinc-500 uppercase">JSON-LD</span>
                <div>
                  <StatusBadge
                    ok={seoOnPage.structuredData.validCount > 0 && seoOnPage.structuredData.invalidCount === 0}
                    label={
                      seoOnPage.structuredData.validCount > 0
                        ? `${seoOnPage.structuredData.validCount} válido(s)`
                        : "Ausente"
                    }
                  />
                </div>
              </div>

              <div className="p-3 rounded-xl bg-zinc-950/65 border border-zinc-800/80 flex flex-col gap-1.5">
                <span className="font-mono text-[10px] text-zinc-500 uppercase">/robots.txt</span>
                <div>
                  <StatusBadge
                    ok={seoOnPage.robotsTxt.exists}
                    label={seoOnPage.robotsTxt.exists ? `HTTP ${seoOnPage.robotsTxt.status}` : "Ausente"}
                  />
                </div>
              </div>

              <div className="p-3 rounded-xl bg-zinc-950/65 border border-zinc-800/80 flex flex-col gap-1.5">
                <span className="font-mono text-[10px] text-zinc-500 uppercase">/sitemap.xml</span>
                <div>
                  <StatusBadge
                    ok={seoOnPage.sitemapXml.exists}
                    label={
                      seoOnPage.sitemapXml.exists
                        ? `${seoOnPage.sitemapXml.estimatedUrls} URLs`
                        : "Ausente"
                    }
                  />
                </div>
              </div>

              <div className="p-3 rounded-xl bg-zinc-950/65 border border-zinc-800/80 flex flex-col gap-1.5">
                <span className="font-mono text-[10px] text-zinc-500 uppercase">Imgs sem ALT</span>
                <div>
                  <StatusBadge
                    ok={seoOnPage.images.missingAlt === 0}
                    label={`${seoOnPage.images.missingAlt}/${seoOnPage.images.total}`}
                  />
                </div>
              </div>
            </div>

            {/* Hierarquia H1-H6 */}
            <div className="p-4 rounded-xl bg-zinc-950/65 border border-zinc-800/80">
              <div className="flex items-center justify-between mb-3">
                <span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
                  Hierarquia Semântica (H1–H6)
                </span>
                <StatusBadge
                  ok={seoOnPage.headings.hierarchyValid}
                  label={seoOnPage.headings.hierarchyValid ? "Válida" : "Revisar"}
                />
              </div>
              <div className="grid grid-cols-6 gap-2 text-center font-mono tabular-nums">
                {(["h1", "h2", "h3", "h4", "h5", "h6"] as const).map((h) => (
                  <div
                    key={h}
                    className="py-2 rounded-lg bg-bento border border-zinc-800"
                  >
                    <span className="block text-[9px] text-zinc-500 uppercase">{h}</span>
                    <span
                      className={`text-sm font-bold ${
                        h === "h1" && seoOnPage.headings.h1 !== 1 ? "text-rose-400" : "text-zinc-100"
                      }`}
                    >
                      {seoOnPage.headings[h]}
                    </span>
                  </div>
                ))}
              </div>
              {seoOnPage.headings.hierarchyIssues.length > 0 && (
                <div className="mt-2.5 flex items-start gap-2 text-[11px] text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                  <span>{seoOnPage.headings.hierarchyIssues.join(" ")}</span>
                </div>
              )}
            </div>

            {/* Schema.org @type chips */}
            {seoOnPage.structuredData.types.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="font-mono text-[10px] uppercase tracking-wider text-zinc-500 mr-1">
                  Schema.org:
                </span>
                {seoOnPage.structuredData.types.map((t) => (
                  <span
                    key={t}
                    className="px-2 py-0.5 rounded-md bg-indigo-500/10 border border-indigo-500/25 font-mono text-[10px] font-medium text-indigo-300"
                  >
                    {t}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* CAMADA C (5 cols): ARQUITETURA, TECH STACK & SEGURANÇA */}
      {architecture && (
        <div className="lg:col-span-5 bento-card overflow-hidden flex flex-col">
          <div className="px-5 py-4 border-b border-zinc-800/80 bg-zinc-950/40 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-400">
                <Server className="h-4 w-4" />
              </div>
              <div>
                <h3 className="font-display font-semibold text-zinc-100 text-sm tracking-tight">
                  Arquitetura & Tech Stack
                </h3>
                <p className="text-[11px] font-mono tabular-nums text-zinc-400">
                  {architecture.protocol} · TTFB {architecture.responseTimeMs}ms
                </p>
              </div>
            </div>
            <span
              className={`px-2.5 py-1 rounded-full font-mono tabular-nums text-[11px] font-bold border ${
                architecture.securityScore >= 80
                  ? "bg-emerald-500/10 border-emerald-500/25 text-emerald-400"
                  : architecture.securityScore >= 50
                    ? "bg-amber-500/10 border-amber-500/25 text-amber-400"
                    : "bg-rose-500/10 border-rose-500/25 text-rose-400"
              }`}
            >
              SEC {architecture.securityScore}/100
            </span>
          </div>

          <div className="p-5 flex-1 flex flex-col gap-4 text-xs">
            {/* Server Metadata */}
            <div className="grid grid-cols-3 gap-2">
              <div className="p-2.5 rounded-xl bg-zinc-950/65 border border-zinc-800/80">
                <span className="font-mono text-[9px] text-zinc-500 uppercase block">Server</span>
                <span className="font-mono text-[11px] font-medium text-zinc-200 truncate block mt-0.5" title={architecture.server}>
                  {architecture.server}
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-zinc-950/65 border border-zinc-800/80">
                <span className="font-mono text-[9px] text-zinc-500 uppercase block">Powered-By</span>
                <span className="font-mono text-[11px] font-medium text-zinc-200 truncate block mt-0.5" title={architecture.poweredBy}>
                  {architecture.poweredBy}
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-zinc-950/65 border border-zinc-800/80">
                <span className="font-mono text-[9px] text-zinc-500 uppercase block">Encoding</span>
                <span className="font-mono text-[11px] font-medium text-zinc-200 truncate block mt-0.5" title={architecture.compression}>
                  {architecture.compression}
                </span>
              </div>
            </div>

            {/* Tech Stack Fingerprints */}
            <div className="p-3.5 rounded-xl bg-zinc-950/65 border border-zinc-800/80 space-y-3">
              <div className="flex items-center gap-1.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
                <Cpu className="h-3.5 w-3.5 text-indigo-400" />
                <span>Stack Detectada</span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="text-[10px] font-mono text-zinc-500 block mb-1">CMS / Plataforma</span>
                  <div className="flex flex-wrap gap-1">
                    {architecture.cms.length > 0 ? (
                      architecture.cms.map((item) => (
                        <span
                          key={item}
                          className="px-2 py-0.5 rounded-md bg-indigo-500/10 border border-indigo-500/25 font-mono text-[10px] text-indigo-300"
                        >
                          {item}
                        </span>
                      ))
                    ) : (
                      <span className="text-[11px] text-zinc-500 font-mono">Custom</span>
                    )}
                  </div>
                </div>

                <div>
                  <span className="text-[10px] font-mono text-zinc-500 block mb-1">Frameworks</span>
                  <div className="flex flex-wrap gap-1">
                    {architecture.frameworks.length > 0 ? (
                      architecture.frameworks.map((item) => (
                        <span
                          key={item}
                          className="px-2 py-0.5 rounded-md bg-zinc-800 border border-zinc-700 font-mono text-[10px] text-zinc-200"
                        >
                          {item}
                        </span>
                      ))
                    ) : (
                      <span className="text-[11px] text-zinc-500 font-mono">Não detectado</span>
                    )}
                  </div>
                </div>

                <div>
                  <span className="text-[10px] font-mono text-zinc-500 block mb-1">CDN / Edge</span>
                  <div className="flex flex-wrap gap-1">
                    {architecture.cdn.length > 0 ? (
                      architecture.cdn.map((item) => (
                        <span
                          key={item}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/20 font-mono text-[10px] text-emerald-400"
                        >
                          <Globe className="h-2.5 w-2.5" />
                          {item}
                        </span>
                      ))
                    ) : (
                      <span className="text-[11px] text-zinc-500 font-mono">Direto</span>
                    )}
                  </div>
                </div>

                <div>
                  <span className="text-[10px] font-mono text-zinc-500 block mb-1">Analytics</span>
                  <div className="flex flex-wrap gap-1">
                    {architecture.analytics.length > 0 ? (
                      architecture.analytics.map((item) => (
                        <span
                          key={item}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-zinc-800/80 border border-zinc-700/80 font-mono text-[10px] text-zinc-300"
                        >
                          <Code2 className="h-2.5 w-2.5" />
                          {item}
                        </span>
                      ))
                    ) : (
                      <span className="text-[11px] text-zinc-500 font-mono">Nenhum</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Security Headers */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-zinc-400 mb-2">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                <span>Cabeçalhos de Segurança HTTP</span>
              </div>
              {architecture.securityHeaders.map((h) => (
                <div
                  key={h.key}
                  className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-zinc-950/65 border border-zinc-800/80"
                >
                  <div className="min-w-0">
                    <span className="font-mono text-[11px] font-medium text-zinc-200 block truncate">
                      {h.name}
                    </span>
                    <span className="font-mono text-[10px] text-zinc-500 truncate block max-w-57.5">
                      {h.present ? h.value : h.recommendation}
                    </span>
                  </div>
                  <StatusBadge ok={h.present} label={h.present ? "Ativo" : "Ausente"} />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
