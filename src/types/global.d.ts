// Global type definitions for window functions

import type { UnifiedAnalysisResponse } from '../lib/seo/types/analysis.js';

declare global {
  interface Window {
    updateProgressRing?: (score: number) => void;
    showSkeletonCards?: (count: number) => void;
    displayPageCards?: (data: UnifiedAnalysisResponse | any) => void;
    viewPageDetails?: (url: string) => void;
    pageCardService?: any;
    DOMUtils?: any;
  }
}

export {};