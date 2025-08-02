/**
 * Enhanced Error Handler
 * Sistema mejorado de manejo de errores con contexto y recuperación
 * Principios aplicados: Error Handling, Fault Tolerance, Observability
 */

import { logger } from '../logging';

// Tipos de errores personalizados
export enum ErrorType {
  NETWORK = 'NETWORK_ERROR',
  VALIDATION = 'VALIDATION_ERROR',
  PARSING = 'PARSING_ERROR',
  TIMEOUT = 'TIMEOUT_ERROR',
  RATE_LIMIT = 'RATE_LIMIT_ERROR',
  PERMISSION = 'PERMISSION_ERROR',
  NOT_FOUND = 'NOT_FOUND_ERROR',
  CONFIGURATION = 'CONFIGURATION_ERROR',
  ANALYSIS = 'ANALYSIS_ERROR',
  UNKNOWN = 'UNKNOWN_ERROR'
}

// Severidad de errores
export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

// Interfaz para errores enriquecidos
export interface EnhancedError extends Error {
  type: ErrorType;
  severity: ErrorSeverity;
  context?: Record<string, any>;
  userMessage: string;
  technicalDetails?: string;
  recoverable: boolean;
  retryable: boolean;
  timestamp: Date;
  correlationId?: string;
}

/**
 * Clase base para errores personalizados
 */
export class SEOError extends Error implements EnhancedError {
  type: ErrorType;
  severity: ErrorSeverity;
  context?: Record<string, any>;
  userMessage: string;
  technicalDetails?: string;
  recoverable: boolean;
  retryable: boolean;
  timestamp: Date;
  correlationId?: string;

  constructor(
    message: string,
    type: ErrorType = ErrorType.UNKNOWN,
    options: Partial<EnhancedError> = {}
  ) {
    super(message);
    this.name = 'SEOError';
    this.type = type;
    this.severity = options.severity || ErrorSeverity.MEDIUM;
    this.context = options.context;
    this.userMessage = options.userMessage || this.getDefaultUserMessage(type);
    this.technicalDetails = options.technicalDetails;
    this.recoverable = options.recoverable ?? true;
    this.retryable = options.retryable ?? false;
    this.timestamp = new Date();
    this.correlationId = options.correlationId || this.generateCorrelationId();

    // Mantener stack trace correcto
    Error.captureStackTrace(this, this.constructor);
  }

  private getDefaultUserMessage(type: ErrorType): string {
    const messages: Record<ErrorType, string> = {
      [ErrorType.NETWORK]: 'Error de conexión. Por favor, verifique su conexión a internet.',
      [ErrorType.VALIDATION]: 'Los datos proporcionados no son válidos.',
      [ErrorType.PARSING]: 'Error al procesar la página web.',
      [ErrorType.TIMEOUT]: 'La operación tardó demasiado tiempo. Por favor, intente nuevamente.',
      [ErrorType.RATE_LIMIT]: 'Demasiadas solicitudes. Por favor, espere un momento.',
      [ErrorType.PERMISSION]: 'No tiene permisos para realizar esta operación.',
      [ErrorType.NOT_FOUND]: 'El recurso solicitado no fue encontrado.',
      [ErrorType.CONFIGURATION]: 'Error de configuración del sistema.',
      [ErrorType.ANALYSIS]: 'Error durante el análisis SEO.',
      [ErrorType.UNKNOWN]: 'Ha ocurrido un error inesperado.'
    };
    return messages[type];
  }

  private generateCorrelationId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
  }

  toJSON(): Record<string, any> {
    return {
      name: this.name,
      type: this.type,
      severity: this.severity,
      message: this.message,
      userMessage: this.userMessage,
      recoverable: this.recoverable,
      retryable: this.retryable,
      timestamp: this.timestamp,
      correlationId: this.correlationId,
      context: this.context
    };
  }
}

/**
 * Handler centralizado de errores
 */
export class ErrorHandler {
  private static instance: ErrorHandler;
  private errorListeners: Array<(error: EnhancedError) => void> = [];

  private constructor() {}

