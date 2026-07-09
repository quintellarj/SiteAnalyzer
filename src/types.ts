export interface AuditIssue {
  title: string;
  severity: "critical" | "warning" | "info";
  details: string;
  suggestion: string;
  codeSnippet?: string;
}

export interface AuditReport {
  url: string;
  title: string;
  description: string;
  analyzedAt: string;
  method: string;
  scores: {
    performance: number;
    accessibility: number;
    seo: number;
  };
  performance: {
    loadTimeSeconds: number;
    pageSizeKb: number;
    requestCount: number;
    metrics: {
      lcp: string;
      fid: string;
      cls: string;
    };
    issues: AuditIssue[];
  };
  accessibility: {
    issues: AuditIssue[];
  };
  seo: {
    issues: AuditIssue[];
  };
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

