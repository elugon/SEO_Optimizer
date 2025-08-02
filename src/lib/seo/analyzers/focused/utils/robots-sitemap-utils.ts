// Robots and sitemap analysis utility functions (extracted from TechnicalAnalyzer)

import type { RobotsAnalysis } from '../../../types/robots.js';
import type { SitemapAnalysis, SitemapUrl, SitemapAnalysisOptions } from '../../../types/sitemap.js';
import type { Issue } from '../../../types/common.js';
import { gunzipSync } from 'zlib';

// Low-value page patterns for sitemap analysis
const LOW_VALUE_PATTERNS = [
  /\/login\b/i,
  /\/register\b/i,
  /\/thank-you\b/i,
  /\/gracias\b/i,
  /\/404\b/i,
  /\/error\b/i,
  /\/print\b/i,
  /\/printer-friendly\b/i,
  /\/account\b/i,
  /\/profile\b/i,
  /\/cart\b/i,
  /\/checkout\b/i,
  /\?sort=/i,
  /\?filter=/i,
  /\?page=/i,
  /search\?.*q=$/i
];

/**
 * Analyze robots.txt file for a given base URL
 */
export async function analyzeRobotsTxt(baseUrl: string): Promise<RobotsAnalysis> {
  try {
    const robotsUrl = new URL('/robots.txt', baseUrl).href;
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    const response = await fetch(robotsUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; SEO-Analyzer/1.0)' },
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);

    if (!response.ok) {
      return {
        exists: false,
        accessible: false,
        content: null,
        issues: [{ 
          type: 'error' as const, 
          message: `Robots.txt no encontrado (HTTP ${response.status})`, 
          priority: 'medium' as const, 
          category: 'technical' as const
        }],
        allowAll: false,
        blockAll: false,
        sitemap: null,
        userAgents: []
      };
    }

    const content = await response.text();
    const lines = content.split('\n').map(line => line.trim()).filter(line => line && !line.startsWith('#'));
    
    const issues: Issue[] = [];
    const userAgents = new Set<string>();
    let sitemap = null;
    let hasDisallowAll = false;
    let hasAllowAll = false;
    let currentUserAgent = '*';
    
    for (const line of lines) {
      const lowerLine = line.toLowerCase();
      
      if (lowerLine.startsWith('user-agent:')) {
        currentUserAgent = line.split(':')[1]?.trim() || '*';
        userAgents.add(currentUserAgent);
      } else if (lowerLine.startsWith('sitemap:')) {
        sitemap = line.substring('sitemap:'.length).trim();
      } else if (lowerLine.startsWith('disallow:')) {
        const disallowValue = line.split(':', 2)[1]?.trim();
        if (disallowValue === '/') {
          hasDisallowAll = true;
        }
      } else if (lowerLine.startsWith('allow:')) {
        const allowValue = line.split(':', 2)[1]?.trim();
        if (allowValue === '/') {
          hasAllowAll = true;
        }
      }
    }

    if (content.length === 0) {
      issues.push({ 
        type: 'warning' as const, 
        message: 'Robots.txt está vacío', 
        priority: 'medium' as const, 
        category: 'technical' as const
      });
    }

    if (hasDisallowAll && !hasAllowAll) {
      issues.push({ 
        type: 'error' as const, 
        message: 'Robots.txt bloquea todo el sitio (Disallow: /)', 
        priority: 'high' as const, 
        category: 'technical' as const
      });
    }

    if (!sitemap) {
      issues.push({ 
        type: 'warning' as const, 
        message: 'No se especifica sitemap en robots.txt', 
        priority: 'medium' as const, 
        category: 'technical' as const
      });
    }

    if (userAgents.size === 0) {
      issues.push({ 
        type: 'warning' as const, 
        message: 'No se encontraron directivas User-agent', 
        priority: 'medium' as const, 
        category: 'technical' as const
      });
    }

    if (issues.length === 0) {
      issues.push({ 
        type: 'success' as const, 
        message: 'Robots.txt configurado correctamente', 
        priority: 'low' as const, 
        category: 'technical' as const
      });
    }

    return {
      exists: true,
      accessible: true,
      content,
      issues,
      allowAll: hasAllowAll,
      blockAll: hasDisallowAll,
      sitemap,
      userAgents: Array.from(userAgents)
    };

  } catch (error) {
    return {
      exists: false,
      accessible: false,
      content: null,
      issues: [{ 
        type: 'error' as const, 
        message: `Error al acceder a robots.txt: ${error instanceof Error ? error.message : 'Error desconocido'}`, 
        priority: 'medium' as const, 
        category: 'technical' as const
      }],
      allowAll: false,
      blockAll: false,
      sitemap: null,
      userAgents: []
    };
  }
}

