import type { Headings } from '../types/analysis.js';

export function extractHeadings(html: string): Headings {
  return {
    h1: extractHeadingLevel(html, 1),
    h2: extractHeadingLevel(html, 2),
    h3: extractHeadingLevel(html, 3),
    h4: extractHeadingLevel(html, 4),
    h5: extractHeadingLevel(html, 5),
    h6: extractHeadingLevel(html, 6)
  };
}

function extractHeadingLevel(html: string, level: number): string[] {
  if (!html || typeof html !== 'string') {
    return [];
  }
  
  // More robust regex that handles self-closing tags and nested content better
  const regex = new RegExp(`<h${level}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/h${level}>`, 'gi');
  const matches = [];
  let match: RegExpExecArray | null;
  
  while ((match = regex.exec(html)) !== null) {
    const content = match[1];
    if (content) {
      // Remove HTML tags and decode HTML entities, then trim
      const cleanText = content.replace(/<[^>]*>/g, '').replace(/&[#\w]+;/g, ' ').trim();
      if (cleanText.length > 0) {
        matches.push(cleanText);
      }
    }
  }
  
  return matches;
}

export function extractTitle(html: string): string {
  const titleMatch = html.match(/<title[^>]*>(.*?)<\/title>/i);
  return titleMatch ? titleMatch[1].trim() : '';
}

export function extractImages(html: string): { total: number; withAlt: number; withoutAlt: number } {
  if (!html || typeof html !== 'string') {
    return { total: 0, withAlt: 0, withoutAlt: 0 };
  }
  
  const imgMatches = html.match(/<img[^>]*>/gi) || [];
  
  // More robust alt attribute detection - checks for actual content, not just presence
  const imagesWithAlt = imgMatches.filter(img => {
    const altMatch = img.match(/alt\s*=\s*['"]([^'"]*)['"]/i);
    return altMatch && altMatch[1].trim().length > 0;
  });
  
  return {
    total: imgMatches.length,
    withAlt: imagesWithAlt.length,
    withoutAlt: imgMatches.length - imagesWithAlt.length
  };
}

export function hasSSL(url: string): boolean {
  return url.startsWith('https://');
}

export function hasCanonical(html: string): boolean {
  return /<link[^>]*rel\s*=\s*['\"]*\s*canonical\s*['\"]*[^>]*>/i.test(html);
}

export function hasRobotsMeta(html: string): boolean {
  return /<meta[^>]*name=['\"]robots['\"][^>]*>/i.test(html);
}

export function hasSchema(html: string): boolean {
  if (!html || typeof html !== 'string') {
    return false;
  }
  
  // More comprehensive schema detection
  const hasJsonLd = /<script[^>]*type\s*=\s*['\"]application\/ld\+json['\"][^>]*>[\s\S]*?<\/script>/i.test(html);
  const hasMicrodata = /\bitemscope\b|\bitemtype\b|\bitemprop\b/i.test(html);
  const hasSchemaOrg = /https?:\/\/schema\.org\/[a-zA-Z]+/i.test(html);
  
  // Additional checks for common schema patterns
  const hasRDFa = /\btypeof\s*=|property\s*=/i.test(html);
  const hasOpenGraph = /<meta[^>]*property\s*=\s*['\"]og:/i.test(html);
  const hasTwitterCard = /<meta[^>]*name\s*=\s*['\"]twitter:/i.test(html);
  
  return hasJsonLd || hasMicrodata || hasSchemaOrg || hasRDFa || hasOpenGraph || hasTwitterCard;
}

export interface MetaTagsCount {
  seoBasic: {
    title: boolean;
    description: boolean;
    keywords: boolean;
  };
  social: {
    openGraph: boolean;
    twitter: boolean;
  };
  technical: {
    viewport: boolean;
    charset: boolean;
    robots: boolean;
  };
  total: number;
  hasSEOBasics: boolean; // true if has title AND description
}

export function countMetaTags(html: string): MetaTagsCount {
  if (!html || typeof html !== 'string') {
    return {
      seoBasic: {
        title: false,
        description: false,
        keywords: false
      },
      social: {
        openGraph: false,
        twitter: false
      },
      technical: {
        viewport: false,
        charset: false,
        robots: false
      },
      total: 0,
      hasSEOBasics: false
    };
  }

  // Helper function to check if meta tag exists regardless of attribute order or quotes
  const hasMetaTag = (name: string): boolean => {
    const regex = new RegExp(`<meta[^>]*name\\s*=\\s*['\"]?${name}['\"]?[^>]*>`, 'i');
    return regex.test(html);
  };

  const result: MetaTagsCount = {
    seoBasic: {
      title: /<title[^>]*>.*?<\/title>/i.test(html),
      description: hasMetaTag('description'),
      keywords: hasMetaTag('keywords')
    },
    social: {
      openGraph: /<meta[^>]*property\s*=\s*['\"]?og:/i.test(html),
      twitter: hasMetaTag('twitter:') || /<meta[^>]*property\s*=\s*['\"]?twitter:/i.test(html)
    },
    technical: {
      viewport: hasMetaTag('viewport'),
      charset: /<meta[^>]*charset\s*=/i.test(html),
      robots: hasMetaTag('robots')
    },
    total: 0,
    hasSEOBasics: false
  };

  // Count total meta tags
  const metaMatches = html.match(/<meta[^>]*>/gi) || [];
  const titleMatches = html.match(/<title[^>]*>/gi) || [];
  result.total = metaMatches.length + titleMatches.length;

  // Check if has SEO basics (title AND description AND keywords AND social)
  result.hasSEOBasics = result.seoBasic.title && 
                        result.seoBasic.description && 
                        result.seoBasic.keywords && 
                        (result.social.openGraph || result.social.twitter);

  return result;
}