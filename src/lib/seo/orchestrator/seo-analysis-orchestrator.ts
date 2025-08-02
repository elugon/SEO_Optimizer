import type { 
  AnalysisContext, 
  SEOAnalyzer, 
  HttpClient
} from '../interfaces/analyzers.js';
import type { FocusedAnalysisResult } from '../types/focused-analysis.js';
import type { CompleteAnalysisResult } from '../types/analysis.js';
import { 
  TitleAnalyzer,
  DescriptionAnalyzer,
  HeadingAnalyzer,
  TechnicalAnalyzer,
  ImageAnalyzerFocused,
  KeywordAnalyzerFocused,
  PerformanceAnalyzer,
  LinksAnalyzer,
  MobileAnalyzer,
  SecurityAnalyzer,
  EATAnalyzer
} from '../analyzers/focused/index.js';
import { fetchWithTimeout } from '../utils/fetch-utils.js';
import { SEO_THRESHOLDS } from '../constants/scoring.js';
import { CONFIG } from '../config/index.js';
import { createLogger, PerformanceLogger } from '../logging/index.js';
import { 
  createHttpError, 
  createErrorFromException, 
  validateUrlFormat,
  formatErrorResponse,
  errorHandler,
  ERROR_CODES,
  createSEOError
} from '../errors/index.js';

export interface AnalysisOptions {
  isMainPage?: boolean;
  timeoutMs?: number;
}

export class SEOAnalysisOrchestrator {
  private analyzers: Map<string, SEOAnalyzer> = new Map();
  private logger = createLogger('SEOOrchestrator');

  constructor(
    _httpClient?: HttpClient
  ) {
    
    // Register default analyzers
    this.registerAnalyzer('title', new TitleAnalyzer());
    this.registerAnalyzer('description', new DescriptionAnalyzer());
    this.registerAnalyzer('headings', new HeadingAnalyzer());
    this.registerAnalyzer('technical', new TechnicalAnalyzer());
    this.registerAnalyzer('images', new ImageAnalyzerFocused());
    this.registerAnalyzer('keywords', new KeywordAnalyzerFocused());
    this.registerAnalyzer('performance', new PerformanceAnalyzer());
    this.registerAnalyzer('links', new LinksAnalyzer());
    this.registerAnalyzer('mobile', new MobileAnalyzer());
    this.registerAnalyzer('security', new SecurityAnalyzer());
    this.registerAnalyzer('eat', new EATAnalyzer());
    
    this.logger.info('SEO Orchestrator initialized', { analyzerCount: this.analyzers.size });
  }

  private createErrorResult(url: string, errorResponse: any): CompleteAnalysisResult {
    return {
      ...errorResponse,
      url,
      status: 'failed',
      title: '',
      description: '',
      headings: { h1: [], h2: [], h3: [], h4: [], h5: [], h6: [] },
      images: { total: 0, withAlt: 0, withoutAlt: 0, optimized: 0, altTexts: [], missingAlt: [], unoptimized: [] },
      links: { internal: 0, external: 0, broken: 0, redirects: 0, brokenLinks: [], redirectChains: [], internalUrls: [] },
      technical: { hasSSL: false, hasRobots: false, hasCanonical: false, hasRobotsTxt: false, hasSitemap: false, hasSchema: false, httpStatus: 0, responseHeaders: {}, robotsTxt: null, sitemap: null },
      performance: { loadTime: 0, seoScore: 0, mobileScore: 0, pageSize: 0, resourceCount: 0, ttfb: 0, compression: { enabled: false, type: 'none', estimatedSavings: 0 } },
      keywords: { primary: [], secondary: [], density: 0, stuffing: false, tfIdf: [] },
      security: { score: 0, hasHTTPS: false, hasHSTS: false, hasCSP: false, hasXFrameOptions: false, hasXContentTypeOptions: false, hasReferrerPolicy: false, headers: {} },
      eat: { score: 0, hasAuthor: false, hasAbout: false, hasContact: false, hasPrivacy: false, authorInfo: null, aboutPage: null, contactInfo: null, certifications: [] },
      issues: []
    };
  }

