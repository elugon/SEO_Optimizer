// Robots.txt analysis types

import type { Issue } from './common.js';

export interface RobotsAnalysis {
  exists: boolean;
  accessible: boolean;
  content: string | null;
  issues: Issue[];
  allowAll: boolean;
  blockAll: boolean;
  sitemap: string | null;
  userAgents: string[];
}