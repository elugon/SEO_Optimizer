/**
 * API Security Module
 * Implementa medidas de seguridad para los endpoints API
 * Principios aplicados: Zero Trust, Input Validation, Least Privilege
 */

import { URLValidator } from '../seo/utils/url-validator';
import { RateLimiter, createRateLimiter } from './rate-limiter';
import { SecurityHeaders, createSecurityHeaders } from './security-headers';

export interface APISecurityConfig {
  enableRateLimit?: boolean;
  enableCORS?: boolean;
  enableAuth?: boolean;
  allowedOrigins?: string[];
  maxRequestSize?: number;
  enableRequestLogging?: boolean;
}

const DEFAULT_CONFIG: APISecurityConfig = {
  enableRateLimit: true,
  enableCORS: true,
  enableAuth: false,
  allowedOrigins: ['*'],
  maxRequestSize: 1024 * 1024, // 1MB
  enableRequestLogging: true
};

export class APISecurity {
  private config: APISecurityConfig;
  private rateLimiter: RateLimiter;
  private securityHeaders: SecurityHeaders;

  constructor(config: APISecurityConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    
    // Inicializar rate limiter
    this.rateLimiter = createRateLimiter('standard');
    
    // Inicializar security headers
    this.securityHeaders = createSecurityHeaders('production');
  }

  /**
   * Valida un request entrante
   */
  async validateRequest(request: Request): Promise<{
    valid: boolean;
    error?: string;
    statusCode?: number;
  }> {
    // Validar método HTTP
    const allowedMethods = ['GET', 'POST', 'OPTIONS'];
    if (!allowedMethods.includes(request.method)) {
      return {
        valid: false,
        error: 'Método HTTP no permitido',
        statusCode: 405
      };
    }

    // Validar tamaño del request
    const contentLength = request.headers.get('content-length');
    if (contentLength && parseInt(contentLength) > this.config.maxRequestSize!) {
      return {
        valid: false,
        error: 'Request demasiado grande',
        statusCode: 413
      };
    }

    // Validar rate limit
    if (this.config.enableRateLimit) {
      const rateLimitResult = await this.rateLimiter.isAllowed(request);
      if (!rateLimitResult.allowed) {
        return {
          valid: false,
          error: 'Demasiadas solicitudes. Por favor, intente más tarde.',
          statusCode: 429
        };
      }
    }

    // Validar CORS
    if (this.config.enableCORS) {
      const origin = request.headers.get('origin');
      if (origin && !this.isAllowedOrigin(origin)) {
        return {
          valid: false,
          error: 'Origen no permitido',
          statusCode: 403
        };
      }
    }

    return { valid: true };
  }

  /**
   * Valida el body del request
   */
  async validateRequestBody(body: any): Promise<{
    valid: boolean;
    error?: string;
    sanitized?: any;
  }> {
    // Validar que sea un objeto
    if (!body || typeof body !== 'object') {
      return {
        valid: false,
        error: 'Body del request inválido'
      };
    }

    // Validar URL si existe
    if (body.url) {
      const urlValidation = URLValidator.isValidUrl(body.url);
      if (!urlValidation.valid) {
        return {
          valid: false,
          error: urlValidation.reason
        };
      }
    }

    // Sanitizar y validar campos
    const sanitized: any = {};
    
    // URL
    if (body.url) {
      sanitized.url = this.sanitizeString(body.url, 2048);
    }

    // Opciones de análisis
    if (body.options) {
      sanitized.options = this.sanitizeAnalysisOptions(body.options);
    }

    // Páginas a analizar
    if (body.pagesToAnalyze && Array.isArray(body.pagesToAnalyze)) {
      sanitized.pagesToAnalyze = body.pagesToAnalyze
        .slice(0, 100) // Limitar cantidad
        .map((url: any) => this.sanitizeString(String(url), 2048))
        .filter((url: string) => URLValidator.isValidUrl(url).valid);
    }

    return {
      valid: true,
      sanitized
    };
  }

