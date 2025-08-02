// Sitemap analysis types

import type { Issue } from './common.js';

export interface SitemapUrl {
  url: string;
  lastModified: string | null;
  isCanonical?: boolean;
  isLowValue?: boolean;
  hasNoIndex?: boolean;
}

export interface SitemapAnalysisOptions {
  maxChildSitemaps?: number;
  timeout?: number;
  childTimeout?: number;
  maxUrls?: number;
  validateCanonical?: boolean;
  detectLowValue?: boolean;
}

export interface SitemapAnalysis {
  exists: boolean;
  accessible: boolean;
  isValidXml?: boolean; // Added for backward compatibility
  url?: string | null;
  format?: 'xml' | 'text' | 'xml-gz' | null;
  totalUrls: number;
  validUrls?: number;
  invalidUrls?: number;
  canonicalUrls?: number;
  lowValueUrls?: number;
  noIndexUrls?: number;
  urls: SitemapUrl[]; // Limited URLs (max 100) for cache matching and display
  issues: Issue[];
  lastModified: string | null;
  responseTime?: number;
  childSitemaps?: string[];
  truncated?: boolean;
  isCompressed?: boolean;
}