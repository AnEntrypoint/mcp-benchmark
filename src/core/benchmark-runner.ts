import { promises as fs } from 'fs';
import { execSync, spawn } from 'child_process';
import * as path from 'path';
import * as os from 'os';
import {
  BenchmarkConfig,
  BenchmarkResult,
  BenchmarkSuite,
  TestResult,
  TestEnvironment,
  ClaudeExecutionOptions,
  SystemInfo,
  MCPServerConfig
} from '../types/index.js';
import { TestEnvironmentBuilder } from './test-environment.js';
import { ResultsAnalyzer } from './results-analyzer.js';

export class BenchmarkRunner {
  private testEnvironmentBuilder: TestEnvironmentBuilder;
  private resultsAnalyzer: ResultsAnalyzer;
  private systemInfo: SystemInfo;

  constructor() {
    this.testEnvironmentBuilder = new TestEnvironmentBuilder();
    this.resultsAnalyzer = new ResultsAnalyzer();
    this.systemInfo = this.getSystemInfo();
  }

  /**
   * Run a complete benchmark suite
   */
  async runBenchmarkSuite(
    tests: BenchmarkConfig[],
    options: {
      name: string;
      description: string;
      version: string;
      mcpServer?: MCPServerConfig;
      environment?: Partial<TestEnvironment>;
      parallel?: boolean;
      outputDir?: string;
    }
  ): Promise<BenchmarkSuite> {
    const { name, description, version, mcpServer, environment, parallel = true, outputDir = './benchmark-results' } = options;

    console.log(`🚀 Starting benchmark suite: ${name} v${version}`);
    console.log(`📊 Running ${tests.length} tests (${parallel ? 'parallel' : 'sequential'})`);

    // Ensure output directory exists
    await fs.mkdir(outputDir, { recursive: true });

    // Run pre-flight checks
    await this.runPreflightChecks(mcpServer);

    const results: BenchmarkResult[] = [];

    if (parallel) {
      // Run all tests in parallel
      const testPromises = tests.map(test => this.runSingleBenchmark(test, { mcpServer, environment, outputDir }));
      const parallelResults = await Promise.all(testPromises);
      results.push(...parallelResults);
    } else {
      // Run tests sequentially
      for (const test of tests) {
        const result = await this.runSingleBenchmark(test, { mcpServer, environment, outputDir });
        results.push(result);
      }
    }

    // Calculate average improvement
    const successfulTests = results.filter(r => r.improvement !== 'N/A');
    const avgImprovement = successfulTests.length > 0
      ? (successfulTests.reduce((sum, r) => sum + parseFloat(r.improvement), 0) / successfulTests.length).toFixed(1)
      : 'N/A';

    const suite: BenchmarkSuite = {
      name,
      description,
      systemInfo: this.systemInfo,
      results,
      avgImprovement,
      timestamp: new Date().toISOString(),
      version
    };

    // Save results
    const resultsFile = path.join(outputDir, `benchmark-results-${Date.now()}.json`);
    await fs.writeFile(resultsFile, JSON.stringify(suite, null, 2));

    console.log(`📊 Benchmark suite completed`);
    console.log(`📁 Results saved to: ${resultsFile}`);
    this.displaySummary(suite);

    return suite;
  }

