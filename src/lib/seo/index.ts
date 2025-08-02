// Main SEO library exports

// Core utility functions (moved to focused analyzers)
export { calculateRealMobileScore } from './analyzers/focused/utils/mobile-utils.js';
export { analyzeAdvancedImageOptimization } from './analyzers/focused/utils/image-optimization-utils.js';
export { analyzeRobotsTxt, analyzeSitemap } from './analyzers/focused/utils/robots-sitemap-utils.js';

// MAIN ARCHITECTURE - Unified system
export { analyzePage, seoOrchestrator } from './refactored-analyzer.js';
export { analyzePage as analyzePageRefactored } from './refactored-analyzer.js'; // Backward compatibility alias
export { SEOAnalysisOrchestrator } from './orchestrator/index.js';
// Focused analyzers (classes)
export { 
  TitleAnalyzer,
  DescriptionAnalyzer,
  HeadingAnalyzer,
  TechnicalAnalyzer,
  ImageAnalyzerFocused,
  KeywordAnalyzerFocused,
  PerformanceAnalyzer,
  LinksAnalyzer,
  MobileAnalyzer as MobileAnalyzerClass,
  SecurityAnalyzer,
  EATAnalyzer 
} from './analyzers/focused/index.js';

export * from './constants/index.js';

// Interfaces (including MobileAnalyzer interface)
export type {
  AnalysisContext,
  AnalysisResult,
  SEOAnalyzer,
  HttpClient,
  ScoringRule,
  ScoringEngine,
  RobotsAnalyzer,
  SitemapAnalyzer,
  ImageAnalyzer,
  MobileAnalyzer as MobileAnalyzerInterface,
  KeywordAnalyzer
} from './interfaces/index.js';
export * from './scoring/index.js';

// Utilities
export { normalizeUrl } from './utils/url-utils.js';
export { extractMetaDescription, extractEnhancedMetaKeywords } from './utils/meta-utils.js';
export { extractMainContent, extractContentText, hasEmojis, hasSpecialSymbols } from './utils/content-utils.js';
export { getImageFormat } from './utils/image-utils.js';
export { calculateTFIDF, analyzeKeywordOptimization, detectKeywordStuffing } from './utils/keyword-utils.js';
export { validateHeadingHierarchy } from './utils/validation-utils.js';

// NEW UTILITIES
export * from './utils/html-parser.js';
export * from './utils/fetch-utils.js';
export * from './utils/issue-factory.js';
export * from './utils/scoring-utils.js';

// Types - Explicit exports to avoid conflicts
export type { 
  Headings,
  Images,
  Links,
  Technical,
  Performance
} from './types/index.js';

export type {
  FocusedAnalysisResult,
  TitleAnalysis,
  DescriptionAnalysis,
  HeadingAnalysis,
  KeywordAnalysis,
  TechnicalAnalysis,
  SecurityAnalysis
} from './types/focused-analysis.js';