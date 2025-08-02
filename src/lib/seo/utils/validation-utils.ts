// Validation utilities for SEO analysis

import type { Issue } from '../types/common.js';

/**
 * Validate heading hierarchy
 */
export function validateHeadingHierarchy(html: string): {
  hierarchyScore: number;
  hierarchyIssues: Issue[];
} {
  const hierarchyIssues: Issue[] = [];
  let hierarchyScore = 0;
  
  if (!html || typeof html !== 'string') {
    return { hierarchyScore: 0, hierarchyIssues: [] };
  }
  
  // More robust heading extraction that handles nested content
  const headingMatches = [];
  const headingRegex = /<h([1-6])(?:\s[^>]*)?>[\s\S]*?<\/h\1>/gi;
  let match: RegExpExecArray | null;
  
  while ((match = headingRegex.exec(html)) !== null) {
    const level = parseInt(match[1]);
    if (level >= 1 && level <= 6) {
      headingMatches.push(match[0]);
    }
  }
  
  const headingSequence = headingMatches.map((heading: string) => {
    const levelMatch = heading.match(/<h([1-6])/i);
    return levelMatch ? parseInt(levelMatch[1]) : 0;
  }).filter(level => level > 0);
  
  if (headingSequence.length === 0) {
    return { hierarchyScore: 0, hierarchyIssues: [] };
  }
  
  // Check for sequential order violations
  let currentMaxLevel = 0;
  const violations = [];
  
  // Ensure we have a minimum score to work with
  hierarchyScore = Math.max(0, hierarchyScore);
  
  for (let i = 0; i < headingSequence.length; i++) {
    const currentLevel = headingSequence[i];
    
    if (i === 0) {
      if (currentLevel !== 1) {
        hierarchyScore = Math.max(0, hierarchyScore - 8);
        violations.push(`La página debería comenzar con H1, pero comienza con H${currentLevel}`);
      }
      currentMaxLevel = currentLevel;
    } else {
      // Check if there's a jump in hierarchy (skipping levels)
      if (currentLevel > currentMaxLevel + 1) {
        const skippedLevels = [];
        for (let j = currentMaxLevel + 1; j < currentLevel; j++) {
          skippedLevels.push(`H${j}`);
        }
        const penalty = (currentLevel - currentMaxLevel - 1) * 2;
        hierarchyScore = Math.max(0, hierarchyScore - penalty);
        violations.push(`Salto jerárquico detectado: de H${currentMaxLevel} a H${currentLevel}, falta${skippedLevels.length > 1 ? 'n' : ''} ${skippedLevels.join(', ')}`);
      }
      
      if (currentLevel > currentMaxLevel) {
        currentMaxLevel = currentLevel;
      }
    }
  }
  
  // Generate specific issues based on violations
  violations.forEach(violation => {
    hierarchyIssues.push({ 
      type: 'warning', 
      message: violation + '. Los encabezados deben seguir un orden secuencial H1→H2→H3→H4→H5→H6', 
      priority: 'medium', 
      category: 'content' 
    });
  });
  
  // Additional specific checks - improved logic to avoid indexOf(-1) issues
  const firstH2Index = headingSequence.indexOf(2);
  if (firstH2Index !== -1) {
    const beforeH2 = headingSequence.slice(0, firstH2Index);
    if (!beforeH2.includes(1)) {
      hierarchyScore = Math.max(0, hierarchyScore - 6);
      hierarchyIssues.push({ 
        type: 'warning', 
        message: 'H2 encontrado antes que H1. El primer encabezado debe ser H1', 
        priority: 'medium', 
        category: 'content' 
      });
    }
  }
  
  const firstH3Index = headingSequence.indexOf(3);
  if (firstH3Index !== -1) {
    const beforeH3 = headingSequence.slice(0, firstH3Index);
    if (!beforeH3.includes(2)) {
      hierarchyScore = Math.max(0, hierarchyScore - 5);
      hierarchyIssues.push({ 
        type: 'warning', 
        message: 'H3 encontrado sin H2 previo. Debe existir un H2 antes del primer H3', 
        priority: 'medium', 
        category: 'content' 
      });
    }
  }
  
  // Success message if structure is correct
  if (violations.length === 0 && headingSequence.length > 1) {
    hierarchyIssues.push({ 
      type: 'success', 
      message: 'Excelente estructura jerárquica de encabezados - orden secuencial correcto', 
      priority: 'low', 
      category: 'content' 
    });
  }
  
  return { hierarchyScore, hierarchyIssues };
}