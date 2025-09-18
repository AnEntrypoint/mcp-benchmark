#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import { BenchmarkRunner } from '../core/benchmark-runner.js';
import { createDefaultTests, createCustomTests, createStressTests } from '../utils/default-tests.js';
import { createGlootieConfig, createMCPServerConfig, createPopularServerConfigs } from '../utils/mcp-config.js';
import { promises as fs } from 'fs';
import * as path from 'path';

const program = new Command();

program
  .name('mcp-ab-benchmark')
  .description('A/B Benchmark MCP (Model Context Protocol) tools and servers')
  .version('1.0.0');

// Run benchmark command
program
  .command('run')
  .description('Run MCP benchmarks')
  .option('-c, --config <path>', 'Path to benchmark configuration file')
  .option('-o, --output <dir>', 'Output directory for results', './benchmark-results')
  .option('-p, --parallel', 'Run tests in parallel', true)
  .option('-s, --sequential', 'Run tests sequentially')
  .option('--preset <preset>', 'Use preset test suite', 'default')
  .option('--mcp-server <name>', 'MCP server to benchmark against')
  .option('--server-path <path>', 'Path to custom MCP server')
  .option('--timeout <ms>', 'Test timeout in milliseconds', '120000')
  .action(async (options) => {
    try {
      console.log(chalk.blue('🚀 Starting MCP Benchmark Suite'));

      const runner = new BenchmarkRunner();

      // Load or create test configuration
      let tests;
      if (options.config) {
        const configPath = path.resolve(options.config);
        const configContent = await fs.readFile(configPath, 'utf-8');
        const config = JSON.parse(configContent);
        tests = config.tests;
      } else {
        // Use preset tests
        switch (options.preset) {
          case 'default':
            tests = createDefaultTests();
            break;
          case 'custom':
            tests = createCustomTests({ complexity: 'medium' });
            break;
          case 'stress':
            tests = createStressTests();
            break;
          default:
            tests = createDefaultTests();
        }
      }

      // Configure MCP server
      let mcpServer;
      if (options.mcpServer || options.serverPath) {
        if (options.serverPath) {
          mcpServer = createMCPServerConfig({
            name: 'custom',
            command: 'node',
            args: [path.resolve(options.serverPath)]
          });
        } else {
          const popularConfigs = createPopularServerConfigs();
          mcpServer = popularConfigs[options.mcpServer] || createGlootieConfig({});
        }
      } else {
        mcpServer = createGlootieConfig({});
      }

      // Override timeout if specified
      if (options.timeout) {
        const timeout = parseInt(options.timeout);
        tests.forEach((test: any) => {
          test.timeout = timeout;
        });
      }

      // Run benchmark suite
      const results = await runner.runBenchmarkSuite(tests, {
        name: 'MCP Benchmark Suite',
        description: `Benchmarking ${mcpServer.name} MCP server`,
        version: '1.0.0',
        mcpServer,
        parallel: options.sequential ? false : options.parallel,
        outputDir: options.output
      });

      console.log(chalk.green('✅ Benchmark completed successfully!'));
      console.log(chalk.cyan(`📊 Average improvement: ${results.avgImprovement}%`));

    } catch (error: any) {
      console.error(chalk.red('❌ Benchmark failed:'), error.message);
      process.exit(1);
    }
  });

// Create config command
program
  .command('create-config')
  .description('Create a benchmark configuration file')
  .option('-o, --output <path>', 'Output path for config file', './benchmark-config.json')
  .option('--preset <preset>', 'Preset to base config on', 'default')
  .action(async (options) => {
    try {
      let tests;
      switch (options.preset) {
        case 'default':
          tests = createDefaultTests();
          break;
        case 'custom':
          tests = createCustomTests({ complexity: 'medium' });
          break;
        case 'stress':
          tests = createStressTests();
          break;
        default:
          tests = createDefaultTests();
      }

      const config = {
        name: 'Custom MCP Benchmark Suite',
        description: 'Customizable MCP benchmark configuration',
        version: '1.0.0',
        tests,
        mcpServer: {
          name: 'glootie',
          command: 'node',
          args: ['./src/index.js'],
          env: {}
        }
      };

      await fs.writeFile(options.output, JSON.stringify(config, null, 2));
      console.log(chalk.green(`✅ Configuration created: ${options.output}`));
      console.log(chalk.cyan('📝 Edit the file to customize your benchmark suite'));

    } catch (error: any) {
      console.error(chalk.red('❌ Failed to create config:'), error.message);
      process.exit(1);
    }
  });

// List presets command
program
  .command('list-presets')
  .description('List available test presets')
  .action(() => {
    console.log(chalk.blue('Available test presets:'));
    console.log(chalk.white('  default  ') + chalk.gray('- Standard MCP tool evaluation tests'));
    console.log(chalk.white('  custom   ') + chalk.gray('- Customizable tests for specific focus areas'));
    console.log(chalk.white('  stress   ') + chalk.gray('- Performance stress tests for large codebases'));
  });

// List servers command
program
  .command('list-servers')
  .description('List popular MCP servers')
  .action(() => {
    const servers = createPopularServerConfigs();
    console.log(chalk.blue('Popular MCP servers:'));
    Object.entries(servers).forEach(([name, config]) => {
      console.log(chalk.white(`  ${name.padEnd(15)}`), chalk.gray(`- ${config.command} ${config.args.join(' ')}`));
    });
  });

// Validate config command
program
  .command('validate')
  .description('Validate a benchmark configuration file')
  .argument('<config-path>', 'Path to configuration file')
  .action(async (configPath) => {
    try {
      const configContent = await fs.readFile(path.resolve(configPath), 'utf-8');
      const config = JSON.parse(configContent);

      console.log(chalk.blue('🔍 Validating configuration...'));

      // Basic validation
      const required = ['name', 'tests'];
      const missing = required.filter(field => !config[field]);

      if (missing.length > 0) {
        console.error(chalk.red(`❌ Missing required fields: ${missing.join(', ')}`));
        process.exit(1);
      }

      if (!Array.isArray(config.tests) || config.tests.length === 0) {
        console.error(chalk.red('❌ Tests must be a non-empty array'));
        process.exit(1);
      }

      // Validate each test
      config.tests.forEach((test: any, index: number) => {
        const testRequired = ['name', 'category', 'prompt'];
        const testMissing = testRequired.filter(field => !test[field]);

        if (testMissing.length > 0) {
          console.error(chalk.red(`❌ Test ${index + 1} missing: ${testMissing.join(', ')}`));
          process.exit(1);
        }
      });

      console.log(chalk.green('✅ Configuration is valid'));
      console.log(chalk.cyan(`📊 Found ${config.tests.length} test(s)`));

    } catch (error: any) {
      if (error.code === 'ENOENT') {
        console.error(chalk.red(`❌ Configuration file not found: ${configPath}`));
      } else if (error instanceof SyntaxError) {
        console.error(chalk.red('❌ Invalid JSON in configuration file'));
      } else {
        console.error(chalk.red('❌ Validation failed:'), error.message);
      }
      process.exit(1);
    }
  });

// Error handling
program.configureOutput({
  writeErr: (str) => process.stderr.write(chalk.red(str))
});

program.parse();