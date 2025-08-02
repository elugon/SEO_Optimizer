/**
 * Standardized error handling system for SEO analysis
 * Provides consistent error responses and better error categorization
 */

import { createLogger } from '../logging/index.js';

const logger = createLogger('ErrorHandler');

export enum SEOErrorType {
  VALIDATION = 'validation',
  NETWORK = 'network',
  TIMEOUT = 'timeout',
  URL_FORMAT = 'url_format',
  ANALYSIS = 'analysis',
  CONFIG = 'config',
  CACHE = 'cache',
  UNKNOWN = 'unknown'
}

export enum SEOErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export interface SEOError {
  code: string;
  type: SEOErrorType;
  severity: SEOErrorSeverity;
  message: string;
  userMessage: string;
  details?: any;
  timestamp: string;
  url?: string;
  httpStatus?: number;
  retryable: boolean;
  suggestedAction?: string;
}

/**
 * Standard error codes with consistent messaging
 */
export const ERROR_CODES = {
  // Validation errors
  URL_REQUIRED: 'URL_REQUIRED',
  URL_INVALID_FORMAT: 'URL_INVALID_FORMAT',
  URL_PROTOCOL_MISSING: 'URL_PROTOCOL_MISSING',
  URL_TOO_LONG: 'URL_TOO_LONG',
  
  // Network errors
  FETCH_FAILED: 'FETCH_FAILED',
  CONNECTION_TIMEOUT: 'CONNECTION_TIMEOUT',
  DNS_RESOLUTION_FAILED: 'DNS_RESOLUTION_FAILED',
  SSL_ERROR: 'SSL_ERROR',
  
  // HTTP errors
  HTTP_404: 'HTTP_404',
  HTTP_403: 'HTTP_403',
  HTTP_500: 'HTTP_500',
  HTTP_502: 'HTTP_502',
  HTTP_503: 'HTTP_503',
  
  // Analysis errors
  EMPTY_RESPONSE: 'EMPTY_RESPONSE',
  PAGE_TOO_LARGE: 'PAGE_TOO_LARGE',
  CONTENT_PARSING_FAILED: 'CONTENT_PARSING_FAILED',
  ANALYZER_FAILED: 'ANALYZER_FAILED',
  
  // System errors
  CONFIG_INVALID: 'CONFIG_INVALID',
  CACHE_ERROR: 'CACHE_ERROR',
  INTERNAL_ERROR: 'INTERNAL_ERROR'
} as const satisfies Record<string, string>;

type ErrorCode = typeof ERROR_CODES[keyof typeof ERROR_CODES];

/**
 * Error definitions with user-friendly messages
 */
