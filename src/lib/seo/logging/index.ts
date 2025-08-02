/**
 * Silent logging system - all logging operations are no-ops
 */

export interface Logger {
  debug(message: string, data?: any, context?: string): void;
  info(message: string, data?: any, context?: string): void;
  warn(message: string, data?: any, context?: string): void;
  error(message: string, data?: any, context?: string): void;
  fatal(message: string, data?: any, context?: string): void;
}

class SilentLogger implements Logger {
  debug(_message: string, _data?: any, _context?: string): void {
    // Silent - do nothing
  }

  info(_message: string, _data?: any, _context?: string): void {
    // Silent - do nothing
  }

  warn(_message: string, _data?: any, _context?: string): void {
    // Silent - do nothing
  }

  error(_message: string, _data?: any, _context?: string): void {
    // Silent - do nothing
  }

  fatal(_message: string, _data?: any, _context?: string): void {
    // Silent - do nothing
  }
}

// Create singleton logger instance
export const logger: Logger = new SilentLogger();

/**
 * Create a contextual logger for specific modules
 */
export function createLogger(_context: string): Logger {
  return new SilentLogger();
}

/**
 * Performance logging utility - Silent version
 */
export class PerformanceLogger {
  constructor(_context: string, _operation: string) {
    // Silent - do nothing
  }

  finish(_operation: string, _additionalData?: any): void {
    // Silent - do nothing
  }

  error(_operation: string, _error: Error): void {
    // Silent - do nothing
  }
}

/**
 * Analysis step logging helper - Silent version
 */
export function logAnalysisStep(_step: string, _url: string, _data?: any): void {
  // Silent - do nothing
}

/**
 * Error boundary logging - Silent version
 */
export function logUnhandledError(_error: Error, _context: string): void {
  // Silent - do nothing
}