/**
 * Validates if a date string is in valid ISO 8601 format
 */
function isValidISO8601(dateString: string): boolean {
  const iso8601Regex = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}(:\d{2}(\.\d{3})?)?([+-]\d{2}:\d{2}|Z)?)?$/;
  if (!iso8601Regex.test(dateString)) return false;
  
  const date = new Date(dateString);
  return !isNaN(date.getTime());
}

/**
 * Safely extracts URLs from XML content
 */
function extractUrlsFromXML(content: string): { url: string; lastModified: string | null }[] {
  const urls: { url: string; lastModified: string | null }[] = [];
  
  
  try {
    const urlBlocks = content.split(/<url[^>]*>/i).slice(1);
    
    for (const block of urlBlocks) {
      const endIndex = block.indexOf('</url>');
      if (endIndex === -1) continue;
      
      const urlContent = block.substring(0, endIndex);
      
      const locMatch = urlContent.match(/<loc[^>]*>([^<]+)<\/loc>/i);
      if (!locMatch) continue;
      
      const url = locMatch[1].trim();
      
      const lastModMatch = urlContent.match(/<lastmod[^>]*>([^<]+)<\/lastmod>/i);
      let lastModified: string | null = null;
      
      if (lastModMatch) {
        const dateStr = lastModMatch[1].trim();
        if (isValidISO8601(dateStr)) {
          lastModified = dateStr;
        }
      }
      
      urls.push({ url, lastModified });
    }
  } catch (error) {
    const urlMatches = content.match(/<loc[^>]*>([^<]+)<\/loc>/gi) || [];
    return urlMatches.map((match: string) => ({
      url: match.replace(/<[^>]*>/g, '').trim(),
      lastModified: null as string | null
    }));
  }
  
  return urls;
}

/**
 * Validates if a URL is properly formatted
 */
function isValidUrl(urlString: string): boolean {
  try {
    const url = new URL(urlString);
    return ['http:', 'https:'].includes(url.protocol);
  } catch {
    return false;
  }
}

/**
 * Detects if a URL represents a low-value page
 */
function isLowValuePage(url: string): boolean {
  return LOW_VALUE_PATTERNS.some(pattern => pattern.test(url));
}

/**
 * Fetches content with support for gzip compression
 */
