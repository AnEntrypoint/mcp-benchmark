import { BenchmarkConfig } from '../types/index.js';

/**
 * Create a set of default benchmark tests for MCP tool evaluation
 */
export function createDefaultTests(): BenchmarkConfig[] {
  return [
    {
      name: 'Component Analysis & Enhancement',
      description: 'Analyze React components and suggest improvements for TypeScript typing and performance',
      category: 'component-analysis',
      prompt: 'Find all React components in this shadcn/ui project and analyze the component structure and patterns. Look specifically at the task-manager component and suggest improvements for better TypeScript typing and performance.',
      timeout: 120000,
      maxRetries: 2
    },
    {
      name: 'UI Component Generation',
      description: 'Create new shadcn/ui components following existing patterns',
      category: 'ui-generation',
      prompt: 'Add a new shadcn/ui component for a modal dialog component. Create it following the existing patterns (similar to button, card, input components). Include proper TypeScript interfaces and make it accessible. Validate it follows shadcn/ui patterns.',
      timeout: 120000,
      maxRetries: 2
    },
    {
      name: 'Project Refactoring Task',
      description: 'Comprehensive refactoring including string extraction, utility functions, and error boundaries',
      category: 'refactoring',
      prompt: 'Perform a comprehensive refactoring: 1) Search for all hardcoded strings in components, 2) Extract common utility functions from multiple components into shared hooks, 3) Add proper error boundaries to the React components, 4) Generate a summary of changes made.',
      timeout: 180000,
      maxRetries: 2
    },
    {
      name: 'Performance Optimization',
      description: 'Analyze and optimize React components for performance issues',
      category: 'optimization',
      prompt: 'Analyze the task-manager component for performance issues. Look for unnecessary re-renders, missing memoization, and inefficient state management. Then implement optimizations using React.memo, useCallback, and useMemo where appropriate. Validate the performance improvements.',
      timeout: 120000,
      maxRetries: 2
    },
    {
      name: 'Code Search & Analysis',
      description: 'Search for specific patterns and analyze code structure',
      category: 'search-analysis',
      prompt: 'Search for all useState hooks in the codebase and analyze their usage patterns. Identify any potential state management issues or opportunities for optimization. Create a summary report of findings.',
      timeout: 90000,
      maxRetries: 2
    },
    {
      name: 'Type Safety Enhancement',
      description: 'Improve TypeScript type safety across the project',
      category: 'type-safety',
      prompt: 'Review all TypeScript files and identify areas where type safety can be improved. Add proper interfaces, remove any usage, and ensure strict type checking. Focus on the components and utility functions.',
      timeout: 120000,
      maxRetries: 2
    }
  ];
}

/**
 * Create custom benchmark tests for specific MCP tools
 */
export function createCustomTests(options: {
  focusAreas?: string[];
  complexity?: 'simple' | 'medium' | 'complex';
  timeout?: number;
}): BenchmarkConfig[] {
  const { focusAreas = ['search', 'refactoring'], complexity = 'medium', timeout = 120000 } = options;

  const tests: BenchmarkConfig[] = [];

  if (focusAreas.includes('search')) {
    tests.push({
      name: 'Advanced Code Search',
      description: 'Test semantic and pattern-based code search capabilities',
      category: 'advanced-search',
      prompt: complexity === 'simple'
        ? 'Find all function definitions in the codebase'
        : 'Perform semantic search for state management patterns and identify potential anti-patterns or optimization opportunities',
      timeout,
      maxRetries: 2
    });
  }

  if (focusAreas.includes('refactoring')) {
    tests.push({
      name: 'Smart Refactoring',
      description: 'Test automated refactoring capabilities',
      category: 'smart-refactoring',
      prompt: complexity === 'simple'
        ? 'Rename a variable consistently across files'
        : 'Identify and extract reusable logic into custom hooks, ensuring proper TypeScript types and error handling',
      timeout,
      maxRetries: 2
    });
  }

  if (focusAreas.includes('analysis')) {
    tests.push({
      name: 'Code Quality Analysis',
      description: 'Comprehensive code quality and security analysis',
      category: 'quality-analysis',
      prompt: complexity === 'complex'
        ? 'Perform comprehensive code quality analysis including security vulnerabilities, performance issues, accessibility concerns, and suggest specific improvements with code examples'
        : 'Analyze code for common issues and suggest improvements',
      timeout: complexity === 'complex' ? 180000 : timeout,
      maxRetries: 2
    });
  }

  return tests;
}

/**
 * Create performance stress tests
 */
export function createStressTests(): BenchmarkConfig[] {
  return [
    {
      name: 'Large Codebase Search',
      description: 'Test search performance on large codebases',
      category: 'stress-search',
      prompt: 'Search for all instances of React hooks across the entire codebase and categorize them by type and usage patterns. Generate a comprehensive usage report.',
      timeout: 300000, // 5 minutes
      maxRetries: 1
    },
    {
      name: 'Complex Refactoring',
      description: 'Test complex multi-file refactoring operations',
      category: 'stress-refactoring',
      prompt: 'Perform a complex refactoring to convert all class components to functional components with hooks, update all related imports and types, and ensure all tests still pass.',
      timeout: 600000, // 10 minutes
      maxRetries: 1
    },
    {
      name: 'Comprehensive Analysis',
      description: 'Full project analysis and optimization',
      category: 'stress-analysis',
      prompt: 'Perform a complete project analysis including: dependency audit, performance optimization opportunities, security review, accessibility compliance check, and generate actionable improvement recommendations.',
      timeout: 900000, // 15 minutes
      maxRetries: 1
    }
  ];
}