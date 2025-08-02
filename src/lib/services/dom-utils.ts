/**
 * DOM utility functions for client-side operations
 * Extracted from components for better reusability
 */

export interface DOMElements {
  container?: HTMLElement | null;
  section?: HTMLElement | null;
  summaryPages?: HTMLElement | null;
  summaryAvgScore?: HTMLElement | null;
  summaryIssues?: HTMLElement | null;
  prevButton?: HTMLButtonElement | null;
  nextButton?: HTMLButtonElement | null;
  pageNumbers?: HTMLElement | null;
  downloadButton?: HTMLButtonElement | null;
  [key: string]: HTMLElement | HTMLButtonElement | null | undefined;
}

export class DOMUtils {
  /**
   * Find and validate required DOM elements
   */
  static findElements(elementIds: Record<string, string>): DOMElements {
    const elements: DOMElements = {};
    
    for (const [key, id] of Object.entries(elementIds)) {
      const element = document.getElementById(id);
      if (element) {
        elements[key as keyof DOMElements] = element as any;
      }
    }
    
    return elements;
  }

  /**
   * Show/hide element with transition
   */
  static toggleVisibility(element: HTMLElement | null | undefined, show: boolean, className: string = 'hidden'): void {
    if (!element) return;
    
    if (show) {
      element.classList.remove(className);
    } else {
      element.classList.add(className);
    }
  }

  /**
   * Update text content safely
   */
  static updateText(element: HTMLElement | null | undefined, text: string | number): void {
    if (element) {
      element.textContent = String(text);
    }
  }

  /**
   * Update HTML content safely
   */
  static updateHTML(element: HTMLElement | null | undefined, html: string): void {
    if (element) {
      element.innerHTML = html;
    }
  }

  /**
   * Scroll element into view smoothly
   */
  static scrollIntoView(element: HTMLElement | null | undefined, behavior: ScrollBehavior = 'smooth'): void {
    if (!element) return;
    element.scrollIntoView({ behavior, block: 'start' });
  }

  /**
   * Update button state
   */
  static updateButtonState(button: HTMLButtonElement | null | undefined, disabled: boolean, text?: string): void {
    if (button) {
      button.disabled = disabled;
      if (text) {
        button.textContent = text;
      }
    }
  }

  /**
   * Create and trigger download
   */
  static downloadFile(content: string, filename: string, mimeType: string = 'text/plain'): void {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    
    link.href = url;
    link.download = filename;
    link.style.display = 'none';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    URL.revokeObjectURL(url);
  }

  /**
   * Generate pagination HTML
   */
  static generatePaginationHTML(currentPage: number, totalPages: number): string {
    // Use mobile-optimized version that handles both mobile and desktop
    return this.generateMobilePaginationHTML(currentPage, totalPages);
  }