async function fetchSitemapContent(url: string, timeout: number): Promise<{ content: string; isCompressed: boolean }> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(url, {
      headers: { 
        'User-Agent': 'Mozilla/5.0 (compatible; SEO-Analyzer/1.0)',
        'Accept-Encoding': 'gzip, deflate'
      },
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const buffer = await response.arrayBuffer();
    const uint8Array = new Uint8Array(buffer);
    
    const isGzipped = uint8Array[0] === 0x1f && uint8Array[1] === 0x8b;
    
    if (isGzipped) {
      try {
        const decompressed = gunzipSync(Buffer.from(uint8Array));
        return { content: decompressed.toString('utf-8'), isCompressed: true };
      } catch {
        return { content: new TextDecoder().decode(uint8Array), isCompressed: false };
      }
    }
    
    return { content: new TextDecoder().decode(uint8Array), isCompressed: false };
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Analyze sitemap for a given base URL
 */
export async function analyzeSitemap(
  baseUrl: string, 
  robotsSitemap?: string,
  options: SitemapAnalysisOptions = {}
): Promise<SitemapAnalysis> {
  const {
    maxChildSitemaps = 50,
    timeout = 15000,
    childTimeout = 10000,
    maxUrls = 1000,
    detectLowValue = true
  } = options;
  
  const startTime = Date.now();
  
  // Check if baseUrl is already a specific sitemap URL
  const isSpecificSitemap = baseUrl.includes('sitemap') && (
    baseUrl.endsWith('.xml') || 
    baseUrl.endsWith('.xml.gz') || 
    baseUrl.endsWith('.txt')
  );
  
  const sitemapUrls = isSpecificSitemap 
    ? [baseUrl] // Use the specific sitemap URL directly
    : [
        robotsSitemap,
        new URL('/sitemap.xml', baseUrl).href,
        new URL('/sitemap.xml.gz', baseUrl).href,
        new URL('/sitemap_index.xml', baseUrl).href,
        new URL('/sitemap_index.xml.gz', baseUrl).href,
        new URL('/sitemap.txt', baseUrl).href
      ].filter(Boolean).filter(url => isValidUrl(url!));

  for (const sitemapUrl of sitemapUrls) {
    try {
      const { content, isCompressed } = await fetchSitemapContent(sitemapUrl!, timeout);
      
      
      const issues: Issue[] = [];
      let urls: SitemapUrl[] = [];
      let isValidXml = false;
      let lastModified = null;
      let childSitemaps: string[] = [];
      
      const hasXmlDeclaration = content.includes('<?xml');
      const hasUrlset = content.includes('<urlset');
      const hasSitemapIndex = content.includes('<sitemapindex');
      
      if (hasUrlset || hasSitemapIndex) {
        isValidXml = true;
        
        if (!hasXmlDeclaration) {
          issues.push({ 
            type: 'warning' as const, 
            message: 'Sitemap XML no tiene declaración XML', 
            priority: 'low' as const, 
            category: 'technical' as const
          });
        }
        
        if (hasSitemapIndex) {
          const sitemapMatches = content.match(/<loc[^>]*>([^<]+)<\/loc>/gi) || [];
          childSitemaps = sitemapMatches
            .map(match => match.replace(/<[^>]*>/g, '').trim())
            .filter(url => isValidUrl(url))
            .slice(0, maxChildSitemaps);
          
          
          for (const childSitemapUrl of childSitemaps) {
            try {
              const childResult = await analyzeSitemap(childSitemapUrl, undefined, {
                ...options,
                timeout: childTimeout
              });
              urls.push(...childResult.urls);
              issues.push(...childResult.issues);
            } catch (childError) {
              issues.push({ 
                type: 'warning' as const, 
                message: `Error al procesar sitemap hijo ${childSitemapUrl}: ${childError instanceof Error ? childError.message : 'Error desconocido'}`, 
                priority: 'low' as const, 
                category: 'technical' as const
              });
            }
          }
        } else {
          const extractedUrls = extractUrlsFromXML(content);
          urls = extractedUrls.slice(0, maxUrls).map(({ url, lastModified }) => ({
            url,
            lastModified: lastModified as string | null,
            isLowValue: detectLowValue ? isLowValuePage(url) : false
          }));
        }
        
        if (urls.length === 0 && childSitemaps.length === 0) {
          issues.push({ 
            type: 'warning' as const, 
            message: 'Sitemap no contiene URLs', 
            priority: 'medium' as const, 
            category: 'technical' as const
          });
        }
        
        const lowValueUrls = urls.filter(u => u.isLowValue).length;
        if (detectLowValue && lowValueUrls > urls.length * 0.2) {
          issues.push({ 
            type: 'warning' as const, 
            message: `${lowValueUrls} URLs de bajo valor detectadas (login, cart, etc.)`, 
            priority: 'medium' as const, 
            category: 'technical' as const
          });
        }
        
        if (issues.length === 0) {
          issues.push({ 
            type: 'success' as const, 
            message: 'Sitemap configurado correctamente', 
            priority: 'low' as const, 
            category: 'technical' as const
          });
        }
      } else {
        const lines = content.split('\n').filter(line => line.trim());
        urls = lines.slice(0, maxUrls).map(url => ({
          url: url.trim(),
          lastModified: null as string | null,
          isLowValue: detectLowValue ? isLowValuePage(url) : false
        }));
        
        if (urls.length > 0) {
          issues.push({ 
            type: 'warning' as const, 
            message: 'Sitemap en formato texto plano en lugar de XML', 
            priority: 'low' as const, 
            category: 'technical' as const
          });
        }
      }
      
      return {
        exists: true,
        accessible: true,
        isValidXml,
        totalUrls: urls.length,
        urls,
        childSitemaps,
        issues,
        lastModified,
        responseTime: Date.now() - startTime,
        isCompressed,
        lowValueUrls: urls.filter(u => u.isLowValue).length
      };
    } catch (error) {
      continue;
    }
  }
  
  return {
    exists: false,
    accessible: false,
    isValidXml: false,
    totalUrls: 0,
    urls: [],
    childSitemaps: [],
    issues: [{ 
      type: 'error' as const, 
      message: 'Sitemap no encontrado o no accesible', 
      priority: 'high' as const, 
      category: 'technical' as const
    }],
    lastModified: null,
    responseTime: Date.now() - startTime,
    isCompressed: false,
    lowValueUrls: 0
  };
}