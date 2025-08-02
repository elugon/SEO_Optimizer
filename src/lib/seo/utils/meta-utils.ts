// Meta tag extraction utilities

/**
 * Enhanced meta description detection
 */
export function extractMetaDescription(html: string): string {
  const patterns = [
    /content="([^"]*)"[^>]*name=description/i,
    /name=["']description["'][^>]*content=["']([^"']*)/i,
    /name=description[^>]*content=["']([^"']*)/i,
    /content=["']([^"']*)[^>]*name=["']description/i,
    /property=["']og:description["'][^>]*content=["']([^"']*)/i,
    /content=["']([^"']*)[^>]*property=["']og:description/i,
    /name=["']twitter:description["'][^>]*content=["']([^"']*)/i,
    /content=["']([^"']*)[^>]*name=["']twitter:description/i,
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match && match[1] && match[1].trim()) {
      return match[1].trim();
    }
  }
  return '';
}

/**
 * Enhanced meta keywords extraction with validation and processing
 */
export function extractEnhancedMetaKeywords(html: string): {
  raw: string;
  processed: string[];
  count: number;
  isValid: boolean;
} {
  const patterns = [
    /content="([^"]*)"[^>]*name=["']?keywords["']?/i,
    /name=["']?keywords["']?[^>]*content="([^"]*)"/i,
    /content='([^']*)'[^>]*name=["']?keywords["']?/i,
    /name=["']?keywords["']?[^>]*content='([^']*)'/i
  ];
  
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match && match[1] && match[1].trim()) {
      const rawKeywords = match[1].trim();
      
      // Process and clean keywords
      const processedKeywords = rawKeywords
        .split(/[,;|]/) // Support multiple separators
        .map(keyword => keyword.trim())
        .filter(keyword => keyword.length > 0 && keyword.length <= 50) // Filter valid length
        .map(keyword => keyword.toLowerCase())
        .filter((keyword, index, arr) => arr.indexOf(keyword) === index); // Remove duplicates
      
      return {
        raw: rawKeywords,
        processed: processedKeywords,
        count: processedKeywords.length,
        isValid: processedKeywords.length > 0 && processedKeywords.length <= 20
      };
    }
  }
  
  return {
    raw: '',
    processed: [],
    count: 0,
    isValid: false
  };
}