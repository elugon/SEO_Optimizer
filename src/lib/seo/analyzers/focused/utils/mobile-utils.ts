// Mobile analysis utility functions

/**
 * Detecta y extrae el contenido del meta viewport de manera robusta
 * Maneja múltiples casos edge como orden de atributos, tipos de comillas, espacios, etc.
 */
export function detectViewport(html: string): {
  hasViewport: boolean;
  viewportContent: string;
  viewportTag: string;
} {
  // Regex más robusta que maneja múltiples casos
  // Busca la etiqueta meta completa primero
  const metaTagRegex = /<meta\s+([^>]+)>/gi;
  const matches = Array.from(html.matchAll(metaTagRegex));
  
  for (const match of matches) {
    const attributes = match[1];
    
    // Verificar si es un viewport meta tag
    const nameMatch = attributes.match(/name\s*=\s*["']?\s*viewport\s*["']?/i);
    if (!nameMatch) continue;
    
    // Extraer el content value - maneja diferentes formatos
    const contentMatch = attributes.match(/content\s*=\s*["']([^"']+)["']/i) ||
                        attributes.match(/content\s*=\s*([^\s>]+)/i);
    
    if (contentMatch) {
      return {
        hasViewport: true,
        viewportContent: contentMatch[1].trim(),
        viewportTag: match[0]
      };
    }
    
    // Si tiene name="viewport" pero no content, es un viewport mal formado
    return {
      hasViewport: true,
      viewportContent: '',
      viewportTag: match[0]
    };
  }
  
  // Fallback: buscar con una regex más simple pero menos precisa
  const simpleMatch = html.match(/<meta[^>]*name\s*=\s*["']?\s*viewport\s*["']?[^>]*>/i);
  if (simpleMatch) {
    const contentMatch = simpleMatch[0].match(/content\s*=\s*["']([^"']+)["']/i);
    return {
      hasViewport: true,
      viewportContent: contentMatch ? contentMatch[1].trim() : '',
      viewportTag: simpleMatch[0]
    };
  }
  
  return {
    hasViewport: false,
    viewportContent: '',
    viewportTag: ''
  };
}

/**
 * Analiza el contenido del viewport y devuelve información detallada
 */
export function analyzeViewportContent(content: string): {
  hasDeviceWidth: boolean;
  initialScale: number | null;
  maximumScale: number | null;
  minimumScale: number | null;
  userScalable: boolean;
  width: string | null;
  height: string | null;
  viewportFit: string | null;
  isOptimal: boolean;
} {
  const result = {
    hasDeviceWidth: false,
    initialScale: null as number | null,
    maximumScale: null as number | null,
    minimumScale: null as number | null,
    userScalable: true,
    width: null as string | null,
    height: null as string | null,
    viewportFit: null as string | null,
    isOptimal: false
  };
  
  if (!content) return result;
  
  // Dividir por comas y analizar cada propiedad
  const properties = content.split(',').map(p => p.trim());
  
  for (const prop of properties) {
    const [key, value] = prop.split('=').map(s => s.trim());
    
    switch (key.toLowerCase()) {
      case 'width':
        result.width = value;
        result.hasDeviceWidth = value === 'device-width';
        break;
      case 'height':
        result.height = value;
        break;
      case 'initial-scale':
        result.initialScale = parseFloat(value);
        break;
      case 'maximum-scale':
        result.maximumScale = parseFloat(value);
        break;
      case 'minimum-scale':
        result.minimumScale = parseFloat(value);
        break;
      case 'user-scalable':
        result.userScalable = value !== 'no' && value !== '0';
        break;
      case 'viewport-fit':
        result.viewportFit = value;
        break;
    }
  }
  
  // Determinar si es óptimo
  result.isOptimal = result.hasDeviceWidth && 
                     result.initialScale === 1 &&
                     result.userScalable !== false;
  
  return result;
}

/**
 * Calcula puntuación móvil básica enfocada en elementos esenciales
 */
export function calculateRealMobileScore(html: string, _baseSeoScore: number): number {
  let mobileScore = 0;
  
  // 1. Viewport Meta Tag (40 puntos) - ESENCIAL
  const viewport = detectViewport(html);
  
  if (viewport.hasViewport) {
    const analysis = analyzeViewportContent(viewport.viewportContent);
    
    if (analysis.isOptimal) {
      mobileScore += 40; // Viewport óptimo
    } else if (analysis.hasDeviceWidth) {
      mobileScore += 35; // Tiene device-width pero no es óptimo
    } else if (viewport.viewportContent) {
      mobileScore += 20; // Tiene viewport pero no está bien configurado
    } else {
      mobileScore += 10; // Tiene tag viewport pero sin content
    }
    
    // Penalizaciones adicionales
    if (analysis.userScalable === false) {
      mobileScore -= 5; // Penalizar por deshabilitar zoom
    }
    if (analysis.maximumScale && analysis.maximumScale < 2) {
      mobileScore -= 3; // Penalizar por limitar zoom excesivamente
    }
  }
  
  // 2. Diseño Responsivo (30 puntos)
  const hasMediaQueries = /@media[^{]*\([^)]*(?:max-width|min-width)[^)]*\)/i.test(html);
  const hasResponsiveImages = /<img[^>]*srcset[^>]*sizes[^>]*>/i.test(html) || /<img[^>]*sizes[^>]*srcset[^>]*>/i.test(html) || /<picture[^>]*>[\s\S]*?<\/picture>/i.test(html);
  
  if (hasMediaQueries) {
    mobileScore += 20;
  }
  if (hasResponsiveImages) {
    mobileScore += 10;
  }
  
  // 3. Elementos No Mobile-Friendly (penalización hasta -20 puntos)
  let penalty = 0;
  
  // Flash content
  if (html.includes('.swf') || html.includes('flash')) {
    penalty += 20;
  }
  
  // Muchos elementos de ancho fijo
  const fixedWidths = html.match(/width\s*:\s*\d+px/gi) || [];
  if (fixedWidths.length > 10) {
    penalty += 10;
  }
  
  mobileScore -= penalty;
  
  // 4. Framework Responsivo (20 puntos)
  const responsiveFrameworks = ['bootstrap', 'tailwind', 'foundation', 'bulma'];
  const hasFramework = responsiveFrameworks.some(fw => 
    html.toLowerCase().includes(fw)
  );
  
  if (hasFramework) {
    mobileScore += 20;
  }
  
  // 5. Bonus por HTTPS (10 puntos)
  if (html.includes('https://') || html.includes('ssl')) {
    mobileScore += 10;
  }
  
  // Asegurar rango válido 0-100
  return Math.max(0, Math.min(100, Math.round(mobileScore)));
}