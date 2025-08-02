// Common types used across the SEO analysis system

export interface Issue {
  type: 'error' | 'warning' | 'success' | 'info';
  message: string;
  priority: 'high' | 'medium' | 'low';
  category: 'content' | 'technical' | 'performance' | 'security';
  title?: string;
  description?: string;
  impact?: 'low' | 'medium' | 'high';
}

export interface AnalysisResult {
  url: string;
  status: 'success' | 'failed';
  error?: string;
  errorType?: string;
  httpStatus?: number;
  cached?: boolean;
}

export interface Performance {
  loadTime: number;
  seoScore: number;
  mobileScore: number;
  pageSize: number;
  resourceCount: number;
  ttfb?: number;
  compression?: import('./focused-analysis.js').CompressionInfo;
}

export interface Links {
  internal: number;
  external: number;
  broken: number;
  redirects: number;
  brokenLinks: string[];
  redirectChains: string[];
  internalUrls: string[];
}

export interface Technical {
  hasSSL: boolean;
  hasRobots: boolean;
  hasCanonical: boolean;
  hasRobotsTxt: boolean;
  hasSitemap: boolean;
  hasSchema: boolean;
  httpStatus: number;
  responseHeaders: Record<string, string>;
  robotsTxt: object | null;
  sitemap: object | null;
  metaTagsCount?: import('../utils/html-parser.js').MetaTagsCount;
}