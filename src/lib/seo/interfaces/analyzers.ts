import type { Issue } from '../types/analysis.js';

export interface AnalysisContext {
  url: string;
  html: string;
  response: Response;
  loadTime: number;
  isMainPage: boolean;
}

export interface AnalysisResult {
  score: number;
  issues: Issue[];
  data?: Record<string, unknown>;
}

export interface SEOAnalyzer {
  analyze(context: AnalysisContext): Promise<AnalysisResult>;
}

export interface HttpClient {
  fetch(url: string, options?: RequestInit): Promise<Response>;
}

export interface ScoringRule {
  name: string;
  weight?: number;
  evaluate(data: Record<string, unknown>, context: AnalysisContext): { score: number; issues: Issue[] };
}

export interface ScoringEngine {
  addRule(rule: ScoringRule): void;
  removeRule(name: string): void;
  calculateScore(data: Record<string, unknown>, context: AnalysisContext): { totalScore: number; issues: Issue[] };
}

export interface RobotsAnalyzer {
  analyze(url: string): Promise<Record<string, unknown>>;
}

export interface SitemapAnalyzer {
  analyze(url: string, robotsSitemap?: string): Promise<Record<string, unknown>>;
}

export interface ImageAnalyzer {
  analyze(html: string, isMainContent?: boolean): Record<string, unknown>;
}

export interface MobileAnalyzer {
  analyze(html: string, baseScore: number): number;
}

export interface KeywordAnalyzer {
  analyze(html: string): Record<string, unknown>;
}