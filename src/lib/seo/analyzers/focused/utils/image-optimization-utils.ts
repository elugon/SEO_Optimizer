// Simplified image optimization analysis utilities

import type { ImageAnalysisResult } from '../../../types/image.js';
import { extractMainContent } from '../../../utils/content-utils.js';
import { getImageFormat } from '../../../utils/image-utils.js';

/**
 * Extract alt text data using the same intelligent logic as image optimization
 * This ensures consistency between image counting and alt text analysis
 */
export function extractAltTextIntelligent(html: string, analyzeMainContentOnly: boolean = true): { total: number; withAlt: number; withoutAlt: number } {
  // Use the same content extraction logic
  const contentToAnalyze = analyzeMainContentOnly ? extractMainContent(html) : html;
  const cleanContent = contentToAnalyze.replace(/<noscript[^>]*>[\s\S]*?<\/noscript>/gi, '');
  
  // Extract the same elements as the optimization analysis
  const pictureMatches = cleanContent.match(/<picture[^>]*>[\s\S]*?<\/picture>/gi) || [];
  const allImgMatches = cleanContent.match(/<img[^>]*>/gi) || [];
  
  // Filter standalone images (same logic)
  const standaloneImgMatches = allImgMatches.filter(img => {
    return !pictureMatches.some(picture => picture.includes(img));
  });
  
  // Filter visible elements (same logic)
  const visiblePictureElements = pictureMatches.filter(picture => {
    const styleMatch = picture.match(/style\s*=\s*["']([^"']*)/i);
    if (styleMatch) {
      const style = styleMatch[1].toLowerCase();
      if (style.includes('display') && style.includes('none')) return false;
      if (style.includes('visibility') && style.includes('hidden')) return false;
    }
    if (/aria-hidden\s*=\s*["']true["']/i.test(picture)) return false;
    return true;
  });
  
  const visibleStandaloneImgs = standaloneImgMatches.filter(img => {
    const styleMatch = img.match(/style\s*=\s*["']([^"']*)/i);
    if (styleMatch) {
      const style = styleMatch[1].toLowerCase();
      if (style.includes('display') && style.includes('none')) return false;
      if (style.includes('visibility') && style.includes('hidden')) return false;
    }
    if (/aria-hidden\s*=\s*["']true["']/i.test(img)) return false;
    return true;
  });
  
  let withAlt = 0;
  
  // Check alt text in picture elements (check the img inside each picture)
  visiblePictureElements.forEach(picture => {
    const imgMatch = picture.match(/<img[^>]*>/i);
    if (imgMatch) {
      const altMatch = imgMatch[0].match(/alt\s*=\s*['"]([^'"]*)['\"]/i);
      if (altMatch && altMatch[1].trim().length > 0) {
        withAlt++;
      }
    }
  });
  
  // Check alt text in standalone images
  visibleStandaloneImgs.forEach(img => {
    const altMatch = img.match(/alt\s*=\s*['"]([^'"]*)['\"]/i);
    if (altMatch && altMatch[1].trim().length > 0) {
      withAlt++;
    }
  });
  
  const total = visiblePictureElements.length + visibleStandaloneImgs.length;
  
  
  return {
    total,
    withAlt,
    withoutAlt: total - withAlt
  };
}

/**
 * Analyze basic image optimization for HTML content
 */
export function analyzeAdvancedImageOptimization(html: string, analyzeMainContentOnly: boolean = true): ImageAnalysisResult {
  
  // Decide which HTML content to analyze
  const contentToAnalyze = analyzeMainContentOnly ? extractMainContent(html) : html;
  
  // Remove noscript content to avoid duplicate counting
  const cleanContent = contentToAnalyze.replace(/<noscript[^>]*>[\s\S]*?<\/noscript>/gi, '');
  
  
  // Extract picture elements and standalone img elements
  const pictureMatches = cleanContent.match(/<picture[^>]*>[\s\S]*?<\/picture>/gi) || [];
  const allImgMatches = cleanContent.match(/<img[^>]*>/gi) || [];
  
  // Filter out img elements that are inside picture elements to avoid double counting
  const standaloneImgMatches = allImgMatches.filter(img => {
    return !pictureMatches.some(picture => picture.includes(img));
  });
  
  // Filter out hidden images from both picture and standalone img elements
  const visiblePictureElements = pictureMatches.filter(picture => {
    // Check if picture element itself is hidden
    const styleMatch = picture.match(/style\s*=\s*["']([^"']*)/i);
    if (styleMatch) {
      const style = styleMatch[1].toLowerCase();
      if (style.includes('display') && style.includes('none')) return false;
      if (style.includes('visibility') && style.includes('hidden')) return false;
    }
    
    if (/aria-hidden\s*=\s*["']true["']/i.test(picture)) return false;
    return true;
  });
  
  const visibleStandaloneImgs = standaloneImgMatches.filter(img => {
    // Check for display:none or visibility:hidden in style attribute
    const styleMatch = img.match(/style\s*=\s*["']([^"']*)/i);
    if (styleMatch) {
      const style = styleMatch[1].toLowerCase();
      if (style.includes('display') && style.includes('none')) return false;
      if (style.includes('visibility') && style.includes('hidden')) return false;
    }
    
    // Check for aria-hidden
    if (/aria-hidden\s*=\s*["']true["']/i.test(img)) return false;
    
    return true;
  });
  
  const totalImageElements = visiblePictureElements.length + visibleStandaloneImgs.length;
  
  // Handle case when no images are present
  if (totalImageElements === 0) {
    return {
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
        score: 100, // Perfect score when no images to compress
        issues: []
      },
      criticalImages: {
        aboveTheFold: 0,
        belowTheFold: 0,
        criticalOptimized: 0,
        criticalScore: 100 // Perfect score when no critical images
      },
      optimization: {
        score: 100, // Perfect score when no images to optimize
        issues: [],
        recommendations: [{
          action: 'Considerar agregar imágenes relevantes y optimizadas',
          impact: 'Mejora experiencia del usuario y engagement',
          priority: 'low'
        }]
      }
    };
  }
  
  // 1. Intelligent Modern Format Detection by Image Element
  const modernFormats = {
    webp: 0,
    avif: 0,
    jpeg: 0,
    png: 0,
    gif: 0,
    svg: 0,
    total: totalImageElements,
    modernPercentage: 0
  };
  
  // Analyze picture elements (prioritize modern formats)
  visiblePictureElements.forEach(picture => {
    const sources = picture.match(/<source[^>]*>/gi) || [];
    
    let hasModernFormat = false;
    
    // Check for modern formats first (WebP, AVIF)
    for (const source of sources) {
      // Handle both quoted and unquoted type attributes
      const typeMatch = source.match(/type\s*=\s*(?:["']([^"']*?)["']|([^\s>]+))/i);
      const mimeType = typeMatch ? (typeMatch[1] || typeMatch[2])?.toLowerCase() : '';
      
      if (mimeType) {
        if (mimeType.includes('webp')) {
          modernFormats.webp++;
          hasModernFormat = true;
          break;
        }
        if (mimeType.includes('avif')) {
          modernFormats.avif++;
          hasModernFormat = true;
          break;
        }
      }
    }
    
    // If no modern format found, check fallback img src
    if (!hasModernFormat) {
      // Handle both quoted and unquoted src attributes in fallback img
      const imgMatch = picture.match(/<img[^>]*src\s*=\s*(?:["']([^"']*?)["']|([^\s>]+))/i);
      const fallbackSrc = imgMatch ? (imgMatch[1] || imgMatch[2]) : '';
      if (fallbackSrc) {
        const format = getImageFormat(fallbackSrc);
        switch (format) {
          case 'jpeg':
            modernFormats.jpeg++;
            break;
          case 'png':
            modernFormats.png++;
            break;
          case 'gif':
            modernFormats.gif++;
            break;
          case 'svg':
            modernFormats.svg++;
            break;
        }
      }
    }
  });
  
  // Analyze standalone img elements
  visibleStandaloneImgs.forEach(img => {
    // Handle both quoted and unquoted src attributes
    const srcMatch = img.match(/src\s*=\s*(?:["']([^"']*?)["']|([^\s>]+))/i);
    const srcUrl = srcMatch ? (srcMatch[1] || srcMatch[2]) : '';
    if (srcUrl) {
      const format = getImageFormat(srcUrl);
      switch (format) {
        case 'webp':
          modernFormats.webp++;
          break;
        case 'avif':
          modernFormats.avif++;
          break;
        case 'jpeg':
          modernFormats.jpeg++;
          break;
        case 'png':
          modernFormats.png++;
          break;
        case 'gif':
          modernFormats.gif++;
          break;
        case 'svg':
          modernFormats.svg++;
          break;
      }
    }
  });
  
  const modernCount = modernFormats.webp + modernFormats.avif;
  modernFormats.modernPercentage = modernFormats.total > 0 ? 
    Math.round((modernCount / modernFormats.total) * 100) : 0;
  
  
  // 2. Compression Analysis
  const compressionIssues: Array<{type: string; message: string; severity: string}> = [];
  let compressionScore = 100;
  
  // Check for unoptimized format usage
  if (modernFormats.png > modernFormats.webp && modernFormats.png > 3) {
    compressionScore -= 20;
    compressionIssues.push({
      type: 'format_optimization',
      message: `${modernFormats.png} imágenes PNG detectadas. Considera WebP para mejor compresión`,
      severity: 'medium'
    });
  }
  
  if (modernFormats.jpeg > modernFormats.webp && modernFormats.jpeg > 5) {
    compressionScore -= 15;
    compressionIssues.push({
      type: 'format_optimization', 
      message: `${modernFormats.jpeg} imágenes JPEG detectadas. WebP ofrece 25-30% mejor compresión`,
      severity: 'medium'
    });
  }
  
  // Check for responsive images using new element-based counting
  const responsiveImages = visiblePictureElements.length + visibleStandaloneImgs.filter(img => {
    const hasSrcset = /\bsrcset\s*=/i.test(img);
    const hasSizes = /\bsizes\s*=/i.test(img);
    
    // Consider responsive if has both srcset AND sizes
    return hasSrcset && hasSizes;
  }).length;
  
  if (responsiveImages < totalImageElements && totalImageElements > 0) {
    const nonResponsiveCount = totalImageElements - responsiveImages;
    compressionScore -= Math.min(25, nonResponsiveCount * 3);
    compressionIssues.push({
      type: 'responsive_missing',
      message: `${nonResponsiveCount} imágenes sin atributos srcset/sizes para optimización responsive`,
      severity: 'high'
    });
  }
  
  
  // Basic critical images analysis (simple assumption)
  const criticalImages = {
    aboveTheFold: Math.min(2, totalImageElements), // Assume first 2 images are above fold
    belowTheFold: Math.max(0, totalImageElements - 2),
    criticalOptimized: 0,
    criticalScore: 100
  };
  
  // Calculate overall optimization score based on format usage only
  // Compression penalties are handled separately via compression.issues
  let optimizationScore = 100;
  const optimizationIssues: Array<{type: string; message: string; priority: string}> = [];
  
  // Modern formats penalty
  if (modernFormats.modernPercentage < 30 && modernFormats.total > 2) {
    optimizationScore -= 30;
    optimizationIssues.push({
      type: 'optimization',
      message: `Solo ${modernFormats.modernPercentage}% usan formatos modernos (WebP/AVIF)`,
      priority: 'high'
    });
  } else if (modernFormats.modernPercentage < 50 && modernFormats.total > 1) {
    optimizationScore -= 15;
    optimizationIssues.push({
      type: 'optimization',
      message: `${modernFormats.modernPercentage}% de imágenes usan formatos modernos, se recomienda más del 50%`,
      priority: 'medium'
    });
  }
  
  const recommendations = [];
  if (modernFormats.modernPercentage < 50) {
    recommendations.push({
      action: 'Convertir imágenes a formatos modernos (WebP/AVIF)',
      impact: 'Reducción de 25-50% en tamaño de archivo',
      priority: 'high' as const
    });
  }
  
  
  return {
    modernFormats,
    compression: {
      score: compressionScore,
      issues: compressionIssues
    },
    criticalImages,
    optimization: {
      score: Math.max(0, Math.round(optimizationScore)),
      issues: optimizationIssues,
      recommendations
    }
  };
}