  static getInstance(): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler();
    }
    return ErrorHandler.instance;
  }

  /**
   * Maneja un error y lo transforma en EnhancedError
   */
  handle(error: unknown, context?: Record<string, any>): EnhancedError {
    let enhancedError: EnhancedError;

    if (error instanceof SEOError) {
      enhancedError = error;
    } else if (error instanceof Error) {
      enhancedError = this.enhanceError(error, context);
    } else {
      enhancedError = new SEOError(
        String(error),
        ErrorType.UNKNOWN,
        { context }
      );
    }

    // Log del error
    this.logError(enhancedError);

    // Notificar listeners
    this.notifyListeners(enhancedError);

    return enhancedError;
  }

  /**
   * Maneja errores asíncronos con retry
   */
  async handleAsync<T>(
    operation: () => Promise<T>,
    options: {
      retries?: number;
      retryDelay?: number;
      context?: Record<string, any>;
      fallback?: () => T;
    } = {}
  ): Promise<T> {
    const { retries = 0, retryDelay = 1000, context, fallback } = options;
    let lastError: EnhancedError | null = null;

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = this.handle(error, {
          ...context,
          attempt,
          maxAttempts: retries + 1
        });

        if (!lastError.retryable || attempt === retries) {
          break;
        }

        // Esperar antes de reintentar
        await new Promise(resolve => setTimeout(resolve, retryDelay * (attempt + 1)));
      }
    }

    // Si hay fallback, usarlo
    if (fallback && lastError?.recoverable) {
      logger.warn('Using fallback due to error', {
        error: lastError.message,
        correlationId: lastError.correlationId
      });
      return fallback();
    }

    throw lastError;
  }

  /**
   * Convierte un error genérico en EnhancedError
   */
  private enhanceError(error: Error, context?: Record<string, any>): EnhancedError {
    const type = this.detectErrorType(error);
    const severity = this.detectErrorSeverity(type);
    
    return new SEOError(error.message, type, {
      context,
      severity,
      technicalDetails: error.stack,
      retryable: this.isRetryable(type),
      recoverable: this.isRecoverable(type)
    });
  }

  /**
   * Detecta el tipo de error basado en el mensaje o tipo
   */
  private detectErrorType(error: Error): ErrorType {
    const message = error.message.toLowerCase();
    const name = error.name.toLowerCase();

    if (name.includes('timeout') || message.includes('timeout')) {
      return ErrorType.TIMEOUT;
    }
    if (name.includes('network') || message.includes('fetch')) {
      return ErrorType.NETWORK;
    }
    if (message.includes('rate limit') || message.includes('429')) {
      return ErrorType.RATE_LIMIT;
    }
    if (message.includes('validation') || message.includes('invalid')) {
      return ErrorType.VALIDATION;
    }
    if (message.includes('parse') || message.includes('syntax')) {
      return ErrorType.PARSING;
    }
    if (message.includes('not found') || message.includes('404')) {
      return ErrorType.NOT_FOUND;
    }
    if (message.includes('permission') || message.includes('403')) {
      return ErrorType.PERMISSION;
    }
    
    return ErrorType.UNKNOWN;
  }

  /**
   * Determina la severidad del error
   */
  private detectErrorSeverity(type: ErrorType): ErrorSeverity {
    const severityMap: Record<ErrorType, ErrorSeverity> = {
      [ErrorType.NETWORK]: ErrorSeverity.HIGH,
      [ErrorType.VALIDATION]: ErrorSeverity.LOW,
      [ErrorType.PARSING]: ErrorSeverity.MEDIUM,
      [ErrorType.TIMEOUT]: ErrorSeverity.MEDIUM,
      [ErrorType.RATE_LIMIT]: ErrorSeverity.LOW,
      [ErrorType.PERMISSION]: ErrorSeverity.HIGH,
      [ErrorType.NOT_FOUND]: ErrorSeverity.LOW,
      [ErrorType.CONFIGURATION]: ErrorSeverity.CRITICAL,
      [ErrorType.ANALYSIS]: ErrorSeverity.MEDIUM,
      [ErrorType.UNKNOWN]: ErrorSeverity.HIGH
    };
    
    return severityMap[type];
  }

  /**
   * Determina si un error es reintentable
   */
  private isRetryable(type: ErrorType): boolean {
    return [
      ErrorType.NETWORK,
      ErrorType.TIMEOUT,
      ErrorType.RATE_LIMIT
    ].includes(type);
  }

  /**
   * Determina si un error es recuperable
   */
  private isRecoverable(type: ErrorType): boolean {
    return type !== ErrorType.CONFIGURATION && type !== ErrorType.PERMISSION;
  }

  /**
   * Registra el error en los logs
   */
  private logError(error: EnhancedError): void {
    const logData = {
      correlationId: error.correlationId,
      type: error.type,
      severity: error.severity,
      message: error.message,
      context: error.context,
      timestamp: error.timestamp
    };

    switch (error.severity) {
      case ErrorSeverity.CRITICAL:
        logger.error('Critical error occurred', logData);
        break;
      case ErrorSeverity.HIGH:
        logger.error('High severity error', logData);
        break;
      case ErrorSeverity.MEDIUM:
        logger.warn('Medium severity error', logData);
        break;
      case ErrorSeverity.LOW:
        logger.info('Low severity error', logData);
        break;
    }
  }

  /**
   * Añade un listener para errores
   */
  addErrorListener(listener: (error: EnhancedError) => void): void {
    this.errorListeners.push(listener);
  }

  /**
   * Notifica a los listeners
   */
  private notifyListeners(error: EnhancedError): void {
    this.errorListeners.forEach(listener => {
      try {
        listener(error);
      } catch (e) {
        logger.error('Error in error listener', { error: e });
      }
    });
  }
}

/**
 * Decorador para manejo automático de errores
 */
export function withErrorHandling(
  target: any,
  propertyKey: string,
  descriptor: PropertyDescriptor
): PropertyDescriptor {
  const originalMethod = descriptor.value;
  const errorHandler = ErrorHandler.getInstance();

  descriptor.value = async function(...args: any[]) {
    try {
      return await originalMethod.apply(this, args);
    } catch (error) {
      const enhancedError = errorHandler.handle(error, {
        class: target.constructor.name,
        method: propertyKey,
        args: args.length
      });
      throw enhancedError;
    }
  };

  return descriptor;
}

/**
 * Helper para crear errores específicos
 */
export const createError = {
  network: (message: string, context?: Record<string, any>) =>
    new SEOError(message, ErrorType.NETWORK, { context, retryable: true }),
    
  validation: (message: string, context?: Record<string, any>) =>
    new SEOError(message, ErrorType.VALIDATION, { context, severity: ErrorSeverity.LOW }),
    
  timeout: (message: string, context?: Record<string, any>) =>
    new SEOError(message, ErrorType.TIMEOUT, { context, retryable: true }),
    
  parsing: (message: string, context?: Record<string, any>) =>
    new SEOError(message, ErrorType.PARSING, { context }),
    
  analysis: (message: string, context?: Record<string, any>) =>
    new SEOError(message, ErrorType.ANALYSIS, { context }),
    
  configuration: (message: string, context?: Record<string, any>) =>
    new SEOError(message, ErrorType.CONFIGURATION, { 
      context, 
      severity: ErrorSeverity.CRITICAL,
      recoverable: false 
    })
};

// Exportar instancia singleton
export const errorHandler = ErrorHandler.getInstance();