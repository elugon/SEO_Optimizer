import type { AnalysisContext, AnalysisResult, SEOAnalyzer } from '../../interfaces/analyzers.js';
import type { LinksAnalysis } from '../../types/focused-analysis.js';
import { normalizeUrl } from '../../utils/url-utils.js';
import { CONFIG } from '../../config/index.js';
import { 
  createWarningIssue, 
  createSuccessIssue,
  createInfoIssue 
} from '../../utils/issue-factory.js';

export class LinksAnalyzer implements SEOAnalyzer {
  async analyze(context: AnalysisContext): Promise<AnalysisResult> {
    const { url, html, isMainPage } = context;
    
    let score = 100;
    const issues = [];

    const domain = new URL(url).hostname;
    
    // First, find all <a> tags
    const linkMatches = html.match(/<a\s+[^>]*>/gi) || [];
    
    // Also check for href attributes that might not be in standard <a> tags
    
    
    let internal = 0;
    let external = 0;
    const internalUrls: string[] = [];
    
    
    
    // Extract internal links (only for main page)
    if (isMainPage) {
      const internalUrlsSet = new Set<string>();
      
      linkMatches.forEach((link) => {
        // Extract href value - improved regex to handle various formats
        const hrefMatch = link.match(/href\s*=\s*["']([^"']+)["']|href\s*=\s*([^\s>]+)/i);
        if (hrefMatch) {
          const href = (hrefMatch[1] || hrefMatch[2] || '').trim();
          
          
          if (!href || href.startsWith('#') || href.startsWith('javascript:') || 
              href.startsWith('mailto:') || href.startsWith('tel:')) {
            return;
          }
          
          try {
            if (href.startsWith('http')) {
              const linkDomain = new URL(href).hostname;
              if (linkDomain === domain) {
                internal++;
                internalUrlsSet.add(href);
              } else {
                external++;
              }
            } else {
              // Convert relative URLs to absolute
              const absoluteUrl = new URL(href, url).href;
              internal++;
              internalUrlsSet.add(absoluteUrl);
            }
          } catch (e) {
            // Skip malformed URLs
          }
        }
      });
      
      // Filter out the main page URL and deduplicate URLs with/without trailing slash
      const normalizedMainUrl = normalizeUrl(url);
      const deduplicatedUrlsMap = new Map<string, string>();
      
      Array.from(internalUrlsSet).forEach(internalUrl => {
        const normalizedInternalUrl = normalizeUrl(internalUrl);
        // Skip if it's the main page URL
        if (normalizedInternalUrl === normalizedMainUrl) return;
        
        // Create a cache key without trailing slash for deduplication
        const urlObj = new URL(normalizedInternalUrl);
        const pathWithoutTrailingSlash = urlObj.pathname.replace(/\/$/, '') || '/';
        const deduplicationKey = `${urlObj.protocol}//${urlObj.host}${pathWithoutTrailingSlash}${urlObj.search}${urlObj.hash}`;
        
        // Keep the first occurrence of each URL (preferring without trailing slash)
        if (!deduplicatedUrlsMap.has(deduplicationKey)) {
          deduplicatedUrlsMap.set(deduplicationKey, normalizedInternalUrl);
        }
      });
      
      const finalUrls = Array.from(deduplicatedUrlsMap.values()).slice(0, CONFIG.MAX_INTERNAL_URLS);
      internalUrls.push(...finalUrls);
      
      
    } else {
      // For non-main pages, just count links
      linkMatches.forEach(link => {
        const hrefMatch = link.match(/href\s*=\s*["']([^"']+)["']|href\s*=\s*([^\s>]+)/i);
        if (hrefMatch) {
          const href = (hrefMatch[1] || hrefMatch[2] || '').trim();
          if (href.startsWith('#') || href.startsWith('javascript:') || href.startsWith('mailto:')) {
            return;
          }
          
          if (href.startsWith('http')) {
            const linkDomain = new URL(href).hostname;
            if (linkDomain === domain) internal++;
            else external++;
          } else {
            internal++;
          }
        }
      });
    }

    // Link analysis
    const totalLinks = internal + external;
    
    if (totalLinks === 0) {
      score -= 5;
      issues.push(createWarningIssue(
        'No se encontraron enlaces en la página',
        'low'
      ));
    } else if (internal === 0) {
      score -= 3;
      issues.push(createWarningIssue(
        'No se encontraron enlaces internos. Considera agregar enlaces a otras páginas del sitio',
        'medium'
      ));
    } else if (external === 0) {
      issues.push(createInfoIssue(
        'No se encontraron enlaces externos. Considera agregar enlaces a fuentes relevantes'
      ));
    } else {
      issues.push(createSuccessIssue(
        `Buena estructura de enlaces: ${internal} internos, ${external} externos`
      ));
    }

    if (internal > 100) {
      score -= 2;
      issues.push(createWarningIssue(
        `Muchos enlaces internos (${internal}). Considera simplificar la navegación`,
        'low'
      ));
    }

    if (isMainPage && internalUrls.length > 0) {
      issues.push(createSuccessIssue(
        `Se encontraron ${internalUrls.length} URLs internas para análisis`
      ));
    }

    const linksAnalysis: LinksAnalysis = {
      internal,
      external,
      broken: 0, // Not implemented in current analysis
      redirects: 0, // Not implemented in current analysis
      brokenLinks: [], // Not implemented in current analysis
      redirectChains: [], // Not implemented in current analysis
      internalUrls: isMainPage ? internalUrls : [],
      score: Math.max(0, score),
      issues
    };

    return {
      score: linksAnalysis.score,
      issues: linksAnalysis.issues,
      data: linksAnalysis as unknown as Record<string, unknown>
    };
  }
}