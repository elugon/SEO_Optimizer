// Unified SEO analysis API route with centralized configuration
import type { APIRoute } from 'astro';
import { 
  analyzePageRefactored as analyzePage
} from '../../lib/seo/index.js';
import { CONFIG } from '../../lib/seo/config/index.js';
import { 
  validateUrlFormat, 
  formatErrorResponse, 
  errorHandler, 
  createSEOError, 
  ERROR_CODES
} from '../../lib/seo/errors/index.js';
import type { 
  UnifiedAnalysisResponse, 
  CompleteAnalysisResult,
  AnalysisSummary
} from '../../lib/seo/types/index.js';
import { APISecurity } from '../../lib/security/api-security.js';
import { URLValidator } from '../../lib/seo/utils/url-validator.js';
import { ErrorHandler, createError } from '../../lib/seo/errors/enhanced-error-handler.js';
import { preloadCriticalAnalyzers } from '../../lib/seo/analyzers/analyzer-factory.js';

export const prerender = false;

// Inicializar seguridad y error handling mejorado
const apiSecurity = new APISecurity({
  enableRateLimit: true,
  enableCORS: true,
  maxRequestSize: 1024 * 1024, // 1MB
  allowedOrigins: ['*'] // Configurar según necesidad en producción
});

const enhancedErrorHandler = ErrorHandler.getInstance();

// Pre-cargar analyzers críticos al inicio
preloadCriticalAnalyzers().catch(console.error);

