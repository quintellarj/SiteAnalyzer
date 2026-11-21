export interface AuditIssue {
  title: string;
  severity: "critical" | "warning" | "info";
  details: string;
  suggestion: string;
  codeSnippet?: string;
}

export interface PerformanceOpportunity {
  id: string;
  title: string;
  displayValue?: string;
  savingsMs?: number;
  savingsBytes?: number;
  score: number | null;
}

export interface SecurityHeaderItem {
  name: string;
  key: string;
  present: boolean;
  value: string;
  severity: "high" | "medium" | "low" | "ok";
  recommendation: string;
}

export interface SecuritySslAudit {
  isHttps: boolean;
  httpRedirectsToHttps: boolean;
  httpRedirectStatus: number | null;
  certificateValid: boolean;
  issuer: string;
  validFrom?: string;
  validTo?: string;
  daysUntilExpiration: number | null;
  protocol?: string;
  error?: string;
}

export interface SecurityExposedFileCheck {
  path: string;
  status: number | null;
  exposed: boolean;
  note: string;
}

export interface SecurityCookieFlagCheck {
  name: string;
  secure: boolean;
  httpOnly: boolean;
  sameSite: string | null;
  issues: string[];
}

export interface SecurityMixedContentItem {
  tag: "img" | "script" | "iframe" | "link";
  url: string;
  severity: "critical" | "warning";
}

export interface PassiveSecurityAudit {
  score: number;
  grade: "A+" | "A" | "B" | "C" | "D" | "F";
  checkedAt: string;
  ssl: SecuritySslAudit;
  headers: SecurityHeaderItem[];
  informationDisclosure: {
    serverHeader: string;
    serverExposesVersion: boolean;
    poweredByHeader: string;
    poweredByExposed: boolean;
    exposedFiles: SecurityExposedFileCheck[];
  };
  mixedContent: {
    count: number;
    hasActiveMixedContent: boolean;
    items: SecurityMixedContentItem[];
  };
  cookies: {
    total: number;
    insecureCount: number;
    items: SecurityCookieFlagCheck[];
  };
}

export interface SeoOnPageAudit {
  fetchedUrl: string;
  finalUrl: string;
  httpStatus: number;
  title: string;
  titleLength: number;
  description: string;
  descriptionLength: number;
  canonical: {
    present: boolean;
    href: string;
    matchesFinalUrl: boolean;
  };
  robotsMeta: {
    present: boolean;
    content: string;
    isIndexable: boolean;
  };
  viewport: {
    present: boolean;
    content: string;
  };
  openGraph: {
    hasTitle: boolean;
    hasDescription: boolean;
    hasImage: boolean;
    title?: string;
    description?: string;
    image?: string;
    type?: string;
  };
  headings: {
    h1: number;
    h2: number;
    h3: number;
    h4: number;
    h5: number;
    h6: number;
    h1Texts: string[];
    hierarchyValid: boolean;
    hierarchyIssues: string[];
  };
  images: {
    total: number;
    missingAlt: number;
    withLazyLoading: number;
    modernFormatCount: number;
  };
  structuredData: {
    present: boolean;
    validCount: number;
    invalidCount: number;
    types: string[];
    errors: string[];
  };
  robotsTxt: {
    exists: boolean;
    status: number | null;
    hasSitemapDirective: boolean;
    sitemapUrls: string[];
  };
  sitemapXml: {
    exists: boolean;
    status: number | null;
    url: string;
    estimatedUrls: number;
  };
}

export interface ArchitectureAudit {
  protocol: "HTTPS" | "HTTP";
  httpStatus: number;
  responseTimeMs: number;
  server: string;
  poweredBy: string;
  compression: string;
  cacheControl: string;
  cdn: string[];
  cms: string[];
  frameworks: string[];
  analytics: string[];
  securityScore: number;
  securityHeaders: SecurityHeaderItem[];
}

export interface BusinessUxAnalysis {
  score: number;
  niche: string;
  valueProposition: {
    clarityScore: number;
    summary: string;
    assessment: string;
  };
  ctaAnalysis: {
    presence: "forte" | "moderada" | "fraca" | "ausente";
    detectedCtas: string[];
    assessment: string;
    recommendations: string[];
  };
  trustSignals: {
    score: number;
    found: string[];
    missing: string[];
    assessment: string;
  };
  nicheFit: {
    score: number;
    assessment: string;
    uxRecommendations: string[];
  };
  gscImpact?: {
    indexingRisk: "baixo" | "medio" | "alto";
    affectedReports: string[];
    summary: string;
    actionPlan: string[];
  };
}

