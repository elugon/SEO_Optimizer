/**
 * Analyzer Factory
 * Implementa lazy loading y gestión centralizada de analyzers
 * Principios aplicados: Factory Pattern, Lazy Loading, Dependency Injection
 */

import type { SEOAnalyzer, AnalysisContext, AnalysisResult } from '../types/analyzer.js';

// Tipos de analyzers disponibles
export type AnalyzerType = 
  | 'title'
  | 'description'
  | 'heading'
  | 'technical'
  | 'image'
  | 'keyword'
  | 'performance'
  | 'links'
  | 'security'
  | 'eat';

// Mapa de analyzers con lazy loading
const ANALYZER_LOADERS: Record<AnalyzerType, () => Promise<any>> = {
  title: () => import('./focused/title-analyzer.js'),
  description: () => import('./focused/description-analyzer.js'),
  heading: () => import('./focused/heading-analyzer.js'),
  technical: () => import('./focused/technical-analyzer.js'),
  image: () => import('./focused/image-analyzer-focused.js'),
  keyword: () => import('./focused/keyword-analyzer-focused.js'),
  performance: () => import('./focused/performance-analyzer.js'),
  links: () => import('./focused/links-analyzer.js'),
  security: () => import('./focused/security-analyzer.js'),
  eat: () => import('./focused/eat-analyzer.js')
};

/**
 * Factory class para crear analyzers con lazy loading
 */
export class AnalyzerFactory {
  private static instance: AnalyzerFactory;
  private cache: Map<AnalyzerType, SEOAnalyzer> = new Map();
  private loadingPromises: Map<AnalyzerType, Promise<SEOAnalyzer>> = new Map();

  private constructor() {}

  /**
   * Obtiene la instancia singleton del factory
   */
  static getInstance(): AnalyzerFactory {
    if (!AnalyzerFactory.instance) {
      AnalyzerFactory.instance = new AnalyzerFactory();
    }
    return AnalyzerFactory.instance;
  }

  /**
   * Obtiene un analyzer, cargándolo si es necesario
   */
  async getAnalyzer(type: AnalyzerType): Promise<SEOAnalyzer> {
    // Verificar cache
    if (this.cache.has(type)) {
      return this.cache.get(type)!;
    }

    // Verificar si ya se está cargando
    if (this.loadingPromises.has(type)) {
      return this.loadingPromises.get(type)!;
    }

    // Crear promise de carga
    const loadingPromise = this.loadAnalyzer(type);
    this.loadingPromises.set(type, loadingPromise);

    try {
      const analyzer = await loadingPromise;
      this.cache.set(type, analyzer);
      this.loadingPromises.delete(type);
      return analyzer;
    } catch (error) {
      this.loadingPromises.delete(type);
      throw error;
    }
  }

  /**
   * Obtiene múltiples analyzers en paralelo
   */
  async getAnalyzers(types: AnalyzerType[]): Promise<Map<AnalyzerType, SEOAnalyzer>> {
    const promises = types.map(async (type) => {
      const analyzer = await this.getAnalyzer(type);
      return [type, analyzer] as [AnalyzerType, SEOAnalyzer];
    });

    const results = await Promise.all(promises);
    return new Map(results);
  }

  /**
   * Pre-carga analyzers específicos
   */
  async preload(types: AnalyzerType[]): Promise<void> {
    await this.getAnalyzers(types);
  }

  /**
   * Limpia el cache de analyzers
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Carga un analyzer específico
   */
  private async loadAnalyzer(type: AnalyzerType): Promise<SEOAnalyzer> {
    const loader = ANALYZER_LOADERS[type];
    if (!loader) {
      throw new Error(`Analyzer type "${type}" not found`);
    }

    try {
      const module = await loader();
      // Los analyzers exportan una clase por defecto
      const AnalyzerClass = module.default || module[Object.keys(module)[0]];
      return new AnalyzerClass();
    } catch (error) {
      throw new Error(`Failed to load analyzer "${type}": ${error}`);
    }
  }
}

/**
 * Analyzer compuesto que ejecuta múltiples analyzers
 */
export class CompositeAnalyzer implements SEOAnalyzer {
  constructor(
    private analyzers: SEOAnalyzer[],
    private parallel: boolean = true
  ) {}

  async analyze(context: AnalysisContext): Promise<AnalysisResult> {
    const results = this.parallel
      ? await this.analyzeParallel(context)
      : await this.analyzeSequential(context);

    return this.mergeResults(results);
  }

  private async analyzeParallel(context: AnalysisContext): Promise<AnalysisResult[]> {
    return Promise.all(
      this.analyzers.map(analyzer => analyzer.analyze(context))
    );
  }

  private async analyzeSequential(context: AnalysisContext): Promise<AnalysisResult[]> {
    const results: AnalysisResult[] = [];
    
    for (const analyzer of this.analyzers) {
      results.push(await analyzer.analyze(context));
    }
    
    return results;
  }

  private mergeResults(results: AnalysisResult[]): AnalysisResult {
    const merged: AnalysisResult = {
      type: 'composite',
      score: 0,
      weight: 1,
      passed: [],
      issues: [],
      data: {}
    };

    // Combinar resultados
    for (const result of results) {
      merged.passed.push(...result.passed);
      merged.issues.push(...result.issues);
      Object.assign(merged.data, result.data);
    }

    // Calcular score promedio ponderado
    const totalWeight = results.reduce((sum, r) => sum + r.weight, 0);
    if (totalWeight > 0) {
      merged.score = results.reduce((sum, r) => sum + (r.score * r.weight), 0) / totalWeight;
    }

    return merged;
  }
}

/**
 * Helper para crear analyzers con configuración
 */
export async function createAnalyzer(
  types: AnalyzerType | AnalyzerType[],
  options: {
    parallel?: boolean;
  } = {}
): Promise<SEOAnalyzer> {
  const factory = AnalyzerFactory.getInstance();
  
  // Un solo analyzer
  if (!Array.isArray(types)) {
    return await factory.getAnalyzer(types);
  }

  // Múltiples analyzers
  const analyzers = await Promise.all(
    types.map(type => factory.getAnalyzer(type))
  );

  return new CompositeAnalyzer(
    analyzers,
    options.parallel !== false
  );
}

/**
 * Pre-carga analyzers críticos para mejorar performance
 */
export async function preloadCriticalAnalyzers(): Promise<void> {
  const criticalAnalyzers: AnalyzerType[] = [
    'title',
    'description',
    'heading',
    'technical'
  ];

  const factory = AnalyzerFactory.getInstance();
  await factory.preload(criticalAnalyzers);
}