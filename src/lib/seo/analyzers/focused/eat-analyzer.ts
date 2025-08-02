import type { AnalysisContext, AnalysisResult, SEOAnalyzer } from '../../interfaces/analyzers.js';
import type { Issue } from '../../types/analysis.js';

export interface EATData {
  experience: {
    score: number;
    authorInfo: {
      hasAuthor: boolean;
      authorName?: string;
      authorBio?: string;
      authorCredentials?: string[];
    };
    expertiseSignals: {
      hasExpertiseMarkers: boolean;
      certifications: string[];
      qualifications: string[];
      experience: string[];
    };
  };
  authoritativeness: {
    score: number;
    contactInfo: {
      hasContactPage: boolean;
      contactMethods: string[];
      businessInfo: boolean;
    };
    aboutInfo: {
      hasAboutPage: boolean;
      organizationInfo: boolean;
      missionStatement: boolean;
    };
    trustSignals: {
      testimonials: boolean;
      reviews: boolean;
      awards: boolean;
      certifications: boolean;
      socialProof: string[];
    };
  };
  trustworthiness: {
    score: number;
    contentFreshness: {
      hasLastModified: boolean;
      lastModifiedDate?: string;
      contentAge?: number;
    };
    transparencySignals: {
      privacyPolicy: boolean;
      termsOfService: boolean;
      disclaimers: boolean;
      secureConnection: boolean;
    };
    credibilityMarkers: {
      sources: string[];
      references: boolean;
      factChecking: boolean;
      corrections: boolean;
    };
  };
  overallScore: number;
}

export class EATAnalyzer implements SEOAnalyzer {
  async analyze(context: AnalysisContext): Promise<AnalysisResult> {
    const { html, url, response } = context;
    const issues: Issue[] = [];
    
    // Analyze Experience factors
    const experienceData = this.analyzeExperience(html);
    
    // Analyze Authoritativeness factors
    const authoritativenessData = this.analyzeAuthoritativeness(html, url);
    
    // Analyze Trustworthiness factors
    const trustworthinessData = this.analyzeTrustworthiness(html, response);
    
    // Calculate overall E-A-T score
    const overallScore = this.calculateOverallScore(
      experienceData.score,
      authoritativenessData.score,
      trustworthinessData.score
    );
    
    const eatData: EATData = {
      experience: experienceData,
      authoritativeness: authoritativenessData,
      trustworthiness: trustworthinessData,
      overallScore
    };
    
    // Generate issues based on analysis
    this.generateIssues(eatData, issues);
    
    return {
      score: overallScore,
      issues,
      data: eatData as unknown as Record<string, unknown>
    };
  }
  
  private analyzeExperience(html: string): EATData['experience'] {
    const authorInfo = this.detectAuthorInformation(html);
    const expertiseSignals = this.detectExpertiseSignals(html);
    
    let score = 0;
    
    // Author information scoring (40 points max)
    if (authorInfo.hasAuthor) score += 15;
    if (authorInfo.authorBio) score += 10;
    if (authorInfo.authorCredentials && authorInfo.authorCredentials.length > 0) score += 15;
    
    // Expertise signals scoring (60 points max)
    if (expertiseSignals.hasExpertiseMarkers) score += 20;
    if (expertiseSignals.certifications.length > 0) score += 20;
    if (expertiseSignals.qualifications.length > 0) score += 10;
    if (expertiseSignals.experience.length > 0) score += 10;
    
    return {
      score: Math.min(100, score),
      authorInfo,
      expertiseSignals
    };
  }
  
  private analyzeAuthoritativeness(html: string, _url: string): EATData['authoritativeness'] {
    const contactInfo = this.analyzeContactInformation(html);
    const aboutInfo = this.analyzeAboutInformation(html);
    const trustSignals = this.analyzeTrustSignals(html);
    
    let score = 0;
    
    // Contact information scoring (30 points max)
    if (contactInfo.hasContactPage) score += 15;
    if (contactInfo.contactMethods.length >= 2) score += 10;
    if (contactInfo.businessInfo) score += 5;
    
    // About information scoring (35 points max)
    if (aboutInfo.hasAboutPage) score += 20;
    if (aboutInfo.organizationInfo) score += 10;
    if (aboutInfo.missionStatement) score += 5;
    
    // Trust signals scoring (35 points max)
    if (trustSignals.testimonials) score += 10;
    if (trustSignals.reviews) score += 10;
    if (trustSignals.awards) score += 5;
    if (trustSignals.certifications) score += 5;
    if (trustSignals.socialProof.length > 0) score += 5;
    
    return {
      score: Math.min(100, score),
      contactInfo,
      aboutInfo,
      trustSignals
    };
  }
  
