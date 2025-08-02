/**
 * Service for handling SEO form functionality
 * Extracted from SEOAnalyzer.astro for better separation of concerns
 */

import { createLogger } from '../seo/logging/index.js';
import { CONFIG } from '../seo/config/index.js';
import { 
  validateUrlFormat, 
  errorHandler,
  createErrorFromException 
} from '../seo/errors/index.js';
import type { 
  CompleteAnalysisResult, 
  UnifiedAnalysisResponse,
  Issue,
  Performance
} from '../seo/types/analysis.js';

// Extend Issue type for multi-page analysis
interface IssueWithPage extends Issue {
  pageUrl?: string;
}

const logger = createLogger('SEOFormService');

export interface FormElements {
  form: HTMLFormElement;
  urlInput: HTMLInputElement;
  analyzeBtn: HTMLButtonElement;
  btnText: HTMLElement;
  loading: HTMLElement;
  loadingText: HTMLElement;
  errorDiv: HTMLElement;
  errorMessage: HTMLElement;
}

export interface FormState {
  isLoading: boolean;
  lastAnalyzedUrl?: string;
}

export class SEOFormService {
  private elements: Partial<FormElements> = {};
  private state: FormState = { isLoading: false };

  /**
   * Initialize the form service with DOM elements
   */
  init(elements: Partial<FormElements>) {
    this.elements = elements;
    this.bindEvents();
    logger.info('SEO Form Service initialized');
  }

  /**
   * Bind form events
   */
  private bindEvents() {
    if (this.elements.form) {
      this.elements.form.addEventListener('submit', (e) => this.handleSubmit(e));
    }
  }

  /**
   * Handle form submission
   */
  private async handleSubmit(event: Event) {
    event.preventDefault();
    
    const url = this.elements.urlInput?.value.trim();
    if (!url) {
      this.showError('Por favor ingresa una URL válida');
      return;
    }

    // Use standardized URL validation
    const urlError = validateUrlFormat(url);
    if (urlError) {
      errorHandler.handleError(urlError);
      this.showError(urlError.userMessage);
      return;
    }

    try {
      this.setLoadingState(true);
      this.setTechnicalIndicatorsLoading();
      this.hideError();
      
      logger.info('Starting SEO analysis', { url });
      
      const data = await this.performAnalysis(url);
      
      // Update main results
      this.updateResults(data);
      this.showResults();


      // Handle multi-page results
      if (data.isMultiPage && data.pages && data.pages.length > 1) {
        this.handleMultiPageResults(data);
      }

      this.state.lastAnalyzedUrl = url;
      logger.info('SEO analysis completed successfully', { 
        url, 
        seoScore: data.performance?.seoScore,
        pageCount: data.pages?.length 
      });

    } catch (error) {
      const analysisError = createErrorFromException(error instanceof Error ? error : new Error(String(error)), url, 'Form submission');
      errorHandler.handleError(analysisError);
      this.showError(analysisError.userMessage);
      
      // Reset technical indicators on error
      const indicators = document.querySelectorAll('.technical-indicator');
      indicators.forEach(indicator => {
        indicator.classList.remove('loading', 'success', 'warning', 'error');
      });
    } finally {
      this.setLoadingState(false);
    }
  }

