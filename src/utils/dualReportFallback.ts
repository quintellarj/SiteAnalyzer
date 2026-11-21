import type {
  AuditIssue,
  AuditReport,
  BusinessImpactLevel,
  ClientExecutiveReport,
  ClientHealthStatus,
  DevIssueCategory,
  DeveloperActionItem,
  DeveloperGoodItem,
  DeveloperTechnicalReport,
  EffortLevel,
} from "../types";

export function isQuickWin(item: DeveloperActionItem): boolean {
  return item.effortLevel === "Baixo" && item.businessImpact === "Alto";
}

const IMPACT_WEIGHT: Record<BusinessImpactLevel, number> = {
  Alto: 3,
  Médio: 2,
  Baixo: 1,
};

const EFFORT_WEIGHT: Record<EffortLevel, number> = {
  Baixo: 1,
  Médio: 2,
  Alto: 3,
};

/**
 * Ordena itens técnicos colocando Quick Wins (Esforço Baixo + Impacto Alto) primeiro,
 * seguidos por maior impacto comercial e menor esforço de implementação.
 */
export function sortDeveloperItemsByPriority(items: DeveloperActionItem[]): DeveloperActionItem[] {
  return [...items].sort((a, b) => {
    const aQw = isQuickWin(a) ? 1 : 0;
    const bQw = isQuickWin(b) ? 1 : 0;
    if (aQw !== bQw) return bQw - aQw;

    const impactDiff = IMPACT_WEIGHT[b.businessImpact] - IMPACT_WEIGHT[a.businessImpact];
    if (impactDiff !== 0) return impactDiff;

    return EFFORT_WEIGHT[a.effortLevel] - EFFORT_WEIGHT[b.effortLevel];
  });
}

function scoreToHealth(score: number): ClientHealthStatus {
  if (score >= 85) return "Saudável";
  if (score >= 55) return "Atenção Necessária";
  return "Crítico";
}

function inferEffortAndImpact(
  issue: AuditIssue,
  category: DevIssueCategory
): { effortLevel: EffortLevel; businessImpact: BusinessImpactLevel } {
  const lower = `${issue.title} ${issue.details}`.toLowerCase();

  if (
    lower.includes("meta") ||
    lower.includes("title") ||
    lower.includes("alt") ||
    lower.includes("canonical") ||
    lower.includes("robots") ||
    lower.includes("sitemap") ||
    lower.includes("viewport") ||
    lower.includes("h1") ||
    lower.includes("header") ||
    lower.includes("cabeçalho") ||
    lower.includes("defer") ||
    lower.includes("cache")
  ) {
    return {
      effortLevel: "Baixo",
      businessImpact: issue.severity === "critical" || category === "SEO" ? "Alto" : "Médio",
    };
  }

  if (
    lower.includes("javascript") ||
    lower.includes("bundle") ||
    lower.includes("render-blocking") ||
    lower.includes("lcp") ||
    lower.includes("cls")
  ) {
    return {
      effortLevel: "Médio",
      businessImpact: "Alto",
    };
  }

  return {
    effortLevel: issue.severity === "critical" ? "Médio" : "Baixo",
    businessImpact: issue.severity === "critical" ? "Alto" : "Médio",
  };
}

function toDeveloperActionItem(
  issue: AuditIssue,
  category: DevIssueCategory,
  url: string
): DeveloperActionItem {
  const { effortLevel, businessImpact } = inferEffortAndImpact(issue, category);
  return {
    title: issue.title,
    category,
    effortLevel,
    businessImpact,
    affectedElement: `https://${url.replace(/^https?:\/\//, "")}`,
    rootCause: issue.details,
    howToFix: issue.suggestion,
    codeSnippet:
      issue.codeSnippet ||
      `<!-- Revise e aplique a correção recomendada em ${url} -->\n<!-- ${issue.title} -->`,
    gscValidationStep:
      category === "Performance"
        ? "No Google Search Console, acesse Experiência > Core Web Vitals, aguarde coleta de dados de campo e clique em 'Validar correção'."
        : "No Google Search Console, abra Inspeção de URL, clique em 'Testar URL publicada' e acione 'Solicitar indexação' ou 'Validar correção'.",
  };
}

/**
 * Garante sempre relatórios completos (Cliente + Desenvolvedor), mesmo para
 * auditorias antigas salvas no localStorage antes da atualização de schema.
 */
