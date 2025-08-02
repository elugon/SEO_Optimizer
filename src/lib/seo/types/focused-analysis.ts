import type { Issue } from './analysis.js';

export interface TitleAnalysis {
  title: string;
  length: number;
  hasEmojis: boolean;
  hasSpecialSymbols: boolean;
  score: number;
  issues: Issue[];
}

export interface DescriptionAnalysis {
  description: string;
  length: number;
  hasEmojis: boolean;
  hasSpecialSymbols: boolean;
  score: number;
  issues: Issue[];
}

export interface HeadingAnalysis {
  headings: {
    h1: string[];
    h2: string[];
    h3: string[];
    h4: string[];
    h5: string[];
    h6: string[];
  };
  hierarchyScore: number;
  hierarchyIssues: Issue[];
  h1Count: number;
  score: number;
  issues: Issue[];
}

export interface ImageAnalysis {
  totalImages: number;
  imagesWithAlt: number;
  imagesWithoutAlt: number;
  altTextScore: number;
  optimization: any; // Keep existing structure for now
  modernFormats: any;
  compression: any;
  score: number;
  issues: Issue[];
}

export interface TechnicalAnalysis {
  hasSSL: boolean;
  hasCanonical: boolean;
  hasRobotsMeta: boolean;
  hasRobotsTxt: boolean;
  hasSitemap: boolean;
  hasSchema: boolean;
  httpStatus: number;
  robotsTxt: any;
  sitemap: import('./sitemap.js').SitemapAnalysis | null;
  metaTagsCount?: import('../utils/html-parser.js').MetaTagsCount;
  score: number;
  issues: Issue[];
}

export interface KeywordAnalysis {
  topKeywords: Array<{
    word: string;
    count: number;
    density: string;
  }>;
  totalWords: number;
  uniqueWords: number;
  keywordOptimization: number;
  metaKeywords: string;
  analysis: any; // Keep existing structure for now
  score: number;
  issues: Issue[];
}

export interface CompressionInfo {
  enabled: boolean;
  type: 'gzip' | 'brotli' | 'deflate' | 'none';
  estimatedSavings?: number; // Percentage of size reduction
  originalSize?: number;
  compressedSize?: number;
}

export interface PerformanceAnalysis {
  loadTime: number;
  pageSize: number;
  resourceCount: number;
  mobileScore: number;
  ttfb: number; // Time to First Byte in milliseconds
  compression: CompressionInfo;
  score: number;
  issues: Issue[];
}

export interface LinksAnalysis {
  internal: number;
  external: number;
  broken: number;
  redirects: number;
  brokenLinks: string[];
  redirectChains: string[];
  internalUrls: string[];
  score: number;
  issues: Issue[];
}

export interface MobileAnalysis {
  hasViewport: boolean;
  viewportContent: string;
  isResponsive: boolean;
  isTouchFriendly: boolean;
  mobileScore: number;
  responsiveFramework: string | null;
  mobileFriendlyTest: 'excellent' | 'good' | 'needs-improvement' | 'poor';
  score: number;
  issues: Issue[];
}

export interface SecurityAnalysis {
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
  score: number;
  issues: Issue[];
}

export interface EATAnalysis {
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
  score: number;
  issues: Issue[];
}

export interface FocusedAnalysisResult {
  url: string;
  title: TitleAnalysis;
  description: DescriptionAnalysis;
  headings: HeadingAnalysis;
  images: ImageAnalysis;
  technical: TechnicalAnalysis;
  keywords: KeywordAnalysis;
  performance: PerformanceAnalysis;
  links: LinksAnalysis;
  mobile: MobileAnalysis;
  security: SecurityAnalysis;
  eat: EATAnalysis;
  overallScore: number;
  status: 'success' | 'failed';
  cached: boolean;
  error?: string;
  errorType?: string;
  httpStatus?: number;
}