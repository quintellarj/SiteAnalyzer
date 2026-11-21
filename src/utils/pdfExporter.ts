import type { AuditReport, ClientHealthStatus, DeveloperActionItem, DomainProfile } from "../types";
import {
  isQuickWin,
  resolveDualReports,
  sortDeveloperItemsByPriority,
} from "./dualReportFallback";

type RgbTuple = [number, number, number];

function getScoreRgb(score: number): RgbTuple {
  if (score >= 90) return [16, 185, 129]; // Emerald
  if (score >= 50) return [245, 158, 11]; // Amber
  return [244, 63, 94]; // Rose
}

function getHealthRgb(status: ClientHealthStatus): RgbTuple {
  if (status === "Saudável") return [16, 185, 129];
  if (status === "Crítico") return [244, 63, 94];
  return [245, 158, 11];
}

function getEffortRgb(effort: DeveloperActionItem["effortLevel"]): RgbTuple {
  if (effort === "Baixo") return [16, 185, 129];
  if (effort === "Alto") return [244, 63, 94];
  return [245, 158, 11];
}

function sanitizePdfFilename(domain: string): string {
  return domain.replace(/[^a-zA-Z0-9.-]/g, "-");
}

/**
 * 1. EXPORTAÇÃO PDF CLIENTE (EXECUTIVO — MODO CLARO CORPORATIVO)
 * Documento limpo sobre fundo branco (#FFFFFF), linguagem de negócios clara,
 * foco em saúde digital, experiência do cliente, Google e retorno comercial.
 * ZERO blocos de código ou jargão técnico pesado.
 */