const ERROR_DEFINITIONS: Record<ErrorCode, {
  type: SEOErrorType;
  severity: SEOErrorSeverity;
  userMessage: string;
  retryable: boolean;
  suggestedAction?: string;
}> = {
  // Validation errors
  [ERROR_CODES.URL_REQUIRED]: {
    type: SEOErrorType.VALIDATION,
    severity: SEOErrorSeverity.LOW,
    userMessage: 'Por favor ingresa una URL para analizar',
    retryable: false,
    suggestedAction: 'Ingresa una URL válida en el campo correspondiente'
  },
  [ERROR_CODES.URL_INVALID_FORMAT]: {
    type: SEOErrorType.VALIDATION,
    severity: SEOErrorSeverity.LOW,
    userMessage: 'El formato de la URL no es válido',
    retryable: false,
    suggestedAction: 'Verifica que la URL esté correctamente escrita'
  },
  [ERROR_CODES.URL_PROTOCOL_MISSING]: {
    type: SEOErrorType.VALIDATION,
    severity: SEOErrorSeverity.LOW,
    userMessage: 'La URL debe incluir http:// o https://',
    retryable: false,
    suggestedAction: 'Agrega http:// o https:// al inicio de la URL'
  },
  [ERROR_CODES.URL_TOO_LONG]: {
    type: SEOErrorType.VALIDATION,
    severity: SEOErrorSeverity.LOW,
    userMessage: 'La URL es demasiado larga',
    retryable: false,
    suggestedAction: 'Usa una URL más corta'
  },

  // Network errors
  [ERROR_CODES.FETCH_FAILED]: {
    type: SEOErrorType.NETWORK,
    severity: SEOErrorSeverity.MEDIUM,
    userMessage: 'No se pudo conectar con el sitio web',
    retryable: true,
    suggestedAction: 'Verifica que la URL esté activa e inténtalo de nuevo'
  },
  [ERROR_CODES.CONNECTION_TIMEOUT]: {
    type: SEOErrorType.TIMEOUT,
    severity: SEOErrorSeverity.MEDIUM,
    userMessage: 'El sitio web tardó demasiado en responder',
    retryable: true,
    suggestedAction: 'Inténtalo de nuevo en unos momentos'
  },
  [ERROR_CODES.DNS_RESOLUTION_FAILED]: {
    type: SEOErrorType.NETWORK,
    severity: SEOErrorSeverity.MEDIUM,
    userMessage: 'No se pudo resolver el nombre del dominio',
    retryable: true,
    suggestedAction: 'Verifica que el dominio esté correctamente escrito'
  },
  [ERROR_CODES.SSL_ERROR]: {
    type: SEOErrorType.NETWORK,
    severity: SEOErrorSeverity.MEDIUM,
    userMessage: 'Error de certificado SSL/TLS',
    retryable: false,
    suggestedAction: 'El sitio web tiene problemas de seguridad'
  },

  // HTTP errors
  [ERROR_CODES.HTTP_404]: {
    type: SEOErrorType.NETWORK,
    severity: SEOErrorSeverity.LOW,
    userMessage: 'La página no existe (Error 404)',
    retryable: false,
    suggestedAction: 'Verifica que la URL sea correcta'
  },
  [ERROR_CODES.HTTP_403]: {
    type: SEOErrorType.NETWORK,
    severity: SEOErrorSeverity.MEDIUM,
    userMessage: 'Acceso denegado al sitio web (Error 403)',
    retryable: false,
    suggestedAction: 'El sitio web bloquea el acceso para análisis automatizado'
  },
  [ERROR_CODES.HTTP_500]: {
    type: SEOErrorType.NETWORK,
    severity: SEOErrorSeverity.HIGH,
    userMessage: 'Error interno del servidor (Error 500)',
    retryable: true,
    suggestedAction: 'Inténtalo de nuevo más tarde'
  },
  [ERROR_CODES.HTTP_502]: {
    type: SEOErrorType.NETWORK,
    severity: SEOErrorSeverity.HIGH,
    userMessage: 'Error de gateway (Error 502)',
    retryable: true,
    suggestedAction: 'El servidor está experimentando problemas temporales'
  },
  [ERROR_CODES.HTTP_503]: {
    type: SEOErrorType.NETWORK,
    severity: SEOErrorSeverity.HIGH,
    userMessage: 'Servicio no disponible (Error 503)',
    retryable: true,
    suggestedAction: 'El sitio web está temporalmente fuera de servicio'
  },

  // Analysis errors
  [ERROR_CODES.EMPTY_RESPONSE]: {
    type: SEOErrorType.ANALYSIS,
    severity: SEOErrorSeverity.MEDIUM,
    userMessage: 'El sitio web devolvió una respuesta vacía',
    retryable: true,
    suggestedAction: 'Verifica que la URL apunte a una página válida'
  },
  [ERROR_CODES.PAGE_TOO_LARGE]: {
    type: SEOErrorType.ANALYSIS,
    severity: SEOErrorSeverity.MEDIUM,
    userMessage: 'La página es demasiado grande para analizar',
    retryable: false,
    suggestedAction: 'La página excede el límite de 5MB'
  },
  [ERROR_CODES.CONTENT_PARSING_FAILED]: {
    type: SEOErrorType.ANALYSIS,
    severity: SEOErrorSeverity.MEDIUM,
    userMessage: 'Error al procesar el contenido de la página',
    retryable: true,
    suggestedAction: 'El contenido de la página no se pudo analizar correctamente'
  },
  [ERROR_CODES.ANALYZER_FAILED]: {
    type: SEOErrorType.ANALYSIS,
    severity: SEOErrorSeverity.HIGH,
    userMessage: 'Error interno durante el análisis',
    retryable: true,
    suggestedAction: 'Inténtalo de nuevo'
  },

  // System errors
  [ERROR_CODES.CONFIG_INVALID]: {
    type: SEOErrorType.CONFIG,
    severity: SEOErrorSeverity.CRITICAL,
    userMessage: 'Error de configuración del sistema',
    retryable: false,
    suggestedAction: 'Contacta al administrador del sistema'
  },
  [ERROR_CODES.CACHE_ERROR]: {
    type: SEOErrorType.CACHE,
    severity: SEOErrorSeverity.LOW,
    userMessage: 'Error en el sistema de caché',
    retryable: true,
    suggestedAction: 'El análisis continuará sin usar caché'
  },
  [ERROR_CODES.INTERNAL_ERROR]: {
    type: SEOErrorType.UNKNOWN,
    severity: SEOErrorSeverity.HIGH,
    userMessage: 'Error interno del sistema',
    retryable: true,
    suggestedAction: 'Inténtalo de nuevo en unos momentos'
  }
};