export type EffortLevel = "Baixo" | "Médio" | "Alto";
export type BusinessImpactLevel = "Alto" | "Médio" | "Baixo";
export type ClientHealthStatus = "Saudável" | "Atenção Necessária" | "Crítico";
export type DevIssueCategory = "Performance" | "SEO" | "Arquitetura" | "Segurança" | "UX";

export interface ClientReportPillar {
  name: string;
  status: ClientHealthStatus;
  businessImpactExplanation: string;
}

export interface ClientExecutiveReport {
  overallHealthStatus: ClientHealthStatus;
  executiveSummary: string;
  pillars: ClientReportPillar[];
  topBusinessPriorities: string[];
}

export interface DeveloperGoodItem {
  title: string;
  category: DevIssueCategory;
  metricValue: string;
  description: string;
}

export interface DeveloperActionItem {
  title: string;
  category: DevIssueCategory;
  effortLevel: EffortLevel;
  businessImpact: BusinessImpactLevel;
  affectedElement: string;
  rootCause: string;
  howToFix: string;
  codeSnippet: string;
  gscValidationStep: string;
}

export interface DeveloperTechnicalReport {
  goodItems: DeveloperGoodItem[];
  improvementItems: DeveloperActionItem[];
  criticalItems: DeveloperActionItem[];
}

export interface AuditReport {
  url: string;
  title: string;
  description: string;
  analyzedAt: string;
  method: string;
  device?: "mobile" | "desktop";
  quotaFallback?: boolean;
  cacheInfo?: {
    hit: boolean;
    cachedAt: string;
    ttlMinutes: number;
  };
  scores: {
    performance: number;
    accessibility: number;
    seo: number;
    security?: number;
    bestPractices?: number;
  };
  performance: {
    source?: "psi-v5" | "static-fallback";
    loadTimeSeconds: number;
    pageSizeKb: number;
    requestCount: number;
    metrics: {
      lcp: string;
      fid: string;
      inp?: string;
      cls: string;
      fcp?: string;
      ttfb?: string;
    };
    opportunities?: PerformanceOpportunity[];
    issues: AuditIssue[];
  };
  accessibility: {
    issues: AuditIssue[];
  };
  seo: {
    issues: AuditIssue[];
  };
  seoOnPage?: SeoOnPageAudit;
  architecture?: ArchitectureAudit;
  security?: PassiveSecurityAudit;
  businessAnalysis?: BusinessUxAnalysis;
  clientReport?: ClientExecutiveReport;
  developerReport?: DeveloperTechnicalReport;
  generalSuggestions: string[];
}

export interface DomainProfile {
  id: string;
  url: string;
  addedAt: string;
  latestReport?: AuditReport;
  reportsHistory: {
    date: string;
    performance: number;
    accessibility: number;
    seo: number;
  }[];
  googleConnected: boolean;
  googleEmail?: string;
  monthlyReportEnabled: boolean;
  monthlyReportEmail?: string;
  auditDevice?: "mobile" | "desktop";
}

export interface AnalyticsDataPoint {
  date: string;
  pageviews: number;
  sessions: number;
  users: number;
  bounceRate: number;
}

export interface SearchQueryRow {
  keys: string[];
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

export interface ManualSEOTask {
  id: string;
  title: string;
  category: string;
  completed: boolean;
  priority: "high" | "medium" | "low";
  notes?: string;
}

export interface QuickTipsResponse {
  suggestedMeta: {
    title: string;
    description: string;
    reason: string;
  };
  contentStructure: Array<{
    section: string;
    suggestion: string;
    example: string;
  }>;
  trendingKeywords: string[];
  searchTrendsContext: string;
}

export interface SecurityScanHeaderCheck {
  name: string;
  key: string;
  status: "present" | "missing" | "misconfigured";
  value: string;
  severity: "high" | "medium" | "low" | "none";
  description: string;
  recommendation: string;
}

export interface SecurityScanXssCheck {
  name: string;
  status: "passed" | "warning" | "failed";
  detail: string;
  description: string;
  evidence: string;
}

export interface SecurityScanResult {
  url: string;
  scannedAt: string;
  score: number;
  headersScore: number;
  xssScore: number;
  headers: SecurityScanHeaderCheck[];
  xssChecks: SecurityScanXssCheck[];
  remediation: {
    express: string;
    nginx: string;
    apache: string;
  };
  fetchedSuccessfully: boolean;
}

