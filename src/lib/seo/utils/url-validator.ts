/**
 * URL Validator Utility
 * Centraliza la validación y sanitización de URLs
 * Principios aplicados: Security by Design, Defensive Programming
 */

export class URLValidator {
  // Dominios bloqueados por seguridad (SSRF prevention)
  private static readonly BLOCKED_HOSTS = [
    'localhost',
    '127.0.0.1',
    '0.0.0.0',
    '::1',
    '169.254.169.254', // AWS metadata
    '10.0.0.0/8',
    '172.16.0.0/12',
    '192.168.0.0/16'
  ];

  // Protocolos permitidos
  private static readonly ALLOWED_PROTOCOLS = ['http:', 'https:'];

  // Extensiones de archivo no HTML
  private static readonly NON_HTML_EXTENSIONS = [
    '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
    '.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg',
    '.mp3', '.mp4', '.avi', '.mov',
    '.zip', '.rar', '.7z', '.tar', '.gz',
    '.exe', '.dmg', '.pkg', '.deb', '.rpm'
  ];

  /**
   * Valida si una URL es segura para analizar
   */
  static isValidUrl(url: string): {
    valid: boolean;
    reason?: string;
  } {
    try {
      const urlObj = new URL(url);

      // Validar protocolo
      if (!this.ALLOWED_PROTOCOLS.includes(urlObj.protocol)) {
        return {
          valid: false,
          reason: `Protocolo no permitido: ${urlObj.protocol}. Use HTTP o HTTPS.`
        };
      }

      // Validar host bloqueado
      if (this.isBlockedHost(urlObj.hostname)) {
        return {
          valid: false,
          reason: 'URL apunta a un host bloqueado por seguridad.'
        };
      }

      // Validar IP privada
      if (this.isPrivateIP(urlObj.hostname)) {
        return {
          valid: false,
          reason: 'URL apunta a una dirección IP privada.'
        };
      }

      // Validar extensión de archivo
      if (this.hasNonHtmlExtension(urlObj.pathname)) {
        return {
          valid: false,
          reason: 'URL apunta a un archivo no HTML.'
        };
      }

      return { valid: true };
    } catch (error) {
      return {
        valid: false,
        reason: 'URL mal formada o inválida.'
      };
    }
  }

  /**
   * Normaliza una URL
   */
  static normalizeUrl(url: string): string {
    try {
      const urlObj = new URL(url);
      
      // Remover fragmento
      urlObj.hash = '';
      
      // Remover trailing slash para paths vacíos
      if (urlObj.pathname === '/') {
        return urlObj.origin;
      }
      
      // Remover trailing slash
      urlObj.pathname = urlObj.pathname.replace(/\/$/, '');
      
      // Ordenar parámetros de query
      const params = new URLSearchParams(urlObj.search);
      const sortedParams = new URLSearchParams();
      Array.from(params.keys()).sort().forEach(key => {
        sortedParams.set(key, params.get(key) || '');
      });
      urlObj.search = sortedParams.toString();
      
      return urlObj.toString();
    } catch {
      return url;
    }
  }

  /**
   * Determina si dos URLs son del mismo dominio
   */
  static isSameDomain(url1: string, url2: string): boolean {
    try {
      const urlObj1 = new URL(url1);
      const urlObj2 = new URL(url2);
      return urlObj1.hostname === urlObj2.hostname;
    } catch {
      return false;
    }
  }

  /**
   * Convierte URL relativa a absoluta
   */
  static toAbsoluteUrl(relativeUrl: string, baseUrl: string): string {
    try {
      return new URL(relativeUrl, baseUrl).toString();
    } catch {
      return relativeUrl;
    }
  }

  /**
   * Extrae el dominio raíz de una URL
   */
  static getRootDomain(url: string): string | null {
    try {
      const urlObj = new URL(url);
      const parts = urlObj.hostname.split('.');
      
      // Manejar casos como .co.uk, .com.br
      if (parts.length >= 3) {
        const possibleTld = parts.slice(-2).join('.');
        const commonSecondLevelDomains = ['co.uk', 'com.br', 'co.jp', 'co.kr'];
        
        if (commonSecondLevelDomains.includes(possibleTld)) {
          return parts.slice(-3).join('.');
        }
      }
      
      return parts.slice(-2).join('.');
    } catch {
      return null;
    }
  }

  /**
   * Sanitiza parámetros de URL sensibles
   */
  static sanitizeUrl(url: string, sensitiveParams: string[] = []): string {
    try {
      const urlObj = new URL(url);
      const defaultSensitiveParams = [
        'token', 'key', 'api_key', 'apikey', 'secret',
        'password', 'pwd', 'auth', 'session', 'sid'
      ];
      
      const allSensitiveParams = [
        ...defaultSensitiveParams,
        ...sensitiveParams
      ];
      
      // Remover parámetros sensibles
      allSensitiveParams.forEach(param => {
        urlObj.searchParams.delete(param);
      });
      
      return urlObj.toString();
    } catch {
      return url;
    }
  }

  /**
   * Verifica si el host está bloqueado
   */
  private static isBlockedHost(hostname: string): boolean {
    return this.BLOCKED_HOSTS.includes(hostname.toLowerCase());
  }

  /**
   * Verifica si es una IP privada
   */
  private static isPrivateIP(hostname: string): boolean {
    // Verificar si es una dirección IP
    const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
    if (!ipRegex.test(hostname)) {
      return false;
    }

    const parts = hostname.split('.').map(Number);
    
    // 10.0.0.0/8
    if (parts[0] === 10) return true;
    
    // 172.16.0.0/12
    if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
    
    // 192.168.0.0/16
    if (parts[0] === 192 && parts[1] === 168) return true;
    
    // 127.0.0.0/8
    if (parts[0] === 127) return true;
    
    return false;
  }

  /**
   * Verifica si la URL tiene una extensión no HTML
   */
  private static hasNonHtmlExtension(pathname: string): boolean {
    const lowerPath = pathname.toLowerCase();
    return this.NON_HTML_EXTENSIONS.some(ext => lowerPath.endsWith(ext));
  }

  /**
   * Genera una lista de URLs canónicas posibles
   */
  static generateCanonicalVariations(url: string): string[] {
    try {
      const urlObj = new URL(url);
      const variations: string[] = [];
      
      // Original
      variations.push(url);
      
      // Sin www
      if (urlObj.hostname.startsWith('www.')) {
        const withoutWww = new URL(url);
        withoutWww.hostname = withoutWww.hostname.substring(4);
        variations.push(withoutWww.toString());
      }
      
      // Con www
      if (!urlObj.hostname.startsWith('www.')) {
        const withWww = new URL(url);
        withWww.hostname = 'www.' + withWww.hostname;
        variations.push(withWww.toString());
      }
      
      // HTTPS si es HTTP
      if (urlObj.protocol === 'http:') {
        const httpsUrl = new URL(url);
        httpsUrl.protocol = 'https:';
        variations.push(httpsUrl.toString());
      }
      
      // Sin trailing slash
      if (urlObj.pathname.endsWith('/') && urlObj.pathname !== '/') {
        const withoutSlash = new URL(url);
        withoutSlash.pathname = withoutSlash.pathname.slice(0, -1);
        variations.push(withoutSlash.toString());
      }
      
      // Con trailing slash
      if (!urlObj.pathname.endsWith('/')) {
        const withSlash = new URL(url);
        withSlash.pathname = withSlash.pathname + '/';
        variations.push(withSlash.toString());
      }
      
      return [...new Set(variations)];
    } catch {
      return [url];
    }
  }
}