  registerAnalyzer(name: string, analyzer: SEOAnalyzer): void {
    this.analyzers.set(name, analyzer);
  }

  unregisterAnalyzer(name: string): void {
    this.analyzers.delete(name);
  }

  async analyzeUrl(url: string, options: AnalysisOptions = {}): Promise<CompleteAnalysisResult> {
    const { isMainPage = false, timeoutMs = CONFIG.DEFAULT_TIMEOUT_MS } = options;
    
    // Validate timeout to prevent cascade failures
    const validatedTimeoutMs = Math.min(timeoutMs, CONFIG.ANALYSIS_TIMEOUT_MS - 1000);
    
    const perfLogger = new PerformanceLogger('SEOAnalysis', `analyze ${isMainPage ? 'main' : 'internal'} page`);

    try {
      this.logger.debug('Starting URL analysis', { url, isMainPage });
      
      // Validate URL format
      const urlError = validateUrlFormat(url);
      if (urlError) {
        errorHandler.handleError(urlError);
        return this.createErrorResult(url, formatErrorResponse(urlError));
      }

      // Perform the analysis
      const result = await this.performAnalysis(url, validatedTimeoutMs, isMainPage, perfLogger);
      return result;
    } catch (error) {
      const analysisError = createErrorFromException(error instanceof Error ? error : new Error(String(error)), url, 'SEO Analysis');
      this.logger.error('SEO Analysis failed completely', { 
        url, 
        error: analysisError.message, 
        stack: error instanceof Error ? error.stack : undefined 
      });
      errorHandler.handleError(analysisError);
      perfLogger.error('analyze page', error instanceof Error ? error : new Error(String(error)));
      
      return this.createErrorResult(url, formatErrorResponse(analysisError));
    }
  }

  private async performAnalysis(url: string, timeoutMs: number, isMainPage: boolean, perfLogger: PerformanceLogger): Promise<CompleteAnalysisResult> {
    // Fetch page content
    const startTime = Date.now();
    const response = await fetchWithTimeout(url, { 
      timeout: timeoutMs,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; SEO-Bot/1.0)' }
    });
    const loadTime = Date.now() - startTime;
      
      this.logger.debug('Page fetched', { url, loadTime, status: response.status });

      if (!response.ok) {
        const httpError = createHttpError(response.status, url);
        errorHandler.handleError(httpError);
        return this.createErrorResult(url, formatErrorResponse(httpError));
      }

      const html = await response.text();

      // Validate HTML content
      if (!html || html.trim().length === 0) {
        const emptyError = createSEOError(ERROR_CODES.EMPTY_RESPONSE, 'Empty server response', null, url);
        errorHandler.handleError(emptyError);
        return this.createErrorResult(url, formatErrorResponse(emptyError));
      }

      if (html.length > SEO_THRESHOLDS.PAGE_SIZE_LIMIT) {
        const sizeError = createSEOError(ERROR_CODES.PAGE_TOO_LARGE, 'Page too large to analyze', { size: html.length }, url);
        errorHandler.handleError(sizeError);
        return this.createErrorResult(url, formatErrorResponse(sizeError));
      }

      // Create analysis context
      const context: AnalysisContext = {
        url,
        html,
        response,
        loadTime,
        isMainPage
      };

      // Run all analyzers in parallel with proper cleanup
      this.logger.debug('Running analyzers', { analyzerCount: this.analyzers.size });
      const analysisPromises = Array.from(this.analyzers.entries()).map(
        async ([name, analyzer]) => {
          const analyzerLogger = new PerformanceLogger('Analyzer', `${name} analysis`);
          try {
            this.logger.debug(`Starting ${name} analyzer`, { url });
            const result = await analyzer.analyze(context);
            
            // Validate score is a valid number
            const validatedScore = this.validateScore(result.score);
            const validatedResult = { ...result, score: validatedScore };
            
            this.logger.debug(`Finished ${name} analyzer`, { url, score: validatedScore });
            analyzerLogger.finish(`${name} analysis`, { score: validatedScore });
            return { name, result: validatedResult };
          } catch (error) {
            const analysisError = createErrorFromException(error instanceof Error ? error : new Error(String(error)), url, `${name} analyzer`);
            this.logger.error(`${name} analyzer failed`, { url, error: analysisError.message });
            errorHandler.handleError(analysisError);
            
            // Ensure logger cleanup even on error
            try {
              analyzerLogger.error(`${name} analysis`, error instanceof Error ? error : new Error(String(error)));
            } catch (logError) {
              // Fallback if logger cleanup fails
              this.logger.warn('Failed to cleanup performance logger', { analyzer: name, logError });
            }
            
            return { 
              name, 
              result: { 
                score: 0, 
                issues: [{ 
                  type: 'error' as const, 
                  message: `Error en análisis de ${name}: ${analysisError.userMessage}`, 
                  priority: 'high' as const, 
                  category: 'technical' as const 
                }], 
                data: this.getDefaultAnalyzerData(name)
              } 
            };
          }
        }
      );