export const POST: APIRoute = async ({ request }) => {
  // Validación de seguridad
  const securityValidation = await apiSecurity.validateRequest(request);
  if (!securityValidation.valid) {
    return apiSecurity.handleSecurityError(
      securityValidation.error!,
      securityValidation.statusCode
    );
  }
  try {
    let url: string;
    
    // Parse request body (handle both form data and JSON)
    const contentType = request.headers.get('content-type') || '';
    
    if (contentType.includes('application/json')) {
      const body = await request.json();
      url = body.url;
    } else if (contentType.includes('multipart/form-data') || contentType.includes('application/x-www-form-urlencoded')) {
      const formData = await request.formData();
      url = formData.get('url') as string;
    } else {
      const contentError = createSEOError(ERROR_CODES.CONFIG_INVALID, 'Unsupported content type');
      errorHandler.handleError(contentError);
      return new Response(JSON.stringify(formatErrorResponse(contentError)), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Validación mejorada de URL con seguridad
    const urlValidation = URLValidator.isValidUrl(url);
    if (!urlValidation.valid) {
      const validationError = createError.validation(
        urlValidation.reason || 'URL inválida',
        { url }
      );
      return apiSecurity.handleSecurityError(validationError.userMessage, 400);
    }
    
    // Validación adicional del formato
    const urlError = validateUrlFormat(url);
    if (urlError) {
      errorHandler.handleError(urlError);
      return apiSecurity.applySecurityHeaders(
        new Response(JSON.stringify(formatErrorResponse(urlError)), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }),
        request
      );
    }

    // Normalizar URL con manejo mejorado de errores
    try {
      url = URLValidator.normalizeUrl(url);
    } catch (error) {
      const normalizeError = enhancedErrorHandler.handle(error, {
        url,
        operation: 'URL normalization'
      });
      return apiSecurity.applySecurityHeaders(
        new Response(JSON.stringify({
          error: normalizeError.userMessage,
          errorType: normalizeError.type,
          correlationId: normalizeError.correlationId,
          retryable: normalizeError.retryable
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }),
        request
      );
    }

    // Step 1: Analizar página principal con reintentos
    const mainPageResult = await enhancedErrorHandler.handleAsync(
      () => analyzePage(url, true),
      {
        retries: 2,
        retryDelay: 2000,
        context: { url, isMainPage: true }
      }
    ).catch(error => {
      // Si falla después de reintentos, devolver error estructurado
      return {
        url,
        status: 'failed' as const,
        error: error.message || 'Error al analizar la página',
        errorType: 'analysis' as const
      };
    });
    
    if (mainPageResult.status === 'failed') {
      // Main page analysis failed - return standardized error response
      const statusCode = mainPageResult.errorType === 'timeout' ? 408 : 
                        mainPageResult.errorType === 'network' ? 502 : 
                        mainPageResult.errorType === 'url_format' ? 400 : 
                        mainPageResult.errorType === 'validation' ? 400 : 500;
      
      // If the result already has standardized error format, use it
      const errorResponse = 'errorCode' in mainPageResult && mainPageResult.errorCode ? mainPageResult : {
        error: mainPageResult.error || 'Error al analizar la página principal',
        errorType: mainPageResult.errorType || 'unknown',
        errorCode: 'MAIN_PAGE_ANALYSIS_FAILED',
        retryable: true,
        timestamp: new Date().toISOString(),
        url: url,
        httpStatus: (mainPageResult as any).httpStatus
      };
      
      return new Response(JSON.stringify(errorResponse), {
        status: statusCode,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Step 2: Get URLs to analyze from both sitemap AND discovered links (hybrid approach)
    const allResults: CompleteAnalysisResult[] = [mainPageResult];
    const urlsToAnalyzeSet = new Set<string>();
    
    // First, add URLs from sitemap (most reliable source)
    let sitemapUrlCount = 0;
    const sitemap = mainPageResult.technical?.sitemap as any;
    if (sitemap?.exists && sitemap?.urls) {
      console.log(`[analyze-unified] Found sitemap with ${sitemap.totalUrls} total URLs`);
      
      // Extract URLs from sitemap, excluding the main page
      sitemap.urls.forEach((entry: any) => {
        const sitemapUrl = entry.url;
        if (sitemapUrl !== url && sitemapUrl !== mainPageResult.url) {
          urlsToAnalyzeSet.add(sitemapUrl);
          sitemapUrlCount++;
        }
      });
      
      console.log(`[analyze-unified] Added ${sitemapUrlCount} URLs from sitemap`);
    } else {
      console.log(`[analyze-unified] No sitemap found`);
    }
    
    // Second, add discovered internal links (may find pages not in sitemap)
    let discoveredUrlCount = 0;
    const initialSetSize = urlsToAnalyzeSet.size;
    
    if (mainPageResult.links && mainPageResult.links.internalUrls && mainPageResult.links.internalUrls.length > 0) {
      mainPageResult.links.internalUrls.forEach(internalUrl => {
        if (!urlsToAnalyzeSet.has(internalUrl)) {
          urlsToAnalyzeSet.add(internalUrl);
          discoveredUrlCount++;
        }
      });
      
      const newDiscoveredUrls = urlsToAnalyzeSet.size - initialSetSize;
      console.log(`[analyze-unified] Found ${mainPageResult.links.internalUrls.length} internal links, ${newDiscoveredUrls} were new (not in sitemap)`);
    }
    
    // Convert set to array and apply limit
    const urlsToAnalyze = Array.from(urlsToAnalyzeSet).slice(0, CONFIG.MAX_INTERNAL_URLS);
    
    console.log(`[analyze-unified] Total unique URLs to analyze: ${urlsToAnalyze.length} (${sitemapUrlCount} from sitemap, ${discoveredUrlCount} discovered only)`);
    
    // Analyze only pages from blog if there are pages not in sitemap
    if (discoveredUrlCount > 0) {
      const nonSitemapUrls = urlsToAnalyze.slice(sitemapUrlCount, sitemapUrlCount + 5);
      if (nonSitemapUrls.length > 0) {
        console.log(`[analyze-unified] Sample URLs found but not in sitemap:`, nonSitemapUrls);
      }
    }
    
    // Analizar URLs con límite de concurrencia para optimizar rendimiento
    if (urlsToAnalyze.length > 0) {
      const BATCH_SIZE = 5; // Analizar de 5 en 5 para evitar sobrecarga
      const batches = [];
      
      for (let i = 0; i < urlsToAnalyze.length; i += BATCH_SIZE) {
        batches.push(urlsToAnalyze.slice(i, i + BATCH_SIZE));
      }
      
      for (const batch of batches) {
        const batchResults = await Promise.allSettled(
          batch.map(internalUrl => 
            enhancedErrorHandler.handleAsync(
              () => analyzePage(internalUrl, false),
              {
                retries: 1,
                retryDelay: 1000,
                context: { url: internalUrl, isInternalPage: true }
              }
            )
          )
        ).then(results => 
          results.map((result, index) => 
            result.status === 'fulfilled' ? result.value : {
              url: batch[index],
              error: 'Error en análisis interno',
              status: 'failed' as const,
              errorType: 'analysis' as const
            } as CompleteAnalysisResult
          )
        );
        
        allResults.push(...batchResults);
      }
    }

    // Step 3: Calculate overall statistics
    const successfulResults = allResults.filter(r => r.status === 'success');
    const failedCount = allResults.length - successfulResults.length;
    
    const avgSeoScore = successfulResults.length > 0 
      ? Math.round(successfulResults.reduce((acc, r) => acc + r.performance!.seoScore, 0) / successfulResults.length)
      : 0;

    const allIssues = successfulResults.flatMap(r => r.issues || []);
    const criticalIssues = allIssues.filter(issue => issue.type === 'error').length;
    const warningIssues = allIssues.filter(issue => issue.type === 'warning').length;
    const successIssues = allIssues.filter(issue => issue.type === 'success').length;

    // Build summary
    const summary: AnalysisSummary = {
      totalPages: allResults.length,
      successfulPages: successfulResults.length,
      failedPages: failedCount,
      avgSeoScore,
      criticalIssues,
      warningIssues,
      successIssues,
      cachedResults: 0 // No cache anymore
    };
    
    // Return unified response that works with both single page and multi-page UI
    const response: UnifiedAnalysisResponse = {
      // Single page compatibility (main page data)
      ...mainPageResult,
      
      // Multi-page data
      summary,
      pages: allResults,
      
      // Additional flags
      isMultiPage: allResults.length > 1
    };

    // Aplicar headers de seguridad a la respuesta exitosa
    return apiSecurity.applySecurityHeaders(
      new Response(JSON.stringify(response), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }),
      request
    );

  } catch (error) {
    // Manejo mejorado de errores con contexto enriquecido
    const enhancedError = enhancedErrorHandler.handle(error, {
      endpoint: 'analyze-unified',
      method: 'POST'
    });
    
    // Log para debugging en desarrollo
    if (CONFIG.IS_DEVELOPMENT) {
      console.error('[API Error]', {
        correlationId: enhancedError.correlationId,
        type: enhancedError.type,
        message: enhancedError.message,
        context: enhancedError.context
      });
    }
    
    return apiSecurity.applySecurityHeaders(
      new Response(JSON.stringify({
        error: enhancedError.userMessage,
        errorType: enhancedError.type,
        correlationId: enhancedError.correlationId,
        retryable: enhancedError.retryable,
        timestamp: enhancedError.timestamp
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }),
      request
    );
  }
};