  /**
   * Run a single benchmark test comparing baseline vs MCP performance
   */
  async runSingleBenchmark(
    test: BenchmarkConfig,
    options: {
      mcpServer?: MCPServerConfig;
      environment?: Partial<TestEnvironment>;
      outputDir?: string;
    } = {}
  ): Promise<BenchmarkResult> {
    const { mcpServer, environment = {}, outputDir = './benchmark-results' } = options;

    console.log(`🧪 Running benchmark: ${test.name}`);

    // Create test environments
    const baselineDir = await this.testEnvironmentBuilder.createTestEnvironment({
      testDir: `./test-${test.category}-baseline-${Date.now()}`,
      ...environment
    });

    const mcpDir = await this.testEnvironmentBuilder.createTestEnvironment({
      testDir: `./test-${test.category}-mcp-${Date.now()}`,
      mcpServer,
      ...environment
    });

    try {
      // Run baseline and MCP tests in parallel
      const [baseline, optimized] = await Promise.all([
        this.runTest(test, baselineDir, false, outputDir),
        this.runTest(test, mcpDir, true, outputDir)
      ]);

      // Calculate improvement
      const improvement = baseline.success && optimized.success
        ? ((baseline.duration - optimized.duration) / baseline.duration * 100).toFixed(1)
        : 'N/A';

      const result: BenchmarkResult = {
        test,
        baseline,
        optimized,
        improvement
      };

      console.log(`✅ ${test.name}: Baseline ${baseline.duration.toFixed(1)}s | MCP ${optimized.duration.toFixed(1)}s | Improvement: ${improvement}%`);

      return result;
    } finally {
      // Cleanup test directories
      await this.cleanup([baselineDir.testDir, mcpDir.testDir], outputDir);
    }
  }