  /**
   * Aplica headers de seguridad a la respuesta
   */
  applySecurityHeaders(response: Response, request: Request): Response {
    let securedResponse = this.securityHeaders.apply(response);
    
    // Aplicar CORS headers si está habilitado
    if (this.config.enableCORS) {
      const headers = new Headers(securedResponse.headers);
      const origin = request.headers.get('origin');
      
      if (origin && this.isAllowedOrigin(origin)) {
        headers.set('Access-Control-Allow-Origin', origin);
      } else if (this.config.allowedOrigins?.includes('*')) {
        headers.set('Access-Control-Allow-Origin', '*');
      }
      
      headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      headers.set('Access-Control-Max-Age', '86400');
      
      securedResponse = new Response(securedResponse.body, {
        status: securedResponse.status,
        statusText: securedResponse.statusText,
        headers
      });
    }
    
    return securedResponse;
  }

  /**
   * Maneja errores de seguridad
   */
  handleSecurityError(error: string, statusCode: number = 400): Response {
    const response = new Response(
      JSON.stringify({
        error,
        timestamp: new Date().toISOString()
      }),
      {
        status: statusCode,
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
    
    return this.securityHeaders.apply(response);
  }

  /**
   * Registra actividad sospechosa
   */
  logSuspiciousActivity(request: Request, reason: string): void {
    if (!this.config.enableRequestLogging) return;
    
    const log = {
      timestamp: new Date().toISOString(),
      ip: this.getClientIP(request),
      userAgent: request.headers.get('user-agent'),
      url: request.url,
      method: request.method,
      reason
    };
    
    console.warn('[SECURITY]', JSON.stringify(log));
  }

  /**
   * Verifica si un origen está permitido
   */
  private isAllowedOrigin(origin: string): boolean {
    if (!this.config.allowedOrigins) return false;
    
    return this.config.allowedOrigins.includes('*') ||
           this.config.allowedOrigins.includes(origin);
  }

  /**
   * Sanitiza un string
   */
  private sanitizeString(input: string, maxLength: number = 255): string {
    return input
      .substring(0, maxLength)
      .replace(/[<>]/g, '') // Remover caracteres HTML básicos
      .trim();
  }

  /**
   * Sanitiza opciones de análisis
   */
  private sanitizeAnalysisOptions(options: any): any {
    const sanitized: any = {};
    
    // Lista blanca de opciones permitidas
    const allowedOptions = [
      'includeImages',
      'includeLinks', 
      'includeSecurity',
      'includePerformance',
      'includeMobile',
      'followRedirects',
      'timeout'
    ];
    
    for (const option of allowedOptions) {
      if (option in options) {
        if (option === 'timeout') {
          // Validar timeout
          const timeout = parseInt(options[option]);
          if (!isNaN(timeout) && timeout > 0 && timeout <= 30000) {
            sanitized[option] = timeout;
          }
        } else if (typeof options[option] === 'boolean') {
          sanitized[option] = options[option];
        }
      }
    }
    
    return sanitized;
  }

  /**
   * Obtiene la IP del cliente
   */
  private getClientIP(request: Request): string {
    const forwarded = request.headers.get('x-forwarded-for');
    if (forwarded) {
      return forwarded.split(',')[0].trim();
    }
    
    const realIP = request.headers.get('x-real-ip');
    if (realIP) {
      return realIP;
    }
    
    return 'unknown';
  }
}

/**
 * Middleware de seguridad para Astro
 */
export function apiSecurityMiddleware(config?: APISecurityConfig) {
  const security = new APISecurity(config);
  
  return async function(
    context: { request: Request },
    next: () => Promise<Response>
  ): Promise<Response> {
    const { request } = context;
    
    // Manejar preflight CORS
    if (request.method === 'OPTIONS') {
      return security.applySecurityHeaders(
        new Response(null, { status: 204 }),
        request
      );
    }
    
    // Validar request
    const validation = await security.validateRequest(request);
    if (!validation.valid) {
      security.logSuspiciousActivity(request, validation.error!);
      return security.handleSecurityError(
        validation.error!,
        validation.statusCode
      );
    }
    
    try {
      // Procesar request
      const response = await next();
      
      // Aplicar headers de seguridad
      return security.applySecurityHeaders(response, request);
    } catch (error) {
      // Log error sin exponer detalles
      console.error('[API Error]', error);
      return security.handleSecurityError(
        'Error interno del servidor',
        500
      );
    }
  };
}