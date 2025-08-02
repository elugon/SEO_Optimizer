# SEO Optimizer

> The only open-source multi-page SEO analyzer available on GitHub. A sophisticated, free SEO analysis tool built with Astro and modern web technologies.

![SEO Optimizer](https://img.shields.io/badge/SEO-Optimizer-blue?style=for-the-badge&logo=astro)
![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)
![Version](https://img.shields.io/badge/Version-0.0.1-orange?style=for-the-badge)

## 🚀 Features

### 🔍 Comprehensive SEO Analysis
- **100+ SEO Factors**: Complete analysis of technical SEO, content optimization, and performance metrics
- **🌟 Multi-page Analysis**: The ONLY open-source tool that automatically discovers and analyzes ALL internal pages of your website
- **Real-time Scoring**: Live SEO scoring with weighted factors for accurate assessment
- **Mobile-First Approach**: Dedicated mobile optimization analysis

### 🛡️ Advanced Security Analysis
- **Security Headers**: HSTS, CSP, X-Frame-Options, Referrer Policy evaluation
- **HTTPS Configuration**: SSL/TLS setup verification
- **Content Security**: XSS and clickjacking protection analysis

### 📊 E-A-T Scoring
- **Expertise Analysis**: Author information and expertise signals detection
- **Authoritativeness**: Domain authority and trust signals evaluation
- **Trustworthiness**: Security, privacy, and credibility assessment

### ⚡ Performance Optimization
- **Page Speed Analysis**: Load time and performance metrics
- **Image Optimization**: Alt text coverage, modern formats (WebP/AVIF), lazy loading
- **Technical Performance**: Bundle size analysis and optimization recommendations

### 🎯 Content Analysis
- **Keyword Analysis**: TF-IDF calculations, keyword density, LSI keywords
- **Content Structure**: Heading hierarchy (H1-H6) optimization
- **Meta Data**: Title tags, meta descriptions, and structured data analysis

## 🛠️ Technology Stack

- **Framework**: [Astro 5.12.1](https://astro.build/) with SSR enabled
- **Styling**: [TailwindCSS v4](https://tailwindcss.com/) with modern CSS features
- **Runtime**: Node.js with standalone adapter
- **Language**: TypeScript 5.9.1 with comprehensive type safety
- **Build System**: Vite with optimized bundling

## 📦 Installation

### Prerequisites
- Node.js 18+ 
- npm, yarn, or pnpm

### Quick Start

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/seo-optimizer.git
   cd seo-optimizer
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   yarn install
   # or
   pnpm install
   ```

3. **Start development server**
   ```bash
   npm run dev
   ```

4. **Open in browser**
   Navigate to `http://localhost:4321`

### Production Build

```bash
# Build for production
npm run build

# Preview production build
npm run preview
```

## 🔧 Configuration

The application uses environment-based configuration located in `src/lib/seo/config/index.ts`:

```typescript
// Default configuration
{
  timeouts: {
    analysis: 10000,    // 10 seconds
    fetch: 8000         // 8 seconds
  },
  cache: {
    ttl: 300000,        // 5 minutes
    maxItems: 1000,
    enabled: false      // Disabled by default
  },
  limits: {
    maxInternalUrls: 99 // Max pages to analyze
  }
}
```

### Environment Variables

Create a `.env` file in the root directory:

```env
# Optional: Custom API endpoints
API_BASE_URL=http://localhost:4321

# Optional: Analysis limits
MAX_PAGES_ANALYSIS=99
ANALYSIS_TIMEOUT=10000
```

## 🏗️ Architecture

### Dual Architecture System

The project maintains two architectures for backward compatibility:

#### Legacy System
- Located in `src/lib/seo/analyzers/`
- Direct function calls for specific analysis types
- Simpler implementation

#### Modern System (Recommended)
- Located in `src/lib/seo/analyzers/focused/`
- Class-based analyzers implementing `SEOAnalyzer` interface
- Orchestrator pattern using `SEOAnalysisOrchestrator`
- Centralized error handling and logging

### Core Components

```
src/
├── lib/seo/
│   ├── analyzers/focused/       # Modern analyzer classes
│   ├── orchestrator/           # Analysis coordination
│   ├── config/                # Configuration management
│   ├── logging/               # Professional logging
│   ├── errors/                # Error handling
│   ├── types/                 # TypeScript definitions
│   └── utils/                 # Shared utilities
├── components/                # Astro UI components
├── pages/                    # Application pages
└── styles/                   # Global styles
```

## 🧪 Development

### Available Commands

```bash
# Development server
npm run dev

# Production build
npm run build

# Preview production build  
npm run preview

# Type checking and linting
npm run lint
npm run typecheck
```

### Code Style

The project follows modern TypeScript and Astro conventions:

- **Interface-based design**: All analyzers implement standardized interfaces
- **Factory patterns**: Consistent object creation via factory classes
- **Service layer**: Separation of concerns with dedicated service classes
- **Type safety**: Comprehensive TypeScript coverage

### Adding New Analyzers

1. Create a new analyzer class implementing `SEOAnalyzer`:

```typescript
// src/lib/seo/analyzers/focused/my-analyzer.ts
export class MyAnalyzer implements SEOAnalyzer {
  async analyze(context: AnalysisContext): Promise<AnalysisResult> {
    // Your analysis logic here
  }
}
```

2. Register in the orchestrator:

```typescript
// Add to orchestrator configuration
const analyzers = [
  // ... existing analyzers
  new MyAnalyzer()
];
```

## 🤝 Contributing

We welcome contributions! Please follow these steps:

1. **Fork the repository**
2. **Create a feature branch**
   ```bash
   git checkout -b feature/amazing-feature
   ```
3. **Commit your changes**
   ```bash
   git commit -m 'Add amazing feature'
   ```
4. **Push to the branch**
   ```bash
   git push origin feature/amazing-feature
   ```
5. **Open a Pull Request**

### Development Guidelines

- Follow the existing code style and conventions
- Add TypeScript types for all new code
- Include JSDoc comments for public APIs
- Test your changes thoroughly
- Update documentation as needed

## 📊 Analysis Features

### SEO Scoring Breakdown

The tool uses weighted scoring across multiple categories:

- **Title Optimization**: 16% - Title length, keywords, special characters
- **Meta Description**: 12% - Description quality and length optimization  
- **E-A-T Factors**: 15% - Expertise, Authoritativeness, Trustworthiness
- **Technical SEO**: 14% - HTTPS, canonical URLs, robots.txt, sitemaps
- **Content Structure**: 12% - Heading hierarchy and content organization
- **Image Optimization**: 10% - Alt text, modern formats, lazy loading
- **Performance**: 10% - Page speed and mobile optimization
- **Security**: 8% - Security headers and protection measures
- **Links**: 3% - Internal and external link analysis

### Supported Analysis Types

- ✅ Technical SEO (HTTPS, canonical, robots.txt, XML sitemaps)
- ✅ Content optimization (titles, descriptions, headings)
- ✅ Keyword analysis (TF-IDF, density, LSI keywords)
- ✅ Image optimization (alt text, formats, lazy loading)
- ✅ Performance metrics (page size, load times)
- ✅ Security headers (HSTS, CSP, X-Frame-Options)
- ✅ Mobile optimization scoring
- ✅ E-A-T factors analysis
- ✅ **🌟 Multi-page site analysis** (UNIQUE feature - not available in other open-source SEO tools)

## 🐛 Known Issues & Limitations

- **Testing Coverage**: No automated tests (contributions welcome!)
- **Cache**: Currently disabled by default for development
- **TypeScript**: Some permissive settings for faster development

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built with [Astro](https://astro.build/) - The web framework for content-driven websites
- Styled with [TailwindCSS](https://tailwindcss.com/) - A utility-first CSS framework
- Icons from [Heroicons](https://heroicons.com/) - Beautiful hand-crafted SVG icons

## 🌟 Support

If you find this project helpful, please consider:

- ⭐ Starring the repository
- 🐛 Reporting bugs or requesting features
- 🤝 Contributing to the codebase
- 📢 Sharing with others who might benefit

## 📞 Contact

- **Issues**: [GitHub Issues](https://github.com/yourusername/seo-optimizer/issues)
- **Discussions**: [GitHub Discussions](https://github.com/yourusername/seo-optimizer/discussions)

---

**Made with ❤️ for the open source community**
