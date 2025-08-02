// Content extraction utilities

/**
 * Extract main content excluding header/footer/nav
 */
export function extractMainContent(html: string): string {
  if (!html || html.length === 0) return html;
  
  try {
    // First, try to find explicit main content containers
    const mainContentSelectors = [
      /<main[\s\S]*?<\/main>/gi,
      /<article[\s\S]*?<\/article>/gi,
      /<div[^>]*(?:class|id)\s*=\s*["'][^"']*(?:content|main|primary|page-content|main-content)[^"']*["'][\s\S]*?<\/div>/gi,
      /<section[^>]*(?:class|id)\s*=\s*["'][^"']*(?:content|main|primary|page-content|main-content)[^"']*["'][\s\S]*?<\/section>/gi
    ];
    
    for (const selector of mainContentSelectors) {
      const matches = html.match(selector);
      if (matches && matches.length > 0) {
        // Return the first (and likely most comprehensive) main content match
        return matches[0];
      }
    }
    
    // Fallback: Remove known header/footer/nav elements
    let cleanHtml = html;
    
    // Remove header elements
    cleanHtml = cleanHtml.replace(/<header[\s\S]*?<\/header>/gi, '');
    
    // Remove footer elements  
    cleanHtml = cleanHtml.replace(/<footer[\s\S]*?<\/footer>/gi, '');
    
    // Remove navigation elements
    cleanHtml = cleanHtml.replace(/<nav[\s\S]*?<\/nav>/gi, '');
    
    // Remove elements with header/footer/nav classes (more conservative)
    cleanHtml = cleanHtml.replace(/<(?:div|section|aside)[^>]*(?:class|id)\s*=\s*["'][^"']*(?:header|footer|navigation|navbar|nav-bar|site-header|site-footer)[^"']*["'][\s\S]*?<\/(?:div|section|aside)>/gi, '');
    
    // If we removed too much content (>70% of original), return original
    // This threshold is more conservative to preserve legitimate content
    if (cleanHtml.length < html.length * 0.3) {
      return html;
    }
    
    return cleanHtml;
    
  } catch (error) {
    // If any error occurs, return original HTML safely
    return html;
  }
}

/**
 * Extract and clean content text for keyword analysis
 */
export function extractContentText(html: string): {
  title: string;
  h1: string;
  h2: string;
  body: string;
  fullText: string;
  wordCount: number;
} {
  // Remove scripts, styles, navigation, and other non-content elements
  let cleanHtml = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, '')
    .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, '')
    .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '');
  
  // Extract text from different sections with specific weights
  const titleText = (html.match(/<title[^>]*>(.*?)<\/title>/i)?.[1] || '').replace(/<[^>]*>/g, '');
  const h1Text = (html.match(/<h1[^>]*>(.*?)<\/h1>/gi) || []).map((h: string) => h.replace(/<[^>]*>/g, '')).join(' ');
  const h2Text = (html.match(/<h2[^>]*>(.*?)<\/h2>/gi) || []).map((h: string) => h.replace(/<[^>]*>/g, '')).join(' ');
  
  // Extract body text
  const bodyText = cleanHtml.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  
  return {
    title: titleText,
    h1: h1Text,
    h2: h2Text,
    body: bodyText,
    fullText: `${titleText} ${h1Text} ${h2Text} ${bodyText}`.toLowerCase(),
    wordCount: bodyText ? bodyText.split(/\s+/).filter(word => word.length > 0).length : 0
  };
}

/**
 * Emoji detection function
 */
export function hasEmojis(text: string): boolean {
  if (!text || typeof text !== 'string') {
    return false;
  }
  
  // Updated comprehensive emoji regex for better detection including newer ranges
  const emojiRegex = /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F900}-\u{1F9FF}]|[\u{1FA70}-\u{1FAFF}]/u;
  return emojiRegex.test(text);
}

/**
 * Symbol detection function - detects all special symbols that could affect SEO
 */
export function hasSpecialSymbols(text: string): { 
  hasSymbols: boolean; 
  symbols: string[]; 
  symbolCount: number;
  categories: { name: string; symbols: string[] }[] 
} {
  // Comprehensive regex to detect special symbols (excluding basic punctuation and accented characters)
  const symbolRegex = /[^\w\sáéíóúüñÁÉÍÓÚÜÑ.,;:!?¿¡()-]/g;
  const matches = text.match(symbolRegex) || [];
  const uniqueSymbols = [...new Set(matches)];
  
  // Categorize symbols for better user understanding
  const categories = [];
  const mathSymbols = uniqueSymbols.filter(s => ['+', '-', '=', '*', '/', '%', '^', '<', '>'].includes(s));
  const currencySymbols = uniqueSymbols.filter(s => ['$', '€', '£', '¥', '₹', '₽'].includes(s));
  const techSymbols = uniqueSymbols.filter(s => ['#', '@', '&', '|', '\\', '~', '`'].includes(s));
  const bracketsSymbols = uniqueSymbols.filter(s => ['{', '}', '[', ']'].includes(s));
  const otherSymbols = uniqueSymbols.filter(s => 
    ![...mathSymbols, ...currencySymbols, ...techSymbols, ...bracketsSymbols].includes(s)
  );
  
  if (mathSymbols.length > 0) {
    categories.push({ name: 'matemáticos', symbols: mathSymbols });
  }
  if (currencySymbols.length > 0) {
    categories.push({ name: 'moneda', symbols: currencySymbols });
  }
  if (techSymbols.length > 0) {
    categories.push({ name: 'técnicos', symbols: techSymbols });
  }
  if (bracketsSymbols.length > 0) {
    categories.push({ name: 'corchetes/llaves', symbols: bracketsSymbols });
  }
  if (otherSymbols.length > 0) {
    categories.push({ name: 'otros', symbols: otherSymbols });
  }
  
  return {
    hasSymbols: uniqueSymbols.length > 0,
    symbols: uniqueSymbols,
    symbolCount: matches.length,
    categories
  };
}