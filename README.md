# MCP A/B Benchmark

A comprehensive benchmarking library for Model Context Protocol (MCP) tools and servers. This library helps you evaluate the performance impact of MCP tools compared to baseline implementations.

## Features

- 🚀 **Easy Setup**: Simple API for creating and running benchmarks
- 📊 **Comprehensive Analysis**: Detailed performance metrics and tool usage analysis
- 🔧 **Flexible Configuration**: Support for custom tests and MCP server configurations
- 📈 **Multiple Export Formats**: JSON, CSV, and Markdown report generation
- 🎯 **Built-in Test Suites**: Pre-configured tests for common MCP evaluation scenarios
- 🔄 **Parallel Execution**: Run multiple tests simultaneously for faster results
- 🛠️ **CLI Tool**: Command-line interface for easy benchmark execution

## Installation

```bash
npm install mcp-ab-benchmark
```

## Quick Start

### Using the CLI

```bash
# Run default benchmark suite
npx mcp-ab-benchmark run

# Run with custom MCP server
npx mcp-ab-benchmark run --mcp-server glootie --output ./results

# Create a custom configuration file
npx mcp-ab-benchmark create-config --output my-benchmark.json

# Run with custom configuration
npx mcp-ab-benchmark run --config my-benchmark.json
```

### Using the Library

```typescript
import { BenchmarkRunner, createDefaultTests, createGlootieConfig } from 'mcp-ab-benchmark';

// Create benchmark runner
const runner = new BenchmarkRunner();

// Configure MCP server
const mcpServer = createGlootieConfig({
  serverPath: './path/to/mcp-server.js'
});

// Run benchmark suite
const results = await runner.runBenchmarkSuite(createDefaultTests(), {
  name: 'My MCP Benchmark',
  description: 'Evaluating MCP tool performance',
  version: '1.0.0',
  mcpServer,
  parallel: true,
  outputDir: './benchmark-results'
});

console.log(`Average improvement: ${results.avgImprovement}%`);
```

## Configuration

### Test Configuration

Each test is defined with the following properties:

```typescript
interface BenchmarkConfig {
  name: string;           // Test name
  description: string;    // Test description
  category: string;       // Category for grouping
  prompt: string;         // Task prompt for Claude
  timeout?: number;       // Timeout in milliseconds
  maxRetries?: number;    // Number of retry attempts
  setup?: (testDir: string) => Promise<void>;      // Custom setup
  validate?: (result: TestResult) => boolean;      // Custom validation
}
```

### MCP Server Configuration

Configure your MCP server:

```typescript
interface MCPServerConfig {
  name: string;           // Server name
  command: string;        // Command to run server
  args: string[];         // Command arguments
  env?: Record<string, string>;  // Environment variables
  cwd?: string;          // Working directory
}
```

## Built-in Test Suites

### Default Tests

The default test suite includes:

- **Component Analysis**: Analyze React components and suggest improvements
- **UI Generation**: Create new components following existing patterns
- **Refactoring**: Extract utilities and add error boundaries
- **Performance Optimization**: Optimize React components for performance
- **Code Search**: Search and analyze code patterns
- **Type Safety**: Improve TypeScript type safety

### Custom Tests

Create focused tests for specific areas:

```typescript
import { createCustomTests } from 'mcp-ab-benchmark';

const tests = createCustomTests({
  focusAreas: ['search', 'refactoring'],
  complexity: 'medium',
  timeout: 120000
});
```

### Stress Tests

Performance stress tests for large codebases:

```typescript
import { createStressTests } from 'mcp-ab-benchmark';

const stressTests = createStressTests();
```

## MCP Server Support

### Built-in Configurations

Popular MCP servers are pre-configured:

```typescript
import { createPopularServerConfigs } from 'mcp-ab-benchmark';

const servers = createPopularServerConfigs();
// Available: filesystem, github, postgres, puppeteer, brave-search
```

### Glootie Configuration

Special support for the Glootie MCP server:

```typescript
import { createGlootieConfig } from 'mcp-ab-benchmark';

const glootie = createGlootieConfig({
  serverPath: '../mcp-repl/src/index.js',
  workingDirectory: process.cwd()
});
```

## Results Analysis

### Benchmark Results

```typescript
interface BenchmarkResult {
  test: BenchmarkConfig;      // Test configuration
  baseline: TestResult;       // Non-MCP result
  optimized: TestResult;      // MCP-enabled result
  improvement: string;        // Performance improvement %
}
```

### Export Options

Export results in multiple formats:

```typescript
import { ResultsAnalyzer } from 'mcp-ab-benchmark';

const analyzer = new ResultsAnalyzer();

// Generate reports
const summary = analyzer.generateSummaryReport(results);
const analysis = analyzer.generateAnalysisReport(results);

// Export in different formats
const json = analyzer.exportResults(results, 'json');
const csv = analyzer.exportResults(results, 'csv');
const markdown = analyzer.exportResults(results, 'markdown');
```

## CLI Commands

### Run Benchmarks

```bash
# Basic usage
mcp-ab-benchmark run

# With options
mcp-ab-benchmark run \
  --config benchmark-config.json \
  --output ./results \
  --parallel \
  --mcp-server glootie \
  --timeout 180000
```

### Configuration Management

```bash
# Create configuration file
mcp-ab-benchmark create-config --preset default --output config.json

# Validate configuration
mcp-ab-benchmark validate config.json

# List available presets
mcp-ab-benchmark list-presets

# List supported MCP servers
mcp-ab-benchmark list-servers
```

## Advanced Usage

### Custom Test Environment

```typescript
import { TestEnvironmentBuilder } from 'mcp-ab-benchmark';

const envBuilder = new TestEnvironmentBuilder();

const environment = await envBuilder.createTestEnvironment({
  testDir: './custom-test-env',
  mcpServer: myMcpServer,
  files: {
    'custom-component.tsx': customComponentCode
  },
  packageJson: {
    dependencies: {
      'custom-package': '^1.0.0'
    }
  },
  setupScripts: ['npm run setup-custom']
});
```

### Custom Result Analysis

```typescript
import { ResultsAnalyzer } from 'mcp-ab-benchmark';

class CustomAnalyzer extends ResultsAnalyzer {
  generateCustomReport(results: BenchmarkSuite): string {
    // Your custom analysis logic
    return 'Custom analysis report';
  }
}

const analyzer = new CustomAnalyzer();
const customReport = analyzer.generateCustomReport(results);
```

## Requirements

- Node.js 16.0.0 or higher
- Claude CLI installed and configured
- MCP server (optional, for MCP-enabled tests)

## License

MIT

## Contributing

Contributions are welcome! Please read our contributing guidelines and submit pull requests to our repository.

## Support

For issues and questions:
- GitHub Issues: [Report bugs and request features]
- Documentation: [Full API documentation]
- Examples: [Example implementations]