/**
 * Creates a standardized SEO error
 */
export function createSEOError(
  code: ErrorCode,
  message: string,
  details?: any,
  url?: string,
  httpStatus?: number
): SEOError {
  const definition = ERROR_DEFINITIONS[code];
  
  const error: SEOError = {
    code,
    type: definition.type,
    severity: definition.severity,
    message,
    userMessage: definition.userMessage,
    details,
    timestamp: new Date().toISOString(),
    url,
    httpStatus,
    retryable: definition.retryable,
    suggestedAction: definition.suggestedAction
  };

  logger.error('SEO Error created', new Error(message), `${code}: ${url || 'no-url'}`);
  
  return error;
}

/**
 * Creates error from HTTP status code
 */
export function createHttpError(
  statusCode: number,
  url: string,
  message?: string
): SEOError {
  let code: ErrorCode;
  
  switch (statusCode) {
    case 404:
      code = ERROR_CODES.HTTP_404;
      break;
    case 403:
      code = ERROR_CODES.HTTP_403;
      break;
    case 500:
      code = ERROR_CODES.HTTP_500;
      break;
    case 502:
      code = ERROR_CODES.HTTP_502;
      break;
    case 503:
      code = ERROR_CODES.HTTP_503;
      break;
    default:
      code = ERROR_CODES.FETCH_FAILED;
  }

  return createSEOError(
    code,
    message || `HTTP ${statusCode} error`,
    { statusCode },
    url,
    statusCode
  );
}

/**
 * Creates error from JavaScript Error object
 */
export function createErrorFromException(
  error: Error | string,
  url?: string,
  context?: string
): SEOError {
  const message = error instanceof Error ? error.message : String(error);
  let code: ErrorCode = ERROR_CODES.INTERNAL_ERROR;

  // Categorize common error types
  if (message.includes('timeout') || message.includes('AbortError')) {
    code = ERROR_CODES.CONNECTION_TIMEOUT;
  } else if (message.includes('fetch') || message.includes('network')) {
    code = ERROR_CODES.FETCH_FAILED;
  } else if (message.includes('DNS') || message.includes('ENOTFOUND')) {
    code = ERROR_CODES.DNS_RESOLUTION_FAILED;
  } else if (message.includes('SSL') || message.includes('certificate')) {
    code = ERROR_CODES.SSL_ERROR;
  } else if (message.includes('empty') || message.includes('no content')) {
    code = ERROR_CODES.EMPTY_RESPONSE;
  } else if (message.includes('too large') || message.includes('size limit')) {
    code = ERROR_CODES.PAGE_TOO_LARGE;
  } else if (message.includes('parse') || message.includes('parsing')) {
    code = ERROR_CODES.CONTENT_PARSING_FAILED;
  }

  return createSEOError(
    code,
    message,
    { 
      originalError: error instanceof Error ? error.name : 'StringError',
      context,
      stack: error instanceof Error ? error.stack : undefined
    },
    url
  );
}