  private analyzeTrustworthiness(html: string, response: Response): EATData['trustworthiness'] {
    const contentFreshness = this.analyzeContentFreshness(html, response);
    const transparencySignals = this.analyzeTransparencySignals(html, response);
    const credibilityMarkers = this.analyzeCredibilityMarkers(html);
    
    let score = 0;
    
    // Content freshness scoring (25 points max)
    if (contentFreshness.hasLastModified) score += 10;
    if (contentFreshness.contentAge !== undefined && contentFreshness.contentAge < 365) score += 15;
    
    // Transparency signals scoring (40 points max)
    if (transparencySignals.privacyPolicy) score += 10;
    if (transparencySignals.termsOfService) score += 10;
    if (transparencySignals.disclaimers) score += 5;
    if (transparencySignals.secureConnection) score += 15;
    
    // Credibility markers scoring (35 points max)
    if (credibilityMarkers.sources.length > 0) score += 15;
    if (credibilityMarkers.references) score += 10;
    if (credibilityMarkers.factChecking) score += 5;
    if (credibilityMarkers.corrections) score += 5;
    
    return {
      score: Math.min(100, score),
      contentFreshness,
      transparencySignals,
      credibilityMarkers
    };
  }
  
  private detectAuthorInformation(html: string): EATData['experience']['authorInfo'] {
    const authorRegex = /(?:author|writer|by)\s*:?\s*([^<>\n]{2,50})/gi;
    const bioRegex = /(?:bio|biography|about\s+(?:the\s+)?author)\s*:?\s*([^<>\n]{10,200})/gi;
    const credentialsRegex = /(?:phd|md|dr\.|professor|certified|licensed|expert|specialist|consultant)/gi;
    
    const authorMatch = html.match(authorRegex);
    const bioMatch = html.match(bioRegex);
    const credentialsMatches = html.match(credentialsRegex);
    
    return {
      hasAuthor: !!authorMatch,
      authorName: authorMatch?.[0]?.replace(/(?:author|writer|by)\s*:?\s*/gi, '').trim(),
      authorBio: bioMatch?.[0]?.replace(/(?:bio|biography|about\s+(?:the\s+)?author)\s*:?\s*/gi, '').trim(),
      authorCredentials: credentialsMatches || []
    };
  }
  
  private detectExpertiseSignals(html: string): EATData['experience']['expertiseSignals'] {
    const certificationRegex = /(?:certified|certification|accredited|licensed|board\s+certified)/gi;
    const qualificationRegex = /(?:degree|diploma|qualification|education|trained|graduate)/gi;
    const experienceRegex = /(?:years?\s+(?:of\s+)?experience|expert|specialist|professional)/gi;
    
    const certifications = html.match(certificationRegex) || [];
    const qualifications = html.match(qualificationRegex) || [];
    const experience = html.match(experienceRegex) || [];
    
    return {
      hasExpertiseMarkers: certifications.length > 0 || qualifications.length > 0 || experience.length > 0,
      certifications,
      qualifications,
      experience
    };
  }
  
  private analyzeContactInformation(html: string): EATData['authoritativeness']['contactInfo'] {
    const contactPageRegex = /(?:contact|reach\s+us|get\s+in\s+touch)/gi;
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    const phoneRegex = /(?:\+?\d{1,3}[-.\s]?)?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}/g;
    const addressRegex = /\d+\s+[a-zA-Z0-9\s,]+(?:street|st|avenue|ave|road|rd|boulevard|blvd|drive|dr)/gi;
    
    const hasContactPage = contactPageRegex.test(html);
    const emails = html.match(emailRegex) || [];
    const phones = html.match(phoneRegex) || [];
    const addresses = html.match(addressRegex) || [];
    
    const contactMethods = [];
    if (emails.length > 0) contactMethods.push('email');
    if (phones.length > 0) contactMethods.push('phone');
    if (addresses.length > 0) contactMethods.push('address');
    
