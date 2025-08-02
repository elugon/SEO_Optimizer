// Image utilities for optimization analysis

/**
 * Extract image format from URL or data URI
 */
export function getImageFormat(src: string): string {
  if (!src) return '';
  
  // Handle data URIs (e.g., "data:image/webp;base64,...")
  if (src.startsWith('data:image/')) {
    const formatMatch = src.match(/data:image\/([^;]+)/);
    return formatMatch ? formatMatch[1].toLowerCase() : '';
  }
  
  // Clean URL: remove query parameters and fragments
  const cleanUrl = src.split('?')[0].split('#')[0].toLowerCase();
  
  // Extract file extension
  const extensionMatch = cleanUrl.match(/\.([a-z0-9]+)$/);
  if (!extensionMatch) return '';
  
  const extension = extensionMatch[1];
  
  // Normalize common format variations
  switch (extension) {
    case 'jpg':
    case 'jpeg':
      return 'jpeg';
    case 'webp':
      return 'webp';
    case 'avif':
      return 'avif';
    case 'png':
      return 'png';
    case 'gif':
      return 'gif';
    case 'svg':
      return 'svg';
    default:
      return extension;
  }
}