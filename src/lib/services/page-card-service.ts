/**
 * Service for handling page card generation and management
 * Extracted from PageCards.astro for better separation of concerns
 */

import { createLogger } from '../seo/logging/index.js';
import type { 
  CompleteAnalysisResult, 
  UnifiedAnalysisResponse, 
  Issue, 
  AnalysisResult,
  Technical,
  Performance,
  Mobile,
  Links,
  Headings,
  Security
} from '../seo/types/index.js';

const logger = createLogger('PageCardService');

// Extend the existing types for card display, keeping only what's needed
export interface PageCardData {
  // Core fields
  url: string;
  status: 'success' | 'failed';
  seoScore?: number;
  title?: string;
  description?: string;
  issues?: Issue[];
  cached?: boolean;
  error?: string;
  
  // Reuse existing types from the analysis system
  technical?: Partial<Technical>;
  performance?: Partial<Performance>;
  mobile?: Partial<Mobile>;
  links?: Partial<Links>;
  headings?: Partial<Headings> & {
    h1Count?: number;
    h2Count?: number;
    h3Count?: number;
    h4Count?: number;
    h5Count?: number;
    h6Count?: number;
  };
  
  // Simplified versions for card display
  content?: {
    titleLength: number;
    descriptionLength: number;
    totalWords?: number;
    keywordDensity?: number;
    readabilityScore?: number;
  };

  // Keywords data
  keywords?: {
    metaKeywords: string;
    topKeywords: Array<{
      word: string;
      count: number;
      density: string;
    }>;
  };
  
  images?: {
    total: number;
    missingAlt: number;
    missingTitle?: number;
    withWebP?: number;
    withLazyLoading?: number;
    modernFormats?: {
      webp: number;
      avif: number;
      jpeg: number;
      png: number;
      gif: number;
      svg: number;
      total: number;
      modernPercentage: number;
      hasModernFormats: boolean;
      primaryModernFormat?: 'webp' | 'avif' | null;
    };
  };
  
  security?: {
    score?: number;
    headers?: {
      hsts?: { present: boolean };
      csp?: { present: boolean };
      xFrameOptions?: { present: boolean };
      xContentTypeOptions?: { present: boolean };
    };
  };
  
  eat?: {
    experience: number;
    authority: number;
    trust: number;
    totalScore?: number;
  };
}

export interface SummaryStats {
  totalPages: number;
  avgScore: number;
  totalIssues: number;
}

export class PageCardService {
  private readonly CARDS_PER_PAGE = 8;

  /**
   * Type guard to check if result is a CompleteAnalysisResult
   */
  private isCompleteAnalysisResult(result: AnalysisResult): result is CompleteAnalysisResult {
    return 'title' in result && 'performance' in result && 'technical' in result;
  }

  /**
   * Extract page data for card display with improved type safety
   */
  extractPageData(analysisResult: CompleteAnalysisResult | AnalysisResult): PageCardData {
    logger.debug('Extracting page data', { url: analysisResult.url });
    
    const baseData: PageCardData = {
      url: analysisResult.url,
      status: analysisResult.status,
      cached: analysisResult.cached ?? false
    };

    if (analysisResult.status !== 'success') {
      return {
        ...baseData,
        error: analysisResult.error || 'Error desconocido'
      };
    }

    // Handle incomplete analysis
    if (!this.isCompleteAnalysisResult(analysisResult)) {
      return {
        ...baseData,
        seoScore: 0,
        title: 'Sin título',
        description: 'Sin descripción',
        issues: []
      };
    }

    // Extract data from complete analysis
    const { 
      title = 'Sin título',
      description = 'Sin descripción',
      performance,
      technical,
      mobile,
      links,
      headings,
      images,
      keywords,
      security,
      eat,
      issues = []
    } = analysisResult;

    return {
      ...baseData,
      seoScore: performance?.seoScore ?? 0,
      title,
      description,
      issues,
      
      // Use spread operator to copy only existing properties
      technical: technical ? { ...technical } : undefined,
      performance: performance ? { ...performance } : undefined,
      mobile: mobile ? { ...mobile } : undefined,
      links: links ? { ...links } : undefined,
      
      // Enhance headings with counts
      headings: headings ? {
        ...headings,
        h1Count: headings.h1?.length ?? 0,
        h2Count: headings.h2?.length ?? 0,
        h3Count: headings.h3?.length ?? 0,
        h4Count: headings.h4?.length ?? 0,
        h5Count: headings.h5?.length ?? 0,
        h6Count: headings.h6?.length ?? 0
      } : undefined,
      
      // Transform content data from keywords
      content: keywords ? {
        titleLength: title.length,
        descriptionLength: description.length,
        totalWords: keywords.totalWords,
        keywordDensity: keywords.keywordOptimization,
        readabilityScore: keywords.analysis?.qualityMetrics?.positioningScore
      } : undefined,

      // Extract keywords data including meta keywords
      keywords: keywords ? {
        metaKeywords: keywords.metaKeywords || '',
        topKeywords: keywords.topKeywords || []
      } : undefined,
      
      // Transform images data
      images: images ? {
        total: images.total,
        missingAlt: images.withoutAlt ?? 0,
        missingTitle: (images.optimization as any)?.missingTitle ?? 0,
        withWebP: images.modernFormats?.webp ?? 0,
        modernFormats: images.modernFormats ? {
          webp: images.modernFormats.webp || 0,
          avif: images.modernFormats.avif || 0,
          jpeg: images.modernFormats.jpeg || 0,
          png: images.modernFormats.png || 0,
          gif: images.modernFormats.gif || 0,
          svg: images.modernFormats.svg || 0,
          total: images.modernFormats.total || 0,
          modernPercentage: images.modernFormats.modernPercentage || 0,
          hasModernFormats: (images.modernFormats.webp || 0) + (images.modernFormats.avif || 0) > 0,
          primaryModernFormat: (images.modernFormats.avif || 0) > 0 ? 'avif' : 
                              (images.modernFormats.webp || 0) > 0 ? 'webp' : null
        } : undefined
      } : undefined,
      
      // Extract security headers
      security: security ? {
        score: this.calculateSecurityScore(security),
        headers: {
          hsts: { present: security.hsts?.present ?? false },
          csp: { present: security.csp?.present ?? false },
          xFrameOptions: { present: security.xFrameOptions?.present ?? false },
          xContentTypeOptions: { present: security.additionalHeaders?.xContentTypeOptions ?? false }
        }
      } : undefined,
      
      // Extract E-A-T scores
      eat: eat ? {
        experience: eat.experience?.score ?? 0,
        authority: eat.authoritativeness?.score ?? 0,
        trust: eat.trustworthiness?.score ?? 0,
        totalScore: eat.overallScore ?? 0
      } : undefined
    };
  }

  /**
   * Calculate security score based on headers present
   */
  private calculateSecurityScore(security: Security): number {
    let score = 0;
    const weights = {
      hsts: 25,
      csp: 25,
      xFrameOptions: 20,
      referrerPolicy: 15,
      xContentTypeOptions: 15
    };

    if (security.hsts?.present) score += weights.hsts;
    if (security.csp?.present) score += weights.csp;
    if (security.xFrameOptions?.present) score += weights.xFrameOptions;
    if (security.referrerPolicy?.present) score += weights.referrerPolicy;
    if (security.additionalHeaders?.xContentTypeOptions) score += weights.xContentTypeOptions;

    return Math.round(score);
  }

  /**
   * Calculate summary statistics from analysis data
   */
  calculateSummaryStats(data: UnifiedAnalysisResponse): SummaryStats {
    logger.debug('Calculating summary stats', { totalPages: data.pages?.length });

    const successfulPages = data.pages?.filter(p => p.status === 'success') || [];
    const avgScore = successfulPages.length > 0
      ? Math.round(successfulPages.reduce((acc, p) => {
          const isComplete = 'performance' in p;
          return acc + (isComplete ? (p as CompleteAnalysisResult).performance?.seoScore || 0 : 0);
        }, 0) / successfulPages.length)
      : 0;

    const totalIssues = successfulPages.reduce((acc, p) => {
      const isComplete = 'issues' in p;
      if (isComplete) {
        const issues = (p as CompleteAnalysisResult).issues || [];
        // Only count errors and warnings as problems, not successes
        const problemCount = issues.filter(issue => issue.type === 'error' || issue.type === 'warning').length;
        return acc + problemCount;
      }
      return acc;
    }, 0);

    return {
      totalPages: data.pages?.length || 0,
      avgScore,
      totalIssues
    };
  }