export async function exportClientReportPDF(report: AuditReport): Promise<void> {
  const { jsPDF } = await import("jspdf");
  const { clientReport } = resolveDualReports(report);

  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const paintWhitePage = () => {
    doc.setFillColor(255, 255, 255);
    doc.rect(0, 0, 210, 297, "F");
  };

  paintWhitePage();

  // Barra superior corporativa Electric Indigo
  doc.setFillColor(79, 70, 229);
  doc.rect(0, 0, 210, 4.5, "F");

  // Cabeçalho Executivo
  doc.setTextColor(9, 9, 11);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("SiteAnalyzer — Relatório Executivo de Saúde Digital", 15, 19);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(82, 82, 91);
  doc.text(
    `Site avaliado: ${report.url}   |   Perfil: ${(report.device || "desktop").toUpperCase()}   |   Data: ${new Date(report.analyzedAt).toLocaleDateString("pt-BR")}`,
    15,
    27
  );

  // Badge de Status Geral no canto superior direito
  const [hr, hg, hb] = getHealthRgb(clientReport.overallHealthStatus);
  doc.setFillColor(hr, hg, hb);
  doc.roundedRect(148, 12, 47, 8, 2, 2, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.text(clientReport.overallHealthStatus.toUpperCase(), 171.5, 17.2, { align: "center" });

  doc.setDrawColor(228, 228, 231);
  doc.setLineWidth(0.5);
  doc.line(15, 33, 195, 33);

  // 1. Resumo Executivo
  let y = 42;
  doc.setTextColor(9, 9, 11);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("1. Visão Geral do Negócio & Experiência Digital", 15, y);
  y += 5;

  const summaryLines: string[] = doc.splitTextToSize(clientReport.executiveSummary, 172);
  const summaryBoxHeight = Math.max(20, summaryLines.length * 4.8 + 8);
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(15, y, 180, summaryBoxHeight, 2.5, 2.5, "FD");

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.8);
  doc.setTextColor(39, 39, 42);
  doc.text(summaryLines, 19, y + 6.5);
  y += summaryBoxHeight + 10;

  // 2. Indicadores de Saúde (0 a 100) em linguagem amigável
  doc.setTextColor(9, 9, 11);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("2. Índices de Qualidade Percebida (0 a 100)", 15, y);
  y += 6;

  const secScore =
    report.scores.security ??
    report.security?.score ??
    report.architecture?.securityScore ??
    75;

  const clientMetrics = [
    { label: "VELOCIDADE", score: report.scores.performance, x: 15 },
    { label: "VISIBILIDADE GOOGLE", score: report.scores.seo, x: 62 },
    { label: "SEGURANÇA", score: secScore, x: 109 },
    {
      label: "CONVERSÃO & UX",
      score: report.businessAnalysis?.score ?? Math.round((report.scores.performance + report.scores.seo) / 2),
      x: 156,
    },
  ];

  clientMetrics.forEach((m) => {
    const [r, g, b] = getScoreRgb(m.score);
    doc.setFillColor(250, 250, 250);
    doc.roundedRect(m.x, y, 39, 25, 2, 2, "F");
    doc.setDrawColor(r, g, b);
    doc.setLineWidth(0.8);
    doc.roundedRect(m.x, y, 39, 25, 2, 2, "S");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.setTextColor(r, g, b);
    doc.text(`${m.score}`, m.x + 19.5, y + 13.5, { align: "center" });

    doc.setFontSize(7.2);
    doc.setTextColor(63, 63, 70);
    doc.text(m.label, m.x + 19.5, y + 21, { align: "center" });
  });

  y += 31;

  // Resumo executivo de Confiabilidade & Proteção (sem jargões técnicos)
  if (report.security) {
    const ssl = report.security.ssl;
    const sslText = ssl.certificateValid
      ? ssl.daysUntilExpiration !== null
        ? `Selo SSL válido (renovação em ${ssl.daysUntilExpiration} dias)`
        : "Selo SSL válido e ativo"
      : "Certificado SSL precisa de atenção imediata";
    const redirectText = ssl.httpRedirectsToHttps
      ? "Redirecionamento seguro ativo"
      : "Redirecionamento automático para endereço seguro pendente";
    const activeHeaders = report.security.headers.filter((h) => h.present).length;
    const trustSummary = `${sslText}  |  ${redirectText}  |  Blindagem ativa: ${activeHeaders}/${report.security.headers.length} camadas  |  Nota de Segurança: ${report.security.grade}`;

    doc.setFillColor(238, 242, 255);
    doc.setDrawColor(199, 210, 254);
    doc.setLineWidth(0.4);
    doc.roundedRect(15, y, 180, 12, 2, 2, "FD");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.2);
    doc.setTextColor(55, 48, 163);
    const trustLines: string[] = doc.splitTextToSize(`Proteção & Confiabilidade: ${trustSummary}`, 172);
    doc.text(trustLines[0] || "", 19, y + 7.2);
    y += 18;
  } else {
    y += 4;
  }

  // 3. Os 4 Pilares de Impacto Comercial
  doc.setTextColor(9, 9, 11);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("3. Avaliação por Pilar de Negócio", 15, y);
  y += 6;

  for (const pillar of clientReport.pillars) {
    const expLines: string[] = doc.splitTextToSize(pillar.businessImpactExplanation, 170);
    const cardHeight = Math.max(20, expLines.length * 4.5 + 12);

    if (y + cardHeight > 272) {
      doc.addPage();
      paintWhitePage();
      y = 20;
    }

    const [pr, pg, pb] = getHealthRgb(pillar.status);
    doc.setFillColor(252, 252, 253);
    doc.setDrawColor(228, 228, 231);
    doc.setLineWidth(0.4);
    doc.roundedRect(15, y, 180, cardHeight, 2, 2, "FD");

    // Acento lateral colorido
    doc.setFillColor(pr, pg, pb);
    doc.rect(15, y, 2, cardHeight, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10.2);
    doc.setTextColor(9, 9, 11);
    doc.text(pillar.name, 20, y + 6.5);

    doc.setFillColor(pr, pg, pb);
    doc.roundedRect(152, y + 2.5, 39, 5.5, 1.5, 1.5, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(7.2);
    doc.text(pillar.status.toUpperCase(), 171.5, y + 6.2, { align: "center" });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(63, 63, 70);
    doc.text(expLines, 20, y + 12.5);

    y += cardHeight + 4;
  }

  y += 4;

  // 4. Prioridades Comerciais Recomendadas
  if (y > 235) {
    doc.addPage();
    paintWhitePage();
    y = 20;
  }

  doc.setDrawColor(228, 228, 231);
  doc.line(15, y - 2, 195, y - 2);

  doc.setTextColor(9, 9, 11);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("4. Próximas Prioridades com Foco em Resultado Comercial", 15, y + 5);
  y += 12;

  clientReport.topBusinessPriorities.forEach((item, index) => {
    const lines: string[] = doc.splitTextToSize(item, 166);
    const needed = lines.length * 4.5 + 5;
    if (y + needed > 275) {
      doc.addPage();
      paintWhitePage();
      y = 20;
    }

    doc.setFillColor(79, 70, 229);
    doc.roundedRect(15, y - 3.5, 6.5, 6.5, 1.5, 1.5, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.text(`${index + 1}`, 18.25, y + 1, { align: "center" });

    doc.setTextColor(39, 39, 42);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    doc.text(lines, 25, y + 0.5);
    y += needed + 1;
  });

  // Rodapé executivo
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(113, 113, 122);
  doc.text(
    "Documento executivo gerado por SiteAnalyzer (siteanalyzer.s7vendesign.com.br) — Visão Cliente.",
    15,
    290
  );

  doc.save(
    `relatorio-cliente-${sanitizePdfFilename(report.url)}-${new Date().toISOString().split("T")[0]}.pdf`
  );
}

/**
 * 2. EXPORTAÇÃO PDF DESENVOLVEDOR (CADERNO TÉCNICO — MODO CLARO CORPORATIVO)
 * Ordenado por prioridade (Quick Wins primeiro: Esforço Baixo + Impacto Alto),
 * com tags de Esforço/Impacto, Causa Raiz, Passo a Passo, blocos de código
 * monoespaçados (`courier`) e roteiro de validação no Google Search Console.
 */
export async function exportDeveloperReportPDF(report: AuditReport): Promise<void> {
  const { jsPDF } = await import("jspdf");
  const { developerReport } = resolveDualReports(report);

  const sortedCriticals = sortDeveloperItemsByPriority(developerReport.criticalItems);
  const sortedImprovements = sortDeveloperItemsByPriority(developerReport.improvementItems);
  const quickWinsTotal =
    sortedCriticals.filter(isQuickWin).length + sortedImprovements.filter(isQuickWin).length;

  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const paintWhitePage = () => {
    doc.setFillColor(255, 255, 255);
    doc.rect(0, 0, 210, 297, "F");
  };

  paintWhitePage();

  // Cabeçalho Técnico
  doc.setFillColor(9, 9, 11);
  doc.rect(0, 0, 210, 4.5, "F");
  doc.setFillColor(79, 70, 229);
  doc.rect(0, 4.5, 210, 1.5, "F");

  doc.setTextColor(9, 9, 11);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(17);
  doc.text("SiteAnalyzer — Caderno Técnico do Desenvolvedor", 15, 19);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(82, 82, 91);
  doc.text(
    `Domínio: ${report.url}   |   Dispositivo: ${(report.device || "desktop").toUpperCase()}   |   Data: ${new Date(report.analyzedAt).toLocaleDateString("pt-BR")}`,
    15,
    26
  );
  doc.setFontSize(8.2);
  doc.text(`Pipeline: ${report.method}`, 15, 31.5);

  // Strip de Contadores Técnicos (Aprovados / Melhorias / Críticos / Quick Wins)
  let y = 37;
  const kpiBoxes: Array<{ label: string; count: number; rgb: RgbTuple; x: number }> = [
    { label: "CRÍTICOS", count: sortedCriticals.length, rgb: [244, 63, 94], x: 15 },
    { label: "MELHORIAS", count: sortedImprovements.length, rgb: [245, 158, 11], x: 62 },
    { label: "APROVADOS", count: developerReport.goodItems.length, rgb: [16, 185, 129], x: 109 },
    { label: "QUICK WINS", count: quickWinsTotal, rgb: [79, 70, 229], x: 156 },
  ];

  kpiBoxes.forEach((box) => {
    const [r, g, b] = box.rgb;
    doc.setFillColor(250, 250, 250);
    doc.roundedRect(box.x, y, 39, 18, 2, 2, "F");
    doc.setDrawColor(r, g, b);
    doc.setLineWidth(0.7);
    doc.roundedRect(box.x, y, 39, 18, 2, 2, "S");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(15);
    doc.setTextColor(r, g, b);
    doc.text(`${box.count}`, box.x + 19.5, y + 9.5, { align: "center" });

    doc.setFontSize(7.2);
    doc.setTextColor(63, 63, 70);
    doc.text(box.label, box.x + 19.5, y + 15, { align: "center" });
  });

  y += 24;

  // Telemetria Core Web Vitals & Stack resumida
  doc.setFillColor(244, 244, 245);
  doc.roundedRect(15, y, 180, 17, 2, 2, "F");
  doc.setFont("courier", "bold");
  doc.setFontSize(8.2);
  doc.setTextColor(24, 24, 27);
  doc.text(
    `LCP: ${report.performance.metrics.lcp}  |  INP/FID: ${report.performance.metrics.inp || report.performance.metrics.fid}  |  CLS: ${report.performance.metrics.cls}  |  TTFB: ${report.performance.metrics.ttfb || "N/A"}`,
    19,
    y + 6.2
  );
  doc.setFont("courier", "normal");
  doc.setTextColor(63, 63, 70);
  const stackSummary = report.architecture
    ? `Payload: ${report.performance.pageSizeKb} KB (${report.performance.requestCount} reqs) | Sec: ${report.architecture.securityScore}/100 | Server: ${report.architecture.server}`
    : `Payload: ${report.performance.pageSizeKb} KB (${report.performance.requestCount} reqs) | Scores: Perf ${report.scores.performance} / A11y ${report.scores.accessibility} / SEO ${report.scores.seo}`;
  const stackWrapped: string[] = doc.splitTextToSize(stackSummary, 172);
  doc.text(stackWrapped[0] || "", 19, y + 12.5);

  y += 22;

  // Bloco Técnico de Segurança Passiva (SSL/TLS + 6 Headers HTTP + Mixed Content + Cookies + Arquivos)
  if (report.security) {
    const sec = report.security;
    const sslLabel = sec.ssl.certificateValid
      ? `SSL VALIDO (${sec.ssl.daysUntilExpiration ?? "?"}d · ${sec.ssl.protocol || "TLS"})`
      : "SSL INVALIDO / AUSENTE";
    const redirLabel = sec.ssl.httpRedirectsToHttps ? "HTTP->HTTPS OK" : "SEM REDIRECT HTTPS";
    const headersInline = sec.headers
      .map((h) => `${h.key.replace("strict-transport-security", "HSTS").replace("content-security-policy", "CSP").replace("x-frame-options", "XFO").replace("x-content-type-options", "XCTO").replace("referrer-policy", "RP").replace("permissions-policy", "PP")}:${h.present ? "OK" : "MISS"}`)
      .join(" | ");
    const exposedSummary = sec.informationDisclosure.exposedFiles
      .map((f) => `${f.path}:${f.exposed ? "EXPOSED" : "OK"}`)
      .join(" | ");

    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.4);
    doc.roundedRect(15, y, 180, 22, 2, 2, "FD");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.2);
    doc.setTextColor(15, 23, 42);
    doc.text(
      `APPSEC PASSIVO (${sec.score}/100 · Nota ${sec.grade}) — ${sslLabel} · ${redirLabel}`,
      19,
      y + 5.8
    );

    doc.setFont("courier", "normal");
    doc.setFontSize(7.4);
    doc.setTextColor(51, 65, 85);
    doc.text(`Headers: ${headersInline}`, 19, y + 11.8);
    doc.text(
      `Arquivos: ${exposedSummary} | Mixed Content: ${sec.mixedContent.count} | Cookies inseguros: ${sec.cookies.insecureCount}/${sec.cookies.total}`,
      19,
      y + 17.5
    );
    y += 28;
  } else {
    y += 2;
  }

  const ensureSpace = (neededMm: number) => {
    if (y + neededMm > 276) {
      doc.addPage();
      paintWhitePage();
      y = 18;
    }
  };

  const renderActionSection = (
    heading: string,
    accentRgb: RgbTuple,
    badgeLabel: string,
    items: DeveloperActionItem[]
  ) => {
    ensureSpace(16);
    const [ar, ag, ab] = accentRgb;
    doc.setFillColor(ar, ag, ab);
    doc.rect(15, y, 3, 6.5, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11.5);
    doc.setTextColor(9, 9, 11);
    doc.text(`${heading} (${items.length})`, 20, y + 5);
    y += 11;

    if (items.length === 0) {
      doc.setFont("helvetica", "italic");
      doc.setFontSize(8.8);
      doc.setTextColor(113, 113, 122);
      doc.text("Nenhum item registrado nesta severidade.", 15, y);
      y += 8;
      return;
    }

    for (const item of items) {
      const quickWin = isQuickWin(item);
      const rootLines: string[] = doc.splitTextToSize(`Causa Raiz: ${item.rootCause}`, 174);
      const fixLines: string[] = doc.splitTextToSize(`Passo a Passo: ${item.howToFix}`, 174);
      const gscLines: string[] = doc.splitTextToSize(`Validacao GSC: ${item.gscValidationStep}`, 174);
      const codeLines: string[] = item.codeSnippet
        ? doc.splitTextToSize(item.codeSnippet, 168).slice(0, 14)
        : [];

      const estimatedHeight =
        18 +
        rootLines.length * 4 +
        fixLines.length * 4 +
        gscLines.length * 4 +
        (codeLines.length > 0 ? codeLines.length * 3.8 + 8 : 0);

      ensureSpace(Math.min(estimatedHeight, 75));

      // Linha de Badges (Severidade + Categoria + Esforço + Impacto + Quick Win)
      let xCursor = 15;
      const drawPill = (text: string, rgb: RgbTuple) => {
        const width = Math.max(18, text.length * 1.9 + 5);
        doc.setFillColor(rgb[0], rgb[1], rgb[2]);
        doc.roundedRect(xCursor, y, width, 5, 1, 1, "F");
        doc.setTextColor(255, 255, 255);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(6.8);
        doc.text(text, xCursor + width / 2, y + 3.5, { align: "center" });
        xCursor += width + 2;
      };

      drawPill(badgeLabel, accentRgb);
      drawPill(item.category.toUpperCase(), [63, 63, 70]);
      drawPill(`ESFORCO: ${item.effortLevel.toUpperCase()}`, getEffortRgb(item.effortLevel));
      drawPill(`IMPACTO: ${item.businessImpact.toUpperCase()}`, [79, 70, 229]);
      if (quickWin) {
        drawPill("QUICK WIN", [16, 185, 129]);
      }

      y += 8.5;

      // Título & Elemento afetado
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(9, 9, 11);
      const titleLines: string[] = doc.splitTextToSize(item.title, 178);
      doc.text(titleLines, 15, y);
      y += titleLines.length * 4.4 + 1;

      doc.setFont("courier", "normal");
      doc.setFontSize(7.8);
      doc.setTextColor(113, 113, 122);
      const elLines: string[] = doc.splitTextToSize(`Alvo: ${item.affectedElement}`, 178);
      doc.text(elLines, 15, y);
      y += elLines.length * 3.8 + 2;

      // Causa Raiz
      ensureSpace(rootLines.length * 4.2 + 4);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.8);
      doc.setTextColor(39, 39, 42);
      doc.text(rootLines, 15, y);
      y += rootLines.length * 4.1 + 2;

      // Como corrigir
      ensureSpace(fixLines.length * 4.2 + 4);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.8);
      doc.setTextColor(16, 115, 78);
      doc.text(fixLines, 15, y);
      y += fixLines.length * 4.1 + 2.5;

      // Bloco de código monoespaçado (Courier sobre cinza claro corporativo)
      if (codeLines.length > 0) {
        const codeBoxHeight = codeLines.length * 3.7 + 6;
        ensureSpace(codeBoxHeight + 4);
        doc.setFillColor(244, 244, 245);
        doc.setDrawColor(212, 212, 216);
        doc.setLineWidth(0.35);
        doc.roundedRect(15, y, 180, codeBoxHeight, 1.5, 1.5, "FD");

        doc.setFont("courier", "normal");
        doc.setFontSize(7.6);
        doc.setTextColor(24, 24, 27);
        doc.text(codeLines, 18, y + 4.5);
        y += codeBoxHeight + 3;
      }

      // Validação GSC
      ensureSpace(gscLines.length * 4.2 + 6);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.4);
      doc.setTextColor(79, 70, 229);
      doc.text(gscLines, 15, y);
      y += gscLines.length * 4 + 4;

      doc.setDrawColor(228, 228, 231);
      doc.setLineWidth(0.3);
      doc.line(15, y - 1.5, 195, y - 1.5);
      y += 3;
    }
  };

  // 1. Críticos (Quick Wins primeiro)
  renderActionSection("1. Críticos — Correção Imediata", [244, 63, 94], "CRITICO", sortedCriticals);

  // 2. Melhorias (Quick Wins primeiro)
  renderActionSection("2. Pontos de Melhoria — Backlog Priorizado", [245, 158, 11], "MELHORIA", sortedImprovements);

  // 3. Aprovados (Verde)
  ensureSpace(20);
  doc.setFillColor(16, 185, 129);
  doc.rect(15, y, 3, 6.5, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11.5);
  doc.setTextColor(9, 9, 11);
  doc.text(`3. O que está bom — Itens Aprovados (${developerReport.goodItems.length})`, 20, y + 5);
  y += 11;

  for (const good of developerReport.goodItems) {
    const descLines: string[] = doc.splitTextToSize(good.description, 174);
    ensureSpace(descLines.length * 4 + 10);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.2);
    doc.setTextColor(16, 115, 78);
    doc.text(`[APROVADO · ${good.category}] ${good.title} (${good.metricValue})`, 15, y);
    y += 4.5;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(63, 63, 70);
    doc.text(descLines, 15, y);
    y += descLines.length * 4 + 3;
  }

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(113, 113, 122);
  doc.text(
    "Caderno técnico gerado por SiteAnalyzer (siteanalyzer.s7vendesign.com.br) — Visão Desenvolvedor.",
    15,
    290
  );

  doc.save(
    `relatorio-dev-${sanitizePdfFilename(report.url)}-${new Date().toISOString().split("T")[0]}.pdf`
  );
}

