/**
 * Modern TypeScript utility types for enhanced type safety
 */

// DeepReadonly - Makes all properties and nested properties readonly
export type DeepReadonly<T> = {
  readonly [P in keyof T]: T[P] extends object ? DeepReadonly<T[P]> : T[P];
};

// DeepPartial - Makes all properties and nested properties optional
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

// Branded types for type-safe primitives
export type Brand<K, T> = K & { __brand: T };

// Branded URL type for validated URLs
export type ValidatedURL = Brand<string, 'ValidatedURL'>;

// Helper to create validated URLs
export function createValidatedURL(url: string): ValidatedURL {
  try {
    new URL(url);
    return url as ValidatedURL;
  } catch {
    throw new Error(`Invalid URL: ${url}`);
  }
}

// NonEmptyArray type
export type NonEmptyArray<T> = [T, ...T[]];

// Helper to check if array is non-empty
export function isNonEmptyArray<T>(arr: T[]): arr is NonEmptyArray<T> {
  return arr.length > 0;
}

// Result type for better error handling (similar to Rust)
export type Result<T, E = Error> = 
  | { ok: true; value: T }
  | { ok: false; error: E };

// Helper functions for Result type
export const Ok = <T>(value: T): Result<T, never> => ({ ok: true, value });
export const Err = <E>(error: E): Result<never, E> => ({ ok: false, error });

// Awaited utility type usage example
export type AsyncAnalysisResult<T extends (...args: any[]) => Promise<any>> = 
  Awaited<ReturnType<T>>;

// NoInfer utility for preventing type inference
export type StrictAnalyzerConfig<T> = {
  type: T;
  config: NoInfer<T extends 'title' ? { minLength: number; maxLength: number } :
          T extends 'keyword' ? { maxDensity: number; minOccurrences: number } :
          never>;
};

// Exact type - ensures no extra properties
export type Exact<T, Shape> = T extends Shape
  ? Exclude<keyof T, keyof Shape> extends never
    ? T
    : never
  : never;

// Type predicate for SEO scores
export type SEOScore = Brand<number, 'SEOScore'>;

export function isSEOScore(value: number): value is SEOScore {
  return value >= 0 && value <= 100;
}

export function createSEOScore(value: number): SEOScore {
  if (!isSEOScore(value)) {
    throw new Error(`Invalid SEO score: ${value}. Must be between 0 and 100.`);
  }
  return value as SEOScore;
}