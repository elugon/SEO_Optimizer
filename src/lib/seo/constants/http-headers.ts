export const DEFAULT_USER_AGENT = 'Mozilla/5.0 (compatible; SEO-Analyzer/1.0)';

export const DEFAULT_HEADERS = {
  'User-Agent': DEFAULT_USER_AGENT,
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
  'Accept-Encoding': 'gzip, deflate'
} as const;

export const ROBOTS_TXT_HEADERS = {
  'User-Agent': DEFAULT_USER_AGENT,
  'Accept': 'text/plain,*/*;q=0.8'
} as const;

export const SITEMAP_HEADERS = {
  'User-Agent': DEFAULT_USER_AGENT,
  'Accept': 'application/xml,text/xml,*/*;q=0.8'
} as const;