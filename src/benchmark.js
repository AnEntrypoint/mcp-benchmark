import fs from 'fs';
import path from 'path';
import { execSync, spawn } from 'child_process';
import os from 'os';

export class MCPBenchmark {
  constructor(config = {}) {
    this.config = {
      mcpTool: config.mcpTool || '@modelcontextprotocol/server-github',
      mcpArgs: config.mcpArgs || [],
      tests: config.tests || this.getDefaultTests(),
      outputDir: config.outputDir || 'results',
      ...config
    };

    this.results = {
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      systemInfo: {
        platform: os.platform(),
        arch: os.arch(),
        nodeVersion: process.version,
        mcpTool: this.config.mcpTool
      }
    };
  }

  getDefaultTests() {
    return [
      {
        name: 'Code Analysis',
        prompt: 'Analyze the codebase structure and provide insights about the architecture.',
        category: 'analysis'
      },
      {
        name: 'Feature Implementation',
        prompt: 'Implement a new feature following the existing code patterns and conventions.',
        category: 'implementation'
      },
      {
        name: 'Performance Optimization',
        prompt: 'Optimize the code for better performance and efficiency.',
        category: 'optimization'
      }
    ];
  }

  async runBenchmark() {
    console.log('🚀 MCP Benchmark v1.0.0');
    console.log(`MCP Tool: ${this.config.mcpTool}`);

    await this.runPreflightChecks();
    fs.mkdirSync(this.config.outputDir, { recursive: true });

    const testDir = '../benchmark-test-' + Date.now();
    fs.mkdirSync(testDir, { recursive: true });

    try {
      await this.setupEnvironment(testDir);
      const performanceResults = await this.runTests(testDir);
      this.results.performance = performanceResults;

      this.saveResults(performanceResults);
      this.displaySummary(performanceResults);
      await this.generateSuggestions(performanceResults);

    } catch (error) {
      console.error('❌ Test failed:', error.message);
      throw error;
    } finally {
      await this.cleanup(testDir);
    }

    console.log('🎉 Benchmark completed!');
  }

  async runPreflightChecks() {
    console.log('🔍 Running pre-flight checks...');

    try {
      execSync('claude --version', { stdio: 'pipe' });
      console.log('✅ Claude CLI available');
    } catch (error) {
      console.log('❌ Claude CLI not found');
    }

    try {
      execSync(`npx ${this.config.mcpTool} --version`, { stdio: 'pipe', timeout: 10000 });
      console.log(`✅ MCP tool available: ${this.config.mcpTool}`);
    } catch (error) {
      console.log(`❌ MCP tool not found: ${this.config.mcpTool}`);
    }
  }

  async setupEnvironment(testDir) {
    console.log('🔧 Setting up test environment...');

    if (this.config.customProject) {
      execSync(`cp -r "${this.config.customProject}/." "${testDir}/"`, { stdio: 'inherit' });
    } else {
      this.createDefaultProject(testDir);
    }

    this.setupMcpConfig(testDir);
    await this.installDeps(testDir);
  }

  createDefaultProject(testDir) {
    const packageJson = {
      name: 'test-project',
      version: '1.0.0',
      type: 'module',
      scripts: { test: 'echo "test"' }
    };

    fs.writeFileSync(path.join(testDir, 'package.json'), JSON.stringify(packageJson, null, 2));
    fs.writeFileSync(path.join(testDir, 'README.md'), '# Test Project\n\nThis is a test project for MCP benchmarking.');
  }

  setupMcpConfig(testDir) {
    const config = {
      mcpServers: {
        benchmark: {
          command: "npx",
          args: [this.config.mcpTool, ...this.config.mcpArgs],
          env: {}
        }
      }
    };

    fs.writeFileSync(path.join(testDir, '.claude.json'), JSON.stringify(config, null, 2));
  }

  async installDeps(testDir) {
    return new Promise((resolve, reject) => {
      const child = spawn('npm', ['install', '--silent'], {
        cwd: testDir,
        stdio: 'pipe'
      });

      child.on('close', (code) => {
        code === 0 ? resolve() : reject(new Error('npm install failed'));
      });

      setTimeout(() => {
        child.kill();
        reject(new Error('npm install timeout'));
      }, 60000);
    });
  }

  async runTests(testDir) {
    console.log('🧪 Running tests...');
    const tests = this.config.tests;
    const results = [];

    for (const test of tests) {
      console.log(`📋 Running: ${test.name}`);

      const baseline = await this.runSingleTest(test, testDir + '-baseline', false);
      const mcp = await this.runSingleTest(test, testDir + '-mcp', true);

      const improvement = baseline.success && mcp.success
        ? ((baseline.duration - mcp.duration) / baseline.duration * 100).toFixed(1)
        : 'N/A';

      results.push({ test, baseline, mcp, improvement });

      console.log(`   Baseline: ${baseline.success ? baseline.duration.toFixed(1) + 's' : 'FAILED'}`);
      console.log(`   MCP: ${mcp.success ? mcp.duration.toFixed(1) + 's' : 'FAILED'}`);
      console.log(`   Improvement: ${improvement}%`);
    }

    return { tests: results, avgImprovement: this.calculateAvgImprovement(results) };
  }

