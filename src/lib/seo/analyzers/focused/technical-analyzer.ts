import type { AnalysisContext, AnalysisResult, SEOAnalyzer } from '../../interfaces/analyzers.js';
import type { TechnicalAnalysis } from '../../types/focused-analysis.js';
import { hasSSL, hasCanonical, hasRobotsMeta, hasSchema, countMetaTags } from '../../utils/html-parser.js';
// Robots and sitemap analysis utilities
import { analyzeRobotsTxt, analyzeSitemap } from './utils/robots-sitemap-utils.js';
import { applySEOPenalty } from '../../utils/scoring-utils.js';
// import { SEO_PENALTIES } from '../../constants/scoring.js'; // Unused
import { 
  createErrorIssue, 
  createWarningIssue, 
  createSuccessIssue 
} from '../../utils/issue-factory.js';

export class TechnicalAnalyzer implements SEOAnalyzer {
  async analyze(context: AnalysisContext): Promise<AnalysisResult> {
    const { url, html, response, isMainPage } = context;
    
    let score = 100;
    const issues = [];

    const sslEnabled = hasSSL(url);
    const canonicalExists = hasCanonical(html);
    const robotsMetaExists = hasRobotsMeta(html);
    const schemaExists = hasSchema(html);
    const metaTagsCount = countMetaTags(html);
    


    // HTTPS analysis
    if (!sslEnabled) {
      score = applySEOPenalty(score, 'NO_HTTPS');
      issues.push(createErrorIssue(
        'No usa HTTPS - Riesgo de seguridad y factor de posicionamiento', 
        'technical'
      ));
    } else {
      issues.push(createSuccessIssue('HTTPS habilitado', 'technical'));
    }

    // Canonical URL analysis
    if (!canonicalExists) {
      score = applySEOPenalty(score, 'NO_CANONICAL');
      issues.push(createWarningIssue('Falta la URL canónica', 'medium', 'technical'));
    } else {
      issues.push(createSuccessIssue('URL canónica encontrada', 'technical'));
    }

    // Structured data analysis
    if (!schemaExists) {
      score = applySEOPenalty(score, 'NO_SCHEMA');
      issues.push(createWarningIssue(
        'No se detectaron datos estructurados (JSON-LD)', 
        'medium', 
        'technical'
      ));
    } else {
      issues.push(createSuccessIssue('Datos estructurados detectados', 'technical'));
    }

    // Meta tags analysis
    if (!metaTagsCount.seoBasic.title) {
      score = applySEOPenalty(score, 'TITLE_MISSING');
      issues.push(createErrorIssue('Falta la etiqueta <title>', 'technical'));
    }
    if (!metaTagsCount.seoBasic.description) {
      score = applySEOPenalty(score, 'DESCRIPTION_MISSING');
      issues.push(createErrorIssue('Falta la meta descripción', 'technical'));
    }
    if (!metaTagsCount.seoBasic.keywords) {
      issues.push(createWarningIssue('Falta la etiqueta meta keywords', 'low', 'technical'));
    }
    if (!metaTagsCount.social.openGraph && !metaTagsCount.social.twitter) {
      issues.push(createWarningIssue('No se detectaron meta tags sociales (Open Graph o Twitter)', 'medium', 'technical'));
    }
    
    // Success message if has all SEO basics
    if (metaTagsCount.hasSEOBasics) {
      issues.push(createSuccessIssue('Todos los meta tags SEO básicos están presentes', 'technical'));
    }

    // Analyze robots.txt and sitemap
    let robotsAnalysis = null;
    let sitemapAnalysis = null;
    
    try {
      // Get the base URL for domain-level resources
      const baseUrl = new URL(url).origin;
      
      // Always perform fresh analysis from the domain root
      robotsAnalysis = await analyzeRobotsTxt(baseUrl);
      sitemapAnalysis = await analyzeSitemap(baseUrl, robotsAnalysis?.sitemap || undefined);
      
      // Robots.txt analysis (domain-level)
      if (robotsAnalysis) {
        if (isMainPage) {
          // Only add domain-level issues to main page
          issues.push(...robotsAnalysis.issues);
        }
        
        // Scoring affects all pages
        if (!robotsAnalysis.exists) {
          score = applySEOPenalty(score, 'NO_ROBOTS_TXT');
        } else if (robotsAnalysis.blockAll) {
          score = applySEOPenalty(score, 'ROBOTS_BLOCKS_ALL');
        }
      }

      // Sitemap analysis (page-specific)
      if (sitemapAnalysis) {
        if (isMainPage) {
          // Add general sitemap issues to main page only
          const generalIssues = sitemapAnalysis.issues.filter((issue: any) => 
            !issue.message.includes('URL no encontrada') && 
            !issue.message.includes('página específica')
          );
          issues.push(...generalIssues);
          
          // General sitemap scoring (domain-level)
          if (!sitemapAnalysis.exists) {
            score = applySEOPenalty(score, 'NO_SITEMAP');
          } else if (sitemapAnalysis.totalUrls === 0) {
            score = applySEOPenalty(score, 'EMPTY_SITEMAP');
          }
        }
        
        // Page-specific sitemap check
        if (sitemapAnalysis.exists && sitemapAnalysis.urls) {
          // Check if current URL is in sitemap
          // Parse URLs to normalize them properly
          const normalizeUrlForComparison = (urlStr: string): string => {
            try {
              // Decode any HTML entities that might be in the sitemap
              const decodedUrl = urlStr
                .replace(/&amp;/g, '&')
                .replace(/&lt;/g, '<')
                .replace(/&gt;/g, '>')
                .replace(/&quot;/g, '"')
                .replace(/&#39;/g, "'");
                
              const parsed = new URL(decodedUrl);
              // Normalize: lowercase, remove trailing slash, remove default ports
              let normalized = `${parsed.protocol}//${parsed.hostname}`;
              if (parsed.port && parsed.port !== '80' && parsed.port !== '443') {
                normalized += `:${parsed.port}`;
              }
              // Decode the pathname to handle encoded characters
              const decodedPath = decodeURIComponent(parsed.pathname).replace(/\/$/, '');
              normalized += decodedPath;
              // Add query and hash if present
              if (parsed.search) normalized += parsed.search;
              if (parsed.hash) normalized += parsed.hash;
              return normalized.toLowerCase();
            } catch (e) {
              // Fallback to simple normalization if URL parsing fails
              return urlStr.toLowerCase().replace(/\/$/, '').trim();
            }
          };
          
          const normalizedUrl = normalizeUrlForComparison(url);
          
          
          const isInSitemap = sitemapAnalysis.urls.some((sitemapUrl) => {
            const normalizedSitemapUrl = normalizeUrlForComparison(sitemapUrl.url);
            const match = normalizedSitemapUrl === normalizedUrl;
            
            // Also check if one URL is a variation of the other (with/without www)
            const withoutWww = (u: string) => u.replace(/\/\/www\./i, '//');
            const alternativeMatch = withoutWww(normalizedSitemapUrl) === withoutWww(normalizedUrl);
            
            
            return match || alternativeMatch;
          });
          
          
          if (!isInSitemap) {
            score -= 5; // Minor penalty
            issues.push(createWarningIssue(
              `Esta página no se encuentra en el sitemap del sitio (aunque el sitio sí tiene un sitemap válido)`,
              'medium',
              'technical'
            ));
          } else {
            issues.push(createSuccessIssue(
              `Página correctamente incluida en el sitemap del sitio`,
              'technical'
            ));
          }
        }
      }
    } catch (error) {
      if (isMainPage) {
        // Add error issue to inform user about the failure (only on main page)
        issues.push(createErrorIssue(
          `Error al analizar robots.txt/sitemap: ${error instanceof Error ? error.message : 'Error desconocido'}`,
          'technical'
        ));
      }
    }

    // Calculate hasSitemap value - indicates if the domain has a valid sitemap
    let hasSitemapValue = false;
    
    if (sitemapAnalysis?.exists) {
      // hasSitemap should indicate if there's a valid sitemap for the domain
      // not whether this specific URL is in the sitemap
      hasSitemapValue = true;
    }
    

    const technicalAnalysis: TechnicalAnalysis = {
      hasSSL: sslEnabled,
      hasCanonical: canonicalExists,
      hasRobotsMeta: robotsMetaExists,
      // Robots.txt: Always applies to the entire domain
      hasRobotsTxt: robotsAnalysis?.exists || false,
      // Sitemap: Use pre-calculated value
      hasSitemap: hasSitemapValue,
      hasSchema: schemaExists,
      httpStatus: response.status,
      robotsTxt: isMainPage ? robotsAnalysis : null, // Full details only for main page
      sitemap: isMainPage ? sitemapAnalysis : null,  // Full details only for main page
      metaTagsCount: metaTagsCount,
      score: Math.max(0, score),
      issues,
    };


    return {
      score: technicalAnalysis.score,
      issues: technicalAnalysis.issues,
      data: technicalAnalysis as unknown as Record<string, unknown>
    };
  }
}