  private pageDataStorage = new Map<string, PageCardData>();

  /**
   * Sanitize HTML to prevent XSS attacks
   */
  private sanitizeHTML(str: string | undefined | null): string {
    if (!str) return '';
    
    const entityMap: { [key: string]: string } = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
      '/': '&#x2F;',
      '`': '&#x60;',
      '=': '&#x3D;'
    };
    return String(str).replace(/[&<>"'`=\/]/g, (s) => entityMap[s]);
  }

  /**
   * Format load time for display
   */
  private formatLoadTime(loadTimeMs: number | undefined): string {
    if (loadTimeMs === undefined || loadTimeMs === null) return 'N/A';
    
    // If load time is less than 1ms, show "< 1ms"
    if (loadTimeMs < 1) return '< 1ms';
    
    // If less than 1000ms, show in milliseconds
    if (loadTimeMs < 1000) return `${Math.round(loadTimeMs)}ms`;
    
    // Otherwise show in seconds with 1 decimal place
    return `${(loadTimeMs / 1000).toFixed(1)}s`;
  }



  /**
   * Retrieve stored page data by card ID
   */
  getPageData(cardId: string): PageCardData | undefined {
    return this.pageDataStorage.get(cardId);
  }

  /**
   * Generate HTML for a single page card with detailed inline checks
   */
  generatePageCardHTML(pageData: PageCardData): string {
    if (pageData.status === 'failed') {
      return this.generateErrorCardHTML(pageData);
    }

    const scoreColor = this.getScoreColor(pageData.seoScore || 0);
    const displayUrl = this.truncateUrl(pageData.url);

    return `
      <div class="page-card group relative bg-gradient-to-br from-white to-gray-50 dark:from-gray-900 dark:to-gray-800 border border-gray-200/50 dark:border-gray-700/50 rounded-xl shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden">
        <!-- Background decoration -->
        <div class="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/5 dark:from-blue-500/10 dark:to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
        
        <!-- Content -->
        <div class="relative h-full flex flex-col">
          <!-- Header Section -->
          <div class="p-4">
            <!-- Score and Cached Badge Row -->
            <div class="flex items-center justify-between mb-3">
              <!-- Score circle -->
              <div class="relative flex-shrink-0">
                <div class="w-12 h-12 ${scoreColor} rounded-full flex items-center justify-center shadow-lg">
                  <span class="text-white font-bold text-lg">${pageData.seoScore}</span>
                </div>
              </div>
              
              <!-- Cached badge -->
              ${pageData.cached ? `
                <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gradient-to-r from-blue-500/10 to-cyan-500/10 text-blue-700 dark:text-blue-300 border border-blue-200/50 dark:border-blue-700/50">
                  <svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                  </svg>
                  Cached
                </span>
              ` : ''}
            </div>
            
            <!-- Title -->
            <h3 class="font-bold text-gray-900 dark:text-gray-100 text-sm mb-2 leading-tight" title="${this.sanitizeHTML(pageData.title)}">
              ${this.sanitizeHTML(pageData.title)}
            </h3>
            
            <!-- URL -->
            <p class="text-xs text-gray-500 dark:text-gray-400 mb-2 flex items-center" title="${this.sanitizeHTML(pageData.url)}">
              <svg class="w-3 h-3 mr-1 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"/>
              </svg>
              <span class="break-all">${displayUrl}</span>
            </p>
            
            <!-- Description -->
            <p class="text-xs text-gray-600 dark:text-gray-300 mb-3 leading-relaxed" title="${this.sanitizeHTML(pageData.description)}">
              ${this.sanitizeHTML(pageData.description)}
            </p>
            
            <!-- Detailed Analysis Grid -->
            <div class="flex-1">
              ${this.generateDetailedAnalysisGrid(pageData)}
            </div>
          </div>
          
          <!-- Action Buttons -->
          <div class="px-4 pb-4">
            ${this.generateActionButtons(pageData)}
          </div>
        </div>
        
        <!-- Hover effect border -->
        <div class="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-blue-500 to-purple-500 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300"></div>
      </div>
    `;
  }

  /**
   * Generate action buttons for page cards
   */
  private generateActionButtons(pageData: PageCardData): string {
    if (!pageData.issues || pageData.issues.length === 0) {
      return '';
    }

    const criticalIssues = pageData.issues.filter(issue => issue.type === 'error');
    const warnings = pageData.issues.filter(issue => issue.type === 'warning');
    
    const buttons = [];
    
    // Critical issues button
    if (criticalIssues.length > 0) {
      buttons.push(`
        <button 
          class="critical-issues-btn flex-1 bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-200 flex items-center justify-center"
          data-url="${this.sanitizeHTML(pageData.url)}"
          data-type="critical"
          title="Ver detalles de ${criticalIssues.length} problema${criticalIssues.length > 1 ? 's' : ''} crítico${criticalIssues.length > 1 ? 's' : ''}"
        >
          <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
          ${criticalIssues.length} Problema${criticalIssues.length > 1 ? 's' : ''} Crítico${criticalIssues.length > 1 ? 's' : ''}
        </button>
      `);
    }
    
    // Improvement opportunities button  
    if (warnings.length > 0) {
      buttons.push(`
        <button 
          class="improvement-opportunities-btn flex-1 bg-yellow-50 hover:bg-yellow-100 dark:bg-yellow-900/20 dark:hover:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-800 text-yellow-700 dark:text-yellow-300 rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-200 flex items-center justify-center"
          data-url="${this.sanitizeHTML(pageData.url)}"
          data-type="opportunities"
          title="Ver detalles de ${warnings.length} oportunidad${warnings.length > 1 ? 'es' : ''} de mejora"
        >
          <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 16.5c-.77.833.192 2.5 1.732 2.5z"/>
          </svg>
          ${warnings.length} Oportunidad${warnings.length > 1 ? 'es' : ''} de Mejora
        </button>
      `);
    }
    
    if (buttons.length === 0) {
      return '';
    }
    
    return `
      <div class="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
        <div class="flex gap-2">
          ${buttons.join('')}
        </div>
      </div>
    `;
  }

  /**
   * Generate HTML for error card
   */
  private generateErrorCardHTML(pageData: PageCardData): string {
    const displayUrl = this.truncateUrl(pageData.url);
    
    return `
      <div class="group relative bg-gradient-to-br from-red-50 to-pink-50 dark:from-red-900/20 dark:to-pink-900/20 border border-red-200/50 dark:border-red-700/50 rounded-xl shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden">
        <!-- Background pattern -->
        <div class="absolute inset-0 opacity-5">
          <div class="absolute inset-0" style="background-image: repeating-linear-gradient(45deg, transparent, transparent 35px, rgba(255,0,0,0.1) 35px, rgba(255,0,0,0.1) 70px)"></div>
        </div>
        
        <!-- Content -->
        <div class="relative p-6">
          <div class="text-center">
            <!-- Error icon with pulse animation -->
            <div class="relative inline-block mb-4">
              <div class="absolute inset-0 bg-red-500 rounded-full blur-xl opacity-30 animate-pulse"></div>
              <div class="relative w-16 h-16 bg-gradient-to-br from-red-500 to-pink-500 rounded-full flex items-center justify-center shadow-lg">
                <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 16.5c-.77.833.192 3 1.732 3z"/>
                </svg>
              </div>
            </div>
            
            <h3 class="font-bold text-gray-900 dark:text-gray-100 text-lg mb-2">Error en el Análisis</h3>
            <p class="text-sm text-gray-600 dark:text-gray-400 mb-3 truncate flex items-center justify-center" title="${pageData.url}">
              <svg class="w-3 h-3 mr-1 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"/>
              </svg>
              ${displayUrl}
            </p>
            <p class="text-sm text-red-600 dark:text-red-400 font-medium">${pageData.error}</p>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Sort pages by SEO score
   */
  sortPages(pages: PageCardData[], ascending: boolean = false): PageCardData[] {
    logger.debug('Sorting pages', { count: pages.length, ascending });

    return [...pages].sort((a, b) => {
      const scoreA = a.seoScore || 0;
      const scoreB = b.seoScore || 0;
      return ascending ? scoreA - scoreB : scoreB - scoreA;
    });
  }

  /**
   * Paginate pages for display
   */
  paginatePages(pages: PageCardData[], currentPage: number = 1): {
    pages: PageCardData[];
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  } {
    const totalPages = Math.ceil(pages.length / this.CARDS_PER_PAGE);
    const startIndex = (currentPage - 1) * this.CARDS_PER_PAGE;
    const endIndex = startIndex + this.CARDS_PER_PAGE;
    const paginatedPages = pages.slice(startIndex, endIndex);

    logger.debug('Paginating pages', {
      total: pages.length,
      currentPage,
      totalPages,
      showing: paginatedPages.length
    });

    return {
      pages: paginatedPages,
      totalPages,
      hasNext: currentPage < totalPages,
      hasPrev: currentPage > 1
    };
  }

  /**
   * Generate markdown report for download
   */
  generateMarkdownReport(data: UnifiedAnalysisResponse): string {
    logger.info('Generating markdown report', { pageCount: data.pages?.length });

    const stats = this.calculateSummaryStats(data);
    const timestamp = new Date().toISOString();

    let report = `# SEO Analysis Report\n\n`;
    report += `**Generated:** ${timestamp}\n`;
    report += `**Total Pages:** ${stats.totalPages}\n`;
    report += `**Average SEO Score:** ${stats.avgScore}/100\n`;
    report += `**Total Issues:** ${stats.totalIssues}\n\n`;

    report += `## Summary\n\n`;
    if (data.summary) {
      report += `- **Successful Pages:** ${data.summary.successfulPages}\n`;
      report += `- **Failed Pages:** ${data.summary.failedPages}\n`;
      report += `- **Critical Issues:** ${data.summary.criticalIssues}\n`;
      report += `- **Warning Issues:** ${data.summary.warningIssues}\n`;
      report += `- **Success Issues:** ${data.summary.successIssues}\n`;
      report += `- **Cached Results:** ${data.summary.cachedResults}\n`;
    }

    report += `\n## Page Details\n\n`;

    const successfulPages = data.pages?.filter(p => p.status === 'success') || [];
    const failedPages = data.pages?.filter(p => p.status === 'failed') || [];

    // Sort by score descending
    const sortedPages = this.sortPages(
      successfulPages.map(p => this.extractPageData(p))
    );

    for (const page of sortedPages) {
      report += `### ${page.title}\n\n`;
      report += `- **URL:** ${page.url}\n`;
      report += `- **SEO Score:** ${page.seoScore}/100\n`;
      // Only count errors and warnings as issues, not successes
      const problemCount = page.issues?.filter(i => i.type === 'error' || i.type === 'warning').length || 0;
      report += `- **Issues:** ${problemCount}\n`;
      
      // Only show errors and warnings, not successes
      const problemIssues = page.issues?.filter(i => i.type === 'error' || i.type === 'warning') || [];
      if (problemIssues.length > 0) {
        report += `\n#### Problemas Detectados:\n\n`;
        for (const issue of problemIssues) {
          const emoji = issue.type === 'error' ? '❌' : '⚠️';
          report += `${emoji} **${issue.priority.toUpperCase()}** (${issue.category}): ${issue.message}\n\n`;
        }
      }
      
      report += `\n---\n\n`;
    }

    if (failedPages.length > 0) {
      report += `## Failed Pages\n\n`;
      for (const page of failedPages) {
        report += `- **${page.url}**: ${page.error}\n`;
      }
    }

    return report;
  }















  /**
   * Get impact description for issues in reports
   */
  private getImpactDescription(category: string, priority: string): string {
    const impactMap: Record<string, Record<string, string>> = {
      technical: {
        high: 'Puede afectar significativamente la indexación y el crawling',
        medium: 'Impacto moderado en SEO técnico',
        low: 'Mejora recomendada para optimización técnica'
      },
      content: {
        high: 'Afecta directamente la relevancia y posicionamiento',
        medium: 'Puede limitar el potencial de ranking',
        low: 'Oportunidad de mejora en calidad del contenido'
      },
      performance: {
        high: 'Impacta Core Web Vitals y experiencia del usuario',
        medium: 'Puede afectar la velocidad de carga',
        low: 'Optimización recomendada para mejor rendimiento'
      },
      mobile: {
        high: 'Crítico para mobile-first indexing',
        medium: 'Puede afectar la experiencia móvil',
        low: 'Mejora recomendada para dispositivos móviles'
      },
      security: {
        high: 'Riesgo de seguridad que puede afectar la confianza',
        medium: 'Mejora de seguridad recomendada',
        low: 'Práctica de seguridad adicional'
      }
    };

    return impactMap[category]?.[priority] || 'Requiere revisión para optimización SEO';
  }

  /**
   * Generate individual page report for download
   */
  generatePageReport(pageData: PageCardData): string {
    logger.info('Generating individual page report', { url: pageData.url });

    const timestamp = new Date().toISOString();
    const issuesByType = this.groupIssuesByType(pageData.issues || []);

    let report = `# SEO Análisis Detallado\n\n`;
    report += `**Página:** ${pageData.title}\n`;
    report += `**URL:** ${pageData.url}\n`;
    report += `**Puntuación SEO:** ${pageData.seoScore}/100\n`;
    report += `**Generado:** ${timestamp}\n\n`;

    // Summary
    report += `## Resumen\n\n`;
    report += `- **Estado:** ${pageData.status === 'success' ? '✓ Exitoso' : '✗ Error'}\n`;
    if (pageData.cached) {
      report += `- **Resultado en caché:** Sí\n`;
    }
    const problemCount = pageData.issues?.filter(i => i.type === 'error' || i.type === 'warning').length || 0;
    report += `- **Problemas encontrados:** ${problemCount}\n`;
    report += `  - Críticos: ${issuesByType.error}\n`;
    report += `  - Advertencias: ${issuesByType.warning}\n`;
    report += `  - Optimizados: ${issuesByType.success}\n\n`;

    // Technical Analysis
    if (pageData.technical) {
      report += `## Análisis Técnico\n\n`;
      report += `- **HTTPS:** ${pageData.technical.hasSSL ? '✓ Habilitado' : '✗ No habilitado'}\n`;
      report += `- **Canonical:** ${pageData.technical.hasCanonical ? '✓ Configurado' : '✗ No encontrado'}\n`;
      report += `- **Schema Markup:** ${pageData.technical.hasSchema ? '✓ Presente' : '✗ No encontrado'}\n`;
      report += `- **Robots.txt:** ${pageData.technical.hasRobotsTxt ? '✓ Encontrado' : '✗ No encontrado'}\n`;
      report += `- **Sitemap:** ${pageData.technical.hasSitemap ? '✓ Detectado' : '✗ No detectado'}\n`;
      report += `- **Meta Tags:** ${pageData.technical.metaTagsCount || 0} etiquetas\n\n`;
    }

    // Performance Analysis
    if (pageData.performance) {
      report += `## Análisis de Rendimiento\n\n`;
      report += `- **Tiempo de carga:** ${this.formatLoadTime(pageData.performance.loadTime)}\n`;
      report += `- **Tamaño de página:** ${pageData.performance.pageSize ? `${(pageData.performance.pageSize / 1024).toFixed(0)}KB` : 'No disponible'}\n`;
      
      if (pageData.performance.ttfb) {
        report += `- **Time to First Byte:** ${pageData.performance.ttfb}ms\n`;
      }
      
      if (pageData.performance.compression) {
        const comp = pageData.performance.compression;
        if (comp.enabled) {
          const savings = comp.estimatedSavings && comp.estimatedSavings > 0 ? ` (ahorro: ${comp.estimatedSavings}%)` : '';
          report += `- **Compresión:** ✓ ${comp.type.toUpperCase()}${savings}\n`;
        } else {
          report += `- **Compresión:** ✗ No habilitada\n`;
        }
      }
      
      report += `- **Puntuación móvil:** ${pageData.performance.mobileScore || 'No disponible'}/100\n`;
      report += `\n`;
    }

    // Content Analysis
    if (pageData.content) {
      report += `## Análisis de Contenido\n\n`;
      report += `- **Título:** ${pageData.content.titleLength || 0} caracteres\n`;
      report += `- **Descripción:** ${pageData.content.descriptionLength || 0} caracteres\n`;
      report += `- **Palabras totales:** ${pageData.content.totalWords || 0}\n`;
      if (pageData.content.keywordDensity) {
        report += `- **Densidad de palabras clave:** ${pageData.content.keywordDensity}%\n`;
      }
      if (pageData.content.readabilityScore) {
        report += `- **Puntuación de legibilidad:** ${pageData.content.readabilityScore}/100\n`;
      }
      report += `\n`;

      // Headings structure
      if (pageData.headings) {
        report += `### Estructura de Encabezados\n\n`;
        report += `- **H1:** ${pageData.headings.h1Count || 0}\n`;
        report += `- **H2:** ${pageData.headings.h2Count || 0}\n`;
        report += `- **H3:** ${pageData.headings.h3Count || 0}\n`;
        report += `- **H4-H6:** ${(pageData.headings.h4Count || 0) + (pageData.headings.h5Count || 0) + (pageData.headings.h6Count || 0)}\n\n`;
      }
    }

    // Mobile Analysis
    if (pageData.mobile) {
      report += `## Optimización Móvil\n\n`;
      report += `- **Puntuación móvil:** ${pageData.mobile.mobileScore || 'No disponible'}/100\n`;
      report += `- **Viewport configurado:** ${pageData.mobile.hasViewport ? '✓ Sí' : '✗ No'}\n`;
      report += `- **Diseño responsive:** ${pageData.mobile.isResponsive ? '✓ Sí' : '✗ No'}\n`;
      report += `- **Touch friendly:** ${pageData.mobile.isTouchFriendly ? '✓ Sí' : '✗ No'}\n`;
    }

    // Links Analysis
    if (pageData.links) {
      report += `## Análisis de Enlaces\n\n`;
      report += `- **Enlaces internos:** ${pageData.links.internal || 0}\n`;
      report += `- **Enlaces externos:** ${pageData.links.external || 0}\n`;
      report += `- **Enlaces nofollow:** ${(pageData.links as any).nofollow || 0}\n`;
      report += `- **Enlaces rotos:** ${pageData.links.broken || 0}\n`;
      report += `- **Redirects:** ${pageData.links.redirects || 0}\n`;
      if (pageData.links.internal && pageData.links.external) {
        const ratio = (pageData.links.internal / pageData.links.external).toFixed(1);
        report += `- **Ratio interno/externo:** ${ratio}\n`;
      }
      report += `\n`;
    }

    // Issues and Recommendations (only warnings/errors with details)
    if (pageData.issues && pageData.issues.length > 0) {
      const errorIssues = pageData.issues.filter(i => i.type === 'error');
      const warningIssues = pageData.issues.filter(i => i.type === 'warning');
      const successIssues = pageData.issues.filter(i => i.type === 'success');
      
      // Summary of successful checks
      if (successIssues.length > 0) {
        const totalChecks = pageData.issues.length;
        const successfulChecks = successIssues.length;
        report += `## Resumen de Comprobaciones\n\n`;
        report += `✅ **${pageData.title}** ha pasado **${successfulChecks}** de **${totalChecks}** comprobaciones exitosamente.\n\n`;
      }
      
      // Only detail problems and warnings
      const hasProblems = errorIssues.length > 0 || warningIssues.length > 0;
      if (hasProblems) {
        report += `## Problemas Detectados\n\n`;
        
        if (errorIssues.length > 0) {
          report += `### ❌ Problemas Críticos (${errorIssues.length})\n\n`;
          errorIssues.forEach((issue, index) => {
            report += `${index + 1}. **${issue.message}**\n`;
            report += `   - **Categoría:** ${issue.category}\n`;
            report += `   - **Prioridad:** ${issue.priority === 'high' ? 'Alta' : issue.priority === 'medium' ? 'Media' : 'Baja'}\n`;
            report += `   - **Acción:** Requiere atención inmediata\n\n`;
          });
        }

        if (warningIssues.length > 0) {
          report += `### ⚠️ Advertencias (${warningIssues.length})\n\n`;
          warningIssues.forEach((issue, index) => {
            report += `${index + 1}. **${issue.message}**\n`;
            report += `   - **Categoría:** ${issue.category}\n`;
            report += `   - **Prioridad:** ${issue.priority === 'high' ? 'Alta' : issue.priority === 'medium' ? 'Media' : 'Baja'}\n`;
            report += `   - **Impacto:** ${this.getImpactDescription(issue.category, issue.priority)}\n\n`;
          });
        }
      } else if (successIssues.length === pageData.issues.length) {
        report += `## ✅ Estado Excelente\n\n`;
        report += `**${pageData.title}** no presenta problemas detectados. La página cumple con todos los criterios SEO evaluados.\n\n`;
      }
    } else {
      report += `## ✅ Sin Problemas\n\n`;
      report += `No se encontraron problemas críticos en esta página. ¡Excelente trabajo en la optimización SEO!\n\n`;
    }

    report += `---\n\n`;
    report += `*Reporte generado por SEO Analyzer - ${timestamp}*\n`;

    return report;
  }

  /**
   * Helper methods
   */
  private getScoreColor(score: number): string {
    if (score >= 80) return 'bg-green-500';
    if (score >= 60) return 'bg-yellow-500';
    return 'bg-red-500';
  }

  private truncateUrl(url: string, maxLength: number = 35): string {
    if (!url || typeof url !== 'string') {
      logger.warn('Invalid URL provided to truncateUrl', { url, type: typeof url });
      return '';
    }
    
    if (url.length <= maxLength) return url;
    
    try {
      const urlObj = new URL(url);
      const path = urlObj.pathname + urlObj.search;
      
      // If full host + path fits within maxLength
      if ((urlObj.host + path).length <= maxLength) {
        return urlObj.host + path;
      }
      
      // If host is too long by itself, truncate it
      if (urlObj.host.length >= maxLength - 6) {
        return urlObj.host.slice(0, maxLength - 6) + '...';
      }
      
      // Truncate path while keeping host intact
      const availableSpace = maxLength - urlObj.host.length - 6; // 6 chars for '...'
      return urlObj.host + '...' + path.slice(-availableSpace);
      
    } catch (error) {
      // Log specific error for debugging
      logger.warn('URL parsing failed in truncateUrl', { 
        url, 
        error: error instanceof Error ? error.message : 'Unknown error',
        fallbackUsed: true 
      });
      
      // Fallback: simple string truncation
      return url.slice(0, maxLength - 3) + '...';
    }
  }

  private groupIssuesByType(issues: PageCardData['issues']): { error: number; warning: number; success: number; info: number } {
    return issues?.reduce((acc, issue) => {
      if (issue.type === 'error' || issue.type === 'warning' || issue.type === 'success' || issue.type === 'info') {
        acc[issue.type]++;
      }
      return acc;
    }, { error: 0, warning: 0, success: 0, info: 0 }) || { error: 0, warning: 0, success: 0, info: 0 };
  }

  /**
   * Generate detailed analysis grid with comprehensive SEO metrics
   */
  private generateDetailedAnalysisGrid(pageData: PageCardData): string {
    const criticalIssuesCount = pageData.issues?.filter(i => i.type === 'error').length || 0;
    const warningsCount = pageData.issues?.filter(i => i.type === 'warning').length || 0;
    const successesCount = pageData.issues?.filter(i => i.type === 'success').length || 0;

    return `
      <div class="space-y-3">
        <!-- SEO Health Overview -->
        <div class="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg p-3">
          <h4 class="text-xs font-semibold text-blue-700 dark:text-blue-300 mb-2 flex items-center">
            <svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
            Estado General SEO
          </h4>
          <div class="grid grid-cols-3 gap-2">
            <div class="bg-white dark:bg-gray-700/50 rounded p-2 text-center">
              <div class="text-xl mb-1">✅</div>
              <div class="text-xs text-gray-600 dark:text-gray-400">Correctos</div>
              <div class="text-sm font-bold text-green-600 dark:text-green-400">${successesCount}</div>
            </div>
            <div class="bg-white dark:bg-gray-700/50 rounded p-2 text-center">
              <div class="text-xl mb-1">⚠️</div>
              <div class="text-xs text-gray-600 dark:text-gray-400">Mejorar</div>
              <div class="text-sm font-bold text-yellow-600 dark:text-yellow-400">${warningsCount}</div>
            </div>
            <div class="bg-white dark:bg-gray-700/50 rounded p-2 text-center">
              <div class="text-xl mb-1">🚨</div>
              <div class="text-xs text-gray-600 dark:text-gray-400">Críticos</div>
              <div class="text-sm font-bold text-red-600 dark:text-red-400">${criticalIssuesCount}</div>
            </div>
          </div>
        </div>

        <!-- Technical Analysis -->
        <div class="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3">
          <h4 class="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center">
            <svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/>
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
            </svg>
            Análisis Técnico
          </h4>
          <div class="grid grid-cols-2 gap-2">
            ${this.getMiniCheckItem('HTTPS', pageData.technical?.hasSSL)}
            ${this.getMiniCheckItem('Canonical', pageData.technical?.hasCanonical)}
            ${this.getMiniCheckItem('Schema', pageData.technical?.hasSchema)}
            ${this.getMiniCheckItem('En Sitemap', this.isUrlInSitemap(pageData))}
            ${this.getMiniCheckItem('Robots.txt', pageData.technical?.hasRobotsTxt)}
            ${this.getMiniCheckItem('Viewport', pageData.mobile?.hasViewport)}
          </div>
        </div>

        <!-- Performance & Mobile -->
        <div class="bg-green-50 dark:bg-green-900/20 rounded-lg p-3">
          <h4 class="text-xs font-semibold text-green-700 dark:text-green-300 mb-2 flex items-center">
            <svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/>
            </svg>
            Rendimiento y Móvil
          </h4>
          <div class="space-y-2">
            <div class="flex items-center justify-between bg-white dark:bg-gray-700/50 rounded p-2">
              <span class="text-xs text-gray-600 dark:text-gray-400">Tiempo de carga</span>
              <span class="text-xs font-medium ${this.getSpeedColor(pageData.performance?.loadTime)}">
                ${this.formatLoadTime(pageData.performance?.loadTime)}
              </span>
            </div>
            <div class="flex items-center justify-between bg-white dark:bg-gray-700/50 rounded p-2">
              <span class="text-xs text-gray-600 dark:text-gray-400">Tamaño página</span>
              <span class="text-xs font-medium ${this.getPageSizeColor(pageData.performance?.pageSize)}">
                ${pageData.performance?.pageSize ? `${(pageData.performance.pageSize / 1024).toFixed(0)}KB` : 'N/A'}
              </span>
            </div>
            <div class="flex items-center justify-between bg-white dark:bg-gray-700/50 rounded p-2">
              <span class="text-xs text-gray-600 dark:text-gray-400">Puntuación móvil</span>
              <span class="text-xs font-medium ${this.getMobileScoreColor(pageData.mobile?.mobileScore)}">
                ${pageData.mobile?.mobileScore || 'N/A'}/100
              </span>
            </div>
            ${pageData.performance?.compression?.enabled ? `
            <div class="flex items-center justify-between bg-white dark:bg-gray-700/50 rounded p-2">
              <span class="text-xs text-gray-600 dark:text-gray-400">Compresión</span>
              <span class="text-xs font-medium text-green-600 dark:text-green-400">
                ${pageData.performance.compression.type.toUpperCase()}${pageData.performance.compression.estimatedSavings && pageData.performance.compression.estimatedSavings > 0 ? ` (${pageData.performance.compression.estimatedSavings}%)` : ''}
              </span>
            </div>
            ` : ''}
          </div>
        </div>

        <!-- Content Structure -->
        <div class="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-3">
          <h4 class="text-xs font-semibold text-purple-700 dark:text-purple-300 mb-2 flex items-center">
            <svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
            </svg>
            Estructura del Contenido
          </h4>
          <div class="space-y-2">
            <div class="bg-white dark:bg-gray-700/50 rounded p-2">
              <div class="flex items-center justify-between mb-1">
                <span class="text-xs text-gray-600 dark:text-gray-400">Título</span>
                <span class="text-xs font-medium ${this.getTitleStatusColor(pageData.title?.length)}">
                  ${pageData.title?.length || 0}/60 caracteres
                </span>
              </div>
              <div class="flex items-center justify-between">
                <span class="text-xs text-gray-600 dark:text-gray-400">Descripción</span>
                <span class="text-xs font-medium ${this.getDescriptionStatusColor(pageData.description?.length)}">
                  ${pageData.description?.length || 0}/160 caracteres
                </span>
              </div>
            </div>
            
            <div class="bg-white dark:bg-gray-700/50 rounded p-2">
              <div class="flex items-center justify-between">
                <span class="text-xs text-gray-600 dark:text-gray-400">Encabezados</span>
                <span class="text-xs font-medium ${this.getHeadingStructureColor(pageData.headings)}">
                  H1:${pageData.headings?.h1?.length || 0} H2:${pageData.headings?.h2?.length || 0} H3:${pageData.headings?.h3?.length || 0}
                </span>
              </div>
              ${this.getHeadingWarningMessage(pageData.headings)}
            </div>
            
            ${pageData.content?.totalWords ? `
            <div class="bg-white dark:bg-gray-700/50 rounded p-2">
              <div class="flex items-center justify-between">
                <span class="text-xs text-gray-600 dark:text-gray-400">Palabras totales</span>
                <span class="text-xs font-medium ${this.getWordCountColor(pageData.content.totalWords)}">
                  ${pageData.content.totalWords}
                </span>
              </div>
            </div>
            ` : ''}
            
            <!-- Meta Keywords Section -->
            <div class="bg-white dark:bg-gray-700/50 rounded p-2 sm:p-3">
              <div class="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <span class="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400 shrink-0">Meta Keywords</span>
                <div class="flex-1 min-w-0 sm:text-right">
                  ${(() => {
                    if (!pageData.keywords?.metaKeywords) {
                      return `
                        <div class="flex flex-col gap-1.5 sm:items-end">
                          <div class="inline-flex items-center gap-1 text-xs sm:text-sm font-medium ${this.COLORS.warning}">
                            <svg class="w-3 h-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 16.5c-.77.833.192 3 1.732 3z"/>
                            </svg>
                            No definidas
                          </div>
                          <div class="text-xs text-gray-500 dark:text-gray-400 sm:text-right">
                            <div class="italic">Recomendado para SEO</div>
                          </div>
                        </div>
                      `;
                    }
                    
                    const keywordData = this.formatMetaKeywords(pageData.keywords.metaKeywords);
                    const keywordCount = keywordData.keywords.length;
                    
                    return `
                      <div class="flex flex-col gap-1.5 sm:items-end">
                        <div class="inline-flex items-center gap-1 text-xs sm:text-sm font-medium ${this.getMetaKeywordsColor(pageData.keywords.metaKeywords)}">
                          <svg class="w-3 h-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 713 12V7a4 4 0 014-4z"/>
                          </svg>
                          ${keywordCount} definida${keywordCount !== 1 ? 's' : ''}
                        </div>
                        <div class="text-xs leading-relaxed text-gray-700 dark:text-gray-300 sm:text-right">
                          <div class="sm:hidden break-words" title="${this.sanitizeHTML(pageData.keywords.metaKeywords)}">
                            ${this.sanitizeHTML(keywordData.shortDisplay)}
                          </div>
                          <div class="hidden sm:block max-w-[160px] break-words leading-tight" title="${this.sanitizeHTML(pageData.keywords.metaKeywords)}">
                            ${this.sanitizeHTML(keywordData.displayText)}
                          </div>
                        </div>
                      </div>
                    `;
                  })()}
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Links & Images Analysis -->
        <div class="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-3">
          <h4 class="text-xs font-semibold text-orange-700 dark:text-orange-300 mb-2 flex items-center">
            <svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"/>
            </svg>
            Enlaces e Imágenes
          </h4>
          <div class="grid grid-cols-2 gap-2">
            <div class="bg-white dark:bg-gray-700/50 rounded p-2">
              <div class="text-xs text-gray-600 dark:text-gray-400">Enlaces int.</div>
              <div class="text-sm font-medium text-gray-700 dark:text-gray-300">
                ${pageData.links?.internal || 0}
              </div>
            </div>
            <div class="bg-white dark:bg-gray-700/50 rounded p-2">
              <div class="text-xs text-gray-600 dark:text-gray-400">Enlaces ext.</div>
              <div class="text-sm font-medium text-gray-700 dark:text-gray-300">
                ${pageData.links?.external || 0}
              </div>
            </div>
            <div class="bg-white dark:bg-gray-700/50 rounded p-2">
              <div class="text-xs text-gray-600 dark:text-gray-400">Imágenes</div>
              <div class="text-sm font-medium text-gray-700 dark:text-gray-300">
                ${pageData.images?.total || 0}
              </div>
            </div>
            <div class="bg-white dark:bg-gray-700/50 rounded p-2">
              <div class="text-xs text-gray-600 dark:text-gray-400">Sin texto alt.</div>
              <div class="text-sm font-medium ${pageData.images?.missingAlt ? 'text-red-600' : 'text-green-600'}">
                ${pageData.images?.missingAlt || 0}
              </div>
            </div>
            <div class="bg-white dark:bg-gray-700/50 rounded p-2">
              <div class="text-xs text-gray-600 dark:text-gray-400">Formatos modernos</div>
              <div class="text-sm font-medium ${pageData.images?.total === 0 ? 'text-gray-500' : pageData.images?.modernFormats?.hasModernFormats ? 'text-green-600' : 'text-red-600'}">
                ${pageData.images?.total === 0 
                  ? 'Sin imágenes'
                  : pageData.images?.modernFormats?.hasModernFormats 
                    ? `${(pageData.images.modernFormats.webp || 0) + (pageData.images.modernFormats.avif || 0)} de ${pageData.images.modernFormats.total}` 
                    : 'No optimizado'}
              </div>
            </div>
            <div class="bg-white dark:bg-gray-700/50 rounded p-2">
              <div class="text-xs text-gray-600 dark:text-gray-400">Principal formato</div>
              <div class="text-sm font-medium ${pageData.images?.total === 0 ? 'text-gray-500' : pageData.images?.modernFormats?.primaryModernFormat ? 'text-blue-600' : 'text-orange-600'}">
                ${pageData.images?.total === 0 
                  ? 'N/A'
                  : pageData.images?.modernFormats?.primaryModernFormat 
                    ? pageData.images.modernFormats.primaryModernFormat.toUpperCase() 
                    : 'JPEG/PNG'}
              </div>
            </div>
          </div>
        </div>

        <!-- Security Headers -->
        ${pageData.security ? `
        <div class="bg-red-50 dark:bg-red-900/20 rounded-lg p-3">
          <h4 class="text-xs font-semibold text-red-700 dark:text-red-300 mb-2 flex items-center">
            <svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
            </svg>
            Cabeceras de Seguridad
          </h4>
          <div class="grid grid-cols-2 gap-1">
            ${this.getMiniCheckItem('HSTS', pageData.security.headers?.hsts?.present)}
            ${this.getMiniCheckItem('CSP', pageData.security.headers?.csp?.present)}
            ${this.getMiniCheckItem('X-Frame', pageData.security.headers?.xFrameOptions?.present)}
            ${this.getMiniCheckItem('X-Content', pageData.security.headers?.xContentTypeOptions?.present)}
          </div>
        </div>
        ` : ''}

        <!-- E-A-T Score -->
        ${pageData.eat ? `
        <div class="bg-indigo-50 dark:bg-indigo-900/20 rounded-lg p-3">
          <h4 class="text-xs font-semibold text-indigo-700 dark:text-indigo-300 mb-2 flex items-center">
            <svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"/>
            </svg>
            Puntuación E-A-T
          </h4>
          <div class="bg-white dark:bg-gray-700/50 rounded p-2">
            <div class="flex items-center justify-between">
              <span class="text-xs text-gray-600 dark:text-gray-400">Experiencia</span>
              <span class="text-xs font-medium">${pageData.eat.experience || 0}/100</span>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-xs text-gray-600 dark:text-gray-400">Autoridad</span>
              <span class="text-xs font-medium">${pageData.eat.authority || 0}/100</span>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-xs text-gray-600 dark:text-gray-400">Confianza</span>
              <span class="text-xs font-medium">${pageData.eat.trust || 0}/100</span>
            </div>
          </div>
        </div>
        ` : ''}
      </div>
    `;
  }

  /**
   * Generate mini check item for compact display
   */
  private getMiniCheckItem(label: string, status: boolean | undefined): string {
    const statusIcon = status === true ? '✓' : status === false ? '✗' : '?';
    const colorClass = status === true ? 'text-green-600 dark:text-green-400' : 
                      status === false ? 'text-red-600 dark:text-red-400' : 
                      'text-gray-500 dark:text-gray-400';
    
    return `
      <div class="flex items-center justify-between bg-white dark:bg-gray-700/50 rounded p-1.5">
        <span class="text-xs text-gray-700 dark:text-gray-300">${label}</span>
        <span class="text-xs font-bold ${colorClass}">${statusIcon}</span>
      </div>
    `;
  }

  /**
   * Check if URL is in sitemap based on issues
   */
  private isUrlInSitemap(pageData: PageCardData): boolean | undefined {
    if (!pageData.issues) return undefined;
    
    // Check for the warning about URL not in sitemap
    const notInSitemapWarning = pageData.issues.find(issue => 
      issue.type === 'warning' && 
      issue.message.toLowerCase().includes('no se encuentra en el sitemap')
    );
    
    // Check for the success message about URL in sitemap
    const inSitemapSuccess = pageData.issues.find(issue => 
      issue.type === 'success' && 
      issue.message.toLowerCase().includes('incluida en el sitemap')
    );
    
    if (inSitemapSuccess) return true;
    if (notInSitemapWarning) return false;
    
    // If no sitemap exists, return undefined
    return pageData.technical?.hasSitemap ? undefined : false;
  }

  /**
   * Get page size color based on size
   */
  private getPageSizeColor(size?: number): string {
    if (!size) return 'text-gray-500';
    const sizeInKB = size / 1024;
    if (sizeInKB < 500) return 'text-green-600 dark:text-green-400';
    if (sizeInKB < 1000) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  }



  /**
   * Color constants for consistency
   */
  private readonly COLORS = {
    success: 'text-green-600 dark:text-green-400',
    warning: 'text-yellow-600 dark:text-yellow-400',
    error: 'text-red-600 dark:text-red-400',
    neutral: 'text-gray-500 dark:text-gray-400'
  } as const;

  /**
   * Score thresholds for consistent evaluation
   */
  private readonly THRESHOLDS = {
    excellent: 80,
    good: 60,
    fair: 40,
    poor: 20
  } as const;

  /**
   * Helper methods for status colors
   */
  private getMobileScoreColor(score?: number): string {
    if (!score) return this.COLORS.neutral;
    if (score >= this.THRESHOLDS.excellent) return this.COLORS.success;
    if (score >= this.THRESHOLDS.good) return this.COLORS.warning;
    return this.COLORS.error;
  }



  // Additional helper methods for new sections


  private getHeadingStructureColor(headings?: any): string {
    const h1Count = headings?.h1?.length || 0;
    const h2Count = headings?.h2?.length || 0;
    
    // Multiple H1s is a critical SEO issue
    if (h1Count > 1) return 'text-red-600 dark:text-red-400';
    
    // No H1 is also critical
    if (h1Count === 0) return 'text-red-600 dark:text-red-400';
    
    // Perfect: 1 H1 with some H2s
    if (h1Count === 1 && h2Count > 0 && h2Count <= 6) return 'text-green-600 dark:text-green-400';
    
    // Too many H2s (more than 6) can be problematic
    if (h1Count === 1 && h2Count > 6) return 'text-yellow-600 dark:text-yellow-400';
    
    // 1 H1 but no H2s - acceptable but not ideal
    if (h1Count === 1) return 'text-yellow-600 dark:text-yellow-400';
    
    return 'text-red-600 dark:text-red-400';
  }

  private getHeadingWarningMessage(headings?: any): string {
    const h1Count = headings?.h1?.length || 0;
    const h2Count = headings?.h2?.length || 0;
    
    // Multiple H1s - critical SEO issue
    if (h1Count > 1) {
      return `<div class="mt-1 text-xs text-red-600 dark:text-red-400 flex items-center">
        <svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
        </svg>
        ⚠️ Múltiples H1 detectados (mala práctica SEO)
      </div>`;
    }
    
    // No H1 - critical SEO issue
    if (h1Count === 0) {
      return `<div class="mt-1 text-xs text-red-600 dark:text-red-400 flex items-center">
        <svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
        </svg>
        ⚠️ Sin H1 principal (crítico para SEO)
      </div>`;
    }
    
    // Too many H2s
    if (h1Count === 1 && h2Count > 6) {
      return `<div class="mt-1 text-xs text-yellow-600 dark:text-yellow-400 flex items-center">
        <svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 16.5c-.77.833.192 3 1.732 3z"/>
        </svg>
        Demasiados H2 (${h2Count}) - considere reorganizar
      </div>`;
    }
    
    // Good structure
    if (h1Count === 1 && h2Count > 0 && h2Count <= 6) {
      return `<div class="mt-1 text-xs text-green-600 dark:text-green-400 flex items-center">
        <svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
        </svg>
        ✓ Estructura correcta
      </div>`;
    }
    
    return '';
  }












  private getWordCountColor(wordCount?: number): string {
    if (!wordCount) return 'text-gray-500';
    if (wordCount >= 300) return 'text-green-600 dark:text-green-400';
    if (wordCount >= 100) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  }



  /**
   * Generate clean, simple modal analysis without complex navigation
   */
  generateModalDetailedAnalysis(pageData: PageCardData): string {
    const criticalIssues = pageData.issues?.filter(i => i.type === 'error') || [];
    const warnings = pageData.issues?.filter(i => i.type === 'warning') || [];
    const successes = pageData.issues?.filter(i => i.type === 'success') || [];
    
    // Get the most important insights
    const seoGrade = this.getSEOGrade(pageData.seoScore || 0);
    const mainMessage = this.getMainMessage(pageData, criticalIssues, warnings);
    const quickWins = this.getQuickWins(criticalIssues, warnings);
    
    return `
      <!-- Simple Header -->
      <div class="bg-gray-900 p-6 text-white">
        <div class="flex items-center justify-between">
          <div class="flex items-center space-x-4">
            <div class="w-14 h-14 ${this.getScoreColor(pageData.seoScore || 0)} rounded-full flex items-center justify-center">
              <span class="text-white font-bold text-lg">${pageData.seoScore || 0}</span>
            </div>
            <div>
              <h2 class="text-xl font-bold mb-1">${this.sanitizeHTML(pageData.title || 'Sin título')}</h2>
              <p class="text-gray-300 text-sm">${seoGrade}</p>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Main Content - Single Column, No Navigation -->
      <div class="p-6 space-y-6">
        
        <!-- Main Message -->
        <div class="text-center">
          <div class="text-4xl mb-3">${mainMessage.icon}</div>
          <h3 class="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2">${mainMessage.title}</h3>
          <p class="text-gray-600 dark:text-gray-400">${mainMessage.description}</p>
        </div>

        <!-- Key Metrics - Simple Row -->
        <div class="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
          <div class="grid grid-cols-4 gap-4 text-center">
            <div>
              <div class="text-2xl mb-1">${pageData.technical?.hasSSL ? '🔒' : '⚠️'}</div>
              <div class="text-xs text-gray-500">Seguridad</div>
              <div class="text-sm font-medium ${pageData.technical?.hasSSL ? 'text-green-600' : 'text-red-600'}">
                ${pageData.technical?.hasSSL ? 'Seguro' : 'Inseguro'}
              </div>
            </div>
            
            <div>
              <div class="text-2xl mb-1">${this.getSpeedEmoji(pageData.performance?.loadTime)}</div>
              <div class="text-xs text-gray-500">Velocidad</div>
              <div class="text-sm font-medium ${this.getSpeedColor(pageData.performance?.loadTime)}">
                ${this.getSpeedText(pageData.performance?.loadTime)}
              </div>
            </div>
            
            <div>
              <div class="text-2xl mb-1">${pageData.mobile?.isResponsive ? '📱' : '💻'}</div>
              <div class="text-xs text-gray-500">Móvil</div>
              <div class="text-sm font-medium ${pageData.mobile?.isResponsive ? 'text-green-600' : 'text-red-600'}">
                ${pageData.mobile?.isResponsive ? 'Optimizado' : 'Solo PC'}
              </div>
            </div>
            
            <div>
              <div class="text-2xl mb-1">📝</div>
              <div class="text-xs text-gray-500">Contenido</div>
              <div class="text-sm font-medium ${this.getContentColor(pageData)}">
                ${this.getContentText(pageData)}
              </div>
            </div>
          </div>
        </div>

        <!-- Critical Issues (if any) -->
        ${criticalIssues.length > 0 ? `
          <div class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <h4 class="font-bold text-red-800 dark:text-red-300 mb-3 flex items-center">
              <span class="text-red-500 mr-2">⚠️</span>
              ${criticalIssues.length} problema${criticalIssues.length > 1 ? 's' : ''} importante${criticalIssues.length > 1 ? 's' : ''}
            </h4>
            <div class="space-y-2">
              ${criticalIssues.slice(0, 3).map(issue => `
                <div class="flex items-start space-x-2">
                  <span class="text-red-500 mt-1">•</span>
                  <span class="text-sm text-gray-700 dark:text-gray-300">${issue.message}</span>
                </div>
              `).join('')}
              ${criticalIssues.length > 3 ? `
                <div class="text-sm text-red-600 dark:text-red-400 italic">
                  y ${criticalIssues.length - 3} problema${criticalIssues.length - 3 > 1 ? 's' : ''} más...
                </div>
              ` : ''}
            </div>
          </div>
        ` : ''}

        <!-- Quick Wins -->
        ${quickWins.length > 0 ? `
          <div class="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <h4 class="font-bold text-blue-800 dark:text-blue-300 mb-3 flex items-center">
              <span class="text-blue-500 mr-2">💡</span>
              Mejoras rápidas recomendadas
            </h4>
            <div class="space-y-2">
              ${quickWins.map(win => `
                <div class="flex items-start space-x-2">
                  <span class="text-blue-500 mt-1">•</span>
                  <span class="text-sm text-gray-700 dark:text-gray-300">${win}</span>
                </div>
              `).join('')}
            </div>
          </div>
        ` : ''}

        <!-- What's Working -->
        ${successes.length > 0 ? `
          <div class="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
            <h4 class="font-bold text-green-800 dark:text-green-300 mb-3 flex items-center">
              <span class="text-green-500 mr-2">✅</span>
              Lo que está funcionando bien
            </h4>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
              ${successes.slice(0, 4).map(success => `
                <div class="flex items-center space-x-2">
                  <span class="text-green-500">✓</span>
                  <span class="text-sm text-gray-700 dark:text-gray-300">${success.message}</span>
                </div>
              `).join('')}
            </div>
          </div>
        ` : ''}

        <!-- Basic Metrics -->
        <div class="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
          <h4 class="font-medium text-gray-900 dark:text-gray-100 mb-3">Métricas básicas</h4>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div class="flex justify-between">
              <span class="text-gray-600 dark:text-gray-400">Título:</span>
              <span class="${this.getTitleStatusColor(pageData.title?.length)}">${pageData.title?.length || 0} caracteres</span>
            </div>
            <div class="flex justify-between">
              <span class="text-gray-600 dark:text-gray-400">Descripción:</span>
              <span class="${this.getDescriptionStatusColor(pageData.description?.length)}">${pageData.description?.length || 0} caracteres</span>
            </div>
            <div class="flex justify-between">
              <span class="text-gray-600 dark:text-gray-400">Tiempo de carga:</span>
              <span class="${this.getSpeedColor(pageData.performance?.loadTime)}">${this.formatLoadTime(pageData.performance?.loadTime)}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-gray-600 dark:text-gray-400">Enlaces internos:</span>
              <span class="text-gray-700 dark:text-gray-300">${pageData.links?.internal || 0}</span>
            </div>
          </div>
        </div>

        <!-- Simple Action Message -->
        <div class="text-center bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
          <p class="text-sm text-gray-600 dark:text-gray-400">
            ${this.getActionMessage(pageData.seoScore || 0, criticalIssues.length)}
          </p>
        </div>

      </div>
    `;
  }

  /**
   * Helper methods for the simplified modal
   */
  private getSEOGrade(score: number): string {
    if (score >= 90) return 'SEO Excelente';
    if (score >= 80) return 'Buen SEO';
    if (score >= 70) return 'SEO Regular';
    if (score >= 50) return 'SEO Mejorable';
    return 'SEO Necesita Atención';
  }

  private getMainMessage(pageData: PageCardData, criticalIssues: any[], warnings: any[]): {icon: string, title: string, description: string} {
    if (criticalIssues.length > 0) {
      return {
        icon: '🚨',
        title: 'Requiere atención inmediata',
        description: `Se encontraron ${criticalIssues.length} problema${criticalIssues.length > 1 ? 's' : ''} crítico${criticalIssues.length > 1 ? 's' : ''} que pueden afectar tu posicionamiento.`
      };
    }
    
    if (warnings.length > 2) {
      return {
        icon: '⚡',
        title: 'Buenas bases, con potencial de mejora',
        description: `Tu sitio tiene una base sólida, pero hay ${warnings.length} oportunidades de optimización.`
      };
    }
    
    if ((pageData.seoScore || 0) >= 80) {
      return {
        icon: '🎉',
        title: '¡Excelente trabajo!',
        description: 'Tu página está bien optimizada para SEO. Sigue así.'
      };
    }
    
    return {
      icon: '📈',
      title: 'Optimización en progreso',
      description: 'Tu sitio está en buen camino. Algunos ajustes pueden mejorar significativamente tu SEO.'
    };
  }

  private getQuickWins(criticalIssues: any[], warnings: any[]): string[] {
    const wins: string[] = [];
    
    // Add specific quick wins based on common issues
    const allIssues = [...criticalIssues, ...warnings];
    
    allIssues.forEach(issue => {
      if (issue.message.toLowerCase().includes('title') && issue.message.toLowerCase().includes('missing')) {
        wins.push('Agregar un título descriptivo a la página');
      }
      if (issue.message.toLowerCase().includes('description') && issue.message.toLowerCase().includes('missing')) {
        wins.push('Escribir una meta descripción atractiva');
      }
      if (issue.message.toLowerCase().includes('ssl') || issue.message.toLowerCase().includes('https')) {
        wins.push('Habilitar certificado SSL (HTTPS)');
      }
      if (issue.message.toLowerCase().includes('mobile') || issue.message.toLowerCase().includes('responsive')) {
        wins.push('Optimizar el diseño para dispositivos móviles');
      }
    });
    
    return wins.slice(0, 3); // Max 3 quick wins
  }

  private getSpeedEmoji(loadTime?: number): string {
    if (!loadTime) return '❓';
    if (loadTime < 2000) return '🚀';
    if (loadTime < 4000) return '⚡';
    return '🐌';
  }

  /**
   * Performance thresholds in milliseconds
   */
  private readonly PERFORMANCE_THRESHOLDS = {
    veryFast: 2000,
    fast: 3000,
    moderate: 5000
  } as const;

  /**
   * SEO content length thresholds
   */
  private readonly CONTENT_LENGTH = {
    title: { min: 30, max: 60 },
    description: { min: 120, max: 160 }
  } as const;

  private getSpeedColor(loadTime?: number): string {
    if (!loadTime) return this.COLORS.neutral;
    if (loadTime < this.PERFORMANCE_THRESHOLDS.fast) return this.COLORS.success;
    if (loadTime < this.PERFORMANCE_THRESHOLDS.moderate) return this.COLORS.warning;
    return this.COLORS.error;
  }

  private getSpeedText(loadTime?: number): string {
    if (!loadTime) return 'N/A';
    if (loadTime < this.PERFORMANCE_THRESHOLDS.veryFast) return 'Muy rápida';
    if (loadTime < this.PERFORMANCE_THRESHOLDS.moderate - 1000) return 'Buena';
    return 'Lenta';
  }

  private getContentColor(pageData: PageCardData): string {
    const titleLength = pageData.title?.length ?? 0;
    const descLength = pageData.description?.length ?? 0;
    const titleOk = this.isLengthOptimal(titleLength, this.CONTENT_LENGTH.title);
    const descOk = this.isLengthOptimal(descLength, this.CONTENT_LENGTH.description);
    
    if (titleOk && descOk) return this.COLORS.success;
    if (titleOk || descOk) return this.COLORS.warning;
    return this.COLORS.error;
  }

  private getContentText(pageData: PageCardData): string {
    const titleLength = pageData.title?.length ?? 0;
    const descLength = pageData.description?.length ?? 0;
    const titleOk = this.isLengthOptimal(titleLength, this.CONTENT_LENGTH.title);
    const descOk = this.isLengthOptimal(descLength, this.CONTENT_LENGTH.description);
    
    if (titleOk && descOk) return 'Optimizado';
    if (titleOk || descOk) return 'Parcial';
    return 'Mejorable';
  }

  private getTitleStatusColor(length?: number): string {
    if (!length) return this.COLORS.error;
    const { min, max } = this.CONTENT_LENGTH.title;
    if (length >= min && length <= max) return this.COLORS.success;
    return this.COLORS.warning;
  }

  private getDescriptionStatusColor(length?: number): string {
    if (!length) return this.COLORS.error;
    const { min, max } = this.CONTENT_LENGTH.description;
    if (length >= min && length <= max) return this.COLORS.success;
    return this.COLORS.warning;
  }

  /**
   * Helper to check if a length is within optimal range
   */
  private isLengthOptimal(length: number, range: { min: number; max: number }): boolean {
    return length >= range.min && length <= range.max;
  }

  /**
   * Format meta keywords for display
   */
  private formatMetaKeywords(metaKeywords: string): { keywords: string[], isValid: boolean, displayText: string, shortDisplay: string } {
    if (!metaKeywords || metaKeywords.trim() === '') {
      return {
        keywords: [],
        isValid: false,
        displayText: 'Sin meta keywords',
        shortDisplay: 'No definidas'
      };
    }

    const keywords = metaKeywords
      .split(/[,;|]/)
      .map(keyword => keyword.trim())
      .filter(keyword => keyword.length > 0);

    const isValid = keywords.length > 0 && keywords.length <= 10;
    
    // Crear diferentes versiones de display
    const fullText = keywords.join(', ');
    const shortDisplay = keywords.length > 2 
      ? `${keywords.slice(0, 2).join(', ')}, +${keywords.length - 2} más` 
      : fullText;

    return {
      keywords,
      isValid,
      displayText: fullText,
      shortDisplay: shortDisplay
    };
  }

  /**
   * Get color for meta keywords status
   */
  private getMetaKeywordsColor(metaKeywords?: string): string {
    if (!metaKeywords || metaKeywords.trim() === '') {
      return this.COLORS.warning; // Missing keywords
    }

    const keywords = metaKeywords.split(/[,;|]/).map(k => k.trim()).filter(k => k.length > 0);
    
    if (keywords.length === 0) return this.COLORS.error;
    if (keywords.length > 10) return this.COLORS.warning; // Too many keywords
    if (keywords.length >= 3 && keywords.length <= 7) return this.COLORS.success; // Optimal range
    
    return this.COLORS.warning; // Sub-optimal but acceptable
  }

  private getActionMessage(score: number, criticalIssues: number): string {
    if (criticalIssues > 0) {
      return 'Prioriza solucionar los problemas críticos para mejorar tu posicionamiento en Google.';
    }
    
    if (score >= 80) {
      return 'Tu página está bien optimizada. Mantén esta calidad en todo tu sitio web.';
    }
    
    if (score >= 60) {
      return 'Implementa las mejoras recomendadas para alcanzar un SEO excelente.';
    }
    
    return 'Hay margen significativo de mejora. Comienza con las optimizaciones básicas.';
  }



}

// Export singleton instance
export const pageCardService = new PageCardService();