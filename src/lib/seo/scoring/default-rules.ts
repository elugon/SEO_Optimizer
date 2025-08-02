import type { AnalysisContext, ScoringRule } from '../interfaces/analyzers.js';
import type { Issue } from '../types/analysis.js';
import { SEO_PENALTIES, SEO_THRESHOLDS } from '../constants/scoring.js';
import { createErrorIssue, createWarningIssue, createSuccessIssue } from '../utils/issue-factory.js';

export const titleLengthRule: ScoringRule = {
  name: 'title-length',
  evaluate(data: any, _context: AnalysisContext): { score: number; issues: Issue[] } {
    const title = data.title?.title || '';
    let score = 100;
    const issues: Issue[] = [];

    if (!title) {
      score -= SEO_PENALTIES.TITLE_MISSING;
      issues.push(createErrorIssue('Falta el título de la página'));
    } else if (title.length < SEO_THRESHOLDS.TITLE_MIN_LENGTH) {
      score -= SEO_PENALTIES.TITLE_TOO_SHORT;
      issues.push(createWarningIssue(
        `Título muy corto (${title.length} caracteres). Recomendado: ${SEO_THRESHOLDS.TITLE_MIN_LENGTH}-${SEO_THRESHOLDS.TITLE_MAX_LENGTH} caracteres`
      ));
    } else if (title.length > SEO_THRESHOLDS.TITLE_MAX_LENGTH) {
      score -= SEO_PENALTIES.TITLE_TOO_LONG;
      issues.push(createWarningIssue(
        `Título muy largo (${title.length} caracteres). Puede ser truncado`
      ));
    } else {
      issues.push(createSuccessIssue(
        `Excelente longitud del título (${title.length} caracteres)`
      ));
    }

    return { score: Math.max(0, score), issues };
  }
};

export const descriptionLengthRule: ScoringRule = {
  name: 'description-length',
  evaluate(data: any, _context: AnalysisContext): { score: number; issues: Issue[] } {
    const description = data.description?.description || '';
    let score = 100;
    const issues: Issue[] = [];

    if (!description) {
      score -= SEO_PENALTIES.DESCRIPTION_MISSING;
      issues.push(createErrorIssue('Falta la meta descripción'));
    } else if (description.length < SEO_THRESHOLDS.DESCRIPTION_MIN_LENGTH) {
      score -= SEO_PENALTIES.DESCRIPTION_TOO_SHORT;
      issues.push(createWarningIssue(
        `Meta descripción muy corta (${description.length} caracteres). Recomendado: ${SEO_THRESHOLDS.DESCRIPTION_MIN_LENGTH}-${SEO_THRESHOLDS.DESCRIPTION_MAX_LENGTH} caracteres`
      ));
    } else if (description.length > SEO_THRESHOLDS.DESCRIPTION_MAX_LENGTH) {
      score -= SEO_PENALTIES.DESCRIPTION_TOO_LONG;
      issues.push(createWarningIssue(
        `Meta descripción muy larga (${description.length} caracteres). Puede ser truncada`
      ));
    } else {
      issues.push(createSuccessIssue(
        `Buena longitud de meta descripción (${description.length} caracteres)`
      ));
    }

    return { score: Math.max(0, score), issues };
  }
};

export const h1CountRule: ScoringRule = {
  name: 'h1-count',
  evaluate(data: any, _context: AnalysisContext): { score: number; issues: Issue[] } {
    const h1Count = data.headings?.h1Count || 0;
    let score = 100;
    const issues: Issue[] = [];

    if (h1Count === 0) {
      score -= SEO_PENALTIES.H1_MISSING;
      issues.push(createErrorIssue('Falta el encabezado H1'));
    } else if (h1Count > 1) {
      score -= SEO_PENALTIES.H1_MULTIPLE;
      issues.push(createWarningIssue(
        `Se encontraron múltiples encabezados H1 (${h1Count}). Usa solo un H1 por página`
      ));
    } else {
      issues.push(createSuccessIssue('Se encontró un solo encabezado H1'));
    }

    return { score: Math.max(0, score), issues };
  }
};

export const httpsRule: ScoringRule = {
  name: 'https',
  evaluate(data: any, _context: AnalysisContext): { score: number; issues: Issue[] } {
    const hasSSL = data.technical?.hasSSL || false;
    let score = 100;
    const issues: Issue[] = [];

    if (!hasSSL) {
      score -= SEO_PENALTIES.NO_HTTPS;
      issues.push(createErrorIssue(
        'No usa HTTPS - Riesgo de seguridad y factor de posicionamiento',
        'technical'
      ));
    } else {
      issues.push(createSuccessIssue('HTTPS habilitado', 'technical'));
    }

    return { score: Math.max(0, score), issues };
  }
};

export const canonicalRule: ScoringRule = {
  name: 'canonical',
  evaluate(data: any, _context: AnalysisContext): { score: number; issues: Issue[] } {
    const hasCanonical = data.technical?.hasCanonical || false;
    let score = 100;
    const issues: Issue[] = [];

    if (!hasCanonical) {
      score -= SEO_PENALTIES.NO_CANONICAL;
      issues.push(createWarningIssue('Falta la URL canónica', 'medium', 'technical'));
    } else {
      issues.push(createSuccessIssue('URL canónica encontrada', 'technical'));
    }

    return { score: Math.max(0, score), issues };
  }
};

export const schemaRule: ScoringRule = {
  name: 'schema',
  evaluate(data: any, _context: AnalysisContext): { score: number; issues: Issue[] } {
    const hasSchema = data.technical?.hasSchema || false;
    let score = 100;
    const issues: Issue[] = [];

    if (!hasSchema) {
      score -= SEO_PENALTIES.NO_SCHEMA;
      issues.push(createWarningIssue(
        'No se detectaron datos estructurados (JSON-LD)',
        'medium',
        'technical'
      ));
    } else {
      issues.push(createSuccessIssue('Datos estructurados detectados', 'technical'));
    }

    return { score: Math.max(0, score), issues };
  }
};

export const DEFAULT_RULES = [
  titleLengthRule,
  descriptionLengthRule,
  h1CountRule,
  httpsRule,
  canonicalRule,
  schemaRule
];