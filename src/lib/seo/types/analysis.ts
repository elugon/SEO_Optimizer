// Complete analysis types

import type { Issue, AnalysisResult, Performance, Links, Technical } from './common.js';

// Re-export Issue and other commonly used types
export type { Issue, AnalysisResult, Performance, Links, Technical };
import type { ImageAnalysisResult, ImageFormats } from './image.js';

export interface Headings {
  h1: string[];
  h2: string[];
  h3: string[];
  h4: string[];
  h5: string[];
  h6: string[];
}

export interface Images {
  total: number;
  withAlt: number;
  withoutAlt: number;
  optimization: ImageAnalysisResult;
  modernFormats?: ImageFormats;
  compression?: boolean;
  analysisScope: string;
  scopeNote: string;
}

export interface KeywordAnalysis {
  word: string;
  frequency: number;
  tf: string;
  density: string;
  naturalDensity: boolean;
}

export interface MetaKeywordsData {
  raw: string;
  processed: string[];
  count: number;
  isValid: boolean;
}

export interface ContentStats {
  bodyWordCount: number;
  titleWordCount: number;
  h1WordCount: number;
  avgDensity: string;
}

export interface QualityMetrics {
  stuffingIssues: Array<{
    type: string;
    keyword: string;
    density?: string;
    frequency?: number;
    message: string;
  }>;
  naturalKeywords: number;
  positioningScore: number;
  totalKeywordScore: number;
  maxPossibleScore: number;
}

export interface KeywordRecommendation {
  type: string;
  priority: string;
  message: string;
  action: string;
}

export interface Keywords {
  topKeywords: Array<{
    word: string;
    count: number;
    density: string;
  }>;
  totalWords: number;
  uniqueWords: number;
  keywordOptimization: number;
  metaKeywords: string;
  analysis: {
    metaKeywords: MetaKeywordsData;
    contentKeywords: KeywordAnalysis[];
    contentStats: ContentStats;
    qualityMetrics: QualityMetrics;
    recommendations: KeywordRecommendation[];
  };
}

export interface Security {
  hsts: {
    present: boolean;
    maxAge?: number;
    includeSubDomains?: boolean;
    preload?: boolean;
    rawValue?: string;
  };
  csp: {
    present: boolean;
    policies?: string[];
    unsafeInline?: boolean;
    unsafeEval?: boolean;
    rawValue?: string;
  };
  xFrameOptions: {
    present: boolean;
    value?: 'DENY' | 'SAMEORIGIN' | 'ALLOW-FROM' | string;
    rawValue?: string;
  };
  referrerPolicy: {
    present: boolean;
    policy?: string;
    rawValue?: string;
  };
  additionalHeaders: {
    xContentTypeOptions?: boolean;
    xXssProtection?: boolean;
    expectCt?: boolean;
  };
}

export interface Mobile {
  hasViewport: boolean;
  viewportContent: string;
  isResponsive: boolean;
  isTouchFriendly: boolean;
  mobileScore: number;
  responsiveFramework: string | null;
  mobileFriendlyTest: 'excellent' | 'good' | 'needs-improvement' | 'poor';
}

export interface EAT {
  experience: {
    score: number;
    authorInfo: {
      hasAuthor: boolean;
      authorName?: string;
      authorBio?: string;
      authorCredentials?: string[];
    };
    expertiseSignals: {
      hasExpertiseMarkers: boolean;
      certifications: string[];
      qualifications: string[];
      experience: string[];
    };
  };
  authoritativeness: {
    score: number;
    contactInfo: {
      hasContactPage: boolean;
      contactMethods: string[];
      businessInfo: boolean;
    };
    aboutInfo: {
      hasAboutPage: boolean;
      organizationInfo: boolean;
      missionStatement: boolean;
    };
    trustSignals: {
      testimonials: boolean;
      reviews: boolean;
      awards: boolean;
      certifications: boolean;
      socialProof: string[];
    };
  };
  trustworthiness: {
    score: number;
    contentFreshness: {
      hasLastModified: boolean;
      lastModifiedDate?: string;
      contentAge?: number;
    };
    transparencySignals: {
      privacyPolicy: boolean;
      termsOfService: boolean;
      disclaimers: boolean;
      secureConnection: boolean;
    };
    credibilityMarkers: {
      sources: string[];
      references: boolean;
      factChecking: boolean;
      corrections: boolean;
    };
  };
  overallScore: number;
}

export interface CompleteAnalysisResult extends AnalysisResult {
  title: string;
  description: string;
  headings: Headings;
  images: Images;
  links: Links;
  technical: Technical;
  performance: Performance;
  keywords: Keywords;
  mobile: Mobile;
  security: Security;
  eat: EAT;
  issues: Issue[];
}

export interface AnalysisSummary {
  totalPages: number;
  successfulPages: number;
  failedPages: number;
  avgSeoScore: number;
  criticalIssues: number;
  warningIssues: number;
  successIssues: number;
  cachedResults: number;
}

export interface CacheInfo {
  cacheSize: number;
  cacheTtlMinutes: number;
  cachedPagesInThisAnalysis: number;
}

export interface UnifiedAnalysisResponse extends CompleteAnalysisResult {
  summary: AnalysisSummary;
  pages: AnalysisResult[];
  isMultiPage: boolean;
  cacheInfo?: CacheInfo;
}