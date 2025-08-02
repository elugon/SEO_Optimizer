import type { AnalysisContext, AnalysisResult, SEOAnalyzer } from '../../interfaces/analyzers.js';
import type { Issue } from '../../types/analysis.js';

export interface SecurityHeadersData {
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
}

export class SecurityAnalyzer implements SEOAnalyzer {
  async analyze(context: AnalysisContext): Promise<AnalysisResult> {
    const issues: Issue[] = [];
    let score = 100; // Start with perfect score, deduct for missing/weak headers
    
    const securityData: SecurityHeadersData = {
      hsts: { present: false },
      csp: { present: false },
      xFrameOptions: { present: false },
      referrerPolicy: { present: false },
      additionalHeaders: {}
    };

    // Analyze HSTS header
    const hstsHeader = context.response.headers.get('strict-transport-security');
    if (hstsHeader) {
      securityData.hsts = this.analyzeHSTS(hstsHeader);
      if (!securityData.hsts.maxAge || securityData.hsts.maxAge < 31536000) { // Less than 1 year
        issues.push({
          type: 'warning',
          message: 'HSTS max-age debería ser al menos 31536000 (1 año)',
          priority: 'medium',
          category: 'security'
        });
        score -= 5;
      }
    } else {
      securityData.hsts.present = false;
      issues.push({
        type: 'warning',
        message: 'Falta el header HSTS (Strict-Transport-Security) para mejorar la seguridad HTTPS',
        priority: 'medium',
        category: 'security'
      });
      score -= 15;
    }

    // Analyze CSP header
    const cspHeader = context.response.headers.get('content-security-policy');
    if (cspHeader) {
      securityData.csp = this.analyzeCSP(cspHeader);
      if (securityData.csp.unsafeInline || securityData.csp.unsafeEval) {
        issues.push({
          type: 'warning',
          message: 'CSP contiene directivas unsafe-inline o unsafe-eval que reducen la seguridad',
          priority: 'medium',
          category: 'security'
        });
        score -= 10;
      }
    } else {
      securityData.csp.present = false;
      issues.push({
        type: 'warning',
        message: 'Falta Content Security Policy (CSP) para prevenir ataques XSS',
        priority: 'medium',
        category: 'security'
      });
      score -= 20;
    }

    // Analyze X-Frame-Options
    const xFrameHeader = context.response.headers.get('x-frame-options');
    if (xFrameHeader) {
      securityData.xFrameOptions = this.analyzeXFrameOptions(xFrameHeader);
      if (securityData.xFrameOptions.value === 'ALLOW-FROM') {
        issues.push({
          type: 'info',
          message: 'X-Frame-Options usa ALLOW-FROM, considera usar CSP frame-ancestors en su lugar',
          priority: 'low',
          category: 'security'
        });
      }
    } else {
      securityData.xFrameOptions.present = false;
      issues.push({
        type: 'warning',
        message: 'Falta X-Frame-Options para protección contra clickjacking',
        priority: 'medium',
        category: 'security'
      });
      score -= 15;
    }

    // Analyze Referrer Policy
    const referrerHeader = context.response.headers.get('referrer-policy');
    if (referrerHeader) {
      securityData.referrerPolicy = this.analyzeReferrerPolicy(referrerHeader);
      if (referrerHeader === 'unsafe-url' || referrerHeader === 'no-referrer-when-downgrade') {
        issues.push({
          type: 'warning',
          message: 'Referrer Policy podría exponer información sensible en URLs',
          priority: 'low',
          category: 'security'
        });
        score -= 5;
      }
    } else {
      securityData.referrerPolicy.present = false;
      issues.push({
        type: 'info',
        message: 'Considera agregar Referrer-Policy para mejor control de privacidad',
        priority: 'low',
        category: 'security'
      });
      score -= 10;
    }

    // Check additional security headers
    securityData.additionalHeaders = this.analyzeAdditionalHeaders(context.response);
    
    if (!securityData.additionalHeaders.xContentTypeOptions) {
      issues.push({
        type: 'info',
        message: 'Considera agregar X-Content-Type-Options: nosniff',
        priority: 'low',
        category: 'security'
      });
      score -= 5;
    }

    if (!securityData.additionalHeaders.xXssProtection) {
      issues.push({
        type: 'info',
        message: 'Considera agregar X-XSS-Protection: 1; mode=block',
        priority: 'low',
        category: 'security'
      });
      score -= 5;
    }

    // Ensure score doesn't go below 0
    score = Math.max(0, score);

    return {
      score,
      issues,
      data: securityData as unknown as Record<string, unknown>
    };
  }

  private analyzeHSTS(headerValue: string): SecurityHeadersData['hsts'] {
    const result: SecurityHeadersData['hsts'] = {
      present: true,
      rawValue: headerValue
    };

    // Parse max-age
    const maxAgeMatch = headerValue.match(/max-age=(\d+)/i);
    if (maxAgeMatch) {
      result.maxAge = parseInt(maxAgeMatch[1], 10);
    }

    // Check for includeSubDomains
    result.includeSubDomains = /includesubdomains/i.test(headerValue);

    // Check for preload
    result.preload = /preload/i.test(headerValue);

    return result;
  }

  private analyzeCSP(headerValue: string): SecurityHeadersData['csp'] {
    const result: SecurityHeadersData['csp'] = {
      present: true,
      rawValue: headerValue,
      policies: []
    };

    // Split policies by semicolon
    const policies = headerValue.split(';').map(p => p.trim()).filter(p => p.length > 0);
    result.policies = policies;

    // Check for unsafe directives
    result.unsafeInline = /'unsafe-inline'/.test(headerValue);
    result.unsafeEval = /'unsafe-eval'/.test(headerValue);

    return result;
  }

  private analyzeXFrameOptions(headerValue: string): SecurityHeadersData['xFrameOptions'] {
    const result: SecurityHeadersData['xFrameOptions'] = {
      present: true,
      rawValue: headerValue
    };

    const normalizedValue = headerValue.trim().toUpperCase();
    if (normalizedValue === 'DENY') {
      result.value = 'DENY';
    } else if (normalizedValue === 'SAMEORIGIN') {
      result.value = 'SAMEORIGIN';
    } else if (normalizedValue.startsWith('ALLOW-FROM')) {
      result.value = 'ALLOW-FROM';
    } else {
      result.value = headerValue;
    }

    return result;
  }

  private analyzeReferrerPolicy(headerValue: string): SecurityHeadersData['referrerPolicy'] {
    return {
      present: true,
      policy: headerValue.trim(),
      rawValue: headerValue
    };
  }

  private analyzeAdditionalHeaders(response: Response): SecurityHeadersData['additionalHeaders'] {
    return {
      xContentTypeOptions: response.headers.get('x-content-type-options') === 'nosniff',
      xXssProtection: !!response.headers.get('x-xss-protection'),
      expectCt: !!response.headers.get('expect-ct')
    };
  }
}