export interface BenchmarkConfig {
  /** Name of the benchmark test */
  name: string;
  /** Description of what the test measures */
  description: string;
  /** Category for grouping related tests */
  category: string;
  /** The prompt/task to execute */
  prompt: string;
  /** Timeout in milliseconds (default: 120000) */
  timeout?: number;
  /** Number of retry attempts (default: 2) */
  maxRetries?: number;
  /** Custom test setup function */
  setup?: (testDir: string) => Promise<void>;
  /** Custom test validation function */
  validate?: (result: TestResult) => boolean;
}

export interface MCPServerConfig {
  /** Server name */
  name: string;
  /** Command to run the server */
  command: string;
  /** Arguments for the server command */
  args: string[];
  /** Environment variables */
  env?: Record<string, string>;
  /** Working directory for the server */
  cwd?: string;
}

export interface TestEnvironment {
  /** Directory for test execution */
  testDir: string;
  /** MCP server configuration (if using MCP tools) */
  mcpServer?: MCPServerConfig;
  /** Additional files to create in test environment */
  files?: Record<string, string>;
  /** Package.json configuration */
  packageJson?: Record<string, any>;
  /** Additional setup scripts */
  setupScripts?: string[];
}

export interface TestResult {
  /** Whether the test completed successfully */
  success: boolean;
  /** Test execution duration in seconds */
  duration: number;
  /** Length of output produced */
  outputLength: number;
  /** Whether MCP tools were used */
  useMcp: boolean;
  /** Number of retry attempts made */
  attempt: number;
  /** Timestamp of test execution */
  timestamp: string;
  /** Error message if test failed */
  error?: string;
  /** Detailed error information */
  fullError?: {
    message?: string;
    stderr?: string;
    stdout?: string;
    code?: number;
    command?: string;
    workingDir?: string;
    toolsCount?: number;
  };
  /** Parsed output from Claude execution */
  parsedOutput?: {
    rawOutput: string;
    stepData: any[];
    totalSteps: number;
    toolCalls: any[];
    toolResults: any[];
    toolsUsed: string[];
    mcpServerStatus: string;
    totalToolCalls: number;
    totalToolResults: number;
  };
  /** Files created during test execution */
  outputFile?: string;
  stepsFile?: string;
}

export interface BenchmarkResult {
  /** Test configuration */
  test: BenchmarkConfig;
  /** Baseline (non-MCP) test result */
  baseline: TestResult;
  /** MCP-enabled test result */
  optimized: TestResult;
  /** Performance improvement percentage */
  improvement: string;
}

export interface BenchmarkSuite {
  /** Suite name */
  name: string;
  /** Suite description */
  description: string;
  /** System information */
  systemInfo: {
    platform: string;
    arch: string;
    nodeVersion: string;
  };
  /** Test results */
  results: BenchmarkResult[];
  /** Average improvement across all tests */
  avgImprovement: string;
  /** Execution timestamp */
  timestamp: string;
  /** Suite version */
  version: string;
}

export interface ClaudeExecutionOptions {
  /** Working directory for execution */
  workingDir: string;
  /** Claude command to execute */
  command: string;
  /** Timeout in milliseconds */
  timeout: number;
  /** Whether to use MCP tools */
  useMcp: boolean;
  /** MCP configuration file path */
  mcpConfigPath?: string;
  /** Permission mode for MCP */
  permissionMode?: 'ask' | 'bypassPermissions';
  /** Allowed tools list */
  allowedTools?: string[];
}

export interface SystemInfo {
  platform: string;
  arch: string;
  nodeVersion: string;
  timestamp: string;
}