import type { AnalysisContext, ScoringRule, ScoringEngine } from '../interfaces/analyzers.js';
import type { Issue } from '../types/analysis.js';

export class ConfigurableScoringEngine implements ScoringEngine {
  private rules: Map<string, ScoringRule> = new Map();

  addRule(rule: ScoringRule): void {
    this.rules.set(rule.name, rule);
  }

  removeRule(name: string): void {
    this.rules.delete(name);
  }

  calculateScore(data: any, context: AnalysisContext): { totalScore: number; issues: Issue[] } {
    const allIssues: Issue[] = [];
    let totalWeight = 0;
    let weightedScore = 0;

    for (const rule of this.rules.values()) {
      try {
        const result = rule.evaluate(data, context);
        const weight = rule.weight || 1;
        
        // Use weighted average instead of confusing subtraction
        weightedScore += result.score * weight;
        totalWeight += weight;
        
        allIssues.push(...result.issues);
      } catch (error) {
      }
    }

    // Calculate final score as weighted average, fallback to 100 if no rules
    const finalScore = totalWeight > 0 ? weightedScore / totalWeight : 100;

    return {
      totalScore: Math.max(0, Math.min(100, Math.round(finalScore))),
      issues: allIssues
    };
  }

  getRules(): string[] {
    return Array.from(this.rules.keys());
  }

  hasRule(name: string): boolean {
    return this.rules.has(name);
  }

  clearRules(): void {
    this.rules.clear();
  }
}