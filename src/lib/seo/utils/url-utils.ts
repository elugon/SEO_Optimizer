// URL utilities for SEO analysis

/**
 * Normalize URL with validation
 */
export function normalizeUrl(url: string): string {
  try {
    url = url.trim();
    
    // Remove common prefixes that users might include
    url = url.replace(/^(www\.|https?:\/\/)/, '');
    
    // Add https protocol
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
    }
    
    // Basic URL validation
    const urlObj = new URL(url);
    
    // Check for valid hostname
    if (!urlObj.hostname || urlObj.hostname.length < 3) {
      throw new Error('Hostname inválido');
    }
    
    // Check for valid TLD
    if (!urlObj.hostname.includes('.')) {
      throw new Error('Dominio inválido - debe incluir TLD');
    }
    
    return urlObj.href;
  } catch (error) {
    throw new Error(`URL inválida: ${error instanceof Error ? error.message : 'Formato incorrecto'}`);
  }
}