  /**
   * Run a single test execution
   */
  private async runTest(
    test: BenchmarkConfig,
    environment: TestEnvironment,
    useMcp: boolean,
    outputDir: string
  ): Promise<TestResult> {
    const startTime = Date.now();
    const maxRetries = test.maxRetries || 2;
    let lastError: any = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const result = await this.executeTest(test, environment, useMcp, outputDir, attempt);
        return result;
      } catch (error: any) {
        lastError = error;
        console.error(`❌ Test attempt ${attempt} failed: ${error.message}`);

        if (attempt < maxRetries && !this.shouldSkipRetry(error)) {
          const waitTime = Math.pow(2, attempt) * 1000;
          console.log(`⏳ Retrying in ${waitTime/1000}s...`);
          await this.sleep(waitTime);
        }
      }
    }

    // Return failure result
    const duration = (Date.now() - startTime) / 1000;
    return {
      success: false,
      duration,
      outputLength: 0,
      useMcp,
      attempt: maxRetries,
      timestamp: new Date().toISOString(),
      error: lastError?.message || 'Unknown error',
      fullError: lastError
    };
  }

  /**
   * Execute a test with Claude
   */
  private async executeTest(
    test: BenchmarkConfig,
    environment: TestEnvironment,
    useMcp: boolean,
    outputDir: string,
    attempt: number
  ): Promise<TestResult> {
    const startTime = Date.now();

    // Build Claude command
    const options: ClaudeExecutionOptions = {
      workingDir: environment.testDir,
      command: this.buildClaudeCommand(test, useMcp),
      timeout: test.timeout || 120000,
      useMcp,
      mcpConfigPath: useMcp ? path.join(environment.testDir, '.claude.json') : undefined,
      permissionMode: useMcp ? 'bypassPermissions' : undefined
    };

    console.log(`🚀 [${new Date().toLocaleTimeString()}] Starting ${useMcp ? 'MCP' : 'baseline'} test: ${test.name}`);

    const output = await this.executeClaudeCommand(options);
    const duration = (Date.now() - startTime) / 1000;

    // Parse and analyze output
    const parsedOutput = await this.resultsAnalyzer.parseClaudeOutput(output);

    // Save results
    const testType = useMcp ? 'mcp' : 'baseline';
    const outputFile = path.join(outputDir, `output-${test.category}-${testType}-${Date.now()}.json`);
    const stepsFile = path.join(outputDir, `steps-${test.category}-${testType}-${Date.now()}.json`);

    await fs.writeFile(outputFile, JSON.stringify({
      timestamp: new Date().toISOString(),
      testType,
      testName: test.name,
      testCategory: test.category,
      prompt: test.prompt,
      rawOutput: output,
      duration
    }, null, 2));

    await fs.writeFile(stepsFile, JSON.stringify({
      timestamp: new Date().toISOString(),
      testType,
      testName: test.name,
      testCategory: test.category,
      stepData: parsedOutput.stepData,
      totalSteps: parsedOutput.totalSteps,
      toolCallsCount: parsedOutput.totalToolCalls,
      duration
    }, null, 2));

    console.log(`✅ ${testType} test completed in ${duration.toFixed(1)}s`);

    return {
      success: true,
      duration,
      outputLength: output.length,
      useMcp,
      attempt,
      timestamp: new Date().toISOString(),
      parsedOutput,
      outputFile,
      stepsFile
    };
  }

  /**
   * Execute Claude command
   */
  private async executeClaudeCommand(options: ClaudeExecutionOptions): Promise<string> {
    return new Promise((resolve, reject) => {
      const args = this.parseClaudeCommand(options.command);
      const commandName = args.shift();

      if (!commandName) {
        reject(new Error('No command specified'));
        return;
      }

      const child = spawn(commandName, args, {
        cwd: options.workingDir,
        stdio: 'pipe',
        env: process.env
      });

      let stdout = '';
      let stderr = '';

      child.stdout.on('data', (data: any) => {
        stdout += data.toString();
      });

      child.stderr.on('data', (data: any) => {
        stderr += data.toString();
      });

      const timeoutHandle = setTimeout(() => {
        child.kill('SIGTERM');
        reject(new Error(`Command timed out after ${options.timeout}ms`));
      }, options.timeout);

      child.on('close', (code: any) => {
        clearTimeout(timeoutHandle);

        if (code === 0) {
          resolve(stdout);
        } else {
          const error = new Error(`Command failed with exit code ${code}`);
          (error as any).code = code;
          (error as any).stderr = stderr;
          (error as any).stdout = stdout;
          (error as any).command = options.command;
          reject(error);
        }
      });

      child.on('error', (error: any) => {
        clearTimeout(timeoutHandle);
        reject(error);
      });
    });
  }

  /**
   * Build Claude command string
   */
  private buildClaudeCommand(test: BenchmarkConfig, useMcp: boolean): string {
    const standardTools = "Bash,Read,Edit,Write,Grep,WebSearch,Task,BashOutput,Glob,ExitPlanMode,NotebookEdit,MultiEdit,WebFetch,TodoWrite,KillShell";
    const mcpTools = "mcp__glootie__execute,mcp__glootie__retrieve_overflow,mcp__glootie__searchcode,mcp__glootie__parse_ast,mcp__glootie__astgrep_search,mcp__glootie__astgrep_replace,mcp__glootie__astgrep_lint,mcp__glootie__batch_execute,mcp__glootie__sequentialthinking";
    const allowedTools = useMcp ? `${standardTools},${mcpTools}` : standardTools;

    const finalPrompt = test.prompt + (useMcp ? ' always use glootie for everything' : '');
    const mcpConfig = useMcp ? ' --mcp-config ./.claude.json' : '';
    const permissionMode = useMcp ? ' --permission-mode bypassPermissions' : '';

    return `claude -p "${finalPrompt}" --allowed-tools "${allowedTools}" --add-dir "./"${mcpConfig}${permissionMode} --output-format stream-json --verbose`;
  }

  /**
   * Parse Claude command into arguments
   */
  private parseClaudeCommand(command: string): string[] {
    const args: string[] = [];
    let current = '';
    let inQuotes = false;
    let escapeNext = false;

    for (let i = 0; i < command.length; i++) {
      const char = command[i];

      if (escapeNext) {
        current += char;
        escapeNext = false;
      } else if (char === '\\') {
        escapeNext = true;
      } else if (char === '"' && !inQuotes) {
        inQuotes = true;
      } else if (char === '"' && inQuotes) {
        inQuotes = false;
      } else if (char === ' ' && !inQuotes) {
        if (current.trim()) {
          args.push(current.trim());
          current = '';
        }
      } else {
        current += char;
      }
    }

    if (current.trim()) {
      args.push(current.trim());
    }

    return args;
  }

  /**
   * Run pre-flight checks
   */
  private async runPreflightChecks(mcpServer?: MCPServerConfig): Promise<void> {
    console.log('🔍 Running pre-flight checks...');

    // Check Claude CLI
    try {
      execSync('claude --version', { stdio: 'pipe' });
      console.log('  ✅ Claude CLI available');
    } catch (error) {
      console.log('  ❌ Claude CLI not found');
      throw new Error('Claude CLI not available');
    }

    // Check MCP server if provided
    if (mcpServer) {
      try {
        const serverProcess = execSync(`timeout 1 ${mcpServer.command} ${mcpServer.args.join(' ')}`, {
          stdio: 'pipe',
          timeout: 3000,
          encoding: 'utf8'
        });
        console.log('  ✅ MCP server starts successfully');
      } catch (error: any) {
        if (error.message.includes('timeout')) {
          console.log('  ✅ MCP server starts successfully');
        } else {
          console.log('  ❌ MCP server startup failed');
          throw new Error(`MCP server failed to start: ${error.message}`);
        }
      }
    }

    console.log('✅ All pre-flight checks passed');
  }

  /**
   * Clean up test directories
   */
  private async cleanup(testDirs: string[], outputDir: string): Promise<void> {
    console.log('🧹 Cleaning up test directories...');

    for (const dir of testDirs) {
      try {
        if (await fs.access(dir).then(() => true).catch(() => false)) {
          // Copy any step files to results directory
          const stepFiles = await fs.readdir(dir).then(files =>
            files.filter(file => file.startsWith('claude-steps-') || file.startsWith('claude-output-'))
          ).catch(() => []);

          if (stepFiles.length > 0) {
            for (const file of stepFiles) {
              const src = path.join(dir, file);
              const dest = path.join(outputDir, file);
              try {
                await fs.copyFile(src, dest);
              } catch (error) {
                console.warn(`Warning: Could not copy step file ${file}`);
              }
            }
          }

          // Remove directory
          await fs.rm(dir, { recursive: true, force: true });
          console.log(`✅ Cleaned up ${path.basename(dir)}`);
        }
      } catch (error: any) {
        console.warn(`Warning: Could not clean up ${dir}: ${error.message}`);
      }
    }
  }

  /**
   * Display benchmark summary
   */
  private displaySummary(suite: BenchmarkSuite): void {
    console.log('\n📊 Benchmark Summary');
    console.log(`Suite: ${suite.name} | Average Improvement: ${suite.avgImprovement}%`);

    const successful = suite.results.filter(r => r.baseline.success && r.optimized.success).length;
    const failed = suite.results.length - successful;

    console.log(`Completed: ${suite.results.length} | Successful: ${successful} | Failed: ${failed}`);

    if (successful > 0) {
      console.log('\n📋 Test Results:');
      suite.results.forEach(result => {
        const baselineStatus = result.baseline.success ? '✅' : '❌';
        const optimizedStatus = result.optimized.success ? '✅' : '❌';
        console.log(`  ${result.test.name}:`);
        console.log(`    Baseline: ${baselineStatus} ${result.baseline.duration.toFixed(1)}s`);
        console.log(`    MCP: ${optimizedStatus} ${result.optimized.duration.toFixed(1)}s`);
        console.log(`    Improvement: ${result.improvement}%`);
      });
    }
  }

  private getSystemInfo(): SystemInfo {
    return {
      platform: os.platform(),
      arch: os.arch(),
      nodeVersion: process.version,
      timestamp: new Date().toISOString()
    };
  }

  private shouldSkipRetry(error: any): boolean {
    const nonRetryableErrors = ['ENOENT', 'EACCES', 'EPERM', 'Command failed'];
    return nonRetryableErrors.some(code => error.message.includes(code));
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}