/**
 * Validates URL format and creates appropriate error
 */
export function validateUrlFormat(url: string): SEOError | null {
  if (!url || url.trim().length === 0) {
    return createSEOError(ERROR_CODES.URL_REQUIRED, 'URL is required');
  }

  if (url.length > 2048) {
    return createSEOError(ERROR_CODES.URL_TOO_LONG, 'URL exceeds maximum length', { length: url.length });
  }

  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    return createSEOError(ERROR_CODES.URL_PROTOCOL_MISSING, 'URL must include protocol (http:// or https://)', { url });
  }

  try {
    new URL(url);
  } catch (error) {
    return createSEOError(ERROR_CODES.URL_INVALID_FORMAT, 'Invalid URL format', { url, error: String(error) });
  }

  return null; // URL is valid
}

/**
 * Formats error for API response
 */
export function formatErrorResponse(error: SEOError): {
  error: string;
  errorType: string;
  errorCode: string;
  retryable: boolean;
  suggestedAction?: string;
  timestamp: string;
  url?: string;
  httpStatus?: number;
} {
  return {
    error: error.userMessage,
    errorType: error.type,
    errorCode: error.code,
    retryable: error.retryable,
    suggestedAction: error.suggestedAction,
    timestamp: error.timestamp,
    url: error.url,
    httpStatus: error.httpStatus
  };
}

/**
 * Formats error for logging with structured data
 */
export function formatErrorForLogging(error: SEOError): {
  message: string;
  data: any;
} {
  return {
    message: `${error.code}: ${error.message}`,
    data: {
      code: error.code,
      type: error.type,
      severity: error.severity,
      url: error.url,
      httpStatus: error.httpStatus,
      retryable: error.retryable,
      details: error.details,
      timestamp: error.timestamp
    }
  };
}

/**
 * Determines if error should be retried based on configuration
 */
export function shouldRetryError(error: SEOError, attemptCount: number = 1, maxRetries: number = 3): boolean {
  if (!error.retryable || attemptCount >= maxRetries) {
    return false;
  }

  // Don't retry validation errors
  if (error.type === SEOErrorType.VALIDATION || error.type === SEOErrorType.URL_FORMAT) {
    return false;
  }

  // Don't retry certain HTTP errors
  if (error.httpStatus && [404, 403, 401].includes(error.httpStatus)) {
    return false;
  }

  return true;
}

/**
 * Error handler class for centralized error management
 */
export class SEOErrorHandler {
  private static instance: SEOErrorHandler;
  private errorStats: Map<string, number> = new Map();

  static getInstance(): SEOErrorHandler {
    if (!SEOErrorHandler.instance) {
      SEOErrorHandler.instance = new SEOErrorHandler();
    }
    return SEOErrorHandler.instance;
  }

  /**
   * Handle and track error
   */
  handleError(error: SEOError): void {
    // Track error frequency
    const key = `${error.type}:${error.code}`;
    this.errorStats.set(key, (this.errorStats.get(key) || 0) + 1);

    // Log error with appropriate level
    const logData = formatErrorForLogging(error);
    
    switch (error.severity) {
      case SEOErrorSeverity.CRITICAL:
        logger.fatal(logData.message, new Error(error.message));
        break;
      case SEOErrorSeverity.HIGH:
        logger.error(logData.message, new Error(error.message));
        break;
      case SEOErrorSeverity.MEDIUM:
        logger.warn(logData.message, logData.data);
        break;
      case SEOErrorSeverity.LOW:
        logger.info(logData.message, logData.data);
        break;
    }
  }

  /**
   * Get error statistics
   */
  getErrorStats(): Record<string, number> {
    return Object.fromEntries(this.errorStats.entries());
  }

  /**
   * Clear error statistics
   */
  clearStats(): void {
    this.errorStats.clear();
  }
}

// Export singleton instance
export const errorHandler = SEOErrorHandler.getInstance();