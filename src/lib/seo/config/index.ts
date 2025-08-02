/**
 * Centralized configuration system for SEO analysis
 * All hardcoded values are now configurable through environment variables
 */

export interface SEOConfig {
  // Request timeouts
  readonly DEFAULT_TIMEOUT_MS: number;
  readonly FETCH_TIMEOUT_MS: number;
  readonly ANALYSIS_TIMEOUT_MS: number;
  
  // Analysis limits
  readonly MAX_INTERNAL_URLS: number;
  readonly MAX_PAGE_SIZE_MB: number;
  readonly MAX_CONCURRENT_ANALYSES: number;
  readonly BATCH_SIZE: number;
  
  // SEO thresholds
  readonly TITLE_MIN_LENGTH: number;
  readonly TITLE_MAX_LENGTH: number;
  readonly DESCRIPTION_MIN_LENGTH: number;
  readonly DESCRIPTION_MAX_LENGTH: number;
  
  // Performance settings
  readonly ENABLE_PARALLEL_ANALYSIS: boolean;
  readonly ENABLE_DETAILED_LOGGING: boolean;
  readonly ENABLE_LAZY_LOADING: boolean;
  
  // API configuration
  readonly API_BASE_PATH: string;
  readonly MAX_RETRIES: number;
  readonly RETRY_DELAY_MS: number;
  
  // Security settings
  readonly ENABLE_RATE_LIMITING: boolean;
  readonly RATE_LIMIT_WINDOW_MS: number;
  readonly RATE_LIMIT_MAX_REQUESTS: number;
  readonly ENABLE_SECURITY_HEADERS: boolean;
  
  // Environment
  readonly IS_DEVELOPMENT: boolean;
  readonly IS_PRODUCTION: boolean;
}

/**
 * Check if we're running in browser environment
 */
const isBrowser = typeof window !== 'undefined';

/**
 * Get environment variable as number with fallback
 */
function getEnvNumber(key: string, defaultValue: number): number {
  if (isBrowser) return defaultValue;
  const value = process.env[key];
  if (!value) return defaultValue;
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? defaultValue : parsed;
}

/**
 * Get environment variable as boolean with fallback
 */
function getEnvBoolean(key: string, defaultValue: boolean): boolean {
  if (isBrowser) return defaultValue;
  const value = process.env[key];
  if (!value) return defaultValue;
  return value.toLowerCase() === 'true' || value === '1';
}

/**
 * Get environment variable as string with fallback
 */
function getEnvString(key: string, defaultValue: string): string {
  if (isBrowser) return defaultValue;
  return process.env[key] || defaultValue;
}

/**
 * Central configuration object
 * All values can be overridden via environment variables
 */
export const CONFIG: SEOConfig = {
  // Request timeouts (in milliseconds)
  DEFAULT_TIMEOUT_MS: getEnvNumber('SEO_DEFAULT_TIMEOUT_MS', 10000),
  FETCH_TIMEOUT_MS: getEnvNumber('SEO_FETCH_TIMEOUT_MS', 8000),
  ANALYSIS_TIMEOUT_MS: getEnvNumber('SEO_ANALYSIS_TIMEOUT_MS', 30000),
  
  // Analysis limits
  MAX_INTERNAL_URLS: getEnvNumber('SEO_MAX_INTERNAL_URLS', 99),
  MAX_PAGE_SIZE_MB: getEnvNumber('SEO_MAX_PAGE_SIZE_MB', 5),
  MAX_CONCURRENT_ANALYSES: getEnvNumber('SEO_MAX_CONCURRENT_ANALYSES', 5), // Reducido para evitar sobrecarga
  BATCH_SIZE: getEnvNumber('SEO_BATCH_SIZE', 5), // Tamaño de lote para análisis concurrente
  
  // SEO thresholds
  TITLE_MIN_LENGTH: getEnvNumber('SEO_TITLE_MIN_LENGTH', 30),
  TITLE_MAX_LENGTH: getEnvNumber('SEO_TITLE_MAX_LENGTH', 60),
  DESCRIPTION_MIN_LENGTH: getEnvNumber('SEO_DESCRIPTION_MIN_LENGTH', 120),
  DESCRIPTION_MAX_LENGTH: getEnvNumber('SEO_DESCRIPTION_MAX_LENGTH', 160),
  
  // Performance settings
  ENABLE_PARALLEL_ANALYSIS: getEnvBoolean('SEO_ENABLE_PARALLEL_ANALYSIS', true),
  ENABLE_DETAILED_LOGGING: getEnvBoolean('SEO_ENABLE_DETAILED_LOGGING', false),
  ENABLE_LAZY_LOADING: getEnvBoolean('SEO_ENABLE_LAZY_LOADING', true),
  
  // API configuration
  API_BASE_PATH: getEnvString('SEO_API_BASE_PATH', '/api'),
  MAX_RETRIES: getEnvNumber('SEO_MAX_RETRIES', 3),
  RETRY_DELAY_MS: getEnvNumber('SEO_RETRY_DELAY_MS', 1000),
  
  // Security settings
  ENABLE_RATE_LIMITING: getEnvBoolean('SEO_ENABLE_RATE_LIMITING', true),
  RATE_LIMIT_WINDOW_MS: getEnvNumber('SEO_RATE_LIMIT_WINDOW_MS', 60000), // 1 minuto
  RATE_LIMIT_MAX_REQUESTS: getEnvNumber('SEO_RATE_LIMIT_MAX_REQUESTS', 60), // 60 requests por minuto
  ENABLE_SECURITY_HEADERS: getEnvBoolean('SEO_ENABLE_SECURITY_HEADERS', true),
  
  // Environment
  IS_DEVELOPMENT: !isBrowser && (process.env.NODE_ENV === 'development' || getEnvBoolean('SEO_DEV_MODE', false)),
  IS_PRODUCTION: !isBrowser && process.env.NODE_ENV === 'production'
} as const;

/**
 * Development mode check
 */
export const isDevelopment = (): boolean => {
  if (isBrowser) return false;
  return process.env.NODE_ENV === 'development' || getEnvBoolean('SEO_DEV_MODE', false);
};

/**
 * Production mode check
 */
export const isProduction = (): boolean => {
  if (isBrowser) return true;
  return process.env.NODE_ENV === 'production';
};

/**
 * Validate configuration on startup
 */
export function validateConfig(): void {
  const errors: string[] = [];
  
  if (CONFIG.DEFAULT_TIMEOUT_MS <= 0) {
    errors.push('DEFAULT_TIMEOUT_MS must be greater than 0');
  }
  
  if (CONFIG.MAX_INTERNAL_URLS <= 0) {
    errors.push('MAX_INTERNAL_URLS must be greater than 0');
  }
  
  if (CONFIG.TITLE_MIN_LENGTH >= CONFIG.TITLE_MAX_LENGTH) {
    errors.push(`TITLE_MIN_LENGTH (${CONFIG.TITLE_MIN_LENGTH}) must be less than TITLE_MAX_LENGTH (${CONFIG.TITLE_MAX_LENGTH})`);
  }
  
  if (CONFIG.DESCRIPTION_MIN_LENGTH >= CONFIG.DESCRIPTION_MAX_LENGTH) {
    errors.push(`DESCRIPTION_MIN_LENGTH (${CONFIG.DESCRIPTION_MIN_LENGTH}) must be less than DESCRIPTION_MAX_LENGTH (${CONFIG.DESCRIPTION_MAX_LENGTH})`);
  }
  
  if (errors.length > 0) {
    throw new Error(`Configuration validation failed:\n${errors.join('\n')}`);
  }
}

// Validate configuration on module load
validateConfig();