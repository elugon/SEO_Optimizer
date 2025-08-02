// Keyword analysis utilities

import type { KeywordAnalysis, MetaKeywordsData } from '../types/analysis.js';

/**
 * Calculate real TF-IDF analysis for keywords
 */
export function calculateTFIDF(text: string, keywords: string[]): KeywordAnalysis[] {
  if (!text || typeof text !== 'string') {
    return [];
  }
  
  const words = text.toLowerCase().split(/\s+/).filter(word => word.length > 2);
  const totalWords = words.length;
  
  return keywords.map(keyword => {
    const keywordWords = keyword.toLowerCase().split(/\s+/);
    let frequency = 0;
    
    if (keywordWords.length === 1) {
      // Single word keyword - use exact word matching to avoid false positives
      const exactWordRegex = new RegExp(`\\b${keywordWords[0].replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
      frequency = (text.match(exactWordRegex) || []).length;
    } else {
      // Multi-word phrase keyword
      const keywordPhrase = keywordWords.join(' ');
      const regex = new RegExp(keywordPhrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
      frequency = (text.match(regex) || []).length;
    }
    
    const tf = totalWords > 0 ? frequency / totalWords : 0;
    const densityValue = totalWords > 0 ? (frequency / totalWords) * 100 : 0;
    const density = densityValue.toFixed(2);
    
    return {
      word: keyword,
      frequency,
      tf: tf.toFixed(4),
      density: density,
      naturalDensity: frequency > 0 && densityValue <= 3 && densityValue >= 0.5 // Natural density 0.5-3%
    };
  });
}

/**
 * Analyze keyword optimization and positioning
 */
export function analyzeKeywordOptimization(
  contentKeywords: KeywordAnalysis[],
  title: string,
  description: string,
  headings: any
): {
  keywordOptimization: number;
  positioningBonus: number;
  missingKeywordsInDescription: string[];
} {
  const titleText = (title || '').toLowerCase();
  const descText = (description || '').toLowerCase();
  let keywordOptimization = 0;
  let positioningBonus = 0;
  const missingKeywordsInDescription: string[] = [];
  
  contentKeywords.forEach(keywordObj => {
    const keyword = keywordObj.word.toLowerCase();
    
    // Enhanced positioning scoring
    if (titleText.includes(keyword)) {
      keywordOptimization += 8; // Increased from 5 to 8
      positioningBonus += 3;
    }
    if (descText.includes(keyword)) {
      keywordOptimization += 5; // Increased from 3 to 5
      positioningBonus += 2;
    } else {
      // SEO 2025: Track keywords missing in meta description
      missingKeywordsInDescription.push(keyword);
    }
    if (headings && headings.h1 && Array.isArray(headings.h1)) {
      if (headings.h1.some((h1: string) => h1 && h1.toLowerCase().includes(keyword))) {
        positioningBonus += 4;
      }
    }
    if (headings && headings.h2 && Array.isArray(headings.h2)) {
      if (headings.h2.some((h2: string) => h2 && h2.toLowerCase().includes(keyword))) {
        positioningBonus += 2;
      }
    }
  });
  
  return {
    keywordOptimization,
    positioningBonus,
    missingKeywordsInDescription
  };
}

/**
 * Detect keyword stuffing issues
 */
export function detectKeywordStuffing(
  contentKeywords: KeywordAnalysis[],
  metaKeywordsData: MetaKeywordsData
): Array<{
  type: string;
  keyword: string;
  density?: string;
  frequency?: number;
  message: string;
}> {
  const stuffingIssues = [];
  
  // UNIFIED LOGIC: Use the same limited contentKeywords that cards display
  // This ensures consistency between warnings and card display (DRY principle)
  const effectiveKeywordCount = contentKeywords.length; // Already limited to 5 in analyzer
  const metaKeywordCount = metaKeywordsData.processed.length; // Raw meta keywords count
  const hasExcessiveMetaKeywords = metaKeywordCount > 5;
  
  // Add warning if RAW META KEYWORDS exceed 5, but reference the effective count
  if (hasExcessiveMetaKeywords) {
    stuffingIssues.push({
      type: 'meta_keywords_limit_exceeded',
      keyword: 'meta_keywords',
      frequency: effectiveKeywordCount, // Use the same count as cards display
      message: `Se definieron ${metaKeywordCount} meta keywords pero se analizan ${effectiveKeywordCount} principales. Recomendación: optimizar las 3-5 más relevantes para coherencia con la descripción`
    });
  }
  
  // Add warning if NO META KEYWORDS are defined (but only if we have content keywords)
  if (metaKeywordCount === 0 && effectiveKeywordCount > 0) {
    stuffingIssues.push({
      type: 'meta_keywords_missing',
      keyword: 'meta_keywords',
      frequency: effectiveKeywordCount,
      message: `Se identificaron ${effectiveKeywordCount} palabras clave principales pero no hay meta keywords. Recomendación: definir meta keywords coherentes con la descripción`
    });
  }
  
  contentKeywords.forEach(keywordObj => {
    const { word, density, frequency } = keywordObj;
    const densityNum = parseFloat(density) || 0;
    
    if (densityNum > 5) {
      stuffingIssues.push({
        type: 'high_density',
        keyword: word,
        density: density,
        message: `"${word}" tiene densidad alta (${density}%). Recomendado: 0.5-3%`
      });
    }
    
    if (frequency > 15) {
      stuffingIssues.push({
        type: 'high_frequency',
        keyword: word,
        frequency: frequency,
        message: `"${word}" se repite ${frequency} veces. Considera sinónimos`
      });
    }
  });
  
  return stuffingIssues;
}