/**
 * Rate Limiter
 * Implementa limitación de velocidad para prevenir abuso de API
 * Principios aplicados: Security by Design, Defensive Programming
 */

interface RateLimitConfig {
  windowMs: number;      // Ventana de tiempo en ms
  maxRequests: number;   // Máximo de requests por ventana
  keyGenerator?: (request: Request) => string;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
  message?: string;
}

interface RateLimitEntry {
  requests: number[];    // Timestamps de requests
  blocked: boolean;
}

export class RateLimiter {
  private store: Map<string, RateLimitEntry> = new Map();
  private cleanupInterval: number;

  constructor(private config: RateLimitConfig) {
    // Limpiar entradas expiradas cada minuto
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 60000) as unknown as number;
  }

  /**
   * Verifica si un request debe ser permitido
   */
  async isAllowed(request: Request): Promise<{
    allowed: boolean;
    retryAfter?: number;
    remainingRequests?: number;
  }> {
    const key = this.getKey(request);
    const now = Date.now();
    const windowStart = now - this.config.windowMs;

    // Obtener o crear entrada
    let entry = this.store.get(key);
    if (!entry) {
      entry = { requests: [], blocked: false };
      this.store.set(key, entry);
    }

    // Filtrar requests fuera de la ventana
    entry.requests = entry.requests.filter(timestamp => timestamp > windowStart);

    // Verificar si está bloqueado
    if (entry.blocked && entry.requests.length >= this.config.maxRequests) {
      const oldestRequest = Math.min(...entry.requests);
      const retryAfter = Math.ceil((oldestRequest + this.config.windowMs - now) / 1000);
      
      return {
        allowed: false,
        retryAfter,
        remainingRequests: 0
      };
    }

    // Verificar límite
    if (entry.requests.length >= this.config.maxRequests) {
      entry.blocked = true;
      const oldestRequest = Math.min(...entry.requests);
      const retryAfter = Math.ceil((oldestRequest + this.config.windowMs - now) / 1000);
      
      return {
        allowed: false,
        retryAfter,
        remainingRequests: 0
      };
    }

    // Permitir request
    entry.requests.push(now);
    entry.blocked = false;
    
    return {
      allowed: true,
      remainingRequests: this.config.maxRequests - entry.requests.length
    };
  }

  /**
   * Registra el resultado de un request
   */
  async recordResult(request: Request, success: boolean): Promise<void> {
    if (
      (success && this.config.skipSuccessfulRequests) ||
      (!success && this.config.skipFailedRequests)
    ) {
      // Remover el último request registrado
      const key = this.getKey(request);
      const entry = this.store.get(key);
      if (entry && entry.requests.length > 0) {
        entry.requests.pop();
      }
    }
  }

  /**
   * Resetea el límite para una key específica
   */
  reset(key: string): void {
    this.store.delete(key);
  }

  /**
   * Resetea todos los límites
   */
  resetAll(): void {
    this.store.clear();
  }

  /**
   * Genera la key para un request
   */
  private getKey(request: Request): string {
    if (this.config.keyGenerator) {
      return this.config.keyGenerator(request);
    }

    // Por defecto usar IP del cliente
    const forwarded = request.headers.get('x-forwarded-for');
    const ip = forwarded ? forwarded.split(',')[0].trim() : 'unknown';
    
    return ip;
  }

  /**
   * Limpia entradas expiradas
   */
  private cleanup(): void {
    const now = Date.now();
    const windowStart = now - this.config.windowMs;

    for (const [key, entry] of this.store.entries()) {
      entry.requests = entry.requests.filter(timestamp => timestamp > windowStart);
      
      if (entry.requests.length === 0) {
        this.store.delete(key);
      }
    }
  }

  /**
   * Destruye el rate limiter
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.store.clear();
  }
}

/**
 * Factory function para crear rate limiters preconfigurados
 */
export function createRateLimiter(preset: 'strict' | 'standard' | 'lenient' | RateLimitConfig): RateLimiter {
  const presets = {
    strict: {
      windowMs: 60 * 1000,        // 1 minuto
      maxRequests: 10,            // 10 requests por minuto
      message: 'Demasiadas solicitudes. Por favor, intente más tarde.'
    },
    standard: {
      windowMs: 60 * 1000,        // 1 minuto
      maxRequests: 60,            // 60 requests por minuto
      message: 'Límite de solicitudes excedido. Por favor, espere un momento.'
    },
    lenient: {
      windowMs: 60 * 1000,        // 1 minuto
      maxRequests: 200,           // 200 requests por minuto
      message: 'Límite de solicitudes alcanzado.'
    }
  };

  const config = typeof preset === 'string' ? presets[preset] : preset;
  return new RateLimiter(config);
}

/**
 * Middleware para Astro
 */
export function rateLimitMiddleware(limiter: RateLimiter) {
  return async function(request: Request): Promise<Response | null> {
    const result = await limiter.isAllowed(request);

    if (!result.allowed) {
      return new Response(
        JSON.stringify({
          error: limiter['config'].message || 'Too many requests',
          retryAfter: result.retryAfter
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': String(result.retryAfter || 60),
            'X-RateLimit-Limit': String(limiter['config'].maxRequests),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': String(Date.now() + (result.retryAfter || 60) * 1000)
          }
        }
      );
    }

    // Añadir headers de rate limit
    return null; // Continuar con el request
  };
}