  /**
   * Debounce function execution
   */
  static debounce<T extends (...args: any[]) => any>(
    func: T,
    wait: number
  ): T {
    let timeout: NodeJS.Timeout;
    return ((...args: any[]) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(this, args), wait);
    }) as T;
  }

  /**
   * Check if element is visible in viewport
   */
  static isInViewport(element: HTMLElement): boolean {
    const rect = element.getBoundingClientRect();
    return (
      rect.top >= 0 &&
      rect.left >= 0 &&
      rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
      rect.right <= (window.innerWidth || document.documentElement.clientWidth)
    );
  }

  /**
   * Add event listener with cleanup
   */
  static addEventListenerWithCleanup(
    element: HTMLElement,
    event: string,
    handler: EventListener,
    options?: AddEventListenerOptions
  ): () => void {
    element.addEventListener(event, handler, options);
    return () => element.removeEventListener(event, handler, options);
  }

  /**
   * Create enhanced loading skeleton HTML for page cards
   */
  static createLoadingSkeleton(count: number): string {
    let html = '';
    for (let i = 0; i < count; i++) {
      html += `
        <div class="skeleton-card relative bg-gradient-to-br from-white to-gray-50 dark:from-gray-900 dark:to-gray-800 border border-gray-200/50 dark:border-gray-700/50 rounded-xl shadow-md overflow-hidden">
          <!-- Enhanced shimmer effect -->
          <div class="absolute inset-0 -translate-x-full">
            <div class="h-full w-full bg-gradient-to-r from-transparent via-white/10 dark:via-gray-400/10 to-transparent shimmer"></div>
          </div>
          
          <!-- Card content skeleton -->
          <div class="relative p-4 sm:p-6">
            <!-- Header section -->
            <div class="flex flex-col sm:flex-row sm:items-start sm:justify-between mb-4">
              <div class="flex items-center space-x-3 sm:space-x-4 mb-3 sm:mb-0">
                <!-- Score circle placeholder -->
                <div class="flex-shrink-0">
                  <div class="w-12 h-12 sm:w-14 sm:h-14 bg-gray-300 dark:bg-gray-700 rounded-full animate-pulse"></div>
                </div>
                <!-- Title and URL placeholders -->
                <div class="flex-1 min-w-0">
                  <div class="h-4 sm:h-5 bg-gray-300 dark:bg-gray-700 rounded mb-2 w-3/4 animate-pulse"></div>
                  <div class="h-3 sm:h-4 bg-gray-300 dark:bg-gray-700 rounded w-1/2 animate-pulse"></div>
                </div>
              </div>
              <!-- Badge placeholder -->
              <div class="h-6 bg-gray-300 dark:bg-gray-700 rounded-full w-16 animate-pulse"></div>
            </div>
            
            <!-- Description placeholder -->
            <div class="space-y-2 mb-4">
              <div class="h-3 bg-gray-300 dark:bg-gray-700 rounded animate-pulse"></div>
              <div class="h-3 bg-gray-300 dark:bg-gray-700 rounded w-5/6 animate-pulse"></div>
            </div>
            
            <!-- Quick metrics grid -->
            <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 mb-4">
              <div class="bg-gray-200 dark:bg-gray-800 rounded-lg p-2">
                <div class="h-3 bg-gray-300 dark:bg-gray-700 rounded mb-1 animate-pulse"></div>
                <div class="h-4 bg-gray-300 dark:bg-gray-700 rounded animate-pulse"></div>
              </div>
              <div class="bg-gray-200 dark:bg-gray-800 rounded-lg p-2">
                <div class="h-3 bg-gray-300 dark:bg-gray-700 rounded mb-1 animate-pulse"></div>
                <div class="h-4 bg-gray-300 dark:bg-gray-700 rounded animate-pulse"></div>
              </div>
              <div class="bg-gray-200 dark:bg-gray-800 rounded-lg p-2">
                <div class="h-3 bg-gray-300 dark:bg-gray-700 rounded mb-1 animate-pulse"></div>
                <div class="h-4 bg-gray-300 dark:bg-gray-700 rounded animate-pulse"></div>
              </div>
              <div class="bg-gray-200 dark:bg-gray-800 rounded-lg p-2">
                <div class="h-3 bg-gray-300 dark:bg-gray-700 rounded mb-1 animate-pulse"></div>
                <div class="h-4 bg-gray-300 dark:bg-gray-700 rounded animate-pulse"></div>
              </div>
            </div>
            
            <!-- Bottom section -->
            <div class="flex items-center justify-between">
              <div class="flex items-center space-x-3 sm:space-x-4">
                <div class="h-4 bg-gray-300 dark:bg-gray-700 rounded w-12 animate-pulse"></div>
                <div class="h-4 bg-gray-300 dark:bg-gray-700 rounded w-12 animate-pulse"></div>
                <div class="h-4 bg-gray-300 dark:bg-gray-700 rounded w-12 animate-pulse"></div>
              </div>
              <div class="h-7 sm:h-8 bg-gray-300 dark:bg-gray-700 rounded-lg w-20 sm:w-24 animate-pulse"></div>
            </div>
          </div>
        </div>
      `;
    }
    return html;
  }
  
  /**
   * Create mobile-optimized pagination
   */
  static generateMobilePaginationHTML(currentPage: number, totalPages: number): string {
    if (totalPages <= 1) return '';

    const isMobile = window.innerWidth < 640;
    const maxVisible = isMobile ? 3 : 5;
    
    let html = '';
    let startPage = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    let endPage = Math.min(totalPages, startPage + maxVisible - 1);

    // Adjust start if we're near the end
    if (endPage - startPage < maxVisible - 1) {
      startPage = Math.max(1, endPage - maxVisible + 1);
    }

    // Mobile: Show fewer page numbers, more emphasis on prev/next
    if (isMobile) {
      // Add first page if not visible
      if (startPage > 1) {
        html += `<button class="page-btn px-2 py-1 text-sm border rounded ${1 === currentPage ? 'bg-blue-600 text-white' : 'bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300'}" data-page="1">1</button>`;
        if (startPage > 2) {
          html += '<span class="px-1 text-gray-500 text-sm">...</span>';
        }
      }

      // Current page area
      for (let i = startPage; i <= endPage; i++) {
        const isActive = i === currentPage;
        html += `<button class="page-btn px-2 py-1 text-sm border rounded ${isActive ? 'bg-blue-600 text-white border-blue-600' : 'bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'}" data-page="${i}">${i}</button>`;
      }

      // Add last page if not visible
      if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
          html += '<span class="px-1 text-gray-500 text-sm">...</span>';
        }
        html += `<button class="page-btn px-2 py-1 text-sm border rounded ${totalPages === currentPage ? 'bg-blue-600 text-white' : 'bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300'}" data-page="${totalPages}">${totalPages}</button>`;
      }
    } else {
      // Desktop: Generate desktop pagination directly (avoid recursion)
      // Add first page if not visible
      if (startPage > 1) {
        html += `<button class="page-btn px-3 py-2 text-sm border rounded ${1 === currentPage ? 'bg-blue-600 text-white border-blue-600' : 'bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'}" data-page="1">1</button>`;
        if (startPage > 2) {
          html += '<span class="px-2 text-gray-500">...</span>';
        }
      }

      // Page numbers
      for (let i = startPage; i <= endPage; i++) {
        const isActive = i === currentPage;
        html += `<button class="page-btn px-3 py-2 text-sm border rounded ${isActive ? 'bg-blue-600 text-white border-blue-600' : 'bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'}" data-page="${i}">${i}</button>`;
      }

      // Add last page if not visible
      if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
          html += '<span class="px-2 text-gray-500">...</span>';
        }
        html += `<button class="page-btn px-3 py-2 text-sm border rounded ${totalPages === currentPage ? 'bg-blue-600 text-white border-blue-600' : 'bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'}" data-page="${totalPages}">${totalPages}</button>`;
      }
    }

    return html;
  }
}