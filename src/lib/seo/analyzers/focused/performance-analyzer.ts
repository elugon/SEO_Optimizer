import type { AnalysisContext, AnalysisResult, SEOAnalyzer } from '../../interfaces/analyzers.js';
import type { PerformanceAnalysis, CompressionInfo } from '../../types/focused-analysis.js';
import { calculateRealMobileScore } from './utils/mobile-utils.js';
import { SEO_THRESHOLDS } from '../../constants/scoring.js';
import { 
  createWarningIssue, 
  createSuccessIssue,
  createInfoIssue
} from '../../utils/issue-factory.js';

export class PerformanceAnalyzer implements SEOAnalyzer {

  async analyze(context: AnalysisContext): Promise<AnalysisResult> {
    const { html, loadTime, response } = context;
    
    let score = 100;
    const issues = [];

    const pageSize = html.length;
    const imgMatches = html.match(/<img[^>]*>/gi) || [];
    const resourceCount = imgMatches.length;

    // Analyze TTFB and compression
    const ttfb = this.extractTTFB(response, loadTime);
    const compression = this.analyzeCompression(response, pageSize);

    // Page size analysis
    if (pageSize > SEO_THRESHOLDS.PAGE_SIZE_LIMIT) {
      const penalty = Math.min(20, Math.ceil((pageSize - SEO_THRESHOLDS.PAGE_SIZE_LIMIT) / 1000000) * 5);
      score -= penalty;
      issues.push(createWarningIssue(
        `Página muy grande (${(pageSize / 1000000).toFixed(1)}MB). Considera optimizar el contenido`,
        'medium',
        'performance'
      ));
    } else {
      issues.push(createSuccessIssue(
        `Tamaño de página adecuado (${(pageSize / 1000).toFixed(1)}KB)`,
        'performance'
      ));
    }

    // Load time analysis
    if (loadTime > 3000) {
      const penalty = Math.min(15, Math.ceil((loadTime - 3000) / 1000) * 3);
      score -= penalty;
      issues.push(createWarningIssue(
        `Tiempo de carga lento (${loadTime}ms). Recomendado: menos de 3 segundos`,
        'high',
        'performance'
      ));
    } else if (loadTime > 1000) {
      const penalty = Math.min(5, Math.ceil((loadTime - 1000) / 500));
      score -= penalty;
      issues.push(createWarningIssue(
        `Tiempo de carga aceptable (${loadTime}ms). Ideal: menos de 1 segundo`,
        'low',
        'performance'
      ));
    } else {
      issues.push(createSuccessIssue(
        `Excelente tiempo de carga (${loadTime}ms)`,
        'performance'
      ));
    }

    // Calculate mobile score with utility function
    const mobileScore = calculateRealMobileScore(html, score);

    // Análisis móvil simplificado
    if (mobileScore < 60) {
      issues.push(createWarningIssue(
        `Optimización móvil deficiente (${Math.round(mobileScore)}/100). Revisa viewport y diseño responsivo`,
        'high',
        'performance'
      ));
    } else if (mobileScore < 85) {
      issues.push(createWarningIssue(
        `Optimización móvil aceptable (${Math.round(mobileScore)}/100). Puede mejorarse`,
        'medium',
        'performance'
      ));
    } else {
      issues.push(createSuccessIssue(
        `Buena optimización móvil (${Math.round(mobileScore)}/100)`,
        'performance'
      ));
    }

    // TTFB Analysis
    if (ttfb > 500) {
      const penalty = Math.min(10, Math.ceil((ttfb - 500) / 100) * 2);
      score -= penalty;
      issues.push(createWarningIssue(
        `TTFB lento (${ttfb}ms). El servidor tarda mucho en responder. Ideal: <200ms`,
        'high',
        'performance'
      ));
    } else if (ttfb > 200) {
      const penalty = Math.min(3, Math.ceil((ttfb - 200) / 100));
      score -= penalty;
      issues.push(createWarningIssue(
        `TTFB aceptable (${ttfb}ms). Puede mejorarse para una respuesta más rápida del servidor`,
        'medium',
        'performance'
      ));
    } else {
      issues.push(createSuccessIssue(
        `Excelente TTFB (${ttfb}ms). El servidor responde rápidamente`,
        'performance'
      ));
    }

    // Compression Analysis
    if (!compression.enabled) {
      score -= 8;
      issues.push(createWarningIssue(
        'Sin compresión detectada. Habilita GZIP/Brotli para reducir el tamaño de transferencia hasta un 70%',
        'high',
        'performance'
      ));
    } else if (compression.type === 'brotli') {
      issues.push(createSuccessIssue(
        `Compresión Brotli habilitada. Excelente optimización (ahorro estimado: ${compression.estimatedSavings || 'N/A'}%)`,
        'performance'
      ));
    } else if (compression.type === 'gzip') {
      issues.push(createSuccessIssue(
        `Compresión GZIP habilitada. Buena optimización (ahorro estimado: ${compression.estimatedSavings || 'N/A'}%)`,
        'performance'
      ));
    } else if (compression.type === 'deflate') {
      issues.push(createInfoIssue(
        'Compresión Deflate detectada. Considera actualizar a GZIP o Brotli para mejor eficiencia',
        'performance'
      ));
    }

    if (resourceCount > 0) {
      issues.push(createInfoIssue(
        `Se encontraron ${resourceCount} recursos de imagen`,
        'performance'
      ));
    }

    const performanceAnalysis: PerformanceAnalysis = {
      loadTime,
      pageSize,
      resourceCount,
      mobileScore: Math.round(mobileScore),
      ttfb,
      compression,
      score: Math.max(0, score),
      issues
    };

    return {
      score: performanceAnalysis.score,
      issues: performanceAnalysis.issues,
      data: performanceAnalysis as unknown as Record<string, unknown>
    };
  }

