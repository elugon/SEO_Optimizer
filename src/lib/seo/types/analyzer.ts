/**
 * Analyzer Types
 * Define las interfaces base para el sistema de analyzers
 */

import type { Issue } from './common.js';

/**
 * Contexto de análisis proporcionado a los analyzers
 */
export interface AnalysisContext {
  url: string;
  html: string;
  doc?: Document;
  options?: Record<string, any>;
}

/**
 * Resultado de un analyzer individual
 */
export interface AnalysisResult {
  type: string;
  score: number;
  weight: number;
  passed: string[];
  issues: Issue[];
  data: Record<string, any>;
}

/**
 * Interfaz base para todos los analyzers
 */
export interface SEOAnalyzer {
  analyze(context: AnalysisContext): Promise<AnalysisResult>;
}