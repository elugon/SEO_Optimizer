/**
 * Security Headers Middleware
 * Aplica headers de seguridad a las respuestas
 * Principios aplicados: Defense in Depth, Security by Default
 */

export interface SecurityHeadersConfig {
  contentSecurityPolicy?: string | boolean;
  strictTransportSecurity?: string | boolean;
  xContentTypeOptions?: string | boolean;
  xFrameOptions?: string | boolean;
  xXssProtection?: string | boolean;
  referrerPolicy?: string | boolean;
  permissionsPolicy?: string | boolean;
  crossOriginEmbedderPolicy?: string | boolean;
  crossOriginOpenerPolicy?: string | boolean;
  crossOriginResourcePolicy?: string | boolean;
}

const DEFAULT_SECURITY_HEADERS: SecurityHeadersConfig = {
  contentSecurityPolicy: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self'; connect-src 'self' https:;",
  strictTransportSecurity: 'max-age=31536000; includeSubDomains',
  xContentTypeOptions: 'nosniff',
  xFrameOptions: 'SAMEORIGIN',
  xXssProtection: '1; mode=block',
  referrerPolicy: 'strict-origin-when-cross-origin',
  permissionsPolicy: 'geolocation=(), microphone=(), camera=()',
  crossOriginEmbedderPolicy: 'require-corp',
  crossOriginOpenerPolicy: 'same-origin',
  crossOriginResourcePolicy: 'same-origin'
};

export class SecurityHeaders {
  private config: SecurityHeadersConfig;

  constructor(config: SecurityHeadersConfig = {}) {
    this.config = { ...DEFAULT_SECURITY_HEADERS, ...config };
  }

  /**
   * Aplica headers de seguridad a una respuesta
   */
  apply(response: Response): Response {
    const headers = new Headers(response.headers);

    // Content Security Policy
    if (this.config.contentSecurityPolicy) {
      const csp = typeof this.config.contentSecurityPolicy === 'string' 
        ? this.config.contentSecurityPolicy 
        : DEFAULT_SECURITY_HEADERS.contentSecurityPolicy;
      headers.set('Content-Security-Policy', csp as string);
    }

    // Strict Transport Security
    if (this.config.strictTransportSecurity) {
      const hsts = typeof this.config.strictTransportSecurity === 'string'
        ? this.config.strictTransportSecurity
        : DEFAULT_SECURITY_HEADERS.strictTransportSecurity;
      headers.set('Strict-Transport-Security', hsts as string);
    }

    // X-Content-Type-Options
    if (this.config.xContentTypeOptions) {
      headers.set('X-Content-Type-Options', 'nosniff');
    }

    // X-Frame-Options
    if (this.config.xFrameOptions) {
      const frameOptions = typeof this.config.xFrameOptions === 'string'
        ? this.config.xFrameOptions
        : 'SAMEORIGIN';
      headers.set('X-Frame-Options', frameOptions);
    }

    // X-XSS-Protection
    if (this.config.xXssProtection) {
      headers.set('X-XSS-Protection', '1; mode=block');
    }

    // Referrer Policy
    if (this.config.referrerPolicy) {
      const referrerPolicy = typeof this.config.referrerPolicy === 'string'
        ? this.config.referrerPolicy
        : DEFAULT_SECURITY_HEADERS.referrerPolicy;
      headers.set('Referrer-Policy', referrerPolicy as string);
    }

    // Permissions Policy
    if (this.config.permissionsPolicy) {
      const permissionsPolicy = typeof this.config.permissionsPolicy === 'string'
        ? this.config.permissionsPolicy
        : DEFAULT_SECURITY_HEADERS.permissionsPolicy;
      headers.set('Permissions-Policy', permissionsPolicy as string);
    }

    // Cross-Origin Embedder Policy
    if (this.config.crossOriginEmbedderPolicy) {
      headers.set('Cross-Origin-Embedder-Policy', 'require-corp');
    }

    // Cross-Origin Opener Policy
    if (this.config.crossOriginOpenerPolicy) {
      headers.set('Cross-Origin-Opener-Policy', 'same-origin');
    }

    // Cross-Origin Resource Policy
    if (this.config.crossOriginResourcePolicy) {
      headers.set('Cross-Origin-Resource-Policy', 'same-origin');
    }

    // Crear nueva respuesta con headers actualizados
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers
    });
  }

  /**
   * Crea un middleware para aplicar headers de seguridad
   */
  middleware() {
    return async (_request: Request, next: () => Promise<Response>): Promise<Response> => {
      const response = await next();
      return this.apply(response);
    };
  }
}

/**
 * Headers de seguridad preconfigurados por entorno
 */
export const SECURITY_PRESETS = {
  development: {
    contentSecurityPolicy: false,  // Deshabilitado para desarrollo
    strictTransportSecurity: false,
    xContentTypeOptions: true,
    xFrameOptions: 'SAMEORIGIN',
    xXssProtection: true,
    referrerPolicy: 'no-referrer-when-downgrade'
  },
  
  production: {
    ...DEFAULT_SECURITY_HEADERS
  },
  
  strict: {
    contentSecurityPolicy: "default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self' data:; font-src 'self'; connect-src 'self'; base-uri 'self'; form-action 'self';",
    strictTransportSecurity: 'max-age=63072000; includeSubDomains; preload',
    xContentTypeOptions: 'nosniff',
    xFrameOptions: 'DENY',
    xXssProtection: '1; mode=block',
    referrerPolicy: 'no-referrer',
    permissionsPolicy: 'accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=()',
    crossOriginEmbedderPolicy: 'require-corp',
    crossOriginOpenerPolicy: 'same-origin',
    crossOriginResourcePolicy: 'same-origin'
  }
};

/**
 * Factory function para crear middleware de seguridad
 */
export function createSecurityHeaders(
  preset: keyof typeof SECURITY_PRESETS | SecurityHeadersConfig = 'production'
): SecurityHeaders {
  const config = typeof preset === 'string' 
    ? SECURITY_PRESETS[preset] 
    : preset;
    
  return new SecurityHeaders(config);
}

/**
 * Validador de CSP
 */
export class CSPValidator {
  static validate(policy: string): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    const directives = policy.split(';').map(d => d.trim()).filter(Boolean);
    
    const validDirectives = [
      'default-src', 'script-src', 'style-src', 'img-src', 'connect-src',
      'font-src', 'object-src', 'media-src', 'frame-src', 'sandbox',
      'report-uri', 'child-src', 'form-action', 'frame-ancestors',
      'plugin-types', 'base-uri', 'manifest-src', 'worker-src'
    ];
    
    directives.forEach(directive => {
      const [name] = directive.split(' ');
      if (!validDirectives.includes(name)) {
        errors.push(`Directiva CSP inválida: ${name}`);
      }
    });
    
    return {
      valid: errors.length === 0,
      errors
    };
  }
}

/**
 * Generador de nonce para CSP inline scripts
 */
export function generateCSPNonce(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return btoa(String.fromCharCode(...array));
}