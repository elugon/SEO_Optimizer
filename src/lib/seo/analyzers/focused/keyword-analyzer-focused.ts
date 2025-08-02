import type { AnalysisContext, AnalysisResult, SEOAnalyzer } from '../../interfaces/analyzers.js';
import type { KeywordAnalysis } from '../../types/focused-analysis.js';
import { extractTitle } from '../../utils/html-parser.js';
import { extractMetaDescription, extractEnhancedMetaKeywords } from '../../utils/meta-utils.js';
import { extractContentText } from '../../utils/content-utils.js';
import { calculateTFIDF, analyzeKeywordOptimization, detectKeywordStuffing } from '../../utils/keyword-utils.js';
import { calculateKeywordScore, getKeywordOptimizationLevel } from '../../utils/scoring-utils.js';
import { SEO_PENALTIES, KEYWORD_SCORING } from '../../constants/scoring.js';
import { 
  createErrorIssue, 
  createWarningIssue, 
  createSuccessIssue 
} from '../../utils/issue-factory.js';

export class KeywordAnalyzerFocused implements SEOAnalyzer {
  async analyze(context: AnalysisContext): Promise<AnalysisResult> {
    const { html } = context;
    
    let score = 100;
    const issues = [];

    const title = extractTitle(html);
    const description = extractMetaDescription(html);
    const headings = {
      h1: (html.match(/<h1[^>]*>(.*?)<\/h1>/gi) || []).map((h: string) => h.replace(/<[^>]*>/g, '').trim()),
      h2: (html.match(/<h2[^>]*>(.*?)<\/h2>/gi) || []).map((h: string) => h.replace(/<[^>]*>/g, '').trim()),
      h3: (html.match(/<h3[^>]*>(.*?)<\/h3>/gi) || []).map((h: string) => h.replace(/<[^>]*>/g, '').trim()),
      h4: (html.match(/<h4[^>]*>(.*?)<\/h4>/gi) || []).map((h: string) => h.replace(/<[^>]*>/g, '').trim()),
      h5: (html.match(/<h5[^>]*>(.*?)<\/h5>/gi) || []).map((h: string) => h.replace(/<[^>]*>/g, '').trim()),
      h6: (html.match(/<h6[^>]*>(.*?)<\/h6>/gi) || []).map((h: string) => h.replace(/<[^>]*>/g, '').trim())
    };

    // === HYBRID KEYWORDS ANALYSIS SYSTEM ===
    
    // 1. Extract enhanced meta keywords
    const metaKeywordsData = extractEnhancedMetaKeywords(html);
    const metaKeywords = metaKeywordsData.raw;
    
    // 2. Extract content text for analysis
    const contentText = extractContentText(html);
    
    // 3. Combine keywords from meta + content discovery
    let allKeywords = [...metaKeywordsData.processed];
    
    // If no meta keywords, extract from content intelligently
    if (allKeywords.length === 0) {
      const titleWords = (contentText.title || '').toLowerCase().split(/\s+/).filter(w => w.length > 3);
      const h1Words = (contentText.h1 || '').toLowerCase().split(/\s+/).filter(w => w.length > 3);
      allKeywords = [...new Set([...titleWords.slice(0, 5), ...h1Words.slice(0, 5)])];
    }
    
    // 4. REMOVED ARTIFICIAL LIMIT: Let the analyzer process all keywords found
    // The display layer (cards) will handle the recommended limit for display
    // This ensures warnings and cards show consistent data
    
    // 5. Real TF-IDF analysis
    const contentKeywords = calculateTFIDF(contentText.fullText, allKeywords);
    
    // 6. Analyze keyword optimization
    const { keywordOptimization, positioningBonus, missingKeywordsInDescription } = 
      analyzeKeywordOptimization(contentKeywords, title, description, headings);
    
    // 7. Detect keyword stuffing issues
    const stuffingIssues = detectKeywordStuffing(contentKeywords, metaKeywordsData);
    
    // 8. Add warning for keywords missing in meta description
    if (missingKeywordsInDescription.length > 0) {
      stuffingIssues.push({
        type: 'keywords_missing_in_description',
        keyword: missingKeywordsInDescription.join(', '),
        frequency: missingKeywordsInDescription.length,
        message: `${missingKeywordsInDescription.length} palabra(s) clave principales no aparecen en la descripción: "${missingKeywordsInDescription.join('", "')}".\nEsto reduce la relevancia del contenido`
      });
    }
    
    // 9. Calculate enhanced keyword score
    const totalKeywordScore = calculateKeywordScore(keywordOptimization, positioningBonus);
    const finalKeywordOptimization = totalKeywordScore;
    
    // 10. Backward compatibility - topKeywords (PRESERVE ALL KEYWORDS)
    // Let the display layer decide how many to show, not the analyzer
    const topKeywords = contentKeywords.map(kw => ({
      word: kw.word,
      count: kw.frequency,
      density: kw.density
    }));

    // Scoring and issue generation
    let keywordScorePenalty = 0;
    
    // Meta keywords validation
    if (!metaKeywords) {
      keywordScorePenalty += SEO_PENALTIES.NO_META_KEYWORDS;
      issues.push(createWarningIssue(
        'No se encontró meta tag keywords. Útil para Bing, Yandex y otros motores',
        'low'
      ));
    } else if (!metaKeywordsData.isValid) {
      keywordScorePenalty += SEO_PENALTIES.INVALID_META_KEYWORDS;
      issues.push(createWarningIssue(
        'Meta keywords presente pero mal estructurado',
        'low'
      ));
    }
    
    // Content keyword analysis
    const optimizationLevel = getKeywordOptimizationLevel(finalKeywordOptimization);
    
    if (topKeywords.length === 0) {
      keywordScorePenalty += SEO_PENALTIES.NO_KEYWORDS_FOUND;
      issues.push(createErrorIssue(
        'No se encontraron keywords en el contenido ni en meta tags'
      ));
    } else if (optimizationLevel === 'poor') {
      keywordScorePenalty += SEO_PENALTIES.POOR_KEYWORD_OPTIMIZATION;
      issues.push(createWarningIssue(
        `Las keywords encontradas no aparecen en título o descripción. Optimiza para "${topKeywords[0].word}"`
      ));
    } else if (optimizationLevel === 'basic') {
      keywordScorePenalty += SEO_PENALTIES.BASIC_KEYWORD_OPTIMIZATION;
      issues.push(createWarningIssue(
        `Optimización de keywords básica (${finalKeywordOptimization}/${KEYWORD_SCORING.MAX_KEYWORD_SCORE} puntos). Mejora posicionamiento de "${topKeywords[0].word}"`
      ));
    } else if (optimizationLevel === 'good') {
      keywordScorePenalty += SEO_PENALTIES.GOOD_KEYWORD_OPTIMIZATION;
      issues.push(createSuccessIssue(
        `Buena optimización de keywords (${finalKeywordOptimization}/${KEYWORD_SCORING.MAX_KEYWORD_SCORE} puntos) con "${topKeywords[0].word}"`
      ));
    } else {
      issues.push(createSuccessIssue(
        `Excelente optimización de keywords (${finalKeywordOptimization}/${KEYWORD_SCORING.MAX_KEYWORD_SCORE} puntos) con distribución natural`
      ));
    }
    
    // Keyword stuffing penalties
    if (stuffingIssues.length > 0) {
      keywordScorePenalty += stuffingIssues.length * SEO_PENALTIES.KEYWORD_STUFFING_PER_ISSUE;
      stuffingIssues.forEach(issue => {
        issues.push(createWarningIssue(issue.message));
      });
    }
    
    // Apply keyword scoring
    score -= Math.min(25, keywordScorePenalty);

    const keywordAnalysis: KeywordAnalysis = {
      topKeywords,
      totalWords: contentText.wordCount,
      uniqueWords: [...new Set(contentText.fullText.split(/\s+/).filter(w => w.length > 2))].length,
      keywordOptimization: finalKeywordOptimization,
      metaKeywords: metaKeywords,
      analysis: {
        metaKeywords: {
          raw: metaKeywordsData.raw,
          processed: metaKeywordsData.processed,
          count: metaKeywordsData.count,
          isValid: metaKeywordsData.isValid
        },
        contentKeywords: contentKeywords,
        contentStats: {
          bodyWordCount: contentText.wordCount,
          titleWordCount: contentText.title.split(/\s+/).length,
          h1WordCount: contentText.h1.split(/\s+/).length,
          avgDensity: contentKeywords.length > 0 ? 
            (contentKeywords.reduce((sum, kw) => sum + parseFloat(kw.density), 0) / contentKeywords.length).toFixed(2) : '0.00'
        },
        qualityMetrics: {
          stuffingIssues: stuffingIssues,
          naturalKeywords: contentKeywords.filter(kw => kw.naturalDensity).length,
          positioningScore: positioningBonus,
          totalKeywordScore: totalKeywordScore,
          maxPossibleScore: KEYWORD_SCORING.MAX_KEYWORD_SCORE
        },
        recommendations: stuffingIssues.length > 0 ? [
          {
            type: 'keyword_optimization',
            priority: 'medium',
            message: `Se detectaron ${stuffingIssues.length} problemas de densidad de keywords`,
            action: 'Revisa la distribución natural y usa sinónimos'
          }
        ] : []
      },
      score: Math.max(0, score),
      issues
    };

    return {
      score: keywordAnalysis.score,
      issues: keywordAnalysis.issues,
      data: keywordAnalysis as unknown as Record<string, unknown>
    };
  }
}