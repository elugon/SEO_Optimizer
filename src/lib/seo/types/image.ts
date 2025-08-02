// Image analysis types

export interface ImageFormats {
  webp: number;
  avif: number;
  jpeg: number;
  png: number;
  gif: number;
  svg: number;
  total: number;
  modernPercentage: number;
}

export interface ImageCompression {
  score: number;
  issues: Array<{
    type: string;
    message: string;
    severity: string;
  }>;
}


export interface CriticalImages {
  aboveTheFold: number;
  belowTheFold: number;
  criticalOptimized: number;
  criticalScore: number;
}

export interface ImageOptimization {
  score: number;
  issues: Array<{
    type: string;
    message: string;
    priority: string;
  }>;
  recommendations: Array<{
    action: string;
    impact: string;
    priority: string;
  }>;
}

export interface ImageAnalysisResult {
  modernFormats: ImageFormats;
  compression: ImageCompression;
  criticalImages: CriticalImages;
  optimization: ImageOptimization;
}