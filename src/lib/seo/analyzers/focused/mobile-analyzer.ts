import type { AnalysisContext, AnalysisResult, SEOAnalyzer } from '../../interfaces/analyzers.js';
import type { MobileAnalysis } from '../../types/focused-analysis.js';
import { 
  calculateRealMobileScore, 
  detectViewport, 
  analyzeViewportContent 
} from './utils/mobile-utils.js';
import { 
  createWarningIssue, 
  createSuccessIssue,
  createErrorIssue
} from '../../utils/issue-factory.js';

export class MobileAnalyzer implements SEOAnalyzer {

  async analyze(context: AnalysisContext): Promise<AnalysisResult> {
    const { html } = context;
    
    let score = 100;
    const issues = [];

    // Analyze mobile-specific features
    const mobileFeatures = this.analyzeMobileFeatures(html);
    
    // Calculate overall mobile score using utility function
    const mobileScore = calculateRealMobileScore(html, score);
    
    // Generate issues based on viewport analysis
    const viewport = detectViewport(html);
    
    if (!viewport.hasViewport) {
      score -= 30;
      issues.push(createErrorIssue(
        'Meta viewport no encontrado. Es esencial para dispositivos móviles',
        'performance'
      ));
    } else {
      const viewportAnalysis = analyzeViewportContent(viewport.viewportContent);
      
      if (!viewport.viewportContent) {
        score -= 25;
        issues.push(createErrorIssue(
          'Meta viewport encontrado pero sin contenido. Agrega content="width=device-width, initial-scale=1"',
          'performance'
        ));
      } else if (viewportAnalysis.isOptimal) {
        issues.push(createSuccessIssue(
          'Meta viewport configurado óptimamente',
          'performance'
        ));
      } else {
        // Generar advertencias específicas
        if (!viewportAnalysis.hasDeviceWidth) {
          score -= 15;
          issues.push(createWarningIssue(
            'Meta viewport no incluye width=device-width. Esto puede causar problemas de escala en móviles',
            'high',
            'performance'
          ));
        }
        
        if (viewportAnalysis.initialScale !== 1) {
          score -= 10;
          issues.push(createWarningIssue(
            `Escala inicial establecida en ${viewportAnalysis.initialScale || 'no definida'}. Se recomienda initial-scale=1`,
            'medium',
            'performance'
          ));
        }
        
        if (viewportAnalysis.userScalable === false) {
          score -= 5;
          issues.push(createWarningIssue(
            'Zoom deshabilitado (user-scalable=no). Esto afecta la accesibilidad',
            'medium',
            'performance'
          ));
        }
        
        if (viewportAnalysis.maximumScale && viewportAnalysis.maximumScale < 2) {
          score -= 5;
          issues.push(createWarningIssue(
            `Zoom máximo limitado a ${viewportAnalysis.maximumScale}. Se recomienda permitir al menos 2x zoom`,
            'low',
            'performance'
          ));
        }
      }
    }

    if (!mobileFeatures.isResponsive) {
      score -= 25;
      issues.push(createWarningIssue(
        'Diseño no responsivo detectado. Considera usar CSS media queries',
        'high',
        'performance'
      ));
    } else {
      issues.push(createSuccessIssue(
        'Diseño responsivo detectado',
        'performance'
      ));
    }

    if (!mobileFeatures.isTouchFriendly) {
      score -= 15;
      issues.push(createWarningIssue(
        'Elementos no optimizados para touch. Aumenta el tamaño de botones y enlaces',
        'medium',
        'performance'
      ));
    } else {
      issues.push(createSuccessIssue(
        'Elementos optimizados para dispositivos táctiles',
        'performance'
      ));
    }


    const mobileAnalysis: MobileAnalysis = {
      hasViewport: mobileFeatures.hasViewport,
      viewportContent: mobileFeatures.viewportContent,
      isResponsive: mobileFeatures.isResponsive,
      isTouchFriendly: mobileFeatures.isTouchFriendly,
      mobileScore,
      responsiveFramework: mobileFeatures.responsiveFramework,
      mobileFriendlyTest: this.getMobileFriendlyStatus(mobileScore),
      score: Math.max(0, score),
      issues
    };

    return {
      score: mobileAnalysis.score,
      issues: mobileAnalysis.issues,
      data: mobileAnalysis as unknown as Record<string, unknown>
    };
  }

  private analyzeMobileFeatures(html: string): {
    hasViewport: boolean;
    viewportContent: string;
    isResponsive: boolean;
    isTouchFriendly: boolean;
    responsiveFramework: string | null;
  } {
    // 1. Viewport Analysis usando la nueva función robusta
    const viewport = detectViewport(html);
    const hasViewport = viewport.hasViewport;
    const viewportContent = viewport.viewportContent;

    // 2. Responsive Design Detection
    const hasMediaQueries = /@media[^{]*\([^)]*(?:max-width|min-width)[^)]*\)/i.test(html);
    const hasResponsiveImages = /<img[^>]*(?:srcset|sizes)[^>]*>/i.test(html);
    const hasFlexboxOrGrid = /(?:display\s*:\s*(?:flex|grid)|flex-direction|grid-template)/i.test(html);
    
    const isResponsive = hasMediaQueries || hasResponsiveImages || hasFlexboxOrGrid;

    // 3. Touch-Friendly Detection
    const hasTouchEvents = /(?:ontouchstart|ontouchmove|ontouchend|touch-action)/i.test(html);
    const hasLargeClickTargets = /(?:min-height\s*:\s*(?:44|48)px|padding\s*:\s*(?:12|16)px)/i.test(html);
    
    const isTouchFriendly = hasTouchEvents || hasLargeClickTargets || this.hasReasonableButtonSizes(html);

    // 4. Responsive Framework Detection
    const responsiveFrameworks = [
      { name: 'Bootstrap', pattern: /bootstrap/i },
      { name: 'Tailwind', pattern: /tailwind/i },
      { name: 'Foundation', pattern: /foundation/i },
      { name: 'Bulma', pattern: /bulma/i },
      { name: 'Material UI', pattern: /material-ui|mui/i }
    ];
    
    const responsiveFramework = responsiveFrameworks.find(fw => fw.pattern.test(html))?.name || null;

    return {
      hasViewport,
      viewportContent,
      isResponsive,
      isTouchFriendly,
      responsiveFramework
    };
  }

  private hasReasonableButtonSizes(html: string): boolean {
    // Check for buttons and links with reasonable sizes
    const buttons = html.match(/<(?:button|a)[^>]*>/gi) || [];
    let goodSizedButtons = 0;
    
    buttons.forEach(button => {
      // Look for padding, min-height, or other size indicators
      if (/(?:padding|min-height|height)\s*:\s*(?:[2-9]\d+|1[0-9]\d+)px/i.test(button)) {
        goodSizedButtons++;
      }
    });
    
    // If more than 50% of buttons have good sizing, consider it touch-friendly
    return buttons.length > 0 && (goodSizedButtons / buttons.length) > 0.5;
  }

  private getMobileFriendlyStatus(score: number): 'excellent' | 'good' | 'needs-improvement' | 'poor' {
    if (score >= 90) return 'excellent';
    if (score >= 70) return 'good';
    if (score >= 50) return 'needs-improvement';
    return 'poor';
  }
}