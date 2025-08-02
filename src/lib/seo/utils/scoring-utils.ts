import { SEO_PENALTIES, SEO_SCORING_LIMITS, SEO_THRESHOLDS, KEYWORD_SCORING } from '../constants/scoring.js';

export function applySEOPenalty(
  currentScore: number,
  penaltyType: keyof typeof SEO_PENALTIES
): number {
  const penalty = SEO_PENALTIES[penaltyType];
  return Math.max(SEO_SCORING_LIMITS.MIN_SCORE, currentScore - penalty);
}

export function applyMultiplePenalties(
  currentScore: number,
  penalties: (keyof typeof SEO_PENALTIES)[]
): number {
  return penalties.reduce(
    (score, penalty) => applySEOPenalty(score, penalty),
    currentScore
  );
}

export function calculateScoreWithCap(score: number, maxPenalty: number): number {
  const finalPenalty = Math.min(maxPenalty, Math.max(0, 100 - score));
  return Math.max(SEO_SCORING_LIMITS.MIN_SCORE, 100 - finalPenalty);
}

export function calculateKeywordScore(
  keywordOptimization: number,
  positioningBonus: number
): number {
  return Math.min(KEYWORD_SCORING.MAX_KEYWORD_SCORE, keywordOptimization + positioningBonus);
}

export function getKeywordOptimizationLevel(score: number): 'poor' | 'basic' | 'good' | 'excellent' {
  if (score === 0) return 'poor';
  if (score < KEYWORD_SCORING.MIN_OPTIMIZATION_THRESHOLD) return 'basic';
  if (score < KEYWORD_SCORING.GOOD_OPTIMIZATION_THRESHOLD) return 'good';
  return 'excellent';
}

export function calculateSymbolPenalty(symbolCount: number, isTitle: boolean = true): number {
  if (isTitle) {
    const penalty = Math.min(
      SEO_SCORING_LIMITS.MAX_TITLE_SYMBOLS_PENALTY,
      Math.ceil(symbolCount * SEO_PENALTIES.TITLE_SYMBOLS_PER_PAIR) + SEO_PENALTIES.TITLE_SYMBOLS_BASE
    );
    return penalty;
  } else {
    const penalty = Math.min(
      SEO_SCORING_LIMITS.MAX_DESCRIPTION_SYMBOLS_PENALTY,
      Math.ceil(symbolCount * SEO_PENALTIES.DESCRIPTION_SYMBOLS_PER_TRIO)
    );
    return penalty;
  }
}

export function calculateImageAltPenalty(missingAltCount: number): number {
  return Math.min(
    SEO_SCORING_LIMITS.MAX_IMAGE_ALT_PENALTY,
    Math.ceil(missingAltCount * SEO_PENALTIES.IMAGE_NO_ALT_PER_PAIR)
  );
}

export function isValidTitleLength(title: string): boolean {
  return title.length >= SEO_THRESHOLDS.TITLE_MIN_LENGTH && 
         title.length <= SEO_THRESHOLDS.TITLE_MAX_LENGTH;
}

export function isValidDescriptionLength(description: string): boolean {
  return description.length >= SEO_THRESHOLDS.DESCRIPTION_MIN_LENGTH && 
         description.length <= SEO_THRESHOLDS.DESCRIPTION_MAX_LENGTH;
}