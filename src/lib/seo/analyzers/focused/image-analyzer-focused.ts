import type { AnalysisContext, AnalysisResult, SEOAnalyzer } from '../../interfaces/analyzers.js';
import type { ImageAnalysis } from '../../types/focused-analysis.js';
import { analyzeAdvancedImageOptimization, extractAltTextIntelligent } from './utils/image-optimization-utils.js';
import { calculateImageAltPenalty } from '../../utils/scoring-utils.js';
import { SEO_PENALTIES } from '../../constants/scoring.js';
import { 
  createWarningIssue, 
  createSuccessIssue,
  createInfoIssue 
} from '../../utils/issue-factory.js';

export class ImageAnalyzerFocused implements SEOAnalyzer {
  async analyze(context: AnalysisContext): Promise<AnalysisResult> {
    const { html } = context;
    
    let score = 100;
    const issues = [];

    // Use unified intelligent analysis with consistent HTML scope for both optimization and alt text
    const imageOptimization = analyzeAdvancedImageOptimization(html, false);
    const altTextData = extractAltTextIntelligent(html, false);
    
    // Both analyses now use the same counting logic, ensuring consistency

    if (altTextData.total > 0) {
      const altPercentage = (altTextData.withAlt / altTextData.total) * 100;
      
      // Alt text analysis
      if (altTextData.withoutAlt > 0) {
        const penalty = calculateImageAltPenalty(altTextData.withoutAlt);
        score -= penalty;
        issues.push(createWarningIssue(
          `${altTextData.withoutAlt} de ${altTextData.total} imágenes no tienen texto alternativo (${altPercentage.toFixed(0)}% tienen alt)`
        ));
      } else {
        issues.push(createSuccessIssue(
          `Todas las ${altTextData.total} imágenes tienen texto alternativo`
        ));
      }
      
      // Modern formats optimization penalty (primary optimization metric)
      const optimizationPenalty = Math.round((100 - imageOptimization.optimization.score) * SEO_PENALTIES.IMAGE_OPTIMIZATION_MULTIPLIER);
      score -= optimizationPenalty;
      
      // Compression penalty (secondary, affects final score separately)
      const compressionPenalty = Math.round((100 - imageOptimization.compression.score) * 0.2);
      score -= compressionPenalty;
      
      // Add optimization issues (modern formats)
      imageOptimization.optimization.issues.forEach(issue => {
        issues.push({
          type: issue.priority === 'high' ? 'error' : 'warning',
          message: issue.message,
          priority: issue.priority,
          category: 'performance'
        });
      });
      
      // Add compression issues (responsive, format efficiency)
      imageOptimization.compression.issues.forEach(issue => {
        const priority = issue.severity === 'high' ? 'high' : 'medium';
        issues.push({
          type: issue.severity === 'high' ? 'error' : 'warning',
          message: issue.message,
          priority: priority,
          category: 'performance'
        });
      });
      
      
      // Success messages for good optimization
      if (imageOptimization.optimization.score > 80) {
        issues.push(createSuccessIssue(
          `Excelente optimización de imágenes (${imageOptimization.optimization.score}/100 puntos)`,
          'performance'
        ));
      }
      
      if (imageOptimization.modernFormats.modernPercentage > 50) {
        issues.push(createSuccessIssue(
          `${imageOptimization.modernFormats.modernPercentage}% de imágenes usan formatos modernos (WebP/AVIF)`,
          'performance'
        ));
      }
      
    } else {
      issues.push(createInfoIssue('No se encontraron imágenes en la página'));
    }

    const imageAnalysis: ImageAnalysis = {
      totalImages: altTextData.total,
      imagesWithAlt: altTextData.withAlt,
      imagesWithoutAlt: altTextData.withoutAlt,
      altTextScore: altTextData.total > 0 ? (altTextData.withAlt / altTextData.total) * 100 : 100,
      optimization: imageOptimization.optimization,
      modernFormats: imageOptimization.modernFormats,
      compression: imageOptimization.compression,
      score: Math.max(0, score),
      issues
    };

    return {
      score: imageAnalysis.score,
      issues: imageAnalysis.issues,
      data: imageAnalysis as unknown as Record<string, unknown>
    };
  }
}