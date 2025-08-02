import { DEFAULT_HEADERS, ROBOTS_TXT_HEADERS, SITEMAP_HEADERS } from '../constants/http-headers.js';
import { TIMEOUTS } from '../constants/timeouts.js';

// Polyfill for AbortSignal.timeout() for better browser compatibility
function createTimeoutSignal(timeout: number): { signal: AbortSignal; cleanup: () => void } {
  if (typeof AbortSignal.timeout === 'function') {
    return { 
      signal: AbortSignal.timeout(timeout),
      cleanup: () => {} // No cleanup needed for native implementation
    };
  }
  
  // Fallback for older browsers with proper cleanup
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, timeout);
  
  return {
    signal: controller.signal,
    cleanup: () => {
      clearTimeout(timeoutId);
    }
  };
}

export interface FetchOptions {
  timeout?: number;
  headers?: Record<string, string>;
  signal?: AbortSignal;
}

export function createDefaultFetchOptions(timeout: number = TIMEOUTS.DEFAULT_FETCH): { options: RequestInit; cleanup: () => void } {
  const { signal, cleanup } = createTimeoutSignal(timeout);
  return {
    options: {
      headers: DEFAULT_HEADERS,
      signal
    },
    cleanup
  };
}

export function createRobotsFetchOptions(timeout: number = TIMEOUTS.ROBOTS_FETCH): { options: RequestInit; cleanup: () => void } {
  const { signal, cleanup } = createTimeoutSignal(timeout);
  return {
    options: {
      headers: ROBOTS_TXT_HEADERS,
      signal
    },
    cleanup
  };
}

export function createSitemapFetchOptions(timeout: number = TIMEOUTS.SITEMAP_FETCH): { options: RequestInit; cleanup: () => void } {
  const { signal, cleanup } = createTimeoutSignal(timeout);
  return {
    options: {
      headers: SITEMAP_HEADERS,
      signal
    },
    cleanup
  };
}

export async function fetchWithTimeout(
  url: string, 
  options: FetchOptions = {}
): Promise<Response> {
  const { timeout = TIMEOUTS.DEFAULT_FETCH, headers = DEFAULT_HEADERS } = options;
  
  let cleanup: (() => void) | null = null;
  let signal: AbortSignal;
  
  if (options.signal) {
    // Use external signal if provided
    signal = options.signal;
  } else {
    // Create timeout signal with cleanup
    const timeoutSetup = createTimeoutSignal(timeout);
    signal = timeoutSetup.signal;
    cleanup = timeoutSetup.cleanup;
  }
  
  try {
    const response = await fetch(url, {
      headers,
      signal
    });
    
    // Clean up timeout if request completed successfully
    if (cleanup) {
      cleanup();
    }
    
    return response;
  } catch (error) {
    // Clean up timeout even on error
    if (cleanup) {
      cleanup();
    }
    throw error;
  }
}

export function validateUrl(url: string): void {
  try {
    new URL(url);
  } catch {
    throw new Error(`URL malformada: ${url}`);
  }
}