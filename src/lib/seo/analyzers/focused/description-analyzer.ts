import type { AnalysisContext, AnalysisResult, SEOAnalyzer } from '../../interfaces/analyzers.js';
import type { DescriptionAnalysis } from '../../types/focused-analysis.js';
import { extractMetaDescription } from '../../utils/meta-utils.js';
import { hasEmojis, hasSpecialSymbols } from '../../utils/content-utils.js';
import { 
  applySEOPenalty, 
  calculateSymbolPenalty,
  // isValidDescriptionLength - unused 
} from '../../utils/scoring-utils.js';
import { SEO_THRESHOLDS } from '../../constants/scoring.js';
import { 
  createErrorIssue, 
  createWarningIssue, 
  createSuccessIssue 
} from '../../utils/issue-factory.js';

export class DescriptionAnalyzer implements SEOAnalyzer {
  async analyze(context: AnalysisContext): Promise<AnalysisResult> {
    const { html } = context;
    const description = extractMetaDescription(html);
    
    let score = 100;
    const issues = [];
    const descHasEmojis = description ? hasEmojis(description) : false;
    const descSymbols = description ? hasSpecialSymbols(description) : { hasSymbols: false, symbolCount: 0, categories: [] as { name: string; symbols: string[] }[] };

    // Description analysis
    if (!description) {
      score = applySEOPenalty(score, 'DESCRIPTION_MISSING');
      issues.push(createErrorIssue('Falta la meta descripción'));
    } else if (description.length < SEO_THRESHOLDS.DESCRIPTION_MIN_LENGTH) {
      score = applySEOPenalty(score, 'DESCRIPTION_TOO_SHORT');
      issues.push(createWarningIssue(
        `Meta descripción muy corta (${description.length} caracteres). Recomendado: ${SEO_THRESHOLDS.DESCRIPTION_MIN_LENGTH}-${SEO_THRESHOLDS.DESCRIPTION_MAX_LENGTH} caracteres`
      ));
    } else if (description.length > SEO_THRESHOLDS.DESCRIPTION_MAX_LENGTH) {
      score = applySEOPenalty(score, 'DESCRIPTION_TOO_LONG');
      issues.push(createWarningIssue(
        `Meta descripción muy larga (${description.length} caracteres). Puede ser truncada`
      ));
    } else {
      issues.push(createSuccessIssue(
        `Buena longitud de la meta descripción (${description.length} caracteres)`
      ));
    }

    // Emoji analysis
    if (descHasEmojis) {
      score = applySEOPenalty(score, 'DESCRIPTION_EMOJI');
      issues.push(createWarningIssue(
        'La meta descripción contiene emojis. Los emojis pueden no mostrarse correctamente en todos los resultados de búsqueda'
      ));
    }

    // Symbol analysis
    if (descSymbols.hasSymbols) {
      const penalty = calculateSymbolPenalty(descSymbols.symbolCount, false);
      score -= penalty;
      
      const categoryMessages = descSymbols.categories.map((cat: any) => 
        `${cat.name} (${cat.symbols.join(', ')})`
      ).join(', ');
      
      issues.push(createWarningIssue(
        `La meta descripción contiene ${descSymbols.symbolCount} símbolos especiales: ${categoryMessages}. Considera usar texto más natural para mejorar la legibilidad`,
        descSymbols.symbolCount > 5 ? 'medium' : 'low'
      ));
    }

    const descriptionAnalysis: DescriptionAnalysis = {
      description: description || '',
      length: description ? description.length : 0,
      hasEmojis: descHasEmojis,
      hasSpecialSymbols: descSymbols.hasSymbols,
      score: Math.max(0, score),
      issues
    };

    return {
      score: descriptionAnalysis.score,
      issues: descriptionAnalysis.issues,
      data: descriptionAnalysis as unknown as Record<string, unknown>
    };
  }
}