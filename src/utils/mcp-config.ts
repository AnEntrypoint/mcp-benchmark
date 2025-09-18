import { MCPServerConfig } from '../types/index.js';
import * as path from 'path';

/**
 * Create MCP server configuration for glootie
 */
export function createGlootieConfig(options: {
  serverPath?: string;
  workingDirectory?: string;
  customArgs?: string[];
}): MCPServerConfig {
  const { serverPath, workingDirectory = process.cwd(), customArgs = [] } = options;

  // Default to looking for glootie in common locations
  const defaultServerPath = serverPath || path.resolve(workingDirectory, '../mcp-repl/src/index.js');

  return {
    name: 'glootie',
    command: 'node',
    args: [defaultServerPath, ...customArgs],
    env: {},
    cwd: workingDirectory
  };
}

/**
 * Create generic MCP server configuration
 */
export function createMCPServerConfig(options: {
  name: string;
  command: string;
  args?: string[];
  env?: Record<string, string>;
  cwd?: string;
}): MCPServerConfig {
  const { name, command, args = [], env = {}, cwd } = options;

  return {
    name,
    command,
    args,
    env,
    cwd
  };
}

/**
 * Create configuration for popular MCP servers
 */
export function createPopularServerConfigs(): Record<string, MCPServerConfig> {
  return {
    filesystem: {
      name: 'filesystem',
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-filesystem', '/tmp'],
      env: {}
    },

    github: {
      name: 'github',
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-github'],
      env: {
        GITHUB_PERSONAL_ACCESS_TOKEN: process.env.GITHUB_PERSONAL_ACCESS_TOKEN || ''
      }
    },

    postgres: {
      name: 'postgres',
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-postgres'],
      env: {
        POSTGRES_CONNECTION_STRING: process.env.POSTGRES_CONNECTION_STRING || ''
      }
    },

    puppeteer: {
      name: 'puppeteer',
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-puppeteer'],
      env: {}
    },

    brave_search: {
      name: 'brave-search',
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-brave-search'],
      env: {
        BRAVE_API_KEY: process.env.BRAVE_API_KEY || ''
      }
    }
  };
}

/**
 * Validate MCP server configuration
 */
export function validateMCPServerConfig(config: MCPServerConfig): {
  valid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Required fields
  if (!config.name || config.name.trim() === '') {
    errors.push('Server name is required');
  }

  if (!config.command || config.command.trim() === '') {
    errors.push('Server command is required');
  }

  if (!Array.isArray(config.args)) {
    errors.push('Server args must be an array');
  }

  // Warnings for common issues
  if (config.name.includes(' ')) {
    warnings.push('Server name contains spaces, which may cause issues');
  }

  if (config.command === 'node' && config.args.length === 0) {
    warnings.push('Node command without arguments may fail');
  }

  // Check for required environment variables based on server name
  const envChecks: Record<string, string[]> = {
    github: ['GITHUB_PERSONAL_ACCESS_TOKEN'],
    postgres: ['POSTGRES_CONNECTION_STRING'],
    'brave-search': ['BRAVE_API_KEY']
  };

  const requiredEnvVars = envChecks[config.name];
  if (requiredEnvVars) {
    requiredEnvVars.forEach(envVar => {
      if (!config.env?.[envVar] && !process.env[envVar]) {
        warnings.push(`Environment variable ${envVar} not set for ${config.name} server`);
      }
    });
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Create Claude configuration file content
 */
export function createClaudeConfig(mcpServers: MCPServerConfig[]): string {
  const config = {
    mcpServers: mcpServers.reduce((acc, server) => {
      acc[server.name] = {
        command: server.command,
        args: server.args,
        env: server.env || {}
      };
      return acc;
    }, {} as Record<string, any>)
  };

  return JSON.stringify(config, null, 2);
}