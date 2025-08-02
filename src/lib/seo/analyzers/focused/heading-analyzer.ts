import type { AnalysisContext, AnalysisResult, SEOAnalyzer } from '../../interfaces/analyzers.js';
import type { HeadingAnalysis } from '../../types/focused-analysis.js';
import { extractHeadings } from '../../utils/html-parser.js';
import { validateHeadingHierarchy } from '../../utils/validation-utils.js';
import { applySEOPenalty } from '../../utils/scoring-utils.js';
// import { SEO_PENALTIES } from '../../constants/scoring.js'; // Unused
import { 
  createErrorIssue, 
  createWarningIssue, 
  createSuccessIssue 
} from '../../utils/issue-factory.js';

export class HeadingAnalyzer implements SEOAnalyzer {
  async analyze(context: AnalysisContext): Promise<AnalysisResult> {
    const { html } = context;
    const headings = extractHeadings(html);
    
    let score = 100;
    const issues = [];

    // H1 analysis
    if (headings.h1.length === 0) {
      score = applySEOPenalty(score, 'H1_MISSING');
      issues.push(createErrorIssue('Falta el encabezado H1'));
    } else if (headings.h1.length > 1) {
      score = applySEOPenalty(score, 'H1_MULTIPLE');
      issues.push(createErrorIssue(
        `Se encontraron múltiples encabezados H1 (${headings.h1.length}). Usa solo un H1 por página`
      ));
    } else {
      issues.push(createSuccessIssue('Se encontró un solo encabezado H1'));
    }

    // H2 analysis
    if (headings.h2.length > 6) {
      score -= 5; // Minor penalty for too many H2s
      issues.push(createWarningIssue(
        `Demasiados encabezados H2 (${headings.h2.length}). Considera reorganizar el contenido en secciones más manejables`,
        'medium'
      ));
    }

    // Heading hierarchy analysis
    const { hierarchyScore, hierarchyIssues } = validateHeadingHierarchy(html);
    score += hierarchyScore; // hierarchyScore is negative or 0
    issues.push(...hierarchyIssues);

    const headingAnalysis: HeadingAnalysis = {
      headings,
      hierarchyScore,
      hierarchyIssues,
      h1Count: headings.h1.length,
      score: Math.max(0, score),
      issues
    };

    return {
      score: headingAnalysis.score,
      issues: headingAnalysis.issues,
      data: headingAnalysis as unknown as Record<string, unknown>
    };
  }
}