  /**
   * Extract Time to First Byte from response headers or use loadTime as fallback
   */
  private extractTTFB(response: Response, loadTime: number): number {
    try {
      // Try to get server timing header first (most accurate)
      const serverTiming = response.headers.get('server-timing');
      if (serverTiming) {
        const ttfbMatch = serverTiming.match(/ttfb[;=]\s*(\d+(?:\.\d+)?)/i);
        if (ttfbMatch) {
          return Math.round(parseFloat(ttfbMatch[1]));
        }
      }

      // Try to estimate from response time header
      const responseTime = response.headers.get('x-response-time');
      if (responseTime) {
        const timeMatch = responseTime.match(/(\d+(?:\.\d+)?)/);
        if (timeMatch) {
          return Math.round(parseFloat(timeMatch[1]));
        }
      }

      // Try to extract from other common timing headers
      const processingTime = response.headers.get('x-processing-time') || 
                            response.headers.get('x-runtime') ||
                            response.headers.get('x-request-time');
      
      if (processingTime) {
        const timeMatch = processingTime.match(/(\d+(?:\.\d+)?)/);
        if (timeMatch) {
          const time = parseFloat(timeMatch[1]);
          // Convert seconds to milliseconds if needed
          return Math.round(time > 10 ? time : time * 1000);
        }
      }

      // Fallback: Use loadTime as TTFB approximation
      // This includes network latency + server processing time
      // For most cases, this is close enough to actual TTFB
      return loadTime;
    } catch (error) {
      return loadTime;
    }
  }

  /**
   * Analyze compression from response headers with intelligent fallbacks
   */
  private analyzeCompression(response: Response, originalSize: number): CompressionInfo {
    try {
      const contentEncoding = response.headers.get('content-encoding')?.toLowerCase();
      const contentLength = response.headers.get('content-length');
      const transferEncoding = response.headers.get('transfer-encoding')?.toLowerCase();
      
      let compressionType: CompressionInfo['type'] = 'none';
      let estimatedSavings = 0;
      let compressedSize = originalSize;

      // Primary detection: content-encoding header
      if (contentEncoding && contentEncoding !== 'identity') {
        if (contentEncoding.includes('br') || contentEncoding.includes('brotli')) {
          compressionType = 'brotli';
          estimatedSavings = 65; // Brotli typically achieves 65% compression
        } else if (contentEncoding.includes('gzip')) {
          compressionType = 'gzip';
          estimatedSavings = 60; // GZIP typically achieves 60% compression
        } else if (contentEncoding.includes('deflate')) {
          compressionType = 'deflate';
          estimatedSavings = 55; // Deflate typically achieves 55% compression
        }
      }

      // Secondary detection: analyze actual vs expected size ratio
      if (compressionType === 'none' && contentLength) {
        const parsedLength = parseInt(contentLength, 10);
        if (!isNaN(parsedLength) && parsedLength > 0) {
          compressedSize = parsedLength;
          
          // If compressed size is significantly smaller than original, compression likely exists
          const sizeRatio = compressedSize / originalSize;
          if (sizeRatio < 0.7) { // Less than 70% of original size suggests compression
            compressionType = 'gzip'; // Assume GZIP as most common
            estimatedSavings = Math.round((1 - sizeRatio) * 100);
          }
        }
      } else if (contentLength && compressionType !== 'none') {
        // Calculate actual compressed size and savings
        const parsedLength = parseInt(contentLength, 10);
        if (!isNaN(parsedLength) && parsedLength > 0) {
          compressedSize = parsedLength;
          estimatedSavings = Math.round(((originalSize - compressedSize) / originalSize) * 100);
        }
      }

      // Tertiary detection: check for chunked encoding (often indicates compression)
      if (compressionType === 'none' && transferEncoding?.includes('chunked')) {
        // Estimate compression based on common HTML compression ratios
        const textRatio = this.estimateTextCompressionRatio(originalSize);
        if (textRatio > 30) { // If we expect significant compression
          compressionType = 'gzip'; // Most servers use GZIP by default
          estimatedSavings = textRatio;
          compressedSize = Math.round(originalSize * (1 - textRatio / 100));
        }
      }

      return {
        enabled: compressionType !== 'none',
        type: compressionType,
        originalSize,
        compressedSize,
        estimatedSavings: Math.max(0, Math.min(90, estimatedSavings)) // Cap at 90% max
      };
    } catch (error) {
      return {
        enabled: false,
        type: 'none',
        originalSize,
        compressedSize: originalSize,
        estimatedSavings: 0
      };
    }
  }

  /**
   * Estimate expected compression ratio for text content
   */
  private estimateTextCompressionRatio(size: number): number {
    // HTML/CSS/JS typically compress well
    // Smaller files compress less efficiently due to overhead
    if (size < 1024) return 20;      // <1KB: 20% compression
    if (size < 10240) return 45;     // <10KB: 45% compression
    if (size < 102400) return 60;    // <100KB: 60% compression
    return 65;                       // >100KB: 65% compression
  }
}