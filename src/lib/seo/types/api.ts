/**
 * Modern TypeScript API type definitions using template literal types
 */

// HTTP Methods
export type HTTPMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

// API Endpoints using template literal types
export type APIEndpoint = 
  | '/api/analyze-unified'
  | `/api/analyze/${string}`
  | `/api/sitemap/${string}`
  | `/api/robots/${string}`;

// Complete route definition
export type APIRoute = `${HTTPMethod} ${APIEndpoint}`;

// Request parameters with type safety
export type APIRequest<T extends APIEndpoint> = 
  T extends '/api/analyze-unified' ? {
    method: 'POST';
    body: {
      url: string;
      options?: {
        skipCache?: boolean;
        timeoutMs?: number;
      };
    };
  } :
  T extends `/api/analyze/${string}` ? {
    method: 'GET';
    params: {
      url: string;
    };
  } :
  never;

// Response types with discriminated unions
export type APIResponse<T extends APIEndpoint> = 
  T extends '/api/analyze-unified' ? {
    success: true;
    data: import('./analysis.js').UnifiedAnalysisResponse;
  } | {
    success: false;
    error: import('../errors/index.js').SEOError;
  } :
  never;

// Type-safe API client factory
export interface TypedAPIClient {
  request<T extends APIEndpoint>(
    endpoint: T,
    options: APIRequest<T>
  ): Promise<APIResponse<T>>;
}