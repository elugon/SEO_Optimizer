import { SEOAnalysisOrchestrator } from './orchestrator/index.js';
import type { CompleteAnalysisResult } from './types/analysis.js';

// Create default orchestrator instance
const orchestrator = new SEOAnalysisOrchestrator(
  undefined // Use default HTTP client
);

/**
 * Refactored analyzePage function using the new orchestrator architecture
 * This maintains backward compatibility with the existing API
 */
export async function analyzePage(url: string, isMainPage: boolean = false): Promise<CompleteAnalysisResult> {
  try {
    const result = await orchestrator.analyzeUrl(url, { isMainPage });
    return result;
  } catch (error) {
    throw error;
  }
}

// Export the orchestrator for advanced usage
export { orchestrator as seoOrchestrator };