  /**
   * Perform the actual SEO analysis
   */
  private async performAnalysis(url: string): Promise<UnifiedAnalysisResponse> {
    const response = await fetch(`${CONFIG.API_BASE_PATH}/analyze-unified`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ url })
    });

    const responseData = await response.json();

    if (!response.ok) {
      // If the API returns standardized error format, use it directly
      if (responseData.errorCode && responseData.errorType) {
        throw new Error(responseData.error || responseData.userMessage || 'Error en el análisis');
      } else {
        throw new Error(responseData.error || 'Error en el análisis');
      }
    }

    return responseData;
  }


  /**
   * Set loading state
   */
  private setLoadingState(isLoading: boolean) {
    this.state.isLoading = isLoading;

    if (this.elements.analyzeBtn) {
      this.elements.analyzeBtn.disabled = isLoading;
    }

    if (this.elements.btnText) {
      this.elements.btnText.textContent = isLoading ? 'Analizando...' : 'Analizar Sitio Web Completo';
    }

    if (this.elements.loading) {
      this.elements.loading.classList.toggle('hidden', !isLoading);
    }

    if (isLoading) {
      this.resetLoadingProgress();
    } else {
      this.completeLoadingProgress();
    }
  }

  /**
   * Reset loading progress
   */
  private resetLoadingProgress() {
    if (this.elements.loadingText) {
      this.elements.loadingText.textContent = 'Analizando tu sitio web completo...';
    }

    const progressBar = document.querySelector('#loading .h-full') as HTMLElement;
    if (progressBar) {
      progressBar.style.width = '33%';
    }
  }

  /**
   * Complete loading progress
   */
  private completeLoadingProgress() {
    const progressBar = document.querySelector('#loading .h-full') as HTMLElement;
    if (progressBar) {
      progressBar.style.width = '100%';
    }
  }

  /**
   * Show error message
   */
  private showError(message: string) {
    if (this.elements.errorMessage) {
      this.elements.errorMessage.textContent = message;
    }
    if (this.elements.errorDiv) {
      this.elements.errorDiv.classList.remove('hidden');
    }
    logger.warn('Form error displayed', { message });
  }

  /**
   * Hide error message
   */
  private hideError() {
    if (this.elements.errorDiv) {
      this.elements.errorDiv.classList.add('hidden');
    }
  }

  /**
   * Show results section
   */
  private showResults() {
    const resultsSection = document.getElementById('results');
    if (resultsSection) {
      resultsSection.classList.remove('hidden');
      resultsSection.scrollIntoView({ behavior: 'smooth' });
    }
  }

  /**
   * Update main results display
   */
  private updateResults(data: CompleteAnalysisResult | UnifiedAnalysisResponse): void {
    // Validate data structure first
    if (!data) {
      logger.warn('No data provided to updateResults');
      return;
    }

    // Update SEO score - with validation
    if (data.performance?.seoScore !== undefined) {
      this.updateElement('.seo-score-value', data.performance.seoScore);
      this.updateElement('.seo-score-text', this.getScoreText(data.performance.seoScore));
      
      // Update progress ring animation
      if (window.updateProgressRing) {
        window.updateProgressRing(data.performance.seoScore);
      }
    }

    // Update technical details with enhanced state management - with validation
    if (data.technical) {
      this.updateTechnicalIndicator('.technical-ssl', data.technical.hasSSL, 'HTTPS');
      this.updateTechnicalIndicator('.technical-canonical', data.technical.hasCanonical, 'Canonical');
      this.updateTechnicalIndicator('.technical-schema', data.technical.hasSchema, 'Schema');
      
      // Update technical status text
      this.updateElement('.technical-ssl-status', data.technical.hasSSL ? '✅ Activo' : '❌ No activo');
      this.updateElement('.technical-canonical-status', data.technical.hasCanonical ? '✅ Configurado' : '⚠️ Falta');
      this.updateElement('.technical-schema-status', data.technical.hasSchema ? '✅ Detectado' : '❌ No detectado');
      this.updateElement('.technical-sitemap-status', data.technical.hasSitemap ? '✅ Detectado' : '❌ No detectado');
    }
    
    // Update size status in Technical Status section only
    this.updateSizeStatus(data.performance?.pageSize);

    // Update link analysis - with validation
    if (data.links) {
      this.updateElement('.links-internal', data.links.internal || 0);
      this.updateElement('.links-external', data.links.external || 0);
      this.updateElement('.links-broken', data.links.broken || 0);
      
      // Update link quality indicator
      this.updateLinkQuality(data.links);
    }

    // Update mobile metrics - only in dashboard section
    if (data.mobile) {
      this.updateElement('.mobile-score', `${data.mobile.mobileScore || 0}/100`);
      this.updateElement('.mobile-viewport', data.mobile.hasViewport ? '✅ Sí' : '❌ No');
      this.updateElement('.mobile-responsive', data.mobile.isResponsive ? '✅ Sí' : '❌ No');
      this.updateElement('.mobile-touch', data.mobile.isTouchFriendly ? '✅ Sí' : '❌ No');
      
      // Update mobile score progress bar
      const mobileScoreBar = document.querySelector('.mobile-score-bar') as HTMLElement;
      if (mobileScoreBar && data.mobile.mobileScore !== undefined) {
        mobileScoreBar.style.width = `${data.mobile.mobileScore}%`;
        
        // Update color based on score
        mobileScoreBar.classList.remove('bg-red-500', 'bg-yellow-500', 'bg-green-500');
        if (data.mobile.mobileScore >= 80) {
          mobileScoreBar.classList.add('bg-green-500');
        } else if (data.mobile.mobileScore >= 60) {
          mobileScoreBar.classList.add('bg-yellow-500');
        } else {
          mobileScoreBar.classList.add('bg-red-500');
        }
      }
    }

    // Update recommendations - with validation
    if (data.issues) {
      this.updateRecommendations(data.issues);
    }
  }

  /**
   * Handle multi-page analysis results
   */
  private handleMultiPageResults(data: UnifiedAnalysisResponse): void {
    
    // SKIP the basic multipage section - we'll use the full PageCards component instead
    // This avoids UI duplication and confusion
    
    // Show skeleton cards immediately in the PageCards component
    if (window.showSkeletonCards) {
      window.showSkeletonCards(data.pages.length);
    }
    
    // Update loading message and progress
    if (this.elements.loadingText) {
      this.elements.loadingText.textContent = `Procesando resultados de ${data.pages.length} páginas...`;
    }
    
    // Update progress bar to 90%
    const progressBar = document.querySelector('#loading .h-full') as HTMLElement;
    if (progressBar) {
      progressBar.style.width = '90%';
    }

    // Update multipage statistics in the header - THIS WAS MISSING!
    this.updateMultipageStats(data);

    // Display the full page cards (this should show the complete UI)
    if (window.displayPageCards) {
      window.displayPageCards(data);
    }
  }

  /**
   * Update multipage statistics in the UI
   */
  private updateMultipageStats(data: UnifiedAnalysisResponse): void {
    
    if (!data.pages) {
      return;
    }
    
    // Calculate stats from the actual pages data
    const successfulPages = data.pages.filter((p) => p.status === 'success' && 'performance' in p && p.performance);
    const totalPages = data.pages.length;
    const avgScore = successfulPages.length > 0 
      ? Math.round(successfulPages.reduce((sum, p) => {
          if ('performance' in p && p.performance) {
            return sum + (p.performance as Performance).seoScore;
          }
          return sum;
        }, 0) / successfulPages.length)
      : 0;
    const totalIssues = data.pages.reduce((sum, p) => {
      if ('issues' in p && Array.isArray(p.issues)) {
        // Only count errors and warnings as problems, not success items
        const problemCount = p.issues.filter(issue => issue.type === 'error' || issue.type === 'warning').length;
        return sum + problemCount;
      }
      return sum;
    }, 0);
    
    // Update PageCards header stats using the correct selectors from PageCards.astro
    this.updateElement('.summary-pages', totalPages);
    this.updateElement('.summary-avg-score', avgScore);
    this.updateElement('.summary-issues', totalIssues);
  }
  
  /**
   * Format page URL for display
   */

  /**
   * Helper methods
   */
  private updateElement(selector: string, value: string | number): void {
    const el = document.querySelector(selector);
    if (el && value !== undefined && value !== null) {
      el.textContent = value.toString();
    }
  }


  /**
   * Enhanced method to update technical indicators with states
   */
  private updateTechnicalIndicator(selector: string, hasFeature: boolean, featureName: string) {
    const element = document.querySelector(selector);
    const indicatorContainer = element?.closest('.technical-indicator');
    
    if (element && indicatorContainer) {
      // Update the emoji/icon
      element.textContent = hasFeature ? '✅' : '❌';
      
      // Update the container state classes
      indicatorContainer.classList.remove('loading', 'success', 'warning', 'error');
      
      if (hasFeature) {
        indicatorContainer.classList.add('success');
      } else {
        // Different error states based on feature type
        if (featureName === 'HTTPS') {
          indicatorContainer.classList.add('error');
        } else {
          indicatorContainer.classList.add('warning');
        }
      }
    }
  }



  /**
   * Update size status in the Technical Status section
   */
  private updateSizeStatus(sizeBytes?: number) {
    const sizeStatusEl = document.querySelector('.technical-size-status');
    
    if (sizeStatusEl) {
      if (typeof sizeBytes === 'number' && sizeBytes > 0) {
        const sizeKB = Math.round(sizeBytes / 1024);
        
        // Format with appropriate status icon
        if (sizeKB < 500) {
          sizeStatusEl.textContent = `✅ ${sizeKB} KB`;
        } else if (sizeKB < 1000) {
          sizeStatusEl.textContent = `⚠️ ${sizeKB} KB`;
        } else {
          sizeStatusEl.textContent = `❌ ${sizeKB} KB`;
        }
      } else {
        sizeStatusEl.textContent = '❓ N/A';
      }
    }
  }

  /**
   * Set loading state for technical indicators
   */
  private setTechnicalIndicatorsLoading() {
    const indicators = document.querySelectorAll('.technical-indicator');
    indicators.forEach(indicator => {
      indicator.classList.add('loading');
      indicator.classList.remove('success', 'warning', 'error');
    });
  }

  private updateRecommendations(issues: Issue[]): void {
    const container = document.querySelector('.recommendations-list');
    if (!container) return;

    // Ensure issues is an array and handle null/undefined category gracefully
    const safeIssues = Array.isArray(issues) ? issues : [];
    
    // Update summary counts with safe access
    const criticalCount = safeIssues.filter((issue: any) => issue && issue.type === 'error').length;
    const warningCount = safeIssues.filter((issue: any) => issue && issue.type === 'warning').length;
    const successCount = safeIssues.filter((issue: any) => issue && issue.type === 'success').length;
    
    this.updateElement('.critical-count', criticalCount);
    this.updateElement('.warning-count', warningCount);
    this.updateElement('.success-count', successCount);

    if (safeIssues.length === 0) {
      container.innerHTML = this.getEmptyStateHTML();
      return;
    }

    // Group and display issues
    container.innerHTML = this.generateIssuesHTML(safeIssues);
  }


  private getScoreText(score: number): string {
    return score >= 80 ? 'SEO Excelente' : score >= 60 ? 'Buen SEO' : 'Necesita mejoras';
  }

  private getEmptyStateHTML(): string {
    return `
      <div class="empty-state text-center py-8 text-gray-400">
        <svg class="w-12 h-12 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
        </svg>
        <p class="text-lg font-medium mb-2">¡Perfecto!</p>
        <p class="text-sm">No se encontraron problemas críticos en el análisis SEO.</p>
      </div>
    `;
  }

  private generateIssuesHTML(issues: any[]): string {
    // First, sort issues by type priority (error > warning > success)
    const sortedIssues = [...issues].sort((a, b) => {
      const typePriority: Record<string, number> = {
        'error': 0,
        'warning': 1,
        'success': 2
      };
      const aPriority = typePriority[a.type] ?? 3;
      const bPriority = typePriority[b.type] ?? 3;
      return aPriority - bPriority;
    });
    
    
    // Group issues by type first
    const issuesByType: Record<string, any[]> = {
      'error': sortedIssues.filter(i => i.type === 'error'),
      'warning': sortedIssues.filter(i => i.type === 'warning'),
      'success': sortedIssues.filter(i => i.type === 'success')
    };

    const typeNames: Record<string, string> = {
      'error': 'Errores Críticos',
      'warning': 'Advertencias',
      'success': 'Optimizaciones Correctas'
    };

    const typeIcons: Record<string, string> = {
      'error': '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>',
      'warning': '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 16.5c-.77.833.192 2.5 1.732 2.5z"/></svg>',
      'success': '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>'
    };

    const typeColors: Record<string, string> = {
      'error': 'text-red-500',
      'warning': 'text-yellow-500',
      'success': 'text-green-500'
    };

    const categoryNames: Record<string, string> = {
      'content': 'Contenido',
      'technical': 'Técnico', 
      'performance': 'Rendimiento',
      'links': 'Enlaces',
      'mobile': 'Móvil',
      'general': 'General'
    };

    return `
      <div class="space-y-6">
        ${Object.entries(issuesByType).map(([type, typeIssues]: [string, any[]]) => {
          if (typeIssues.length === 0) return '';
          
          // Further group by category within each type
          const groupedByCategory = typeIssues.reduce((acc, issue) => {
            const category = issue.category || 'general';
            if (!acc[category]) acc[category] = [];
            acc[category].push(issue);
            return acc;
          }, {} as Record<string, any[]>);
          
          return `
            <div class="type-section">
              <div class="flex items-center space-x-3 mb-4 pb-2 border-b border-border-subtle">
                <div class="${typeColors[type]}">${typeIcons[type]}</div>
                <h4 class="text-primary font-semibold text-lg">${typeNames[type]}</h4>
                <span class="text-secondary text-sm">(${typeIssues.length})</span>
              </div>
              
              <div class="space-y-4">
                ${Object.entries(groupedByCategory).map(([category, categoryIssues]) => {
                  const issues = categoryIssues as Issue[];
                  return `
                    <div class="category-section" data-category="${category}">
                      <h5 class="text-secondary text-sm font-medium mb-3">${categoryNames[category] || category}</h5>
                      <div class="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-3">
                        ${issues.map((issue) => this.generateIssueHTML(issue)).join('')}
                      </div>
                    </div>
                  `;
                }).join('')}
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  }

  private generateIssueHTML(issue: Issue | IssueWithPage): string {
    const typeStylesMap = {
      'error': { bg: 'bg-red-500/10', border: 'border-red-500/30', text: 'text-red-300', icon: 'bg-red-500', iconText: '!' },
      'warning': { bg: 'bg-yellow-500/10', border: 'border-yellow-500/30', text: 'text-yellow-300', icon: 'bg-yellow-500', iconText: '!' },
      'success': { bg: 'bg-green-500/10', border: 'border-green-500/30', text: 'text-green-300', icon: 'bg-green-500', iconText: '✓' },
      'info': { bg: 'bg-blue-500/10', border: 'border-blue-500/30', text: 'text-blue-300', icon: 'bg-blue-500', iconText: 'i' }
    } as const;
    
    const typeStyles = typeStylesMap[issue.type] || {
      bg: 'bg-gray-500/10', border: 'border-gray-500/30', text: 'text-gray-300', icon: 'bg-gray-500', iconText: '?'
    };
    
    const priorityColor = issue.priority === 'high' ? 'text-red-400' : 
                         issue.priority === 'medium' ? 'text-yellow-400' : 'text-gray-500';
    
    const issueWithPage = issue as IssueWithPage;
    const displayUrl = issueWithPage.pageUrl && issueWithPage.pageUrl !== 'Página Principal' ? 
      (issueWithPage.pageUrl.length > 30 ? issueWithPage.pageUrl.substring(0, 30) + '...' : issueWithPage.pageUrl) : '';
    
    return `
      <div class="issue-item ${typeStyles.bg} ${typeStyles.border} border rounded-lg p-3 hover:border-opacity-50 transition-all" data-category="${issue.category}">
        <div class="flex items-start space-x-2">
          <div class="w-5 h-5 ${typeStyles.icon} rounded-full flex items-center justify-center flex-shrink-0">
            <span class="text-white text-xs font-bold">${typeStyles.iconText}</span>
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-sm ${typeStyles.text} font-medium leading-tight mb-2">${issue.message}</p>
            <div class="flex items-center justify-between text-xs">
              <span class="${priorityColor} font-medium">${issue.priority === 'high' ? 'Alta' : issue.priority === 'medium' ? 'Media' : 'Baja'}</span>
              ${displayUrl ? `<span class="text-gray-500 truncate" title="${issueWithPage.pageUrl}">${displayUrl}</span>` : ''}
            </div>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Get current form state
   */
  getState(): FormState {
    return { ...this.state };
  }

  /**
   * Check if form is currently processing
   */
  isLoading(): boolean {
    return this.state.isLoading;
  }

  /**
   * Get last analyzed URL
   */
  getLastAnalyzedUrl(): string | undefined {
    return this.state.lastAnalyzedUrl;
  }

  /**
   * Update link quality indicator based on link analysis data
   */
  private updateLinkQuality(links: any) {
    const internal = links.internal || 0;
    const external = links.external || 0;
    const broken = links.broken || 0;
    const total = internal + external;

    // Update total count
    this.updateElement('.links-total-count', `${total} total`);

    // Calculate quality status
    let status = 'Evaluando...';
    let badgeText = 'Evaluando...';
    let badgeColor = 'bg-gray-500/20 text-gray-400';
    let iconColor = 'text-accent-green';
    let iconBg = 'bg-accent-green/20';
    let dotColor = 'bg-accent-green';
    let impactText = '';
    let impactLevel = 'neutral';

    if (total === 0) {
      status = 'Sin enlaces detectados';
      badgeText = 'Sin Enlaces';
      badgeColor = 'bg-red-500/20 text-red-400';
      iconColor = 'text-red-400';
      iconBg = 'bg-red-500/20';
      dotColor = 'bg-red-400';
      impactText = 'Los enlaces mejoran significativamente el SEO. Considera agregar enlaces internos y externos relevantes.';
      impactLevel = 'negative';
    } else if (broken > 0) {
      status = `${broken} enlace${broken > 1 ? 's' : ''} roto${broken > 1 ? 's' : ''} detectado${broken > 1 ? 's' : ''}`;
      badgeText = 'Enlaces Rotos';
      badgeColor = 'bg-red-500/20 text-red-400';
      iconColor = 'text-red-400';
      iconBg = 'bg-red-500/20';
      dotColor = 'bg-red-400';
      impactText = 'Los enlaces rotos dañan la experiencia del usuario y el SEO. Repáralos inmediatamente.';
      impactLevel = 'negative';
    } else if (internal === 0) {
      status = 'Faltan enlaces internos';
      badgeText = 'Sin Internos';
      badgeColor = 'bg-yellow-500/20 text-yellow-400';
      iconColor = 'text-yellow-400';
      iconBg = 'bg-yellow-500/20';
      dotColor = 'bg-yellow-400';
      impactText = 'Los enlaces internos distribuyen autoridad y mejoran la navegación. Agrega enlaces a otras páginas.';
      impactLevel = 'warning';
    } else if (external === 0) {
      status = 'Sin enlaces externos';
      badgeText = 'Sin Externos';
      badgeColor = 'bg-yellow-500/20 text-yellow-400';
      iconColor = 'text-yellow-400';
      iconBg = 'bg-yellow-500/20';
      dotColor = 'bg-yellow-400';
      impactText = 'Los enlaces externos a fuentes relevantes mejoran la credibilidad y contexto del contenido.';
      impactLevel = 'warning';
    } else if (internal > 100) {
      status = 'Demasiados enlaces internos';
      badgeText = 'Exceso';
      badgeColor = 'bg-yellow-500/20 text-yellow-400';
      iconColor = 'text-yellow-400';
      iconBg = 'bg-yellow-500/20';
      dotColor = 'bg-yellow-400';
      impactText = 'Muchos enlaces pueden diluir el valor de cada uno. Considera simplificar la navegación.';
      impactLevel = 'warning';
    } else {
      status = 'Estructura de enlaces óptima';
      badgeText = 'Óptimo';
      badgeColor = 'bg-green-500/20 text-green-400';
      iconColor = 'text-green-400';
      iconBg = 'bg-green-500/20';
      dotColor = 'bg-green-400';
      impactText = 'Excelente balance entre enlaces internos y externos. Esto favorece el SEO y la experiencia del usuario.';
      impactLevel = 'positive';
    }

    // Update all UI elements
    this.updateElement('.link-quality-status', status);
    this.updateElement('.link-quality-badge', badgeText);
    this.updateElement('.link-impact-text', impactText);

    // Update badge styling
    const badge = document.querySelector('.link-quality-badge');
    if (badge) {
      badge.setAttribute('class', `px-3 py-1 text-xs font-medium rounded-full ${badgeColor}`);
    }

    // Update main icon and dot
    const icon = document.querySelector('.link-quality-icon');
    const dot = document.querySelector('.link-quality-dot');
    const statusIcon = document.querySelector('.link-quality-status-icon');
    
    if (icon) {
      icon.setAttribute('class', `w-10 h-10 ${iconBg} rounded-lg flex items-center justify-center transition-all duration-300`);
      const iconSvg = icon.querySelector('svg');
      if (iconSvg) {
        iconSvg.setAttribute('class', `w-5 h-5 ${iconColor}`);
      }
    }

    if (dot) {
      dot.setAttribute('class', `w-3 h-3 ${dotColor} rounded-full`);
    }

    if (statusIcon) {
      statusIcon.setAttribute('class', `w-6 h-6 ${iconBg} rounded-full flex items-center justify-center`);
      const statusIconSvg = statusIcon.querySelector('svg');
      if (statusIconSvg) {
        statusIconSvg.setAttribute('class', `w-3 h-3 ${iconColor}`);
      }
    }

    // Update link distribution bars
    this.updateLinkDistributionBars(internal, external, broken, total);

    // Show/hide and style SEO impact section
    const impactSection = document.querySelector('.link-seo-impact');
    if (impactSection && impactText) {
      impactSection.classList.remove('hidden');
      
      let impactBorderColor = 'border-gray-500/20';
      let impactBgColor = 'bg-gray-500/10';
      let impactIconColor = 'text-gray-400';
      let impactIconBg = 'bg-gray-500/20';

      if (impactLevel === 'positive') {
        impactBorderColor = 'border-green-500/20';
        impactBgColor = 'bg-green-500/10';
        impactIconColor = 'text-green-400';
        impactIconBg = 'bg-green-500/20';
      } else if (impactLevel === 'warning') {
        impactBorderColor = 'border-yellow-500/20';
        impactBgColor = 'bg-yellow-500/10';
        impactIconColor = 'text-yellow-400';
        impactIconBg = 'bg-yellow-500/20';
      } else if (impactLevel === 'negative') {
        impactBorderColor = 'border-red-500/20';
        impactBgColor = 'bg-red-500/10';
        impactIconColor = 'text-red-400';
        impactIconBg = 'bg-red-500/20';
      }

      impactSection.setAttribute('class', `link-seo-impact p-3 rounded-lg border ${impactBorderColor} ${impactBgColor}`);
      
      const impactIcon = impactSection.querySelector('.link-impact-icon');
      if (impactIcon) {
        impactIcon.setAttribute('class', `link-impact-icon w-6 h-6 rounded-full flex items-center justify-center ${impactIconBg}`);
        const impactIconSvg = impactIcon.querySelector('svg');
        if (impactIconSvg) {
          impactIconSvg.setAttribute('class', `w-3 h-3 ${impactIconColor}`);
        }
      }
    }

    // Update individual link cards styling based on their values
    this.updateLinkCardStyling(internal, external, broken);
  }

  /**
   * Update link distribution progress bars
   */
  private updateLinkDistributionBars(internal: number, external: number, broken: number, total: number) {
    if (total === 0) return;

    const internalBar = document.querySelector('.internal-links-bar') as HTMLElement;
    const externalBar = document.querySelector('.external-links-bar') as HTMLElement;
    const brokenBar = document.querySelector('.broken-links-bar') as HTMLElement;

    if (internalBar && externalBar && brokenBar) {
      const internalPercent = (internal / total) * 100;
      const externalPercent = (external / total) * 100;
      const brokenPercent = (broken / total) * 100;

      // Use setTimeout for smooth animation
      setTimeout(() => {
        internalBar.style.width = `${internalPercent}%`;
        externalBar.style.width = `${externalPercent}%`;
        externalBar.style.left = `${internalPercent}%`;
        brokenBar.style.width = `${brokenPercent}%`;
      }, 100);
    }
  }

  /**
   * Update individual link card styling based on their status
   */
  private updateLinkCardStyling(internal: number, external: number, broken: number) {
    const internalCard = document.querySelector('.links-internal-card');
    const externalCard = document.querySelector('.links-external-card');
    const brokenCard = document.querySelector('.links-broken-card');

    // Update internal card
    if (internalCard) {
      if (internal === 0) {
        internalCard.classList.add('opacity-60');
        internalCard.classList.remove('border-green-500/20');
        internalCard.classList.add('border-red-500/20');
      } else if (internal > 100) {
        internalCard.classList.remove('opacity-60', 'border-green-500/20');
        internalCard.classList.add('border-yellow-500/20');
      } else {
        internalCard.classList.remove('opacity-60', 'border-red-500/20', 'border-yellow-500/20');
        internalCard.classList.add('border-green-500/20');
      }
    }

    // Update external card
    if (externalCard) {
      if (external === 0) {
        externalCard.classList.add('opacity-60');
        externalCard.classList.remove('border-blue-500/20');
        externalCard.classList.add('border-yellow-500/20');
      } else {
        externalCard.classList.remove('opacity-60', 'border-yellow-500/20');
        externalCard.classList.add('border-blue-500/20');
      }
    }

    // Update broken card
    if (brokenCard) {
      if (broken > 0) {
        brokenCard.classList.add('animate-pulse');
        brokenCard.classList.remove('opacity-60');
      } else {
        brokenCard.classList.remove('animate-pulse');
        brokenCard.classList.add('opacity-60');
      }
    }
  }
}

// Export singleton instance
export const seoFormService = new SEOFormService();