  async runSingleTest(test, testDir, useMcp) {
    const startTime = Date.now();

    try {
      fs.mkdirSync(testDir, { recursive: true });
      await this.setupEnvironment(testDir);

      const cmd = this.buildClaudeCommand(testDir, test, useMcp);
      const output = await this.executeCommand(cmd, testDir);

      const duration = (Date.now() - startTime) / 1000;

      return {
        success: true,
        duration,
        outputLength: output.length,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      const duration = (Date.now() - startTime) / 1000;
      return {
        success: false,
        duration,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  buildClaudeCommand(testDir, test, useMcp) {
    const mcpFlag = useMcp ? '--mcp-config ./.claude.json' : '';
    return `cd "${testDir}" && claude ${mcpFlag} -p "${test.prompt}" --allowed-tools "Bash,Read,Edit,Write,Grep" --output-format stream-json`;
  }

  async executeCommand(cmd, workingDir) {
    return new Promise((resolve, reject) => {
      const child = spawn('script', ['-q', '-c', cmd, '/dev/null'], {
        cwd: workingDir,
        stdio: 'pipe'
      });

      let stdout = '';

      child.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      child.on('close', (code) => {
        code === 0 ? resolve(stdout) : reject(new Error(`Command failed with code ${code}`));
      });

      child.on('error', reject);

      setTimeout(() => {
        child.kill();
        reject(new Error('Command timeout'));
      }, 300000);
    });
  }

  calculateAvgImprovement(results) {
    const successful = results.filter(r => r.improvement !== 'N/A');
    if (successful.length === 0) return '0';

    const avg = successful.reduce((sum, r) => sum + parseFloat(r.improvement), 0) / successful.length;
    return avg.toFixed(1);
  }

  saveResults(performanceResults) {
    const resultsFile = path.join(this.config.outputDir, 'mcp-benchmark-' + Date.now() + '.json');
    fs.writeFileSync(resultsFile, JSON.stringify({ ...this.results, performance: performanceResults }, null, 2));
    console.log('📊 Results saved to:', resultsFile);
  }

  displaySummary(results) {
    console.log('\n📊 Performance Summary');
    console.log(`Average Improvement: ${results.avgImprovement}%`);
    console.log(`Total Tests: ${results.tests.length}`);

    const successful = results.tests.filter(t => t.baseline.success && t.mcp.success).length;
    console.log(`Successful: ${successful}/${results.tests.length}`);

    results.tests.forEach(({ test, baseline, mcp, improvement }) => {
      console.log(`\n  ${test.name}:`);
      console.log(`    Baseline: ${baseline.success ? baseline.duration.toFixed(1) + 's' : 'FAILED'}`);
      console.log(`    MCP: ${mcp.success ? mcp.duration.toFixed(1) + 's' : 'FAILED'}`);
      console.log(`    Improvement: ${improvement}%`);
    });
  }

  async generateSuggestions(performanceResults) {
    try {
      console.log('📝 Generating suggestions...');

      const summary = `MCP Benchmark Results for ${this.config.mcpTool}:\n\n` +
        `Average Improvement: ${performanceResults.avgImprovement}%\n` +
        performanceResults.tests.map(({ test, baseline, mcp, improvement }) =>
          `${test.name}: Baseline ${baseline.success ? baseline.duration.toFixed(1) + 's' : 'FAILED'}, MCP ${mcp.success ? mcp.duration.toFixed(1) + 's' : 'FAILED'}, Improvement: ${improvement}%`
        ).join('\n');

      const prompt = `Analyze this MCP benchmark performance and provide actionable suggestions for improvement:\n\n${summary}\n\nFocus on what worked well and what could be improved.`;

      execSync(`claude -p "${prompt}" -o SUGGESTIONS.md`, { stdio: 'inherit', timeout: 300000 });
      console.log('✅ SUGGESTIONS.md generated');

    } catch (error) {
      console.warn('⚠️ Could not generate suggestions:', error.message);
    }
  }

  async cleanup(baseDir) {
    console.log('🧹 Cleaning up...');

    try {
      const parentDir = path.dirname(baseDir);
      const baseName = path.basename(baseDir);
      const dirs = fs.readdirSync(parentDir)
        .filter(dir => dir.startsWith(baseName))
        .map(dir => path.join(parentDir, dir));

      for (const dir of dirs) {
        fs.rmSync(dir, { recursive: true, force: true });
      }

      console.log('✅ Cleanup completed');
    } catch (error) {
      console.warn('⚠️ Cleanup warning:', error.message);
    }
  }
}