/**
 * Score Calculator Utility
 * Centraliza la lógica de cálculo de puntuaciones SEO
 * Principios aplicados: DRY, Single Responsibility, Open/Closed
 */

export class ScoreCalculator {
  // Pesos de penalizaciones por tipo
  private static readonly PENALTY_WEIGHTS: Record<string, number> = {
    critical: 30,
    high: 20,
    medium: 10,
    low: 5,
    minor: 2
  };

  // Rangos de puntuación
  private static readonly SCORE_RANGES = {
    excellent: { min: 90, label: 'Excelente', color: 'green' },
    good: { min: 70, label: 'Bueno', color: 'yellow' },
    needsImprovement: { min: 50, label: 'Necesita mejoras', color: 'orange' },
    poor: { min: 0, label: 'Pobre', color: 'red' }
  };

  /**
   * Aplica una penalización a la puntuación
   */
  static applyPenalty(score: number, penaltyType: string): number {
    const penalty = this.PENALTY_WEIGHTS[penaltyType] || 0;
    return Math.max(0, score - penalty);
  }

  /**
   * Aplica múltiples penalizaciones
   */
  static applyMultiplePenalties(
    score: number, 
    penalties: Array<{ type: string; count?: number }>
  ): number {
    let finalScore = score;
    
    penalties.forEach(({ type, count = 1 }) => {
      const penaltyValue = this.PENALTY_WEIGHTS[type] || 0;
      finalScore -= penaltyValue * count;
    });
    
    return Math.max(0, Math.min(100, finalScore));
  }

  /**
   * Normaliza una puntuación al rango 0-100
   */
  static normalizeScore(score: number, min: number = 0, max: number = 100): number {
    if (score <= min) return 0;
    if (score >= max) return 100;
    
    return Math.round(((score - min) / (max - min)) * 100);
  }

  /**
   * Calcula puntuación basada en rangos óptimos
   */
  static calculateRangeScore(
    value: number, 
    optimalMin: number, 
    optimalMax: number,
    acceptableMin: number = optimalMin * 0.7,
    acceptableMax: number = optimalMax * 1.3
  ): number {
    // Dentro del rango óptimo: 100 puntos
    if (value >= optimalMin && value <= optimalMax) {
      return 100;
    }
    
    // Fuera del rango aceptable: 0 puntos
    if (value < acceptableMin || value > acceptableMax) {
      return 0;
    }
    
    // Entre aceptable y óptimo: puntuación proporcional
    if (value < optimalMin) {
      return this.normalizeScore(value, acceptableMin, optimalMin);
    } else {
      return this.normalizeScore(acceptableMax - value, 0, acceptableMax - optimalMax);
    }
  }

  /**
   * Calcula puntuación ponderada de múltiples factores
   */
  static calculateWeightedScore(
    factors: Array<{ score: number; weight: number }>
  ): number {
    const totalWeight = factors.reduce((sum, f) => sum + f.weight, 0);
    if (totalWeight === 0) return 0;
    
    const weightedSum = factors.reduce(
      (sum, f) => sum + (f.score * f.weight), 
      0
    );
    
    return Math.round(weightedSum / totalWeight);
  }

  /**
   * Obtiene el rango de puntuación para un score
   */
  static getScoreRange(score: number): {
    label: string;
    color: string;
    range: string;
  } {
    for (const [key, range] of Object.entries(this.SCORE_RANGES)) {
      if (score >= range.min) {
        return {
          label: range.label,
          color: range.color,
          range: key
        };
      }
    }
    
    return {
      label: 'Pobre',
      color: 'red',
      range: 'poor'
    };
  }

  /**
   * Calcula puntuación basada en presencia/ausencia
   */
  static calculatePresenceScore(
    present: number,
    total: number,
    requiredPercentage: number = 100
  ): number {
    if (total === 0) return 100;
    
    const percentage = (present / total) * 100;
    
    if (percentage >= requiredPercentage) {
      return 100;
    }
    
    return Math.round((percentage / requiredPercentage) * 100);
  }

  /**
   * Calcula puntuación basada en velocidad/tiempo
   */
  static calculateSpeedScore(
    actualTime: number,
    excellentTime: number,
    goodTime: number,
    poorTime: number
  ): number {
    if (actualTime <= excellentTime) return 100;
    if (actualTime >= poorTime) return 0;
    
    if (actualTime <= goodTime) {
      // Entre excelente y bueno: 80-100
      return this.normalizeScore(
        goodTime - actualTime,
        0,
        goodTime - excellentTime
      ) * 20 + 80;
    } else {
      // Entre bueno y pobre: 0-80
      return this.normalizeScore(
        poorTime - actualTime,
        0,
        poorTime - goodTime
      ) * 80;
    }
  }

  /**
   * Calcula puntuación con decaimiento exponencial
   */
  static calculateExponentialScore(
    value: number,
    optimal: number,
    decayRate: number = 0.1
  ): number {
    const distance = Math.abs(value - optimal);
    return Math.round(100 * Math.exp(-decayRate * distance));
  }

  /**
   * Combina múltiples puntuaciones con diferentes estrategias
   */
  static combineScores(
    scores: number[],
    strategy: 'average' | 'minimum' | 'harmonic' = 'average'
  ): number {
    if (scores.length === 0) return 0;
    
    switch (strategy) {
      case 'minimum':
        return Math.min(...scores);
        
      case 'harmonic':
        const sum = scores.reduce((s, score) => s + (1 / (score || 1)), 0);
        return Math.round(scores.length / sum);
        
      case 'average':
      default:
        return Math.round(
          scores.reduce((sum, score) => sum + score, 0) / scores.length
        );
    }
  }
}