export function resolveDualReports(report: AuditReport): {
  clientReport: ClientExecutiveReport;
  developerReport: DeveloperTechnicalReport;
} {
  if (report.clientReport && report.developerReport) {
    return {
      clientReport: report.clientReport,
      developerReport: report.developerReport,
    };
  }

  const secScore = report.scores.security ?? report.security?.score ?? report.architecture?.securityScore ?? 75;
  const avgScore = Math.round(
    (report.scores.performance + report.scores.accessibility + report.scores.seo + secScore) / 4
  );
  const overallHealthStatus = scoreToHealth(avgScore);
  const bizScore = report.businessAnalysis?.score ?? Math.round((report.scores.seo + report.scores.performance) / 2);

  const clientReport: ClientExecutiveReport = report.clientReport ?? {
    overallHealthStatus,
    executiveSummary:
      avgScore >= 85
        ? `O site ${report.url} apresenta excelente base digital (${avgScore}/100), oferecendo boa experiência de navegação e visibilidade competitiva no Google. Pequenos ajustes pontuais podem ampliar ainda mais a taxa de conversão comercial.`
        : avgScore >= 55
          ? `O site ${report.url} está operando em nível intermediário (${avgScore}/100). Existem gargalos claros de velocidade e apresentação que podem fazer visitantes desistirem antes de concluir um contato ou compra.`
          : `O site ${report.url} exige atenção prioritária (${avgScore}/100). Lentidão no carregamento e falhas estruturais estão comprometendo a visibilidade no Google e reduzindo o aproveitamento comercial das visitas.`,
    pillars: [
      {
        name: "Velocidade & Experiência",
        status: scoreToHealth(report.scores.performance),
        businessImpactExplanation:
          report.scores.performance >= 85
            ? `Carregamento ágil (${report.performance.loadTimeSeconds}s), mantendo o visitante engajado na oferta sem abandono por espera.`
            : `O tempo de abertura (${report.performance.loadTimeSeconds}s) aumenta a taxa de rejeição, especialmente em acessos por celular, reduzindo contatos qualificados.`,
      },
      {
        name: "Presença no Google",
        status: scoreToHealth(report.scores.seo),
        businessImpactExplanation:
          report.scores.seo >= 85
            ? "As páginas estão bem organizadas para serem compreendidas pelo Google, favorecendo cliques orgânicos qualificados."
            : "Ajustes nos títulos, descrições e estrutura de leitura ajudarão o Google a exibir seu negócio para mais clientes com intenção de compra.",
      },
      {
        name: "Segurança & Proteção de Dados",
        status: scoreToHealth(secScore),
        businessImpactExplanation:
          secScore >= 80
            ? "O site possui selo SSL válido e camadas de proteção ativas que protegem os visitantes contra golpes de redirecionamento e clonagem."
            : "Reforçar o certificado SSL e as camadas de proteção protege a marca contra invasões e aumenta a confiança do cliente em formulários.",
      },
      {
        name: "Clareza de Conversão (CTAs)",
        status: scoreToHealth(bizScore),
        businessImpactExplanation:
          report.businessAnalysis?.valueProposition.assessment ||
          "Tornar a proposta de valor e os botões de ação (orçamento, compra ou WhatsApp) mais evidentes acima da dobra acelera a geração de leads.",
      },
    ],
    topBusinessPriorities:
      report.generalSuggestions.length > 0
        ? report.generalSuggestions.slice(0, 5)
        : [
            "Acelerar a abertura da página inicial no celular para reduzir abandono de visitantes.",
            "Aprimorar títulos e descrições exibidos no Google para aumentar a taxa de cliques orgânicos.",
            "Destacar um botão de ação principal visível logo na primeira tela para converter mais contatos.",
          ],
  };

  const goodItems: DeveloperGoodItem[] = [];
  if (report.scores.performance >= 80) {
    goodItems.push({
      title: "Desempenho geral consistente",
      category: "Performance",
      metricValue: `${report.scores.performance}/100 · LCP ${report.performance.metrics.lcp}`,
      description: "Tempo de renderização principal dentro de uma faixa competitiva para navegação web.",
    });
  }
  if (report.scores.seo >= 80) {
    goodItems.push({
      title: "Fundação de SEO técnico saudável",
      category: "SEO",
      metricValue: `${report.scores.seo}/100`,
      description: "Boa aderência aos sinais primários de rastreabilidade e indexação orgânica.",
    });
  }
  if (report.scores.accessibility >= 80) {
    goodItems.push({
      title: "Boa conformidade de acessibilidade",
      category: "UX",
      metricValue: `${report.scores.accessibility}/100`,
      description: "Estrutura legível para tecnologias assistivas e boa usabilidade geral.",
    });
  }
  if (report.architecture?.protocol === "HTTPS") {
    goodItems.push({
      title: "Transporte seguro via HTTPS ativo",
      category: "Segurança",
      metricValue: `HTTPS · HTTP ${report.architecture.httpStatus}`,
      description: "Comunicação criptografada ponta a ponta habilitada no domínio principal.",
    });
  }
  if (goodItems.length === 0) {
    goodItems.push({
      title: "Domínio acessível e respondendo requisições",
      category: "Arquitetura",
      metricValue: `${report.performance.requestCount} reqs`,
      description: "O servidor respondeu com sucesso à coleta de telemetria e análise estrutural.",
    });
  }

  const criticalItems: DeveloperActionItem[] = [];
  const improvementItems: DeveloperActionItem[] = [];

  const pushMapped = (issues: AuditIssue[], category: DevIssueCategory) => {
    for (const issue of issues) {
      const mapped = toDeveloperActionItem(issue, category, report.url);
      if (issue.severity === "critical") {
        criticalItems.push(mapped);
      } else {
        improvementItems.push(mapped);
      }
    }
  };

  pushMapped(report.performance.issues, "Performance");
  pushMapped(report.accessibility.issues, "UX");
  pushMapped(report.seo.issues, "SEO");

  const developerReport: DeveloperTechnicalReport = report.developerReport ?? {
    goodItems,
    improvementItems: sortDeveloperItemsByPriority(improvementItems),
    criticalItems: sortDeveloperItemsByPriority(criticalItems),
  };

  return { clientReport, developerReport };
}