    return {
      hasContactPage,
      contactMethods,
      businessInfo: addresses.length > 0 || phones.length > 0
    };
  }
  
  private analyzeAboutInformation(html: string): EATData['authoritativeness']['aboutInfo'] {
    const aboutPageRegex = /(?:about\s+us|about\s+(?:the\s+)?company|our\s+story|who\s+we\s+are)/gi;
    const organizationRegex = /(?:company|organization|business|corporation|founded|established)/gi;
    const missionRegex = /(?:mission|vision|values|purpose|goals)/gi;
    
    return {
      hasAboutPage: aboutPageRegex.test(html),
      organizationInfo: organizationRegex.test(html),
      missionStatement: missionRegex.test(html)
    };
  }
  
  private analyzeTrustSignals(html: string): EATData['authoritativeness']['trustSignals'] {
    const testimonialsRegex = /(?:testimonial|customer\s+review|client\s+feedback)/gi;
    const reviewsRegex = /(?:review|rating|star|feedback)/gi;
    const awardsRegex = /(?:award|recognition|achievement|honor|winner)/gi;
    const certificationsRegex = /(?:certificate|accreditation|badge|seal\s+of\s+approval)/gi;
    const socialProofRegex = /(?:facebook|twitter|linkedin|instagram|youtube)/gi;
    
    const socialProof = html.match(socialProofRegex) || [];
    
    return {
      testimonials: testimonialsRegex.test(html),
      reviews: reviewsRegex.test(html),
      awards: awardsRegex.test(html),
      certifications: certificationsRegex.test(html),
      socialProof: [...new Set(socialProof.map((s: string) => s.toLowerCase()))]
    };
  }
  
  private analyzeContentFreshness(html: string, response: Response): EATData['trustworthiness']['contentFreshness'] {
    const lastModifiedHeader = response.headers.get('last-modified');
    const dateRegex = /(?:updated|modified|published|last\s+updated)\s*:?\s*([0-9]{1,2}\/[0-9]{1,2}\/[0-9]{2,4}|[0-9]{4}-[0-9]{2}-[0-9]{2})/gi;
    const htmlDateMatch = html.match(dateRegex);
    
    let lastModifiedDate: string | undefined;
    let contentAge: number | undefined;
    
    if (lastModifiedHeader) {
      lastModifiedDate = lastModifiedHeader;
      const date = new Date(lastModifiedHeader);
      contentAge = Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24));
    } else if (htmlDateMatch) {
      lastModifiedDate = htmlDateMatch[0];
      const date = new Date(htmlDateMatch[0].replace(/.*([0-9]{1,2}\/[0-9]{1,2}\/[0-9]{2,4}|[0-9]{4}-[0-9]{2}-[0-9]{2}).*/, '$1'));
      contentAge = Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24));
    }
    
    return {
      hasLastModified: !!lastModifiedDate,
      lastModifiedDate,
      contentAge
    };
  }
  
  private analyzeTransparencySignals(html: string, response: Response): EATData['trustworthiness']['transparencySignals'] {
    const privacyRegex = /privacy\s+policy/gi;
    const termsRegex = /terms\s+(?:of\s+service|and\s+conditions|of\s+use)/gi;
    const disclaimerRegex = /disclaimer/gi;
    const isSecure = response.url.startsWith('https://');
    
    return {
      privacyPolicy: privacyRegex.test(html),
      termsOfService: termsRegex.test(html),
      disclaimers: disclaimerRegex.test(html),
      secureConnection: isSecure
    };
  }
  
  private analyzeCredibilityMarkers(html: string): EATData['trustworthiness']['credibilityMarkers'] {
    const sourceRegex = /(?:source|reference|citation|study|research)/gi;
    const linkRegex = /<a[^>]+href=[^>]*>.*?<\/a>/gi;
    const factCheckRegex = /(?:fact\s+check|verified|accurate|truth)/gi;
    const correctionRegex = /(?:correction|update|revised|amended)/gi;
    
    const sources = html.match(sourceRegex) || [];
    const links = html.match(linkRegex) || [];
    
    // Count external links (simple check for http/https)
    const externalLinks = links.filter(link => 
      link.includes('http') && !link.includes('javascript:')
    );
    
    return {
      sources: [...new Set(sources.map((s: string) => s.toLowerCase()))],
      references: externalLinks.length > 0,
      factChecking: factCheckRegex.test(html),
      corrections: correctionRegex.test(html)
    };
  }
  
  private calculateOverallScore(experienceScore: number, authoritativenessScore: number, trustworthinessScore: number): number {
    // Weighted average: Experience (30%), Authoritativeness (35%), Trustworthiness (35%)
    return Math.round(
      (experienceScore * 0.30) + 
      (authoritativenessScore * 0.35) + 
      (trustworthinessScore * 0.35)
    );
  }
  
  private generateIssues(eatData: EATData, issues: Issue[]): void {
    // Experience issues
    if (!eatData.experience.authorInfo.hasAuthor) {
      issues.push({
        type: 'warning',
        message: 'No author information found. Adding author details improves E-A-T signals.',
        priority: 'medium',
        category: 'content',
        title: 'Missing Author Information',
        description: 'No author information found. Adding author details improves E-A-T signals.',
        impact: 'medium'
      });
    }
    
    if (eatData.experience.expertiseSignals.certifications.length === 0) {
      issues.push({
        type: 'info',
        message: 'Consider adding professional certifications or credentials to demonstrate expertise.',
        priority: 'medium',
        category: 'content',
        title: 'No Professional Certifications',
        description: 'Consider adding professional certifications or credentials to demonstrate expertise.',
        impact: 'medium'
      });
    }
    
    // Authoritativeness issues
    if (!eatData.authoritativeness.contactInfo.hasContactPage) {
      issues.push({
        type: 'error',
        message: 'No contact page or contact information found. This is critical for E-A-T.',
        priority: 'high',
        category: 'content',
        title: 'Missing Contact Information',
        description: 'No contact page or contact information found. This is critical for E-A-T.',
        impact: 'high'
      });
    }
    
    if (!eatData.authoritativeness.aboutInfo.hasAboutPage) {
      issues.push({
        type: 'warning',
        message: 'No about page found. This helps establish authority and credibility.',
        priority: 'medium',
        category: 'content',
        title: 'Missing About Page',
        description: 'No about page found. This helps establish authority and credibility.',
        impact: 'medium'
      });
    }
    
    // Trustworthiness issues
    if (!eatData.trustworthiness.contentFreshness.hasLastModified) {
      issues.push({
        type: 'info',
        message: 'Consider adding last modified dates to show content is current.',
        priority: 'low',
        category: 'content',
        title: 'No Content Freshness Signals',
        description: 'Consider adding last modified dates to show content is current.',
        impact: 'low'
      });
    }
    
    if (!eatData.trustworthiness.transparencySignals.privacyPolicy) {
      issues.push({
        type: 'warning',
        message: 'No privacy policy found. This is important for trust and legal compliance.',
        priority: 'medium',
        category: 'content',
        title: 'Missing Privacy Policy',
        description: 'No privacy policy found. This is important for trust and legal compliance.',
        impact: 'medium'
      });
    }
    
    if (!eatData.trustworthiness.transparencySignals.secureConnection) {
      issues.push({
        type: 'error',
        message: 'Site is not using HTTPS. This negatively impacts trust and SEO.',
        priority: 'high',
        category: 'content',
        title: 'Insecure Connection',
        description: 'Site is not using HTTPS. This negatively impacts trust and SEO.',
        impact: 'high'
      });
    }
    
    // Overall score warnings
    if (eatData.overallScore < 50) {
      issues.push({
        type: 'error',
        message: `E-A-T score is ${eatData.overallScore}/100. This may significantly impact search rankings.`,
        priority: 'high',
        category: 'content',
        title: 'Low E-A-T Score',
        description: `E-A-T score is ${eatData.overallScore}/100. This may significantly impact search rankings.`,
        impact: 'high'
      });
    } else if (eatData.overallScore < 70) {
      issues.push({
        type: 'warning',
        message: `E-A-T score is ${eatData.overallScore}/100. Consider improving expertise and trust signals.`,
        priority: 'medium',
        category: 'content',
        title: 'Moderate E-A-T Score',
        description: `E-A-T score is ${eatData.overallScore}/100. Consider improving expertise and trust signals.`,
        impact: 'medium'
      });
    }
  }
}