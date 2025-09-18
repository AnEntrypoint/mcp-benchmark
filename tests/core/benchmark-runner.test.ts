import { BenchmarkRunner } from '../../src/core/benchmark-runner.js';
import { BenchmarkConfig, MCPServerConfig } from '../../src/types/index.js';
import { promises as fs } from 'fs';
import * as path from 'path';

// Mock child_process and fs for testing
jest.mock('child_process');
jest.mock('fs', () => ({
  promises: {
    mkdir: jest.fn(),
    writeFile: jest.fn(),
    readFile: jest.fn(),
    readdir: jest.fn(),
    access: jest.fn(),
    copyFile: jest.fn(),
    rm: jest.fn(),
  }
}));

describe('BenchmarkRunner', () => {
  let runner: BenchmarkRunner;
  let mockMkdir: jest.MockedFunction<typeof fs.mkdir>;
  let mockWriteFile: jest.MockedFunction<typeof fs.writeFile>;

  beforeEach(() => {
    runner = new BenchmarkRunner();
    mockMkdir = fs.mkdir as jest.MockedFunction<typeof fs.mkdir>;
    mockWriteFile = fs.writeFile as jest.MockedFunction<typeof fs.writeFile>;

    // Reset mocks
    jest.clearAllMocks();
    mockMkdir.mockResolvedValue(undefined);
    mockWriteFile.mockResolvedValue(undefined);
  });

  describe('constructor', () => {
    it('should create a new BenchmarkRunner instance', () => {
      expect(runner).toBeInstanceOf(BenchmarkRunner);
    });

    it('should initialize with system information', () => {
      const systemInfo = (runner as any).systemInfo;
      expect(systemInfo).toHaveProperty('platform');
      expect(systemInfo).toHaveProperty('arch');
      expect(systemInfo).toHaveProperty('nodeVersion');
      expect(systemInfo).toHaveProperty('timestamp');
    });
  });

  describe('runBenchmarkSuite', () => {
    const mockTests: BenchmarkConfig[] = [
      {
        name: 'Test 1',
        description: 'Test description',
        category: 'test-category',
        prompt: 'Test prompt',
        timeout: 10000,
        maxRetries: 1
      }
    ];

    const mockMcpServer: MCPServerConfig = {
      name: 'test-server',
      command: 'node',
      args: ['test.js'],
      env: {}
    };

    it('should create output directory', async () => {
      // Mock successful test execution
      jest.spyOn(runner as any, 'runPreflightChecks').mockResolvedValue(undefined);
      jest.spyOn(runner as any, 'runSingleBenchmark').mockResolvedValue({
        test: mockTests[0],
        baseline: { success: true, duration: 10, outputLength: 100, useMcp: false, attempt: 1, timestamp: new Date().toISOString() },
        optimized: { success: true, duration: 8, outputLength: 100, useMcp: true, attempt: 1, timestamp: new Date().toISOString() },
        improvement: '20.0'
      });
      jest.spyOn(runner as any, 'displaySummary').mockImplementation(() => {});

      await runner.runBenchmarkSuite(mockTests, {
        name: 'Test Suite',
        description: 'Test Description',
        version: '1.0.0',
        mcpServer: mockMcpServer,
        outputDir: './test-output'
      });

      expect(mockMkdir).toHaveBeenCalledWith('./test-output', { recursive: true });
    });

    it('should run pre-flight checks', async () => {
      const preflightSpy = jest.spyOn(runner as any, 'runPreflightChecks').mockResolvedValue(undefined);
      jest.spyOn(runner as any, 'runSingleBenchmark').mockResolvedValue({
        test: mockTests[0],
        baseline: { success: true, duration: 10, outputLength: 100, useMcp: false, attempt: 1, timestamp: new Date().toISOString() },
        optimized: { success: true, duration: 8, outputLength: 100, useMcp: true, attempt: 1, timestamp: new Date().toISOString() },
        improvement: '20.0'
      });
      jest.spyOn(runner as any, 'displaySummary').mockImplementation(() => {});

      await runner.runBenchmarkSuite(mockTests, {
        name: 'Test Suite',
        description: 'Test Description',
        version: '1.0.0',
        mcpServer: mockMcpServer
      });

      expect(preflightSpy).toHaveBeenCalledWith(mockMcpServer);
    });

    it('should save results to file', async () => {
      jest.spyOn(runner as any, 'runPreflightChecks').mockResolvedValue(undefined);
      jest.spyOn(runner as any, 'runSingleBenchmark').mockResolvedValue({
        test: mockTests[0],
        baseline: { success: true, duration: 10, outputLength: 100, useMcp: false, attempt: 1, timestamp: new Date().toISOString() },
        optimized: { success: true, duration: 8, outputLength: 100, useMcp: true, attempt: 1, timestamp: new Date().toISOString() },
        improvement: '20.0'
      });
      jest.spyOn(runner as any, 'displaySummary').mockImplementation(() => {});

      const result = await runner.runBenchmarkSuite(mockTests, {
        name: 'Test Suite',
        description: 'Test Description',
        version: '1.0.0',
        mcpServer: mockMcpServer,
        outputDir: './test-output'
      });

      expect(mockWriteFile).toHaveBeenCalledWith(
        expect.stringMatching(/\.\/test-output\/benchmark-results-\d+\.json/),
        expect.stringContaining('"name":"Test Suite"')
      );
      expect(result.name).toBe('Test Suite');
      expect(result.version).toBe('1.0.0');
    });
  });

  describe('buildClaudeCommand', () => {
    const mockTest: BenchmarkConfig = {
      name: 'Test',
      description: 'Test description',
      category: 'test',
      prompt: 'Test prompt'
    };

    it('should build command without MCP tools', () => {
      const command = (runner as any).buildClaudeCommand(mockTest, false);

      expect(command).toContain('claude -p "Test prompt"');
      expect(command).toContain('--allowed-tools');
      expect(command).not.toContain('mcp__');
      expect(command).not.toContain('--mcp-config');
      expect(command).not.toContain('--permission-mode');
    });

    it('should build command with MCP tools', () => {
      const command = (runner as any).buildClaudeCommand(mockTest, true);

      expect(command).toContain('claude -p "Test prompt always use glootie for everything"');
      expect(command).toContain('--allowed-tools');
      expect(command).toContain('mcp__');
      expect(command).toContain('--mcp-config ./.claude.json');
      expect(command).toContain('--permission-mode bypassPermissions');
    });
  });

  describe('parseClaudeCommand', () => {
    it('should parse simple command', () => {
      const args = (runner as any).parseClaudeCommand('claude --version');
      expect(args).toEqual(['claude', '--version']);
    });

    it('should parse command with quoted arguments', () => {
      const args = (runner as any).parseClaudeCommand('claude -p "hello world" --verbose');
      expect(args).toEqual(['claude', '-p', 'hello world', '--verbose']);
    });

    it('should handle escaped quotes', () => {
      const args = (runner as any).parseClaudeCommand('claude -p "say \\"hello\\""');
      expect(args).toEqual(['claude', '-p', 'say "hello"']);
    });
  });

  describe('shouldSkipRetry', () => {
    it('should skip retry for non-retryable errors', () => {
      const error = new Error('ENOENT: no such file');
      const shouldSkip = (runner as any).shouldSkipRetry(error);
      expect(shouldSkip).toBe(true);
    });

    it('should not skip retry for retryable errors', () => {
      const error = new Error('Network timeout');
      const shouldSkip = (runner as any).shouldSkipRetry(error);
      expect(shouldSkip).toBe(false);
    });
  });
});