/**
 * Alias retrocompatível para o exportador padrão (redireciona ao Caderno Técnico)
 */
export async function exportAuditReportPDF(report: AuditReport): Promise<void> {
  return exportDeveloperReportPDF(report);
}

export async function exportCompareDomainsPDF(
  source: DomainProfile,
  target: DomainProfile,
  compareIAMarkdown: string | null
): Promise<void> {
  if (!source.latestReport || !target.latestReport) return;

  const { jsPDF } = await import("jspdf");
  const sReport = source.latestReport;
  const tReport = target.latestReport;

  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  // Modo Claro Corporativo Limpo
  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, 210, 297, "F");

  doc.setFillColor(79, 70, 229);
  doc.rect(0, 0, 210, 4, "F");

  doc.setTextColor(9, 9, 11);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(17);
  doc.text("SiteAnalyzer — Relatório Comparativo de Telemetria", 15, 18);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(82, 82, 91);
  doc.text(
    `${source.url}  vs  ${target.url}   |   Gerado em: ${new Date().toLocaleDateString("pt-BR")}`,
    15,
    26
  );

  doc.setDrawColor(228, 228, 231);
  doc.line(15, 32, 195, 32);

  doc.setTextColor(9, 9, 11);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("1. Comparativo de Pontuações (0 - 100)", 15, 43);

  doc.setFillColor(244, 244, 245);
  doc.rect(15, 48, 180, 8, "F");
  doc.setFontSize(9);
  doc.text("Categoria", 18, 53.5);
  doc.text(source.url, 75, 53.5);
  doc.text(target.url, 130, 53.5);
  doc.text("Diferença", 174, 53.5);

  const scoreRows = [
    { name: "Performance", sScore: sReport.scores.performance, tScore: tReport.scores.performance },
    { name: "Acessibilidade", sScore: sReport.scores.accessibility, tScore: tReport.scores.accessibility },
    { name: "SEO Técnico", sScore: sReport.scores.seo, tScore: tReport.scores.seo },
  ];

  let rowY = 63;
  scoreRows.forEach((row) => {
    doc.setFont("helvetica", "normal");
    doc.setTextColor(39, 39, 42);
    doc.text(row.name, 18, rowY);

    doc.setFont("helvetica", "bold");
    doc.setTextColor(79, 70, 229);
    doc.text(`${row.sScore} pts`, 75, rowY);

    doc.setTextColor(124, 58, 237);
    doc.text(`${row.tScore} pts`, 130, rowY);

    const diff = row.tScore - row.sScore;
    doc.setTextColor(diff >= 0 ? 16 : 244, diff >= 0 ? 185 : 63, diff >= 0 ? 129 : 94);
    doc.text(diff > 0 ? `+${diff}` : `${diff}`, 174, rowY);
    rowY += 9;
  });

  doc.setTextColor(9, 9, 11);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("2. Core Web Vitals & Rede", 15, rowY + 6);

  let vitalY = rowY + 14;
  const vitalsRows = [
    { name: "LCP", sVal: sReport.performance.metrics.lcp, tVal: tReport.performance.metrics.lcp },
    {
      name: "INP / FID",
      sVal: sReport.performance.metrics.inp || sReport.performance.metrics.fid,
      tVal: tReport.performance.metrics.inp || tReport.performance.metrics.fid,
    },
    { name: "CLS", sVal: sReport.performance.metrics.cls, tVal: tReport.performance.metrics.cls },
    {
      name: "Tamanho Total",
      sVal: `${sReport.performance.pageSizeKb} KB`,
      tVal: `${tReport.performance.pageSizeKb} KB`,
    },
    {
      name: "Requisições HTTP",
      sVal: `${sReport.performance.requestCount}`,
      tVal: `${tReport.performance.requestCount}`,
    },
  ];

  doc.setFontSize(9.5);
  vitalsRows.forEach((row) => {
    doc.setFont("helvetica", "normal");
    doc.setTextColor(63, 63, 70);
    doc.text(row.name, 18, vitalY);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(9, 9, 11);
    doc.text(row.sVal, 75, vitalY);
    doc.text(row.tVal, 130, vitalY);
    vitalY += 8;
  });

  if (compareIAMarkdown) {
    let y = vitalY + 10;
    if (y > 245) {
      doc.addPage();
      y = 20;
    }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(9, 9, 11);
    doc.text("3. Diagnóstico Comparativo IA", 15, y);
    y += 8;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(63, 63, 70);
    const cleaned = compareIAMarkdown.replace(/[#*`]/g, "");
    const lines: string[] = doc.splitTextToSize(cleaned, 178);
    for (const line of lines) {
      if (y > 275) {
        doc.addPage();
        y = 20;
      }
      doc.text(line, 15, y);
      y += 4.5;
    }
  }

  doc.save(`comparativo-${sanitizePdfFilename(source.url)}-vs-${sanitizePdfFilename(target.url)}.pdf`);
}
