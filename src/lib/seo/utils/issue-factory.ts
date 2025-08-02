import type { Issue } from '../types/analysis.js';

export type IssueType = 'error' | 'warning' | 'success' | 'info';
export type IssuePriority = 'high' | 'medium' | 'low';
export type IssueCategory = 'content' | 'technical' | 'performance';

export function createIssue(
  type: IssueType,
  message: string,
  priority: IssuePriority,
  category: IssueCategory
): Issue {
  return { type, message, priority, category };
}

export function createErrorIssue(message: string, category: IssueCategory = 'content'): Issue {
  return createIssue('error', message, 'high', category);
}

export function createWarningIssue(message: string, priority: IssuePriority = 'medium', category: IssueCategory = 'content'): Issue {
  return createIssue('warning', message, priority, category);
}

export function createSuccessIssue(message: string, category: IssueCategory = 'content'): Issue {
  return createIssue('success', message, 'low', category);
}

export function createInfoIssue(message: string, category: IssueCategory = 'content'): Issue {
  return createIssue('info', message, 'low', category);
}

export class IssueBuilder {
  private issue: Partial<Issue> = {};

  static create(): IssueBuilder {
    return new IssueBuilder();
  }

  type(type: IssueType): this {
    this.issue.type = type;
    return this;
  }

  message(message: string): this {
    this.issue.message = message;
    return this;
  }

  priority(priority: IssuePriority): this {
    this.issue.priority = priority;
    return this;
  }

  category(category: IssueCategory): this {
    this.issue.category = category;
    return this;
  }

  build(): Issue {
    if (!this.issue.type || !this.issue.message || !this.issue.priority || !this.issue.category) {
      throw new Error('Issue must have type, message, priority, and category');
    }
    return this.issue as Issue;
  }
}