      const analysisResults = await Promise.all(analysisPromises);
      this.logger.debug('All analyzers completed');

      // Combine results into focused analysis result
      const focusedResult = this.combineAnalysisResults(analysisResults, context);

      // Convert to legacy format for backward compatibility
      const legacyResult = this.convertToLegacyFormat(focusedResult);

      perfLogger.finish('analyze page', { 
        seoScore: legacyResult.performance?.seoScore, 
        issueCount: legacyResult.issues?.length 
      });
      
      return legacyResult;
  }

  private combineAnalysisResults(
    results: Array<{ name: string; result: any }>,
    context: AnalysisContext
  ): FocusedAnalysisResult {
    const resultMap = new Map(results.map(r => [r.name, r.result]));
    
    // Log technical analysis results
    const technicalResult = resultMap.get('technical');
    if (technicalResult?.data?.hasCanonical !== undefined) {
      this.logger.debug('Canonical URL analysis', { 
        url: context.url,
        hasCanonical: technicalResult.data.hasCanonical 
      });
    }
    
    // Calculate overall score as weighted average with proper validation
    const weights = {
      title: 0.15,
      description: 0.11,
      headings: 0.11,
      technical: 0.11,
      keywords: 0.11,
      eat: 0.14,        // E-A-T is critical for 2025 SEO
      mobile: 0.10,     // Mobile-first indexing makes this crucial
      images: 0.07,
      security: 0.07,
      performance: 0.04,
      links: 0.02
    };

    let overallScore = 0;
    let totalWeight = 0;
    let validAnalyzers = 0;

    Object.entries(weights).forEach(([name, weight]) => {
      const result = resultMap.get(name);
      if (result && this.isValidScore(result.score)) {
        overallScore += result.score * weight;
        totalWeight += weight;
        validAnalyzers++;
      }
    });

    // Improved score calculation logic
    if (totalWeight > 0 && validAnalyzers > 0) {
      overallScore = Math.round((overallScore / totalWeight) * 100) / 100;
    } else if (validAnalyzers > 0) {
      // Fallback: calculate simple average if weight system fails
      const validScores = Array.from(resultMap.values())
        .filter(result => this.isValidScore(result.score))
        .map(result => result.score);
      overallScore = validScores.length > 0 
        ? Math.round((validScores.reduce((sum, score) => sum + score, 0) / validScores.length) * 100) / 100
        : 0;
    } else {
      overallScore = 0;
    }

    return {
      url: context.url,
      title: resultMap.get('title')?.data || { title: '', length: 0, hasEmojis: false, hasSpecialSymbols: false, score: 0, issues: [] },
      description: resultMap.get('description')?.data || { description: '', length: 0, hasEmojis: false, hasSpecialSymbols: false, score: 0, issues: [] },
      headings: resultMap.get('headings')?.data || { headings: { h1: [], h2: [], h3: [], h4: [], h5: [], h6: [] }, hierarchyScore: 0, hierarchyIssues: [], h1Count: 0, score: 0, issues: [] },
      images: resultMap.get('images')?.data || { 
        totalImages: 0, 
        imagesWithAlt: 0, 
        imagesWithoutAlt: 0, 
        altTextScore: 0, 
        optimization: {
          modernFormats: {
            webp: 0,
            avif: 0,
            jpeg: 0,
            png: 0,
            gif: 0,
            svg: 0,
            total: 0,
            modernPercentage: 0
          },
          compression: {
            score: 100,
            issues: []
          },
          criticalImages: {
            aboveTheFold: 0,
            belowTheFold: 0,
            criticalOptimized: 0,
            criticalScore: 100
          },
          optimization: {
            score: 100,
            issues: [],
            recommendations: []
          }
        }, 
        modernFormats: 0, 
        compression: false, 
        analysisScope: 'main-content',
        scopeNote: 'Análisis por defecto sin datos',
        score: 0, 
        issues: [] 
      },
      technical: resultMap.get('technical')?.data || { hasSSL: false, hasCanonical: false, hasRobotsMeta: false, hasSchema: false, httpStatus: 0, robotsTxt: null, sitemap: null, score: 0, issues: [] },
      keywords: resultMap.get('keywords')?.data || { topKeywords: [], totalWords: 0, uniqueWords: 0, keywordOptimization: 0, metaKeywords: '', analysis: {}, score: 0, issues: [] },
      performance: resultMap.get('performance')?.data || { loadTime: 0, pageSize: 0, resourceCount: 0, mobileScore: 0, score: 0, issues: [] },
      links: resultMap.get('links')?.data || { internal: 0, external: 0, broken: 0, redirects: 0, brokenLinks: [], redirectChains: [], internalUrls: [], score: 0, issues: [] },
      mobile: resultMap.get('mobile')?.data || { hasViewport: false, viewportContent: '', isResponsive: false, isTouchFriendly: false, hasAMP: false, mobileScore: 0, responsiveFramework: null, mobileFriendlyTest: 'poor', score: 0, issues: [] },
      security: resultMap.get('security')?.data || { hsts: { present: false }, csp: { present: false }, xFrameOptions: { present: false }, referrerPolicy: { present: false }, additionalHeaders: {}, score: 0, issues: [] },
      eat: resultMap.get('eat')?.data || { experience: { score: 0, authorInfo: { hasAuthor: false }, expertiseSignals: { hasExpertiseMarkers: false, certifications: [], qualifications: [], experience: [] } }, authoritativeness: { score: 0, contactInfo: { hasContactPage: false, contactMethods: [], businessInfo: false }, aboutInfo: { hasAboutPage: false, organizationInfo: false, missionStatement: false }, trustSignals: { testimonials: false, reviews: false, awards: false, certifications: false, socialProof: [] } }, trustworthiness: { score: 0, contentFreshness: { hasLastModified: false }, transparencySignals: { privacyPolicy: false, termsOfService: false, disclaimers: false, secureConnection: false }, credibilityMarkers: { sources: [], references: false, factChecking: false, corrections: false } }, overallScore: 0 },
      overallScore: Math.round(overallScore),
      status: 'success',
      cached: false
    };
  }

  private convertToLegacyFormat(focusedResult: FocusedAnalysisResult): CompleteAnalysisResult {
    // Collect ALL issues from all analyzers (including success items for complete reporting)
    const allIssues = [
      ...(focusedResult.title?.issues || []),
      ...(focusedResult.description?.issues || []),
      ...(focusedResult.headings?.issues || []),
      ...(focusedResult.images?.issues || []),
      ...(focusedResult.technical?.issues || []),
      ...(focusedResult.keywords?.issues || []),
      ...(focusedResult.performance?.issues || []),
      ...(focusedResult.links?.issues || []),
      ...(focusedResult.mobile?.issues || []),
      ...(focusedResult.security?.issues || []),
      ...(focusedResult.eat?.issues || [])
    ];

    try {
      return {
        url: focusedResult.url,
        title: focusedResult.title?.title || '',
        description: focusedResult.description?.description || '',
        headings: focusedResult.headings?.headings || { h1: [], h2: [], h3: [], h4: [], h5: [], h6: [] },
        images: {
          total: focusedResult.images?.totalImages || 0,
          withAlt: focusedResult.images?.imagesWithAlt || 0,
          withoutAlt: focusedResult.images?.imagesWithoutAlt || 0,
          optimization: focusedResult.images?.optimization || {},
          modernFormats: focusedResult.images?.modernFormats || {},
          compression: focusedResult.images?.compression || {},
          analysisScope: 'main-content',
          scopeNote: 'Imágenes analizadas del contenido principal (excluyendo header/footer)'
        },
      links: {
        internal: focusedResult.links?.internal || 0,
        external: focusedResult.links?.external || 0,
        broken: focusedResult.links?.broken || 0,
        redirects: focusedResult.links?.redirects || 0,
        brokenLinks: focusedResult.links?.brokenLinks || [],
        redirectChains: focusedResult.links?.redirectChains || [],
        internalUrls: focusedResult.links?.internalUrls || []
      },
        technical: {
          hasSSL: focusedResult.technical?.hasSSL || false,
          hasRobots: focusedResult.technical?.hasRobotsMeta || false,
          hasCanonical: focusedResult.technical?.hasCanonical || false,
          hasRobotsTxt: focusedResult.technical?.hasRobotsTxt || false,
          hasSitemap: focusedResult.technical?.hasSitemap || false,
          hasSchema: focusedResult.technical?.hasSchema || false,
          httpStatus: focusedResult.technical?.httpStatus || 0,
          responseHeaders: {},
          robotsTxt: focusedResult.technical?.robotsTxt || null,
          sitemap: focusedResult.technical?.sitemap || null,
          metaTagsCount: focusedResult.technical?.metaTagsCount || undefined
        },
        performance: {
          loadTime: focusedResult.performance?.loadTime || 0,
          seoScore: focusedResult.overallScore || 0,
          mobileScore: focusedResult.performance?.mobileScore || 0,
          pageSize: focusedResult.performance?.pageSize || 0,
          resourceCount: focusedResult.performance?.resourceCount || 0,
          ttfb: focusedResult.performance?.ttfb || 0,
          compression: focusedResult.performance?.compression || { enabled: false, type: 'none', estimatedSavings: 0 }
        },
        keywords: {
          topKeywords: focusedResult.keywords?.topKeywords || [],
          totalWords: focusedResult.keywords?.totalWords || 0,
          uniqueWords: focusedResult.keywords?.uniqueWords || 0,
          keywordOptimization: focusedResult.keywords?.keywordOptimization || 0,
          metaKeywords: focusedResult.keywords?.metaKeywords || '',
          analysis: focusedResult.keywords?.analysis || {}
        },
        mobile: {
          hasViewport: focusedResult.mobile?.hasViewport || false,
          viewportContent: focusedResult.mobile?.viewportContent || '',
          isResponsive: focusedResult.mobile?.isResponsive || false,
          isTouchFriendly: focusedResult.mobile?.isTouchFriendly || false,
          mobileScore: focusedResult.mobile?.mobileScore || 0,
          responsiveFramework: focusedResult.mobile?.responsiveFramework || null,
          mobileFriendlyTest: focusedResult.mobile?.mobileFriendlyTest || 'poor'
        },
        security: {
          hsts: focusedResult.security?.hsts || { present: false },
          csp: focusedResult.security?.csp || { present: false },
          xFrameOptions: focusedResult.security?.xFrameOptions || { present: false },
          referrerPolicy: focusedResult.security?.referrerPolicy || { present: false },
          additionalHeaders: focusedResult.security?.additionalHeaders || {}
        },
        eat: {
          experience: focusedResult.eat?.experience || { 
            score: 0,
            authorInfo: { hasAuthor: false },
            expertiseSignals: { hasExpertiseMarkers: false, certifications: [], qualifications: [], experience: [] }
          },
          authoritativeness: focusedResult.eat?.authoritativeness || { 
            score: 0,
            contactInfo: { hasContactPage: false, contactMethods: [], businessInfo: false },
            aboutInfo: { hasAboutPage: false, organizationInfo: false, missionStatement: false },
            trustSignals: { testimonials: false, reviews: false, awards: false, certifications: false, socialProof: [] }
          },
          trustworthiness: focusedResult.eat?.trustworthiness || { 
            score: 0,
            contentFreshness: { hasLastModified: false },
            transparencySignals: { privacyPolicy: false, termsOfService: false, disclaimers: false, secureConnection: false },
            credibilityMarkers: { sources: [], references: false, factChecking: false, corrections: false }
          },
          overallScore: focusedResult.eat?.overallScore || 0
        },
        issues: allIssues,
        status: 'success',
        cached: false
      };
    } catch (error) {
      this.logger.error('Error during legacy format conversion', { error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  }

  /**
   * Validates and normalizes a score value
   */
  private validateScore(score: any): number {
    if (typeof score !== 'number' || isNaN(score) || !isFinite(score)) {
      return 0;
    }
    return Math.max(0, Math.min(100, score));
  }

  /**
   * Checks if a score is valid for calculations
   */
  private isValidScore(score: any): boolean {
    return typeof score === 'number' && !isNaN(score) && isFinite(score);
  }


  /**
   * Gets default data structure for failed analyzer
   */
  private getDefaultAnalyzerData(analyzerName: string): any {
    const defaults: Record<string, any> = {
      title: { title: '', length: 0, hasEmojis: false, hasSpecialSymbols: false, score: 0, issues: [] },
      description: { description: '', length: 0, hasEmojis: false, hasSpecialSymbols: false, score: 0, issues: [] },
      headings: { headings: { h1: [], h2: [], h3: [], h4: [], h5: [], h6: [] }, hierarchyScore: 0, hierarchyIssues: [], h1Count: 0, score: 0, issues: [] },
      images: { 
        totalImages: 0, 
        imagesWithAlt: 0, 
        imagesWithoutAlt: 0, 
        altTextScore: 0, 
        optimization: {
          modernFormats: {
            webp: 0,
            avif: 0,
            jpeg: 0,
            png: 0,
            gif: 0,
            svg: 0,
            total: 0,
            modernPercentage: 0
          },
          compression: {
            score: 100,
            issues: []
          },
          criticalImages: {
            aboveTheFold: 0,
            belowTheFold: 0,
            criticalOptimized: 0,
            criticalScore: 100
          },
          optimization: {
            score: 100,
            issues: [],
            recommendations: []
          }
        }, 
        modernFormats: 0, 
        compression: false, 
        analysisScope: 'main-content',
        scopeNote: 'Análisis por defecto sin datos',
        score: 0, 
        issues: [] 
      },
      technical: { hasSSL: false, hasCanonical: false, hasRobotsMeta: false, hasSchema: false, httpStatus: 0, robotsTxt: null, sitemap: null, score: 0, issues: [] },
      keywords: { topKeywords: [], totalWords: 0, uniqueWords: 0, keywordOptimization: 0, metaKeywords: '', analysis: {}, score: 0, issues: [] },
      performance: { loadTime: 0, pageSize: 0, resourceCount: 0, mobileScore: 0, score: 0, issues: [] },
      links: { internal: 0, external: 0, broken: 0, redirects: 0, brokenLinks: [], redirectChains: [], internalUrls: [], score: 0, issues: [] },
      mobile: { hasViewport: false, viewportContent: '', isResponsive: false, isTouchFriendly: false, hasAMP: false, mobileScore: 0, responsiveFramework: null, mobileFriendlyTest: 'poor', score: 0, issues: [] },
      security: { hsts: { present: false }, csp: { present: false }, xFrameOptions: { present: false }, referrerPolicy: { present: false }, additionalHeaders: {}, score: 0, issues: [] },
      eat: { experience: { score: 0, authorInfo: { hasAuthor: false }, expertiseSignals: { hasExpertiseMarkers: false, certifications: [], qualifications: [], experience: [] } }, authoritativeness: { score: 0, contactInfo: { hasContactPage: false, contactMethods: [], businessInfo: false }, aboutInfo: { hasAboutPage: false, organizationInfo: false, missionStatement: false }, trustSignals: { testimonials: false, reviews: false, awards: false, certifications: false, socialProof: [] } }, trustworthiness: { score: 0, contentFreshness: { hasLastModified: false }, transparencySignals: { privacyPolicy: false, termsOfService: false, disclaimers: false, secureConnection: false }, credibilityMarkers: { sources: [], references: false, factChecking: false, corrections: false } }, overallScore: 0 }
    };
    
    return defaults[analyzerName] || null;
  }

}