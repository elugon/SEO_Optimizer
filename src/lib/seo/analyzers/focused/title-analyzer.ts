import type { AnalysisContext, AnalysisResult, SEOAnalyzer } from '../../interfaces/analyzers.js';
import type { TitleAnalysis } from '../../types/focused-analysis.js';
import { extractTitle } from '../../utils/html-parser.js';
import { hasEmojis, hasSpecialSymbols } from '../../utils/content-utils.js';
import { 
  applySEOPenalty, 
  calculateSymbolPenalty,
  // isValidTitleLength - unused 
} from '../../utils/scoring-utils.js';
import { SEO_THRESHOLDS } from '../../constants/scoring.js';
import { 
  createErrorIssue, 
  createWarningIssue, 
  createSuccessIssue 
} from '../../utils/issue-factory.js';

export class TitleAnalyzer implements SEOAnalyzer {
  async analyze(context: AnalysisContext): Promise<AnalysisResult> {
    const { html } = context;
    const title = extractTitle(html);
    
    let score = 100;
    const issues = [];
    const titleHasEmojis = title ? hasEmojis(title) : false;
    const titleSymbols = title ? hasSpecialSymbols(title) : { hasSymbols: false, symbolCount: 0, categories: [] as { name: string; symbols: string[] }[] };

    // Title analysis
    if (!title) {
      score = applySEOPenalty(score, 'TITLE_MISSING');
      issues.push(createErrorIssue('Falta el título de la página'));
    } else if (title.length < SEO_THRESHOLDS.TITLE_MIN_LENGTH) {
      score = applySEOPenalty(score, 'TITLE_TOO_SHORT');
      issues.push(createWarningIssue(
        `Título muy corto (${title.length} caracteres). Los títulos deben tener entre ${SEO_THRESHOLDS.TITLE_MIN_LENGTH} y ${SEO_THRESHOLDS.TITLE_MAX_LENGTH} caracteres para un SEO óptimo`
      ));
    } else if (title.length > SEO_THRESHOLDS.TITLE_MAX_LENGTH) {
      score = applySEOPenalty(score, 'TITLE_TOO_LONG');
      issues.push(createWarningIssue(
        `Título muy largo (${title.length} caracteres). Los títulos deben tener entre ${SEO_THRESHOLDS.TITLE_MIN_LENGTH} y ${SEO_THRESHOLDS.TITLE_MAX_LENGTH} caracteres para evitar truncamiento`
      ));
    } else {
      issues.push(createSuccessIssue(
        `Excelente longitud del título (${title.length} caracteres). Cumple con la recomendación de ${SEO_THRESHOLDS.TITLE_MIN_LENGTH}-${SEO_THRESHOLDS.TITLE_MAX_LENGTH} caracteres`
      ));
    }

    // Emoji analysis
    if (titleHasEmojis) {
      score = applySEOPenalty(score, 'TITLE_EMOJI');
      issues.push(createWarningIssue(
        'El título contiene emojis. Los emojis pueden causar problemas de compatibilidad y no son recomendados para SEO'
      ));
    }

    // Symbol analysis
    if (titleSymbols.hasSymbols) {
      const penalty = calculateSymbolPenalty(titleSymbols.symbolCount, true);
      score -= penalty;
      
      const categoryMessages = titleSymbols.categories.map((cat) => 
        `${cat.name} (${cat.symbols.join(', ')})`
      ).join(', ');
      
      issues.push(createWarningIssue(
        `El título contiene ${titleSymbols.symbolCount} símbolos especiales: ${categoryMessages}. Estos símbolos pueden afectar la legibilidad y el posicionamiento SEO`,
        titleSymbols.symbolCount > 3 ? 'high' : 'medium'
      ));
    }

    const titleAnalysis: TitleAnalysis = {
      title: title || 'No se encontró título',
      length: title ? title.length : 0,
      hasEmojis: titleHasEmojis,
      hasSpecialSymbols: titleSymbols.hasSymbols,
      score: Math.max(0, score),
      issues
    };

    return {
      score: titleAnalysis.score,
      issues: titleAnalysis.issues,
      data: titleAnalysis as unknown as Record<string, unknown>
    };
  }
}